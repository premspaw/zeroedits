/**
 * Meta Muse — Pipeline B Tool: Wonder Editorial Director
 * Calls Meta Muse Wonder (muse-wonder-1.0) to act as the creative director for talking-head video editing.
 * Implements the Two-Stage AI Planning Architecture:
 *   Stage A: Editorial Cleanup (Cut approval, rhetorical protection, uncertain decisions)
 *   Deterministic Processing: Assembly of cuts, FFmpeg clean video, edited transcript mapping
 *   Stage B: Creative Direction (Rich narrative visual plan: kinetic typography, diagrams, B-roll, SAM, layouts)
 */

import { readModelResponse } from "../../model-response.ts";
import { withModelRetry } from "../../model-retry.ts";
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
import { mapSourceTimeToEditedTime } from "./edit-planner.ts";
import { validateApprovedCutsSemantic } from "./cuts-validator.ts";

export const WONDER_STAGE_A_MODEL_ID =
  process.env.WONDER_STAGE_A_MODEL_ID || process.env.MODEL_ID || process.env.WONDER_MODEL_ID || "muse-wonder-1.0";
export const WONDER_STAGE_A_REASONING_EFFORT =
  process.env.WONDER_STAGE_A_REASONING_EFFORT || "xhigh";
export const WONDER_STAGE_A_MAX_OUTPUT_TOKENS =
  Number(process.env.WONDER_STAGE_A_MAX_OUTPUT_TOKENS) || 32768;

export const WONDER_STAGE_B_MODEL_ID =
  process.env.WONDER_STAGE_B_MODEL_ID || process.env.MODEL_ID || process.env.WONDER_MODEL_ID || "muse-wonder-1.0";
export const WONDER_STAGE_B_REASONING_EFFORT =
  process.env.WONDER_STAGE_B_REASONING_EFFORT || "xhigh";
export const WONDER_STAGE_B_MAX_OUTPUT_TOKENS =
  Number(process.env.WONDER_STAGE_B_MAX_OUTPUT_TOKENS) || 161187;

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
   - Actively APPROVE candidate cuts for:
     a) Rapid repeated word stutters (e.g. repeated words like "two two two...", rapid stammering tokens like "poop poop poop...", "this, this"). Keep only one clean utterance and cut the rest.
     b) Multi-word phrase restarts and retakes (e.g., "only when five clicks... only in five clicks", "it auto stitches... it auto stitches", "you can see... you can see"). Approve cutting the false take and preserve the clean final take.
     c) Vocal fillers and hesitation sounds ("okay", "uh", "um", "ah", "er", "like") that precede retakes or create dead pauses.
     d) Dead air (> 0.70s).

2. RHETORICAL EMPHASIS vs ACCIDENTAL STUTTER:
   - Distinguish INTENTIONAL REPETITION (e.g., "very, very simple", "more and more", "never, never give up") from ACCIDENTAL STUTTERS (e.g., rapid duplicate repetitions, "two two two", repeated retakes).
   - NEVER cut intentional emphasis. Place intentional emphasis in protectedRanges.
   - For accidental stutters and phrase retakes, approve cutting the false-start or stumble while protecting the clean take.
   - Do NOT protect rapid stammering or repeated noise tokens as "sound effects"; cut them cleanly to word boundaries.

3. VOCAL FILLERS & NATURAL PAUSES:
   - Approve cutting vocal fillers ("okay", "uh", "um", "like") when they introduce dead pauses or precede a restart.
   - Protect natural breathing and dramatic pauses (0.30s to 0.65s).

4. PROTECTED RANGES & UNCERTAIN DECISIONS:
   - Spoken ranges marked in protectedRanges CANNOT be cut. Protect ONLY genuine speech content, intentional emphasis, and clean final takes.
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
You are META MUSE WONDER CREATIVE DIRECTOR, a world-class art director, motion designer, and visual storytelling expert for viral and cinematic short-form video.
Your objective is to analyze the FINAL CLEAN NARRATIVE (after editorial cuts) and design a comprehensive, varied, story-specific visual edit plan.

## CORE PRINCIPLES & CAPABILITIES

1. NARRATIVE RELEVANCE OVER GIMMICKS:
   - Base all visual choices strictly on what the speaker is communicating.
   - Do NOT apply fixed generic emojis, progress bars, or repeated robotic animation patterns.
   - Use the template settings as artistic inspiration and guidance, not as a rigid formula.

2. COMPREHENSIVE VISUAL PALETTE:
   Design visual segments using the full suite of modern video editing techniques:
   - **fullscreen_speaker**: Clean primary talking head with subtle camera reframing / zoom punch-in.
   - **split_screen**: Speaker side-by-side or stacked with supporting diagram, UI mockup, or B-roll.
   - **stacked_layout**: Top half speaker, bottom half animated code/UI demo or kinetic typography.
   - **picture_in_picture**: Speaker in floating circular or rounded card while main screen displays UI or B-roll.
   - **broll_takeover**: Full B-roll footage or generative scene illustrating the spoken concept.
   - **sam_cutout**: Segment-Anything cutout of the speaker layered over kinetic motion graphics, charts, or diagrams.

3. TECHNIQUE SPECS:
   - **kinetic_typography**: Bold, punchy dynamic word emphasis for key insights.
   - **dynamic_captions**: Highlighted words synchronized with speaker cadence.
   - **animated_diagram**: Flowcharts, graphs, architecture diagrams, or mental models.
   - **ui_mockup**: Modern software interface, mobile app card, terminal code, or button click.
   - **broll_clip**: Contextual cinematic footage matching the spoken narrative.
   - **generated_image**: Rich conceptual visual or graphic metaphor.
   - **ai_video**: High-impact moving background or scene illustration.
   - **camera_punch_in**: 1.15x camera scale on pivotal revelation or takeaway.
   - **brand_lower_third**: Elegant name, title, or key stat banner.

4. SEGMENT REQUIREMENTS:
   Each visual segment must include:
   - start & end timestamps (on the clean edited timeline: 0 to cleanDuration)
   - layoutType, technique, spokenReference (exact words spoken), motionIntent (narrative rationale)
   - requiredAssets (type, description, prompt)
   - layerArrangement ("background" | "main" | "overlay" | "foreground")
   - transitionDirection ("slide_up" | "slide_down" | "slide_left" | "slide_right" | "pop_in" | "zoom_in" | "fade" | "none")
   - cameraZoom (1.0 or 1.15)
   - headlineText (punchy callout text)

5. OUTPUT FORMAT:
   Return valid JSON strictly matching the schema without markdown fences or extraneous text.`;

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
            ],
          },
          technique: {
            type: "string",
            enum: [
              "kinetic_typography",
              "dynamic_captions",
              "animated_diagram",
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
        },
        required: [
          "id",
          "start",
          "end",
          "layoutType",
          "technique",
          "spokenReference",
          "motionIntent",
          "requiredAssets",
          "layerArrangement",
          "transitionDirection",
          "cameraZoom",
          "headlineText",
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

  const apiKey =
    process.env.MODEL_API_KEY ||
    process.env.MUSE_API_KEY ||
    process.env.META_API_KEY;

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
      "Stage A: Review transcript and candidate cuts. Differentiate intentional rhetorical repetition vs accidental stutters. Use word-aligned evidence and protect uncertain edits. Return approved cuts, protected ranges, and uncertain decisions matching the schema.",
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
        const response = await fetchFn("https://api.meta.ai/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(`Wonder API returned HTTP ${response.status}: ${errBody}`);
        }
        return await readModelResponse(response);
      },
      {
        attempts: 2,
        delayMs: 1200,
        onAttemptError: (err: any, attempt) => {
          onLogEvent?.("WONDER_REQUEST_RETRY", { runId, attempt, error: err?.message || String(err) });
        },
      }
    );
  } catch (apiErr: any) {
    const elapsed = Date.now() - startTime;
    const failMsg = `Wonder AI Director API call failed after ${elapsed}ms: ${apiErr.message}. In accordance with fail-safe policy, automatic rule-based cutting was not applied.`;
    onLogEvent?.("WONDER_REQUEST_FAILED", { runId, elapsedMs: elapsed, error: failMsg });
    throw new Error(failMsg);
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
    const failMsg = `Wonder AI Director returned invalid JSON: ${parseErr.message}. In accordance with fail-safe policy, automatic rule-based cutting was not applied.`;
    onLogEvent?.("WONDER_JSON_PARSE_ERROR", { runId, error: failMsg });
    throw new Error(failMsg);
  }

  if (!parsed || !Array.isArray(parsed.approvedCuts)) {
    const failMsg =
      "Wonder AI Director response does not conform to the required editorial schema. In accordance with fail-safe policy, automatic rule-based cutting was not applied.";
    onLogEvent?.("WONDER_VALIDATION_ERROR", { runId, error: failMsg });
    throw new Error(failMsg);
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

  // Perform full semantic validation on approved cuts
  const semanticValidation = validateApprovedCutsSemantic(parsed.approvedCuts, {
    totalDuration,
    protectedRanges: rawProtectedRanges,
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
    protectedRangesCount: rawProtectedRanges.length,
    rejectedCutsCount: semanticValidation.rejectedCuts.length,
  });

  return {
    planId,
    approvedCuts: semanticValidation.validCuts,
    protectedRanges: rawProtectedRanges,
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

  let lastEditedEnd = 0;

  for (const seg of transcript) {
    const editedWords = [];
    for (const w of seg.words) {
      const mid = (w.start + w.end) / 2;
      const isRetained = keepSegments.some((k) => mid >= k.start && mid <= k.end);
      if (isRetained) {
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

  const apiKey =
    process.env.MODEL_API_KEY ||
    process.env.MUSE_API_KEY ||
    process.env.META_API_KEY;

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
      "Stage B: Analyze the final clean narrative and design a rich visual edit plan using talking-head footage, kinetic typography, dynamic captions, split-screen/stacked layouts, picture-in-picture, animated diagrams, B-roll clips, generated images, SAM cutouts, and camera zooms. Make narrative-relevant decisions without robotic emojis.",
  };

  const payload = {
    model: WONDER_STAGE_B_MODEL_ID,
    input: [
      {
        role: "user",
        content: JSON.stringify(creativeInput),
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
        const response = await fetchFn("https://api.meta.ai/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(`Wonder Creative API returned HTTP ${response.status}: ${errBody}`);
        }
        return await readModelResponse(response);
      },
      {
        attempts: 2,
        delayMs: 1200,
        onAttemptError: (err: any, attempt) => {
          onLogEvent?.("WONDER_VISUAL_REQUEST_RETRY", { runId, attempt, error: err?.message || String(err) });
        },
      }
    );
  } catch (apiErr: any) {
    const elapsed = Date.now() - startTime;
    const failMsg = `Wonder Creative Director API call failed after ${elapsed}ms: ${apiErr.message}.`;
    onLogEvent?.("WONDER_VISUAL_REQUEST_FAILED", { runId, elapsedMs: elapsed, error: failMsg });
    throw new Error(failMsg);
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
    const failMsg = `Wonder Creative Director returned invalid JSON: ${parseErr.message}.`;
    onLogEvent?.("WONDER_VISUAL_JSON_PARSE_ERROR", { runId, error: failMsg });
    throw new Error(failMsg);
  }

  if (!parsed || !Array.isArray(parsed.visualSegments)) {
    const failMsg = "Wonder Creative Director response does not contain valid visualSegments array.";
    onLogEvent?.("WONDER_VISUAL_VALIDATION_ERROR", { runId, error: failMsg });
    throw new Error(failMsg);
  }

  // Validate and map visualSegments
  const validatedSegments: VisualPlanSegment[] = parsed.visualSegments
    .filter((s: any) => typeof s.start === "number" && typeof s.end === "number" && s.end > s.start)
    .map((s: any, idx: number) => ({
      id: s.id || `vseg-${idx + 1}`,
      start: Math.max(0, +s.start.toFixed(2)),
      end: Math.min(cleanDuration, +s.end.toFixed(2)),
      layoutType: s.layoutType || "fullscreen_speaker",
      technique: s.technique || "dynamic_captions",
      spokenReference: String(s.spokenReference || ""),
      motionIntent: String(s.motionIntent || ""),
      requiredAssets: Array.isArray(s.requiredAssets) ? s.requiredAssets : [],
      layerArrangement: s.layerArrangement || "overlay",
      transitionDirection: s.transitionDirection || "slide_up",
      cameraZoom: typeof s.cameraZoom === "number" ? s.cameraZoom : 1.0,
      headlineText: s.headlineText ? String(s.headlineText) : undefined,
      brandSettings: {
        primaryColor: template.primaryColor,
        highlightColor: template.highlightColor,
        fontFamily: template.fontFamily,
      },
    }));

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
          zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.15,
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
        zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.15,
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
