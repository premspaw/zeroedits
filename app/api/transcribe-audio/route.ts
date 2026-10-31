import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { transcribeAudio } from "@/lib/pipeline-b/tools/transcription";

const execFileAsync = promisify(execFile);
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let tempDir = "";
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const userScript = String(form.get("userScript") || "").trim();
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ success: false, error: "Upload an audio file." }, { status: 400 });
    }

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "muse-audio-transcript-"));
    const ext = path.extname(audio.name).toLowerCase();
    const safeExt = /^\.(mp3|wav|m4a|aac|ogg|webm|flac)$/.test(ext) ? ext : ".mp3";
    const audioPath = path.join(tempDir, `voiceover${safeExt}`);
    const wavPath = path.join(tempDir, "voiceover.wav");
    const audioBytes = Buffer.from(await audio.arrayBuffer());
    fs.writeFileSync(audioPath, audioBytes);

    let duration = 30;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error", "-show_entries", "format=duration", "-of",
        "default=noprint_wrappers=1:nokey=1", audioPath,
      ]);
      const probed = Number.parseFloat(String(stdout).trim());
      if (Number.isFinite(probed) && probed > 0) duration = Math.min(90, probed);
    } catch {}

    const result = await transcribeAudio({ videoPath: audioPath, wavPath, totalDuration: duration, userScript });
    const transcript = result.segments.map((segment) => segment.text).join(" ").trim();
    const audioId = crypto.randomUUID();
    const voiceoverDir = path.join(process.cwd(), "public", "voiceover");
    fs.mkdirSync(voiceoverDir, { recursive: true });
    fs.writeFileSync(path.join(voiceoverDir, `${audioId}${safeExt}`), audioBytes);
    return NextResponse.json({ success: true, transcript, duration, audioUrl: `/voiceover/${audioId}${safeExt}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Audio transcription failed." }, { status: 500 });
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
