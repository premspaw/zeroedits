import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function resolveAudioSourcePath(runId?: string | null, cleanVideoUrl?: string | null): string | null {
  const candidates: string[] = [];

  // Extract runId directly or from cleanVideoUrl
  let targetRunId = runId && typeof runId === "string" ? runId.trim() : null;
  if (!targetRunId && cleanVideoUrl && typeof cleanVideoUrl === "string") {
    const runMatch = cleanVideoUrl.match(/run-b-[^/?#&]+/);
    if (runMatch) {
      targetRunId = runMatch[0];
    }
  }

  if (targetRunId) {
    const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", targetRunId);
    candidates.push(
      path.join(runDir, "clean_video.mp4"),
      path.join(runDir, "raw_input.mp4"),
      path.join(runDir, "raw_video.mp4"),
      path.join(runDir, "final_edited_reel.mp4"),
      path.join(runDir, "extracted_audio.wav")
    );

    const storyRunDir = path.join(process.cwd(), "workspace", "audio-stories", targetRunId);
    candidates.push(
      path.join(storyRunDir, "voiceover.mp3"),
      path.join(storyRunDir, "voiceover.wav"),
      path.join(storyRunDir, "voiceover.m4a"),
      path.join(storyRunDir, "voiceover.aac"),
      path.join(storyRunDir, "voiceover.ogg"),
      path.join(storyRunDir, "voiceover.webm"),
      path.join(storyRunDir, "extracted_audio.wav")
    );

    const procRunDir = path.join(process.cwd(), "workspace", "procedural-stories", targetRunId);
    candidates.push(
      path.join(procRunDir, "voiceover.mp3"),
      path.join(procRunDir, "voiceover.wav"),
      path.join(procRunDir, "voiceover.m4a"),
      path.join(procRunDir, "voiceover.aac"),
      path.join(procRunDir, "voiceover.ogg"),
      path.join(procRunDir, "voiceover.webm"),
      path.join(procRunDir, "extracted_audio.wav")
    );
  }

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      try {
        const stat = fs.statSync(cand);
        if (stat.size > 1000) return cand;
      } catch {}
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const jobId = `remux-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tempDir = path.join(process.cwd(), ".render-temp", jobId);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const cleanVideoUrl = searchParams.get("cleanVideoUrl");
    const allowSilent = searchParams.get("allowSilent") === "1";
    const audioSource = resolveAudioSourcePath(runId, cleanVideoUrl);
    const hasAudioSource = Boolean(audioSource && fs.existsSync(audioSource));

    if (!hasAudioSource && !allowSilent) {
      return NextResponse.json(
        { error: "Audio source video was not found for this export run. Cannot proceed without original audio track." },
        { status: 400 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    const outputPath = path.join(tempDir, "final_rendered_reel.mp4");

    if (contentType.includes("multipart/form-data")) {
      // ── BATCH FRAME RENDERING (Sequential JPEGs) ──
      const formData = await req.formData();
      const files: { index: number; file: File }[] = [];

      for (const [key, val] of formData.entries()) {
        if (val instanceof File && key.startsWith("frame_")) {
          const idx = parseInt(key.replace("frame_", ""), 10);
          if (!isNaN(idx)) {
            files.push({ index: idx, file: val });
          }
        }
      }

      if (files.length === 0) {
        return NextResponse.json(
          { error: "No rendered frames received in multipart form data." },
          { status: 400 }
        );
      }

      files.sort((a, b) => a.index - b.index);

      for (const item of files) {
        const frameBuf = Buffer.from(await item.file.arrayBuffer());
        const framePath = path.join(tempDir, `frame_${String(item.index).padStart(5, "0")}.jpg`);
        fs.writeFileSync(framePath, frameBuf);
      }

      const inputPattern = path.join(tempDir, "frame_%05d.jpg");
      const ffmpegArgs = hasAudioSource && audioSource
        ? [
            "-y",
            "-framerate",
            "30",
            "-i",
            inputPattern,
            "-i",
            audioSource,
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
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
            "19",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            outputPath,
          ]
        : [
            "-y",
            "-framerate",
            "30",
            "-i",
            inputPattern,
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
            "19",
            "-movflags",
            "+faststart",
            outputPath,
          ];
      await execFileAsync("ffmpeg", ffmpegArgs, { maxBuffer: 40 * 1024 * 1024 });
    } else {
      // ── RAW BITSTREAM / WEBM / MP4 BUFFER FROM WEBCODECS ──
      const arrayBuffer = await req.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength < 100) {
        return NextResponse.json(
          { error: "Empty or truncated video buffer received for MP4 remux." },
          { status: 400 }
        );
      }

      const inputPath = path.join(tempDir, "rendered_stream.bin");
      fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

      // Attempt 1: Fast Annex-B H.264 stream muxing (no re-encode)
      let muxSuccess = false;
      try {
        const copyArgs = hasAudioSource && audioSource
          ? [
              "-y",
              "-r",
              "30",
              "-f",
              "h264",
              "-i",
              inputPath,
              "-i",
              audioSource,
              "-map",
              "0:v:0",
              "-map",
              "1:a:0",
              "-c:v",
              "copy",
              "-c:a",
              "aac",
              "-b:a",
              "192k",
              "-movflags",
              "+faststart",
              outputPath,
            ]
          : [
              "-y",
              "-r",
              "30",
              "-f",
              "h264",
              "-i",
              inputPath,
              "-c:v",
              "copy",
              "-movflags",
              "+faststart",
              outputPath,
            ];
        await execFileAsync("ffmpeg", copyArgs, { maxBuffer: 30 * 1024 * 1024 });
        muxSuccess = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000;
      } catch (copyErr) {
        muxSuccess = false;
      }

      // Attempt 2: Standard transcode if raw copy fails
      if (!muxSuccess) {
        const transcodeArgs = hasAudioSource && audioSource
          ? [
              "-y",
              "-i",
              inputPath,
              "-i",
              audioSource,
              "-map",
              "0:v:0",
              "-map",
              "1:a:0",
              "-vf",
              "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
              "-r",
              "30",
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
              "19",
              "-c:a",
              "aac",
              "-b:a",
              "192k",
              "-movflags",
              "+faststart",
              outputPath,
            ]
          : [
              "-y",
              "-i",
              inputPath,
              "-vf",
              "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
              "-r",
              "30",
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
              "19",
              "-movflags",
              "+faststart",
              outputPath,
            ];
        await execFileAsync("ffmpeg", transcodeArgs, { maxBuffer: 30 * 1024 * 1024 });
      }
    }

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error("FFmpeg failed to produce a valid MP4 output file.");
    }

    const mp4Buffer = fs.readFileSync(outputPath);

    // Save exact verified MP4 to disk in run directory
    if (runId) {
      try {
        const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);
        if (fs.existsSync(runDir)) {
          fs.writeFileSync(path.join(runDir, "final_reel.mp4"), mp4Buffer);
          fs.writeFileSync(path.join(runDir, "final_edited_reel.mp4"), mp4Buffer);
        }
        const storyRunDir = path.join(process.cwd(), "workspace", "audio-stories", runId);
        if (fs.existsSync(storyRunDir)) {
          fs.writeFileSync(path.join(storyRunDir, "final_cinematic_story.mp4"), mp4Buffer);
        }
      } catch (saveErr) {
        console.warn("[remux-mp4] Could not overwrite final reel files on disk:", saveErr);
      }
    }

    return new NextResponse(new Uint8Array(mp4Buffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(mp4Buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[remux-mp4] Error:", err);
    // Explicitly return a 500 error — NEVER return or download clean_video.mp4 as a fallback!
    return NextResponse.json(
      { error: err?.message || "Failed to transcode rendered frames to H.264 MP4." },
      { status: 500 }
    );
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}
