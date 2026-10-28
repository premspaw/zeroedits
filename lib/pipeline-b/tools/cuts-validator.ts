/**
 * Meta Muse — Pipeline B Verification: Cuts Validator
 * Modeled after Meta Agent Workshop's `agent/verification/verify_claims.py`.
 * Independently validates cut intervals before media processing.
 */

import type { EditCut, EditPlan, ProtectedRange, TranscriptSegment } from "../types.ts";

export interface CutsValidationResult {
  passed: boolean;
  needsReview: boolean;
  reviewReason?: string;
  errors: string[];
  warnings?: string[];
}

export interface SemanticValidationOptions {
  totalDuration: number;
  protectedRanges?: ProtectedRange[];
  transcript?: TranscriptSegment[];
}

export interface SemanticCutsValidationResult {
  validCuts: EditCut[];
  rejectedCuts: { cut: EditCut; reason: string }[];
  adjustedCuts: { original: EditCut; adjusted: EditCut; reason: string }[];
  warnings: string[];
}

/**
 * Validates and sanitizes approved cuts against semantic rules:
 * - Reject non-finite timestamps
 * - Clamp/reject cuts falling outside source duration
 * - Reject cuts that overlap protected speech
 * - Resolve conflicting/overlapping cuts
 * - Preserve important spoken content aligned with transcript
 */
export function validateApprovedCutsSemantic(
  cuts: EditCut[],
  options: SemanticValidationOptions
): SemanticCutsValidationResult {
  const { totalDuration, protectedRanges = [], transcript = [] } = options;
  const validCuts: EditCut[] = [];
  const rejectedCuts: { cut: EditCut; reason: string }[] = [];
  const adjustedCuts: { original: EditCut; adjusted: EditCut; reason: string }[] = [];
  const warnings: string[] = [];

  const allWords = transcript.flatMap((s) => s.words);

  for (const rawCut of cuts) {
    // 1. Non-finite or invalid number check
    if (
      typeof rawCut.start !== "number" ||
      typeof rawCut.end !== "number" ||
      !Number.isFinite(rawCut.start) ||
      !Number.isFinite(rawCut.end)
    ) {
      rejectedCuts.push({
        cut: rawCut,
        reason: `Invalid or non-finite timestamp: [${rawCut.start}, ${rawCut.end}]`,
      });
      continue;
    }

    // 2. Inverted interval check
    if (rawCut.start >= rawCut.end) {
      rejectedCuts.push({
        cut: rawCut,
        reason: `Inverted or zero-duration cut interval: [${rawCut.start}, ${rawCut.end}]`,
      });
      continue;
    }

    // 3. Source duration boundary check
    if (rawCut.start >= totalDuration || rawCut.end <= 0) {
      rejectedCuts.push({
        cut: rawCut,
        reason: `Cut [${rawCut.start}, ${rawCut.end}] falls completely outside source duration (${totalDuration}s)`,
      });
      continue;
    }

    let start = Math.max(0, +rawCut.start.toFixed(2));
    let end = Math.min(totalDuration, +rawCut.end.toFixed(2));

    if (start !== rawCut.start || end !== rawCut.end) {
      adjustedCuts.push({
        original: rawCut,
        adjusted: { ...rawCut, start, end },
        reason: `Clamped cut boundaries to [0, ${totalDuration}]`,
      });
    }

    // 4. Protected speech overlap check
    let overlapsProtected = false;
    for (const pr of protectedRanges) {
      const overlapStart = Math.max(start, pr.start);
      const overlapEnd = Math.min(end, pr.end);
      if (overlapEnd - overlapStart > 0.05) {
        // Cut collides with protected speech
        if (start >= pr.start && end <= pr.end) {
          // Entire cut falls inside protected speech: reject completely!
          rejectedCuts.push({
            cut: rawCut,
            reason: `Cut falls entirely inside protected speech range [${pr.start}, ${pr.end}] (${pr.reason})`,
          });
          overlapsProtected = true;
          break;
        } else if (start < pr.start && end <= pr.end) {
          // Adjust cut end to stop before protected range
          const adjEnd = +pr.start.toFixed(2);
          if (adjEnd - start >= 0.1) {
            adjustedCuts.push({
              original: rawCut,
              adjusted: { ...rawCut, start, end: adjEnd },
              reason: `Adjusted cut end from ${end} to ${adjEnd} to avoid protected speech`,
            });
            end = adjEnd;
          } else {
            rejectedCuts.push({
              cut: rawCut,
              reason: `Residual cut duration too small after avoiding protected speech`,
            });
            overlapsProtected = true;
            break;
          }
        } else if (start >= pr.start && end > pr.end) {
          // Adjust cut start to begin after protected range
          const adjStart = +pr.end.toFixed(2);
          if (end - adjStart >= 0.1) {
            adjustedCuts.push({
              original: rawCut,
              adjusted: { ...rawCut, start: adjStart, end },
              reason: `Adjusted cut start from ${start} to ${adjStart} to avoid protected speech`,
            });
            start = adjStart;
          } else {
            rejectedCuts.push({
              cut: rawCut,
              reason: `Residual cut duration too small after avoiding protected speech`,
            });
            overlapsProtected = true;
            break;
          }
        }
      }
    }
    if (overlapsProtected) continue;

    // 5. Spoken-word boundary defense & accidental speech clipping protection
    let clipsSpeech = false;
    for (const w of allWords) {
      // If this cut is specifically intended to remove this word (stutter/filler), skip boundary defense for it
      const isTargetCutWord = rawCut.cutWord && (
        w.word.toLowerCase() === rawCut.cutWord.toLowerCase() ||
        rawCut.reason.toLowerCase().includes(w.word.toLowerCase())
      );
      if (isTargetCutWord) continue;

      // Does the cut completely engulf this non-target spoken word?
      if (start <= w.start && end >= w.end && rawCut.type === "silence") {
        rejectedCuts.push({
          cut: rawCut,
          reason: `Cut marked as silence completely deletes spoken word '${w.word}' [${w.start}s - ${w.end}s]`,
        });
        clipsSpeech = true;
        break;
      }

      // Does the cut start inside an adjacent spoken word?
      if (start > w.start && start < w.end - 0.04) {
        const adjStart = +Math.min(totalDuration, w.end + 0.02).toFixed(2);
        if (end - adjStart >= 0.1) {
          adjustedCuts.push({
            original: rawCut,
            adjusted: { ...rawCut, start: adjStart, end },
            reason: `Shifted cut start from ${start}s to ${adjStart}s to prevent clipping word '${w.word}'`,
          });
          start = adjStart;
        } else {
          rejectedCuts.push({
            cut: rawCut,
            reason: `Residual cut duration too small after protecting spoken word '${w.word}'`,
          });
          clipsSpeech = true;
          break;
        }
      }

      // Does the cut end inside an adjacent spoken word?
      if (end > w.start + 0.04 && end < w.end) {
        const adjEnd = +Math.max(0, w.start - 0.02).toFixed(2);
        if (adjEnd - start >= 0.1) {
          adjustedCuts.push({
            original: rawCut,
            adjusted: { ...rawCut, start, end: adjEnd },
            reason: `Shifted cut end from ${end}s to ${adjEnd}s to prevent clipping word '${w.word}'`,
          });
          end = adjEnd;
        } else {
          rejectedCuts.push({
            cut: rawCut,
            reason: `Residual cut duration too small after protecting spoken word '${w.word}'`,
          });
          clipsSpeech = true;
          break;
        }
      }
    }
    if (clipsSpeech) continue;

    validCuts.push({
      id: rawCut.id || `cut-valid-${validCuts.length + 1}`,
      start,
      end,
      type: rawCut.type,
      reason: rawCut.reason || "Approved AI cut",
      cutWord: rawCut.cutWord,
    });
  }

  // 6. Resolve overlapping cuts by sorting and merging
  validCuts.sort((a, b) => a.start - b.start);
  const nonOverlappingCuts: EditCut[] = [];
  for (const c of validCuts) {
    if (nonOverlappingCuts.length === 0) {
      nonOverlappingCuts.push(c);
      continue;
    }
    const prev = nonOverlappingCuts[nonOverlappingCuts.length - 1];
    if (c.start <= prev.end) {
      // Overlap detected: merge the two cuts cleanly
      prev.end = Math.max(prev.end, c.end);
      prev.reason = `${prev.reason}; merged with ${c.id}: ${c.reason}`;
    } else {
      nonOverlappingCuts.push(c);
    }
  }

  return {
    validCuts: nonOverlappingCuts,
    rejectedCuts,
    adjustedCuts,
    warnings,
  };
}

export function validateCuts(editPlan: EditPlan, totalDuration: number): CutsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { cuts, keepSegments, cleanDuration, cutDuration, protectedRanges = [] } = editPlan;

  // 1. Validate each cut is within [0, totalDuration] and finite
  for (const cut of cuts) {
    if (!Number.isFinite(cut.start) || !Number.isFinite(cut.end)) {
      errors.push(`Cut [${cut.id}] contains non-finite timestamps: [${cut.start}, ${cut.end}].`);
      continue;
    }
    if (cut.start < 0) {
      errors.push(`Cut [${cut.id}] has negative start timestamp: ${cut.start}s.`);
    }
    if (cut.end > totalDuration + 0.1) {
      errors.push(
        `Cut [${cut.id}] end timestamp (${cut.end}s) exceeds total video duration (${totalDuration}s).`
      );
    }
    if (cut.start >= cut.end) {
      errors.push(
        `Cut [${cut.id}] has inverted or zero interval: start (${cut.start}s) >= end (${cut.end}s).`
      );
    }

    // Check overlap with protected ranges
    for (const pr of protectedRanges) {
      if (Math.max(cut.start, pr.start) < Math.min(cut.end, pr.end) - 0.05) {
        errors.push(
          `Cut [${cut.id}] overlaps protected speech range [${pr.start}s - ${pr.end}s] (${pr.reason}).`
        );
      }
    }
  }

  // 2. Validate cuts do not overlap each other
  const sortedCuts = [...cuts].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sortedCuts.length - 1; i++) {
    if (sortedCuts[i].end > sortedCuts[i + 1].start) {
      errors.push(
        `Overlapping cuts detected: Cut [${sortedCuts[i].id}] (${sortedCuts[i].start}s-${sortedCuts[i].end}s) overlaps Cut [${sortedCuts[i + 1].id}] (${sortedCuts[i + 1].start}s-${sortedCuts[i + 1].end}s).`
      );
    }
  }

  // 3. Validate keep segments collectively match clean duration
  const sumKeepDuration = keepSegments.reduce((acc, s) => acc + s.duration, 0);
  if (Math.abs(sumKeepDuration - cleanDuration) > 0.5) {
    errors.push(
      `Keep segments duration (${sumKeepDuration.toFixed(2)}s) does not match cleanDuration (${cleanDuration.toFixed(2)}s).`
    );
  }

  // 4. Validate minimum dialogue preservation (at least 2.5 seconds must remain)
  if (cleanDuration < 2.5) {
    errors.push(
      `Clean duration (${cleanDuration}s) is too short to produce a coherent reel. At least 2.5s required.`
    );
  }

  // 5. Escalation / Human Review Check:
  let needsReview = false;
  let reviewReason: string | undefined;

  if (totalDuration > 0 && cutDuration / totalDuration > 0.5) {
    needsReview = true;
    reviewReason = `Over 50% of the video (${cutDuration.toFixed(1)}s of ${totalDuration.toFixed(1)}s) was cut. Please verify this matches intended pacing.`;
  }

  return {
    passed: errors.length === 0,
    needsReview,
    reviewReason,
    errors,
    warnings,
  };
}

