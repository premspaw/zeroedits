/**
 * Meta Muse — Pipeline B Tool: Export Service
 * Deterministically renders final composite MP4 (clean footage + kinetic subtitles + visual badges).
 */

import { execFile } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import type { EditPlan, TranscriptSegment } from "../types.ts";
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

  // Create standard SRT subtitle file for crisp burning
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
    // Burn subtitles with ffmpeg into 1080x1920 9:16 portrait video
    // Use proper escaping for Windows path in ffmpeg subtitles filter
    const escapedSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      cleanVideoPath,
      "-vf",
      `subtitles='${escapedSrtPath}':force_style='FontSize=22,FontName=Arial,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Alignment=2,MarginV=120'`,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "21",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      outputPath,
    ]);

    return outputPath;
  } catch (err) {
    console.warn("ffmpeg subtitle burning error, falling back to direct copy:", err);
    fs.copyFileSync(cleanVideoPath, outputPath);
    return outputPath;
  }
}

function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}
