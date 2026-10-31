import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import util from "util";
import { transcribeAudio } from "@/lib/pipeline-b/tools/transcription";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";
import {
  validateSceneScript,
  generateProceduralSparkCode,
  PROCEDURAL_STYLE_CATALOG,
  type SceneScript,
  type ProceduralStyleId,
  type ProceduralMoodPreset,
  type AspectRatioType,
} from "@/lib/procedural-engine";

const execFileAsync = util.promisify(execFile);

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

const STORY_TO_SCENE_SCRIPT_SYSTEM_PROMPT = `# SYSTEM PROMPT — META MUSE WONDER: PROCEDURAL SCENE SCRIPT DIRECTOR

## CORE PRINCIPLE: SEPARATE STYLE FROM STORY
- **Style** is fixed deterministic math & noise code that holds the palette, layers, noise, motion rules, and typography.
- **Story** is data (a JSON Scene Script) that drives the style engine's parameters over time.
- You read the user's story, script, and/or voiceover timestamps and output **ONLY valid JSON** matching the \`ProceduralSceneScript\` schema — NEVER executable code.

## AVAILABLE STYLES (LOOKS)
1. \`"procedural-dusk"\` ("Procedural Dusk"): Atmospheric landscape with sun-to-moon sky arc, FBM mountain ridges, clouds, shimmering lake reflections, flapping birds, glowing fireflies, pine trees, and a silhouette traveller.
2. \`"neon-synthwave"\` ("Neon Synthwave"): Retro segmented sunset, 3D perspective wireframe grid scrolling with \`wind\`, outrun mountain peaks, cyber stars, and chromatic pulse.
3. \`"paper-cut-parallax"\` ("Paper-Cut Parallax"): Tactile multi-layered paper diorama hills with deep drop shadows, hanging paper sun/moon on strings, paper clouds, and floating paper lanterns.
4. \`"particle-galaxy"\` ("Particle Galaxy"): Deep cosmos with spiral nebula clouds, orbital gravity streams, constellation nodes, and starfield warp speed.
5. \`"kinetic-typography"\` ("Kinetic Typography"): Swiss brutalist geometric stage, mathematical Lissajous wave rings, harmonic spectrum equalizer, and bold word choreography.
6. \`"ink-wash"\` ("Ink Wash"): Traditional Sumi-e watercolor on rice paper, diffusing ink mountain washes, red cinnabar sun seal, swaying bamboo reeds, sampan boat, and drifting petals.

## PARAMETER TRACKS (KEYFRAMES \`[[timeSec, value0to1], ...]\`)
Every track is an array of \`{ t: number, v: number }\` keyframes from \`t = 0\` to \`t = duration\`, where \`v\` is normalized between \`0.0\` and \`1.0\`:
- \`timeOfDay\`: \`0.0\` = dawn/morning, \`0.35\` = bright midday, \`0.68\` = golden dusk/sunset, \`1.0\` = starry midnight. (e.g. "a traveller walks from morning into night" moves \`timeOfDay\` from \`0.0\` at \`t=0\` to \`0.5\` at midpoint to \`1.0\` at \`t=duration\`).
- \`cloudDensity\`: \`0.0\` = crystal clear sky, \`1.0\` = dense overcast/stormy clouds.
- \`wind\`: \`0.0\` = calm stillness, \`1.0\` = high wind / fast grid speed / rapid particle drift.
- \`cameraDrift\`: \`0.0\` = left/wide framing, \`1.0\` = sweeping pan across the horizon.
- \`intensity\`: \`0.0\` = serene minimal, \`1.0\` = dramatic climax.
- \`colorMood\`: \`0.0\` = warm golden/amber, \`0.5\` = balanced natural, \`1.0\` = cool electric/mystic.

## ELEMENTS & CAPTIONS
- Set \`elements\` counts (\`birds\`, \`fireflies\`, \`lake\`, \`stars\`, \`trees\`, \`lanterns\`, \`petals\`, \`rain\`, \`snow\`, \`boat\`, \`traveler\`, \`grid\`) to match what happens in the story.
- Write poetic, story-driven \`captions\` (\`{ t, end, text }\`) and matching \`scenes\` that progress across the exact \`duration\` timeline.
- If a user script or voiceover transcript is provided, preserve the exact spoken wording in \`captions\` and \`scenes.spokenText\` synchronized to their timestamps.`;

const PROCEDURAL_SCENE_SCRIPT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "style",
    "aspect",
    "seed",
    "duration",
    "mood",
    "tracks",
    "elements",
    "captions",
    "music",
    "scenes",
  ],
  properties: {
    title: { type: "string" },
    style: {
      type: "string",
      enum: [
        "procedural-dusk",
        "neon-synthwave",
        "paper-cut-parallax",
        "particle-galaxy",
        "kinetic-typography",
        "ink-wash",
      ],
    },
    aspect: {
      type: "string",
      enum: ["9:16", "16:9", "1:1"],
    },
    seed: { type: "integer" },
    duration: { type: "number" },
    mood: {
      type: "string",
      enum: ["calm", "tense", "dreamy", "epic", "melancholic", "electric", "zen"],
    },
    tracks: {
      type: "object",
      additionalProperties: false,
      required: ["timeOfDay", "cloudDensity", "wind", "cameraDrift", "intensity", "colorMood"],
      properties: {
        timeOfDay: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["t", "v"],
            properties: { t: { type: "number" }, v: { type: "number" } },
          },
        },
        cloudDensity: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["t", "v"],
            properties: { t: { type: "number" }, v: { type: "number" } },
          },
        },
        wind: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["t", "v"],
            properties: { t: { type: "number" }, v: { type: "number" } },
          },
        },
        cameraDrift: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["t", "v"],
            properties: { t: { type: "number" }, v: { type: "number" } },
          },
        },
        intensity: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["t", "v"],
            properties: { t: { type: "number" }, v: { type: "number" } },
          },
        },
        colorMood: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["t", "v"],
            properties: { t: { type: "number" }, v: { type: "number" } },
          },
        },
      },
    },
    elements: {
      type: "object",
      additionalProperties: false,
      required: [
        "birds",
        "fireflies",
        "lake",
        "stars",
        "trees",
        "lanterns",
        "petals",
        "rain",
        "snow",
        "boat",
        "traveler",
        "grid",
      ],
      properties: {
        birds: { type: "integer" },
        fireflies: { type: "integer" },
        lake: { type: "boolean" },
        stars: { type: "integer" },
        trees: { type: "integer" },
        lanterns: { type: "integer" },
        petals: { type: "integer" },
        rain: { type: "integer" },
        snow: { type: "integer" },
        boat: { type: "boolean" },
        traveler: { type: "boolean" },
        grid: { type: "boolean" },
      },
    },
    captions: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["t", "end", "text"],
        properties: {
          t: { type: "number" },
          end: { type: "number" },
          text: { type: "string" },
        },
      },
    },
    music: {
      type: "object",
      additionalProperties: false,
      required: ["mood", "bpm"],
      properties: {
        mood: { type: "string" },
        bpm: { type: "integer" },
      },
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
          "style",
          "mood",
          "headline",
          "spokenText",
          "visualDesc",
          "transition",
        ],
        properties: {
          id: { type: "string" },
          index: { type: "integer" },
          start: { type: "number" },
          end: { type: "number" },
          style: {
            type: "string",
            enum: [
              "procedural-dusk",
              "neon-synthwave",
              "paper-cut-parallax",
              "particle-galaxy",
              "kinetic-typography",
              "ink-wash",
            ],
          },
          mood: {
            type: "string",
            enum: ["calm", "tense", "dreamy", "epic", "melancholic", "electric", "zen"],
          },
          headline: { type: "string" },
          spokenText: { type: "string" },
          visualDesc: { type: "string" },
          transition: {
            type: "string",
            enum: ["crossfade", "iris", "wipe", "cut"],
          },
        },
      },
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let prompt = "";
    let userScript = "";
    let timing = "15s";
    let voice = "EN-IN";
    let voiceoverEnabled = false;
    let preferredStyle = "auto";
    let preferredMood = "auto";
    let aspect: AspectRatioType = "9:16";
    let seed = 42;
    let clientRunId = "";
    let uploadedAudioFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      prompt = String(formData.get("prompt") || formData.get("topic") || "").trim();
      userScript = String(formData.get("userScript") || "").trim();
      timing = String(formData.get("timing") || "15s").trim();
      voice = String(formData.get("voice") || "EN-IN").trim();
      voiceoverEnabled = formData.get("voiceoverEnabled") === "true";
      preferredStyle = String(formData.get("style") || "auto").trim();
      preferredMood = String(formData.get("mood") || "auto").trim();
      aspect = (String(formData.get("aspect") || "9:16") as AspectRatioType) || "9:16";
      seed = Number(formData.get("seed")) || 42;
      clientRunId = String(formData.get("runId") || "").trim();
      const maybeAudio = formData.get("audio");
      if (maybeAudio instanceof File && maybeAudio.size > 0) {
        uploadedAudioFile = maybeAudio;
      }
    } else {
      const body = await req.json();
      prompt = String(body.prompt || body.topic || "").trim();
      userScript = String(body.userScript || "").trim();
      timing = String(body.timing || "15s").trim();
      voice = String(body.voice || "EN-IN").trim();
      voiceoverEnabled = Boolean(body.voiceoverEnabled);
      preferredStyle = String(body.style || "auto").trim();
      preferredMood = String(body.mood || "auto").trim();
      aspect = (body.aspect as AspectRatioType) || "9:16";
      seed = Number(body.seed) || 42;
      clientRunId = String(body.runId || "").trim();
    }

    const runId =
      clientRunId ||
      `proc-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
    const runDir = path.join(process.cwd(), "workspace", "procedural-stories", runId);
    fs.mkdirSync(runDir, { recursive: true });

    let durationSec = Math.max(5, Math.min(60, parseInt(timing.replace("s", ""), 10) || 15));
    let audioUrl: string | undefined = undefined;
    let transcriptWords: { word: string; start: number; end: number }[] = [];
    let fullTranscriptText = "";

    // ── STEP 1A: If user uploaded a Voiceover Audio file, save & transcribe it ──
    if (uploadedAudioFile) {
      const ext = path.extname(uploadedAudioFile.name) || ".mp3";
      const savedAudioPath = path.join(runDir, `voiceover${ext}`);
      const buf = Buffer.from(await uploadedAudioFile.arrayBuffer());
      fs.writeFileSync(savedAudioPath, buf);

      // Probe duration
      try {
        const { stdout } = await execFileAsync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          savedAudioPath,
        ]);
        const probed = parseFloat(String(stdout).trim());
        if (Number.isFinite(probed) && probed > 1) {
          durationSec = Math.min(90, +probed.toFixed(2));
        }
      } catch {}

      // Extract 16kHz mono wav for Whisper word-level transcription
      const wavPath = path.join(runDir, "extracted_audio.wav");
      try {
        const tr = await transcribeAudio({
          videoPath: savedAudioPath,
          wavPath,
          totalDuration: durationSec,
          userScript,
        });
        transcriptWords = tr.segments.flatMap((segment) => segment.words || []);
        fullTranscriptText = tr.segments.map((segment) => segment.text).join(" ");
      } catch (trErr) {
        console.warn("[procedural-story] Audio transcription fallback:", trErr);
      }

      audioUrl = `/api/procedural-story/media/${runId}?type=audio`;
    }
    // ── STEP 1B: If Voiceover TTS is enabled (and no file uploaded), synthesize narration ──
    else if (voiceoverEnabled && (userScript || prompt)) {
      // If user provided a script, we can synthesize it right away to get exact duration!
      const rawLines = (userScript || prompt)
        .split(/\n+|(?<=[.!?])\s+/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (userScript && rawLines.length >= 2) {
        const edgeVoice = EDGE_VOICES[voice] || "en-IN-PrabhatNeural";
        const voiceMp3Path = path.join(runDir, "voiceover.mp3");
        try {
          await execFileAsync(resolvePython(), [
            "-m",
            "edge_tts",
            "--voice",
            edgeVoice,
            "--text",
            rawLines.join(" ... "),
            "--write-media",
            voiceMp3Path,
          ]);
          const { stdout } = await execFileAsync("ffprobe", [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            voiceMp3Path,
          ]);
          const probed = parseFloat(String(stdout).trim());
          if (Number.isFinite(probed) && probed > 1) {
            durationSec = +probed.toFixed(2);
            audioUrl = `/api/procedural-story/media/${runId}?type=audio`;
          }
        } catch (ttsErr) {
          console.warn("[procedural-story] Initial TTS synthesis warning:", ttsErr);
        }
      }
    }

    // ── STEP 2: Story-to-SceneScript LLM Call (Wonder AI muse-wonder-1.0) ──
    const apiKey =
      process.env.MODEL_API_KEY ||
      process.env.MUSE_API_KEY ||
      process.env.META_API_KEY ||
      "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

    const storyInputPayload = {
      storyPrompt:
        prompt || userScript || fullTranscriptText || "Create a story from the supplied voiceover",
      userScript: userScript || undefined,
      voiceoverTranscript: fullTranscriptText || undefined,
      transcriptWordTimestamps:
        transcriptWords.length > 0 ? transcriptWords.slice(0, 180) : undefined,
      duration: durationSec,
      aspect,
      seed,
      preferredStyle: preferredStyle !== "auto" ? preferredStyle : undefined,
      preferredMood: preferredMood !== "auto" ? preferredMood : undefined,
      voiceoverRequested: Boolean(voiceoverEnabled || uploadedAudioFile),
      instruction: `Convert the supplied topic, script, or audio transcript into a scene-by-scene ProceduralSceneScript JSON for a ${durationSec}s generative animation. Keep every scene, visual element, caption, and transition grounded in the supplied story; do not add unrelated generic filler. Respect preferredStyle exactly when provided. Output ONLY valid JSON matching the schema.`,
    };

    let llmRawScript: any = null;
    if (apiKey) {
      try {
        llmRawScript = await withModelRetry(
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
                    content: JSON.stringify(storyInputPayload),
                  },
                ],
                stream: true,
                temperature: 0.85,
                max_output_tokens: 16384,
                reasoning: { effort: "high" },
                instructions: STORY_TO_SCENE_SCRIPT_SYSTEM_PROMPT,
                text: {
                  format: {
                    type: "json_schema",
                    name: "ProceduralSceneScript",
                    schema: PROCEDURAL_SCENE_SCRIPT_JSON_SCHEMA,
                    strict: true,
                  },
                },
              }),
            });

            const rawText = await readModelResponse(response);
            const cleaned = rawText
              .replace(/^```[a-zA-Z]*\s*/, "")
              .replace(/```\s*$/, "")
              .trim();
            return JSON.parse(cleaned);
          },
          { attempts: 2, delayMs: 1200 }
        );
      } catch (llmErr) {
        console.warn("[procedural-story] Wonder LLM fallback to deterministic generator:", llmErr);
      }
    }

    // ── STEP 3: Validate Scene Script against Schema ──
    const sceneScript: SceneScript = validateSceneScript(llmRawScript, {
      topic: prompt || userScript || fullTranscriptText || "Procedural Story",
      duration: durationSec,
      preferredStyle: preferredStyle !== "auto" ? preferredStyle : undefined,
      preferredMood: preferredMood !== "auto" ? preferredMood : undefined,
      aspect,
      seed,
    });

    if (transcriptWords.length > 0) {
      sceneScript.words = transcriptWords;
    }

    // ── STEP 4: If Voiceover TTS is enabled and we haven't synthesized audio yet, synthesize from captions! ──
    if (voiceoverEnabled && !audioUrl && sceneScript.captions.length > 0) {
      try {
        const edgeVoice = EDGE_VOICES[voice] || "en-IN-PrabhatNeural";
        const fullNarration = sceneScript.captions.map((c) => c.text).join(" ... ");
        const voiceMp3Path = path.join(runDir, "voiceover.mp3");
        await execFileAsync(resolvePython(), [
          "-m",
          "edge_tts",
          "--voice",
          edgeVoice,
          "--text",
          fullNarration,
          "--write-media",
          voiceMp3Path,
        ]);
        const { stdout } = await execFileAsync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          voiceMp3Path,
        ]);
        const probed = parseFloat(String(stdout).trim());
        if (Number.isFinite(probed) && probed > 1) {
          const scaleRatio = probed / sceneScript.duration;
          sceneScript.duration = +probed.toFixed(2);
          sceneScript.captions = sceneScript.captions.map((c) => ({
            ...c,
            t: +(c.t * scaleRatio).toFixed(2),
            end: c.end ? +(c.end * scaleRatio).toFixed(2) : undefined,
          }));
          if (sceneScript.scenes) {
            sceneScript.scenes = sceneScript.scenes.map((s) => ({
              ...s,
              start: +(s.start * scaleRatio).toFixed(2),
              end: +(s.end * scaleRatio).toFixed(2),
              duration: +(s.duration * scaleRatio).toFixed(2),
            }));
          }
          audioUrl = `/api/procedural-story/media/${runId}?type=audio`;
        }
      } catch (ttsErr) {
        console.warn("[procedural-story] Caption TTS warning:", ttsErr);
      }
    }

    // Save validated SceneScript JSON to runDir
    fs.writeFileSync(
      path.join(runDir, "scene_script.json"),
      JSON.stringify(sceneScript, null, 2),
      "utf-8"
    );

    const styleMeta =
      PROCEDURAL_STYLE_CATALOG.find((c) => c.id === sceneScript.style) ||
      PROCEDURAL_STYLE_CATALOG[0];

    // Map scenes into Storyboard Beats for WonderStoryboard & Timeline UI
    const beats = (sceneScript.scenes || []).map((sc, idx) => ({
      id: idx + 1,
      role: `SCENE ${idx + 1}`,
      label: sc.headline || `Scene ${idx + 1} • ${styleMeta.name}`,
      tone: sc.mood || sceneScript.mood || "calm",
      start: sc.start,
      end: sc.end,
      durNum: sc.duration,
      duration: `${sc.start}s - ${sc.end}s`,
      script: sc.spokenText || sceneScript.captions[idx]?.text || sc.headline || "",
      text: sc.spokenText || sceneScript.captions[idx]?.text || sc.headline || "",
      visualDesc:
        sc.visualDesc ||
        `Look: ${styleMeta.name} • Seed #${sceneScript.seed} • Mood: ${sc.mood || sceneScript.mood}`,
      motion: `Procedural tracks (timeOfDay, wind, cloudDensity) interpolated via render(t, params, ${sceneScript.seed})`,
      camera: `Aspect ${sceneScript.aspect} • Procedural camera drift`,
      transition: sc.transition || "crossfade",
      voiceover: sc.spokenText || "",
    }));

    const sparkCode = generateProceduralSparkCode(sceneScript);

    return NextResponse.json({
      success: true,
      runId,
      audioUrl,
      sceneScript,
      styleMeta,
      beats,
      sparkCode,
      duration: sceneScript.duration,
      title: sceneScript.title || prompt || styleMeta.name,
    });
  } catch (err: any) {
    console.error("[procedural-story] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to generate Procedural Scene Script",
      },
      { status: 500 }
    );
  }
}

