/**
 * Meta Muse — Pipeline B Tool: Edit Planner
 * Creative director that designs cuts, punch-ins, kinetic typography, and visual assets.
 */

import type { EditCut, EditPlan, KeepSegment, TranscriptSegment, VisualOverlayItem } from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";

export function planTalkingHeadEdit(params: {
  transcript: TranscriptSegment[];
  totalDuration: number;
  templateId?: string;
  userScript?: string;
}): EditPlan {
  const { transcript, totalDuration, templateId, userScript } = params;
  const template = getPipelineBTemplate(templateId);

  const allWords = transcript.flatMap((s) => s.words);
  const fullText = allWords.map((w) => w.word).join(" ");

  // Identify dead-air silence cuts (> 0.5s gaps between words)
  const cuts: EditCut[] = [];
  for (let i = 0; i < allWords.length - 1; i++) {
    const gap = allWords[i + 1].start - allWords[i].end;
    if (gap > 0.45) {
      cuts.push({
        id: `cut-silence-${i + 1}`,
        start: +allWords[i].end.toFixed(2),
        end: +allWords[i + 1].start.toFixed(2),
        type: "silence",
        reason: `Trim dead air (${gap.toFixed(2)}s pause) for high retention`,
      });
    }
  }

  // Calculate keep segments
  const keepSegments: KeepSegment[] = [];
  let currentStart = 0;

  for (const cut of cuts) {
    if (cut.start > currentStart) {
      const dur = +(cut.start - currentStart).toFixed(2);
      if (dur > 0.2) {
        keepSegments.push({
          start: currentStart,
          end: cut.start,
          duration: dur,
          zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.14, // Punch-in camera zoom alternation
        });
      }
    }
    currentStart = cut.end;
  }

  if (currentStart < totalDuration) {
    const finalDur = +(totalDuration - currentStart).toFixed(2);
    if (finalDur > 0.2) {
      keepSegments.push({
        start: currentStart,
        end: totalDuration,
        duration: finalDur,
        zoomScale: keepSegments.length % 2 === 0 ? 1.0 : 1.14,
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

  // Design Hook & Title
  const hookWords = allWords.slice(0, 6).map((w) => w.word).join(" ");
  const hookLine = hookWords ? `"${hookWords}..."` : "Talking Head Master Reel";

  // Visual Enhancement Plan: Kinetic keywords, icon callouts, progress bar
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

  // Key phrase emphasis badges (every 3-5 seconds)
  const emphasisKeywords = allWords.filter(
    (w) => w.word.length > 5 && !["because", "without", "through", "people"].includes(w.word.toLowerCase())
  );

  emphasisKeywords.slice(0, 5).forEach((kw, idx) => {
    visualPlan.push({
      id: `overlay-badge-${idx + 1}`,
      type: "icon_badge",
      timestamp: Math.min(cleanDuration - 1.5, Math.max(0.5, kw.start * (cleanDuration / totalDuration))),
      duration: 1.8,
      content: kw.word.toUpperCase(),
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
    visualPlan,
    templateId: template.id,
    notes: `Planned ${cuts.length} cuts saving ${cutDuration}s. Alternating punch-in zooms with ${template.name} visual typography.`,
  };
}
