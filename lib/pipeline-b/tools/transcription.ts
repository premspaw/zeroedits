/**
 * Meta Muse — Pipeline B Tool: Transcription
 * Extracts audio track deterministically and generates word-level timestamps.
 */

import { execFile, spawn } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import type { TranscriptSegment, TranscriptWord } from "../types.ts";
import { getFfmpegPath } from "@/lib/media-binaries";

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
    const ffmpeg = spawn(getFfmpegPath(), [
      "-y",
      "-i", wavPath,
      "-ar", "16000",
      "-ac", "1",
      "-f", "f32le",
      "pipe:1"
    ]);
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        const buffer = Buffer.concat(chunks);
        const cleanBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        resolve(new Float32Array(cleanBuffer));
      } else {
        reject(new Error(`ffmpeg audio extraction failed with exit code ${code}`));
      }
    });
  });
}

async function runWhisperTranscription(
  wavPath: string,
  silences: { start: number; end: number; duration: number }[] = [],
  totalDuration = 30
): Promise<TranscriptWord[] | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)");
    const { pipeline } = await dynamicImport("@xenova/transformers");
    if (!cachedWhisperPipelines[WHISPER_MODEL_ID]) {
      cachedWhisperPipelines[WHISPER_MODEL_ID] = await pipeline("automatic-speech-recognition", WHISPER_MODEL_ID);
    }
    const audioData = await getAudioFloat32(wavPath);
    const sampleRate = 16000;
    const actualAudioDur = +(audioData.length / sampleRate).toFixed(2) || totalDuration;

    // Build utterance-level speech windows split at every acoustic pause (>= 0.35s)
    // and energy-envelope silence (<= -35 dBFS for >= 0.35s).
    // CRITICAL: When two repeated takes of the same sentence fall inside the same 6-18s window,
    // Whisper's decoder deduplicates/drops the repeated take! Splitting on every >= 0.35s pause
    // guarantees every spoken take is transcribed independently so Wonder AI sees 100% of takes.
    const frameSec = 0.01;
    const frameLen = Math.max(1, Math.round(sampleRate * frameSec));
    const totalFrames = Math.floor(audioData.length / frameLen);
    const db = new Float32Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) {
      let sum = 0;
      const base = f * frameLen;
      for (let i = 0; i < frameLen; i++) {
        const s = audioData[base + i];
        sum += s * s;
      }
      db[f] = 10 * Math.log10(sum / frameLen + 1e-10);
    }
    const sm = new Float32Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) {
      sm[f] = (db[Math.max(0, f - 1)] + db[f] + db[Math.min(totalFrames - 1, f + 1)]) / 3;
    }

    // Merge ffmpeg silences and RMS envelope silent runs (<= -35 dBFS for >= 0.35s)
    const pauseIntervals: { start: number; end: number; duration: number }[] = silences
      .filter((s) => s.duration >= 0.35)
      .map((s) => ({ start: s.start, end: s.end, duration: s.duration }));

    let r0 = -1;
    for (let f = 0; f <= totalFrames; f++) {
      const isSil = f < totalFrames && sm[f] <= -35;
      if (isSil && r0 < 0) r0 = f;
      if (!isSil && r0 >= 0) {
        const s = +(r0 * frameSec).toFixed(2);
        const e = +(f * frameSec).toFixed(2);
        if (e - s >= 0.35) {
          pauseIntervals.push({ start: s, end: e, duration: +(e - s).toFixed(2) });
        }
        r0 = -1;
      }
    }
    pauseIntervals.sort((a, b) => a.start - b.start);
    const mergedPauses: { start: number; end: number; duration: number }[] = [];
    for (const p of pauseIntervals) {
      if (mergedPauses.length === 0 || p.start > mergedPauses[mergedPauses.length - 1].end + 0.08) {
        mergedPauses.push({ ...p });
      } else {
        const last = mergedPauses[mergedPauses.length - 1];
        last.end = Math.max(last.end, p.end);
        last.duration = +(last.end - last.start).toFixed(2);
      }
    }

    const windows: { start: number; end: number }[] = [];
    let curStart = 0;
    const MAX_WIN_SEC = 18.0;
    const MIN_UTTERANCE_SEC = 1.0;

    for (const p of mergedPauses) {
      if (p.start <= 0.12 && curStart === 0) {
        curStart = p.end;
        continue;
      }
      const uttDur = p.start - curStart;
      if (uttDur >= MIN_UTTERANCE_SEC) {
        let winCursor = Math.max(0, +(curStart - 0.06).toFixed(2));
        const targetEnd = Math.min(actualAudioDur, +(p.start + 0.06).toFixed(2));
        while (targetEnd - winCursor > MAX_WIN_SEC) {
          windows.push({ start: winCursor, end: +(winCursor + MAX_WIN_SEC).toFixed(2) });
          winCursor = +(winCursor + MAX_WIN_SEC).toFixed(2);
        }
        if (targetEnd - winCursor >= 0.25) {
          windows.push({ start: winCursor, end: targetEnd });
        }
        curStart = p.end;
      } else if (uttDur < 0.20) {
        curStart = p.end;
      }
    }

    if (actualAudioDur - curStart >= 0.30) {
      let winCursor = Math.max(0, +(curStart - 0.06).toFixed(2));
      while (actualAudioDur - winCursor > MAX_WIN_SEC) {
        windows.push({ start: winCursor, end: +(winCursor + MAX_WIN_SEC).toFixed(2) });
        winCursor = +(winCursor + MAX_WIN_SEC).toFixed(2);
      }
      if (actualAudioDur - winCursor >= 0.25) {
        windows.push({ start: winCursor, end: actualAudioDur });
      }
    }

    if (windows.length === 0) {
      windows.push({ start: 0, end: actualAudioDur });
    }

    const collectedWords: TranscriptWord[] = [];
    for (const win of windows) {
      const i0 = Math.max(0, Math.floor(win.start * sampleRate));
      const i1 = Math.min(audioData.length, Math.ceil(win.end * sampleRate));
      if (i1 - i0 < sampleRate * 0.15) continue;

      const sliceAudio = audioData.subarray(i0, i1);
      const winDur = +(win.end - win.start).toFixed(2);

      const opts: Record<string, any> = {
        return_timestamps: "word",
        chunk_length_s: WHISPER_CHUNK_LENGTH_S,
        stride_length_s: WHISPER_STRIDE_LENGTH_S,
      };

      const result: any = await cachedWhisperPipelines[WHISPER_MODEL_ID](sliceAudio, opts);
      if (result && Array.isArray(result.chunks) && result.chunks.length > 0) {
        let lastRelStart = 0;
        for (const c of result.chunks) {
          const rawToken = String(c.text || "").trim();
          const cleanText = rawToken.replace(/[.,!?;:]/g, "").trim();
          if (!cleanText) continue;

          let relStart = Array.isArray(c.timestamp) && typeof c.timestamp[0] === "number" ? c.timestamp[0] : lastRelStart;
          let relEnd = Array.isArray(c.timestamp) && typeof c.timestamp[1] === "number" ? c.timestamp[1] : relStart + 0.22;

          // Discard backward-jumping hallucinated duplicate chunks inside a window
          if (relStart < lastRelStart - 1.2) {
            continue;
          }
          // Discard tokens starting beyond the actual window duration
          if (relStart > winDur + 0.05) {
            continue;
          }
          if (relEnd > winDur) {
            relEnd = winDur;
          }
          lastRelStart = Math.max(lastRelStart, relStart);

          collectedWords.push({
            word: rawToken,
            start: +(win.start + relStart).toFixed(2),
            end: +(win.start + relEnd).toFixed(2),
            confidence: 0.95,
          });
        }
      }
    }

    return collectedWords.length > 0 ? collectedWords : null;
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
  await execFileAsync(getFfmpegPath(), [
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
    const { stderr } = await execFileAsync(getFfmpegPath(), [
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

  // Filter out empty or whitespace-only tokens while tracking which tokens ended with sentence punctuation
  const rawEndsWithSentencePunct: boolean[] = [];
  let words: TranscriptWord[] = [];
  for (const w of rawWords) {
    const rawStr = String(w.word || "").trim();
    const cleanWord = rawStr.replace(/[.,!?;:]/g, "").trim();
    if (!cleanWord) continue;
    rawEndsWithSentencePunct.push(/[.?!]$/.test(rawStr));
    words.push({
      word: cleanWord,
      start: Number.isFinite(w.start) ? +w.start.toFixed(2) : 0,
      end: Number.isFinite(w.end) ? +w.end.toFixed(2) : 0,
      confidence: Number.isFinite(w.confidence) ? w.confidence : 0.85,
    });
  }

  if (words.length === 0) return [];

  // 1. Discard backward-jumping duplicate chunk hallucinations, or repair true 0-reset chunk offsets
  const dedupedWords: TranscriptWord[] = [];
  const dedupedPunct: boolean[] = [];
  for (let i = 0; i < words.length; i++) {
    const curr = words[i];
    if (dedupedWords.length > 0) {
      const prev = dedupedWords[dedupedWords.length - 1];
      if (curr.start < prev.start - 1.2) {
        // Check if this backward jump is a duplicate hallucination of words already transcribed around curr.start
        const earlierMatch = dedupedWords.some(
          (ew) =>
            Math.abs(ew.start - curr.start) <= 1.5 &&
            ew.word.toLowerCase() === curr.word.toLowerCase()
        );
        if (earlierMatch) {
          continue;
        }
        // Only shift if curr.start reset near 0 (< 1.0s) after > 10s of audio
        if (curr.start < 1.0 && prev.end > 10.0) {
          const shift = +(prev.end + 0.08 - curr.start).toFixed(2);
          for (let j = i; j < words.length; j++) {
            words[j].start = +(words[j].start + shift).toFixed(2);
            words[j].end = +(words[j].end + shift).toFixed(2);
          }
        } else {
          curr.start = prev.end;
          if (curr.end <= curr.start) {
            curr.end = +(curr.start + 0.18).toFixed(2);
          }
        }
      }
    }
    dedupedWords.push(curr);
    dedupedPunct.push(rawEndsWithSentencePunct[i]);
  }
  words = dedupedWords;

  // 2. Fix zero-duration and inverted-duration tokens (e.g. [5.38, 5.38] before [5.38, 5.54])
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.end <= w.start) {
      const naturalDur = Math.max(0.16, Math.min(0.42, +(w.word.length * 0.055).toFixed(2)));
      const prevEnd = i > 0 ? words[i - 1].end : 0;
      const prevEndedSentence = i > 0 && dedupedPunct[i - 1];
      const latestSilEnd = silences
        .filter((s) => s.end <= w.start + 0.05)
        .reduce((maxE, s) => Math.max(maxE, s.end), 0);
      const minAvailStart = Math.max(prevEnd, latestSilEnd);

      // If previous word ended a sentence (e.g. "video." or "edits.") and the next word shares w.start,
      // split [w.start, next.end] forward so we preserve the inter-sentence pause before w.start!
      if (
        prevEndedSentence &&
        i < words.length - 1 &&
        Math.abs(words[i + 1].start - w.start) <= 0.06 &&
        words[i + 1].end > w.start + 0.16
      ) {
        const span = words[i + 1].end - w.start;
        const splitPoint = +(w.start + Math.min(naturalDur, span * 0.45)).toFixed(2);
        w.end = splitPoint;
        words[i + 1].start = splitPoint;
      } else if (
        i < words.length - 1 &&
        Math.abs(words[i + 1].start - w.start) <= 0.06 &&
        w.start - minAvailStart >= 0.08
      ) {
        const T = w.start;
        w.start = +Math.max(minAvailStart, +(T - naturalDur).toFixed(2)).toFixed(2);
        w.end = +T.toFixed(2);
      } else {
        const nextStart = i < words.length - 1 ? words[i + 1].start : totalDuration;
        if (nextStart > w.start + 0.06) {
          w.end = +Math.min(nextStart - 0.02, w.start + naturalDur).toFixed(2);
        } else if (i < words.length - 1 && words[i + 1].end > w.start + 0.12) {
          // Share the interval [w.start, words[i+1].end] with the next token without cascading forward
          const span = words[i + 1].end - w.start;
          const splitPoint = +(w.start + Math.min(naturalDur, span * 0.45)).toFixed(2);
          w.end = splitPoint;
          words[i + 1].start = splitPoint;
        } else {
          w.end = +(w.start + 0.16).toFixed(2);
        }
      }
    }
  }

  // 3. Align word boundaries against detected acoustic silences (never leave silence inside a word)
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    for (const s of silences) {
      // Case A: Silence covers the start of the word (e.g. [0, 1.88] with silence [0, 1.62])
      if (s.start <= w.start + 0.08 && s.end > w.start && s.end < w.end - 0.06) {
        w.start = +s.end.toFixed(2);
      }
      // Case B: Silence covers the end of the word (e.g. [3.88, 4.98] with silence [4.53, 5.11])
      else if (s.start > w.start + 0.06 && s.start < w.end && s.end >= w.end - 0.08) {
        w.end = +s.start.toFixed(2);
      }
      // Case C: Silence falls strictly inside an elongated word (e.g. [44.56, 46.54] with silence [45.81, 46.12])
      else if (w.start + 0.06 < s.start && s.end < w.end - 0.06) {
        const beforeDur = s.start - w.start;
        const afterDur = w.end - s.end;
        if (beforeDur <= afterDur) {
          w.start = +s.end.toFixed(2);
        } else {
          w.end = +s.start.toFixed(2);
        }
      }
    }

    // Tighten implausibly long word durations (> 1.1s for short words, > 1.6s for long words)
    const dur = +(w.end - w.start).toFixed(2);
    const maxAllowed = w.word.length <= 5 ? 0.85 : 1.35;
    if (dur > maxAllowed) {
      const naturalDur = Math.max(0.24, Math.min(0.65, +(w.word.length * 0.075).toFixed(2)));
      // Check if followed immediately by next word (meaning silence was BEFORE this word)
      const nextWord = i < words.length - 1 ? words[i + 1] : null;
      const prevWord = i > 0 ? words[i - 1] : null;
      const tightToNext = nextWord && Math.abs(nextWord.start - w.end) <= 0.08;
      const tightToPrev = prevWord && Math.abs(w.start - prevWord.end) <= 0.08;
      if (tightToNext && !tightToPrev) {
        w.start = +Math.max(prevWord ? prevWord.end : 0, +(w.end - naturalDur).toFixed(2)).toFixed(2);
      } else {
        w.end = +(w.start + naturalDur).toFixed(2);
      }
    }
  }

  // 4. Enforce strict sequential monotonicity and non-overlapping word boundaries within [0, totalDuration]
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && words[i].start < words[i - 1].end) {
      words[i].start = words[i - 1].end;
    }
    words[i].start = Math.max(0, Math.min(+(totalDuration - 0.05).toFixed(2), +words[i].start.toFixed(2)));
    if (words[i].end <= words[i].start) {
      words[i].end = +Math.min(totalDuration, +(words[i].start + 0.14).toFixed(2)).toFixed(2);
    }
    words[i].end = Math.min(totalDuration, +words[i].end.toFixed(2));
  }

  return words.filter((w) => w.end > w.start && w.start < totalDuration);
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

  // Detect silences for precise natural speech pauses (threshold -32dB, min 0.25s)
  const silences = await detectSilences(wavPath, -32, 0.25);

  let rawWords: TranscriptWord[] = [];
  let source: "whisper" | "script_fallback" = "whisper";

  // 1. Genuine speech transcription using local Whisper model (silence-windowed for zero stride drops)
  const whisperWords = await runWhisperTranscription(wavPath, silences, totalDuration);
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

  // Track sentence-ending punctuation from rawWords before sanitization strips punctuation
  const sentenceEndTimes = new Set<string>();
  for (const rw of rawWords) {
    if (/[.?!]$/.test(String(rw.word || "").trim())) {
      sentenceEndTimes.add(`${rw.word.replace(/[.,!?;:]/g, "").trim().toLowerCase()}@${Math.round(rw.start * 2)}`);
    }
  }

  // Apply real speech alignment, de-chunking, and duration sanitization
  const words = sanitizeAndAlignWordTimestamps({
    rawWords,
    silences,
    totalDuration,
  });

  // Group into natural spoken utterance / clause segments bounded by sentence punctuation, acoustic silences, and pauses (>= 0.24s)
  const segments: TranscriptSegment[] = [];
  let curSegWords: TranscriptWord[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (curSegWords.length > 0) {
      const prevW = curSegWords[curSegWords.length - 1];
      const gap = +(w.start - prevW.end).toFixed(2);
      const hasSilenceBetween = silences.some(
        (s) => s.start >= prevW.end - 0.06 && s.end <= w.start + 0.06 && s.duration >= 0.24
      );
      const prevEndedSentence =
        sentenceEndTimes.has(`${prevW.word.toLowerCase()}@${Math.round(prevW.start * 2)}`) ||
        sentenceEndTimes.has(`${prevW.word.toLowerCase()}@${Math.round(prevW.end * 2)}`);
      if (gap >= 0.24 || hasSilenceBetween || prevEndedSentence || (curSegWords.length >= 14 && gap >= 0.14)) {
        segments.push({
          id: segments.length + 1,
          start: curSegWords[0].start,
          end: curSegWords[curSegWords.length - 1].end,
          text: curSegWords.map((cw) => cw.word).join(" "),
          words: curSegWords,
        });
        curSegWords = [];
      }
    }
    curSegWords.push(w);
  }
  if (curSegWords.length > 0) {
    segments.push({
      id: segments.length + 1,
      start: curSegWords[0].start,
      end: curSegWords[curSegWords.length - 1].end,
      text: curSegWords.map((cw) => cw.word).join(" "),
      words: curSegWords,
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
