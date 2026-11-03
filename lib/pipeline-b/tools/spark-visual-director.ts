import { readModelResponse } from "@/lib/model-response";
import { spawn } from "node:child_process";
import type { EditPlan, TranscriptSegment } from "../types.ts";

const SPARK_VISUAL_SYSTEM = `You are Meta Muse Spark 1.3, a senior creative-coding and motion-design engineer. Build an original, polished, transparent HTML/React/SVG animation layer from Wonder's exact timed visual plan for an existing talking-head video.

Return one executable TSX React component, default-exported as SparkStoryVisuals. It receives currentTime (seconds on the full video timeline), duration, frame, fps, width (1080), height (1920), and isPlaying. All motion must be deterministic from currentTime. Do not use internal timers or wall-clock animation loops.

This is an OVERLAY: the background must remain fully transparent. Draw no full-frame background, dark wash, vignette, video, captions, transcript, repeated headline cards, generic dashboard, or persistent decoration. Use only the available runtime libraries (React, Framer Motion, lucide-react, inline CSS, SVG). Every visual should be custom and recognizable from its own scene's spoken line and Wonder direction. Create strong silhouettes, layered depth, clear contrast, deliberate composition, beautiful color, and expressive entrances/exits. Use varied spatial placement and animation language across scenes. Never default to phones, scroll feeds, pills, cards, circles, or the same composition unless the spoken line calls for them. Keep an element visible only in the exact time window of its scene. The completed TSX must compile in both browser preview and Remotion rendering.`;

function extractSpeakerReferenceFrame(videoPath: string, timestamp: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-ss", timestamp.toFixed(3), "-i", videoPath,
      "-frames:v", "1", "-vf", "scale=540:960:force_original_aspect_ratio=decrease",
      "-q:v", "5", "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    const timeout = setTimeout(() => child.kill("SIGKILL"), 20_000);
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const image = Buffer.concat(chunks);
      if (code !== 0 || image.length < 1000) {
        reject(new Error(Buffer.concat(errors).toString("utf8") || `ffmpeg exited with ${code} while sampling the speaker frame.`));
        return;
      }
      resolve(image);
    });
  });
}

export async function generateSparkVisualOverlay(params: {
  editPlan: EditPlan;
  transcript: TranscriptSegment[];
  duration: number;
  runId: string;
  cleanVideoPath?: string;
  onLogEvent?: (event: string, meta?: Record<string, unknown>) => void;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const { editPlan, transcript, duration, runId, cleanVideoPath, onLogEvent, fetchImpl = fetch } = params;
  const apiKey = process.env.MODEL_API_KEY || process.env.MUSE_API_KEY || process.env.META_API_KEY || "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";
  if (!apiKey) throw new Error("Spark 1.3 is not configured. Set MODEL_API_KEY before generating Pipeline B animations.");

  const words = (editPlan.editedTranscript || []).map((segment) => ({
    start: segment.start,
    end: segment.end,
    dialogue: segment.text,
  }));
  const scenePlan = (editPlan.visualSegments || []).map((scene, index) => ({
    scene: index + 1,
    start: scene.start,
    end: scene.end,
    spokenDialogue: scene.spokenReference,
    visualDirection: scene.motionIntent,
    headline: scene.headlineText,
    style: scene.visualRecipe?.style,
    metaphor: scene.visualRecipe?.metaphor,
    objects: scene.visualRecipe?.objects,
    transition: scene.transitionDirection,
    cameraZoom: scene.cameraZoom,
  }));
  if (!scenePlan.length) throw new Error("Wonder returned no visual scenes for Spark to animate.");

  const prompt = `Create the full-video transparent animation overlay now. Each timed beat below is an independent art-direction brief; invent bespoke visuals and motion for each, while keeping an intentional visual identity across the reel. The script is authoritative. Do not reuse a scene's design for other beats.

SPEAKER-SAFE PLACEMENT: An attached reference frame is sampled from the actual cleaned talking-head video. Inspect it before composing. Identify the speaker's head, face, shoulders, and current framing. Keep every graphic completely clear of the face, especially eyes, nose, and mouth. Place scene visuals only in genuine negative space above the head, beside the shoulder, or below the chin when that area is clear. If a scene has no safe negative space, use a compact edge-hugging treatment or leave that beat visually quiet; never cover the face to fill the frame. Anchor positions to the observed speaker silhouette rather than choosing random corners. Keep the speaker visible beneath the transparent overlay throughout.

Title: ${editPlan.title}
Hook/context: ${editPlan.hookLine}
Template/style direction: ${editPlan.templateId}
Full duration: ${duration.toFixed(2)} seconds
Run: ${runId}

WONDER SCENE PLAN:
${JSON.stringify(scenePlan, null, 2)}

EDITED DIALOGUE TIMING:
${JSON.stringify(words, null, 2)}

Implement the real objects and actions. Use the scene start/end values as absolute video times. Keep untouched gaps transparent. During each scene, animate its central metaphor with a clear entrance, meaningful action, visual payoff, and clean exit. Prefer vector illustration and custom SVG details over text labels. Text is allowed only when it is a genuine short in-scene label. Do not render spoken dialogue as on-screen copy. Follow the transparent-overlay contract exactly. Return only TSX code.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 145_000);
  try {
    const referenceFrame = cleanVideoPath
      ? await extractSpeakerReferenceFrame(cleanVideoPath, Math.min(0.8, Math.max(0, duration * 0.15)))
      : null;
    if (referenceFrame) {
      onLogEvent?.("SPARK_SPEAKER_REFERENCE_FRAME_ATTACHED", {
        runId,
        sampledAt: Math.min(0.8, Math.max(0, duration * 0.15)),
        bytes: referenceFrame.length,
      });
    }
    const userContent: any[] = [{ type: "input_text", text: prompt }];
    if (referenceFrame) {
      userContent.push({
        type: "input_image",
        image_url: `data:image/jpeg;base64,${referenceFrame.toString("base64")}`,
      });
    }
    const response = await fetchImpl("https://api.meta.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: "muse-spark-1.3",
        input: [{ role: "user", content: userContent }],
        stream: true,
        temperature: 0.9,
        max_output_tokens: 48_000,
        reasoning: { effort: "high" },
        instructions: SPARK_VISUAL_SYSTEM,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Spark 1.3 returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}.`);
    }
    const code = (await readModelResponse(response))
      .replace(/^```(?:tsx|typescript|jsx)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    if (!code || !/export\s+default/.test(code)) {
      throw new Error("Spark 1.3 did not return a default-exported animation component.");
    }
    return code;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Spark 1.3 animation synthesis timed out after 145 seconds.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
