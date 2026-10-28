/**
 * Meta Muse — Pipeline B Tool: Edit Planner
 * Creative director that designs cuts, punch-ins, kinetic typography, and visual assets.
 */

import type { EditCut, EditPlan, KeepSegment, TranscriptSegment, VisualOverlayItem } from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";

export function planTalkingHeadEdit(params: {
  transcript: TranscriptSegment[];
  silences?: { start: number; end: number; duration: number }[];
  totalDuration: number;
  templateId?: string;
  userScript?: string;
}): EditPlan {
  const { transcript, silences, totalDuration, templateId, userScript } = params;
  const template = getPipelineBTemplate(templateId);

  const allWords = transcript.flatMap((s) => s.words);
  const fullText = allWords.map((w) => w.word).join(" ");

  const rawCuts: EditCut[] = [];

  // 1. Acoustic Dead-Air Silences (from ffmpeg silencedetect)
  if (silences && silences.length > 0) {
    for (let i = 0; i < silences.length; i++) {
      const s = silences[i];
      // Keep a small 0.04s margin so words are never clipped
      const sStart = Math.min(totalDuration, +(s.start + 0.04).toFixed(2));
      const sEnd = Math.max(0, +(s.end - 0.04).toFixed(2));
      if (sEnd > sStart && (sEnd - sStart) >= 0.25) {
        rawCuts.push({
          id: `cut-silence-${i + 1}`,
          start: sStart,
          end: sEnd,
          type: "silence",
          reason: `Trim dead pause (${s.duration.toFixed(2)}s) for dynamic retention`,
        });
      }
    }
  } else {
    for (let i = 0; i < allWords.length - 1; i++) {
      const gap = allWords[i + 1].start - allWords[i].end;
      if (gap > 0.45) {
        rawCuts.push({
          id: `cut-silence-${i + 1}`,
          start: +allWords[i].end.toFixed(2),
          end: +allWords[i + 1].start.toFixed(2),
          type: "silence",
          reason: `Trim dead air (${gap.toFixed(2)}s pause) for high retention`,
        });
      }
    }
  }

  // 2. Repeated Words, Runs & Multi-Word Phrase Retakes
  let cutRepetitionsCount = 0;
  const normalizedWords = allWords.map((w) => w.word.toLowerCase().replace(/[^\w]/g, ""));

  // 2a. Detect consecutive identical word runs (e.g. "poop poop poop poop...")
  let rStart = 0;
  while (rStart < normalizedWords.length) {
    let rEnd = rStart + 1;
    while (rEnd < normalizedWords.length && normalizedWords[rEnd] === normalizedWords[rStart]) {
      rEnd++;
    }
    const runLength = rEnd - rStart;
    if (runLength >= 2 && normalizedWords[rStart].length > 0) {
      // If repeated 3+ times, cut all duplicate instances leaving only 1
      const cutFrom = runLength >= 3 ? allWords[rStart + 1].start : allWords[rStart].start;
      const cutTo = allWords[rEnd - 1].end;
      if (cutTo > cutFrom && (cutTo - cutFrom) >= 0.15) {
        rawCuts.push({
          id: `cut-run-${rStart + 1}`,
          start: Math.max(0, +(cutFrom - 0.02).toFixed(2)),
          end: Math.min(totalDuration, +(cutTo + 0.02).toFixed(2)),
          type: "retake",
          reason: `Trim repeated word run of '${allWords[rStart].word}' (${runLength}x)`,
        });
        cutRepetitionsCount += runLength - 1;
      }
      rStart = rEnd;
    } else {
      rStart++;
    }
  }

  // 2b. Detect multi-word phrase repetitions (length 2 to 5 words, e.g. "only in five clicks, only in five clicks", "it auto stench, it auto stench")
  for (let L = 5; L >= 2; L--) {
    for (let i = 0; i <= normalizedWords.length - 2 * L; i++) {
      const p1 = normalizedWords.slice(i, i + L).join(" ");
      const p2 = normalizedWords.slice(i + L, i + 2 * L).join(" ");

      if (p1.length > 3 && p1 === p2) {
        const cStart = Math.max(0, +(allWords[i].start - 0.02).toFixed(2));
        const cEnd = Math.min(totalDuration, +(allWords[i + L].start - 0.02).toFixed(2));
        if (cEnd > cStart && (cEnd - cStart) >= 0.20) {
          rawCuts.push({
            id: `cut-phrase-repeat-${i + 1}`,
            start: cStart,
            end: cEnd,
            type: "retake",
            reason: `Trim repeated phrase retake: '${allWords.slice(i, i + L).map((w) => w.word).join(" ")}'`,
          });
          cutRepetitionsCount++;
          i += 2 * L - 1; // Skip over matched block
        }
      }
    }
  }

  // 3. Filler Sounds Removal ("ah", "um", "uh", "oh", "er", "hmm", "umm", "ahh")
  const FILLER_REGEX = /^(ah+|um+|uh+|oh+|er+|hmm+|erm+|umm+|ahh+|ooh+|aah+)$/i;
  const COMMON_FILLERS = new Set(["ah", "um", "uh", "oh", "er", "hmm", "erm", "ahh", "umm", "ooh"]);
  let cutFillersCount = 0;

  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i];
    const clean = w.word.toLowerCase().replace(/[^\w]/g, "");
    if (COMMON_FILLERS.has(clean) || FILLER_REGEX.test(clean)) {
      const cStart = Math.max(0, +(w.start - 0.03).toFixed(2));
      const cEnd = Math.min(totalDuration, +(w.end + 0.03).toFixed(2));
      if (cEnd > cStart) {
        rawCuts.push({
          id: `cut-filler-${i + 1}`,
          start: cStart,
          end: cEnd,
          type: "filler",
          reason: `Trim vocal filler hesitation: '${w.word}'`,
        });
        cutFillersCount++;
      }
    }
  }

  // 4. Sentence-by-Sentence Analysis: Trim inter-sentence hesitation pauses > 0.40s
  for (let s = 0; s < transcript.length - 1; s++) {
    const segCurrent = transcript[s];
    const segNext = transcript[s + 1];
    const interSentencePause = segNext.start - segCurrent.end;

    if (interSentencePause > 0.40) {
      // Leave a tiny 0.10s natural breath, trim the rest
      const pStart = +(segCurrent.end + 0.08).toFixed(2);
      const pEnd = +(segNext.start - 0.04).toFixed(2);
      if (pEnd > pStart && (pEnd - pStart) >= 0.20) {
        rawCuts.push({
          id: `cut-sentence-pause-${s + 1}`,
          start: pStart,
          end: pEnd,
          type: "silence",
          reason: `Tighten inter-sentence gap (${interSentencePause.toFixed(2)}s) for crisp delivery`,
        });
      }
    }
  }

  // 5. Merge overlapping and contiguous cuts cleanly
  const cuts = mergeOverlappingCuts(rawCuts, totalDuration);

  // 6. Calculate keep segments from merged cuts
  const keepSegments: KeepSegment[] = [];
  let currentStart = 0;

  for (const cut of cuts) {
    if (cut.start > currentStart) {
      const dur = +(cut.start - currentStart).toFixed(2);
      if (dur >= 0.25) {
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
    if (finalDur >= 0.25) {
      keepSegments.push({
        start: +currentStart.toFixed(2),
        end: +totalDuration.toFixed(2),
        duration: finalDur,
        zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.15,
      });
    }
  }

  // If no cuts were needed, keep the entire clip
  if (keepSegments.length === 0) {
    keepSegments.push({
      start: 0,
      end: totalDuration,
      duration: totalDuration,
      zoomScale: 1.0,
    });
  }

  const cleanDuration = +keepSegments.reduce((acc, s) => acc + s.duration, 0).toFixed(2);
  const cutDuration = +(totalDuration - cleanDuration).toFixed(2);
  const cutSilenceDuration = +cuts.reduce((acc, c) => acc + (c.end - c.start), 0).toFixed(2);
  const cutSilenceSegmentsCount = cuts.length;

  // Design Hook & Title
  const hookWords = allWords.slice(0, 6).map((w) => w.word).join(" ");
  const hookLine = hookWords ? `"${hookWords}..."` : "Talking Head Master Reel";

  // Visual Enhancement Plan: Kinetic keywords, animated image stickers/b-roll, icon badges
  const visualPlan: VisualOverlayItem[] = [];

  // Always add top progress bar
  if (template.enableProgressBar) {
    visualPlan.push({
      id: "overlay-progress-bar",
      type: "progress_bar",
      timestamp: 0,
      duration: cleanDuration,
      content: "Progress Bar",
      style: { color: template.highlightColor },
    });
  }

  // Visual Image Sticker & Animation Topics (mapped to keywords in transcript)
  const visualKeywordMap: Record<string, { label: string; animation: "bounce" | "pop" | "slide_up" }> = {
    app: { label: "📱 SMART APP", animation: "bounce" },
    software: { label: "💻 PRO SOFTWARE", animation: "slide_up" },
    click: { label: "⚡ 5 CLICKS", animation: "pop" },
    clicks: { label: "⚡ 5 CLICKS", animation: "pop" },
    video: { label: "🎬 4K REEL", animation: "slide_up" },
    videos: { label: "🎬 4K REEL", animation: "slide_up" },
    edit: { label: "✂️ AUTO CUT", animation: "pop" },
    ready: { label: "🚀 READY TO POST", animation: "bounce" },
    simple: { label: "✨ ULTRA SIMPLE", animation: "pop" },
    time: { label: "⏱️ ZERO DELAY", animation: "slide_up" },
    auto: { label: "🤖 AI AUTO EDIT", animation: "bounce" },
  };

  const addedKeywords = new Set<string>();

  for (const word of allWords) {
    const clean = word.word.toLowerCase().replace(/[^\w]/g, "");
    if (visualKeywordMap[clean] && !addedKeywords.has(clean)) {
      addedKeywords.add(clean);
      const meta = visualKeywordMap[clean];
      const relTime = Math.min(cleanDuration - 1.8, Math.max(0.6, word.start * (cleanDuration / totalDuration)));
      visualPlan.push({
        id: `overlay-anim-${visualPlan.length + 1}`,
        type: "image_overlay",
        timestamp: +relTime.toFixed(2),
        duration: 2.0,
        content: meta.label,
        animation: meta.animation,
        style: {
          bg: template.cardBg,
          textColor: template.highlightColor,
          border: template.primaryColor,
        },
        soundName: template.enableSfx ? "pop.mp3" : undefined,
      });
    }
  }

  // Key phrase emphasis badges (every 3-5 seconds)
  const emphasisKeywords = allWords.filter(
    (w) => w.word.length > 5 && !["because", "without", "through", "people"].includes(w.word.toLowerCase())
  );

  emphasisKeywords.slice(0, 3).forEach((kw, idx) => {
    visualPlan.push({
      id: `overlay-badge-${idx + 1}`,
      type: "icon_badge",
      timestamp: Math.min(cleanDuration - 1.5, Math.max(0.5, kw.start * (cleanDuration / totalDuration))),
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

  return {
    title: fullText.slice(0, 40) || "AI Edited Talking-Head Reel",
    hookLine,
    cuts,
    keepSegments,
    cleanDuration,
    cutDuration,
    cutSilenceDuration,
    cutSilenceSegmentsCount,
    cutRepetitionsCount,
    cutFillersCount,
    visualPlan,
    templateId: template.id,
    notes: `Planned ${cuts.length} cuts (${cutRepetitionsCount} repetitions, ${cutFillersCount} fillers) saving ${cutSilenceDuration}s. Alternating punch-in zooms with ${template.name} visual typography.`,
  };
}

function mergeOverlappingCuts(cuts: EditCut[], totalDuration: number): EditCut[] {
  if (cuts.length === 0) return [];

  // Filter valid cuts
  const valid = cuts.filter((c) => c.end > c.start && (c.end - c.start) >= 0.12);
  valid.sort((a, b) => a.start - b.start);
  if (valid.length === 0) return [];

  const merged: EditCut[] = [];
  let current: EditCut = { ...valid[0] };

  for (let i = 1; i < valid.length; i++) {
    const next = valid[i];
    // If overlapping or separated by less than 0.08s, merge them
    if (next.start <= current.end + 0.08) {
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
