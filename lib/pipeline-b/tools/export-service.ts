/**
 * Meta Muse — Pipeline B Tool: Export Service
 * Deterministically renders final composite MP4 (clean footage + kinetic subtitles + visual badges).
 */

import { execFile } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import type { EditPlan, KeepSegment, TranscriptSegment } from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";

const execFileAsync = util.promisify(execFile);

export async function exportFinalVideo(params: {
  cleanVideoPath: string;
  editPlan: EditPlan;
  transcript: TranscriptSegment[];
  outputPath: string;
  templateId?: string;
}): Promise<string> {
  const { cleanVideoPath, editPlan, transcript, outputPath, templateId } = params;
  const template = getPipelineBTemplate(templateId);

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

  // 2. Create High-Retention Advanced SubStation Alpha (.ass) Subtitles (Hormozi / MrBeast pop typography)
  const assPath = path.join(outputDir, "subtitles.ass");
  const assLines: string[] = [
    "[Script Info]",
    "Title: Meta Muse Kinetic Pop Subtitles",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.601",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: PopMain,Montserrat,62,&H0000E6FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4.5,2.0,2,40,40,240,1",
    "Style: PopContext,Montserrat,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,1.5,2,40,40,240,1",
    "Style: HookBadge,Montserrat,38,&H0000E6FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4.0,2.0,8,40,40,100,1",
    "Style: SceneBadge,Montserrat,42,&H00FFF000,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4.0,2.0,8,40,40,200,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  // Top Hook Badge (0.0s to 3.5s)
  const badgeText = (editPlan.hookLine || "KEY INSIGHT").replace(/[%{}]/g, "").slice(0, 32).toUpperCase();
  assLines.push(
    `Dialogue: 1,0:00:00.00,0:00:03.50,HookBadge,,0,0,0,,{\\an8\\b1\\fscx106\\fscy106\\c&H0000E6FF&\\3c&H00000000&\\bord4.5\\shad2.5}[ 🔥 ${badgeText} 🔥 ]`
  );

  // Authoritative Visual Scenes & Animation Callouts
  for (const seg of editPlan.visualSegments || []) {
    if (seg.headlineText) {
      const segText = seg.headlineText.replace(/[%{}]/g, "").toUpperCase();
      const sTime = formatAssTimestamp(Math.max(0, seg.start));
      const eTime = formatAssTimestamp(Math.min(editPlan.cleanDuration, seg.end));
      if (seg.end > seg.start) {
        assLines.push(
          `Dialogue: 1,${sTime},${eTime},SceneBadge,,0,0,0,,{\\an8\\b1\\fscx108\\fscy108\\c&H00FFF000&\\3c&H00000000&\\bord4.5\\shad2.5}★ ${segText} ★`
        );
      }
    }
  }

  // Extract individual words for frame-accurate kinetic highlighting & emoji bursts
  const wordsToRender: { word: string; start: number; end: number }[] = [];
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
      const wordDur = segDur / splitWords.length;
      splitWords.forEach((word, idx) => {
        wordsToRender.push({
          word,
          start: +(seg.start + idx * wordDur).toFixed(2),
          end: +(seg.start + (idx + 1) * wordDur).toFixed(2),
        });
      });
    }
  }

  const EMOJI_KEYWORD_MAP: Record<string, string> = {
    fire: "🔥 ", insane: "🔥 ", crazy: "🔥 ", epic: "🔥 ", hot: "🔥 ", cool: "🔥 ",
    fast: "⚡ ", speed: "⚡ ", quick: "⚡ ", instant: "⚡ ", now: "⚡ ", click: "⚡ ",
    growth: "🚀 ", scale: "🚀 ", rocket: "🚀 ", launch: "🚀 ", boost: "🚀 ", double: "🚀 ",
    idea: "💡 ", smart: "💡 ", trick: "💡 ", secret: "💡 ", tip: "💡 ", insight: "💡 ",
    target: "🎯 ", goal: "🎯 ", result: "🎯 ", exact: "🎯 ", metric: "🎯 ",
    money: "💰 ", cash: "💰 ", revenue: "💰 ", dollar: "💰 ", profit: "💰 ", price: "💰 ",
    look: "👀 ", see: "👀 ", watch: "👀 ", check: "👀 ", notice: "👀 ",
    ai: "🧠 ", model: "🧠 ", code: "🧠 ", pipeline: "🧠 ", data: "🧠 ",
    stop: "❌ ", cut: "❌ ", wrong: "❌ ", bad: "❌ ", mistake: "❌ ", dead: "❌ ",
    clean: "✅ ", perfect: "✅ ", done: "✅ ", easy: "✅ ", approved: "✅ ", yes: "✅ ",
  };

  for (let i = 0; i < wordsToRender.length; i++) {
    const w = wordsToRender[i];
    const cleanToken = w.word.toLowerCase().replace(/[^a-z]/g, "");
    const emojiPrefix = EMOJI_KEYWORD_MAP[cleanToken] || "";

    // Vibrant ASS color: yellow for general, green for stats/positive, cyan for tech, red for alerts
    let wordColor = "&H0000E6FF&"; // Yellow (&HAABBGGRR)
    if (/^(clean|perfect|done|easy|yes|growth|boost|profit|retention)$/i.test(cleanToken)) {
      wordColor = "&H0081B910&"; // Neon green
    } else if (/^(ai|code|pipeline|wonder|spark|model|tech)$/i.test(cleanToken)) {
      wordColor = "&H00FFF000&"; // Cyan
    } else if (/^(stop|cut|dead|wrong|mistake|waste|bad)$/i.test(cleanToken)) {
      wordColor = "&H004444FF&"; // Bright red
    }

    const sTime = formatAssTimestamp(w.start);
    const eTime = formatAssTimestamp(Math.max(w.start + 0.12, w.end));
    const safeWord = w.word.replace(/[%{}]/g, "").toUpperCase();
    const textFormatted = `{\\fscx120\\fscy120\\c${wordColor}\\3c&H00000000&\\bord4.5\\shad2.5}${emojiPrefix}${safeWord}`;
    assLines.push(`Dialogue: 0,${sTime},${eTime},PopMain,,0,0,0,,${textFormatted}`);
  }

  fs.writeFileSync(assPath, assLines.join("\n"), "utf-8");

  try {
    const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    const filters: string[] = [`ass='${escapedAssPath}'`];

    if (filters.length > 0) {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        cleanVideoPath,
        "-vf",
        filters.join(","),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-c:a",
        "copy",
        outputPath,
      ]);
    } else {
      fs.copyFileSync(cleanVideoPath, outputPath);
    }

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

function mapRawTimeToCleanTime(rawTime: number, keepSegments: KeepSegment[]): number | null {
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
