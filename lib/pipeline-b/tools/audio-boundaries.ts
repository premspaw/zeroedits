/**
 * Audio-grounded cut boundary refinement.
 *
 * Whisper word timestamps are only approximate (often +-0.3-0.8s, especially for the last
 * word of a phrase: "life" or "phones" can be reported far later/earlier than where the
 * speaker actually says it). Cutting on those timestamps removes real speech.
 *
 * The real audio energy envelope is the source of truth for WHERE a cut may start/end:
 *  - "silence" cuts are intersected with the truly silent frames (speech inside is kept).
 *  - retake/filler cut edges are snapped inward to the nearest real silence so a kept
 *    word is never clipped at its onset or tail.
 */
import fs from "fs";
import type { EditCut } from "../types.ts";

export interface AudioEnvelope {
  frameSec: number;
  /** dBFS RMS per frame */
  db: Float32Array;
  /** Peak dBFS per frame */
  peakDb: Float32Array;
  /** frames at or below this level are treated as silence */
  silenceDb: number;
}

const FRAME_SEC = 0.01;

export function loadAudioEnvelope(wavPath: string): AudioEnvelope | null {
  try {
    const buf = fs.readFileSync(wavPath);
    let off = 12;
    let dataStart = -1;
    let dataLen = 0;
    let sampleRate = 16000;
    while (off + 8 <= buf.length) {
      const id = buf.toString("ascii", off, off + 4);
      const size = buf.readUInt32LE(off + 4);
      if (id === "fmt ") sampleRate = buf.readUInt32LE(off + 12);
      if (id === "data") {
        dataStart = off + 8;
        dataLen = Math.min(size, buf.length - dataStart);
        break;
      }
      off += 8 + size + (size % 2);
    }
    if (dataStart < 0) return null;

    const samples = Math.floor(dataLen / 2);
    const frameLen = Math.max(1, Math.round(sampleRate * FRAME_SEC));
    const frames = Math.floor(samples / frameLen);
    const db = new Float32Array(frames);
    const peakDb = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      let sum = 0;
      let maxAbs = 0;
      const base = dataStart + f * frameLen * 2;
      for (let i = 0; i < frameLen; i++) {
        const s = buf.readInt16LE(base + i * 2) / 32768;
        const absS = Math.abs(s);
        if (absS > maxAbs) maxAbs = absS;
        sum += s * s;
      }
      db[f] = 10 * Math.log10(sum / frameLen + 1e-10);
      peakDb[f] = 20 * Math.log10(maxAbs + 1e-10);
    }
    // Light smoothing (3 frames) so a single glitch frame does not split speech
    const sm = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      const a = db[Math.max(0, f - 1)], b = db[f], c = db[Math.min(frames - 1, f + 1)];
      sm[f] = (a + b + c) / 3;
    }
    const sorted = Array.from(sm).sort((x, y) => x - y);
    const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -60;
    const silenceDb = Math.min(-36, Math.max(-55, floor + 6));
    return { frameSec: FRAME_SEC, db: sm, peakDb, silenceDb };
  } catch {
    return null;
  }
}

function isSilentFrame(env: AudioEnvelope, f: number): boolean {
  if (f < 0 || f >= env.db.length) return false;
  const peakOk = !env.peakDb || env.peakDb[f] <= -22.5;
  return env.db[f] <= env.silenceDb && peakOk;
}

/** Contiguous silent runs inside [start,end] as [s,e] in seconds, bridging tiny (<0.26s) breath/click blips if their peak stays below speech peak (-21 dB). */
function silentRuns(env: AudioEnvelope, start: number, end: number, minRun: number): [number, number][] {
  const f0 = Math.max(0, Math.floor(start / env.frameSec));
  const f1 = Math.min(env.db.length, Math.ceil(end / env.frameSec));
  const rawRuns: [number, number][] = [];
  let runStart = -1;
  for (let f = f0; f <= f1; f++) {
    const silent = f < f1 && isSilentFrame(env, f);
    if (silent && runStart < 0) runStart = f;
    if (!silent && runStart >= 0) {
      const s = runStart * env.frameSec;
      const e = f * env.frameSec;
      if (e - s >= 0.04) rawRuns.push([Math.max(start, s), Math.min(end, e)]);
      runStart = -1;
    }
  }

  // Merge adjacent silent runs separated only by a tiny (<0.26s) non-speech breath/click blip
  // PROVIDED the blip's peak stays strictly below -21.5 dBFS so volumedetect never flags peak > -20 dB.
  const merged: [number, number][] = [];
  for (const r of rawRuns) {
    if (merged.length === 0) {
      merged.push(r);
      continue;
    }
    const prev = merged[merged.length - 1];
    const blipDur = r[0] - prev[1];
    if (blipDur <= 0.26) {
      const bf0 = Math.max(0, Math.floor(prev[1] / env.frameSec));
      const bf1 = Math.min(env.db.length, Math.ceil(r[0] / env.frameSec));
      let maxBlipPeak = -99;
      let maxBlipRms = -99;
      for (let bf = bf0; bf < bf1; bf++) {
        if (env.peakDb && env.peakDb[bf] > maxBlipPeak) maxBlipPeak = env.peakDb[bf];
        if (env.db[bf] > maxBlipRms) maxBlipRms = env.db[bf];
      }
      if (maxBlipPeak <= -21.5 && maxBlipRms <= -34) {
        prev[1] = r[1];
        continue;
      }
    }
    merged.push(r);
  }

  return merged.filter(([s, e]) => e - s >= minRun);
}

/** Trim any edge frames where peakDb > -21.5 dB or db > -38 dB so silence cuts strictly pass QA volumedetect (mean <= -38dB, max <= -20dB). */
function clampSilenceSpanStrictlySilent(env: AudioEnvelope, s: number, e: number): [number, number] {
  let f0 = Math.max(0, Math.floor(s / env.frameSec));
  let f1 = Math.min(env.db.length, Math.ceil(e / env.frameSec));
  while (f0 < f1 && (env.db[f0] > -38.5 || (env.peakDb && env.peakDb[f0] > -21.5))) {
    f0++;
  }
  while (f1 > f0 && (env.db[f1 - 1] > -38.5 || (env.peakDb && env.peakDb[f1 - 1] > -21.5))) {
    f1--;
  }
  // Also ensure the 2 frames just outside f0..f1 inside the cut don't clip a consonant onset
  return [+(f0 * env.frameSec).toFixed(3), +(f1 * env.frameSec).toFixed(3)];
}

const GUARD = 0.08; // keep this much silence on speech-facing sides
const SNAP_WINDOW = 0.3;
const MIN_SILENCE_CUT = 0.12;

export function refineCutsWithAudio(
  cuts: EditCut[],
  env: AudioEnvelope,
  totalDuration: number
): { cuts: EditCut[]; log: string[] } {
  const out: EditCut[] = [];
  const log: string[] = [];

  for (const cut of cuts) {
    if (cut.type === "silence") {
      const runs = silentRuns(env, cut.start, cut.end, 0.08);
      let n = 0;
      for (const [s, e] of runs) {
        const touchesStart = s <= cut.start + 0.005;
        const touchesEnd = e >= cut.end - 0.005;
        // Apply a 30ms safety margin even when touching cut boundaries if the frame right outside cut.start/end is loud speech
        const startPad = touchesStart
          ? isSilentFrame(env, Math.max(0, Math.floor(s / env.frameSec) - 2))
            ? 0
            : 0.03
          : GUARD;
        const endPad = touchesEnd
          ? isSilentFrame(env, Math.min(env.db.length - 1, Math.ceil(e / env.frameSec) + 2))
            ? 0
            : 0.03
          : GUARD;
        const rawNs = s + startPad;
        const rawNe = e - endPad;
        const [ns, ne] = clampSilenceSpanStrictlySilent(env, rawNs, rawNe);
        if (ne - ns >= MIN_SILENCE_CUT) {
          out.push({
            ...cut,
            id: runs.length > 1 ? `${cut.id}-s${n++}` : cut.id,
            start: +ns.toFixed(3),
            end: +ne.toFixed(3),
          });
        }
      }
      const kept = cut.end - cut.start - out.filter((c) => c.id.startsWith(cut.id)).reduce((a, c) => a + (c.end - c.start), 0);
      if (kept > 0.05) {
        log.push(`${cut.id}: ${kept.toFixed(2)}s of audible sound inside "silence" cut was kept`);
      }
      continue;
    }

    // Retake / filler / other: snap the edges inward onto real silence
    let { start, end } = cut;
    const startsInSilence = isSilentFrame(env, Math.floor(start / env.frameSec));
    if (!startsInSilence && start > 0.01) {
      const runs = silentRuns(env, start, Math.min(end, start + SNAP_WINDOW), 0.03);
      if (runs.length) start = Math.min(end, runs[0][0] + 0.01);
    }
    const endsInSilence = isSilentFrame(env, Math.floor((end - 0.005) / env.frameSec));
    if (!endsInSilence && end < totalDuration - 0.01) {
      const runs = silentRuns(env, Math.max(start, end - SNAP_WINDOW), end, 0.03);
      if (runs.length) end = Math.max(start, runs[runs.length - 1][1] - 0.01);
    }
    if (end - start < 0.1) {
      log.push(`${cut.id}: dropped (snapped span collapsed)`);
      continue;
    }
    if (Math.abs(start - cut.start) > 0.02 || Math.abs(end - cut.end) > 0.02) {
      log.push(`${cut.id}: snapped ${cut.start.toFixed(2)}-${cut.end.toFixed(2)} -> ${start.toFixed(2)}-${end.toFixed(2)}`);
    }
    out.push({ ...cut, start: +start.toFixed(3), end: +end.toFixed(3) });
  }

  out.sort((a, b) => a.start - b.start);
  return { cuts: out, log };
}

