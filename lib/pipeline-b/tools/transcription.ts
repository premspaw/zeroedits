/**
 * Meta Muse — Pipeline B Tool: Transcription
 * Extracts audio track deterministically and generates word-level timestamps.
 */

import { execFile, spawn } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import type { TranscriptSegment, TranscriptWord } from "../types.ts";

const execFileAsync = util.promisify(execFile);

// Whisper model is configurable. base.en is noticeably more accurate than tiny.en on
// real talking-head audio (tiny.en hallucinates repetition loops on fast speech).
export const WHISPER_MODEL_ID = process.env.PIPELINE_B_WHISPER_MODEL || "Xenova/whisper-base.en";

// Whisper's encoder sees a fixed 30s window. Without chunking, transformers.js decodes
// ONLY the first window and silently drops the rest of the audio.
const WHISPER_CHUNK_LENGTH_S = 30;
const WHISPER_STRIDE_LENGTH_S = 5;

const cachedWhisperPipelines: Record<string, any> = {};

async function getAudioFloat32(wavPath: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", wavPath,
      "-ar", "16000",
      "-ac", "1",
      "-f", "f32le",
      "pipe:1"
    ]);
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        const buffer = Buffer.concat(chunks);
        resolve(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4));
      } else {
        reject(new Error(`ffmpeg audio extraction failed with exit code ${code}`));
      }
    });
  });
}

async function runWhisperTranscription(wavPath: string): Promise<TranscriptWord[] | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)");
    const { pipeline } = await dynamicImport("@xenova/transformers");
    if (!cachedWhisperPipelines[WHISPER_MODEL_ID]) {
      cachedWhisperPipelines[WHISPER_MODEL_ID] = await pipeline("automatic-speech-recognition", WHISPER_MODEL_ID);
    }
    const audioData = await getAudioFloat32(wavPath);
    const result: any = await cachedWhisperPipelines[WHISPER_MODEL_ID](audioData, {
      return_timestamps: "word",
      chunk_length_s: WHISPER_CHUNK_LENGTH_S,
      stride_length_s: WHISPER_STRIDE_LENGTH_S,
    });

    if (result && Array.isArray(result.chunks) && result.chunks.length > 0) {
      return result.chunks.map((c: any) => ({
        word: String(c.text || "").trim().replace(/[.,!?;:]/g, ""),
        start: Array.isArray(c.timestamp) ? +c.timestamp[0].toFixed(2) : 0,
        end: Array.isArray(c.timestamp) ? +c.timestamp[1].toFixed(2) : 0,
        confidence: 0.95,
      })).filter((w: any) => w.word.length > 0);
    }
    return null;
  } catch (err) {
    console.warn("[Transcription] Whisper error, using fallback:", err);
    return null;
  }
}

export async function extractAudioTrack(videoPath: string, outputWavPath: string): Promise<string> {
  const dir = path.dirname(outputWavPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Extract 16kHz mono 16-bit PCM WAV for clean speech processing
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-vn",
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    outputWavPath,
  ]);

  return outputWavPath;
}

export async function detectSilences(
  audioPath: string,
  noiseThresholdDb = -32,
  minDurationSec = 0.4
): Promise<{ start: number; end: number; duration: number }[]> {
  try {
    const { stderr } = await execFileAsync("ffmpeg", [
      "-i",
      audioPath,
      "-af",
      `silencedetect=noise=${noiseThresholdDb}dB:d=${minDurationSec}`,
      "-f",
      "null",
      "-",
    ]);

    const silences: { start: number; end: number; duration: number }[] = [];
    const silenceStartRegex = /silence_start:\s*([\d.]+)/g;
    const silenceEndRegex = /silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;

    const startMatches: RegExpExecArray[] = [];
    let m1: RegExpExecArray | null;
    while ((m1 = silenceStartRegex.exec(stderr)) !== null) {
      startMatches.push(m1);
    }

    const endMatches: RegExpExecArray[] = [];
    let m2: RegExpExecArray | null;
    while ((m2 = silenceEndRegex.exec(stderr)) !== null) {
      endMatches.push(m2);
    }

    for (let i = 0; i < Math.min(startMatches.length, endMatches.length); i++) {
      const s = parseFloat(startMatches[i][1]);
      const e = parseFloat(endMatches[i][1]);
      const dur = parseFloat(endMatches[i][2]);
      if (e > s) {
        silences.push({ start: +s.toFixed(2), end: +e.toFixed(2), duration: +dur.toFixed(2) });
      }
    }

    return silences;
  } catch (err) {
    console.warn("Silence detection error, proceeding with empty silences list:", err);
    return [];
  }
}

export interface TranscriptionCoverage {
  model: string;
  source: "whisper" | "script_fallback";
  lastWordEnd: number;
  totalDuration: number;
  /** Seconds of audio after the last transcribed word that are NOT detected silence. */
  untranscribedTailSec: number;
  complete: boolean;
}

export interface TranscriptionOutput {
  segments: TranscriptSegment[];
  silences: { start: number; end: number; duration: number }[];
  coverage: TranscriptionCoverage;
}

/**
 * Measures whether the transcript actually covers the spoken audio.
 * A tail longer than 2s that is not silence means speech was dropped.
 */
export function computeTranscriptionCoverage(params: {
  words: TranscriptWord[];
  silences: { start: number; end: number; duration: number }[];
  totalDuration: number;
  model: string;
  source: "whisper" | "script_fallback";
}): TranscriptionCoverage {
  const { words, silences, totalDuration, model, source } = params;
  const lastWordEnd = words.length > 0 ? Math.max(...words.map((w) => w.end)) : 0;
  let tail = Math.max(0, totalDuration - lastWordEnd);
  for (const s of silences) {
    const overlap = Math.min(s.end, totalDuration) - Math.max(s.start, lastWordEnd);
    if (overlap > 0) tail -= overlap;
  }
  const untranscribedTailSec = +Math.max(0, tail).toFixed(2);
  return {
    model,
    source,
    lastWordEnd: +lastWordEnd.toFixed(2),
    totalDuration: +totalDuration.toFixed(2),
    untranscribedTailSec,
    complete: untranscribedTailSec <= 2.0,
  };
}

export async function transcribeAudio(params: {
  videoPath: string;
  wavPath: string;
  totalDuration: number;
  userScript?: string;
}): Promise<TranscriptionOutput> {
  const { wavPath, totalDuration, userScript } = params;

  // Extract audio
  await extractAudioTrack(params.videoPath, wavPath);

  // Detect silences for precise natural speech pauses (threshold -30dB, min 0.35s)
  const silences = await detectSilences(wavPath, -30, 0.35);

  let words: TranscriptWord[] = [];
  let source: "whisper" | "script_fallback" = "whisper";

  // 1. Try real speech transcription using local Whisper model (chunked long-form)
  const whisperWords = await runWhisperTranscription(wavPath);
  if (whisperWords && whisperWords.length > 0) {
    words = whisperWords;
  } else {
    source = "script_fallback";
    // 2. Fallback to user script or synthetic alignment
    const baseText = userScript && userScript.trim().length > 0
      ? userScript.trim()
      : "Welcome to this talking-head video. In this quick video we reveal the secret to high conversion reels with kinetic typography and clean cuts.";

    const rawWords = baseText
      .replace(/[^\w\s'-]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    const wordCount = rawWords.length || 1;

    // Compute non-silence speaking time
    const totalSilenceTime = silences.reduce((acc, s) => acc + s.duration, 0);
    const speakingTime = Math.max(1, totalDuration - totalSilenceTime);
    const avgWordDuration = speakingTime / wordCount;

    // Generate word-level timestamps
    let currentTime = 0;

    for (let i = 0; i < rawWords.length; i++) {
      // Check if current time falls in a detected silence
      const currentSilence = silences.find((s) => s.start <= currentTime && currentTime < s.end);
      if (currentSilence) {
        currentTime = currentSilence.end;
      }

      const start = +currentTime.toFixed(2);
      const end = +Math.min(totalDuration, start + avgWordDuration).toFixed(2);
      currentTime = end + 0.05;

      words.push({
        word: rawWords[i],
        start,
        end,
        confidence: 0.95,
      });
    }
  }

  // Group into speech segments (approx 4-8 words each for caption blocks)
  const segments: TranscriptSegment[] = [];
  const chunkSize = 5;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkWords = words.slice(i, i + chunkSize);
    segments.push({
      id: Math.floor(i / chunkSize) + 1,
      start: chunkWords[0].start,
      end: chunkWords[chunkWords.length - 1].end,
      text: chunkWords.map((w) => w.word).join(" "),
      words: chunkWords,
    });
  }

  const coverage = computeTranscriptionCoverage({
    words,
    silences,
    totalDuration,
    model: WHISPER_MODEL_ID,
    source,
  });

  return { segments, silences, coverage };
}
