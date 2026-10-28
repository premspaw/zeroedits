function outputText(response: any): string {
  if (!Array.isArray(response?.output)) return "";
  return response.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((content: any) => content?.type === "output_text" && typeof content.text === "string")
    .map((content: any) => content.text)
    .join("");
}

export async function readModelResponse(response: Response): Promise<string> {
  if (!response.ok) {
    throw new Error(`The model service returned HTTP ${response.status}. Please retry.`);
  }
  if (!response.body) throw new Error("The model service returned an empty response.");

  if (response.headers.get("content-type")?.includes("application/json")) {
    const result = await response.json();
    if (result.error || result.status === "failed" || result.status === "incomplete") {
      throw new Error("The model did not finish its response. Please retry.");
    }
    if (Array.isArray(result.beats)) return JSON.stringify(result);
    const text = outputText(result);
    if (result.status !== "completed" || !text.trim()) {
      throw new Error("The model returned no completed output. Please retry.");
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts = new Map<string, string>();
  let pending = "";
  let eventData: string[] = [];
  let completed = false;
  let completeText: string | undefined;

  const dispatch = () => {
    if (!eventData.length) return;
    const data = eventData.join("\n").trim();
    eventData = [];
    if (!data) return;
    if (data === "[DONE]") {
      completed = true;
      return;
    }
    let event: any;
    try {
      event = JSON.parse(data);
    } catch {
      throw new Error("The model stream contained an incomplete or invalid event. Please retry.");
    }
    if (event.type === "error" || event.type === "response.failed" || event.type === "response.incomplete" || event.error) {
      throw new Error("The model did not finish its response. Please retry.");
    }
    const partKey = `${event.output_index ?? 0}:${event.content_index ?? 0}`;
    if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      parts.set(partKey, (parts.get(partKey) || "") + event.delta);
    } else if (event.type === "response.output_text.done" && typeof event.text === "string") {
      parts.set(partKey, event.text);
    } else if (event.type === "response.completed") {
      if (event.response?.status === "failed" || event.response?.status === "incomplete") {
        throw new Error("The model did not finish its response. Please retry.");
      }
      completed = true;
      const text = outputText(event.response);
      if (text) completeText = text;
    } else if (Array.isArray(event.beats)) {
      completeText = JSON.stringify(event);
    }
  };

  const consumeLine = (line: string) => {
    const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (!normalized) {
      dispatch();
    } else if (normalized.startsWith("data:")) {
      eventData.push(normalized.slice(5).replace(/^ /, ""));
    }
  };

  try {
    while (true) {
      const chunk = await reader.read();
      pending += chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
      let newline = pending.indexOf("\n");
      while (newline !== -1) {
        consumeLine(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
        newline = pending.indexOf("\n");
      }
      if (chunk.done) break;
    }
    if (pending) consumeLine(pending);
    dispatch();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  if (!completed) throw new Error("The model connection ended before generation finished. Please retry.");
  const text = completeText ?? Array.from(parts.values()).join("");
  if (!text.trim()) throw new Error("The model returned no output. Please retry.");
  return text;
}
