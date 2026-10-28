import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const runCmd = promisify(execFile);

// Project-local interpreter (.venv) first, system python as fallback.
function resolvePython(): string {
  const venvPython =
    process.platform === "win32"
      ? path.join(process.cwd(), ".venv", "Scripts", "python.exe")
      : path.join(process.cwd(), ".venv", "bin", "python");
  try {
    if (fs.existsSync(venvPython)) return venvPython;
  } catch {}
  return "python";
}

// Our 6 chat-bar voices -> free Edge TTS neural voices (no key required)
const EDGE_VOICES: Record<string, string> = {
  "EN-IN": "en-IN-PrabhatNeural",
  "EN-US": "en-US-ChristopherNeural",
  "HI-VIHAAN": "hi-IN-MadhurNeural",
  "HI-ANANYA": "hi-IN-SwaraNeural",
  "KN-DIVYA": "kn-IN-SapnaNeural",
  "KN-KIRAN": "kn-IN-GaganNeural",
};

const LANG_FALLBACK: Record<string, string> = {
  EN: "en-IN-PrabhatNeural",
  HI: "hi-IN-MadhurNeural",
  KN: "kn-IN-GaganNeural",
};

function resolveEdgeVoice(voice: string, language: string): string {
  if (voice && EDGE_VOICES[voice]) return EDGE_VOICES[voice];
  return LANG_FALLBACK[language] || LANG_FALLBACK.EN;
}

async function ffprobeDuration(file: string): Promise<number> {
  const { stdout } = await runCmd("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    file,
  ]);
  const dur = Number(String(stdout).trim());
  if (!Number.isFinite(dur) || dur <= 0) throw new Error(`Could not read audio duration for ${file}`);
  return dur;
}

interface VoiceBeat {
  id?: number | string;
  voiceover?: string;
  estDuration?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      beats = [],
      voice = "EN-IN",
      language = "EN",
      gapSec = 0.25,
      rate = "+0%",
    } = body as {
      beats: VoiceBeat[];
      voice: string;
      language: string;
      gapSec?: number;
      rate?: string;
    };

    if (!Array.isArray(beats) || beats.length === 0) {
      return NextResponse.json({ success: false, error: "beats array is required." }, { status: 400 });
    }

    const edgeVoice = resolveEdgeVoice(voice, language);
    const gap = Math.max(0, Math.min(1.5, Number(gapSec) || 0));
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const jobDir = path.join(process.cwd(), "public", "voiceover", jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const tracks: {
      id: number | string;
      url: string;
      file: string;
      start: number;
      end: number;
      duration: number;
      hasAudio: boolean;
    }[] = [];

    let cursor = 0;
    for (let i = 0; i < beats.length; i++) {
      const b = beats[i] || {};
      const id = b.id ?? i + 1;
      const text = (b.voiceover || "").trim();
      const safeName = `beat-${i + 1}.mp3`;
      const absFile = path.join(jobDir, safeName);

      let duration: number;
      let hasAudio = false;
      if (text) {
        await runCmd(resolvePython(), [
          "-m",
          "edge_tts",
          "--voice",
          edgeVoice,
          "--rate",
          rate,
          "--text",
          text,
          "--write-media",
          absFile,
        ]);
        duration = await ffprobeDuration(absFile);
        hasAudio = true;
      } else {
        // Silent beat: hold the visual briefly so it still reads on screen.
        const est = Number(b.estDuration);
        duration = Number.isFinite(est) && est > 0 ? Math.max(1.0, Math.min(est, 2.5)) : 1.5;
      }

      const start = +cursor.toFixed(2);
      const end = +(cursor + duration).toFixed(2);
      tracks.push({
        id,
        url: `/voiceover/${jobId}/${safeName}`,
        file: absFile,
        start,
        end,
        duration: +duration.toFixed(2),
        hasAudio,
      });
      cursor = end + (i < beats.length - 1 ? gap : 0);
    }

    const totalDuration = +cursor.toFixed(2);

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        voice: edgeVoice,
        language,
        gapSec: gap,
        tracks,
        totalDuration,
      },
    });
  } catch (err: any) {
    console.error("[voiceover] Error:", err);
    const msg = err?.stderr || err?.message || "Voiceover synthesis failed.";
    return NextResponse.json({ success: false, error: String(msg).slice(0, 500) }, { status: 502 });
  }
}
