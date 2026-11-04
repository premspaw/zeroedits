import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { getFfmpegPath } from "@/lib/media-binaries";
import { CreateSoundBeat, planCreateSoundEffects, writeCreateSoundEffectsWav } from "@/lib/create-sound-effects";

const runCmd = promisify(execFile);
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let wavPath = "";
  let outputPath = "";
  try {
    const body = await req.json();
    const duration = Number(body?.duration);
    const beats = body?.beats as CreateSoundBeat[];
    if (!Number.isFinite(duration) || duration <= 0 || duration > 300 || !Array.isArray(beats) || beats.length > 200) {
      return NextResponse.json({ success: false, error: "Invalid sound effects timeline." }, { status: 400 });
    }
    const cues = planCreateSoundEffects(beats, duration);
    if (!cues.length) return NextResponse.json({ success: true, data: { url: null, count: 0, cues: [] } });

    const id = randomUUID();
    wavPath = path.join(os.tmpdir(), `muse-sfx-${id}.wav`);
    const publicDir = path.join(process.cwd(), "public", "sfx");
    fs.mkdirSync(publicDir, { recursive: true });
    outputPath = path.join(publicDir, `${id}.m4a`);
    writeCreateSoundEffectsWav(cues, duration, wavPath);
    await runCmd(getFfmpegPath(), ["-y", "-i", wavPath, "-c:a", "aac", "-b:a", "128k", "-f", "mp4", outputPath], { maxBuffer: 2 * 1024 * 1024 });
    return NextResponse.json({ success: true, data: { url: `/sfx/${id}.m4a`, count: cues.length, cues } });
  } catch (error) {
    if (outputPath) fs.rmSync(outputPath, { force: true });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Sound effects generation failed." }, { status: 500 });
  } finally {
    if (wavPath) fs.rmSync(wavPath, { force: true });
  }
}
