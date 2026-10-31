import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import util from "util";
import { transcribeAudio } from "@/lib/pipeline-b/tools/transcription";
import { generateMuseImage } from "@/lib/pipeline-b/tools/image-generator";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";

const execFileAsync = util.promisify(execFile);

export const maxDuration = 300; // Up to 5 minutes for AI story direction, consistent 9:16 art & MP4 video output

export type CameraMotionType =
  | "push_in"
  | "pull_out"
  | "pan_left"
  | "pan_right"
  | "tilt_up"
  | "dramatic_zoom"
  | "slow_drift";

export type AtmosphereType =
  | "sakura"
  | "embers"
  | "rain"
  | "starlight"
  | "golden_dust"
  | "snow"
  | "wind_streaks"
  | "none";

export type LightingMoodType =
  | "golden_hour"
  | "twilight"
  | "moonlight"
  | "neon_night"
  | "stormy"
  | "sunbeams";

export type VisualEffectType =
  | "divine_aura"
  | "lightning_flash"
  | "speed_lines"
  | "sun_flare"
  | "shockwave"
  | "magic_sparkles"
  | "none";

export interface StoryScene {
  id: string;
  index: number;
  start: number;
  end: number;
  duration: number;
  spokenText: string;
  headline: string;
  characterAppearanceInScene?: string;
  visualPrompt: string;
  cameraMotion: CameraMotionType;
  atmosphere: AtmosphereType;
  lightingMood: LightingMoodType;
  visualEffect?: VisualEffectType;
  assetUrl?: string;
  localFilePath?: string;
}

export interface SpokenClause {
  text: string;
  start: number;
  end: number;
  words: { word: string; start: number; end: number }[];
}

function resolvePython(): string {
  const venvPython =
    process.platform === "win32"
      ? path.join(process.cwd(), ".venv", "Scripts", "python.exe")
      : path.join(process.cwd(), ".venv", "bin", "python");
  try {
    if (fs.existsSync(venvPython)) return venvPython;
  } catch {}
  return "python";
}

const EDGE_VOICES: Record<string, string> = {
  "EN-IN": "en-IN-PrabhatNeural",
  "EN-US": "en-US-ChristopherNeural",
  "HI-VIHAAN": "hi-IN-MadhurNeural",
  "HI-ANANYA": "hi-IN-SwaraNeural",
  "KN-DIVYA": "kn-IN-SapnaNeural",
  "KN-KIRAN": "kn-IN-GaganNeural",
};

function buildSpokenClauses(
  words: { word: string; start: number; end: number }[],
  maxWordsPerClause = 6
): SpokenClause[] {
  if (!words.length) return [];
  const clauses: SpokenClause[] = [];
  let current: { word: string; start: number; end: number }[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    current.push(w);
    const nextW = words[i + 1];
    const endsPunct = /[.!?;,:]$/.test(w.word);
    const hasPause = nextW ? nextW.start - w.end > 0.38 : true;

    if (current.length >= maxWordsPerClause || endsPunct || hasPause || !nextW) {
      clauses.push({
        text: current.map((x) => x.word).join(" "),
        start: current[0].start,
        end: current[current.length - 1].end,
        words: [...current],
      });
      current = [];
    }
  }
  return clauses;
}

const IMAGE_STORYTELLER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "resolvedStyle",
    "artStylePromptLock",
    "characterAndWorldBible",
    "scenes",
  ],
  properties: {
    title: { type: "string" },
    resolvedStyle: {
      type: "string",
      enum: ["anime", "cinematic", "storybook", "noir"],
    },
    artStylePromptLock: {
      type: "string",
      description:
        "Mandatory unchanging art style, rendering medium, color palette, and film direction phrase applied to every single scene image.",
    },
    characterAndWorldBible: {
      type: "string",
      description:
        "Mandatory unchanging physical character model sheet: exact character name, species/age/gender, facial features, eye color, hair/fur, headgear/crown, outfit/clothes with exact colors, and signature visual traits so every image looks like the exact same character.",
    },
    scenes: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "index",
          "start",
          "end",
          "spokenText",
          "headline",
          "characterAppearanceInScene",
          "visualPrompt",
          "cameraMotion",
          "atmosphere",
          "lightingMood",
          "visualEffect",
        ],
        properties: {
          id: { type: "string" },
          index: { type: "integer" },
          start: { type: "number" },
          end: { type: "number" },
          spokenText: { type: "string" },
          headline: { type: "string" },
          characterAppearanceInScene: {
            type: "string",
            description:
              "Explicit physical description of the character(s) visible in this specific shot (e.g., 'Young Bala Hanuman, cute divine golden-furred monkey-child with ornate gold crown, ruby gem, and saffron-orange dhoti'). NEVER use pronouns like 'he' or 'she' alone.",
          },
          visualPrompt: {
            type: "string",
            description:
              "Detailed 60-90 word visual composition of the scene action, pose, expression, camera framing, environment, and lighting. Must NOT contain any text/words/watermarks.",
          },
          cameraMotion: {
            type: "string",
            enum: [
              "push_in",
              "pull_out",
              "pan_left",
              "pan_right",
              "tilt_up",
              "dramatic_zoom",
              "slow_drift",
            ],
          },
          atmosphere: {
            type: "string",
            enum: [
              "sakura",
              "embers",
              "rain",
              "starlight",
              "golden_dust",
              "snow",
              "wind_streaks",
              "none",
            ],
          },
          lightingMood: {
            type: "string",
            enum: [
              "golden_hour",
              "twilight",
              "moonlight",
              "neon_night",
              "stormy",
              "sunbeams",
            ],
          },
          visualEffect: {
            type: "string",
            enum: [
              "divine_aura",
              "lightning_flash",
              "speed_lines",
              "sun_flare",
              "shockwave",
              "magic_sparkles",
              "none",
            ],
          },
        },
      },
    },
  },
};

async function renderServerSideStoryMp4(params: {
  scenes: StoryScene[];
  audioPath: string;
  outputMp4Path: string;
  totalDuration: number;
}): Promise<boolean> {
  const { scenes, audioPath, outputMp4Path, totalDuration } = params;
  const validScenes = scenes.filter((s) => s.localFilePath && fs.existsSync(s.localFilePath));
  if (validScenes.length === 0 || !fs.existsSync(audioPath)) return false;

  const tempDir = path.dirname(outputMp4Path);
  const clipPaths: string[] = [];

  try {
    for (let i = 0; i < validScenes.length; i++) {
      const sc = validScenes[i];
      const segDur = Math.max(0.8, +(sc.end - sc.start).toFixed(2));
      const frames = Math.max(24, Math.round(segDur * 30));
      const clipPath = path.join(tempDir, `seg_${i}.mp4`);

      let zExpr = `min(zoom+0.0014,1.18)`;
      let xExpr = `iw/2-(iw/zoom/2)`;
      let yExpr = `ih/2-(ih/zoom/2)`;

      if (sc.cameraMotion === "pull_out") {
        zExpr = `if(eq(on,1),1.18,max(1.0,zoom-0.0014))`;
      } else if (sc.cameraMotion === "pan_left") {
        zExpr = `1.12`;
        xExpr = `(iw-iw/zoom)*(1-on/${frames})`;
      } else if (sc.cameraMotion === "pan_right") {
        zExpr = `1.12`;
        xExpr = `(iw-iw/zoom)*(on/${frames})`;
      } else if (sc.cameraMotion === "tilt_up") {
        zExpr = `1.12`;
        yExpr = `(ih-ih/zoom)*(1-on/${frames})`;
      } else if (sc.cameraMotion === "dramatic_zoom") {
        zExpr = `min(zoom+0.0022,1.24)`;
      }

      const vf = `scale=1200:2134:force_original_aspect_ratio=increase,crop=1200:2134,zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=1080x1920:fps=30,format=yuv420p`;

      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-loop",
          "1",
          "-i",
          sc.localFilePath!,
          "-vf",
          vf,
          "-t",
          String(segDur),
          "-r",
          "30",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "20",
          "-pix_fmt",
          "yuv420p",
          clipPath,
        ],
        { maxBuffer: 30 * 1024 * 1024 }
      );

      if (fs.existsSync(clipPath)) {
        clipPaths.push(clipPath);
      }
    }

    if (clipPaths.length === 0) return false;

    const concatListPath = path.join(tempDir, "concat_list.txt");
    const concatContent = clipPaths
      .map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
      .join("\n");
    fs.writeFileSync(concatListPath, concatContent, "utf-8");

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-i",
        audioPath,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-level",
        "4.1",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "19",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        String(totalDuration),
        "-movflags",
        "+faststart",
        outputMp4Path,
      ],
      { maxBuffer: 40 * 1024 * 1024 }
    );

    return fs.existsSync(outputMp4Path) && fs.statSync(outputMp4Path).size > 1000;
  } catch (err) {
    console.warn("[AudioStory] Server MP4 render fallback warning:", err);
    return false;
  } finally {
    for (const cp of clipPaths) {
      try {
        if (fs.existsSync(cp)) fs.unlinkSync(cp);
      } catch {}
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const requestedStyle = ((formData.get("style") as string) || "auto").toLowerCase();
    const userPrompt = ((formData.get("prompt") as string) || "").trim();
    const userScript = ((formData.get("userScript") as string) || "").trim();
    const requestedTiming = ((formData.get("timing") as string) || "15s").trim();
    const requestedVoice = ((formData.get("voice") as string) || "EN-IN").trim();
    const referenceImageFile = formData.get("referenceImage") as File | null;
    const clientRunId = formData.get("runId") as string | null;

    if (!audioFile && !userPrompt && !userScript) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a story prompt, script, or voiceover audio file.",
        },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const runId = clientRunId || `story-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;
    const runDir = path.join(process.cwd(), "workspace", "audio-stories", runId);
    const publicAssetsDir = path.join(process.cwd(), "public", "assets", runId);

    if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });
    if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });

    // Optional: Save uploaded reference image & encode for multimodal Wonder AI vision + Image Conditioning
    let referenceImageDataUri: string | null = null;
    let referenceImagePublicUrl: string | null = null;
    if (referenceImageFile && referenceImageFile.size > 0) {
      try {
        const imgBytes = Buffer.from(await referenceImageFile.arrayBuffer());
        const imgExt = path.extname(referenceImageFile.name).toLowerCase() || ".png";
        const mimeType =
          imgExt === ".jpg" || imgExt === ".jpeg"
            ? "image/jpeg"
            : imgExt === ".webp"
            ? "image/webp"
            : "image/png";
        const refFileName = `reference${imgExt}`;
        fs.writeFileSync(path.join(runDir, refFileName), imgBytes);
        fs.writeFileSync(path.join(publicAssetsDir, refFileName), imgBytes);
        referenceImagePublicUrl = `/assets/${runId}/${refFileName}`;
        referenceImageDataUri = `data:${mimeType};base64,${imgBytes.toString("base64")}`;
      } catch (refErr) {
        console.warn("[AudioStory] Could not process reference image:", refErr);
      }
    }

    let durationSec = Math.min(65, Math.max(5, parseInt(requestedTiming.replace("s", ""), 10) || 15));
    let audioPath = path.join(runDir, "voiceover.mp3");
    let transcriptWords: { word: string; start: number; end: number }[] = [];
    let fullTranscriptText = userScript || "";

    // CASE A: User uploaded a Voiceover Audio File
    if (audioFile && audioFile.size > 0) {
      const rawAudioBytes = await audioFile.arrayBuffer();
      const audioExt = path.extname(audioFile.name).toLowerCase() || ".mp3";
      audioPath = path.join(runDir, `voiceover${audioExt}`);
      fs.writeFileSync(audioPath, Buffer.from(rawAudioBytes));

      try {
        const probeRes = await execFileAsync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          audioPath,
        ]);
        const parsed = parseFloat(probeRes.stdout.trim());
        if (Number.isFinite(parsed) && parsed > 0) {
          durationSec = Math.min(65, +parsed.toFixed(2));
        }
      } catch (probeErr) {
        console.warn("ffprobe duration check fallback:", probeErr);
      }

      const wavPath = path.join(runDir, "extracted_audio.wav");
      try {
        const transcriptionResult = await transcribeAudio({
          videoPath: audioPath,
          wavPath,
          totalDuration: durationSec,
          userScript: userScript || userPrompt,
        });

        const allWords = transcriptionResult.segments.flatMap((s) => s.words);
        transcriptWords = allWords
          .filter((w) => w.start < durationSec)
          .map((w) => ({
            word: w.word.trim(),
            start: +w.start.toFixed(2),
            end: +Math.min(durationSec, w.end).toFixed(2),
          }));
        fullTranscriptText = transcriptionResult.segments
          .map((s) => s.text)
          .join(" ")
          .trim();
      } catch (transErr) {
        console.warn("Whisper transcription warning, generating timing windows:", transErr);
      }
    }

    if (!fullTranscriptText && userScript) {
      fullTranscriptText = userScript;
    }

    const clauses = buildSpokenClauses(transcriptWords, 6);

    // 4. Meta Muse Wonder 1.0 — Master Visual Storyteller & Character Continuity Director
    const sceneCount = Math.min(8, Math.max(3, Math.round(durationSec / 4.2)));
    let storyScenes: StoryScene[] = [];
    let resolvedStyle = requestedStyle === "auto" ? "anime" : requestedStyle;
    let storyTitle = "";
    let characterAndWorldBible = "";
    let artStylePromptLock = "";

    const apiKey =
      process.env.MODEL_API_KEY ||
      process.env.MUSE_API_KEY ||
      process.env.META_API_KEY ||
      "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";
    const baseUrl = process.env.MODEL_API_BASE_URL || "https://api.meta.ai/v1";

    const timedTranscriptSummary =
      clauses.length > 0
        ? clauses
            .map((c) => `[${c.start.toFixed(1)}s - ${c.end.toFixed(1)}s]: "${c.text}"`)
            .join("\n")
        : fullTranscriptText || userPrompt || "An epic visual story";

    const wonderSystemInstructions = `# SYSTEM PROMPT — META MUSE WONDER: MASTER IMAGE STORYTELLER & CHARACTER CONTINUITY DIRECTOR

You are a world-renowned Film & Anime Director (Makoto Shinkai, Hayao Miyazaki, Ufotable caliber) and Visual Continuity Supervisor.
Your job is to transform a spoken voiceover and/or user story prompt into a deeply coherent, visually breathtaking, character-consistent ${sceneCount}-scene Image Storyboard where EVERY scene's generated image looks like it belongs to the exact same movie and features the EXACT same character design.

## CRITICAL CHARACTER & VISUAL CONSISTENCY RULES (ZERO MISMATCH MANDATE)
1. **IDENTIFY THE TRUE CHARACTERS FROM THE ENTIRE STORY FIRST**:
   - Read the ENTIRE spoken narration and user prompt before writing any scene prompt.
   - Understand who the protagonist is (e.g., if the story mentions "Hanuman", "little monkey", "Indra", "Vayu", "Sita", the protagonist is Young Bala Hanuman — a divine golden-furred Vanara monkey-child with a gold crown, saffron dhoti, and monkey tail — NEVER a random modern human man!).
   - If a sentence says "With one mighty leap he soared through the clouds", "he" is that exact protagonist! NEVER leave ambiguous pronouns ("he", "she", "it", "the boy", "the figure") in \`characterAppearanceInScene\` or \`visualPrompt\`!
2. **CREATE \`characterAndWorldBible\` (THE LOCKED CHARACTER MODEL SHEET)**:
   - Write an ultra-specific physical description of the main character (and any key supporting characters) including:
     * Exact name & nature/species (e.g. human boy, divine baby monkey-god Bala Hanuman, cyberpunk samurai girl, medieval knight, etc.)
     * Exact age, facial features, eye color, hair/fur color and style
     * Exact clothing, colors, jewelry/crown/accessories, and silhouette
3. **CREATE \`artStylePromptLock\` (THE LOCKED ART STYLE)**:
   - The user's prompt and story tone decide the visual style!
   - If the user prompt specifies an art style (e.g., anime, mythological epic, storybook watercolor, 3D Pixar, dark fantasy, realistic cinematic), lock that exact style in \`artStylePromptLock\`.
   - If no style is explicitly mentioned in the prompt, choose the best fitting masterpiece style for the story (e.g. "2D theatrical anime film aesthetic in the style of Makoto Shinkai and Ufotable, hand-painted skies, volumetric god-rays, rich atmospheric lighting").
4. **REPEAT EXPLICIT CHARACTER TRAITS IN EVERY SCENE (\`characterAppearanceInScene\`)**:
   - Image generation models generate each scene independently. If Scene 2 only says "he leaps toward the sun", the image generator will draw a random person!
   - Therefore, in EVERY scene's \`characterAppearanceInScene\`, you MUST explicitly restate the character's physical appearance (species, age, face, hair/fur, outfit colors, crown/accessories) so every single scene generates the exact same character!
5. **DYNAMIC VISUAL EFFECTS & CAMERA CHOREOGRAPHY**:
   - Choose \`cameraMotion\` ("push_in", "pull_out", "pan_left", "pan_right", "tilt_up", "dramatic_zoom", "slow_drift") to match the action (e.g., "tilt_up" or "dramatic_zoom" when leaping into the sky).
   - Choose \`visualEffect\` ("divine_aura", "lightning_flash", "speed_lines", "sun_flare", "shockwave", "magic_sparkles", "none") to match the story beat (e.g., "lightning_flash" when lightning strikes, "speed_lines" when racing/soaring, "sun_flare" for the blazing sun, "divine_aura" for blessings/magic).
6. **STRICT CLEANLINESS**:
   - NEVER include any text, words, letters, titles, subtitles, "HOOK" badges, or watermarks inside \`visualPrompt\`.`;

    const wonderUserPrompt = `Analyze this story and create a ${sceneCount}-scene Image Storyteller production plan spanning 0.0s to ${durationSec.toFixed(1)}s:

User Prompt / Creative Direction:
"${userPrompt || "Create a cohesive, character-consistent cinematic anime story matching the narration."}"

${
  fullTranscriptText
    ? `Full Spoken Voiceover Transcript:
"${fullTranscriptText}"

Timestamped Spoken Clauses:
${timedTranscriptSummary}`
    : `No pre-recorded voiceover was uploaded. Write a compelling spoken storytelling narration across the ${sceneCount} scenes (\`spokenText\` in each scene, ~2.2 words per second) that tells the story of: "${userPrompt}".`
}

${
  referenceImageDataUri
    ? "IMPORTANT: The user attached a Reference Image. Analyze the reference image's exact character appearance, outfit, color palette, and art style, and lock those exact traits into `characterAndWorldBible`, `artStylePromptLock`, and every scene's `characterAppearanceInScene`!"
    : ""
}

Return valid JSON strictly matching the schema.`;

    try {
      const userContentBlocks: any[] = [{ type: "input_text", text: wonderUserPrompt }];
      if (referenceImageDataUri) {
        userContentBlocks.push({
          type: "input_image",
          image_url: referenceImageDataUri,
        });
      }

      const wonderPayload = {
        model: "muse-wonder-1.0",
        input: [{ role: "user", content: userContentBlocks }],
        instructions: wonderSystemInstructions,
        stream: true,
        temperature: 0.7,
        max_output_tokens: 65536,
        top_p: 0.95,
        reasoning: {
          effort: "high",
        },
        text: {
          format: {
            type: "json_schema",
            name: "MetaMuseImageStoryteller",
            schema: IMAGE_STORYTELLER_JSON_SCHEMA,
            strict: true,
          },
        },
      };

      const parsed = await withModelRetry(
        async () => {
          const wonderRes = await fetch(`${baseUrl}/responses`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify(wonderPayload),
          });
          const rawJsonText = await readModelResponse(wonderRes);
          const cleaned = rawJsonText
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          const obj = JSON.parse(cleaned);
          if (!Array.isArray(obj?.scenes) || obj.scenes.length === 0) {
            throw new Error("Wonder returned empty scenes array");
          }
          return obj;
        },
        {
          attempts: 2,
          delayMs: 1200,
          onAttemptError: (err, attempt) =>
            console.warn(`[AudioStory] Wonder attempt ${attempt} warning:`, err),
        }
      );

      if (parsed.resolvedStyle) {
        resolvedStyle = parsed.resolvedStyle;
      }
      if (parsed.title) {
        storyTitle = String(parsed.title).trim();
      }
      if (parsed.characterAndWorldBible) {
        characterAndWorldBible = String(parsed.characterAndWorldBible).trim();
      }
      if (parsed.artStylePromptLock) {
        artStylePromptLock = String(parsed.artStylePromptLock).trim();
      }

      storyScenes = parsed.scenes.map((sc: any, idx: number) => {
        const rawStart =
          typeof sc.start === "number"
            ? sc.start
            : (idx * durationSec) / parsed.scenes.length;
        const rawEnd =
          typeof sc.end === "number"
            ? sc.end
            : ((idx + 1) * durationSec) / parsed.scenes.length;
        const sStart = +Math.max(0, rawStart).toFixed(2);
        const sEnd = +Math.min(
          durationSec,
          idx === parsed.scenes.length - 1 ? durationSec : Math.max(sStart + 0.8, rawEnd)
        ).toFixed(2);

        const cleanHeadline =
          String(sc.headline || `Scene ${idx + 1}`)
            .replace(/\b(HOOK|SETUP|MECHANISM|PAYOFF|OUTRO|BEAT\s*\d*)\b/gi, "")
            .trim() || `Scene ${idx + 1}`;

        const charInScene = String(sc.characterAppearanceInScene || characterAndWorldBible || "").trim();
        const rawVisual = String(sc.visualPrompt || "").trim();

        const fullConsistentPrompt = [
          artStylePromptLock
            ? `[STYLE LOCK]: ${artStylePromptLock}.`
            : `[STYLE LOCK]: Masterpiece 2D theatrical anime film aesthetic (Makoto Shinkai & Ufotable quality), lush hand-painted lighting and atmospheric depth.`,
          characterAndWorldBible
            ? `[CHARACTER MODEL SHEET]: ${characterAndWorldBible}.`
            : "",
          charInScene ? `[SUBJECT IN THIS SHOT]: ${charInScene}.` : "",
          userPrompt ? `[USER DIRECTION]: ${userPrompt}.` : "",
          `[SCENE ACTION & FRAMING]: ${rawVisual}.`,
          `[CONTINUITY MANDATE]: Keep the character's exact species, age, facial features, hair/fur, crown/headgear, and outfit 100% identical to the Character Model Sheet. Full-bleed 9:16 vertical composition, zero text, zero subtitles, zero watermarks.`,
        ]
          .filter(Boolean)
          .join(" ");

        return {
          id: `scene_${idx + 1}`,
          index: idx + 1,
          start: sStart,
          end: sEnd,
          duration: +Math.max(0.5, sEnd - sStart).toFixed(2),
          spokenText: String(sc.spokenText || `Scene ${idx + 1}`).trim(),
          headline: cleanHeadline,
          characterAppearanceInScene: charInScene,
          visualPrompt: fullConsistentPrompt,
          cameraMotion: (sc.cameraMotion as CameraMotionType) || "push_in",
          atmosphere: (sc.atmosphere as AtmosphereType) || "golden_dust",
          lightingMood: (sc.lightingMood as LightingMoodType) || "golden_hour",
          visualEffect: (sc.visualEffect as VisualEffectType) || "none",
        };
      });
    } catch (wonderErr) {
      console.error("[AudioStory] Wonder AI error, using contextual narrative fallback:", wonderErr);
    }

    // Fallback if Wonder API was unreachable
    if (storyScenes.length === 0) {
      const segDur = durationSec / sceneCount;
      const fullContextSummary = (fullTranscriptText || userPrompt || "An epic story").slice(0, 260);
      characterAndWorldBible =
        userPrompt || `Consistent main protagonist from the story: "${fullContextSummary}"`;

      storyScenes = Array.from({ length: sceneCount }).map((_, i) => {
        const sStart = +(i * segDur).toFixed(2);
        const sEnd = +(i === sceneCount - 1 ? durationSec : (i + 1) * segDur).toFixed(2);
        const wordsInSeg = transcriptWords
          .filter((w) => w.start >= sStart - 0.15 && w.start < sEnd + 0.15)
          .map((w) => w.word)
          .join(" ");

        return {
          id: `scene_${i + 1}`,
          index: i + 1,
          start: sStart,
          end: sEnd,
          duration: +Math.max(0.5, sEnd - sStart).toFixed(2),
          spokenText: wordsInSeg || fullTranscriptText || userPrompt || `Scene ${i + 1}`,
          headline: `Scene ${i + 1}`,
          characterAppearanceInScene: characterAndWorldBible,
          visualPrompt: `[STYLE LOCK]: Masterpiece theatrical anime film aesthetic, volumetric lighting. [CHARACTER MODEL SHEET]: ${characterAndWorldBible}. [FULL STORY CONTEXT]: ${fullContextSummary}. [CURRENT SCENE ACTION]: Illustrating "${
            wordsInSeg || userPrompt || "the story moment"
          }" with the exact same recurring main character and attire. Pure 9:16 vertical anime film frame, no text, no logos.`,
          cameraMotion: i % 2 === 0 ? "push_in" : "pan_right",
          atmosphere: "golden_dust",
          lightingMood: "golden_hour",
          visualEffect: "divine_aura",
        };
      });
    }

    // CASE B: No audio file was uploaded -> Synthesize spoken narration audio from storyScenes using edge_tts!
    if (!audioFile || audioFile.size === 0) {
      const narrationLines = storyScenes.map((s) => s.spokenText).filter(Boolean);
      const combinedNarration = narrationLines.join(" ... ");
      fullTranscriptText = narrationLines.join(" ");

      const edgeVoice = EDGE_VOICES[requestedVoice] || "en-IN-PrabhatNeural";
      let synthesizedOk = false;

      if (combinedNarration.trim()) {
        try {
          await execFileAsync(resolvePython(), [
            "-m",
            "edge_tts",
            "--voice",
            edgeVoice,
            "--text",
            combinedNarration,
            "--write-media",
            audioPath,
          ]);

          if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 500) {
            synthesizedOk = true;
            const probeRes = await execFileAsync("ffprobe", [
              "-v",
              "error",
              "-show_entries",
              "format=duration",
              "-of",
              "default=noprint_wrappers=1:nokey=1",
              audioPath,
            ]);
            const probedDur = parseFloat(probeRes.stdout.trim());
            if (Number.isFinite(probedDur) && probedDur > 1) {
              durationSec = Math.min(65, +probedDur.toFixed(2));
            }
          }
        } catch (ttsErr) {
          console.warn("[AudioStory] edge_tts synthesis fallback:", ttsErr);
        }
      }

      if (!synthesizedOk) {
        // Generate clean silent audio track so MP4 muxing and HTML5 audio playback work seamlessly
        try {
          await execFileAsync("ffmpeg", [
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo",
            "-t",
            String(durationSec),
            "-c:a",
            "libmp3lame",
            "-q:a",
            "4",
            audioPath,
          ]);
        } catch {}
      }
    }

    // Ensure contiguous timeline coverage from 0 to durationSec
    if (storyScenes.length > 0) {
      const totalRaw = storyScenes[storyScenes.length - 1].end || durationSec;
      const scaleRatio = totalRaw > 0 ? durationSec / totalRaw : 1;
      storyScenes[0].start = 0;
      for (let i = 0; i < storyScenes.length; i++) {
        if (i > 0) {
          storyScenes[i].start = storyScenes[i - 1].end;
        }
        if (i === storyScenes.length - 1) {
          storyScenes[i].end = durationSec;
        } else {
          const scaledEnd = +(storyScenes[i].end * scaleRatio).toFixed(2);
          storyScenes[i].end = +Math.min(
            durationSec - 0.5,
            Math.max(storyScenes[i].start + 1.0, scaledEnd)
          ).toFixed(2);
        }
        storyScenes[i].duration = +Math.max(0.5, storyScenes[i].end - storyScenes[i].start).toFixed(2);
      }
    }

    // Populate transcriptWords aligned to scenes if Whisper wasn't used
    if (transcriptWords.length === 0) {
      const generatedWords: { word: string; start: number; end: number }[] = [];
      for (const sc of storyScenes) {
        const tokens = (sc.spokenText || "").split(/\s+/).filter(Boolean);
        if (tokens.length === 0) continue;
        const step = sc.duration / tokens.length;
        tokens.forEach((tok, idx) => {
          generatedWords.push({
            word: tok,
            start: +(sc.start + idx * step).toFixed(2),
            end: +(sc.start + (idx + 1) * step).toFixed(2),
          });
        });
      }
      transcriptWords = generatedWords;
    }

    const finalClauses = buildSpokenClauses(transcriptWords, 6);

    // 5. Generate Consistent 9:16 Artwork via Meta muse-image-1.0
    // Step 5A: Generate Scene 1 first to establish the Anchor Character Image (if no referenceImage was uploaded)
    let anchorImageDataUri = referenceImageDataUri;
    if (storyScenes.length > 0) {
      try {
        console.log(`[AudioStory] Generating Anchor Scene 1 with muse-image-1.0...`);
        const firstImg = await generateMuseImage({
          prompt: storyScenes[0].visualPrompt,
          runId,
          assetId: storyScenes[0].id,
          reasoningStrength: "high",
          referenceImageDataUri: anchorImageDataUri,
        });
        storyScenes[0].assetUrl = firstImg.publicUrl;
        storyScenes[0].localFilePath = firstImg.filePath;
        if (!anchorImageDataUri && firstImg.base64DataUri) {
          anchorImageDataUri = firstImg.base64DataUri;
        }
      } catch (firstErr) {
        console.warn(`[AudioStory] Scene 1 generation warning:`, firstErr);
      }
    }

    // Step 5B: Generate remaining Scenes 2..N in parallel batches of 3, conditioned on anchorImageDataUri + Character Sheet
    const remainingScenes = storyScenes.slice(1);
    const batchSize = 3;
    for (let i = 0; i < remainingScenes.length; i += batchSize) {
      const batch = remainingScenes.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (scene) => {
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const imageResult = await generateMuseImage({
                prompt: scene.visualPrompt,
                runId,
                assetId: scene.id,
                reasoningStrength: "high",
                referenceImageDataUri: anchorImageDataUri,
              });
              scene.assetUrl = imageResult.publicUrl;
              scene.localFilePath = imageResult.filePath;
              break;
            } catch (imgErr) {
              console.warn(
                `[AudioStory] Attempt ${attempt} failed for scene ${scene.id}:`,
                imgErr
              );
              if (attempt === 2) {
                // Fallback to nearest generated scene asset so there is never a blank frame
                const fallbackScene = storyScenes.find((s) => s.assetUrl);
                if (fallbackScene) {
                  scene.assetUrl = fallbackScene.assetUrl;
                  scene.localFilePath = fallbackScene.localFilePath;
                } else if (referenceImagePublicUrl) {
                  scene.assetUrl = referenceImagePublicUrl;
                }
              }
            }
          }
        })
      );
    }

    // If Scene 1 failed earlier, backfill from Scene 2
    if (storyScenes[0] && !storyScenes[0].assetUrl) {
      const firstValid = storyScenes.find((s) => s.assetUrl);
      if (firstValid) {
        storyScenes[0].assetUrl = firstValid.assetUrl;
        storyScenes[0].localFilePath = firstValid.localFilePath;
      }
    }

    // 6. Render Server-Side MP4 Video Output (1080x1920 H.264 + AAC Voiceover)
    const finalMp4Path = path.join(runDir, "final_cinematic_story.mp4");
    const mp4Success = await renderServerSideStoryMp4({
      scenes: storyScenes,
      audioPath,
      outputMp4Path: finalMp4Path,
      totalDuration: durationSec,
    });

    const audioUrl = `/api/audio-story/media/${runId}?type=audio`;
    const finalVideoUrl = mp4Success
      ? `/api/audio-story/media/${runId}?type=final`
      : undefined;

    // 7. Save Storyboard State
    const finalTitle =
      storyTitle ||
      `${storyScenes[0]?.headline || "Image Story"}`;

    const storyState = {
      runId,
      title: finalTitle,
      style: resolvedStyle,
      requestedStyle,
      userPrompt,
      artStylePromptLock,
      characterAndWorldBible,
      referenceImageUrl: referenceImagePublicUrl,
      imageModel: "muse-image-1.0",
      directorModel: "muse-wonder-1.0",
      duration: durationSec,
      audioUrl,
      finalVideoUrl,
      scenes: storyScenes,
      clauses: finalClauses,
      transcriptWords,
      fullTranscriptText,
      createdAt: new Date().toISOString(),
    };

    const stateFilePath = path.join(runDir, "story_state.json");
    fs.writeFileSync(stateFilePath, JSON.stringify(storyState, null, 2), "utf-8");

    // 8. Convert to Clean Interactive Storyboard Beats format for Studio UI
    const beats = storyScenes.map((sc) => ({
      id: sc.index,
      label: `Scene ${sc.index} • ${sc.headline}`,
      start: sc.start,
      end: sc.end,
      durNum: sc.duration,
      duration: `${sc.duration.toFixed(1)}s`,
      script: sc.spokenText,
      headline: sc.headline,
      visualDesc: sc.visualPrompt,
      motion: `Cinematic ${sc.cameraMotion.replace(/_/g, " ")} • ${(sc.visualEffect || "none").replace(/_/g, " ")} • ${sc.atmosphere.replace(/_/g, " ")}`,
      camera: `${sc.cameraMotion.replace(/_/g, " ")} (${sc.lightingMood.replace(/_/g, " ")})`,
      assetUrl: sc.assetUrl,
      tone: resolvedStyle,
    }));

    return NextResponse.json({
      success: true,
      runId,
      title: finalTitle,
      style: resolvedStyle,
      artStylePromptLock,
      characterAndWorldBible,
      imageModel: "muse-image-1.0",
      directorModel: "muse-wonder-1.0",
      referenceImageUrl: referenceImagePublicUrl,
      duration: durationSec,
      audioUrl,
      finalVideoUrl,
      scenes: storyScenes,
      clauses: finalClauses,
      beats,
      transcriptWords,
      fullTranscriptText,
    });
  } catch (err: any) {
    console.error("Audio story generation error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to direct image storytelling animation.",
      },
      { status: 500 }
    );
  }
}
