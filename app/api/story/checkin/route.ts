import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  BANK_DIR,
  PERSONAL_MD,
  RAW_BANK_MD,
  ensureBankDir,
  resolveStoryPython,
} from "@/lib/story-bank";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const runCmd = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    const goal = String(form.get("goal") || "personal-brand");
    const note = String(form.get("note") || "").trim().slice(0, 500);

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "No audio file uploaded." }, { status: 400 });
    }
    const blob = file as unknown as File;
    if (blob.size > 25 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Audio is over the 25MB check-in limit." }, { status: 413 });
    }

    ensureBankDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = (blob.name?.split(".").pop() || "webm").slice(0, 8).replace(/[^a-z0-9]/gi, "") || "webm";
    const absFile = path.join(BANK_DIR, "audio", `checkin-${stamp}.${ext}`);
    const bytes = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(absFile, bytes);

    const { stdout } = await runCmd(
      resolveStoryPython(),
      [path.join(process.cwd(), "lib", "story-transcribe.py"), absFile, "base"],
      { maxBuffer: 32 * 1024 * 1024 }
    );
    const lastLine = stdout.trim().split("\n").pop() || "{}";
    const result = JSON.parse(lastLine);
    if (result.error || !result.text) {
      throw new Error(result.error || "Transcription came back empty. Try a clearer recording.");
    }

    // Append the raw moment — this is the memory moat, never overwritten.
    const entry = `\n## ${new Date().toISOString().slice(0, 16).replace("T", " ")}${goal ? ` · ${goal}` : ""}${note ? ` · note: ${note}` : ""}\n\n${result.text}\n`;
    fs.appendFileSync(RAW_BANK_MD, entry, "utf-8");

    return NextResponse.json({
      success: true,
      data: {
        text: result.text,
        words: Array.isArray(result.words) ? result.words : [],
        duration: Number(result.duration) || 0,
        language: result.language || "",
        audioUrl: `/api/story/audio?f=${encodeURIComponent(path.basename(absFile))}`,
      },
    });
  } catch (err: any) {
    console.error("[story/checkin] Error:", err?.message || err);
    const msg = String(err?.stderr || err?.message || "Check-in failed.").slice(0, 500);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
