/**
 * Meta Muse — Pipeline B Tool: Transcript Aligner
 * Aligns transcribed speech against the user's ground-truth script using sequence alignment.
 * Detects word stutters ("like, like, like"), off-script filler sounds ("ah", "um"), and false starts.
 */

import type { TranscriptSegment, TranscriptWord } from "../types.ts";

const COMMON_FILLERS = new Set([
  "ah", "ahh", "aah", "aaah",
  "um", "umm", "ummm", "uhm",
  "uh", "uhh", "uhhh",
  "er", "err",
  "hmm", "hmmm",
  "erm",
  "ooh", "oh",
  "okay", "ok",
  "mhm", "huh",
  "like", "so", "yeah", "actually", "basically"
]);

export interface AlignedDeviation {
  text: string;
  start: number;
  end: number;
  type: "omission" | "addition" | "ramble";
  classification?: "redundant_repetition" | "off_script_filler" | "false_start" | "spontaneous_addition";
  reason: string;
  spokenIndex?: number;
}

export interface AlignmentResult {
  matchedWords: number;
  totalScriptWords: number;
  deviationScore: number; // 0 (perfect match) to 1.0 (completely off script)
  deviations: AlignedDeviation[];
  redundantWordIndices: number[];
  offScriptFillerIndices: number[];
  notes: string;
}

export function alignTranscriptWithScript(
  transcript: TranscriptSegment[],
  userScript?: string
): AlignmentResult {
  const allWords = transcript.flatMap((s) => s.words);

  if (!userScript || !userScript.trim()) {
    return {
      matchedWords: allWords.length,
      totalScriptWords: 0,
      deviationScore: 0,
      deviations: [],
      redundantWordIndices: [],
      offScriptFillerIndices: [],
      notes: "No user script provided. Auto-editor will transcribe and enhance spontaneous speech.",
    };
  }

  const scriptWords = userScript
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const normalizedSpoken = allWords.map((w) =>
    w.word.toLowerCase().replace(/[^\w]/g, "")
  );

  const redundantWordIndices: number[] = [];
  const offScriptFillerIndices: number[] = [];
  const deviations: AlignedDeviation[] = [];

  // Count word frequencies in script to catch duplicate stutters (e.g. user says "like" 4 times, script has 1)
  const scriptWordCounts = new Map<string, number>();
  for (const sw of scriptWords) {
    scriptWordCounts.set(sw, (scriptWordCounts.get(sw) || 0) + 1);
  }

  // Track script word usage
  const scriptWordUsage = new Map<string, number>();

  let matches = 0;
  let scriptCursor = 0;

  for (let i = 0; i < normalizedSpoken.length; i++) {
    const spoken = normalizedSpoken[i];
    const wordObj = allWords[i];
    if (!spoken) continue;

    const isFiller = COMMON_FILLERS.has(spoken);

    // Check if spoken word matches current or upcoming script word within a small lookahead window (window of 6)
    let foundInScriptAt = -1;
    for (let k = scriptCursor; k < Math.min(scriptWords.length, scriptCursor + 8); k++) {
      if (scriptWords[k] === spoken) {
        foundInScriptAt = k;
        break;
      }
    }

    if (foundInScriptAt !== -1) {
      // Word is in script! Check if it exceeds the script frequency in this passage (e.g. "like like like")
      const currentUsage = scriptWordUsage.get(spoken) || 0;
      const allowedCount = scriptWordCounts.get(spoken) || 0;

      // Check if it's an immediate duplicate repetition (stutter loop)
      const isConsecutiveDuplicate = i > 0 && normalizedSpoken[i - 1] === spoken;

      if (isConsecutiveDuplicate || currentUsage >= allowedCount) {
        // Redundant repetition of a script word!
        redundantWordIndices.push(i);
        deviations.push({
          text: wordObj.word,
          start: wordObj.start,
          end: wordObj.end,
          type: "addition",
          classification: "redundant_repetition",
          reason: `Spoken word '${wordObj.word}' is repeated ${currentUsage + 1} times, but appears only ${allowedCount} time(s) in script`,
          spokenIndex: i,
        });
      } else {
        // Legitimate script match
        matches++;
        scriptWordUsage.set(spoken, currentUsage + 1);
        scriptCursor = foundInScriptAt + 1;
      }
    } else {
      // Word is NOT in script!
      if (isFiller) {
        offScriptFillerIndices.push(i);
        deviations.push({
          text: wordObj.word,
          start: wordObj.start,
          end: wordObj.end,
          type: "addition",
          classification: "off_script_filler",
          reason: `Vocal filler sound '${wordObj.word}' is not in the script`,
          spokenIndex: i,
        });
      } else {
        // Spontaneous addition or off-script ramble
        deviations.push({
          text: wordObj.word,
          start: wordObj.start,
          end: wordObj.end,
          type: "addition",
          classification: "spontaneous_addition",
          reason: `Spoken word '${wordObj.word}' is not in the script`,
          spokenIndex: i,
        });
      }
    }
  }

  const matchedRatio = scriptWords.length > 0 ? matches / scriptWords.length : 1.0;
  const deviationScore = +(1.0 - Math.min(1.0, matchedRatio)).toFixed(2);

  const notes =
    deviations.length === 0
      ? "Perfect script match: speech strictly follows ground-truth script."
      : `Script alignment: ${matches}/${scriptWords.length} words matched (${deviations.length} deviations detected: ${redundantWordIndices.length} redundant stutters, ${offScriptFillerIndices.length} vocal fillers).`;

  return {
    matchedWords: matches,
    totalScriptWords: scriptWords.length,
    deviationScore,
    deviations,
    redundantWordIndices,
    offScriptFillerIndices,
    notes,
  };
}
