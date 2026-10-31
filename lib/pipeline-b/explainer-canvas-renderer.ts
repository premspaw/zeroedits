"use client";

export type ExplainerLayoutMode = "auto_reel" | "speaker_only";
export type PaletteId =
  | "auto"
  | "editorial_warm"
  | "midnight_neon"
  | "cyber_blue"
  | "emerald_growth"
  | "royal_violet";

export interface VisualPalette {
  id: Exclude<PaletteId, "auto">;
  label: string;
  swatch: string;
  isDarkCanvas: boolean;
  canvasBg: string;
  canvasGradInner: string;
  canvasGradOuter: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  accentSoftBg: string;
  highlight: string;
  calloutBg: string;
  calloutBorder: string;
  calloutText: string;
}

export const PALETTES: Record<Exclude<PaletteId, "auto">, VisualPalette> = {
  editorial_warm: {
    id: "editorial_warm",
    label: "Warm Paper",
    swatch: "#E4491B",
    isDarkCanvas: false,
    canvasBg: "radial-gradient(circle at 50% 38%, #FAF7F0 0%, #ECE6D8 100%)",
    canvasGradInner: "#FAF7F0",
    canvasGradOuter: "#ECE6D8",
    cardBg: "#FFFFFF",
    cardBorder: "#141414",
    cardShadow: "6px 6px 0px #141414",
    primaryText: "#141414",
    secondaryText: "#5A5852",
    accent: "#E4491B",
    accentSoftBg: "#FFF3ED",
    highlight: "#FFE600",
    calloutBg: "rgba(15, 16, 22, 0.90)",
    calloutBorder: "#E4491B",
    calloutText: "#FFFFFF",
  },
  midnight_neon: {
    id: "midnight_neon",
    label: "Midnight Studio",
    swatch: "#FF5520",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #161926 0%, #090B10 100%)",
    canvasGradInner: "#161926",
    canvasGradOuter: "#090B10",
    cardBg: "#121521",
    cardBorder: "#FF5520",
    cardShadow: "0 16px 40px -10px rgba(255, 85, 32, 0.35)",
    primaryText: "#FFFFFF",
    secondaryText: "#9CA3AF",
    accent: "#FF5520",
    accentSoftBg: "rgba(255, 85, 32, 0.16)",
    highlight: "#FFE600",
    calloutBg: "rgba(12, 14, 22, 0.92)",
    calloutBorder: "#FF5520",
    calloutText: "#FFFFFF",
  },
  cyber_blue: {
    id: "cyber_blue",
    label: "Cyber Blue",
    swatch: "#2563EB",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #0F1E36 0%, #070D19 100%)",
    canvasGradInner: "#0F1E36",
    canvasGradOuter: "#070D19",
    cardBg: "#111C30",
    cardBorder: "#38BDF8",
    cardShadow: "0 16px 40px -10px rgba(56, 189, 248, 0.3)",
    primaryText: "#F8FAFC",
    secondaryText: "#94A3B8",
    accent: "#38BDF8",
    accentSoftBg: "rgba(56, 189, 248, 0.16)",
    highlight: "#FACC15",
    calloutBg: "rgba(10, 18, 34, 0.92)",
    calloutBorder: "#38BDF8",
    calloutText: "#FFFFFF",
  },
  emerald_growth: {
    id: "emerald_growth",
    label: "Emerald Pulse",
    swatch: "#10B981",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #0D261F 0%, #06120E 100%)",
    canvasGradInner: "#0D261F",
    canvasGradOuter: "#06120E",
    cardBg: "#0F241D",
    cardBorder: "#10B981",
    cardShadow: "0 16px 40px -10px rgba(16, 185, 129, 0.3)",
    primaryText: "#ECFDF5",
    secondaryText: "#A7F3D0",
    accent: "#10B981",
    accentSoftBg: "rgba(16, 185, 129, 0.16)",
    highlight: "#FDE047",
    calloutBg: "rgba(8, 22, 18, 0.92)",
    calloutBorder: "#10B981",
    calloutText: "#FFFFFF",
  },
  royal_violet: {
    id: "royal_violet",
    label: "Royal Violet",
    swatch: "#8B5CF6",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #1E1338 0%, #0C071A 100%)",
    canvasGradInner: "#1E1338",
    canvasGradOuter: "#0C071A",
    cardBg: "#18102E",
    cardBorder: "#A855F7",
    cardShadow: "0 16px 40px -10px rgba(168, 85, 247, 0.35)",
    primaryText: "#FAF5FF",
    secondaryText: "#D8B4FE",
    accent: "#C084FC",
    accentSoftBg: "rgba(192, 132, 252, 0.16)",
    highlight: "#FDE047",
    calloutBg: "rgba(17, 10, 34, 0.92)",
    calloutBorder: "#A855F7",
    calloutText: "#FFFFFF",
  },
};

export type IconKey =
  | "scissors"
  | "captions"
  | "sparkles"
  | "sound"
  | "zap"
  | "clock"
  | "rocket"
  | "check";

export interface WordItem {
  word: string;
  start: number;
  end: number;
}

export interface SpokenStepBeat {
  id: string;
  label: string;
  subText: string;
  iconKey: IconKey;
  triggerTime: number;
  endTime: number;
}

export interface SpokenContrastPlan {
  headerLabel: string;
  partALabel: string;
  partAMetric: string;
  partASub: string;
  partATime: number;
  partABarPct: number;
  partBLabel: string;
  partBMetric: string;
  partBSub: string;
  partBTime: number;
  partBBarPct: number;
}

export interface FaceSpaceCallout {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  iconKey: IconKey;
  triggerTime: number;
  endTime: number;
}

export interface SceneSegment {
  id: string;
  start: number;
  end: number;
  shotType: "fullscreen_speaker" | "fullscreen_animation";
  visualKind: "contrast_comparison" | "step_stack" | "concept_spotlight";
  spokenReference: string;
  headlineText: string;
  subLabel: string;
  contrast?: SpokenContrastPlan;
  steps: SpokenStepBeat[];
  faceCallouts: FaceSpaceCallout[];
  assetUrl?: string;
  cameraZoom: number;
}

const STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "your", "have", "just",
  "like", "uh", "uhhh", "um", "umm", "okay", "so", "when", "what", "into",
  "only", "very", "really", "about", "going", "were", "they", "them", "let",
  "me", "tell", "you", "why", "are", "we", "it", "is", "in", "on", "to", "of",
  "for", "a", "an", "then", "there",
]);

export function normalizeSpokenPhrase(raw: string): string {
  return raw
    .replace(/\bsinking\s+sound/gi, "Syncing Sound")
    .replace(/\bsinking\b/gi, "Syncing")
    .replace(/\ba\s+hour\b/gi, "1 Hour")
    .replace(/\ban\s+hour\b/gi, "1 Hour")
    .replace(/\ba\s+minute\b/gi, "1 Minute")
    .replace(/\bzero\s+edits?\b/gi, "Zero Edits")
    .trim();
}

export function inferIconKey(text: string): IconKey {
  const lower = text.toLowerCase();
  if (/\b(cut|cutting|trim|trimming|silence|silences|retake|retakes|slice)\b/.test(lower)) {
    return "scissors";
  }
  if (/\b(caption|captions|subtitle|subtitles|text|words|script)\b/.test(lower)) {
    return "captions";
  }
  if (/\b(sound|audio|sfx|effects|music|voice|syncing|sinking)\b/.test(lower)) {
    return "sound";
  }
  if (/\b(animat\w+|motion|visual\w*|graphics|effects|b-roll)\b/.test(lower)) {
    return "sparkles";
  }
  if (/\b(minute|minutes|hour|hours|second|seconds|time|fast|slow|spend)\b/.test(lower)) {
    return "clock";
  }
  if (/\b(build|building|launch|create|creating|zero|future)\b/.test(lower)) {
    return "rocket";
  }
  if (/\b(change|instant|magic|auto|ai|click|clicks)\b/.test(lower)) {
    return "zap";
  }
  return "check";
}

function buildCleanHeadline(spoken: string, fallback = "KEY INSIGHT"): string {
  const normalized = normalizeSpokenPhrase(spoken);
  const tokens = normalized
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t.toLowerCase()));
  if (tokens.length === 0) return fallback.toUpperCase();
  return tokens.slice(0, 3).join(" ").toUpperCase();
}

function extractMetricFromClause(clause: string, fallbackLabel: string): {
  metric: string;
  label: string;
  barPct: number;
} {
  const norm = normalizeSpokenPhrase(clause);
  const lower = norm.toLowerCase();

  const numUnitMatch = norm.match(
    /\b(1|2|3|4|5|10|30|60|one|two|three|four|five|ten|thirty|a|an)\s+(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|clicks?|steps?|x)\b/i
  );
  if (numUnitMatch) {
    const wordToNum: Record<string, string> = {
      a: "1",
      an: "1",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      ten: "10",
      thirty: "30",
    };
    const num = wordToNum[numUnitMatch[1].toLowerCase()] || numUnitMatch[1].toUpperCase();
    const rawUnit = numUnitMatch[2].toUpperCase();
    const unit = rawUnit
      .replace(/^MINUTES?$/, "MIN")
      .replace(/^SECONDS?$/, "SEC")
      .replace(/^HOURS?$/, "HOUR");
    const isLong = /HOUR|DAY/i.test(unit) || Number(num) >= 15;
    const actionVerb =
      norm
        .replace(numUnitMatch[0], "")
        .replace(/\b(so|but|takes?|took|it|is|in|a|an|the)\b/gi, " ")
        .trim() || fallbackLabel;
    return {
      metric: `${num} ${unit}`,
      label: buildCleanHeadline(actionVerb, fallbackLabel),
      barPct: isLong ? 92 : 18,
    };
  }

  if (/\bmore\s+time\b/i.test(lower)) {
    const focus = buildCleanHeadline(
      norm.replace(/\b(creators?|spend|more|time|in)\b/gi, " "),
      "EDITING"
    );
    return {
      metric: `85% ${focus}`,
      label: "MORE TIME SPENT",
      barPct: 86,
    };
  }

  const clean = buildCleanHeadline(norm, fallbackLabel);
  return {
    metric: clean,
    label: fallbackLabel,
    barPct: 24,
  };
}

export function buildSceneDialoguePlan(
  sceneWords: WordItem[],
  spokenRef: string,
  rawHeadline: string | undefined,
  sceneStart: number,
  sceneEnd: number
): {
  visualKind: "contrast_comparison" | "step_stack" | "concept_spotlight";
  headlineText: string;
  subLabel: string;
  contrast?: SpokenContrastPlan;
  steps: SpokenStepBeat[];
  faceCallouts: FaceSpaceCallout[];
} {
  const wordsList: WordItem[] =
    sceneWords.length > 0
      ? sceneWords
      : spokenRef
          .split(/\s+/)
          .filter(Boolean)
          .map((w, i, arr) => {
            const dur = Math.max(0.5, sceneEnd - sceneStart);
            const step = dur / Math.max(1, arr.length);
            return {
              word: w,
              start: +(sceneStart + i * step).toFixed(2),
              end: +(sceneStart + (i + 1) * step).toFixed(2),
            };
          });

  const fullText = normalizeSpokenPhrase(
    wordsList.map((w) => w.word).join(" ") || spokenRef
  );

  const pivotIdx = wordsList.findIndex((w, idx) => {
    if (idx < 2 || idx >= wordsList.length - 1) return false;
    const lw = w.word.toLowerCase().replace(/[^a-z]/g, "");
    return lw === "but" || lw === "rather" || lw === "instead" || lw === "versus" || lw === "vs" || lw === "while";
  });

  const hasContrastSignal =
    pivotIdx !== -1 ||
    (/\b(minute|minutes|second|seconds)\b/i.test(fullText) &&
      /\b(hour|hours|day|days)\b/i.test(fullText)) ||
    /\bmore\s+time\b.*\b(than|creating|filming)\b/i.test(fullText);

  if (hasContrastSignal && wordsList.length >= 4) {
    const splitAt =
      pivotIdx !== -1 ? pivotIdx : Math.max(2, Math.floor(wordsList.length / 2));
    const partAWords = wordsList.slice(0, splitAt);
    const partBWords = wordsList.slice(splitAt);

    const partAText = partAWords.map((w) => w.word).join(" ");
    const partBText = partBWords
      .map((w) => w.word)
      .join(" ")
      .replace(/^(but|rather\s+than|instead\s+of|versus|vs)\s+/i, "");

    const infoA = extractMetricFromClause(partAText, "PART 1");
    const infoB = extractMetricFromClause(partBText, "PART 2");

    const partATime = partAWords[0]?.start ?? sceneStart;
    const partBTime = partBWords[0]?.start ?? +(sceneStart + (sceneEnd - sceneStart) * 0.5).toFixed(2);

    const contrastPlan: SpokenContrastPlan = {
      headerLabel:
        rawHeadline && rawHeadline.length <= 34
          ? rawHeadline.toUpperCase()
          : `${infoA.metric} VS ${infoB.metric}`,
      partALabel: infoA.label,
      partAMetric: infoA.metric,
      partASub: normalizeSpokenPhrase(partAText),
      partATime,
      partABarPct: infoA.barPct,
      partBLabel: infoB.label,
      partBMetric: infoB.metric,
      partBSub: normalizeSpokenPhrase(partBText),
      partBTime,
      partBBarPct: infoB.barPct === infoA.barPct ? 88 : infoB.barPct,
    };

    const faceCallouts: FaceSpaceCallout[] = [
      {
        id: "callout-contrast-a",
        badge: infoA.label,
        title: infoA.metric,
        subtitle: normalizeSpokenPhrase(partAText),
        iconKey: inferIconKey(partAText),
        triggerTime: partATime,
        endTime: partBTime,
      },
      {
        id: "callout-contrast-b",
        badge: infoB.label,
        title: infoB.metric,
        subtitle: normalizeSpokenPhrase(partBText),
        iconKey: inferIconKey(partBText),
        triggerTime: partBTime,
        endTime: sceneEnd,
      },
    ];

    return {
      visualKind: "contrast_comparison",
      headlineText: contrastPlan.headerLabel,
      subLabel: `${infoA.metric} → ${infoB.metric}`,
      contrast: contrastPlan,
      steps: [],
      faceCallouts,
    };
  }

  const actionAnchorRegex =
    /\b(cutting|adding|creating|syncing|sinking|trimming|removing|building|filming|editing|writing|uploading|rendering|exporting|generating|fixing)\b/i;

  const anchorIndices: number[] = [];
  wordsList.forEach((w, idx) => {
    const cleanW = w.word.replace(/[^a-zA-Z]/g, "");
    if (actionAnchorRegex.test(cleanW)) {
      if (anchorIndices.length === 0 || idx - anchorIndices[anchorIndices.length - 1] >= 2) {
        anchorIndices.push(idx);
      }
    }
  });

  if (anchorIndices.length >= 2) {
    const steps: SpokenStepBeat[] = anchorIndices.map((startIdx, i) => {
      const nextIdx =
        i < anchorIndices.length - 1 ? anchorIndices[i + 1] : wordsList.length;
      const slice = wordsList.slice(startIdx, nextIdx);
      const rawPhrase = normalizeSpokenPhrase(slice.map((w) => w.word).join(" "));
      const cleanLabel = rawPhrase
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .split(/\s+/)
        .slice(0, 3)
        .join(" ")
        .toUpperCase();
      const triggerTime = slice[0]?.start ?? sceneStart;
      const endTime = slice[slice.length - 1]?.end ?? sceneEnd;

      return {
        id: `step-${i + 1}-${triggerTime}`,
        label: cleanLabel || `STEP ${i + 1}`,
        subText: rawPhrase,
        iconKey: inferIconKey(rawPhrase),
        triggerTime,
        endTime,
      };
    });

    const faceCallouts: FaceSpaceCallout[] = steps.map((st, idx) => ({
      id: `face-step-${idx + 1}`,
      badge: `STEP 0${idx + 1} • LIVE`,
      title: st.label,
      subtitle: st.subText,
      iconKey: st.iconKey,
      triggerTime: st.triggerTime,
      endTime: idx < steps.length - 1 ? steps[idx + 1].triggerTime : sceneEnd,
    }));

    return {
      visualKind: "step_stack",
      headlineText:
        rawHeadline && rawHeadline.length <= 32
          ? rawHeadline.toUpperCase()
          : `${steps.length} WORKFLOW STEPS`,
      subLabel: "SYNCED TO SPOKEN DIALOGUE",
      steps,
      faceCallouts,
    };
  }

  const contentWords = wordsList.filter(
    (w) => w.word.replace(/[^a-zA-Z0-9]/g, "").length >= 3 && !STOP_WORDS.has(w.word.toLowerCase())
  );

  const steps: SpokenStepBeat[] = [];
  const faceCallouts: FaceSpaceCallout[] = [];

  if (wordsList.length >= 6 && contentWords.length >= 2) {
    const punchStartIdx = Math.max(1, wordsList.length - 3);
    const setupSlice = wordsList.slice(0, punchStartIdx);
    const punchSlice = wordsList.slice(punchStartIdx);

    const setupPhrase = normalizeSpokenPhrase(setupSlice.map((w) => w.word).join(" "));
    const punchPhrase = normalizeSpokenPhrase(punchSlice.map((w) => w.word).join(" "));

    const setupTitle = buildCleanHeadline(setupPhrase, "THE CONTEXT");
    const punchTitle = buildCleanHeadline(
      punchPhrase,
      rawHeadline || "KEY TAKEAWAY"
    );

    const setupTime = setupSlice[0]?.start ?? sceneStart;
    const punchTime = punchSlice[0]?.start ?? +(sceneStart + (sceneEnd - sceneStart) * 0.55).toFixed(2);

    steps.push(
      {
        id: `beat-setup-${setupTime}`,
        label: setupTitle,
        subText: setupPhrase,
        iconKey: inferIconKey(setupPhrase),
        triggerTime: setupTime,
        endTime: punchTime,
      },
      {
        id: `beat-punch-${punchTime}`,
        label: punchTitle,
        subText: punchPhrase,
        iconKey: inferIconKey(punchPhrase),
        triggerTime: punchTime,
        endTime: sceneEnd,
      }
    );

    faceCallouts.push(
      {
        id: `face-setup-${setupTime}`,
        badge: "LIVE CONTEXT",
        title: setupTitle,
        subtitle: setupPhrase,
        iconKey: inferIconKey(setupPhrase),
        triggerTime: setupTime,
        endTime: punchTime,
      },
      {
        id: `face-punch-${punchTime}`,
        badge: "KEY POINT",
        title: punchTitle,
        subtitle: fullText,
        iconKey: inferIconKey(punchPhrase),
        triggerTime: punchTime,
        endTime: sceneEnd,
      }
    );
  } else {
    const cleanTitle =
      rawHeadline && rawHeadline.split(/\s+/).length <= 5
        ? normalizeSpokenPhrase(rawHeadline).toUpperCase()
        : buildCleanHeadline(fullText, "KEY INSIGHT");
    const firstWordTime = wordsList[0]?.start ?? sceneStart;

    steps.push({
      id: `beat-single-${firstWordTime}`,
      label: cleanTitle,
      subText: fullText,
      iconKey: inferIconKey(fullText),
      triggerTime: firstWordTime,
      endTime: sceneEnd,
    });

    faceCallouts.push({
      id: `face-single-${firstWordTime}`,
      badge: "ON CAMERA FOCUS",
      title: cleanTitle,
      subtitle: fullText,
      iconKey: inferIconKey(fullText),
      triggerTime: firstWordTime,
      endTime: sceneEnd,
    });
  }

  const finalHeadline =
    rawHeadline && rawHeadline.split(/\s+/).length <= 5
      ? normalizeSpokenPhrase(rawHeadline).toUpperCase()
      : buildCleanHeadline(fullText, "KEY INSIGHT");

  return {
    visualKind: "concept_spotlight",
    headlineText: finalHeadline,
    subLabel: fullText,
    steps,
    faceCallouts,
  };
}

export function resolveActivePalette(
  paletteChoice: PaletteId,
  topic: string,
  editPlan: any
): VisualPalette {
  if (paletteChoice !== "auto") {
    return PALETTES[paletteChoice];
  }
  const combined = `${topic || ""} ${editPlan?.title || ""} ${editPlan?.notes || ""}`.toLowerCase();
  if (/\b(blue|cyber|tech|saas|ocean|sky)\b/.test(combined)) return PALETTES.cyber_blue;
  if (/\b(green|emerald|money|growth|wealth|forest)\b/.test(combined)) return PALETTES.emerald_growth;
  if (/\b(purple|violet|magic|royal|indigo|neon)\b/.test(combined)) return PALETTES.royal_violet;
  if (/\b(dark|midnight|black|obsidian|night)\b/.test(combined)) return PALETTES.midnight_neon;
  return PALETTES.editorial_warm;
}

export function extractWordsFromPlan(editPlan: any, beats: any[] = []): WordItem[] {
  if (
    editPlan?.editedTranscript &&
    Array.isArray(editPlan.editedTranscript) &&
    editPlan.editedTranscript.length > 0
  ) {
    const list: WordItem[] = [];
    for (const seg of editPlan.editedTranscript) {
      for (const w of seg.words || []) {
        list.push({
          word: w.word,
          start: typeof w.editedStart === "number" ? w.editedStart : w.start ?? 0,
          end: typeof w.editedEnd === "number" ? w.editedEnd : w.end ?? 0.2,
        });
      }
    }
    if (list.length > 0) return list;
  }

  if (editPlan?.transcript && Array.isArray(editPlan.transcript)) {
    const list: WordItem[] = [];
    for (const seg of editPlan.transcript) {
      for (const w of seg.words || []) {
        list.push({
          word: w.word,
          start: w.start ?? 0,
          end: w.end ?? 0.2,
        });
      }
    }
    if (list.length > 0) return list;
  }

  const fallbackWords: WordItem[] = [];
  let cursor = 0;
  for (const b of beats) {
    const bStart = typeof b.start === "number" ? b.start : cursor;
    const bDur = b.durNum || 2.5;
    const tokens = String(b.script || b.text || "")
      .split(/\s+/)
      .filter(Boolean);
    const wDur = tokens.length > 0 ? bDur / tokens.length : 0.3;
    tokens.forEach((tok, idx) => {
      fallbackWords.push({
        word: tok,
        start: +(bStart + idx * wDur).toFixed(2),
        end: +(bStart + (idx + 1) * wDur).toFixed(2),
      });
    });
    cursor = bStart + bDur;
  }
  return fallbackWords;
}

export function buildExplainerScenes(
  duration: number,
  editPlan: any,
  words: WordItem[],
  beats: any[] = [],
  topic = ""
): SceneSegment[] {
  const totalDur = Math.max(duration, editPlan?.cleanDuration || 10);
  const rawSegs: any[] = editPlan?.visualSegments || [];
  const resolvedAssets: Record<string, string> = editPlan?.resolvedAssets || {};

  if (rawSegs.length >= 2) {
    let lastWasAnimation = false;
    return rawSegs.map((s, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === rawSegs.length - 1 && rawSegs.length >= 3;
      
      // Ensure seamless contiguous time boundaries so there are zero frame gaps or boundary flickers
      const prevEnd = idx > 0 ? (typeof rawSegs[idx - 1].end === "number" ? rawSegs[idx - 1].end : 0) : 0;
      const sStart = idx === 0 ? 0 : Math.max(prevEnd, typeof s.start === "number" ? s.start : prevEnd);
      const nextStart = idx < rawSegs.length - 1 && typeof rawSegs[idx + 1].start === "number" ? rawSegs[idx + 1].start : totalDur;
      const sEnd = idx === rawSegs.length - 1 ? totalDur : Math.max(sStart + 0.1, typeof s.end === "number" ? Math.min(nextStart, s.end) : nextStart);

      const sceneWords = words.filter(
        (w) => w.start >= sStart - 0.12 && w.start < sEnd + 0.05
      );
      const segWordsText = sceneWords.map((w) => w.word).join(" ");
      // Prioritize the actual spoken words in this timestamp window over any hallucinated spokenReference!
      const spokenRef = segWordsText || s.spokenReference || topic;

      // Discard hallucinated headline if it shares zero words with what's actually spoken
      let headlineCandidate = s.headlineText;
      if (headlineCandidate && segWordsText) {
        const segTokens = new Set(
          segWordsText.toLowerCase().split(/\s+/).map((w: string) => w.replace(/[^a-z0-9]/g, ""))
        );
        const headTokens = headlineCandidate
          .toLowerCase()
          .split(/\s+/)
          .map((w: string) => w.replace(/[^a-z0-9]/g, ""))
          .filter((w: string) => w.length > 2);
        const hasOverlap = headTokens.some((t: string) => segTokens.has(t));
        if (!hasOverlap && headTokens.length > 0) {
          headlineCandidate = undefined;
        }
      }

      const plan = buildSceneDialoguePlan(
        sceneWords,
        spokenRef,
        headlineCandidate,
        sStart,
        sEnd
      );

      let wantAnimation = false;
      if (!isFirst && !isLast && !lastWasAnimation) {
        if (
          plan.visualKind === "contrast_comparison" ||
          plan.visualKind === "step_stack" ||
          s.layoutType === "broll_takeover" ||
          s.layoutType === "split_screen" ||
          s.layoutType === "stacked_layout" ||
          s.technique === "animated_diagram" ||
          s.technique === "ui_mockup"
        ) {
          wantAnimation = true;
        }
      }
      lastWasAnimation = wantAnimation;

      return {
        id: s.id || `scene-${idx + 1}`,
        start: sStart,
        end: sEnd,
        shotType: wantAnimation ? "fullscreen_animation" : "fullscreen_speaker",
        visualKind: plan.visualKind,
        spokenReference: spokenRef,
        headlineText: plan.headlineText,
        subLabel: plan.subLabel,
        contrast: plan.contrast,
        steps: plan.steps,
        faceCallouts: plan.faceCallouts,
        assetUrl: s.assetUrl || resolvedAssets[s.id],
        cameraZoom: idx % 2 === 0 ? 1.0 : 1.08,
      };
    });
  }

  const numScenes = Math.max(3, Math.min(6, Math.ceil(totalDur / 3.8)));
  const sliceDur = totalDur / numScenes;

  return Array.from({ length: numScenes }).map((_, idx) => {
    const sStart = +(idx * sliceDur).toFixed(2);
    const sEnd = +((idx + 1) * sliceDur).toFixed(2);
    const sceneWords = words.filter(
      (w) => w.start >= sStart - 0.1 && w.start < sEnd + 0.05
    );
    const spokenText =
      sceneWords.map((w) => w.word).join(" ") ||
      beats[idx]?.script ||
      topic ||
      `Scene ${idx + 1}`;

    const plan = buildSceneDialoguePlan(
      sceneWords,
      spokenText,
      beats[idx]?.headline || beats[idx]?.label,
      sStart,
      sEnd
    );

    const isAnimationShot = idx % 2 === 1 && idx < numScenes - 1;

    return {
      id: `auto-scene-${idx + 1}`,
      start: sStart,
      end: sEnd,
      shotType: isAnimationShot ? "fullscreen_animation" : "fullscreen_speaker",
      visualKind: plan.visualKind,
      spokenReference: spokenText,
      headlineText: plan.headlineText,
      subLabel: plan.subLabel,
      contrast: plan.contrast,
      steps: plan.steps,
      faceCallouts: plan.faceCallouts,
      cameraZoom: idx % 2 === 0 ? 1.0 : 1.08,
    };
  });
}

// ============================================================================
// DETERMINISTIC 1080×1920 2D CANVAS COMPOSITOR (100% PREVIEW & MP4 PARITY)
// ============================================================================

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(x: number): number {
  const t = clamp01(x);
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(x: number): number {
  const t = clamp01(x);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function truncateTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + "…";
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length >= maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(" ");
        lines.push(truncateTextToWidth(ctx, rest, maxWidth));
        return lines;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * Draws crisp vector Lucide-style icons directly onto the 1080×1920 2D Canvas.
 */
export function drawCanvasIcon(
  ctx: CanvasRenderingContext2D,
  iconKey: IconKey | "layers",
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size / 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.11);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (iconKey) {
    case "scissors": {
      ctx.beginPath();
      ctx.arc(-r * 0.45, -r * 0.45, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.45, r * 0.45, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.25);
      ctx.lineTo(r * 0.75, r * 0.65);
      ctx.moveTo(-r * 0.2, r * 0.25);
      ctx.lineTo(r * 0.75, -r * 0.65);
      ctx.stroke();
      break;
    }
    case "captions": {
      ctx.beginPath();
      ctx.roundRect(-r * 0.78, -r * 0.62, r * 1.56, r * 1.15, r * 0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.18);
      ctx.lineTo(r * 0.42, -r * 0.18);
      ctx.moveTo(-r * 0.42, r * 0.18);
      ctx.lineTo(r * 0.15, r * 0.18);
      ctx.stroke();
      break;
    }
    case "sparkles": {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.82);
      ctx.quadraticCurveTo(0, 0, r * 0.82, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 0.82);
      ctx.quadraticCurveTo(0, 0, -r * 0.82, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 0.82);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "sound": {
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.25);
      ctx.lineTo(-r * 0.35, -r * 0.25);
      ctx.lineTo(r * 0.1, -r * 0.65);
      ctx.lineTo(r * 0.1, r * 0.65);
      ctx.lineTo(-r * 0.35, r * 0.25);
      ctx.lineTo(-r * 0.75, r * 0.25);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.22, 0, r * 0.42, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      break;
    }
    case "clock": {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.45);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.35, r * 0.22);
      ctx.stroke();
      break;
    }
    case "rocket": {
      ctx.beginPath();
      ctx.moveTo(r * 0.65, -r * 0.65);
      ctx.quadraticCurveTo(r * 0.65, r * 0.25, -r * 0.2, r * 0.55);
      ctx.lineTo(-r * 0.55, r * 0.2);
      ctx.quadraticCurveTo(-r * 0.25, -r * 0.65, r * 0.65, -r * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.15, -r * 0.15, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "zap": {
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.8);
      ctx.lineTo(-r * 0.65, r * 0.08);
      ctx.lineTo(-r * 0.05, r * 0.08);
      ctx.lineTo(-r * 0.1, r * 0.8);
      ctx.lineTo(r * 0.65, -r * 0.08);
      ctx.lineTo(r * 0.05, -r * 0.08);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "layers": {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(r * 0.78, -r * 0.25);
      ctx.lineTo(0, r * 0.2);
      ctx.lineTo(-r * 0.78, -r * 0.25);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, r * 0.2);
      ctx.lineTo(0, r * 0.65);
      ctx.lineTo(r * 0.78, r * 0.2);
      ctx.stroke();
      break;
    }
    default: {
      // check circle
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.34, r * 0.02);
      ctx.lineTo(-r * 0.08, r * 0.28);
      ctx.lineTo(r * 0.38, -r * 0.24);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export interface RenderExplainerFrameOptions {
  scenes: SceneSegment[];
  words: WordItem[];
  duration: number;
  palette: VisualPalette;
  layoutMode: ExplainerLayoutMode;
  brollImages?: Record<string, HTMLImageElement>;
}

/**
 * Renders a single 1080×1920 frame of the Talking-Head Story Explainer onto `ctx`.
 * Used by BOTH the live interactive `<canvas>` preview AND the frame-accurate MP4 exporter
 * so that preview and download are 100% pixel-for-pixel identical.
 */
export function renderExplainerFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  currentTime: number,
  options: RenderExplainerFrameOptions
) {
  const W = 1080;
  const H = 1920;
  const { scenes, words, duration, palette, layoutMode, brollImages } = options;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // 1. Resolve Active Scene (robust contiguous boundary matching without random fallback jumps)
  let resolvedIdx = scenes.findIndex(
    (s, i) => currentTime >= s.start && (i === scenes.length - 1 ? currentTime <= s.end + 0.5 : currentTime < s.end)
  );
  if (resolvedIdx === -1) {
    for (let i = 0; i < scenes.length; i++) {
      if (currentTime >= scenes[i].start && (i === scenes.length - 1 || currentTime < scenes[i + 1].start)) {
        resolvedIdx = i;
        break;
      }
    }
  }
  if (resolvedIdx === -1) {
    resolvedIdx = currentTime < scenes[0].start ? 0 : scenes.length - 1;
  }
  const activeScene = scenes[resolvedIdx] || scenes[0];

  // 2. Resolve Active Word & 3-Word Caption Chunk
  let activeWordIndex = words.findIndex(
    (w) => currentTime >= w.start - 0.04 && currentTime <= w.end + 0.08
  );
  if (activeWordIndex === -1) {
    for (let i = 0; i < words.length; i++) {
      if (words[i].start <= currentTime) activeWordIndex = i;
      else break;
    }
  }
  const activeWord = activeWordIndex >= 0 ? words[activeWordIndex] : null;
  const chunkStart = Math.floor(Math.max(0, activeWordIndex) / 3) * 3;
  const currentChunk = words.length > 0 ? words.slice(chunkStart, chunkStart + 3) : [];

  const showFullScreenAnimation =
    layoutMode === "auto_reel" && activeScene?.shotType === "fullscreen_animation";

  // =========================================================================
  // BRANCH A: 100% FULL-SCREEN SPEAKER + FLOATING FACE-SPACE ANIMATIONS
  // =========================================================================
  if (!showFullScreenAnimation) {
    // Fill black base
    ctx.fillStyle = "#0B0C10";
    ctx.fillRect(0, 0, W, H);

    // Draw Speaker Video Frame with smooth cameraZoom
    if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      const sceneElapsed = Math.max(0, currentTime - (activeScene?.start || 0));
      const targetZoom = activeScene?.cameraZoom || 1.0;
      const prevZoom = resolvedIdx > 0 ? scenes[resolvedIdx - 1]?.cameraZoom || 1.0 : 1.0;
      const zoomProgress = easeOutCubic(sceneElapsed / 0.55);
      const liveZoom = prevZoom + (targetZoom - prevZoom) * zoomProgress;

      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      const scale = Math.max(W / vw, H / vh) * liveZoom;
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;

      ctx.drawImage(videoEl, dx, dy, dw, dh);
    }

    // Lower gradient vignette so floating face-space callouts & captions pop cleanly
    const vigGrad = ctx.createLinearGradient(0, H - 720, 0, H);
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(0.48, "rgba(0, 0, 0, 0.44)");
    vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.86)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, H - 720, W, 720);

    // Draw On-Face-Value Floating Animations (in the open space below speaker's face)
    if (activeScene) {
      const isSpeakerMultiStep =
        activeScene.visualKind === "step_stack" && activeScene.steps.length >= 2;

      if (isSpeakerMultiStep) {
        const triggeredSteps = activeScene.steps.filter(
          (st) => currentTime >= st.triggerTime - 0.08
        );
        if (triggeredSteps.length > 0) {
          const rowH = 92;
          const rowGap = 16;
          const headerH = 54;
          const pad = 28;
          const boxW = 920;
          const boxH =
            pad * 2 +
            headerH +
            triggeredSteps.length * rowH +
            Math.max(0, triggeredSteps.length - 1) * rowGap;
          const boxX = (W - boxW) / 2;
          const boxY = 1580 - boxH;

          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
          ctx.shadowBlur = 42;
          ctx.shadowOffsetY = 16;
          ctx.fillStyle = "rgba(10, 12, 18, 0.82)";
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 44);
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
          ctx.stroke();

          // Header row
          ctx.font = "800 25px 'JetBrains Mono', monospace";
          ctx.fillStyle = palette.highlight;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `⚡ ${truncateTextToWidth(ctx, activeScene.headlineText, 540)}`,
            boxX + pad + 8,
            boxY + pad + 18
          );

          ctx.font = "700 22px 'JetBrains Mono', monospace";
          ctx.fillStyle = "rgba(255, 255, 255, 0.60)";
          ctx.textAlign = "right";
          ctx.fillText("LIVE DIALOGUE SYNC", boxX + boxW - pad - 8, boxY + pad + 18);

          // Step rows
          activeScene.steps.forEach((st, idx) => {
            if (currentTime < st.triggerTime - 0.08) return;
            const visibleIdx = triggeredSteps.findIndex((t) => t.id === st.id);
            if (visibleIdx === -1) return;

            const isCurrentlySpeaking =
              currentTime >= st.triggerTime - 0.08 && currentTime <= st.endTime + 0.25;
            const dt = Math.max(0, currentTime - (st.triggerTime - 0.08));
            const popScale = 0.92 + 0.08 * easeOutBack(dt / 0.28);

            const rX = boxX + pad;
            const rY = boxY + pad + headerH + visibleIdx * (rowH + rowGap);
            const rW = boxW - pad * 2;

            ctx.save();
            ctx.translate(rX + rW / 2, rY + rowH / 2);
            ctx.scale(popScale, popScale);
            ctx.translate(-(rX + rW / 2), -(rY + rowH / 2));

            ctx.fillStyle = isCurrentlySpeaking
              ? "rgba(255, 255, 255, 0.15)"
              : "rgba(255, 255, 255, 0.07)";
            ctx.beginPath();
            ctx.roundRect(rX, rY, rW, rowH, 28);
            ctx.fill();

            ctx.lineWidth = isCurrentlySpeaking ? 3.5 : 2;
            ctx.strokeStyle = isCurrentlySpeaking
              ? palette.highlight
              : "rgba(255, 255, 255, 0.15)";
            ctx.stroke();

            // Icon badge
            const iconBoxSize = 62;
            const iconBoxX = rX + 18;
            const iconBoxY = rY + (rowH - iconBoxSize) / 2;
            ctx.fillStyle = palette.accent;
            ctx.beginPath();
            ctx.roundRect(iconBoxX, iconBoxY, iconBoxSize, iconBoxSize, 18);
            ctx.fill();

            drawCanvasIcon(
              ctx,
              st.iconKey,
              iconBoxX + iconBoxSize / 2,
              iconBoxY + iconBoxSize / 2,
              34,
              "#FFFFFF"
            );

            // Step label
            ctx.font = "800 34px 'Plus Jakarta Sans', 'Inter', sans-serif";
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(
              truncateTextToWidth(ctx, st.label, rW - 280),
              iconBoxX + iconBoxSize + 22,
              rY + rowH / 2 + 2
            );

            // Right status badge
            const badgeText = isCurrentlySpeaking ? "SPEAKING" : `0${idx + 1} ✓`;
            ctx.font = "700 24px 'JetBrains Mono', monospace";
            const bw = ctx.measureText(badgeText).width + 32;
            const bh = 46;
            const bx = rX + rW - bw - 18;
            const by = rY + (rowH - bh) / 2;

            ctx.fillStyle = isCurrentlySpeaking
              ? palette.highlight
              : "rgba(255, 255, 255, 0.14)";
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 14);
            ctx.fill();

            ctx.fillStyle = isCurrentlySpeaking ? "#111111" : "#FFFFFF";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(badgeText, bx + bw / 2, by + bh / 2 + 1);

            ctx.restore();
          });

          ctx.restore();
        }
      } else if (activeScene.faceCallouts && activeScene.faceCallouts.length > 0) {
        let activeFaceCallout: FaceSpaceCallout | null = null;
        for (const c of activeScene.faceCallouts) {
          if (currentTime >= c.triggerTime - 0.08) {
            activeFaceCallout = c;
          }
        }
        if (!activeFaceCallout) activeFaceCallout = activeScene.faceCallouts[0];

        if (activeFaceCallout) {
          const dt = Math.max(0, currentTime - (activeFaceCallout.triggerTime - 0.08));
          const popScale = 0.88 + 0.12 * easeOutBack(dt / 0.3);
          const popAlpha = clamp01(dt / 0.18);

          const cardW = 880;
          const cardH = 166;
          const cardX = (W - cardW) / 2;
          const cardY = 1405;

          ctx.save();
          ctx.globalAlpha = popAlpha;
          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.scale(popScale, popScale);
          ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

          // Glowing shadow + card fill
          ctx.shadowColor = palette.accent;
          ctx.shadowBlur = 32;
          ctx.shadowOffsetY = 8;
          ctx.fillStyle = palette.calloutBg;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 44);
          ctx.fill();

          // Clip inside card for shimmer sweep
          ctx.save();
          ctx.clip();
          const shimmerProg = (currentTime % 2.6) / 2.6;
          const sx = cardX - 240 + shimmerProg * (cardW + 480);
          const shimGrad = ctx.createLinearGradient(sx, cardY, sx + 180, cardY + cardH);
          shimGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          shimGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.14)");
          shimGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = shimGrad;
          ctx.fillRect(sx, cardY, 180, cardH);
          ctx.restore();

          // Border
          ctx.shadowColor = "transparent";
          ctx.lineWidth = 5;
          ctx.strokeStyle = palette.calloutBorder;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 44);
          ctx.stroke();

          // Left Icon Box
          const iconBox = 110;
          const iconX = cardX + 28;
          const iconY = cardY + (cardH - iconBox) / 2;
          const pulse = 1 + 0.05 * Math.sin(currentTime * 4.5);

          ctx.save();
          ctx.translate(iconX + iconBox / 2, iconY + iconBox / 2);
          ctx.scale(pulse, pulse);
          ctx.translate(-(iconX + iconBox / 2), -(iconY + iconBox / 2));
          ctx.fillStyle = palette.accent;
          ctx.beginPath();
          ctx.roundRect(iconX, iconY, iconBox, iconBox, 30);
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.stroke();

          drawCanvasIcon(
            ctx,
            activeFaceCallout.iconKey,
            iconX + iconBox / 2,
            iconY + iconBox / 2,
            52,
            "#FFFFFF"
          );
          ctx.restore();

          // Badge dot + label
          const textX = iconX + iconBox + 30;
          ctx.fillStyle = palette.highlight;
          ctx.beginPath();
          ctx.arc(textX + 8, cardY + 52, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = "700 25px 'JetBrains Mono', monospace";
          ctx.fillStyle = palette.highlight;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(
            truncateTextToWidth(ctx, activeFaceCallout.badge.toUpperCase(), cardW - 220),
            textX + 28,
            cardY + 52
          );

          // Main Title
          ctx.font = "700 54px 'Instrument Serif', Georgia, serif";
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(
            truncateTextToWidth(ctx, activeFaceCallout.title, cardW - 205),
            textX,
            cardY + 114
          );

          ctx.restore();
        }
      }
    }
  } else if (activeScene) {
    // =========================================================================
    // BRANCH B: 100% FULL-SCREEN STORY-DRIVEN ANIMATION CUTAWAY
    // =========================================================================
    const bgGrad = ctx.createRadialGradient(
      W * 0.5,
      H * 0.36,
      60,
      W * 0.5,
      H * 0.5,
      H * 0.72
    );
    bgGrad.addColorStop(0, palette.canvasGradInner);
    bgGrad.addColorStop(1, palette.canvasGradOuter);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Optional Generated B-Roll Image Backdrop with subtle Ken Burns zoom
    const brollImg = activeScene.assetUrl ? brollImages?.[activeScene.id] : undefined;
    if (brollImg && brollImg.complete && brollImg.naturalWidth > 0) {
      const sceneDur = Math.max(1, activeScene.end - activeScene.start);
      const prog = clamp01((currentTime - activeScene.start) / sceneDur);
      const kbZoom = 1.02 + 0.08 * prog;
      const iw = brollImg.naturalWidth;
      const ih = brollImg.naturalHeight;
      const scale = Math.max(W / iw, H / ih) * kbZoom;
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.save();
      ctx.globalAlpha = palette.isDarkCanvas ? 0.28 : 0.18;
      ctx.drawImage(brollImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
    }

    // Editorial Grid Overlay
    ctx.save();
    ctx.strokeStyle = palette.isDarkCanvas
      ? "rgba(255, 255, 255, 0.045)"
      : "rgba(20, 20, 20, 0.04)";
    ctx.lineWidth = 2;
    const gridStep = 96;
    for (let x = 0; x < W; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // Ambient Floating Glow Orb
    const orbScale = 1 + 0.12 * Math.sin(currentTime * 2.2);
    const orbR = 360 * orbScale;
    const orbGrad = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, orbR);
    orbGrad.addColorStop(0, palette.accent + "44");
    orbGrad.addColorStop(1, palette.accent + "00");
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.45, orbR, 0, Math.PI * 2);
    ctx.fill();

    // Scene entrance animation
    const sceneDt = Math.max(0, currentTime - activeScene.start);
    const cardEnterScale = 0.95 + 0.05 * easeOutBack(sceneDt / 0.28);

    // -----------------------------------------------------------------------
    // ARCHETYPE A: WORD-SYNCED CONTRAST COMPARISON
    // -----------------------------------------------------------------------
    if (activeScene.visualKind === "contrast_comparison" && activeScene.contrast) {
      const c = activeScene.contrast;
      const cardW = 910;
      const cardH = 820;
      const cardX = (W - cardW) / 2;
      const cardY = (H - cardH) / 2 - 90;

      ctx.save();
      ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
      ctx.scale(cardEnterScale, cardEnterScale);
      ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

      // Card Shadow
      if (!palette.isDarkCanvas) {
        ctx.fillStyle = "#141414";
        ctx.beginPath();
        ctx.roundRect(cardX + 16, cardY + 16, cardW, cardH, 68);
        ctx.fill();
      } else {
        ctx.shadowColor = palette.accent + "66";
        ctx.shadowBlur = 54;
        ctx.shadowOffsetY = 20;
      }

      // Main Card Body
      ctx.fillStyle = palette.cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 68);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 6;
      ctx.strokeStyle = palette.cardBorder;
      ctx.stroke();

      // Header Row
      const pad = 54;
      ctx.font = "800 28px 'JetBrains Mono', monospace";
      ctx.fillStyle = palette.accent;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `⚡ ${truncateTextToWidth(ctx, c.headerLabel, cardW - 180)}`,
        cardX + pad,
        cardY + 72
      );

      drawCanvasIcon(ctx, "clock", cardX + cardW - pad - 18, cardY + 72, 38, palette.accent);

      // Divider
      ctx.strokeStyle = palette.isDarkCanvas
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(20, 20, 20, 0.12)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cardX + pad, cardY + 118);
      ctx.lineTo(cardX + cardW - pad, cardY + 118);
      ctx.stroke();

      // PART A BOX
      const boxW = cardW - pad * 2;
      const boxAH = 285;
      const boxAX = cardX + pad;
      const boxAY = cardY + 154;

      ctx.fillStyle = palette.isDarkCanvas ? "rgba(255, 255, 255, 0.05)" : "#F7F5EF";
      ctx.beginPath();
      ctx.roundRect(boxAX, boxAY, boxW, boxAH, 42);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = palette.isDarkCanvas ? "rgba(255, 255, 255, 0.14)" : "#D5D2C8";
      ctx.stroke();

      ctx.font = "700 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = palette.secondaryText;
      ctx.textAlign = "left";
      ctx.fillText(c.partALabel, boxAX + 40, boxAY + 52);

      // FAST pill
      const fastW = 116;
      const fastH = 44;
      const fastX = boxAX + boxW - fastW - 36;
      const fastY = boxAY + 30;
      ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
      ctx.beginPath();
      ctx.roundRect(fastX, fastY, fastW, fastH, 22);
      ctx.fill();
      ctx.font = "800 24px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#10B981";
      ctx.textAlign = "center";
      ctx.fillText("FAST", fastX + fastW / 2, fastY + fastH / 2 + 1);

      // Part A Metric
      ctx.font = "700 88px 'Instrument Serif', Georgia, serif";
      ctx.fillStyle = palette.primaryText;
      ctx.textAlign = "left";
      ctx.fillText(c.partAMetric, boxAX + 40, boxAY + 148);

      // Part A Progress Bar
      const barW = boxW - 80;
      const barH = 24;
      const barX = boxAX + 40;
      const barAY = boxAY + 220;
      ctx.fillStyle = palette.isDarkCanvas ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
      ctx.beginPath();
      ctx.roundRect(barX, barAY, barW, barH, 12);
      ctx.fill();

      const partAProg = easeOutCubic(Math.max(0, currentTime - activeScene.start) / 0.55);
      const fillAW = Math.max(24, barW * (c.partABarPct / 100) * partAProg);
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(barX, barAY, fillAW, barH, 12);
      ctx.fill();

      // PART B BOX (Slams in at exact `partBTime`)
      const isPartBActive = currentTime >= c.partBTime - 0.12;
      const partBDt = Math.max(0, currentTime - (c.partBTime - 0.12));
      const partBScale = isPartBActive ? 0.94 + 0.06 * easeOutBack(partBDt / 0.3) : 0.94;
      const partBAlpha = isPartBActive ? 1 : 0.38;

      const boxBH = 305;
      const boxBX = cardX + pad;
      const boxBY = boxAY + boxAH + 36;

      ctx.save();
      ctx.globalAlpha = partBAlpha;
      ctx.translate(boxBX + boxW / 2, boxBY + boxBH / 2);
      ctx.scale(partBScale, partBScale);
      ctx.translate(-(boxBX + boxW / 2), -(boxBY + boxBH / 2));

      ctx.fillStyle = isPartBActive
        ? palette.accentSoftBg
        : palette.isDarkCanvas
        ? "rgba(255, 255, 255, 0.03)"
        : "#FAF8F3";
      ctx.beginPath();
      ctx.roundRect(boxBX, boxBY, boxW, boxBH, 42);
      ctx.fill();

      if (isPartBActive) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = palette.accent;
        ctx.stroke();
      }

      ctx.font = "700 26px 'JetBrains Mono', monospace";
      ctx.fillStyle = palette.accent;
      ctx.textAlign = "left";
      ctx.fillText(c.partBLabel, boxBX + 40, boxBY + 52);

      // Bottleneck pill
      const pillText = isPartBActive ? "BOTTLENECK ⚡" : "WAITING...";
      ctx.font = "800 23px 'JetBrains Mono', monospace";
      const pillW = ctx.measureText(pillText).width + 44;
      const pillH = 44;
      const pillX = boxBX + boxW - pillW - 36;
      const pillY = boxBY + 30;
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 22);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2 + 1);

      // Part B Metric
      ctx.font = "700 102px 'Instrument Serif', Georgia, serif";
      ctx.fillStyle = palette.accent;
      ctx.textAlign = "left";
      ctx.fillText(c.partBMetric, boxBX + 40, boxBY + 158);

      // Part B Progress Bar
      const barBY = boxBY + 236;
      const barBH = 28;
      ctx.fillStyle = palette.isDarkCanvas ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
      ctx.beginPath();
      ctx.roundRect(barX, barBY, barW, barBH, 14);
      ctx.fill();

      const partBProg = isPartBActive ? easeOutCubic(partBDt / 0.65) : 0.08;
      const targetBPct = isPartBActive ? c.partBBarPct / 100 : 0.08;
      const fillBW = Math.max(28, barW * targetBPct * (isPartBActive ? partBProg : 1));
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.roundRect(barX, barBY, fillBW, barBH, 14);
      ctx.fill();

      ctx.restore();
      ctx.restore();
    } else if (activeScene.visualKind === "step_stack" && activeScene.steps.length > 0) {
      // -----------------------------------------------------------------------
      // ARCHETYPE B: WORD-SYNCED MULTI-BEAT ACTION LIST
      // -----------------------------------------------------------------------
      const pad = 52;
      const rowH = 148;
      const rowGap = 24;
      const headerH = 114;
      const cardW = 910;
      const cardH =
        pad +
        headerH +
        activeScene.steps.length * rowH +
        Math.max(0, activeScene.steps.length - 1) * rowGap +
        pad;
      const cardX = (W - cardW) / 2;
      const cardY = (H - cardH) / 2 - 80;

      ctx.save();
      ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
      ctx.scale(cardEnterScale, cardEnterScale);
      ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

      if (!palette.isDarkCanvas) {
        ctx.fillStyle = "#141414";
        ctx.beginPath();
        ctx.roundRect(cardX + 16, cardY + 16, cardW, cardH, 68);
        ctx.fill();
      } else {
        ctx.shadowColor = palette.accent + "66";
        ctx.shadowBlur = 54;
        ctx.shadowOffsetY = 20;
      }

      ctx.fillStyle = palette.cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 68);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 6;
      ctx.strokeStyle = palette.cardBorder;
      ctx.stroke();

      // Header
      ctx.font = "800 28px 'JetBrains Mono', monospace";
      ctx.fillStyle = palette.accent;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        truncateTextToWidth(ctx, activeScene.headlineText, cardW - 180),
        cardX + pad,
        cardY + 70
      );

      drawCanvasIcon(ctx, "layers", cardX + cardW - pad - 18, cardY + 70, 38, palette.accent);

      ctx.strokeStyle = palette.isDarkCanvas
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(20, 20, 20, 0.12)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cardX + pad, cardY + 116);
      ctx.lineTo(cardX + cardW - pad, cardY + 116);
      ctx.stroke();

      // Steps
      activeScene.steps.forEach((st, idx) => {
        const hasSpoken = currentTime >= st.triggerTime - 0.1;
        const isSpeakingNow =
          currentTime >= st.triggerTime - 0.1 && currentTime <= st.endTime + 0.25;
        const rW = cardW - pad * 2;
        const rX = cardX + pad;
        const rY = cardY + pad + headerH + idx * (rowH + rowGap);

        ctx.save();
        ctx.globalAlpha = hasSpoken ? 1 : 0.38;
        if (isSpeakingNow) {
          ctx.translate(rX + rW / 2, rY + rowH / 2);
          ctx.scale(1.025, 1.025);
          ctx.translate(-(rX + rW / 2), -(rY + rowH / 2));
        }

        ctx.fillStyle = hasSpoken
          ? palette.accentSoftBg
          : palette.isDarkCanvas
          ? "rgba(255, 255, 255, 0.04)"
          : "#F7F5EF";
        ctx.beginPath();
        ctx.roundRect(rX, rY, rW, rowH, 36);
        ctx.fill();

        if (hasSpoken) {
          ctx.lineWidth = isSpeakingNow ? 5 : 4;
          ctx.strokeStyle = isSpeakingNow ? palette.accent : palette.cardBorder;
          ctx.stroke();
        }

        // Icon box
        const ib = 84;
        const ix = rX + 30;
        const iy = rY + (rowH - ib) / 2;
        ctx.fillStyle = hasSpoken ? palette.accent : "#9CA3AF";
        ctx.beginPath();
        ctx.roundRect(ix, iy, ib, ib, 24);
        ctx.fill();

        drawCanvasIcon(ctx, st.iconKey, ix + ib / 2, iy + ib / 2, 42, "#FFFFFF");

        // Label + Subtext
        const tx = ix + ib + 28;
        ctx.font = "800 38px 'Plus Jakarta Sans', 'Inter', sans-serif";
        ctx.fillStyle = palette.primaryText;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(truncateTextToWidth(ctx, st.label, rW - 240), tx, rY + 56);

        ctx.font = "500 26px 'JetBrains Mono', monospace";
        ctx.fillStyle = palette.secondaryText;
        ctx.fillText(truncateTextToWidth(ctx, st.subText, rW - 240), tx, rY + 102);

        if (hasSpoken) {
          drawCanvasIcon(ctx, "check", rX + rW - 48, rY + rowH / 2, 46, palette.accent);
        }

        ctx.restore();
      });

      ctx.restore();
    } else {
      // -----------------------------------------------------------------------
      // ARCHETYPE C: STORY CONCEPT SPOTLIGHT CARD
      // -----------------------------------------------------------------------
      const cardW = 910;
      const stepCount = activeScene.steps.length;
      const cardH = 520 + stepCount * 96;
      const cardX = (W - cardW) / 2;
      const cardY = (H - cardH) / 2 - 80;

      ctx.save();
      ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
      ctx.scale(cardEnterScale, cardEnterScale);
      ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

      if (!palette.isDarkCanvas) {
        ctx.fillStyle = "#141414";
        ctx.beginPath();
        ctx.roundRect(cardX + 16, cardY + 16, cardW, cardH, 68);
        ctx.fill();
      } else {
        ctx.shadowColor = palette.accent + "66";
        ctx.shadowBlur = 54;
        ctx.shadowOffsetY = 20;
      }

      ctx.fillStyle = palette.cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 68);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 6;
      ctx.strokeStyle = palette.cardBorder;
      ctx.stroke();

      // Top Icon Box
      const ib = 132;
      const ix = W / 2 - ib / 2;
      const iy = cardY + 68;
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.roundRect(ix, iy, ib, ib, 38);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = palette.cardBorder;
      ctx.stroke();

      drawCanvasIcon(
        ctx,
        inferIconKey(activeScene.spokenReference),
        W / 2,
        iy + ib / 2,
        66,
        "#FFFFFF"
      );

      // Headline Text
      ctx.font = "700 84px 'Instrument Serif', Georgia, serif";
      ctx.fillStyle = palette.primaryText;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = wrapCanvasText(ctx, activeScene.headlineText, cardW - 120, 2);
      const lineStartY = lines.length === 1 ? iy + ib + 98 : iy + ib + 72;
      lines.forEach((line, idx) => {
        ctx.fillText(line, W / 2, lineStartY + idx * 84);
      });

      // Progressive Spoken Beat Pills
      const pillsStartY = cardY + 420;
      activeScene.steps.forEach((st, idx) => {
        const isReached = currentTime >= st.triggerTime - 0.1;
        const pW = cardW - 120;
        const pH = 78;
        const pX = (W - pW) / 2;
        const pY = pillsStartY + idx * 94;

        ctx.save();
        ctx.globalAlpha = isReached ? 1 : 0.34;
        ctx.fillStyle = isReached ? palette.accentSoftBg : "transparent";
        ctx.beginPath();
        ctx.roundRect(pX, pY, pW, pH, 28);
        ctx.fill();

        ctx.lineWidth = 3.5;
        ctx.strokeStyle = isReached ? palette.accent : "rgba(128, 128, 128, 0.35)";
        ctx.stroke();

        ctx.font = "800 28px 'JetBrains Mono', monospace";
        const pillColor = isReached ? palette.accent : palette.secondaryText;
        ctx.fillStyle = pillColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const cleanLbl = truncateTextToWidth(ctx, st.label, pW - 120);
        const textW = ctx.measureText(cleanLbl).width;
        drawCanvasIcon(
          ctx,
          st.iconKey,
          W / 2 - textW / 2 - 26,
          pY + pH / 2,
          32,
          pillColor
        );
        ctx.fillText(cleanLbl, W / 2 + 16, pY + pH / 2 + 1);
        ctx.restore();
      });

      ctx.restore();
    }

    // Bottom gradient so the continuous lower-third captions stay crisp
    const cutGrad = ctx.createLinearGradient(0, H - 400, 0, H);
    cutGrad.addColorStop(0, "rgba(15, 15, 20, 0)");
    cutGrad.addColorStop(1, "rgba(15, 15, 20, 0.58)");
    ctx.fillStyle = cutGrad;
    ctx.fillRect(0, H - 400, W, 400);
  }

  // =========================================================================
  // LAYER 4: CONTINUOUS UNINTERRUPTED LOWER-THIRD CAPTIONS (3-WORD CHUNK)
  // =========================================================================
  if (currentChunk.length > 0) {
    ctx.save();
    ctx.font = "900 42px 'Plus Jakarta Sans', 'Montserrat', 'Inter', sans-serif";
    ctx.textBaseline = "middle";

    const wordGap = 18;
    const wordPadX = 20;
    const wordPadY = 14;
    const pillPadX = 38;
    const pillH = 98;
    const pillY = 1625;

    const measured = currentChunk.map((w) => {
      const upper = w.word.toUpperCase();
      const tw = ctx.measureText(upper).width;
      const isCurrent =
        activeWord !== null &&
        Math.abs(w.start - activeWord.start) < 0.02 &&
        w.word === activeWord.word;
      return {
        upper,
        tw,
        boxW: tw + wordPadX * 2,
        isCurrent,
      };
    });

    const totalWordsW =
      measured.reduce((acc, m) => acc + m.boxW, 0) +
      Math.max(0, measured.length - 1) * wordGap;
    const pillW = Math.min(980, totalWordsW + pillPadX * 2);
    const pillX = (W - pillW) / 2;

    // Dark outer pill
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "rgba(10, 11, 16, 0.86)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 44);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.stroke();

    // Draw each word inside the pill
    let cursorX = (W - totalWordsW) / 2;
    const centerY = pillY + pillH / 2;

    measured.forEach((m) => {
      if (m.isCurrent) {
        const wBoxH = 66;
        const wBoxY = centerY - wBoxH / 2;
        ctx.save();
        ctx.shadowColor = palette.highlight + "80";
        ctx.shadowBlur = 18;
        ctx.fillStyle = palette.highlight;
        ctx.beginPath();
        ctx.roundRect(cursorX, wBoxY, m.boxW, wBoxH, 22);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#111111";
        ctx.textAlign = "center";
        ctx.fillText(m.upper, cursorX + m.boxW / 2, centerY + 2);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
        ctx.textAlign = "center";
        ctx.fillText(m.upper, cursorX + m.boxW / 2, centerY + 2);
      }
      cursorX += m.boxW + wordGap;
    });

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Preloads B-roll images referenced by `scenes` so the 2D canvas compositor can draw them synchronously.
 */
export async function preloadExplainerBrollImages(
  scenes: SceneSegment[]
): Promise<Record<string, HTMLImageElement>> {
  const map: Record<string, HTMLImageElement> = {};
  if (typeof window === "undefined") return map;

  await Promise.all(
    scenes.map(
      (s) =>
        new Promise<void>((resolve) => {
          if (!s.assetUrl) {
            resolve();
            return;
          }
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            map[s.id] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = s.assetUrl;
        })
    )
  );
  return map;
}

/**
 * Forces the browser to preload and rasterize all Google Fonts needed by the canvas compositor,
 * guaranteeing identical text dimensions, kerning, and pill metrics between preview and export.
 */
export async function ensureExplainerFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !(document as any).fonts) return;
  const fontSpecs = [
    "900 42px 'Plus Jakarta Sans'",
    "800 38px 'Plus Jakarta Sans'",
    "700 25px 'Plus Jakarta Sans'",
    "900 42px 'Montserrat'",
    "700 25px 'JetBrains Mono'",
    "800 28px 'JetBrains Mono'",
    "700 54px 'Instrument Serif'",
  ];
  try {
    await Promise.all(
      fontSpecs.map((spec) => (document as any).fonts.load(spec).catch(() => null))
    );
    await (document as any).fonts.ready;
  } catch (err) {
    console.warn("[Fonts] Explainer font preloader warning:", err);
  }
}

/**
 * Deterministically seeks an attached video element to targetTime and resolves only after
 * the GPU/browser decoder presents the decoded video frame.
 */
async function seekVideoAndWait(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const safeTime = Math.max(0, Math.min((video.duration || targetTime) - 0.02, targetTime));
  if (Math.abs(video.currentTime - safeTime) < 0.002 && video.readyState >= 2) {
    return;
  }

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        video.removeEventListener("seeked", handleSeeked);
        resolve();
      }
    };
    const handleSeeked = () => {
      setTimeout(finish, 20);
    };
    const timer = window.setTimeout(finish, 500);
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.currentTime = safeTime;
  });
}

/**
 * Deterministically exports the exact 1080×1920 Story Explainer frames across the video timeline
 * at fixed timestamps t = f / fps, guaranteeing identical visuals between live preview and exported MP4.
 */
export async function exportExactExplainerMp4(params: {
  cleanVideoUrl: string;
  runId?: string;
  scenes: SceneSegment[];
  words: WordItem[];
  duration: number;
  palette: VisualPalette;
  layoutMode: ExplainerLayoutMode;
  brollImages?: Record<string, HTMLImageElement>;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const {
    cleanVideoUrl,
    runId,
    scenes,
    words,
    duration,
    palette,
    layoutMode,
    onProgress,
  } = params;

  onProgress?.(2);
  const brollImages =
    params.brollImages || (await preloadExplainerBrollImages(scenes));

  await ensureExplainerFontsLoaded();

  // 1080×1920 compositing canvas
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not initialize 1080×1920 2D canvas context.");
  }

  // Dedicated decoder video element (must be attached to the DOM so the browser hardware decodes frames)
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";
  video.style.position = "fixed";
  video.style.top = "-9999px";
  video.style.left = "-9999px";
  video.style.width = "480px";
  video.style.height = "854px";
  video.style.opacity = "0.01";
  video.style.pointerEvents = "none";
  if (typeof document !== "undefined" && document.body) {
    document.body.appendChild(video);
  }
  video.src = cleanVideoUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("Failed to load source video for deterministic export."));
      };
      const cleanup = () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onErr);
      };
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("error", onErr);
      video.load();
    });

    const totalDur =
      video.duration && Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : duration;

    const fps = 30;
    const totalFrames = Math.max(1, Math.round(totalDur * fps));

    // Check if WebCodecs VideoEncoder with Annex-B is supported
    let encoder: any = null;
    const chunks: Uint8Array[] = [];
    let hasWebCodecs = false;

    if (typeof window !== "undefined" && typeof (window as any).VideoEncoder === "function") {
      try {
        const VideoEncoderClass = (window as any).VideoEncoder;
        const isSupported = await VideoEncoderClass.isConfigSupported({
          codec: "avc1.640028",
          width: 1080,
          height: 1920,
          bitrate: 10_000_000,
          framerate: fps,
          avc: { format: "annexb" },
        }).then((res: any) => res.supported).catch(() => false);

        if (isSupported) {
          encoder = new VideoEncoderClass({
            output: (chunk: any) => {
              const buf = new Uint8Array(chunk.byteLength);
              chunk.copyTo(buf);
              chunks.push(buf);
            },
            error: (err: any) => {
              console.warn("[WebCodecs] Encoding error:", err);
            },
          });
          encoder.configure({
            codec: "avc1.640028",
            width: 1080,
            height: 1920,
            bitrate: 10_000_000,
            framerate: fps,
            avc: { format: "annexb" },
          });
          hasWebCodecs = true;
        }
      } catch (wcInitErr) {
        console.warn("[WebCodecs] Could not configure VideoEncoder, using batch frame export:", wcInitErr);
        hasWebCodecs = false;
        encoder = null;
      }
    }

    const formData = !hasWebCodecs ? new FormData() : null;

    // Deterministic frame-by-frame seek and render loop
    for (let f = 0; f < totalFrames; f++) {
      const t = Math.min(totalDur - 0.033, +(f / fps).toFixed(4));
      await seekVideoAndWait(video, t);

      renderExplainerFrameToCanvas(ctx, video, t, {
        scenes,
        words,
        duration: totalDur,
        palette,
        layoutMode,
        brollImages,
      });

      if (hasWebCodecs && encoder && encoder.state === "configured") {
        const VideoFrameClass = (window as any).VideoFrame;
        const vFrame = new VideoFrameClass(canvas, {
          timestamp: Math.round((f * 1_000_000) / fps),
          duration: Math.round(1_000_000 / fps),
        });
        encoder.encode(vFrame, { keyFrame: f % (fps * 2) === 0 });
        vFrame.close();
      } else if (formData) {
        const frameBlob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), "image/jpeg", 0.90)
        );
        if (frameBlob) {
          formData.append(`frame_${f}`, frameBlob, `frame_${f}.jpg`);
        }
      }

      onProgress?.(Math.min(88, 4 + Math.round((f / totalFrames) * 82)));
    }

    if (hasWebCodecs && encoder) {
      await encoder.flush();
      encoder.close();
    }

    onProgress?.(90);

    const qs = new URLSearchParams();
    if (runId) qs.set("runId", runId);
    if (cleanVideoUrl) qs.set("cleanVideoUrl", cleanVideoUrl);

    let remuxResp: Response;

    if (hasWebCodecs && chunks.length > 0) {
      const totalByteLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
      const combined = new Uint8Array(totalByteLen);
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.byteLength;
      }

      remuxResp = await fetch(`/api/remux-mp4?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: combined.buffer,
      });
    } else if (formData) {
      remuxResp = await fetch(`/api/remux-mp4?${qs.toString()}`, {
        method: "POST",
        body: formData,
      });
    } else {
      throw new Error("No rendered video frames were generated during export.");
    }

    if (!remuxResp.ok) {
      const errJson = await remuxResp.json().catch(() => ({}));
      throw new Error(errJson.error || `MP4 remux failed (HTTP ${remuxResp.status}).`);
    }

    const mp4ArrayBuffer = await remuxResp.arrayBuffer();
    if (!mp4ArrayBuffer || mp4ArrayBuffer.byteLength < 1000) {
      throw new Error("Muxed MP4 buffer was empty or corrupted.");
    }

    onProgress?.(100);
    return new Blob([mp4ArrayBuffer], { type: "video/mp4" });
  } finally {
    try {
      if (video.parentElement) video.parentElement.removeChild(video);
    } catch {}
  }
}

