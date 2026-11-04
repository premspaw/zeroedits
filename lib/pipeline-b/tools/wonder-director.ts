/**
 * Meta Muse — Pipeline B Tool: Wonder Editorial Director
 * Calls Meta Muse Wonder (muse-wonder-1.0) to act as the creative director for talking-head video editing.
 * Implements the Two-Stage AI Planning Architecture:
 *   Stage A: Editorial Cleanup (Cut approval, rhetorical protection, uncertain decisions)
 *   Deterministic Processing: Assembly of cuts, FFmpeg clean video, edited transcript mapping
 *   Stage B: Creative Direction (Rich narrative visual plan: kinetic typography, diagrams, B-roll, SAM, layouts)
 */

import dns from "dns";
import { readModelResponse } from "../../model-response.ts";
import { withModelRetry } from "../../model-retry.ts";
import { getMetaApiKey, getMetaEndpoint, getMetaModelId } from "../../meta-api.ts";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}
import type {
  CandidateCut,
  EditCut,
  EditedTranscriptSegment,
  KeepSegment,
  ProtectedRange,
  TranscriptSegment,
  TranscriptWord,
  VisualOverlayItem,
  VisualPlanSegment,
} from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";
import {
  FILLER_SOUND_REGEX,
  ISOLATED_FILLERS,
  RETAKE_CUE_WORDS,
  mapSourceTimeToEditedTime,
} from "./edit-planner.ts";
import { validateApprovedCutsSemantic } from "./cuts-validator.ts";

export const WONDER_STAGE_A_MODEL_ID =
  process.env.WONDER_STAGE_A_MODEL_ID || process.env.MODEL_ID || process.env.WONDER_MODEL_ID || getMetaModelId("wonder", "muse-wonder-1.0");
export const WONDER_STAGE_A_REASONING_EFFORT =
  process.env.WONDER_STAGE_A_REASONING_EFFORT || "xhigh";
export const WONDER_STAGE_A_MAX_OUTPUT_TOKENS =
  Number(process.env.WONDER_STAGE_A_MAX_OUTPUT_TOKENS) || 32768;

export const WONDER_STAGE_B_MODEL_ID =
  process.env.WONDER_STAGE_B_MODEL_ID || process.env.MODEL_ID || process.env.WONDER_MODEL_ID || getMetaModelId("wonder", "muse-wonder-1.0");
export const WONDER_STAGE_B_REASONING_EFFORT =
  process.env.WONDER_STAGE_B_REASONING_EFFORT || "medium";
export const WONDER_STAGE_B_MAX_OUTPUT_TOKENS =
  Number(process.env.WONDER_STAGE_B_MAX_OUTPUT_TOKENS) || 8192;

// Legacy general aliases
export const WONDER_MODEL_ID = WONDER_STAGE_A_MODEL_ID;
export const WONDER_REASONING_EFFORT = WONDER_STAGE_A_REASONING_EFFORT;
export const WONDER_MAX_OUTPUT_TOKENS = WONDER_STAGE_B_MAX_OUTPUT_TOKENS;

// ============================================================================
// STAGE A: EDITORIAL CLEANUP SYSTEM PROMPT & SCHEMA
// ============================================================================

export const WONDER_EDITORIAL_CLEANUP_SYSTEM_PROMPT = `# SYSTEM PROMPT — META MUSE WONDER: STAGE A EDITORIAL CLEANUP DIRECTOR

## IDENTITY
You are META MUSE WONDER EDITORIAL DIRECTOR, a master film editor and dialogue specialist.
Your mission is to transform raw, rambling, stuttered talking-head video into a punchy, professional, high-retention reel (~25-30s from 45s+ raw).
Review candidate cuts, evaluate spoken dialogue rhythm, approve edits that remove dead air, stammers, false-start phrases, and vocal fillers, and protect intentional speaker delivery.

## EDITORIAL RULES & RESPONSIBILITIES

1. EDITORIAL GOAL:
   - Modern short-form video requires crisp pacing with zero dead air, zero repeated false starts, and zero stuttering.
   - Actively APPROVE candidate cuts AND analyze the full transcript to cut:
     a) Rapid repeated word stutters (e.g. repeated words like "two two two...", repeated "like, like, like...", rapid stammering tokens like "poop poop poop...", "this, this"). Keep only one clean utterance and cut the rest so the same words never appear twice.
     b) Sentence-level & multi-word phrase retakes at a retake point: Whenever a speaker starts a sentence or clause, hits a retake point (such as "uh", "uhhh", "ummm", "wait", "sorry", or an empty space / hesitation pause), and restarts the sentence or phrase (e.g., "Today we are going to— uhhh — Today we are going to build...", "only when five clicks... only in five clicks", "When we first... [pause] ...When I built..."), you MUST cut the ENTIRE aborted first sentence/clause + the "uhhh" + the empty space right up to the clean second take.
     c) Vocal fillers and hesitation sounds ("ah", "ahh", "um", "umm", "ummm", "uh", "uhhh", "er", "hmm", "okay", "like") and all adjacent empty space around them.
     d) Starting vocal fillers ("ah", "um", "uhhh") and initial/trailing dead air: MUST be approved for cutting so the video hooks instantly without hesitation.
     e) Empty space / dead air (> 0.35s).

2. SCRIPT AS GROUND TRUTH & REPETITION RESOLUTION:
   - When a userScript is provided, it represents the speaker's true intent.
   - If the speaker says the same word 3, 4, or 5 times (e.g., "like, like, like"), but the script only has it once, you MUST approve cutting all redundant duplicate repetitions, preserving only the final clean instance.
   - Distinguish INTENTIONAL RHETORICAL REPETITION (e.g., "very, very simple", "more and more", "never, never give up") from ACCIDENTAL HESITATIONS. Intentional repetition should be protected; accidental stutters must be cut.

3. VOCAL FILLERS & NATURAL PAUSES:
   - Approve cutting all vocal fillers ("ah", "um", "uh", "er", "like") that do not appear in the ground truth script.
   - Preserve natural micro-breathing (0.15s to 0.35s). Do NOT protect long hesitation silences.

4. PROTECTED RANGES & UNCERTAIN DECISIONS:
   - Spoken ranges marked in protectedRanges CANNOT be cut. Protect ONLY genuine intended speech content, intentional emphasis, and clean final takes.
   - Do NOT protect vocal fillers ("ah", "um") or stutter repetitions.
   - Document uncertain candidates in uncertainDecisions with the action taken ("kept_safe" or "cut") and rationale.

5. OUTPUT FORMAT:
   Return valid JSON strictly matching the schema without markdown fences or extraneous text.`;

export const WONDER_EDITORIAL_CLEANUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    planId: { type: "string" },
    approvedCuts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          start: { type: "number" },
          end: { type: "number" },
          type: { type: "string", enum: ["silence", "filler", "retake", "off_script"] },
          reason: { type: "string" },
          cutWord: { type: "string" },
        },
        required: ["id", "start", "end", "type", "reason", "cutWord"],
      },
    },
    protectedRanges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          start: { type: "number" },
          end: { type: "number" },
          reason: { type: "string" },
          protectedWords: { type: "string" },
        },
        required: ["start", "end", "reason", "protectedWords"],
      },
    },
    uncertainDecisions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          candidateId: { type: "string" },
          actionTaken: { type: "string", enum: ["kept_safe", "cut"] },
          rationale: { type: "string" },
        },
        required: ["candidateId", "actionTaken", "rationale"],
      },
    },
    editorialNotes: { type: "string" },
  },
  required: ["planId", "approvedCuts", "protectedRanges", "uncertainDecisions", "editorialNotes"],
};

// Legacy aliases
export const WONDER_TALKING_HEAD_DIRECTOR_SYSTEM_PROMPT = WONDER_EDITORIAL_CLEANUP_SYSTEM_PROMPT;
export const WONDER_EDITORIAL_DECISION_SCHEMA = WONDER_EDITORIAL_CLEANUP_SCHEMA;

// ============================================================================
// STAGE B: CREATIVE DIRECTION SYSTEM PROMPT & SCHEMA
// ============================================================================

export const WONDER_CREATIVE_DIRECTOR_SYSTEM_PROMPT = `# SYSTEM PROMPT — META MUSE WONDER: STAGE B CREATIVE VISUAL DIRECTOR

## IDENTITY
You are META MUSE WONDER CREATIVE DIRECTOR, an elite short-form Reel Editor and Minimalist Motion Director.
Your objective is to analyze the FINAL CLEAN NARRATIVE (after editorial cuts) and edit it like a world-class reel editor: alternating cleanly between the speaker's full-frame face ("fullscreen_speaker") and ultra-clean, 100% full-screen visual animation cutaways ("broll_takeover") only when the spoken script calls for a visual explanation.

## CRITICAL GROUNDING & FIDELITY MANDATE (ZERO HALLUCINATION RULE)
- ALL visual concepts, headlines, and spoken references MUST be derived 100% from the speaker's actual dialogue in the provided editedTranscript.
- DO NOT invent or copy examples about video editing, software apps, timelines, or unrelated topics unless the speaker is literally discussing them in the transcript.
- "spokenReference" MUST be an exact verbatim phrase spoken by the speaker in the specified start..end window.
- "headlineText" MUST be 2–4 punchy, uppercase words directly quoting or summarizing the speaker's core words in that specific segment.

## ZAI (Z) — AUTONOMOUS DIRECTOR & CUTOUT PIPELINE RULES (NO STATIC AI IMAGES)

1. ZERO STATIC AI IMAGES — 100% CODEBASE STORY ANIMATIONS + SAM 3.1 CUTOUTS:
   - NEVER use static AI images ("generated_image").
   - As per the spoken story, you autonomously decide and trigger executable CODEBASE ANIMATIONS (HTML5/CSS3/JS/SVG/Canvas: "animated_diagram", "procedural_graphic", "ui_mockup", "kinetic_typography", "sam_cutout_pop") that visually tell the story beat-by-beat.

2. CUTOUT TEMPLATE ("cutout" / "samCutoutExplainer") WORKFLOW:
   - PRE-TALKING-HEAD ANIMATION LEAD-IN ("sam_cutout"): Before you include the talking-head video, the codebase story animation can run first (0.0s–0.85s of the beat) to hook the viewer and illustrate the concept, and then the SAM 3.1 speaker cutout pops in over the live animation!
   - 3 WAYS TO USE SAM 3.1 CUTOUTS:
     a) "sam_cutout" (Animation Lead-In + Floating Cutout): Full-screen codebase animation runs first, then the SAM 3.1 speaker cutout pops in with spring physics, cutout border, and drop shadow.
     b) "depth_cutout" (3-Layer Depth Typography & Motion Graphics): SAM 3.1 speaker mask on top layer (z-index: 30), bold kinetic titles & SVG rings on middle layer (z-index: 20) moving BEHIND the speaker's head/shoulders, and canvas shader backdrop on bottom layer (z-index: 10).
     c) "broll_takeover" (Full Codebase Animation Takeover): Cover A-Roll completely with a 100% full-screen codebase story animation (charts, code terminal, process steps, comparison bars) while the speaker's voice continues underneath.
     d) "fullscreen_speaker" (Pure A-Roll Window): High-trust eye contact with 1.0x–1.12x punch-in cuts on emphasis words.

3. YAPPING STYLE / STORY EXPLAINER TEMPLATE ("storyExplainer" / "auto") WORKFLOW — GENIUS REEL EDITOR RULES:
   - FACE VALUE IS KING (80–85% ON SPEAKER'S FACE): In Yapping Style, viewers connect with the speaker's face. Keep 80–85% of segments on "fullscreen_speaker" with dynamic camera punch-ins (1.0x -> 1.12x) and script-specific pop-up motion graphics appearing around the speaker's face (top-left, top-right, mid-left, mid-right) synced to the exact spoken words.
   - SHORT 3-SECOND FULL-SCREEN BURSTS ONLY: Never hide the speaker's face behind a long, slow full-screen animation (>3.5s) or people will get bored. Only use "broll_takeover" on 1 or at most 2 climax beats in the entire reel, and keep any full-screen cutaway segment tight (2.5s–3.5s max) before cutting right back to the speaker's face.
   - ZERO GENERIC TEMPLATES: Every pop-up motion and cutaway in "motionIntent" MUST be custom-designed for the exact nouns, numbers, actions, and metaphors in the speaker's script. Never use 50/50 split screens.
- For each beat, return a visualRecipe with a beat-specific metaphor and 2–5 concrete objects. Choose each object's shape, movement, and position to illustrate the actual script. Do not reuse an object set or composition on adjacent beats. Never use a phone unless the dialogue explicitly mentions one.

4. ULTRA-CLEAN, MINIMAL SINGLE-FOCUS STORY VISUALS & 9:16 SAFE ZONES:
   - Author all visual systems on a 9:16 vertical Canvas (1080x1920).
   - Keep captions, key cutouts, and focal points out of the bottom 20% and right 15% safe zones.
   - Set "headlineText" to 2–4 punchy, crystal-clear words maximum derived from that segment's speech.

5. CONTINUOUS UNINTERRUPTED CAPTIONS:
   - Word-by-word WhisperX captions run continuously in the safe zone across all scenes without interruption.

6. OUTPUT FORMAT:
   Return valid JSON strictly matching the schema without markdown fences or extraneous text.`;

export const ZAI_TIMELINE_DIRECTOR_INSTRUCTIONS = {
  id: "zai-hypit-full-pipeline-director",
  title: "ZAI (Z) — Autonomous Cutout & Codebase Story Animation Director",
  summary:
    "Zero static AI images. Every story beat is driven by executable codebase animations (HTML5/CSS3/JS/SVG/Canvas) synced to WhisperX timestamps, layered with SAM 3.1 speaker cutouts and A-Roll windows.",
  stages: [
    {
      stage: "Stage 1",
      name: "FFmpeg Wastage Removal & WhisperX Locking",
      detail: "Slices out dead air (>0.4s), filler words, and retakes; locks word-level timestamps as Timeline triggers.",
    },
    {
      stage: "Stage 2",
      name: "Pre-Talking-Head Animation & A-Roll Pacing",
      detail: "Codebase story animation runs first to establish the visual hook before the talking-head SAM 3.1 cutout pops in; pattern interrupts every 2.0s–3.5s.",
    },
    {
      stage: "Stage 3",
      name: "SAM 3.1 Subject Cutout & 3-Layer Depth Engine",
      detail: "z-10 Canvas Backdrop -> z-20 Behind-the-Head Kinetic Story Typography & Diagrams -> z-30 SAM 3.1 Speaker Cutout.",
    },
    {
      stage: "Stage 4",
      name: "Autonomous Codebase Story Animations (No Images)",
      detail: "AI selects the exact procedural animation for the story: Step Stack, KPI Gauge/Chart, Contrast Diff, Code Terminal, or Architecture Flow.",
    },
    {
      stage: "Stage 5",
      name: "HTML5 / CSS3 / JS / SVG / Canvas Motion Stack",
      detail: "Spring physics cubic-bezier(0.16, 1, 0.3, 1), SVG stroke-dashoffset connectors, and deterministic 60fps canvas rendering.",
    },
    {
      stage: "Stage 6",
      name: "9:16 Safe-Zone & Seamless Loop Mastering",
      detail: "1080x1920 vertical canvas keeping cutouts & captions clear of bottom 20% and right 15%.",
    },
  ],
};

export const WONDER_CREATIVE_DIRECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    planId: { type: "string" },
    title: { type: "string" },
    hookLine: { type: "string" },
    narrativeTheme: { type: "string" },
    visualSegments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          start: { type: "number" },
          end: { type: "number" },
          layoutType: {
            type: "string",
            enum: [
              "fullscreen_speaker",
              "split_screen",
              "stacked_layout",
              "picture_in_picture",
              "broll_takeover",
              "sam_cutout",
              "depth_cutout",
            ],
          },
          technique: {
            type: "string",
            enum: [
              "kinetic_typography",
              "dynamic_captions",
              "animated_diagram",
              "procedural_graphic",
              "ui_mockup",
              "broll_clip",
              "generated_image",
              "ai_video",
              "sam_cutout_pop",
              "camera_punch_in",
              "brand_lower_third",
            ],
          },
          spokenReference: { type: "string" },
          motionIntent: { type: "string" },
          visualRecipe: {
            type: "object",
            additionalProperties: false,
            properties: {
              metaphor: { type: "string" },
              objects: {
                type: "array",
                minItems: 2,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    label: { type: "string" },
                    shape: { type: "string", enum: ["circle", "rect", "diamond", "line", "text"] },
                    motion: { type: "string", enum: ["rise", "orbit", "pulse", "slide", "unfold", "scatter"] },
                    position: { type: "string", enum: ["upper-left", "upper-right", "center", "lower-left", "lower-right"] },
                  },
                  required: ["label", "shape", "motion", "position"],
                },
              },
            },
            required: ["metaphor", "objects"],
          },
          requiredAssets: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string", enum: ["image", "video", "icon", "diagram", "ui_mockup"] },
                description: { type: "string" },
                prompt: { type: "string" },
              },
              required: ["type", "description", "prompt"],
            },
          },
          layerArrangement: {
            type: "string",
            enum: ["background", "main", "overlay", "foreground"],
          },
          transitionDirection: {
            type: "string",
            enum: ["slide_up", "slide_down", "slide_left", "slide_right", "pop_in", "zoom_in", "fade", "none"],
          },
          cameraZoom: { type: "number" },
          headlineText: { type: "string" },
          galleryAssetId: { type: ["string", "null"] },
        },
        required: [
          "id",
          "start",
          "end",
          "layoutType",
          "technique",
          "spokenReference",
          "motionIntent",
          "visualRecipe",
          "requiredAssets",
          "layerArrangement",
          "transitionDirection",
          "cameraZoom",
          "headlineText",
          "galleryAssetId",
        ],
      },
    },
    editorialNotes: { type: "string" },
  },
  required: ["planId", "title", "hookLine", "narrativeTheme", "visualSegments", "editorialNotes"],
};

// ============================================================================
// PARAMS & RESULT INTERFACES
// ============================================================================

export interface WonderDirectorParams {
  transcript: TranscriptSegment[];
  candidateCuts: CandidateCut[];
  totalDuration: number;
  templateId?: string;
  userScript?: string;
  pacingProfile?: string;
  brandSettings?: Record<string, any>;
  runId: string;
  mode?: "wonder-ai" | "rules-only";
  onLogEvent?: (event: string, meta?: any) => void;
  fetchImpl?: typeof fetch;
}

export interface WonderEditorialCleanupParams {
  transcript: TranscriptSegment[];
  candidateCuts: CandidateCut[];
  totalDuration: number;
  templateId?: string;
  userScript?: string;
  pacingProfile?: string;
  /** Acoustically measured silences (ffmpeg). Ground truth: Whisper word times can be off by 0.3-0.8s. */
  silences?: { start: number; end: number; duration: number }[];
  runId: string;
  mode?: "wonder-ai" | "rules-only";
  onLogEvent?: (event: string, meta?: any) => void;
  fetchImpl?: typeof fetch;
}

export interface WonderEditorialCleanupResult {
  planId: string;
  approvedCuts: EditCut[];
  protectedRanges: ProtectedRange[];
  uncertainDecisions?: {
    candidateId: string;
    actionTaken: "kept_safe" | "cut";
    rationale: string;
  }[];
  editorialNotes: string;
}

export interface WonderCreativeDirectorParams {
  editedTranscript: EditedTranscriptSegment[];
  cleanDuration: number;
  templateId?: string;
  userScript?: string;
  brandSettings?: Record<string, any>;
  runId: string;
  mode?: "wonder-ai" | "rules-only";
  onLogEvent?: (event: string, meta?: any) => void;
  fetchImpl?: typeof fetch;
  galleryAssets?: Array<{ id: string; name: string; tags: string[]; kind: "video" | "image"; duration?: number; frameDataUrl?: string }>;
}

export interface WonderCreativeDirectorResult {
  planId: string;
  title: string;
  hookLine: string;
  narrativeTheme?: string;
  visualSegments: VisualPlanSegment[];
  visualPlan: VisualOverlayItem[];
  editorialNotes: string;
}

export interface WonderEditorialDecision {
  planId: string;
  title: string;
  hookLine: string;
  approvedCuts: EditCut[];
  protectedRanges: ProtectedRange[];
  uncertainDecisions?: {
    candidateId: string;
    actionTaken: "kept_safe" | "cut";
    rationale: string;
  }[];
  visualPlan: VisualOverlayItem[];
  visualSegments?: VisualPlanSegment[];
  editedTranscript?: EditedTranscriptSegment[];
  editorialNotes: string;
  tokenUsage?: { input?: number; output?: number };
}

// ============================================================================
// STAGE A: CALL WONDER EDITORIAL CLEANUP
// ============================================================================

export async function callWonderEditorialCleanup(
  params: WonderEditorialCleanupParams
): Promise<WonderEditorialCleanupResult> {
  const {
    transcript,
    candidateCuts,
    totalDuration,
    templateId = "hormoziPunch",
    userScript,
    pacingProfile = "natural",
    silences = [],
    runId,
    mode = "wonder-ai",
    onLogEvent,
    fetchImpl,
  } = params;

  const template = getPipelineBTemplate(templateId);
  const allWords = transcript.flatMap((s) => s.words);

  // If rules-only mode requested, run deterministic fallback
  if (mode === "rules-only") {
    onLogEvent?.("RULES_ONLY_PLANNING_ACTIVE", { runId });
    const fallback = createDeterministicFallbackPlan({
      transcript,
      candidateCuts,
      allWords,
      totalDuration,
      template,
      runId,
    });
    return {
      planId: fallback.planId,
      approvedCuts: fallback.approvedCuts,
      protectedRanges: fallback.protectedRanges,
      uncertainDecisions: fallback.uncertainDecisions,
      editorialNotes: fallback.editorialNotes,
    };
  }

  const apiKey = getMetaApiKey();

  if (!apiKey) {
    const errorMsg =
      "Wonder AI Director is not configured. Missing MODEL_API_KEY / MUSE_API_KEY / META_API_KEY. In accordance with fail-safe policy, automatic rule-based cutting was not applied.";
    onLogEvent?.("WONDER_CONFIGURATION_ERROR", { runId, error: errorMsg });
    throw new Error(errorMsg);
  }

  const wonderInput = {
    runId,
    totalDuration,
    templateId: template.id,
    templateName: template.name,
    pacingProfile,
    userScript: userScript || null,
    transcript: transcript.map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      text: s.text,
      words: s.words.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })),
    })),
    measuredSilences: silences.map((x) => ({ start: x.start, end: x.end })),
    candidateCuts: candidateCuts.map((c) => ({
      id: c.id,
      start: c.start,
      end: c.end,
      type: c.type,
      classification: c.classification,
      affectedText: c.affectedText,
      reason: c.reason,
      alternativeKeepOption: c.alternativeKeepOption,
    })),
    instruction:
      "Stage A: Analyze the full transcript and candidate cuts at the sentence and word level. Core mandates: (1) ELIMINATE all vocal fillers ('ah', 'ahh', 'um', 'umm', 'uh', 'uhhh', 'er', 'hmm', 'like') and surrounding empty space; (2) CUT starting fillers and initial/trailing empty space so the video hooks immediately; (3) SENTENCE & PHRASE RETAKES: Whenever the speaker starts a sentence or phrase, hesitates at a retake point ('uhhh', 'um', 'wait', or empty space), and repeats or restarts the sentence/words, APPROVE cutting the entire aborted first sentence/phrase + 'uhhh' + empty space so the same words are never spoken or captioned twice. (4) NEVER cut a word that belongs to the take you keep: for every repeated phrase decide the single best complete take IN SPOKEN ORDER and keep that take whole (all of its words contiguous, never mixing words from different takes); cut the whole failed take, not individual words. (5) Word timestamps are approximate; 'measuredSilences' are the true acoustic silences. Prefer cut boundaries that lie inside a measuredSilence and never cut where no silence exists between two kept words, so sentence-final words ('life', 'phones', 'dreams') are never clipped. Return approved cuts, protected ranges, and uncertain decisions matching the schema.",
  };

  const payload = {
    model: WONDER_STAGE_A_MODEL_ID,
    input: [
      {
        role: "user",
        content: JSON.stringify(wonderInput),
      },
    ],
    stream: true,
    temperature: 0.7,
    max_output_tokens: WONDER_STAGE_A_MAX_OUTPUT_TOKENS,
    top_p: 1,
    reasoning: {
      effort: WONDER_STAGE_A_REASONING_EFFORT,
    },
    instructions: WONDER_EDITORIAL_CLEANUP_SYSTEM_PROMPT,
    text: {
      format: {
        type: "json_schema",
        name: "PipelineBWonderEditorialCleanupSchema",
        schema: WONDER_EDITORIAL_CLEANUP_SCHEMA,
        strict: true,
      },
    },
  };

  const startTime = Date.now();
  onLogEvent?.("WONDER_REQUEST_STARTED", {
    runId,
    model: WONDER_STAGE_A_MODEL_ID,
    reasoningEffort: WONDER_STAGE_A_REASONING_EFFORT,
    maxOutputTokens: WONDER_STAGE_A_MAX_OUTPUT_TOKENS,
    stage: "Stage_A_Editorial_Cleanup",
    candidatesCount: candidateCuts.length,
    wordsCount: allWords.length,
    timestamp: new Date().toISOString(),
  });

  let rawJson = "";
  try {
    rawJson = await withModelRetry(
      async () => {
        const fetchFn = fetchImpl || fetch;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);
        try {
        const response = await fetchFn(getMetaEndpoint("responses"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(`Wonder API returned HTTP ${response.status}: ${errBody}`);
        }
        return await readModelResponse(response);
        } catch (err: any) {
          if (err?.name === "AbortError") throw new Error("Wonder editorial analysis timed out after 90 seconds.");
          throw err;
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        attempts: 1,
        delayMs: 1600,
        onAttemptError: (err: any, attempt) => {
          onLogEvent?.("WONDER_REQUEST_RETRY", { runId, attempt, error: err?.message || String(err) });
        },
      }
    );
  } catch (apiErr: any) {
    const elapsed = Date.now() - startTime;
    const warnMsg = `Wonder AI Director API call failed after ${elapsed}ms (${apiErr.message}). Falling back to deterministic ZAI editorial cleanup.`;
    onLogEvent?.("WONDER_FALLBACK_TO_RULES", { runId, elapsedMs: elapsed, warning: warnMsg });
    return createDeterministicFallbackPlan({
      candidateCuts,
      transcript,
      allWords,
      totalDuration,
      template,
      runId,
    });
  }

  const responseElapsed = Date.now() - startTime;
  onLogEvent?.("WONDER_RESPONSE_RECEIVED", {
    runId,
    elapsedMs: responseElapsed,
    rawBytes: rawJson.length,
  });

  // Parse and schema-validate the AI output
  let parsed: any;
  try {
    const cleanJson = rawJson.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseErr: any) {
    const warnMsg = `Wonder AI Director returned invalid JSON (${parseErr.message}). Falling back to deterministic ZAI editorial cleanup.`;
    onLogEvent?.("WONDER_FALLBACK_TO_RULES", { runId, warning: warnMsg });
    return createDeterministicFallbackPlan({
      candidateCuts,
      transcript,
      allWords,
      totalDuration,
      template,
      runId,
    });
  }

  if (!parsed || !Array.isArray(parsed.approvedCuts)) {
    const warnMsg =
      "Wonder AI Director response does not conform to the required editorial schema. Falling back to deterministic ZAI editorial cleanup.";
    onLogEvent?.("WONDER_FALLBACK_TO_RULES", { runId, warning: warnMsg });
    return createDeterministicFallbackPlan({
      candidateCuts,
      transcript,
      allWords,
      totalDuration,
      template,
      runId,
    });
  }

  // Extract raw protected ranges
  const rawProtectedRanges: ProtectedRange[] = Array.isArray(parsed.protectedRanges)
    ? parsed.protectedRanges
        .filter((p: any) => typeof p.start === "number" && typeof p.end === "number" && p.end > p.start)
        .map((p: any) => ({
          start: Math.max(0, +p.start.toFixed(2)),
          end: Math.min(totalDuration, +p.end.toFixed(2)),
          reason: p.reason || "Protected by Wonder AI Director",
          protectedWords: p.protectedWords,
        }))
    : [];

  // Track candidates explicitly rejected by Wonder AI in uncertainDecisions (actionTaken === "kept_safe")
  const rejectedCandidateIds = new Set<string>(
    Array.isArray(parsed.uncertainDecisions)
      ? parsed.uncertainDecisions
          .filter((d: any) => d && d.actionTaken === "kept_safe" && typeof d.candidateId === "string")
          .map((d: any) => d.candidateId)
      : []
  );

  // Ensure vocal fillers, initial 'ah', leading/trailing dead air, and non-rejected utterance/word stutters are not locked by broad protectedRanges
  const highConfRetakeOrFillerCands = candidateCuts.filter(
    (c) =>
      !rejectedCandidateIds.has(c.id) &&
      (c.classification === "accidental_stutter" ||
        c.classification === "filler_pause" ||
        c.id === "cand-lead-silence" ||
        c.id === "cand-trail-silence" ||
        c.id === "cand-lead-filler")
  );

  const cleanedProtectedRanges = rawProtectedRanges.filter((p) => {
    const pw = (p.protectedWords || "").toLowerCase().trim();
    if (ISOLATED_FILLERS.has(pw) || FILLER_SOUND_REGEX.test(pw) || RETAKE_CUE_WORDS.has(pw)) {
      return false;
    }
    // Never allow a protectedRange to block a cut that Wonder AI itself explicitly approved
    const blocksAiApprovedCut = (parsed.approvedCuts || []).some(
      (c: any) => typeof c.start === "number" && typeof c.end === "number" && Math.max(c.start, p.start) < Math.min(c.end, p.end) - 0.04
    );
    if (blocksAiApprovedCut) return false;

    const isIntentionalEmphasis = /emphasis/i.test(p.reason || "");
    if (!isIntentionalEmphasis) {
      // Do not allow generic or breathing-pause protected ranges to block non-rejected high-confidence retake or filler cuts
      const blocksRetakeOrFiller = highConfRetakeOrFillerCands.some(
        (c) => Math.max(c.start, p.start) < Math.min(c.end, p.end) - 0.04
      );
      if (blocksRetakeOrFiller) return false;
    }
    return true;
  });

  // Combine AI approved cuts with non-rejected high-confidence candidate cuts
  const approvedIds = new Set((parsed.approvedCuts || []).map((c: any) => c.id));
  const candById = new Map<string, CandidateCut>(candidateCuts.map((c) => [c.id, c]));
  const mergedApprovedCuts: any[] = (parsed.approvedCuts || []).map((rawCut: any) => {
    const cand = candById.get(rawCut.id);
    let cutType = rawCut.type || "silence";
    const r = ((rawCut.reason || "") + " " + (cand?.reason || "")).toLowerCase();
    if (
      cand?.type === "phrase_retake" ||
      cand?.type === "false_start" ||
      cand?.type === "repetition" ||
      cand?.classification === "accidental_stutter" ||
      r.includes("aborted") ||
      r.includes("retake") ||
      r.includes("repeat") ||
      r.includes("false start") ||
      r.includes("stumble") ||
      r.includes("hesitant")
    ) {
      cutType = "retake";
    } else if (
      cand?.type === "filler" ||
      cand?.classification === "filler_pause" ||
      r.includes("filler") ||
      r.includes("hesitation sound")
    ) {
      cutType = "filler";
    }
    return {
      ...rawCut,
      type: cutType,
    };
  });

  // Wonder AI is the sole editorial decision-maker for cuts and retakes.
  // Only include candidate cuts that Wonder AI explicitly approved in approvedCuts
  // or explicitly marked as actionTaken === "cut" in uncertainDecisions, plus initial/trailing dead air.
  const uncertainCutIds = new Set<string>(
    Array.isArray(parsed.uncertainDecisions)
      ? parsed.uncertainDecisions
          .filter((d: any) => d && d.actionTaken === "cut" && typeof d.candidateId === "string")
          .map((d: any) => d.candidateId)
      : []
  );

  for (const cand of candidateCuts) {
    if (approvedIds.has(cand.id) || rejectedCandidateIds.has(cand.id)) continue;

    const isLeadOrTrailCut =
      cand.id === "cand-lead-silence" ||
      cand.id === "cand-trail-silence" ||
      cand.id === "cand-lead-filler";
    const isExplicitlyCutByWonder = uncertainCutIds.has(cand.id);

    if (isLeadOrTrailCut || isExplicitlyCutByWonder) {
      // Check if inside legitimate protected speech (excluding fillers)
      const isProtected = cleanedProtectedRanges.some((p) => {
        const oStart = Math.max(cand.start, p.start);
        const oEnd = Math.min(cand.end, p.end);
        return oEnd - oStart > 0.05;
      });

      if (!isProtected) {
        let mappedType: EditCut["type"] = "silence";
        if (cand.type === "filler") {
          mappedType = "filler";
        } else if (
          cand.type === "repetition" ||
          cand.type === "phrase_retake" ||
          cand.type === "false_start"
        ) {
          mappedType = "retake";
        }
        mergedApprovedCuts.push({
          id: cand.id,
          start: cand.start,
          end: cand.end,
          type: mappedType,
          reason: cand.reason,
          cutWord: cand.affectedText,
        });
        approvedIds.add(cand.id);
      }
    }
  }

  // Perform full semantic validation on approved cuts
  const semanticValidation = validateApprovedCutsSemantic(mergedApprovedCuts, {
    totalDuration,
    protectedRanges: cleanedProtectedRanges,
    transcript,
  });

  if (semanticValidation.warnings.length > 0) {
    onLogEvent?.("WONDER_CUTS_SEMANTIC_WARNINGS", {
      runId,
      warnings: semanticValidation.warnings,
      rejectedCount: semanticValidation.rejectedCuts.length,
      adjustedCount: semanticValidation.adjustedCuts.length,
    });
  }

  const planId = parsed.planId || `wonder-cleanup-${Date.now()}`;
  onLogEvent?.("WONDER_PLAN_VALIDATED", {
    runId,
    planId,
    approvedCutsCount: semanticValidation.validCuts.length,
    protectedRangesCount: cleanedProtectedRanges.length,
    rejectedCutsCount: semanticValidation.rejectedCuts.length,
  });

  return {
    planId,
    approvedCuts: semanticValidation.validCuts,
    protectedRanges: cleanedProtectedRanges,
    uncertainDecisions: parsed.uncertainDecisions || [],
    editorialNotes:
      parsed.editorialNotes || "Wonder AI Director completed Stage A editorial cleanup.",
  };
}

// ============================================================================
// DETERMINISTIC TRANSCRIPT MAPPING TO EDITED TIMELINE
// ============================================================================

export function buildEditedTranscript(
  transcript: TranscriptSegment[],
  keepSegments: KeepSegment[]
): EditedTranscriptSegment[] {
  const editedSegments: EditedTranscriptSegment[] = [];
  const cleanDuration = +keepSegments.reduce((acc, k) => acc + k.duration, 0).toFixed(2);
  const emphasisSet = new Set([
    "very",
    "really",
    "never",
    "more",
    "again",
    "so",
    "many",
    "much",
    "big",
    "great",
    "now",
    "far",
    "fast",
    "deep",
    "long",
    "true",
  ]);

  let lastEditedEnd = 0;

  for (const seg of transcript) {
    const rawRetainedWords = [];
    for (const w of seg.words) {
      const cleanW = w.word.toLowerCase().replace(/[^\w]/g, "");
      // Never include vocal fillers ("uhhh", "ummm", "ahhh", "er", "hmm") or verbal retake cues in final captions
      if (ISOLATED_FILLERS.has(cleanW) || FILLER_SOUND_REGEX.test(cleanW) || RETAKE_CUE_WORDS.has(cleanW)) {
        continue;
      }

      const wordDur = Math.max(0.04, w.end - w.start);
      let retainedOverlap = 0;
      for (const k of keepSegments) {
        const oStart = Math.max(w.start, k.start);
        const oEnd = Math.min(w.end, k.end);
        if (oEnd > oStart) {
          retainedOverlap += oEnd - oStart;
        }
      }
      const mid = (w.start + w.end) / 2;
      const isRetained =
        retainedOverlap / wordDur >= 0.5 ||
        keepSegments.some((k) => mid >= k.start + 0.01 && mid <= k.end - 0.01);

      if (isRetained) {
        rawRetainedWords.push(w);
      }
    }

    // Deduplicate any residual adjacent repeated words or 2-3 word retake phrases so captions never repeat stutters
    const dedupedSourceWords = [];
    let wi = 0;
    while (wi < rawRetainedWords.length) {
      const wCur = rawRetainedWords[wi];
      const cleanCur = wCur.word.toLowerCase().replace(/[^\w]/g, "");

      // Check 2-3 word immediate phrase repeat
      let skippedPhrase = false;
      for (const pLen of [3, 2]) {
        if (wi + 2 * pLen <= rawRetainedWords.length) {
          const p1 = rawRetainedWords
            .slice(wi, wi + pLen)
            .map((x) => x.word.toLowerCase().replace(/[^\w]/g, ""))
            .join(" ");
          const p2 = rawRetainedWords
            .slice(wi + pLen, wi + 2 * pLen)
            .map((x) => x.word.toLowerCase().replace(/[^\w]/g, ""))
            .join(" ");
          if (p1 && p1 === p2) {
            // Skip the first take of the repeated phrase, keep the second take
            wi += pLen;
            skippedPhrase = true;
            break;
          }
        }
      }
      if (skippedPhrase) continue;

      // Check adjacent identical single word stutter (unless intentional emphasis like "very, very")
      if (wi + 1 < rawRetainedWords.length) {
        const cleanNext = rawRetainedWords[wi + 1].word.toLowerCase().replace(/[^\w]/g, "");
        if (cleanCur && cleanCur === cleanNext && !emphasisSet.has(cleanCur)) {
          wi++;
          continue;
        }
      }

      dedupedSourceWords.push(wCur);
      wi++;
    }

    const editedWords = [];
    for (const w of dedupedSourceWords) {
      let eStart = mapSourceTimeToEditedTime(w.start, keepSegments);
      let eEnd = mapSourceTimeToEditedTime(w.end, keepSegments);

      // Ensure word does not start before the previous word ends on the edited timeline
      eStart = Math.max(lastEditedEnd, +eStart.toFixed(2));
      const minDur = Math.max(0.12, Math.min(0.60, +(w.word.length * 0.05).toFixed(2)));
      if (eEnd <= eStart) {
        eEnd = +(eStart + minDur).toFixed(2);
      }
      eEnd = Math.min(cleanDuration, +eEnd.toFixed(2));
      lastEditedEnd = eEnd;

      editedWords.push({
        word: w.word,
        sourceStart: w.start,
        sourceEnd: w.end,
        editedStart: eStart,
        editedEnd: eEnd,
        confidence: w.confidence,
      });
    }

    if (editedWords.length > 0) {
      const segStart = editedWords[0].editedStart;
      const segEnd = editedWords[editedWords.length - 1].editedEnd;
      editedSegments.push({
        id: seg.id,
        start: segStart,
        end: segEnd,
        text: editedWords.map((w) => w.word).join(" "),
        words: editedWords,
      });
    }
  }

  return editedSegments;
}

// ============================================================================
// STAGE B: CALL WONDER CREATIVE DIRECTOR
// ============================================================================

export async function callWonderCreativeDirector(
  params: WonderCreativeDirectorParams
): Promise<WonderCreativeDirectorResult> {
  const {
    editedTranscript,
    cleanDuration,
    templateId = "hormoziPunch",
    userScript,
    brandSettings,
    runId,
    mode = "wonder-ai",
    onLogEvent,
    fetchImpl,
    galleryAssets = [],
  } = params;

  const template = getPipelineBTemplate(templateId);
  const allEditedWords = editedTranscript.flatMap((s) => s.words);

  if (mode === "rules-only") {
    onLogEvent?.("RULES_ONLY_CREATIVE_PLANNING_ACTIVE", { runId });
    return createDeterministicCreativePlan({
      editedTranscript,
      cleanDuration,
      template,
      runId,
    });
  }

  const apiKey = getMetaApiKey();

  if (!apiKey) {
    const errorMsg =
      "Wonder AI Director is not configured for Stage B Creative Direction. Missing API key.";
    onLogEvent?.("WONDER_CREATIVE_CONFIG_ERROR", { runId, error: errorMsg });
    throw new Error(errorMsg);
  }

  const creativeInput = {
    runId,
    cleanDuration,
    templateId: template.id,
    templateName: template.name,
    brandSettings: brandSettings || {
      primaryColor: template.primaryColor,
      highlightColor: template.highlightColor,
      fontFamily: template.fontFamily,
    },
    userScript: userScript || null,
    availableGalleryBroll: template.id === "gallery" ? galleryAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      visualTags: asset.tags,
      mediaType: asset.kind,
      durationSeconds: asset.duration || null,
    })) : [],
    editedTranscript: editedTranscript.map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      text: s.text,
      words: s.words.map((w) => ({
        word: w.word,
        start: w.editedStart,
        end: w.editedEnd,
      })),
    })),
  instruction:
      `${template.id === "gallery" ? "This is the connected Gallery B-roll template. Inspect the attached gallery sample frames and availableGalleryBroll inventory. For each cutaway-worthy visual beat, set galleryAssetId to the exact matching asset id; otherwise set it to null. Choose only clips whose actual visible subject supports that beat, using names and visualTags as backup context. Prefer the speaker for personal/emotional beats and never force an unrelated cutaway. Keep each b-roll shot within that scene's spoken time window." : ""} Analyze this exact script and direct a distinct, executable visual treatment for each beat. For every motionIntent, specify the concrete subject, physical action, visual metaphor, materials/shapes, camera/motion, and deliberate screen position. Do not reuse a motif, object, composition, or placement on adjacent beats. Do not default to phones, feeds, terminals, charts, or generic cards unless the spoken words demand them. Keep every visual grounded in the transcript.`,
  };

  const galleryAssetsWithFrames = galleryAssets.filter((asset) => asset.frameDataUrl);
  const sampledGalleryFrames = galleryAssetsWithFrames.length <= 24
    ? galleryAssetsWithFrames
    : Array.from({ length: 24 }, (_, index) => galleryAssetsWithFrames[Math.floor(index * (galleryAssetsWithFrames.length - 1) / 23)]);
  const galleryFrameContent = template.id === "gallery"
    ? sampledGalleryFrames.flatMap((asset) => [
        { type: "input_text", text: `Gallery asset ${asset.id}: ${asset.name}` },
        { type: "input_image", image_url: asset.frameDataUrl },
      ])
    : [];
  const payload = {
    model: WONDER_STAGE_B_MODEL_ID,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: JSON.stringify(creativeInput) }, ...galleryFrameContent],
      },
    ],
    stream: true,
    temperature: 0.7,
    max_output_tokens: WONDER_STAGE_B_MAX_OUTPUT_TOKENS,
    top_p: 1,
    reasoning: {
      effort: WONDER_STAGE_B_REASONING_EFFORT,
    },
    instructions: WONDER_CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    text: {
      format: {
        type: "json_schema",
        name: "PipelineBWonderCreativeDirectionSchema",
        schema: WONDER_CREATIVE_DIRECTION_SCHEMA,
        strict: true,
      },
    },
  };

  const startTime = Date.now();
  onLogEvent?.("WONDER_VISUAL_REQUEST_STARTED", {
    runId,
    model: WONDER_STAGE_B_MODEL_ID,
    reasoningEffort: WONDER_STAGE_B_REASONING_EFFORT,
    maxOutputTokens: WONDER_STAGE_B_MAX_OUTPUT_TOKENS,
    stage: "Stage_B_Creative_Direction",
    cleanDuration,
    wordsCount: allEditedWords.length,
    timestamp: new Date().toISOString(),
  });

  let rawJson = "";
  try {
    rawJson = await withModelRetry(
      async () => {
        const fetchFn = fetchImpl || fetch;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);
        try {
        const response = await fetchFn(getMetaEndpoint("responses"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(`Wonder Creative API returned HTTP ${response.status}: ${errBody}`);
        }
        return await readModelResponse(response);
        } catch (err: any) {
          if (err?.name === "AbortError") throw new Error("Wonder creative direction timed out after 90 seconds.");
          throw err;
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        attempts: 1,
        delayMs: 1600,
        onAttemptError: (err: any, attempt) => {
          onLogEvent?.("WONDER_VISUAL_REQUEST_RETRY", { runId, attempt, error: err?.message || String(err) });
        },
      }
    );
  } catch (apiErr: any) {
    const elapsed = Date.now() - startTime;
    const error = `Wonder visual direction failed after ${elapsed}ms: ${apiErr.message}. No template-based visuals were substituted.`;
    onLogEvent?.("WONDER_VISUAL_REQUEST_FAILED", { runId, elapsedMs: elapsed, error });
    throw new Error(error);
  }

  const responseElapsed = Date.now() - startTime;
  onLogEvent?.("WONDER_VISUAL_RESPONSE_RECEIVED", {
    runId,
    elapsedMs: responseElapsed,
    rawBytes: rawJson.length,
  });

  let parsed: any;
  try {
    const cleanJson = rawJson.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseErr: any) {
    const error = `Wonder returned an invalid visual plan: ${parseErr.message}`;
    onLogEvent?.("WONDER_VISUAL_PLAN_INVALID", { runId, error });
    throw new Error(error);
  }

  if (!parsed || !Array.isArray(parsed.visualSegments)) {
    throw new Error("Wonder returned a visual plan without visualSegments.");
  }

  // Ground visual beats against actual word timings. Headlines and metaphors are allowed to
  // paraphrase the dialogue, so lexical overlap is a diagnostic rather than a hard gate.
  const transcriptWordsSet = new Set(
    allEditedWords
      .map((w) => w.word.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length >= 3)
  );

  let totalReferenceWords = 0;
  let matchingReferenceWords = 0;

  for (const seg of parsed.visualSegments) {
    // headlineText is intentionally a short summary and often uses different words than the line.
    const tokens = String(seg.spokenReference || "").toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t: string) => t.length >= 3);
    for (const t of tokens) {
      totalReferenceWords++;
      if (transcriptWordsSet.has(t)) {
        matchingReferenceWords++;
      }
    }
  }

  const overlapRatio = totalReferenceWords > 0 ? matchingReferenceWords / totalReferenceWords : 0;
  const timedSegments = parsed.visualSegments.filter((seg: any) =>
    Number.isFinite(seg.start) && Number.isFinite(seg.end) && seg.end > seg.start
  );
  const wordsCoveredByTimedScenes = allEditedWords.filter((word) =>
    timedSegments.some((seg: any) => word.editedEnd > seg.start - 0.12 && word.editedStart < seg.end + 0.12)
  ).length;
  const timingCoverage = allEditedWords.length > 0 ? wordsCoveredByTimedScenes / allEditedWords.length : 0;

  onLogEvent?.("WONDER_VISUAL_PLAN_GROUNDING_CHECK", {
    runId,
    referenceOverlap: +overlapRatio.toFixed(2),
    matchingReferenceWords,
    totalReferenceWords,
    timedSceneCount: timedSegments.length,
    timingCoverage: +timingCoverage.toFixed(2),
  });

  // Reject only when Wonder's references have virtually no connection to the words AND its
  // scene windows do not line up with the spoken timeline. A paraphrased metaphor alone is valid.
  if (allEditedWords.length >= 10 && overlapRatio < 0.05 && timingCoverage < 0.35) {
    onLogEvent?.("WONDER_CREATIVE_HALLUCINATION_DETECTED", {
      runId,
      overlapRatio: +overlapRatio.toFixed(2),
      matchingReferenceWords,
      totalReferenceWords,
      timingCoverage: +timingCoverage.toFixed(2),
      reason: "Scene references had negligible transcript overlap and scene windows did not cover the spoken timeline.",
    });
    throw new Error("Wonder's visual plan did not align with the spoken timeline. No generic template was substituted; please retry the scene direction.");
  }

  if (allEditedWords.length >= 10 && overlapRatio < 0.15 && timingCoverage >= 0.35) {
    onLogEvent?.("WONDER_LOW_TEXT_OVERLAP_TIMING_ALIGNED", {
      runId,
      referenceOverlap: +overlapRatio.toFixed(2),
      timingCoverage: +timingCoverage.toFixed(2),
      note: "Accepted: creative wording differs from the transcript, but scene windows align with speech.",
    });
  }

  // Validate and map visualSegments — support ZAI Cutout & Codebase Story Animation pipeline
  const isCutoutTemplate = template.id === "cutout" || template.id === "samCutoutExplainer";
  const validatedSegments: VisualPlanSegment[] = parsed.visualSegments
    .filter((s: any) => typeof s.start === "number" && typeof s.end === "number" && s.end > s.start)
    .map((s: any, idx: number) => {
      let normalizedLayout: VisualPlanSegment["layoutType"] = "fullscreen_speaker";
      let cutoutMode: VisualPlanSegment["cutoutMode"] = "fullscreen_speaker";
      let animationLeadInSec: number | undefined = undefined;

      if (isCutoutTemplate) {
        // In the ZAI Cutout workflow:
        // Scene 1 starts with the codebase story animation running first (0.85s lead-in), then SAM 3.1 speaker cutout pops in!
        if (idx === 0) {
          normalizedLayout = "sam_cutout";
          cutoutMode = "animation_then_cutout";
          animationLeadInSec = 0.85;
        } else if (s.layoutType === "depth_cutout" || idx % 4 === 1) {
          normalizedLayout = "depth_cutout";
          cutoutMode = "depth_behind_speaker";
        } else if (s.layoutType === "broll_takeover" || idx % 4 === 2) {
          normalizedLayout = "broll_takeover";
          cutoutMode = "pure_animation";
        } else if (s.layoutType === "sam_cutout" || idx % 4 === 3) {
          normalizedLayout = "sam_cutout";
          cutoutMode = "collage_cutout";
          animationLeadInSec = 0.65;
        } else {
          normalizedLayout = "fullscreen_speaker";
          cutoutMode = "fullscreen_speaker";
        }
      } else {
        if (idx === 0) {
          normalizedLayout = "fullscreen_speaker";
          cutoutMode = "fullscreen_speaker";
        } else if (s.layoutType === "sam_cutout") {
          normalizedLayout = "sam_cutout";
          cutoutMode = "animation_then_cutout";
          animationLeadInSec = 0.75;
        } else if (s.layoutType === "depth_cutout") {
          normalizedLayout = "depth_cutout";
          cutoutMode = "depth_behind_speaker";
        } else if (
          s.layoutType === "broll_takeover" ||
          s.layoutType === "split_screen" ||
          s.layoutType === "stacked_layout" ||
          s.layoutType === "picture_in_picture" ||
          s.technique === "animated_diagram" ||
          s.technique === "ui_mockup"
        ) {
          normalizedLayout = "broll_takeover";
          cutoutMode = "pure_animation";
        } else {
          normalizedLayout = "fullscreen_speaker";
          cutoutMode = "fullscreen_speaker";
        }
      }

      // Enforce ZERO static AI images — always use executable codebase story animations
      let safeTechnique: VisualPlanSegment["technique"] =
        s.technique && s.technique !== "generated_image"
          ? s.technique
          : normalizedLayout === "sam_cutout"
          ? "sam_cutout_pop"
          : normalizedLayout === "depth_cutout"
          ? "kinetic_typography"
          : normalizedLayout === "broll_takeover"
          ? "animated_diagram"
          : "dynamic_captions";

      const rawHeadline = s.headlineText ? String(s.headlineText).trim() : "";
      const cleanHeadline = rawHeadline
        ? rawHeadline.split(/\s+/).slice(0, 4).join(" ").toUpperCase()
        : undefined;

      return {
        id: s.id || `vseg-${idx + 1}`,
        start: Math.max(0, +s.start.toFixed(2)),
        end: Math.min(cleanDuration, +s.end.toFixed(2)),
        layoutType: normalizedLayout,
        cutoutMode,
        animationLeadInSec,
        technique: safeTechnique,
        spokenReference: String(s.spokenReference || ""),
        motionIntent: String(
          s.motionIntent ||
            (normalizedLayout === "sam_cutout"
              ? "Codebase story animation runs first, followed by SAM 3.1 speaker cutout pop-in"
              : normalizedLayout === "depth_cutout"
              ? "3-Layer SAM 3.1 depth composite with behind-the-head kinetic story typography"
              : normalizedLayout === "broll_takeover"
              ? "100% Full-Screen Codebase Story Animation illustrating spoken beat"
              : "High-trust A-Roll speaker window with dynamic punch-in")
        ),
        visualRecipe: {
          metaphor: String(s.visualRecipe?.metaphor || s.motionIntent || "Script-led visual metaphor"),
          objects: (Array.isArray(s.visualRecipe?.objects) ? s.visualRecipe.objects : []).slice(0, 5).map((obj: any) => ({
            label: String(obj.label || "Story element").slice(0, 48),
            shape: ["circle", "rect", "diamond", "line", "text"].includes(obj.shape) ? obj.shape : "text",
            motion: ["rise", "orbit", "pulse", "slide", "unfold", "scatter"].includes(obj.motion) ? obj.motion : "rise",
            position: ["upper-left", "upper-right", "center", "lower-left", "lower-right"].includes(obj.position) ? obj.position : "center",
          })),
        },
        requiredAssets: [],
        layerArrangement:
          normalizedLayout === "broll_takeover" || normalizedLayout === "sam_cutout"
            ? "foreground"
            : "overlay",
        transitionDirection: s.transitionDirection || (normalizedLayout === "sam_cutout" ? "pop_in" : "fade"),
        cameraZoom: typeof s.cameraZoom === "number" ? s.cameraZoom : idx % 2 === 0 ? 1.0 : 1.08,
        headlineText: cleanHeadline,
        brandSettings: {
          primaryColor: template.primaryColor,
          highlightColor: template.highlightColor,
          fontFamily: template.fontFamily,
        },
      };
    });

  // Build backwards-compatible visualPlan items for Remotion & Storyboard cards
  const visualPlan: VisualOverlayItem[] = validatedSegments.map((seg, idx) => {
    let overlayType: VisualOverlayItem["type"] = "image_overlay";
    if (seg.technique === "kinetic_typography" || seg.technique === "dynamic_captions") {
      overlayType = "kinetic_word";
    } else if (seg.technique === "brand_lower_third") {
      overlayType = "lower_third";
    } else if (seg.technique === "camera_punch_in") {
      overlayType = "icon_badge";
    }

    let anim: VisualOverlayItem["animation"] = "pop";
    if (seg.transitionDirection === "slide_up" || seg.transitionDirection === "slide_down") {
      anim = "slide_up";
    } else if (seg.transitionDirection === "pop_in" || seg.transitionDirection === "zoom_in") {
      anim = "bounce";
    } else if (seg.transitionDirection === "fade") {
      anim = "fade";
    }

    return {
      id: `overlay-creative-${idx + 1}`,
      segmentId: seg.id,
      type: overlayType,
      timestamp: seg.start,
      duration: +(seg.end - seg.start).toFixed(2),
      content: seg.headlineText || seg.spokenReference.slice(0, 30) || "Visual Hook",
      animation: anim,
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
      soundName: template.enableSfx ? "pop.mp3" : undefined,
    };
  });

  const planId = parsed.planId || `wonder-creative-${Date.now()}`;
  onLogEvent?.("WONDER_VISUAL_PLAN_VALIDATED", {
    runId,
    planId,
    segmentsCount: validatedSegments.length,
    overlaysCount: visualPlan.length,
  });

  return {
    planId,
    title: parsed.title || allEditedWords.slice(0, 6).map((w) => w.word).join(" ") || "Talking-Head Reel",
    hookLine: parsed.hookLine || `"${allEditedWords.slice(0, 6).map((w) => w.word).join(" ")}..."`,
    narrativeTheme: parsed.narrativeTheme,
    visualSegments: validatedSegments,
    visualPlan,
    editorialNotes: parsed.editorialNotes || "Wonder AI Director planned narrative creative visual direction.",
  };
}

// ============================================================================
// COMBINED ADAPTER: CALL WONDER EDITORIAL DIRECTOR (2-STAGE EXECUTION)
// ============================================================================

export async function callWonderEditorialDirector(
  params: WonderDirectorParams
): Promise<WonderEditorialDecision> {
  const {
    transcript,
    candidateCuts,
    totalDuration,
    templateId = "hormoziPunch",
    userScript,
    pacingProfile = "natural",
    brandSettings,
    runId,
    mode = "wonder-ai",
    onLogEvent,
    fetchImpl,
  } = params;

  // 1. STAGE A — Editorial Cleanup
  const cleanupResult = await callWonderEditorialCleanup({
    transcript,
    candidateCuts,
    totalDuration,
    templateId,
    userScript,
    pacingProfile,
    runId,
    mode,
    onLogEvent,
    fetchImpl,
  });

  // Deterministically assemble keep segments from approved cuts
  const sortedCuts = [...cleanupResult.approvedCuts].sort((a, b) => a.start - b.start);
  const keepSegments: KeepSegment[] = [];
  let curr = 0;
  for (const c of sortedCuts) {
    if (c.start > curr) {
      const dur = +(c.start - curr).toFixed(2);
      if (dur > 0.05) {
        keepSegments.push({
          start: curr,
          end: c.start,
          duration: dur,
          zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.08,
        });
      }
    }
    curr = c.end;
  }
  if (curr < totalDuration) {
    const dur = +(totalDuration - curr).toFixed(2);
    if (dur > 0.05) {
      keepSegments.push({
        start: curr,
        end: totalDuration,
        duration: dur,
        zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.08,
      });
    }
  }

  // Fallback if all cut
  if (keepSegments.length === 0) {
    keepSegments.push({
      start: 0,
      end: totalDuration,
      duration: totalDuration,
      zoomScale: 1.0,
    });
  }

  const cleanDuration = +keepSegments.reduce((a, s) => a + s.duration, 0).toFixed(2);

  // Build edited transcript mapped to clean video timeline
  const editedTranscript = buildEditedTranscript(transcript, keepSegments);

  // 2. STAGE B — Creative Visual Direction
  const creativeResult = await callWonderCreativeDirector({
    editedTranscript,
    cleanDuration,
    templateId,
    userScript,
    brandSettings,
    runId,
    mode,
    onLogEvent,
    fetchImpl,
  });

  return {
    planId: creativeResult.planId,
    title: creativeResult.title,
    hookLine: creativeResult.hookLine,
    approvedCuts: cleanupResult.approvedCuts,
    protectedRanges: cleanupResult.protectedRanges,
    uncertainDecisions: cleanupResult.uncertainDecisions,
    visualPlan: creativeResult.visualPlan,
    visualSegments: creativeResult.visualSegments,
    editedTranscript,
    editorialNotes: `${cleanupResult.editorialNotes} | ${creativeResult.editorialNotes}`,
  };
}

// ============================================================================
// DETERMINISTIC FALLBACK PLANS (RULES-ONLY MODE)
// ============================================================================

export function createDeterministicFallbackPlan(params: {
  transcript: TranscriptSegment[];
  candidateCuts: CandidateCut[];
  allWords: TranscriptWord[];
  totalDuration: number;
  template: any;
  runId: string;
}): WonderEditorialDecision {
  const { transcript, candidateCuts, allWords, totalDuration, template, runId } = params;

  const approvedCuts: EditCut[] = [];
  const protectedRanges: ProtectedRange[] = [];

  for (const cand of candidateCuts) {
    if (cand.classification === "intentional_emphasis" || cand.classification === "natural_pause") {
      protectedRanges.push({
        start: cand.start,
        end: cand.end,
        reason: cand.reason,
        protectedWords: cand.affectedText,
      });
    }
  }

  for (const cand of candidateCuts) {
    if (
      cand.classification === "intentional_emphasis" ||
      cand.classification === "natural_pause" ||
      cand.classification === "needs_review"
    ) {
      continue;
    }
    const isProtected = protectedRanges.some(
      (pr) => Math.max(cand.start, pr.start) < Math.min(cand.end, pr.end)
    );
    if (isProtected) continue;

    let cutType: EditCut["type"] = "silence";
    if (cand.type === "filler") cutType = "filler";
    else if (cand.type === "repetition" || cand.type === "phrase_retake" || cand.type === "false_start") cutType = "retake";

    approvedCuts.push({
      id: `cut-rules-${approvedCuts.length + 1}`,
      start: cand.start,
      end: cand.end,
      type: cutType,
      reason: cand.reason,
      cutWord: cand.affectedText,
    });
  }

  const hookWords = allWords.slice(0, 6).map((w) => w.word).join(" ");
  const hookLine = hookWords ? `"${hookWords}..."` : "Talking Head Reel";

  return {
    planId: `rules-plan-${runId}`,
    title: hookWords || "Talking Head Reel",
    hookLine,
    approvedCuts,
    protectedRanges,
    uncertainDecisions: [],
    visualPlan: [],
    editorialNotes: "Deterministic rule-based edit plan (rules-only mode).",
  };
}

export function createDeterministicCreativePlan(params: {
  editedTranscript: EditedTranscriptSegment[];
  cleanDuration: number;
  template: any;
  runId: string;
}): WonderCreativeDirectorResult {
  const { editedTranscript, cleanDuration, template, runId } = params;
  const allEditedWords = editedTranscript.flatMap((s) => s.words);

  const visualSegments: VisualPlanSegment[] = [];
  const visualPlan: VisualOverlayItem[] = [];

  // ZAI Cutout Template ("cutout" / "samCutoutExplainer"):
  // Codebase story animation runs first to hook & tell the story, followed by SAM 3.1 speaker cutout pop-in,
  // 3-layer behind-the-head depth typography, full-screen codebase story animation, and high-trust A-Roll speaker windows.
  if (
    (template.id === "cutout" || template.id === "samCutoutExplainer") &&
    cleanDuration >= 2.5 &&
    allEditedWords.length > 0
  ) {
    const numScenes = Math.max(3, Math.min(5, Math.ceil(cleanDuration / 3.2)));
    const sliceDur = cleanDuration / numScenes;
    const layoutSequence: VisualPlanSegment["layoutType"][] = [
      "sam_cutout",         // Scene 1: Codebase Story Animation runs first -> Exact SAM 3.1 Character Cutout pops in bottom-left corner
      "sam_cutout",         // Scene 2: Codebase Story Animation + Exact SAM 3.1 Character Cutout in bottom-left corner
      "broll_takeover",     // Scene 3: 100% Full-Screen Codebase Story Animation (Diagram / Chart / Code Flow)
      "sam_cutout",         // Scene 4: Codebase Story Animation + Exact SAM 3.1 Character Cutout in bottom-left corner
      "fullscreen_speaker", // Scene 5: High-Trust A-Roll Payoff with 1.08x punch-in
    ];
    const cutoutModeSequence: VisualPlanSegment["cutoutMode"][] = [
      "animation_then_cutout",
      "collage_cutout",
      "pure_animation",
      "collage_cutout",
      "fullscreen_speaker",
    ];
    const techniqueSequence: VisualPlanSegment["technique"][] = [
      "sam_cutout_pop",
      "sam_cutout_pop",
      "animated_diagram",
      "ui_mockup",
      "camera_punch_in",
    ];

    for (let sIdx = 0; sIdx < numScenes; sIdx++) {
      const sStart = +(sIdx * sliceDur).toFixed(2);
      const sEnd = sIdx === numScenes - 1 ? cleanDuration : +((sIdx + 1) * sliceDur).toFixed(2);
      const sceneWords = allEditedWords
        .filter((w) => w.editedStart >= sStart - 0.05 && w.editedStart < sEnd)
        .map((w) => w.word);
      const spokenRef = sceneWords.join(" ") || allEditedWords.slice(0, 5).map((w) => w.word).join(" ");
      const headline = sceneWords.slice(0, 3).join(" ").toUpperCase() || `BEAT 0${sIdx + 1}`;
      const layoutType = layoutSequence[sIdx % layoutSequence.length];
      const cutoutMode = cutoutModeSequence[sIdx % cutoutModeSequence.length];
      const technique = techniqueSequence[sIdx % techniqueSequence.length];

      visualSegments.push({
        id: `vseg-cutout-${sIdx + 1}-${runId}`,
        start: sStart,
        end: sEnd,
        layoutType,
        cutoutMode,
        animationLeadInSec: layoutType === "sam_cutout" ? (sIdx === 0 ? 0.85 : 0.65) : undefined,
        technique,
        spokenReference: spokenRef,
        motionIntent:
          layoutType === "sam_cutout"
            ? "ZAI Cutout: Codebase story animation runs first on canvas, then SAM 3.1 speaker cutout pops in with spring physics"
            : layoutType === "depth_cutout"
            ? "ZAI 3-Layer Depth Composite: Giant kinetic story typography & SVG rings behind SAM 3.1 foreground speaker mask (z-index: 30)"
            : layoutType === "broll_takeover"
            ? "ZAI Codebase Story Animation: 100% full-screen procedural diagram/chart/code flow synced to WhisperX words"
            : "ZAI Pure A-Roll Window: High-trust speaker eye contact with 1.08x emphasis punch-in",
        layerArrangement: layoutType === "broll_takeover" || layoutType === "sam_cutout" ? "foreground" : "overlay",
        transitionDirection: layoutType === "sam_cutout" ? "pop_in" : "fade",
        cameraZoom: layoutType === "fullscreen_speaker" ? 1.08 : 1.0,
        headlineText: headline,
        brandSettings: {
          primaryColor: template.primaryColor,
          highlightColor: template.highlightColor,
          fontFamily: template.fontFamily,
        },
      });

      visualPlan.push({
        id: `overlay-cutout-${sIdx + 1}`,
        segmentId: `vseg-cutout-${sIdx + 1}-${runId}`,
        type: layoutType === "fullscreen_speaker" || layoutType === "depth_cutout" ? "kinetic_word" : "image_overlay",
        timestamp: sStart,
        duration: +(sEnd - sStart).toFixed(2),
        content: headline,
        animation: layoutType === "sam_cutout" ? "bounce" : "pop",
        style: {
          bg: template.cardBg,
          textColor: template.highlightColor,
          border: template.primaryColor,
        },
      });
    }

    const hookDisplay = allEditedWords.slice(0, 6).map((w) => w.word).join(" ");
    return {
      planId: `zai-cutout-director-${runId}`,
      title: hookDisplay || "ZAI Cutout Story Reel",
      hookLine: hookDisplay ? `"${hookDisplay}..."` : "ZAI Cutout Story Reel",
      narrativeTheme:
        "ZAI (Z) Cutout Pipeline: Pre-Talking-Head Codebase Story Animation -> SAM 3.1 Speaker Cutout -> 3-Layer Behind-the-Head Depth Typography -> Full Codebase Animation",
      visualSegments,
      visualPlan,
      editorialNotes:
        "ZAI Autonomous Director (Zero Static Images): Story-driven codebase animations (HTML5/CSS3/JS/SVG/Canvas) run first and layer with SAM 3.1 speaker cutouts synced to WhisperX timestamps.",
    };
  }

  // Story Explainer: Pro Reel Editor Cutaway Rhythm (No 50/50 split)
  // Always starts on Fullscreen Speaker (face value), then cuts to 100% Fullscreen Clean Animation when concepts/numbers are explained, and cuts back to Fullscreen Speaker
  if (
    template.id === "storyExplainer" &&
    cleanDuration >= 3.0 &&
    allEditedWords.length > 0
  ) {
    const numScenes = Math.max(3, Math.min(5, Math.ceil(cleanDuration / 3.5)));
    const sliceDur = cleanDuration / numScenes;
    const layoutSequence: VisualPlanSegment["layoutType"][] = [
      "fullscreen_speaker", // Scene 1: Start of topic on Full-Screen Speaker (Face Value)
      "broll_takeover",     // Scene 2: 100% Full-Screen Clean Visual Animation Cutaway
      "fullscreen_speaker", // Scene 3: Cut back to Full-Screen Speaker
      "broll_takeover",     // Scene 4: 100% Full-Screen Clean Visual Animation Cutaway
      "fullscreen_speaker", // Scene 5: Final Payoff on Full-Screen Speaker
    ];

    for (let sIdx = 0; sIdx < numScenes; sIdx++) {
      const sStart = +(sIdx * sliceDur).toFixed(2);
      const sEnd = sIdx === numScenes - 1 ? cleanDuration : +((sIdx + 1) * sliceDur).toFixed(2);
      const sceneWords = allEditedWords
        .filter((w) => w.editedStart >= sStart - 0.05 && w.editedStart < sEnd)
        .map((w) => w.word);
      const spokenRef = sceneWords.join(" ") || allEditedWords.slice(0, 5).map((w) => w.word).join(" ");
      const headline = sceneWords.slice(0, 3).join(" ").toUpperCase() || `SCENE 0${sIdx + 1}`;
      const layoutType = layoutSequence[sIdx % layoutSequence.length];
      
      // Dynamically infer technique from spokenRef instead of hardcoding "ui_mockup"
      const technique: VisualPlanSegment["technique"] = layoutType === "fullscreen_speaker"
        ? (sIdx === 0 ? "camera_punch_in" : "dynamic_captions")
        : /\b(app|phone|mobile|ui|dashboard|screen)\b/i.test(spokenRef)
        ? "ui_mockup"
        : /\b(step|process|how|system|grow|build|chart|metric)\b/i.test(spokenRef)
        ? "animated_diagram"
        : "procedural_graphic";

      visualSegments.push({
        id: `vseg-story-${sIdx + 1}-${runId}`,
        start: sStart,
        end: sEnd,
        layoutType,
        technique,
        spokenReference: spokenRef,
        motionIntent:
          layoutType === "broll_takeover"
            ? "100% Full-Screen Clean Visual Animation Cutaway illustrating the spoken concept"
            : "100% Full-Screen Speaker Face Value with continuous lower-third captions",
        layerArrangement: layoutType === "broll_takeover" ? "foreground" : "overlay",
        transitionDirection: "fade",
        cameraZoom: layoutType === "fullscreen_speaker" ? 1.06 : 1.0,
        headlineText: headline,
        brandSettings: {
          primaryColor: template.primaryColor,
          highlightColor: template.highlightColor,
          fontFamily: template.fontFamily,
        },
      });

      visualPlan.push({
        id: `overlay-story-${sIdx + 1}`,
        segmentId: `vseg-story-${sIdx + 1}-${runId}`,
        type: layoutType === "fullscreen_speaker" ? "kinetic_word" : "image_overlay",
        timestamp: sStart,
        duration: +(sEnd - sStart).toFixed(2),
        content: headline,
        animation: "pop",
        style: {
          bg: template.cardBg,
          textColor: template.highlightColor,
          border: template.primaryColor,
        },
      });
    }

    const hookDisplay = allEditedWords.slice(0, 6).map((w) => w.word).join(" ");
    return {
      planId: `rules-story-explainer-${runId}`,
      title: hookDisplay || "Story Explainer Reel",
      hookLine: hookDisplay ? `"${hookDisplay}..."` : "Story Explainer Reel",
      narrativeTheme: "Pro Reel Editor: Full-Screen Speaker Face Value alternating with 100% Full-Screen Clean Visual Animations",
      visualSegments,
      visualPlan,
      editorialNotes:
        "Pro Reel Editor cutaway progression: Full-Screen Speaker Hook -> 100% Full-Screen Clean Animation -> Full-Screen Speaker -> 100% Full-Screen Clean Animation -> Full-Screen Speaker Outro.",
    };
  }

  // Dynamic Director: Fullscreen Hook -> Pipeline A Procedural Animation with PiP -> Fullscreen CTA
  if (template.id === "dynamicDirector" && cleanDuration >= 6.0 && allEditedWords.length > 0) {
    const hookEnd = Math.min(3.5, +(cleanDuration * 0.22).toFixed(2));
    const ctaStart = Math.max(hookEnd + 2.0, +(cleanDuration - 3.5).toFixed(2));

    const hookWordsList = allEditedWords.filter((w) => w.editedStart < hookEnd);
    const hookWords = hookWordsList.map((w) => w.word).join(" ") || "KEY INSIGHT";

    const middleWords = allEditedWords.filter((w) => w.editedStart >= hookEnd && w.editedStart < ctaStart);
    const conceptKeyword =
      middleWords.find((w) => /\b(?:code|app|video|fast|edit|ai|pipeline|system|model|build|software)\b/i.test(w.word))?.word ||
      middleWords[0]?.word ||
      "DYNAMIC ARCHITECTURE";

    const ctaWordsList = allEditedWords.filter((w) => w.editedStart >= ctaStart);
    const ctaWords = ctaWordsList.map((w) => w.word).join(" ") || "TRY IT NOW";

    // 1. Fullscreen Hook
    visualSegments.push({
      id: `vseg-hook-${runId}`,
      start: 0,
      end: hookEnd,
      layoutType: "fullscreen_speaker",
      technique: "kinetic_typography",
      spokenReference: hookWords,
      motionIntent: "High-impact fullscreen founder hook with punch-in camera dynamics",
      layerArrangement: "overlay",
      transitionDirection: "pop_in",
      cameraZoom: 1.15,
      headlineText: hookWords.slice(0, 32).toUpperCase(),
      brandSettings: {
        primaryColor: template.primaryColor,
        highlightColor: template.highlightColor,
        fontFamily: template.fontFamily,
      },
    });

    visualPlan.push({
      id: "overlay-hook-1",
      segmentId: `vseg-hook-${runId}`,
      type: "kinetic_word",
      timestamp: 0,
      duration: hookEnd,
      content: hookWords.slice(0, 32).toUpperCase(),
      animation: "pop",
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
    });

    // 2. Explainer Core: Pipeline A Procedural Animation Background + Floating PiP Founder Card
    visualSegments.push({
      id: `vseg-explainer-${runId}`,
      start: hookEnd,
      end: ctaStart,
      layoutType: "picture_in_picture",
      technique: "procedural_graphic",
      spokenReference: conceptKeyword,
      motionIntent: "Pipeline A procedural HTML/SVG animation running across full canvas with speaker in floating PiP card",
      layerArrangement: "background",
      transitionDirection: "slide_up",
      cameraZoom: 1.0,
      headlineText: conceptKeyword.toUpperCase(),
      brandSettings: {
        primaryColor: template.primaryColor,
        highlightColor: template.highlightColor,
        fontFamily: template.fontFamily,
      },
    });

    visualPlan.push({
      id: "overlay-explainer-2",
      segmentId: `vseg-explainer-${runId}`,
      type: "image_overlay",
      timestamp: hookEnd,
      duration: +(ctaStart - hookEnd).toFixed(2),
      content: conceptKeyword.toUpperCase(),
      animation: "fade",
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
    });

    // 3. Fullscreen CTA / Punchline Cutback
    visualSegments.push({
      id: `vseg-cta-${runId}`,
      start: ctaStart,
      end: cleanDuration,
      layoutType: "fullscreen_speaker",
      technique: "kinetic_typography",
      spokenReference: ctaWords,
      motionIntent: "High-impact punchline cutback to fullscreen founder for call-to-action",
      layerArrangement: "overlay",
      transitionDirection: "pop_in",
      cameraZoom: 1.18,
      headlineText: ctaWords.slice(0, 32).toUpperCase(),
      brandSettings: {
        primaryColor: template.primaryColor,
        highlightColor: template.highlightColor,
        fontFamily: template.fontFamily,
      },
    });

    visualPlan.push({
      id: "overlay-cta-3",
      segmentId: `vseg-cta-${runId}`,
      type: "kinetic_word",
      timestamp: ctaStart,
      duration: +(cleanDuration - ctaStart).toFixed(2),
      content: ctaWords.slice(0, 32).toUpperCase(),
      animation: "pop",
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
    });

    const hookDisplay = hookWordsList.slice(0, 6).map((w) => w.word).join(" ");
    return {
      planId: `rules-creative-${runId}`,
      title: hookDisplay || "Dynamic Director Reel",
      hookLine: hookDisplay ? `"${hookDisplay}..."` : "Dynamic Director Reel",
      narrativeTheme: "Dynamic Director with Pipeline A HTML animation and speaker PiP",
      visualSegments,
      visualPlan,
      editorialNotes: "Dynamic Director switching arc: Fullscreen Hook -> Procedural Animation PiP -> Fullscreen CTA.",
    };
  }

  // Segment 1: Opening Hook
  if (allEditedWords.length > 0) {
    const openingWords = allEditedWords.slice(0, 5);
    const end = Math.min(cleanDuration, openingWords[openingWords.length - 1].editedEnd + 0.5);
    const spoken = openingWords.map((w) => w.word).join(" ");

    visualSegments.push({
      id: `vseg-hook-${runId}`,
      start: 0,
      end,
      layoutType: "fullscreen_speaker",
      technique: "kinetic_typography",
      spokenReference: spoken,
      motionIntent: "High-impact kinetic hook at video open",
      layerArrangement: "overlay",
      transitionDirection: "pop_in",
      cameraZoom: 1.15,
      headlineText: spoken.toUpperCase(),
      brandSettings: {
        primaryColor: template.primaryColor,
        highlightColor: template.highlightColor,
        fontFamily: template.fontFamily,
      },
    });

    visualPlan.push({
      id: "overlay-hook-1",
      segmentId: `vseg-hook-${runId}`,
      type: "kinetic_word",
      timestamp: 0,
      duration: +end.toFixed(2),
      content: spoken.toUpperCase(),
      animation: "pop",
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
    });
  }

  // Segment 2: Contextual Visual Concept
  const conceptWord = allEditedWords.find((w) =>
    /\b(?:app|software|video|fast|edit|code|tool|ai|build)\b/i.test(w.word)
  );
  if (conceptWord && conceptWord.editedStart > 1.0) {
    const segStart = conceptWord.editedStart;
    const segEnd = Math.min(cleanDuration, segStart + 2.0);

    visualSegments.push({
      id: `vseg-concept-${runId}`,
      start: segStart,
      end: segEnd,
      layoutType: "picture_in_picture",
      technique: "animated_diagram",
      spokenReference: conceptWord.word,
      motionIntent: "Visual demonstration diagram for core concept",
      requiredAssets: [
        {
          type: "diagram",
          description: `Interactive diagram illustrating ${conceptWord.word}`,
        },
      ],
      layerArrangement: "overlay",
      transitionDirection: "slide_up",
      cameraZoom: 1.0,
      headlineText: conceptWord.word.toUpperCase(),
      brandSettings: {
        primaryColor: template.primaryColor,
        highlightColor: template.highlightColor,
        fontFamily: template.fontFamily,
      },
    });

    visualPlan.push({
      id: "overlay-concept-2",
      segmentId: `vseg-concept-${runId}`,
      type: "image_overlay",
      timestamp: segStart,
      duration: +(segEnd - segStart).toFixed(2),
      content: conceptWord.word.toUpperCase(),
      animation: "bounce",
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
    });
  }

  const hookWords = allEditedWords.slice(0, 6).map((w) => w.word).join(" ");

  return {
    planId: `rules-creative-${runId}`,
    title: hookWords || "Talking Head Reel",
    hookLine: hookWords ? `"${hookWords}..."` : "Talking Head Reel",
    narrativeTheme: "Clean professional talking head presentation",
    visualSegments,
    visualPlan,
    editorialNotes: "Deterministic creative visual direction plan (rules-only mode).",
  };
}
