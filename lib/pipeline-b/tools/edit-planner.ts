/**
 * Meta Muse — Pipeline B Tool: Edit Planner
 * Creative director that designs cuts, punch-ins, kinetic typography, and visual assets
 * using Candidate Cut Generation + Wonder Muse AI Editorial Decision Engine.
 */

import type {
  CandidateCut,
  EditCut,
  EditPlan,
  KeepSegment,
  PacingConfig,
  PacingProfile,
  ProtectedRange,
  TranscriptSegment,
  TranscriptWord,
  VisualOverlayItem,
} from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";
import { alignTranscriptWithScript } from "./transcript-aligner.ts";

export const PACING_CONFIGS: Record<PacingProfile, PacingConfig> = {
  natural: {
    profile: "natural",
    minSilenceDuration: 0.75, // Conversational pacing preserves breath pauses up to 0.75s
    preservedSilenceMargin: 0.20, // Leave 0.20s natural breathing room
    minSpeechMargin: 0.05, // Never clip speech boundaries
  },
  snappy: {
    profile: "snappy",
    minSilenceDuration: 0.30, // Hyper-fast short-form reel cut
    preservedSilenceMargin: 0.08,
    minSpeechMargin: 0.04,
  },
  relaxed: {
    profile: "relaxed",
    minSilenceDuration: 0.70,
    preservedSilenceMargin: 0.22,
    minSpeechMargin: 0.06,
  },
};

const INTENTIONAL_EMPHASIS_WORDS = new Set([
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

const FILLER_SOUND_REGEX =
  /^(a+h+|u+m+|u+h+|e+r+|h+m+|e+r+m+|o+h+|m+h+m+|okay+|ok+|huh+|ur+|aah+|umm+|ahh+)$/i;

const ISOLATED_FILLERS = new Set([
  "ah",
  "ahh",
  "aah",
  "aaah",
  "um",
  "umm",
  "ummm",
  "uhm",
  "uh",
  "uhh",
  "uhhh",
  "er",
  "err",
  "hmm",
  "hmmm",
  "erm",
  "ooh",
  "oh",
  "okay",
  "ok",
  "mhm",
  "huh",
  "ur",
]);

const CONVERSATIONAL_FILLERS = new Set([
  "like",
  "so",
  "yeah",
  "actually",
  "basically",
  "right",
  "see",
  "you know",
]);

function isPhraseSimilar(words1: string[], words2: string[]): boolean {
  if (words1.length !== words2.length) return false;
  if (words1.join(" ") === words2.join(" ")) return true;
  if (words1.length < 3) return false;
  let matches = 0;
  for (let k = 0; k < words1.length; k++) {
    if (words1[k] === words2[k]) matches++;
  }
  return matches / words1.length >= 0.65;
}

export interface PlanTalkingHeadEditParams {
  transcript: TranscriptSegment[];
  silences?: { start: number; end: number; duration: number }[];
  totalDuration: number;
  templateId?: string;
  userScript?: string;
  pacingProfile?: PacingProfile;
  brandSettings?: {
    primaryColor?: string;
    highlightColor?: string;
    fontFamily?: string;
  };
}

/**
 * Maps a source-video timestamp to its corresponding edited-video timestamp
 * based on the retained keepSegments.
 * Exact piecewise linear mapping derived from retained source intervals.
 */
export function mapSourceTimeToEditedTime(sourceTime: number, keepSegments: KeepSegment[]): number {
  if (!keepSegments || keepSegments.length === 0) return Math.max(0, +sourceTime.toFixed(2));

  let editedTime = 0;
  for (const seg of keepSegments) {
    if (sourceTime < seg.start) {
      // The source time falls before this segment (in a cut preceding it)
      return +editedTime.toFixed(2);
    }
    if (sourceTime >= seg.start && sourceTime <= seg.end) {
      // Inside this retained segment
      return +(editedTime + (sourceTime - seg.start)).toFixed(2);
    }
    editedTime += seg.duration;
  }
  return +editedTime.toFixed(2);
}

/**
 * Phase 1: Candidate Cut Detection Engine
 * Scans audio silences, transcribed speech, and ground-truth script to identify candidate cuts,
 * aggressively classifying stutters ("like, like, like"), vocal fillers ("ah", "um"), and dead air.
 */
export function generateCandidateCuts(params: {
  allWords: TranscriptWord[];
  transcript: TranscriptSegment[];
  silences: { start: number; end: number; duration: number }[];
  totalDuration: number;
  pacing: PacingConfig;
  userScript?: string;
}): CandidateCut[] {
  const { allWords, transcript, silences, totalDuration, pacing, userScript } = params;
  const candidates: CandidateCut[] = [];

  // 0a. Initial Dead Air Before First Spoken Word (cuts dead air >= 0.35s, preserves subtle audio preroll)
  if (allWords.length > 0 && allWords[0].start >= 0.35) {
    const leadCutEnd = Math.max(0, +(allWords[0].start - 0.05).toFixed(2));
    if (leadCutEnd > 0) {
      candidates.push({
        id: "cand-lead-silence",
        start: 0,
        end: leadCutEnd,
        type: "silence",
        classification: "dead_air",
        confidence: 0.99,
        affectedText: `[Initial Dead Air ${allWords[0].start.toFixed(2)}s]`,
        reason: `Trim initial dead air before speaker begins talking`,
      });
    }
  }

  // 0b. Starting Vocal Fillers ("ah", "um", "uh", "okay", "so") before actual speech content
  if (allWords.length > 1) {
    const firstClean = allWords[0].word.toLowerCase().replace(/[^\w]/g, "");
    if (ISOLATED_FILLERS.has(firstClean) || FILLER_SOUND_REGEX.test(firstClean)) {
      const nextStart = allWords[1].start;
      const cStart = Math.max(0, +allWords[0].start.toFixed(2));
      const cEnd = Math.min(totalDuration, +(nextStart - 0.03).toFixed(2));
      if (cEnd > cStart) {
        candidates.push({
          id: "cand-lead-filler",
          start: cStart,
          end: cEnd,
          type: "filler",
          classification: "filler_pause",
          confidence: 0.99,
          affectedText: allWords[0].word,
          reason: `Trim starting hesitation sound '${allWords[0].word}' so video hooks immediately on '${allWords[1].word}'`,
        });
      }
    }
  }

  // 1. Acoustic Silences from silence detection
  for (let i = 0; i < silences.length; i++) {
    const s = silences[i];
    if (s.duration >= pacing.minSilenceDuration) {
      const isStartOfVideo = s.start <= 0.06;
      const isEndOfVideo = s.end >= totalDuration - 0.06;
      const cStart = isStartOfVideo
        ? 0
        : Math.max(0, +(s.start + pacing.preservedSilenceMargin).toFixed(2));
      const cEnd = isEndOfVideo
        ? totalDuration
        : Math.min(totalDuration, +(s.end - pacing.preservedSilenceMargin).toFixed(2));
      if (cEnd > cStart && (cEnd - cStart) >= 0.12) {
        candidates.push({
          id: `cand-silence-${i + 1}`,
          start: cStart,
          end: cEnd,
          type: "silence",
          classification: "dead_air",
          confidence: 0.96,
          affectedText: `[Pause ${s.duration.toFixed(2)}s]`,
          reason: `Trim dead air (${s.duration.toFixed(2)}s)${isStartOfVideo || isEndOfVideo ? "" : ` leaving ${pacing.preservedSilenceMargin}s natural breathing room`}`,
        });
      }
    } else if (pacing.profile === "natural" && s.duration >= 0.35 && s.duration < pacing.minSilenceDuration) {
      candidates.push({
        id: `cand-pause-natural-${i + 1}`,
        start: s.start,
        end: s.end,
        type: "silence",
        classification: "natural_pause",
        confidence: 0.90,
        affectedText: `[Natural Pause ${s.duration.toFixed(2)}s]`,
        reason: `Natural breathing pause (${s.duration.toFixed(2)}s) preserved for conversational pacing`,
      });
    }
  }
  // 0c. Ground-Truth Script Alignment (Cut off-script fillers & redundant stutters)
  if (userScript && userScript.trim().length > 0) {
    const alignment = alignTranscriptWithScript(transcript, userScript);
    for (const dev of alignment.deviations) {
      if (dev.classification === "redundant_repetition") {
        candidates.push({
          id: `cand-script-redundant-${candidates.length + 1}`,
          start: dev.start,
          end: dev.end,
          type: "repetition",
          classification: "accidental_stutter",
          confidence: 0.98,
          affectedText: dev.text,
          reason: dev.reason,
        });
      } else if (dev.classification === "off_script_filler") {
        candidates.push({
          id: `cand-script-filler-${candidates.length + 1}`,
          start: dev.start,
          end: dev.end,
          type: "filler",
          classification: "filler_pause",
          confidence: 0.98,
          affectedText: dev.text,
          reason: dev.reason,
        });
      }
    }
  }

  // 2. Inter-sentence gaps in transcript
  for (let s = 0; s < transcript.length - 1; s++) {
    const segCurrent = transcript[s];
    const segNext = transcript[s + 1];
    const pauseDur = segNext.start - segCurrent.end;

    if (pauseDur >= pacing.minSilenceDuration) {
      const pStart = +(segCurrent.end + pacing.preservedSilenceMargin).toFixed(2);
      const pEnd = +(segNext.start - pacing.minSpeechMargin).toFixed(2);
      if (pEnd > pStart && (pEnd - pStart) >= 0.12) {
        candidates.push({
          id: `cand-sent-pause-${s + 1}`,
          start: pStart,
          end: pEnd,
          type: "sentence_pause",
          classification: "dead_air",
          confidence: 0.92,
          affectedText: `[Sentence Gap ${pauseDur.toFixed(2)}s]`,
          reason: `Tighten inter-sentence gap (${pauseDur.toFixed(2)}s) while preserving speech boundary`,
        });
      }
    }
  }

  // 3. Repeated Words, Runs & Multi-Word Phrase Retakes
  const normalizedWords = allWords.map((w) => w.word.toLowerCase().replace(/[^\w]/g, ""));

  // 3a. Identical word runs (runLength >= 2, e.g. "two two", "like, like, like, like")
  let rStart = 0;
  while (rStart < normalizedWords.length) {
    let rEnd = rStart + 1;
    while (rEnd < normalizedWords.length && normalizedWords[rEnd] === normalizedWords[rStart]) {
      rEnd++;
    }
    const runLength = rEnd - rStart;
    const wordClean = normalizedWords[rStart];

    if (runLength >= 2 && wordClean.length > 0) {
      if (INTENTIONAL_EMPHASIS_WORDS.has(wordClean) && runLength === 2) {
        // e.g. "very, very"
        candidates.push({
          id: `cand-emphasis-${rStart + 1}`,
          start: allWords[rStart].start,
          end: allWords[rEnd - 1].end,
          type: "repetition",
          classification: "intentional_emphasis",
          confidence: 0.92,
          affectedText: allWords.slice(rStart, rEnd).map((w) => w.word).join(" "),
          reason: `Intentional emphasis on '${allWords[rStart].word}' — preserve for speaker delivery`,
        });
      } else {
        // e.g. "two two" or "like, like, like, like"
        // Keep ONLY the last clean instance (allWords[rEnd - 1]), cut all prior stutters!
        const wFirst = allWords[rStart];
        const wCleanInstance = allWords[rEnd - 1];

        const cStart = Math.max(0, +wFirst.start.toFixed(2));
        const cEnd = Math.min(totalDuration, +(wCleanInstance.start - 0.02).toFixed(2));
        if (cEnd > cStart && (cEnd - cStart) >= 0.05) {
          candidates.push({
            id: `cand-run-${rStart + 1}`,
            start: cStart,
            end: cEnd,
            type: "repetition",
            classification: "accidental_stutter",
            confidence: 0.98,
            affectedText: allWords.slice(rStart, rEnd - 1).map((w) => w.word).join(" "),
            reason: `Trim ${runLength - 1} repeated stutter(s) of '${wFirst.word}', keeping clean final instance '${wCleanInstance.word}'`,
          });
        }
      }
      rStart = rEnd;
    } else {
      rStart++;
    }
  }

  // 3a-2. Separated repeated words across hesitation filler (e.g. "like ... ah ... like")
  for (let i = 0; i < normalizedWords.length - 1; i++) {
    const w1 = allWords[i];
    const clean1 = normalizedWords[i];
    if (!clean1 || INTENTIONAL_EMPHASIS_WORDS.has(clean1)) continue;

    for (let step = 2; step <= 3 && i + step < normalizedWords.length; step++) {
      const wTarget = allWords[i + step];
      const cleanTarget = normalizedWords[i + step];

      if (cleanTarget === clean1) {
        const intermediateWords = normalizedWords.slice(i + 1, i + step);
        const onlyFillersBetween = intermediateWords.every(
          (iw) => ISOLATED_FILLERS.has(iw) || CONVERSATIONAL_FILLERS.has(iw) || FILLER_SOUND_REGEX.test(iw)
        );

        if (onlyFillersBetween) {
          const cStart = Math.max(0, +w1.start.toFixed(2));
          const cEnd = Math.min(totalDuration, +(wTarget.start - 0.02).toFixed(2));
          if (cEnd > cStart && (cEnd - cStart) >= 0.06) {
            candidates.push({
              id: `cand-stutter-gap-${i + 1}-${step}`,
              start: cStart,
              end: cEnd,
              type: "repetition",
              classification: "accidental_stutter",
              confidence: 0.96,
              affectedText: allWords.slice(i, i + step).map((w) => w.word).join(" "),
              reason: `Trim stuttered repeat of '${w1.word}' across hesitation filler, keeping clean resume at '${wTarget.word}'`,
            });
            break;
          }
        }
      }
    }
  }

  // 3b. Multi-word phrase retakes (length 2 to 6 words, with gap up to 6 words)
  for (let L = 6; L >= 2; L--) {
    for (let i = 0; i <= normalizedWords.length - 2 * L; i++) {
      for (let gap = 0; gap <= 6; gap++) {
        const j = i + L + gap;
        if (j + L > normalizedWords.length) continue;

        const words1 = normalizedWords.slice(i, i + L);
        const words2 = normalizedWords.slice(j, j + L);

        if (isPhraseSimilar(words1, words2)) {
          const cStart = Math.max(0, +allWords[i].start.toFixed(2));
          const cEnd = Math.min(totalDuration, +(allWords[j].start - 0.02).toFixed(2));
          if (cEnd > cStart && (cEnd - cStart) >= 0.15) {
            candidates.push({
              id: `cand-phrase-retake-${i + 1}`,
              start: cStart,
              end: cEnd,
              type: "phrase_retake",
              classification: "accidental_stutter",
              confidence: 0.95,
              affectedText: allWords.slice(i, j).map((w) => w.word).join(" "),
              reason: `Trim false start of repeated phrase: '${allWords.slice(i, j).map((w) => w.word).join(" ")}'`,
            });
            i = j + L - 1;
            break;
          }
        }
      }
    }
  }

  // 3c. Single-word false starts, abandoned statement restarts & stuttered determiners
  for (let i = 0; i < allWords.length - 1; i++) {
    const wCurrent = allWords[i];
    const wNext = allWords[i + 1];
    const curClean = normalizedWords[i];
    const nextClean = normalizedWords[i + 1];

    if (!curClean || INTENTIONAL_EMPHASIS_WORDS.has(curClean)) continue;

    const isRepeatedShortly = i < allWords.length - 2 && (curClean === normalizedWords[i + 2] || curClean === normalizedWords[i + 3]);
    const isAbandonedWord = (curClean === "every" && nextClean === "all") ||
                            (curClean === "in" && (nextClean === "only" || nextClean === "just") && i < allWords.length - 2 && normalizedWords[i + 2] === "in");

    if (isRepeatedShortly || isAbandonedWord) {
      const cStart = Math.max(0, +wCurrent.start.toFixed(2));
      const cEnd = Math.min(totalDuration, +(wNext.start - 0.02).toFixed(2));
      if (cEnd > cStart && (cEnd - cStart) >= 0.08) {
        candidates.push({
          id: `cand-false-start-${i + 1}`,
          start: cStart,
          end: cEnd,
          type: "false_start",
          classification: "accidental_stutter",
          confidence: 0.92,
          affectedText: wCurrent.word,
          reason: `Trim false start of '${wCurrent.word}' before restarted utterance '${wNext.word}'`,
        });
      }
    }
  }

  // 4. Vocal Fillers & Hesitation Markers ("ah", "um", "uh", "er", "hmm", "like")
  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i];
    const clean = normalizedWords[i];

    const isExplicitFiller = ISOLATED_FILLERS.has(clean) || FILLER_SOUND_REGEX.test(clean);
    const isConversational = CONVERSATIONAL_FILLERS.has(clean);

    let isFiller = isExplicitFiller;
    if (isConversational) {
      // Conversational fillers ("like", "so", "yeah") count as fillers if preceded or followed by pause >= 0.12s, at clause start, or repeated
      const prevWord = i > 0 ? allWords[i - 1] : null;
      const nextWord = i < allWords.length - 1 ? allWords[i + 1] : null;
      const prevGap = prevWord ? w.start - prevWord.end : 1.0;
      const nextGap = nextWord ? nextWord.start - w.end : 1.0;
      const isRepeatedNear = (prevWord && normalizedWords[i - 1] === clean) || (nextWord && normalizedWords[i + 1] === clean);
      if (prevGap >= 0.12 || nextGap >= 0.12 || i === 0 || isRepeatedNear) {
        isFiller = true;
      }
    }

    if (isFiller) {
      const prevWord = i > 0 ? allWords[i - 1] : null;
      const nextWord = i < allWords.length - 1 ? allWords[i + 1] : null;

      // Expand cut to swallow adjacent dead pauses around the filler sound
      const cStart = prevWord
        ? Math.max(0, +(prevWord.end + pacing.minSpeechMargin).toFixed(2))
        : Math.max(0, +w.start.toFixed(2));

      const cEnd = nextWord
        ? Math.min(totalDuration, +(nextWord.start - pacing.minSpeechMargin).toFixed(2))
        : Math.min(totalDuration, +w.end.toFixed(2));

      if (cEnd > cStart && (cEnd - cStart) >= 0.05) {
        candidates.push({
          id: `cand-filler-${i + 1}`,
          start: cStart,
          end: cEnd,
          type: "filler",
          classification: "filler_pause",
          confidence: 0.98,
          affectedText: w.word,
          reason: `Trim vocal filler hesitation sound: '${w.word}' and adjacent silence`,
        });
      }
    }
  }

  return candidates;
}

/**
 * Phase 2: Wonder Muse AI Editorial Decision Engine
 * Approves valid cuts, protects meaning/intentional emphasis,
 * and designs narrative-driven visual plans without false claims.
 */
export function wonderMuseEditorialDirector(params: {
  candidates: CandidateCut[];
  transcript: TranscriptSegment[];
  allWords: TranscriptWord[];
  totalDuration: number;
  userScript?: string;
  templateId?: string;
  pacing: PacingConfig;
}): {
  approvedCuts: EditCut[];
  protectedRanges: ProtectedRange[];
  visualPlan: VisualOverlayItem[];
  hookLine: string;
  notes: string;
} {
  const { candidates, transcript, allWords, totalDuration, userScript, templateId } = params;
  const template = getPipelineBTemplate(templateId);

  const approvedCuts: EditCut[] = [];
  const protectedRanges: ProtectedRange[] = [];

  // 1. Establish Protected Ranges
  for (const cand of candidates) {
    if (cand.classification === "intentional_emphasis" || cand.classification === "natural_pause") {
      protectedRanges.push({
        start: cand.start,
        end: cand.end,
        reason: cand.reason,
      });
    }
  }

  // 2. Filter & Approve Candidate Cuts
  for (const cand of candidates) {
    // Never approve intentional emphasis cuts, natural dramatic pauses, or unconfirmed review items
    if (
      cand.classification === "intentional_emphasis" ||
      cand.classification === "natural_pause" ||
      cand.classification === "needs_review"
    ) {
      continue;
    }

    // Check if cut overlaps with any protected range
    const isProtected = protectedRanges.some(
      (pr) => Math.max(cand.start, pr.start) < Math.min(cand.end, pr.end)
    );
    if (isProtected) {
      continue;
    }

    // Approve accidental stutters, dead air, and phrase retakes
    let cutType: EditCut["type"] = "silence";
    if (cand.type === "filler") cutType = "filler";
    else if (cand.type === "repetition" || cand.type === "phrase_retake" || cand.type === "false_start") cutType = "retake";

    approvedCuts.push({
      id: `cut-${approvedCuts.length + 1}`,
      start: cand.start,
      end: cand.end,
      type: cutType,
      reason: cand.reason,
    });
  }

  // 3. Narrative Hook Line (extracted strictly from speaker's actual first 6 words)
  const hookWords = allWords.slice(0, 6).map((w) => w.word).join(" ");
  const hookLine = hookWords ? `"${hookWords}..."` : "Talking Head Master Reel";

  // 4. Story-Driven Visual Plan (Derived strictly from spoken content, no false claims)
  const visualPlan: VisualOverlayItem[] = [];

  // Top progress bar if enabled
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

  // Contextual Visual Badges derived from actual transcript words
  // Only plan overlays for concepts the user actually said
  const contextualTerms: { match: RegExp; label: string; anim: "bounce" | "pop" | "slide_up" }[] = [
    { match: /\b(?:app|software|tool)\b/i, label: "SMART APP", anim: "bounce" },
    { match: /\b(?:click|clicks|instant)\b/i, label: "FAST WORKFLOW", anim: "pop" },
    { match: /\b(?:video|videos|reel|clip)\b/i, label: "VIDEO CREATOR", anim: "slide_up" },
    { match: /\b(?:edit|trim|cut)\b/i, label: "AUTO CUT", anim: "pop" },
    { match: /\b(?:ready|done|complete)\b/i, label: "READY TO POST", anim: "bounce" },
    { match: /\b(?:simple|easy|clean)\b/i, label: "PURE SIMPLICITY", anim: "pop" },
  ];

  const addedLabels = new Set<string>();

  for (let wi = 0; wi < allWords.length; wi++) {
    const word = allWords[wi];
    for (const term of contextualTerms) {
      if (term.match.test(word.word)) {
        let label = term.label;
        if (term.label === "FAST WORKFLOW" && wi > 0) {
          const prev = allWords[wi - 1].word.toLowerCase();
          if (prev === "five" || prev === "5") {
            label = "5 CLICKS";
          }
        }
        if (!addedLabels.has(label)) {
          addedLabels.add(label);
          visualPlan.push({
            id: `overlay-visual-${visualPlan.length + 1}`,
            type: "image_overlay",
            timestamp: word.start, // in source time; will be mapped to edited time
            duration: 2.0,
            content: label,
            animation: term.anim,
            style: {
              bg: template.cardBg,
              textColor: template.highlightColor,
              border: template.primaryColor,
            },
            soundName: template.enableSfx ? "pop.mp3" : undefined,
          });
        }
      }
    }
  }

  // Keyword kinetic emphasis badges for key verbs/nouns (every 4-6 seconds)
  const significantWords = allWords.filter(
    (w) =>
      w.word.length >= 6 &&
      !["because", "without", "through", "people", "really", "welcome", "getting"].includes(
        w.word.toLowerCase()
      )
  );

  significantWords.slice(0, 3).forEach((kw) => {
    visualPlan.push({
      id: `overlay-badge-${visualPlan.length + 1}`,
      type: "icon_badge",
      timestamp: kw.start, // in source time; will be mapped to edited time
      duration: 1.8,
      content: kw.word.toUpperCase(),
      animation: "pop",
      style: {
        bg: template.cardBg,
        textColor: template.highlightColor,
        border: template.primaryColor,
      },
      soundName: template.enableSfx ? "pop.mp3" : undefined,
    });
  });

  const notes = `Wonder Muse approved ${approvedCuts.length} cuts, protected ${protectedRanges.length} intentional ranges, and planned ${visualPlan.length} narrative visual elements.`;

  return {
    approvedCuts,
    protectedRanges,
    visualPlan,
    hookLine,
    notes,
  };
}

/**
 * Assembles the final EditPlan from candidate cuts, Wonder AI editorial decisions, and keep segments.
 */
export function assembleFinalEditPlan(params: {
  candidateCuts: CandidateCut[];
  editorial: {
    approvedCuts: EditCut[];
    protectedRanges: ProtectedRange[];
    visualPlan: VisualOverlayItem[];
    hookLine: string;
    notes?: string;
    editorialNotes?: string;
    title?: string;
    planId?: string;
    uncertainDecisions?: { candidateId: string; actionTaken: "kept_safe" | "cut"; rationale: string }[];
    visualSegments?: any[];
    editedTranscript?: any[];
  };
  totalDuration: number;
  templateId?: string;
  pacingProfile?: PacingProfile;
  transcript: TranscriptSegment[];
}): EditPlan {
  const {
    candidateCuts,
    editorial,
    totalDuration,
    templateId = "hormoziPunch",
    pacingProfile = "natural",
    transcript,
  } = params;

  const template = getPipelineBTemplate(templateId);
  const allWords = transcript.flatMap((s) => s.words);
  const fullText = allWords.map((w) => w.word).join(" ");

  // 1. Validate and Merge Overlapping Cuts cleanly without gap deletion
  const cuts = mergeOverlappingCuts(editorial.approvedCuts, totalDuration);

  // 2. Calculate Keep Segments (Preserve short speech intervals, never discard speech)
  const keepSegments: KeepSegment[] = [];
  let currentStart = 0;

  for (const cut of cuts) {
    if (cut.start > currentStart) {
      const dur = +(cut.start - currentStart).toFixed(2);
      if (dur > 0.05) {
        keepSegments.push({
          start: +currentStart.toFixed(2),
          end: +cut.start.toFixed(2),
          duration: dur,
          zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.15, // Alternating punch-in
        });
      }
    }
    currentStart = cut.end;
  }

  if (currentStart < totalDuration) {
    const finalDur = +(totalDuration - currentStart).toFixed(2);
    if (finalDur > 0.05) {
      keepSegments.push({
        start: +currentStart.toFixed(2),
        end: +totalDuration.toFixed(2),
        duration: finalDur,
        zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.15,
      });
    }
  }

  let cleanDuration = +keepSegments.reduce((acc, s) => acc + s.duration, 0).toFixed(2);

  // Explicit error state: If cuts consumed everything or left negligible fragments (< 0.5s from a >= 1.0s video),
  // reject the invalid cut plan explicitly rather than silently falling back to whole-video.
  if (keepSegments.length === 0 || (totalDuration >= 1.0 && cleanDuration < 0.5)) {
    throw new Error(
      `Cut validation failed: AI-approved cuts deleted excessive dialogue leaving only ${cleanDuration}s (less than 0.5s minimum required from ${totalDuration}s video). An explicit review state is required.`
    );
  }

  const cutDuration = +(totalDuration - cleanDuration).toFixed(2);

  // 3. Separate Metric Calculations
  let cutSilenceDuration = 0;
  let cutFillerDuration = 0;
  let cutRepetitionDuration = 0;
  let cutSilenceSegmentsCount = 0;
  let cutFillersCount = 0;
  let cutRepetitionsCount = 0;

  for (const cut of cuts) {
    const dur = +(cut.end - cut.start).toFixed(2);
    if (cut.type === "silence") {
      cutSilenceDuration += dur;
    } else if (cut.type === "filler") {
      cutFillerDuration += dur;
    } else if (cut.type === "retake") {
      cutRepetitionDuration += dur;
    }
  }

  cutSilenceSegmentsCount = editorial.approvedCuts.filter((c) => c.type === "silence").length;
  cutFillersCount = editorial.approvedCuts.filter((c) => c.type === "filler").length;
  cutRepetitionsCount = editorial.approvedCuts.filter((c) => c.type === "retake").length;

  cutSilenceDuration = +cutSilenceDuration.toFixed(2);
  cutFillerDuration = +cutFillerDuration.toFixed(2);
  cutRepetitionDuration = +cutRepetitionDuration.toFixed(2);

  // 4. Map Visual Overlay Timestamps to Exact Edited Timeline
  const mappedVisualPlan: VisualOverlayItem[] = editorial.visualPlan.map((item) => {
    if (item.type === "progress_bar") {
      return { ...item, duration: cleanDuration };
    }
    const editedStart = mapSourceTimeToEditedTime(item.timestamp, keepSegments);
    return {
      ...item,
      timestamp: editedStart,
    };
  });

  return {
    title: editorial.title || fullText.slice(0, 40) || "AI Edited Talking-Head Reel",
    hookLine: editorial.hookLine,
    cuts,
    keepSegments,
    cleanDuration,
    cutDuration,
    cutSilenceDuration,
    cutFillerDuration,
    cutRepetitionDuration,
    cutSilenceSegmentsCount,
    cutRepetitionsCount,
    cutFillersCount,
    candidateCuts,
    protectedRanges: editorial.protectedRanges,
    uncertainDecisions: (editorial as any).uncertainDecisions,
    pacingProfile,
    visualPlan: mappedVisualPlan,
    visualSegments: (editorial as any).visualSegments,
    editedTranscript: (editorial as any).editedTranscript,
    transcript,
    templateId: template.id,
    notes: editorial.editorialNotes || editorial.notes || "Plan assembled from Wonder AI Director decisions.",
  };
}

/**
 * Phase 3: Master Edit Planner Function
 * Integrates Candidate Detection + Wonder Muse Decision Engine + Exact Timeline Mapping.
 */
export function planTalkingHeadEdit(params: PlanTalkingHeadEditParams): EditPlan {
  const {
    transcript,
    silences = [],
    totalDuration,
    templateId,
    userScript,
    pacingProfile = "natural",
  } = params;

  const pacing = PACING_CONFIGS[pacingProfile] || PACING_CONFIGS.natural;
  const allWords = transcript.flatMap((s) => s.words);

  // 1. Generate Candidate Cuts
  const candidateCuts = generateCandidateCuts({
    allWords,
    transcript,
    silences,
    totalDuration,
    pacing,
    userScript,
  });

  // 2. Wonder Muse Editorial Decisions (local reference implementation for tests / offline)
  const editorial = wonderMuseEditorialDirector({
    candidates: candidateCuts,
    transcript,
    allWords,
    totalDuration,
    userScript,
    templateId,
    pacing,
  });

  // 3. Assemble and return final plan
  return assembleFinalEditPlan({
    candidateCuts,
    editorial,
    totalDuration,
    templateId,
    pacingProfile,
    transcript,
  });
}

/**
 * Validates and merges overlapping cuts strictly without destroying speech between them.
 */
export function mergeOverlappingCuts(cuts: EditCut[], totalDuration: number): EditCut[] {
  if (cuts.length === 0) return [];

  // Filter valid positive-duration cuts
  const valid = cuts.filter((c) => c.end > c.start && c.start >= 0 && c.end <= totalDuration);
  valid.sort((a, b) => a.start - b.start);
  if (valid.length === 0) return [];

  const merged: EditCut[] = [];
  let current: EditCut = { ...valid[0] };

  for (let i = 1; i < valid.length; i++) {
    const next = valid[i];
    // Only merge if strictly overlapping
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
      current.reason = `${current.reason}; ${next.reason}`;
      if (next.type !== "silence") {
        current.type = next.type;
      }
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  return merged.map((c, idx) => ({
    ...c,
    id: `cut-opt-${idx + 1}`,
    start: Math.max(0, +c.start.toFixed(2)),
    end: Math.min(totalDuration, +c.end.toFixed(2)),
  }));
}
