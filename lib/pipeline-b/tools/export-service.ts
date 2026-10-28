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

  // Create standard SRT subtitle file
  const srtPath = path.join(outputDir, "subtitles.srt");
  const srtLines: string[] = [];

  let entryIndex = 1;
  for (const segment of transcript) {
    const sTime = formatSrtTimestamp(segment.start);
    const eTime = formatSrtTimestamp(segment.end);
    srtLines.push(`${entryIndex}`);
    srtLines.push(`${sTime} --> ${eTime}`);
    srtLines.push(segment.text.toUpperCase());
    srtLines.push("");
    entryIndex++;
  }

  fs.writeFileSync(srtPath, srtLines.join("\n"), "utf-8");

  try {
    const filters: string[] = [];
    const keepSegments = editPlan.keepSegments || [];

    // 1. Top Hook Badge for the first 3.5 seconds
    const badgeText = (editPlan.hookLine || "KEY INSIGHT").replace(/%/g, "").replace(/['"\\:]/g, "").slice(0, 32).toUpperCase();
    filters.push(
      `drawtext=text='[ ${badgeText} ]':fontsize=32:fontcolor=yellow:box=1:boxcolor=black@0.85:boxborderw=10:x=(w-text_w)/2:y=120:enable='between(t,0,3.5)'`
    );

    // 2. Visual Badges & Image Overlay Callouts from visualPlan
    for (const item of editPlan.visualPlan || []) {
      if (item.type === "icon_badge" || item.type === "image_overlay") {
        const itemText = item.content.replace(/%/g, "").replace(/['"\\:]/g, "").toUpperCase();
        const start = Math.max(0, item.timestamp);
        const end = start + Math.min(2.2, item.duration);
        const boxColor = item.type === "image_overlay" ? "black@0.85" : "red@0.85";
        const fontColor = item.type === "image_overlay" ? "yellow" : "white";
        filters.push(
          `drawtext=text='${itemText}':fontsize=34:fontcolor=${fontColor}:box=1:boxcolor=${boxColor}:boxborderw=12:x=(w-text_w)/2:y=200:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`
        );
      }
    }

    // 3. Dynamic Subtitles mapped to the clean cut timeline
    for (const segment of transcript) {
      const cleanText = segment.text.replace(/%/g, "").replace(/['"\\:]/g, "").toUpperCase();
      if (!cleanText.trim()) continue;

      let sStart = mapRawTimeToCleanTime(segment.start, keepSegments);
      let sEnd = mapRawTimeToCleanTime(segment.end, keepSegments);

      if (sStart === null || sEnd === null) continue;
      if (sEnd <= sStart) {
        sEnd = sStart + 0.8;
      }

      filters.push(
        `drawtext=text='${cleanText}':fontsize=38:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-text_w)/2:y=h*0.78:enable='between(t,${sStart.toFixed(2)},${sEnd.toFixed(2)})'`
      );
    }

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
    console.warn("ffmpeg subtitle burning error, falling back to clean video:", err);
    fs.copyFileSync(cleanVideoPath, outputPath);
    return outputPath;
  }
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
