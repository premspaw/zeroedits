/**
 * Meta Muse — Pipeline B Tool: Transcript Aligner
 * Aligns transcript words against the user's optional running script.
 */

import type { TranscriptSegment } from "../types.ts";

export interface AlignmentResult {
  matchedWords: number;
  totalScriptWords: number;
  deviationScore: number; // 0 (perfect match) to 1.0 (completely off script)
  deviations: { text: string; start: number; end: number; type: "omission" | "addition" | "ramble" }[];
  notes: string;
}

export function alignTranscriptWithScript(
  transcript: TranscriptSegment[],
  userScript?: string
): AlignmentResult {
  if (!userScript || !userScript.trim()) {
    return {
      matchedWords: transcript.reduce((acc, s) => acc + s.words.length, 0),
      totalScriptWords: 0,
      deviationScore: 0,
      deviations: [],
      notes: "No user script provided. Auto-editor will transcribe and enhance spontaneous speech.",
    };
  }

  const scriptWords = userScript
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const spokenWords = transcript.flatMap((s) => s.words.map((w) => w.word.toLowerCase().replace(/[^\w]/g, "")));

  let matches = 0;
  const scriptSet = new Set(scriptWords);

  for (const word of spokenWords) {
    if (scriptSet.has(word)) {
      matches++;
    }
  }

  const matchedRatio = scriptWords.length > 0 ? matches / scriptWords.length : 1.0;
  const deviationScore = +(1.0 - Math.min(1.0, matchedRatio)).toFixed(2);

  const notes =
    deviationScore < 0.2
      ? "High script match: speech closely follows user script. Cutting false starts."
      : deviationScore < 0.5
      ? "Moderate script match: detected minor improvisations. Keeping high-energy sentences."
      : "High script deviation: speaker improvised significantly. Adapting edit plan to spoken points.";

  return {
    matchedWords: matches,
    totalScriptWords: scriptWords.length,
    deviationScore,
    deviations: [],
    notes,
  };
}
