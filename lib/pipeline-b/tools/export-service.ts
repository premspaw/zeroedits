/**
 * Meta Muse — Pipeline B Tool: Export Service
 * Deterministically renders final composite MP4 (clean footage + word-synced story cutaways +
 * lower-face floating callouts + continuous lower-third kinetic subtitles).
 */

import { execFile } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import type { EditPlan, KeepSegment, TranscriptSegment } from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";

const execFileAsync = util.promisify(execFile);

interface ExportWord {
  word: string;
  start: number;
  end: number;
}

const STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "your", "have", "just",
  "like", "uh", "uhhh", "um", "umm", "okay", "so", "when", "what", "into",
  "only", "very", "really", "about", "going", "were", "they", "them", "let",
  "me", "tell", "you", "why", "are", "we", "it", "is", "in", "on", "to", "of",
  "for", "a", "an", "then", "there",
]);

function normalizeAssText(raw: string): string {
  return raw
    .replace(/[%{}]/g, "")
    .replace(/\bsinking\s+sound/gi, "Syncing Sound")
    .replace(/\bsinking\b/gi, "Syncing")
    .replace(/\ba\s+hour\b/gi, "1 Hour")
    .replace(/\ban\s+hour\b/gi, "1 Hour")
    .replace(/\ba\s+minute\b/gi, "1 Minute")
    .replace(/\bzero\s+edits?\b/gi, "Zero Edits")
    .trim();
}

function cleanShortTitle(raw: string, fallback = "KEY INSIGHT"): string {
  const norm = normalizeAssText(raw);
  const tokens = norm
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t.toLowerCase()));
  if (tokens.length === 0) return fallback.toUpperCase();
  return tokens.slice(0, 3).join(" ").toUpperCase();
}

function extractClauseMetric(clause: string, fallback: string): {
  metric: string;
  label: string;
} {
  const norm = normalizeAssText(clause);
  const numUnitMatch = norm.match(
    /\b(1|2|3|4|5|10|30|60|one|two|three|four|five|ten|thirty|a|an)\s+(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|clicks?|steps?|x)\b/i
  );
  if (numUnitMatch) {
    const map: Record<string, string> = {
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
    const num = map[numUnitMatch[1].toLowerCase()] || numUnitMatch[1].toUpperCase();
    const unit = numUnitMatch[2]
      .toUpperCase()
      .replace(/^MINUTES?$/, "MIN")
      .replace(/^SECONDS?$/, "SEC")
      .replace(/^HOURS?$/, "HOUR");
    const rest = norm
      .replace(numUnitMatch[0], "")
      .replace(/\b(so|but|takes?|took|it|is|in|a|an|the)\b/gi, " ")
      .trim();
    return {
      metric: `${num} ${unit}`,
      label: cleanShortTitle(rest || fallback, fallback),
    };
  }
  if (/\bmore\s+time\b/i.test(norm)) {
    const focus = cleanShortTitle(
      norm.replace(/\b(creators?|spend|more|time|in)\b/gi, " "),
      "EDITING"
    );
    return {
      metric: `85% ${focus}`,
      label: "MORE TIME SPENT",
    };
  }
  return {
    metric: cleanShortTitle(norm, fallback),
    label: fallback,
  };
}

export async function exportFinalVideo(params: {
  cleanVideoPath: string;
  editPlan: EditPlan;
  transcript: TranscriptSegment[];
  outputPath: string;
  templateId?: string;
}): Promise<string> {
  const { cleanVideoPath, editPlan, transcript, outputPath, templateId } = params;
  const _template = getPipelineBTemplate(templateId);

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const transcriptToUse =
    editPlan.editedTranscript && editPlan.editedTranscript.length > 0
      ? editPlan.editedTranscript
      : transcript;

  // 1. Create standard SRT subtitle file for backward compatibility
  const srtPath = path.join(outputDir, "subtitles.srt");
  const srtLines: string[] = [];
  let entryIndex = 1;
  for (const segment of transcriptToUse) {
    const sTime = formatSrtTimestamp(segment.start);
    const eTime = formatSrtTimestamp(segment.end);
    srtLines.push(`${entryIndex}`);
    srtLines.push(`${sTime} --> ${eTime}`);
    srtLines.push(segment.text.toUpperCase());
    srtLines.push("");
    entryIndex++;
  }
  fs.writeFileSync(srtPath, srtLines.join("\n"), "utf-8");

  // Extract individual words mapped to the edited timeline
  const wordsToRender: ExportWord[] = [];
  for (const seg of transcriptToUse) {
    if (seg.words && seg.words.length > 0) {
      for (const w of seg.words) {
        const wAny = w as any;
        wordsToRender.push({
          word: w.word,
          start: wAny.editedStart ?? wAny.start ?? wAny.sourceStart ?? 0,
          end: wAny.editedEnd ?? wAny.end ?? wAny.sourceEnd ?? 0,
        });
      }
    } else {
      const splitWords = seg.text.split(/\s+/).filter(Boolean);
      const segDur = Math.max(0.2, seg.end - seg.start);
      const wordDur = segDur / Math.max(1, splitWords.length);
      splitWords.forEach((word, idx) => {
        wordsToRender.push({
          word,
          start: +(seg.start + idx * wordDur).toFixed(2),
          end: +(seg.start + (idx + 1) * wordDur).toFixed(2),
        });
      });
    }
  }

  // 2. Create Pro Reel Editor SubStation Alpha (.ass):
  //    - Layer 0 & 1: Word-Synced Full-Screen Story Cutaways (contrast bars & step stacks)
  //    - Layer 1: On-Face-Value Floating Callout Cards (in open space below speaker's face, y=1390)
  //    - Layer 2: Continuous, uninterrupted lower-third word-by-word captions (y=1700)
  const assPath = path.join(outputDir, "subtitles.ass");
  const assLines: string[] = [
    "[Script Info]",
    "Title: Meta Muse Dialogue-Synced Story Explainer",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.601",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: CutawayBg,Montserrat,20,&H00E8F1F5,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1",
    "Style: CutawayCard,Montserrat,20,&H00FFFFFF,&H000000FF,&H00141414,&H22000000,0,0,0,0,100,100,0,0,1,4,8,7,0,0,0,1",
    "Style: CutawayHeader,Montserrat,28,&H001B49E4,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,3,0,1,0,0,5,60,60,0,1",
    "Style: CutawayTitle,Montserrat,68,&H00141414,&H000000FF,&H00141414,&H00000000,1,0,0,0,100,100,1,0,1,0,0,5,60,60,0,1",
    "Style: CutawayAccent,Montserrat,72,&H001B49E4,&H000000FF,&H00141414,&H00000000,1,0,0,0,100,100,1,0,1,0,0,5,60,60,0,1",
    "Style: CutawaySub,Montserrat,30,&H004A4842,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,0,0,5,60,60,0,1",
    "Style: FaceCalloutBg,Montserrat,20,&H1816100F,&H000000FF,&H001B49E4,&H55000000,0,0,0,0,100,100,0,0,1,3,6,7,0,0,0,1",
    "Style: FaceCalloutBadge,Montserrat,24,&H0000E6FF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,3,0,1,0,0,5,60,60,0,1",
    "Style: FaceCalloutTitle,Montserrat,44,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,1,0,1,2,0,5,60,60,0,1",
    "Style: PopMain,Montserrat,54,&H00FFFFFF,&H000000FF,&H00000000,&HAA000000,1,0,0,0,100,100,0,0,1,3.5,1.5,2,50,50,220,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const rawVisualSegs = editPlan.visualSegments || [];
  let prevWasCutaway: boolean = false;

  for (let idx = 0; idx < rawVisualSegs.length; idx++) {
    const seg = rawVisualSegs[idx];
    const sSec = Math.max(0, seg.start);
    const eSec = Math.min(editPlan.cleanDuration, seg.end);
    if (eSec - sSec < 0.6) continue;

    const segWords = wordsToRender.filter(
      (w) => w.start >= sSec - 0.12 && w.start < eSec + 0.05
    );
    const spokenText = normalizeAssText(
      segWords.map((w) => w.word).join(" ") || seg.spokenReference || ""
    );

    const isFirst = idx === 0;
    const isLast = idx === rawVisualSegs.length - 1 && rawVisualSegs.length >= 3;

    // Detect whether this segment contains a contrast ("minute ... hour", "editing ... creating")
    const pivotIdx = segWords.findIndex((w, wIdx) => {
      if (wIdx < 2 || wIdx >= segWords.length - 1) return false;
      const lw = w.word.toLowerCase().replace(/[^a-z]/g, "");
      return lw === "but" || lw === "rather" || lw === "instead" || lw === "versus" || lw === "vs";
    });
    const hasContrast =
      pivotIdx !== -1 ||
      (/\b(minute|minutes|second|seconds)\b/i.test(spokenText) &&
        /\b(hour|hours|day|days)\b/i.test(spokenText));

    // Detect whether this segment contains multiple action verbs ("cutting ... adding ... creating")
    const actionRegex =
      /\b(cutting|adding|creating|syncing|sinking|trimming|removing|building|filming|editing)\b/i;
    const actionIndices: number[] = [];
    segWords.forEach((w, wIdx) => {
      if (actionRegex.test(w.word)) {
        if (actionIndices.length === 0 || wIdx - actionIndices[actionIndices.length - 1] >= 2) {
          actionIndices.push(wIdx);
        }
      }
    });

    const isCutawayCandidate: boolean =
      !isFirst &&
      !isLast &&
      !prevWasCutaway &&
      (hasContrast ||
        actionIndices.length >= 2 ||
        seg.layoutType === "broll_takeover" ||
        seg.layoutType === "split_screen" ||
        seg.layoutType === "stacked_layout" ||
        seg.technique === "animated_diagram" ||
        seg.technique === "ui_mockup");

    prevWasCutaway = isCutawayCandidate;

    const sTime = formatAssTimestamp(sSec);
    const eTime = formatAssTimestamp(eSec);

    if (isCutawayCandidate) {
      // =====================================================================
      // FULL-SCREEN STORY ANIMATION CUTAWAY (Synced to exact spoken words!)
      // =====================================================================
      assLines.push(
        `Dialogue: 0,${sTime},${eTime},CutawayBg,,0,0,0,,{\\an7\\pos(0,0)\\fad(150,150)\\1c&HE8F1F5&\\bord0\\shad0\\p1}m 0 0 l 1080 0 1080 1920 0 1920{\\p0}`
      );

      if (hasContrast && segWords.length >= 4) {
        const splitAt = pivotIdx !== -1 ? pivotIdx : Math.floor(segWords.length / 2);
        const partAWords = segWords.slice(0, splitAt);
        const partBWords = segWords.slice(splitAt);
        const partAText = partAWords.map((w) => w.word).join(" ");
        const partBText = partBWords
          .map((w) => w.word)
          .join(" ")
          .replace(/^(but|rather\s+than|instead\s+of|versus|vs)\s+/i, "");

        const infoA = extractClauseMetric(partAText, "STEP 1");
        const infoB = extractClauseMetric(partBText, "STEP 2");
        const partBStartSec = Math.max(sSec + 0.3, partBWords[0]?.start ?? (sSec + eSec) / 2);
        const partBTime = formatAssTimestamp(partBStartSec);

        // Card A (appears at start of cutaway when speaker says first clause)
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawayCard,,0,0,0,,{\\an7\\pos(110,470)\\fad(150,150)\\1c&HFFFFFF&\\3c&H141414&\\bord4\\shad8\\p1}m 0 0 l 860 0 860 330 0 330{\\p0}`
        );
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawaySub,,0,0,0,,{\\an5\\pos(540,555)\\fad(150,150)}${infoA.label}`
        );
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawayTitle,,0,0,0,,{\\an5\\pos(540,665)\\fad(150,150)\\fscx90\\fscy90\\t(0,200,\\fscx100\\fscy100)}${infoA.metric}`
        );

        // Card B (slams in at exact `partBTime` when speaker says "But editing takes an hour" / "rather than creating"!)
        assLines.push(
          `Dialogue: 1,${partBTime},${eTime},CutawayCard,,0,0,0,,{\\an7\\pos(110,850)\\fad(120,150)\\1c&HEDFAFF&\\3c&H1B49E4&\\bord5\\shad8\\p1}m 0 0 l 860 0 860 360 0 360{\\p0}`
        );
        assLines.push(
          `Dialogue: 1,${partBTime},${eTime},CutawayHeader,,0,0,0,,{\\an5\\pos(540,940)\\fad(120,150)}VS ${infoB.label}`
        );
        assLines.push(
          `Dialogue: 1,${partBTime},${eTime},CutawayAccent,,0,0,0,,{\\an5\\pos(540,1060)\\fad(120,150)\\fscx85\\fscy85\\t(0,220,\\fscx105\\fscy105)}${infoB.metric}`
        );
      } else if (actionIndices.length >= 2) {
        // Multi-Step Stack where each row pops in at the exact timestamp the speaker says it
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawayCard,,0,0,0,,{\\an7\\pos(100,450)\\fad(150,150)\\1c&HFFFFFF&\\3c&H141414&\\bord4\\shad8\\p1}m 0 0 l 880 0 880 760 0 760{\\p0}`
        );
        const header = cleanShortTitle(seg.headlineText || spokenText, "WORKFLOW STEPS");
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawayHeader,,0,0,0,,{\\an5\\pos(540,535)\\fad(150,150)}${header}`
        );

        const maxSteps = Math.min(4, actionIndices.length);
        for (let sIdx = 0; sIdx < maxSteps; sIdx++) {
          const wStartIdx = actionIndices[sIdx];
          const wEndIdx =
            sIdx < actionIndices.length - 1 ? actionIndices[sIdx + 1] : segWords.length;
          const phrase = normalizeAssText(
            segWords
              .slice(wStartIdx, wEndIdx)
              .map((w) => w.word)
              .join(" ")
          );
          const stepTitle = `0${sIdx + 1}. ${cleanShortTitle(phrase, `STEP ${sIdx + 1}`)}`;
          const stepTriggerSec = Math.max(sSec, segWords[wStartIdx]?.start ?? sSec);
          const stepStartAss = formatAssTimestamp(stepTriggerSec);
          const yPos = 650 + sIdx * 135;

          assLines.push(
            `Dialogue: 1,${stepStartAss},${eTime},CutawayTitle,,0,0,0,,{\\an5\\pos(540,${yPos})\\fad(120,150)\\fs48\\fscx88\\fscy88\\t(0,180,\\fscx100\\fscy100)}${stepTitle}`
          );
        }
      } else {
        // Single Clean Concept Card
        const heroTitle = cleanShortTitle(seg.headlineText || spokenText, "KEY INSIGHT");
        const subTitle = cleanShortTitle(spokenText, "STORY FOCUS");
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawayCard,,0,0,0,,{\\an7\\pos(110,620)\\fad(150,150)\\1c&HFFFFFF&\\3c&H141414&\\bord4\\shad8\\p1}m 0 0 l 860 0 860 500 0 500{\\p0}`
        );
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawayAccent,,0,0,0,,{\\an5\\pos(540,825)\\fad(150,150)\\fscx90\\fscy90\\t(0,220,\\fscx100\\fscy100)}${heroTitle}`
        );
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},CutawaySub,,0,0,0,,{\\an5\\pos(540,945)\\fad(150,150)}${subTitle}`
        );
      }
    } else {
      // =====================================================================
      // ON-FACE-VALUE FLOATING CALLOUT (Below speaker's chest, y=1320..1480)
      // Synced to the key phrase timestamp while speaker is talking on camera!
      // =====================================================================
      if (actionIndices.length >= 2) {
        // Show each spoken task popping into the floating card below the speaker's face!
        for (let sIdx = 0; sIdx < actionIndices.length; sIdx++) {
          const wStartIdx = actionIndices[sIdx];
          const wEndIdx =
            sIdx < actionIndices.length - 1 ? actionIndices[sIdx + 1] : segWords.length;
          const phrase = normalizeAssText(
            segWords
              .slice(wStartIdx, wEndIdx)
              .map((w) => w.word)
              .join(" ")
          );
          const chipTitle = cleanShortTitle(phrase, `STEP ${sIdx + 1}`);
          const chipStartSec = Math.max(sSec, segWords[wStartIdx]?.start ?? sSec);
          const chipEndSec =
            sIdx < actionIndices.length - 1
              ? Math.min(eSec, segWords[actionIndices[sIdx + 1]]?.start ?? eSec)
              : eSec;
          if (chipEndSec - chipStartSec < 0.25) continue;

          const cStart = formatAssTimestamp(chipStartSec);
          const cEnd = formatAssTimestamp(chipEndSec);

          assLines.push(
            `Dialogue: 1,${cStart},${cEnd},FaceCalloutBg,,0,0,0,,{\\an7\\pos(140,1330)\\fad(100,100)\\1c&H161210&\\3c&H1B49E4&\\bord3\\shad6\\p1}m 0 0 l 800 0 800 155 0 155{\\p0}`
          );
          assLines.push(
            `Dialogue: 1,${cStart},${cEnd},FaceCalloutBadge,,0,0,0,,{\\an5\\pos(540,1372)\\fad(100,100)}STEP 0${sIdx + 1} • ON CAMERA`
          );
          assLines.push(
            `Dialogue: 1,${cStart},${cEnd},FaceCalloutTitle,,0,0,0,,{\\an5\\pos(540,1432)\\fad(100,100)\\fscx88\\fscy88\\t(0,160,\\fscx100\\fscy100)}${chipTitle}`
          );
        }
      } else {
        // Trigger floating lower-face callout on the punchline words of the speaker's sentence
        const punchIdx = segWords.length >= 5 ? Math.max(1, segWords.length - 3) : 0;
        const triggerSec = Math.max(sSec, segWords[punchIdx]?.start ?? sSec);
        const punchWords = segWords
          .slice(punchIdx)
          .map((w) => w.word)
          .join(" ");
        const calloutTitle = cleanShortTitle(
          punchWords || seg.headlineText || spokenText,
          "KEY POINT"
        );
        const calloutBadge = cleanShortTitle(
          seg.headlineText || spokenText,
          "LIVE INSIGHT"
        );

        if (eSec - triggerSec >= 0.4) {
          const cStart = formatAssTimestamp(triggerSec);
          assLines.push(
            `Dialogue: 1,${cStart},${eTime},FaceCalloutBg,,0,0,0,,{\\an7\\pos(140,1330)\\fad(120,120)\\1c&H161210&\\3c&H1B49E4&\\bord3\\shad6\\p1}m 0 0 l 800 0 800 155 0 155{\\p0}`
          );
          assLines.push(
            `Dialogue: 1,${cStart},${eTime},FaceCalloutBadge,,0,0,0,,{\\an5\\pos(540,1372)\\fad(120,120)}${calloutBadge}`
          );
          assLines.push(
            `Dialogue: 1,${cStart},${eTime},FaceCalloutTitle,,0,0,0,,{\\an5\\pos(540,1432)\\fad(120,120)\\fscx88\\fscy88\\t(0,180,\\fscx100\\fscy100)}${calloutTitle}`
          );
        }
      }
    }
  }

  // Group words into clean 3-word phrase chunks for effortless reading
  const chunks: { words: typeof wordsToRender; start: number; end: number }[] = [];
  let currentChunkWords: typeof wordsToRender = [];

  for (let i = 0; i < wordsToRender.length; i++) {
    const curW = wordsToRender[i];
    const prevW = currentChunkWords[currentChunkWords.length - 1];

    const isLongPause = prevW && curW.start - prevW.end >= 0.45;
    const isChunkFull = currentChunkWords.length >= 3;

    if (currentChunkWords.length > 0 && (isLongPause || isChunkFull)) {
      chunks.push({
        words: currentChunkWords,
        start: currentChunkWords[0].start,
        end: currentChunkWords[currentChunkWords.length - 1].end,
      });
      currentChunkWords = [];
    }
    currentChunkWords.push(curW);
  }
  if (currentChunkWords.length > 0) {
    chunks.push({
      words: currentChunkWords,
      start: currentChunkWords[0].start,
      end: currentChunkWords[currentChunkWords.length - 1].end,
    });
  }

  // Layer 2: Continuous, Uninterrupted Lower-Third Captions across Speaker & Animation Cutaways
  for (const chunk of chunks) {
    for (let k = 0; k < chunk.words.length; k++) {
      const activeW = chunk.words[k];
      const nextW = k < chunk.words.length - 1 ? chunk.words[k + 1] : null;

      const sTime = formatAssTimestamp(activeW.start);
      const rawETime = nextW ? nextW.start : Math.max(activeW.start + 0.14, activeW.end);
      const eTime = formatAssTimestamp(rawETime);

      const formattedWords = chunk.words.map((w, j) => {
        const safeWord = w.word.replace(/[%{}]/g, "").toUpperCase();
        if (j === k) {
          // Clean active word highlight (#FFE600 in BGR is &H0000E6FF&)
          return `{\\b1\\fscx112\\fscy112\\c&H0000E6FF&\\3c&H00000000&\\bord3.5\\shad1.5}${safeWord}`;
        } else {
          return `{\\b1\\fscx100\\fscy100\\c&H00FFFFFF&\\3c&H00000000&\\bord2.5\\shad0.8}${safeWord}`;
        }
      });

      const lineText = formattedWords.join(" ");
      assLines.push(`Dialogue: 2,${sTime},${eTime},PopMain,,0,0,0,,${lineText}`);
    }
  }

  fs.writeFileSync(assPath, assLines.join("\n"), "utf-8");

  try {
    const fontsDir = path
      .resolve(process.cwd(), "public/fonts")
      .replace(/\\/g, "/")
      .replace(/:/g, "\\:");
    const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    const filters: string[] = [`ass='${escapedAssPath}':fontsdir='${fontsDir}'`];

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i",
        cleanVideoPath,
        "-vf",
        filters.join(","),
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-level",
        "4.1",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-threads",
        "4",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { maxBuffer: 20 * 1024 * 1024 }
    );

    return outputPath;
  } catch (err) {
    console.error("FFmpeg final video export error:", err);
    throw new Error(`Failed to export final reel with burned subtitles: ${(err as Error).message}`);
  }
}

function formatAssTimestamp(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const csecs = Math.floor((safeSec % 1) * 100);
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(csecs)}`;
}

export function mapRawTimeToCleanTime(rawTime: number, keepSegments: KeepSegment[]): number | null {
  if (!keepSegments || keepSegments.length === 0) return rawTime;
  let cleanTime = 0;
  for (const seg of keepSegments) {
    if (rawTime >= seg.start && rawTime <= seg.end) {
      return cleanTime + (rawTime - seg.start);
    }
    if (rawTime < seg.start) {
      return cleanTime;
    }
    cleanTime += seg.duration;
  }
  return cleanTime;
}

function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}
