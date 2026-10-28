/**
 * Meta Muse — Pipeline B Tool: Wonder Editorial Director
 * Calls Meta Muse Wonder (muse-wonder-1.0) to act as the creative director for talking-head video editing.
 * Approves/rejects candidate cuts, protects intentional rhetorical delivery, and plans story-specific visuals.
 */

import { readModelResponse } from "../../model-response.ts";
import { withModelRetry } from "../../model-retry.ts";
import type {
  CandidateCut,
  EditCut,
  ProtectedRange,
  TranscriptSegment,
  TranscriptWord,
  VisualOverlayItem,
} from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";

export const WONDER_TALKING_HEAD_DIRECTOR_SYSTEM_PROMPT = `# SYSTEM PROMPT — META MUSE WONDER: TALKING-HEAD AI EDITORIAL DIRECTOR

## IDENTITY
You are META MUSE WONDER DIRECTOR, an elite film and video editor, narrative director, and motion designer.
Your objective is to direct the editing and creative visual enhancement of a user-submitted talking-head video.

## CORE RESPONSIBILITIES

1. EDITORIAL DECISION MAKING (CUT APPROVAL & RETENTION):
   - You will receive mechanically detected candidate cuts (silences, vocal fillers, repeated words, and phrase retakes).
   - RHETORICAL EMPHASIS vs ACCIDENTAL STUTTER:
     - Distinguish INTENTIONAL REPETITION (e.g., "very, very important", "really, really huge", "never, never give up") from ACCIDENTAL STUTTERS (e.g., "this, this software", "we, we need").
     - NEVER cut intentional emphasis. Place intentional emphasis in protectedRanges.
     - For accidental stutters ("this, this"), approve cutting ONLY the first instance, keeping the second clean instance intact.
     - For multi-word phrase retakes ("in five clicks in five clicks edit video"), approve cutting the first failed take, preserving the second clean take.
     - For vocal fillers ("um", "ah", "uh", "er"), approve cutting them while strictly protecting the boundary of adjacent spoken words.
     - For natural pauses (0.35s to 0.70s), protect them for speaker breathing and natural delivery. Only cut genuine dead air (> 0.75s).

2. NARRATIVE HOOK & STORY-SPECIFIC VISUAL PLAN:
   - Identify the strongest narrative hook line from the speaker's actual opening words.
   - Plan story-specific visual treatments (animated stickers, badges, kinetic word pops, split screens, progress bar) derived STRICTLY from what the speaker actually says.
   - DO NOT make unsupported factual claims (e.g., do not say "4K REEL" or "ZERO DELAY" unless the speaker explicitly states it).
   - Use dynamic spring animations: "pop", "bounce", "slide_up", or "fade".

3. OUTPUT FORMAT:
   Return valid JSON strictly matching the schema without markdown fences or extraneous text.`;

export const WONDER_EDITORIAL_DECISION_SCHEMA = {
  type: "object",
  properties: {
    planId: { type: "string" },
    title: { type: "string" },
    hookLine: { type: "string" },
    approvedCuts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          start: { type: "number" },
          end: { type: "number" },
          type: { type: "string", enum: ["silence", "filler", "retake", "off_script"] },
          reason: { type: "string" },
        },
        required: ["id", "start", "end", "type", "reason"],
      },
    },
    protectedRanges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start: { type: "number" },
          end: { type: "number" },
          reason: { type: "string" },
        },
        required: ["start", "end", "reason"],
      },
    },
    visualPlan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["image_overlay", "icon_badge", "kinetic_word", "progress_bar", "lower_third"],
          },
          timestamp: { type: "number" },
          duration: { type: "number" },
          content: { type: "string" },
          animation: { type: "string", enum: ["pop", "bounce", "slide_up", "fade"] },
          soundName: { type: "string" },
        },
        required: ["id", "type", "timestamp", "duration", "content"],
      },
    },
    editorialNotes: { type: "string" },
  },
  required: ["planId", "title", "hookLine", "approvedCuts", "protectedRanges", "visualPlan", "editorialNotes"],
};

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

export interface WonderEditorialDecision {
  planId: string;
  title: string;
  hookLine: string;
  approvedCuts: EditCut[];
  protectedRanges: ProtectedRange[];
  visualPlan: VisualOverlayItem[];
  editorialNotes: string;
  tokenUsage?: { input?: number; output?: number };
}

/**
 * Calls Meta Muse Wonder AI Director to approve cuts and design visual enhancements.
 * If Wonder fails, strictly enforces fail-safe policy (throws an explicit error, never silent fallback).
 */
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
  } = params;

  const template = getPipelineBTemplate(templateId);
  const allWords = transcript.flatMap((s) => s.words);

  // If the user explicitly configured rules-only mode, bypass AI call deterministically
  if (mode === "rules-only") {
    onLogEvent?.("RULES_ONLY_PLANNING_ACTIVE", { runId });
    return createDeterministicFallbackPlan({
      transcript,
      candidateCuts,
      allWords,
      totalDuration,
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
    brandSettings: brandSettings || {
      primaryColor: template.primaryColor,
      highlightColor: template.highlightColor,
      fontFamily: template.fontFamily,
    },
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
    })),
    instruction:
      "Review the speech transcript, word timestamps, and candidate cuts. Classify intentional rhetorical emphasis vs accidental stutters. Approve cuts that enhance clarity and pacing. Design synchronized narrative visual overlays (stickers/badges/pops) based strictly on spoken words without false factual claims. Return valid JSON matching schema.",
  };

  const payload = {
    model: "muse-wonder-1.0",
    input: [
      {
        role: "user",
        content: JSON.stringify(wonderInput),
      },
    ],
    stream: true,
    temperature: 0.7,
    max_output_tokens: 161187,
    top_p: 1,
    reasoning: {
      effort: "high",
    },
    instructions: WONDER_TALKING_HEAD_DIRECTOR_SYSTEM_PROMPT,
    text: {
      format: {
        type: "json_schema",
        name: "PipelineBWonderDecisionSchema",
        schema: WONDER_EDITORIAL_DECISION_SCHEMA,
        strict: true,
      },
    },
  };

  const startTime = Date.now();
  onLogEvent?.("WONDER_REQUEST_STARTED", {
    runId,
    model: "muse-wonder-1.0",
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
          throw new Error(`Wonder API returned HTTP ${response.status}`);
        }
        return await readModelResponse(response);
      },
      {
        attempts: 2,
        delayMs: 1200,
        onAttemptError: (err, attempt) => {
          onLogEvent?.("WONDER_REQUEST_RETRY", { runId, attempt, error: err.message });
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

  if (!parsed || !Array.isArray(parsed.approvedCuts) || !Array.isArray(parsed.visualPlan)) {
    const failMsg =
      "Wonder AI Director response does not conform to the required editorial schema. In accordance with fail-safe policy, automatic rule-based cutting was not applied.";
    onLogEvent?.("WONDER_VALIDATION_ERROR", { runId, error: failMsg });
    throw new Error(failMsg);
  }

  // Validate approved cuts boundaries against total video duration
  const validatedCuts: EditCut[] = parsed.approvedCuts
    .filter((c: any) => typeof c.start === "number" && typeof c.end === "number" && c.end > c.start)
    .map((c: any, idx: number) => ({
      id: c.id || `cut-wonder-${idx + 1}`,
      start: Math.max(0, +c.start.toFixed(2)),
      end: Math.min(totalDuration, +c.end.toFixed(2)),
      type: (["silence", "filler", "retake", "off_script"].includes(c.type) ? c.type : "silence") as EditCut["type"],
      reason: c.reason || "Approved by Wonder AI Director",
    }));

  const validatedProtectedRanges: ProtectedRange[] = Array.isArray(parsed.protectedRanges)
    ? parsed.protectedRanges
        .filter((p: any) => typeof p.start === "number" && typeof p.end === "number" && p.end > p.start)
        .map((p: any) => ({
          start: Math.max(0, +p.start.toFixed(2)),
          end: Math.min(totalDuration, +p.end.toFixed(2)),
          reason: p.reason || "Protected by Wonder AI Director",
        }))
    : [];

  const validatedVisualPlan: VisualOverlayItem[] = parsed.visualPlan
    .filter((v: any) => typeof v.timestamp === "number" && v.content)
    .map((v: any, idx: number) => ({
      id: v.id || `overlay-wonder-${idx + 1}`,
      type: v.type || "image_overlay",
      timestamp: +v.timestamp.toFixed(2),
      duration: typeof v.duration === "number" ? +v.duration.toFixed(2) : 2.0,
      content: String(v.content).trim(),
      animation: (["pop", "bounce", "slide_up", "fade"].includes(v.animation) ? v.animation : "pop") as VisualOverlayItem["animation"],
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
      soundName: template.enableSfx ? "pop.mp3" : undefined,
    }));

  // Ensure top progress bar is included if template specifies it
  if (template.enableProgressBar && !validatedVisualPlan.some((v) => v.type === "progress_bar")) {
    validatedVisualPlan.unshift({
      id: "overlay-progress-bar",
      type: "progress_bar",
      timestamp: 0,
      duration: totalDuration,
      content: "Progress Bar",
      style: { color: template.highlightColor },
    });
  }

  const planId = parsed.planId || `wonder-plan-${Date.now()}`;
  onLogEvent?.("WONDER_PLAN_VALIDATED", {
    runId,
    planId,
    approvedCutsCount: validatedCuts.length,
    protectedRangesCount: validatedProtectedRanges.length,
    visualOverlaysCount: validatedVisualPlan.length,
  });

  return {
    planId,
    title: parsed.title || allWords.slice(0, 6).map((w) => w.word).join(" ") || "Talking-Head Reel",
    hookLine: parsed.hookLine || `"${allWords.slice(0, 6).map((w) => w.word).join(" ")}..."`,
    approvedCuts: validatedCuts,
    protectedRanges: validatedProtectedRanges,
    visualPlan: validatedVisualPlan,
    editorialNotes: parsed.editorialNotes || "Wonder AI Director planned narrative edit and visual enhancements.",
  };
}

/**
 * Deterministic fallback plan used ONLY when user explicitly requests mode === "rules-only".
 */
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
      });
    }
  }

  for (const cand of candidateCuts) {
    if (cand.classification === "intentional_emphasis" || cand.classification === "natural_pause") {
      continue;
    }
    const isProtected = protectedRanges.some(
      (pr) => Math.max(cand.start, pr.start) < Math.min(cand.end, pr.end)
    );
    if (isProtected) continue;

    let cutType: EditCut["type"] = "silence";
    if (cand.type === "filler") cutType = "filler";
    else if (cand.type === "repetition" || cand.type === "phrase_retake") cutType = "retake";

    approvedCuts.push({
      id: `cut-rules-${approvedCuts.length + 1}`,
      start: cand.start,
      end: cand.end,
      type: cutType,
      reason: cand.reason,
    });
  }

  const hookWords = allWords.slice(0, 6).map((w) => w.word).join(" ");
  const hookLine = hookWords ? `"${hookWords}..."` : "Talking Head Reel";

  const visualPlan: VisualOverlayItem[] = [];
  if (template.enableProgressBar) {
    visualPlan.push({
      id: "overlay-progress-bar",
      type: "progress_bar",
      timestamp: 0,
      duration: totalDuration,
      content: "Progress Bar",
      style: { color: template.highlightColor },
    });
  }

  return {
    planId: `rules-plan-${runId}`,
    title: hookWords || "Talking Head Reel",
    hookLine,
    approvedCuts,
    protectedRanges,
    visualPlan,
    editorialNotes: "Deterministic rule-based edit plan (rules-only mode).",
  };
}
