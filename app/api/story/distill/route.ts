import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";
import { ensureBankDir } from "@/lib/story-bank";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const DISTILL_PROMPT = `# SYSTEM — STORY BANK DISTILLER

You read one daily voice check-in transcript and pull out what is worth keeping.
Return ONLY valid JSON, no markdown fences, no commentary:

{
  "moments": [
    { "title": "short label", "summary": "2-3 sentences, keep the person's own words where possible", "hook": "one scroll-stopping opening line in their voice" }
  ],
  "voice_notes": "1-2 lines on how they speak (pace, phrases, energy) — or empty string"
}

Rules:
- 1 to 4 moments only. Skip greetings, filler, and anything with no story.
- Preserve real names, numbers, and claims exactly.
- Moments must come from THIS transcript, never invented.`;

/**
 * Distill one check-in transcript into bankable moments (Wonder brain),
 * then append them to personal.md under ## Stories.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript = String(body.transcript || "").trim().slice(0, 6000);
    const goal = String(body.goal || "personal-brand");
    if (!transcript) {
      return NextResponse.json({ success: false, error: "Empty transcript." }, { status: 400 });
    }

    const apiKey =
      process.env.MODEL_API_KEY ||
      process.env.MUSE_API_KEY ||
      process.env.META_API_KEY ||
      "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

    let parsed: any = null;
    if (apiKey) {
      parsed = await withModelRetry(
        async () => {
          const response = await fetch("https://api.meta.ai/v1/responses", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({
              model: "muse-wonder-1.0",
              input: [
                {
                  role: "user",
                  content: `Goal: ${goal}\nTranscript:\n${transcript}`,
                },
              ],
              stream: true,
              temperature: 0.7,
              max_output_tokens: 4096,
              reasoning: { effort: "medium" },
              instructions: DISTILL_PROMPT,
            }),
          });
          const text = await readModelResponse(response);
          const clean = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
          const out = JSON.parse(clean);
          if (!Array.isArray(out?.moments)) throw new Error("Distiller returned no moments.");
          return out;
        },
        {
          attempts: 2,
          delayMs: 1500,
          onAttemptError: (err: any, attempt: number) =>
            console.error(`[story/distill] attempt ${attempt}/2:`, (err as Error)?.message || err),
        }
      );
    }
    if (!parsed) {
      return NextResponse.json({ success: false, error: "Distiller is not configured." }, { status: 503 });
    }

    ensureBankDir();
    const personalPath = path.join(process.cwd(), "data", "storybank", "personal.md");
    let personal = "";
    try {
      personal = fs.readFileSync(personalPath, "utf-8");
    } catch {}
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const blocks = (parsed.moments as any[])
      .slice(0, 4)
      .map((m) => `### ${stamp} — ${String(m.title || "Moment")}\n${String(m.summary || "")}\nHook: ${String(m.hook || "")}`)
      .join("\n\n");
    const addition = `\n\n${blocks}\n`;
    const next = personal.includes("## Stories")
      ? personal.replace("## Stories", `## Stories${addition}`)
      : `${personal}\n\n## Stories\n${addition}`;
    fs.writeFileSync(personalPath, next, "utf-8");

    return NextResponse.json({
      success: true,
      data: {
        moments: parsed.moments,
        voice_notes: parsed.voice_notes || "",
      },
    });
  } catch (err: any) {
    console.error("[story/distill] Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "Could not distill this check-in." },
      { status: 502 }
    );
  }
}
