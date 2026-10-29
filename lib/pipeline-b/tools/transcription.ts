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

/**
 * Sanitizes and aligns word-level timestamps:
 * 1. Resolves chunk stride offset jumps (preventing backward jumps).
 * 2. Eliminates zero-duration and inverted-duration tokens.
 * 3. Clamps implausibly long durations against acoustic silences and natural speech pacing.
 * 4. Enforces strict sequential monotonicity and non-overlapping word boundaries.
 */
export function sanitizeAndAlignWordTimestamps(params: {
  rawWords: TranscriptWord[];
  silences: { start: number; end: number; duration: number }[];
  totalDuration: number;
}): TranscriptWord[] {
  const { rawWords, silences, totalDuration } = params;
  if (!rawWords || rawWords.length === 0) return [];

  // Filter out empty or whitespace-only tokens
  let words: TranscriptWord[] = rawWords
    .map((w) => ({
      word: String(w.word || "").trim().replace(/[.,!?;:]/g, ""),
      start: Number.isFinite(w.start) ? +w.start.toFixed(2) : 0,
      end: Number.isFinite(w.end) ? +w.end.toFixed(2) : 0,
      confidence: Number.isFinite(w.confidence) ? w.confidence : 0.85,
    }))
    .filter((w) => w.word.length > 0);

  if (words.length === 0) return [];

  // 1. Detect and repair chunk stride offset jumps (e.g. from multi-window Whisper decoding)
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1];
    const curr = words[i];
    // If a word timestamp jumps backward significantly compared to the previous word
    if (curr.start < prev.start - 0.40) {
      const shift = +(prev.end + 0.08 - curr.start).toFixed(2);
      for (let j = i; j < words.length; j++) {
        words[j].start = +(words[j].start + shift).toFixed(2);
        words[j].end = +(words[j].end + shift).toFixed(2);
      }
    }
  }

  // 2. Fix zero-duration and inverted-duration tokens (e.g. [4.94, 4.94] or [26.36, 25.48])
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.end <= w.start) {
      const nextStart = i < words.length - 1 ? words[i + 1].start : totalDuration;
      const naturalDur = Math.max(0.18, Math.min(0.50, +(w.word.length * 0.065).toFixed(2)));
      if (nextStart > w.start + 0.05) {
        w.end = +Math.min(nextStart - 0.02, w.start + naturalDur).toFixed(2);
      } else {
        w.end = +(w.start + naturalDur).toFixed(2);
        if (i < words.length - 1 && words[i + 1].start < w.end) {
          words[i + 1].start = w.end;
        }
      }
    }
  }

  // 3. Clamp implausibly long durations against acoustic silences and natural speech pacing
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // Clamp against detected acoustic silences
    for (const s of silences) {
      if (w.start < s.start && w.end > s.start + 0.04) {
        w.end = +Math.max(w.start + 0.15, +(s.start - 0.02).toFixed(2));
      }
    }
    // Clamp implausibly long word durations (> 1.0s for short words <= 5 chars, > 1.6s for others)
    const dur = +(w.end - w.start).toFixed(2);
    if (dur > 1.0 && w.word.length <= 5) {
      w.end = +(w.start + Math.min(0.45, +(dur * 0.35).toFixed(2))).toFixed(2);
    } else if (dur > 1.6) {
      w.end = +(w.start + Math.min(0.70, +(dur * 0.40).toFixed(2))).toFixed(2);
    }
  }

  // 4. Enforce strict sequential monotonicity and non-overlapping word boundaries
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && words[i].start < words[i - 1].end) {
      words[i].start = words[i - 1].end;
    }
    if (words[i].end <= words[i].start) {
      words[i].end = +(words[i].start + 0.16).toFixed(2);
    }
    words[i].start = Math.max(0, +words[i].start.toFixed(2));
    words[i].end = Math.min(totalDuration, +words[i].end.toFixed(2));
  }

  return words;
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

  let rawWords: TranscriptWord[] = [];
  let source: "whisper" | "script_fallback" = "whisper";

  // 1. Genuine speech transcription using local Whisper model (chunked long-form)
  const whisperWords = await runWhisperTranscription(wavPath);
  if (whisperWords && whisperWords.length > 0) {
    rawWords = whisperWords;
  } else {
    source = "script_fallback";
    if (userScript && userScript.trim().length > 0) {
      const baseText = userScript.trim();
      const splitWords = baseText
        .replace(/[^\w\s'-]/g, "")
        .split(/\s+/)
        .filter(Boolean);

      const wordCount = splitWords.length || 1;
      const totalSilenceTime = silences.reduce((acc, s) => acc + s.duration, 0);
      const speakingTime = Math.max(1, totalDuration - totalSilenceTime);
      const avgWordDuration = speakingTime / wordCount;

      let currentTime = 0;
      for (let i = 0; i < splitWords.length; i++) {
        const currentSilence = silences.find((s) => s.start <= currentTime && currentTime < s.end);
        if (currentSilence) {
          currentTime = currentSilence.end;
        }

        const start = +currentTime.toFixed(2);
        const end = +Math.min(totalDuration, start + avgWordDuration).toFixed(2);
        currentTime = end + 0.05;

        rawWords.push({
          word: splitWords[i],
          start,
          end,
          confidence: 0.50, // Accurately mark fallback confidence
        });
      }
    } else {
      // Per instructions: Never invent fabricated transcripts without speech data
      throw new Error(
        "Speech recognition failed to transcribe audio and no script was provided. Please ensure the video contains clear audio and retry."
      );
    }
  }

  // Apply real speech alignment, de-chunking, and duration sanitization
  const words = sanitizeAndAlignWordTimestamps({
    rawWords,
    silences,
    totalDuration,
  });

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
