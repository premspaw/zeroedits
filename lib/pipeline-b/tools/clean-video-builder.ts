/**
 * Meta Muse — Pipeline B Tool: Clean Video Builder
 * Uses ffmpeg to deterministically cut raw footage and stitch kept segments.
 */

import { execFile } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import type { KeepSegment } from "../types.ts";

const execFileAsync = util.promisify(execFile);

export async function buildCleanVideo(params: {
  rawVideoPath: string;
  keepSegments: KeepSegment[];
  outputPath: string;
}): Promise<string> {
  const { rawVideoPath, keepSegments, outputPath } = params;

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // If there's only one segment spanning the whole video, copy or re-encode directly
  if (keepSegments.length === 1 && keepSegments[0].start === 0) {
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-ss",
        keepSegments[0].start.toString(),
        "-t",
        keepSegments[0].duration.toString(),
        "-i",
        rawVideoPath,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        outputPath,
      ]);
      return outputPath;
    } catch (err: any) {
      throw new Error(`FFmpeg single-segment processing failed: ${err.message}`);
    }
  }

  // For multi-segment cuts: create segment clips with audio de-clicking and concat them
  const segmentFiles: string[] = [];
  const concatListPath = path.join(outputDir, `concat_${Date.now()}.txt`);

  try {
    for (let i = 0; i < keepSegments.length; i++) {
      const seg = keepSegments[i];
      const segPath = path.join(outputDir, `seg_${i}_${Date.now()}.mp4`);

      // Standardize all segments to portrait 1080x1920 (9:16) with alternating punch-in zoom
      const baseFilter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1";
      const punchFilter = "scale=1242:2208:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1";
      const videoFilter = seg.zoomScale > 1.05 ? punchFilter : baseFilter;

      // 10ms micro-fade in/out on audio to prevent clicks/pops at cut transitions
      const audioFadeDur = Math.min(0.01, seg.duration / 4);
      const audioOutStart = Math.max(0, +(seg.duration - audioFadeDur).toFixed(3));
      const audioFilter = `afade=t=in:ss=0:d=${audioFadeDur},afade=t=out:st=${audioOutStart}:d=${audioFadeDur}`;

      await execFileAsync("ffmpeg", [
        "-y",
        "-accurate_seek",
        "-ss",
        seg.start.toString(),
        "-t",
        seg.duration.toString(),
        "-i",
        rawVideoPath,
        "-vf",
        videoFilter,
        "-af",
        audioFilter,
        "-r",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-b:a",
        "192k",
        segPath,
      ]);

      segmentFiles.push(segPath);
    }

    // Write concat file
    const fileEntries = segmentFiles.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n");
    fs.writeFileSync(concatListPath, fileEntries, "utf-8");

    // Concat all segments with copy or re-encode fallback
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-c",
        "copy",
        outputPath,
      ]);
    } catch {
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-c:a",
        "aac",
        outputPath,
      ]);
    }

    return outputPath;
  } catch (err: any) {
    // Fail explicitly so the orchestrator records stage failure and can retry
    throw new Error(`FFmpeg clean video assembly failed: ${err.message || String(err)}`);
  } finally {
    // Always clean up temporary segment files and concat list
    for (const segFile of segmentFiles) {
      if (fs.existsSync(segFile)) {
        try {
          fs.unlinkSync(segFile);
        } catch {}
      }
    }
    if (fs.existsSync(concatListPath)) {
      try {
        fs.unlinkSync(concatListPath);
      } catch {}
    }
  }
}
