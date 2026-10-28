/**
 * Meta Muse — Pipeline B Verification: Cuts Validator
 * Modeled after Meta Agent Workshop's `agent/verification/verify_claims.py`.
 * Independently validates cut intervals before media processing.
 */

import type { EditPlan } from "../types.ts";

export interface CutsValidationResult {
  passed: boolean;
  needsReview: boolean;
  reviewReason?: string;
  errors: string[];
}

export function validateCuts(editPlan: EditPlan, totalDuration: number): CutsValidationResult {
  const errors: string[] = [];
  const { cuts, keepSegments, cleanDuration, cutDuration } = editPlan;

  // 1. Validate each cut is within [0, totalDuration]
  for (const cut of cuts) {
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
  // If more than 50% of the video is cut, flag for review rather than failing hard
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
  };
}
