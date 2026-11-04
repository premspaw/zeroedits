import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { resolveStoryPython } from "@/lib/story-bank";

const execFileAsync = promisify(execFile);
export const maxDuration = 90;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let tempDir = "";
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ success: false, error: "Record a short voice note first." }, { status: 400 });
    }
    if (audio.size > 20 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Voice notes must be under 20 MB." }, { status: 413 });
    }

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "muse-script-voice-"));
    const extension = /\.(webm|ogg|wav|mp3|m4a|mp4)$/i.exec(audio.name)?.[0] || ".webm";
    const audioPath = path.join(tempDir, `voice${extension}`);
    fs.writeFileSync(audioPath, Buffer.from(await audio.arrayBuffer()));

    const { stdout } = await execFileAsync(
      resolveStoryPython(),
      [path.join(process.cwd(), "lib", "story-transcribe.py"), audioPath, "base"],
      { maxBuffer: 16 * 1024 * 1024, timeout: 75_000 },
    );
    const resultLine = String(stdout).trim().split("\n").pop() || "{}";
    const result = JSON.parse(resultLine);
    const transcript = String(result?.text || "").trim();
    if (!transcript || result?.error) {
      return NextResponse.json({ success: false, error: "I couldn't hear clear words. Try again or type your direction." }, { status: 422 });
    }
    return NextResponse.json({ success: true, transcript });
  } catch (error: any) {
    console.error("[api/script-brain/transcribe] Error:", error?.message || error);
    return NextResponse.json({ success: false, error: "Voice transcription failed. You can still type your direction in the chat." }, { status: 500 });
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
