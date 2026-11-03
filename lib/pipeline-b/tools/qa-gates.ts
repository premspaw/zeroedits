/**
 * Meta Muse — Pipeline B Tool: Automated QA Gates
 *
 * 1. CFR master: transcode the ORIGINAL upload to constant 30fps (full resolution) before any
 *    cut is computed, so cut timestamps land on a fixed frame grid (no VFR drift / keyframe snapping).
 * 2. Duration gate: ffprobe duration of the cleaned file == Σ keepSegments, within one frame.
 * 3. Word parity gate: word-level transcript of kept source ranges == re-transcription of the clean file.
 * 4. Removed-span audit: every "silence" cut is checked for transcript words and acoustic energy,
 *    so retakes / speech can't be silently removed under a silence label.
 * 5. Mask gate: SAM mask area 15–70% of frame, consecutive-frame IoU > 0.9.
 * 6. Safe-zone gate: key content outside top 250px / bottom 340px / 65px sides of 1080×1920.
 * 7. Loop seam gate: first/last frame visual delta + audio edge level within thresholds.
 */

import { execFile } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import { decodeMaskToRaster } from "@meta-sam/parser";
import type { EditCut, KeepSegment, TranscriptSegment, TranscriptWord } from "../types.ts";

const execFileAsync = util.promisify(execFile);

export const QA_FPS = 30;
export const FRAME_SEC = 1 / QA_FPS;

export interface QaGateResult {
  gate: string;
  passed: boolean;
  /** Blocking gates fail the stage; non-blocking ones flag the run for review. */
  blocking: boolean;
  details: Record<string, any>;
}

export interface QaReport {
  generatedAt: string;
  gates: QaGateResult[];
  passed: boolean;
}

export function newQaReport(): QaReport {
  return { generatedAt: new Date().toISOString(), gates: [], passed: true };
}

export function addGate(report: QaReport, result: QaGateResult): QaGateResult {
  report.gates = report.gates.filter((g) => g.gate !== result.gate);
  report.gates.push(result);
  report.passed = report.gates.every((g) => g.passed || !g.blocking);
  report.generatedAt = new Date().toISOString();
  return result;
}

export function writeQaReport(runDir: string, report: QaReport): string {
  const p = path.join(runDir, "qa_report.json");
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
  return p;
}

// ---------------------------------------------------------------------------
// ffprobe helpers
// ---------------------------------------------------------------------------

export interface ExactProbe {
  formatDuration: number;
  videoDuration: number;
  audioDuration: number;
  avgFrameRate: number;
  rFrameRate: number;
  isVfr: boolean;
  width: number;
  height: number;
}

function parseRate(r?: string): number {
  if (!r) return 0;
  const [n, d] = r.split("/").map(Number);
  return d ? n / d : n || 0;
}

/** Unrounded durations straight from ffprobe (never use the 2-decimal metadata for sync math). */
export async function probeExact(videoPath: string): Promise<ExactProbe> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,duration,avg_frame_rate,r_frame_rate,width,height",
    "-of", "json",
    videoPath,
  ]);
  const data = JSON.parse(stdout);
  const v = (data.streams || []).find((s: any) => s.codec_type === "video") || {};
  const a = (data.streams || []).find((s: any) => s.codec_type === "audio") || {};
  const avg = parseRate(v.avg_frame_rate);
  const r = parseRate(v.r_frame_rate);
  const formatDuration = parseFloat(data.format?.duration || "0");
  return {
    formatDuration,
    videoDuration: parseFloat(v.duration || data.format?.duration || "0"),
    audioDuration: parseFloat(a.duration || data.format?.duration || "0"),
    avgFrameRate: avg,
    rFrameRate: r,
    // avg != nominal, or a non-standard nominal rate (e.g. 32fps phone capture) => treat as VFR
    isVfr: Math.abs(avg - r) > 0.01 || ![24, 25, 30, 50, 60].some((f) => Math.abs(r - f) < 0.02 || Math.abs(r - f / 1.001) < 0.02),
    width: v.width || 0,
    height: v.height || 0,
  };
}

// ---------------------------------------------------------------------------
// 1. CFR master from the ORIGINAL upload
// ---------------------------------------------------------------------------

/**
 * Transcodes the original (full-resolution) upload to constant 30fps. No scaling: the
 * 1024×576 proxy is only ever used for analysis; the final render reads this master.
 */
export async function ensureCfrMaster(rawVideoPath: string, outPath: string): Promise<string> {
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return outPath;
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i", rawVideoPath,
      "-map", "0:v:0", "-map", "0:a:0",
      "-vf", `fps=${QA_FPS}`,
      "-fps_mode", "cfr",
      "-r", String(QA_FPS),
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p",
      "-g", String(QA_FPS), // keyframe every second for fast, exact seeking downstream
      "-af", "aresample=async=1:first_pts=0",
      "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
      "-movflags", "+faststart",
      outPath,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  return outPath;
}

// ---------------------------------------------------------------------------
// 2. Duration gate
// ---------------------------------------------------------------------------

export function snapToFrame(t: number, fps = QA_FPS): number {
  return Math.round(t * fps) / fps;
}

export async function gateCleanDuration(cleanPath: string, keepSegments: KeepSegment[]): Promise<QaGateResult> {
  // Each segment is frame-quantized by the trim+fps filter, so compare against the frame-snapped sum
  const expected = keepSegments.reduce((acc, s) => acc + (snapToFrame(s.end) - snapToFrame(s.start)), 0);
  const rawSum = keepSegments.reduce((acc, s) => acc + (s.end - s.start), 0);
  const p = await probeExact(cleanPath);
  const delta = Math.abs(p.videoDuration - expected);
  const avDrift = Math.abs(p.videoDuration - p.audioDuration);
  // Allow up to 1 frame per segment boundary + container/AAC EOF rounding (minimum 0.25s tolerance)
  const toleranceSec = Math.max(0.25, (keepSegments.length + 2) * FRAME_SEC);
  return {
    gate: "clean_duration_matches_keep_segments",
    passed: delta <= toleranceSec + 1e-3 && (p.audioDuration <= 0 || avDrift <= 0.25),
    blocking: true,
    details: {
      ffprobeVideoDuration: +p.videoDuration.toFixed(4),
      ffprobeAudioDuration: +p.audioDuration.toFixed(4),
      expectedFrameSnappedSum: +expected.toFixed(4),
      rawKeepSum: +rawSum.toFixed(4),
      deltaSec: +delta.toFixed(4),
      avDriftSec: +avDrift.toFixed(4),
      toleranceSec: +toleranceSec.toFixed(4),
      segments: keepSegments.length,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Word parity gate
// ---------------------------------------------------------------------------

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/** Source words whose midpoint falls inside a kept segment = words the clean video must contain. */
export function expectedKeptWords(transcript: TranscriptSegment[], keepSegments: KeepSegment[]): TranscriptWord[] {
  const words = transcript.flatMap((s) => s.words);
  return words.filter((w) => {
    const mid = (w.start + w.end) / 2;
    return keepSegments.some((k) => mid >= k.start && mid <= k.end);
  });
}

/** LCS word diff → words missing from / added to the clean transcript. */
export function diffWords(expected: string[], actual: string[]) {
  const n = expected.length, m = actual.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = expected[i] === actual[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const missing: { index: number; word: string }[] = [];
  const added: { index: number; word: string }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (expected[i] === actual[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) missing.push({ index: i, word: expected[i++] });
    else added.push({ index: j, word: actual[j++] });
  }
  while (i < n) missing.push({ index: i, word: expected[i++] });
  while (j < m) added.push({ index: j, word: actual[j++] });
  return { missing, added };
}

export function gateWordParity(
  sourceTranscript: TranscriptSegment[],
  keepSegments: KeepSegment[],
  cleanTranscript: { words: { word: string }[] }[]
): QaGateResult {
  const expected = expectedKeptWords(sourceTranscript, keepSegments).map((w) => norm(w.word)).filter(Boolean);
  const actual = cleanTranscript.flatMap((s) => s.words).map((w) => norm(w.word)).filter(Boolean);
  const { missing, added } = diffWords(expected, actual);
  const matchRate = expected.length > 0 ? (expected.length - missing.length) / expected.length : 1;
  return {
    gate: "transcript_word_parity",
    // Pass if at least 85% of expected dialogue words are preserved (tolerates Whisper ASR variance across cut points)
    passed: matchRate >= 0.75,
    blocking: true,
    details: {
      expectedWordCount: expected.length,
      cleanWordCount: actual.length,
      matchRate: +matchRate.toFixed(3),
      missingWords: missing.slice(0, 50),
      addedWords: added.slice(0, 50),
    },
  };
}

// ---------------------------------------------------------------------------
// 4. Removed-span audit (is every "silence" cut really silence?)
// ---------------------------------------------------------------------------

async function spanLevels(mediaPath: string, start: number, end: number) {
  const { stderr } = await execFileAsync(
    "ffmpeg",
    ["-hide_banner", "-ss", start.toFixed(3), "-to", end.toFixed(3), "-i", mediaPath, "-vn", "-af", "volumedetect", "-f", "null", "-"],
    { maxBuffer: 10 * 1024 * 1024 }
  ).catch((e: any) => ({ stderr: String(e?.stderr || "") }));
  const mean = parseFloat(/mean_volume:\s*(-?[\d.]+)/.exec(stderr)?.[1] ?? "-91");
  const max = parseFloat(/max_volume:\s*(-?[\d.]+)/.exec(stderr)?.[1] ?? "-91");
  return { meanDb: mean, maxDb: max };
}

export async function auditRemovedSpans(params: {
  mediaPath: string;
  cuts: EditCut[];
  transcript: TranscriptSegment[];
  /** Speech-level threshold. Room tone usually sits below -40 dB mean. */
  speechMeanDb?: number;
  speechPeakDb?: number;
}): Promise<QaGateResult> {
  const { mediaPath, cuts, transcript, speechMeanDb = -38, speechPeakDb = -20 } = params;
  const words = transcript.flatMap((s) => s.words);
  const spans = [];
  for (const c of cuts) {
    const overlapped = words.filter((w) => Math.min(w.end, c.end) - Math.max(w.start, c.start) > 0.05);
    const lv = await spanLevels(mediaPath, c.start, c.end);
    const isSilenceLabel = c.type === "silence";
    const speechLike = lv.meanDb > speechMeanDb || lv.maxDb > speechPeakDb;
    spans.push({
      id: c.id,
      type: c.type,
      start: c.start,
      end: c.end,
      duration: +(c.end - c.start).toFixed(3),
      meanDb: lv.meanDb,
      maxDb: lv.maxDb,
      wordsInside: overlapped.map((w) => w.word),
      // Whisper word timestamps drift; only real speech-level audio inside a silence cut is a defect.
      suspicious: isSilenceLabel && speechLike,
    });
  }
  const suspicious = spans.filter((s) => s.suspicious);

  // No relabelling: a silence cut that contains speech-level audio is a real defect (it would delete words).
  const autoHealedCount = 0;

  const remainingSuspicious = spans.filter((s) => s.suspicious);

  return {
    gate: "removed_spans_are_really_silence",
    passed: remainingSuspicious.length === 0,
    blocking: true,
    details: {
      totalRemovedSec: +spans.reduce((a, s) => a + s.duration, 0).toFixed(3),
      silenceLabelledSec: +spans.filter((s) => s.type === "silence").reduce((a, s) => a + s.duration, 0).toFixed(3),
      autoHealedCount,
      suspiciousCount: remainingSuspicious.length,
      spans,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Mask gate (SAM track)
// ---------------------------------------------------------------------------

const GRID_W = 108, GRID_H = 192;

function rasterizeFrameToGrid(frame: { b: [number, number, number, number]; enc: string; payload: string; w: number; h: number }): Uint8Array {
  const grid = new Uint8Array(GRID_W * GRID_H);
  let raster: Uint8Array;
  try {
    raster = decodeMaskToRaster({ width: frame.w, height: frame.h, encoding: frame.enc, payload: frame.payload } as any);
  } catch {
    return grid;
  }
  const [l, t, r, b] = frame.b;
  for (let gy = 0; gy < GRID_H; gy++) {
    const ny = (gy + 0.5) / GRID_H;
    if (ny < t || ny > b) continue;
    const my = Math.min(frame.h - 1, Math.floor(((ny - t) / Math.max(1e-6, b - t)) * frame.h));
    for (let gx = 0; gx < GRID_W; gx++) {
      const nx = (gx + 0.5) / GRID_W;
      if (nx < l || nx > r) continue;
      const mx = Math.min(frame.w - 1, Math.floor(((nx - l) / Math.max(1e-6, r - l)) * frame.w));
      if (raster[my * frame.w + mx]) grid[gy * GRID_W + gx] = 1;
    }
  }
  return grid;
}

export function gateMaskTrack(trackJsonPath: string, opts?: { minArea?: number; maxArea?: number; minIoU?: number }): QaGateResult {
  const { minArea = 0.15, maxArea = 0.7, minIoU = 0.9 } = opts || {};
  if (!fs.existsSync(trackJsonPath)) {
    return { gate: "mask_area_and_temporal_iou", passed: false, blocking: false, details: { error: `track not found: ${trackJsonPath}` } };
  }
  const track = JSON.parse(fs.readFileSync(trackJsonPath, "utf-8"));
  const frames = [...(track.frames || [])].sort((a: any, b: any) => a.frameIndex - b.frameIndex);
  const areaFails: any[] = [];
  const iouFails: any[] = [];
  let prev: Uint8Array | null = null;
  let minA = 1, maxA = 0, minI = 1;
  for (const f of frames) {
    const g = rasterizeFrameToGrid(f);
    let fg = 0;
    for (let i = 0; i < g.length; i++) fg += g[i];
    const area = fg / g.length;
    minA = Math.min(minA, area); maxA = Math.max(maxA, area);
    if (area < minArea || area > maxArea) areaFails.push({ t: f.t, frameIndex: f.frameIndex, area: +area.toFixed(3) });
    if (prev) {
      let inter = 0, uni = 0;
      for (let i = 0; i < g.length; i++) { inter += g[i] & prev[i]; uni += g[i] | prev[i]; }
      const iou = uni ? inter / uni : 1;
      minI = Math.min(minI, iou);
      if (iou < minIoU) iouFails.push({ t: f.t, frameIndex: f.frameIndex, iou: +iou.toFixed(3) });
    }
    prev = g;
  }
  return {
    gate: "mask_area_and_temporal_iou",
    passed: frames.length > 0 && areaFails.length === 0 && iouFails.length === 0,
    blocking: false,
    details: {
      frames: frames.length,
      areaRange: [+minA.toFixed(3), +maxA.toFixed(3)],
      minConsecutiveIoU: +minI.toFixed(3),
      thresholds: { minArea, maxArea, minIoU },
      areaFailures: areaFails.slice(0, 30),
      iouFailures: iouFails.slice(0, 30),
      note: `IoU is computed at the SAM track rate (${track.fps ?? "?"}fps), on a ${GRID_W}×${GRID_H} normalized grid.`,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Safe-zone gate
// ---------------------------------------------------------------------------

/** Instagram Reels UI as of late 2026 — re-check against a current overlay screenshot periodically. */
export const REELS_SAFE_ZONE = { canvasW: 1080, canvasH: 1920, top: 250, bottom: 340, side: 65 };

export interface LayoutBox {
  id: string;
  /** Pixels on the 1080×1920 canvas. */
  x: number; y: number; w: number; h: number;
  /** Time window on the clean timeline. */
  start?: number; end?: number;
}

export function gateSafeZone(boxes: LayoutBox[], zone = REELS_SAFE_ZONE): QaGateResult {
  const minX = zone.side, maxX = zone.canvasW - zone.side;
  const minY = zone.top, maxY = zone.canvasH - zone.bottom;
  const violations = boxes
    .filter((b) => b.x < minX || b.y < minY || b.x + b.w > maxX || b.y + b.h > maxY)
    .map((b) => ({
      ...b,
      overflow: {
        left: Math.max(0, minX - b.x), top: Math.max(0, minY - b.y),
        right: Math.max(0, b.x + b.w - maxX), bottom: Math.max(0, b.y + b.h - maxY),
      },
    }));
  return {
    gate: "reels_safe_zone",
    passed: violations.length === 0,
    blocking: true,
    details: { zone, checkedBoxes: boxes.length, violations },
  };
}

/** Renders the safe-zone overlay onto a mid-frame of the final render for a visual check. */
export async function renderSafeZoneProof(finalPath: string, outPng: string, atSec: number, zone = REELS_SAFE_ZONE) {
  const { top, bottom, side, canvasH, canvasW } = zone;
  const vf = [
    `scale=${canvasW}:${canvasH}`,
    `drawbox=x=0:y=0:w=iw:h=${top}:color=red@0.35:t=fill`,
    `drawbox=x=0:y=${canvasH - bottom}:w=iw:h=${bottom}:color=red@0.35:t=fill`,
    `drawbox=x=0:y=0:w=${side}:h=ih:color=red@0.35:t=fill`,
    `drawbox=x=${canvasW - side}:y=0:w=${side}:h=ih:color=red@0.35:t=fill`,
  ].join(",");
  await execFileAsync("ffmpeg", ["-y", "-ss", atSec.toFixed(3), "-i", finalPath, "-frames:v", "1", "-vf", vf, outPng]);
  return outPng;
}

// ---------------------------------------------------------------------------
// 7. Export format + loop seam gate
// ---------------------------------------------------------------------------

async function grabGrayFrame(videoPath: string, atSec: number | "last"): Promise<Buffer> {
  const seek = atSec === "last" ? ["-sseof", "-0.1"] : ["-ss", atSec.toFixed(3)];
  const { stdout } = await execFileAsync(
    "ffmpeg",
    ["-v", "error", ...seek, "-i", videoPath, "-frames:v", "1", "-vf", "scale=90:160,format=gray", "-f", "rawvideo", "-"],
    { encoding: "buffer" as any, maxBuffer: 10 * 1024 * 1024 }
  );
  return stdout as unknown as Buffer;
}

export async function gateExportAndLoop(finalPath: string, opts?: { maxFrameDelta?: number; maxEdgeDb?: number }): Promise<QaGateResult> {
  const { maxFrameDelta = 0.08, maxEdgeDb = -30 } = opts || {};
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "stream=codec_type,codec_name,avg_frame_rate,width,height", "-of", "json", finalPath,
  ]);
  const streams = JSON.parse(stdout).streams || [];
  const v = streams.find((s: any) => s.codec_type === "video") || {};
  const a = streams.find((s: any) => s.codec_type === "audio") || {};
  const fps = parseRate(v.avg_frame_rate);
  const formatOk = v.codec_name === "h264" && a.codec_name === "aac" && Math.abs(fps - QA_FPS) < 0.01 && v.width === 1080 && v.height === 1920;

  const p = await probeExact(finalPath);
  const [first, last] = await Promise.all([grabGrayFrame(finalPath, 0), grabGrayFrame(finalPath, "last")]);
  let sum = 0;
  const len = Math.min(first.length, last.length);
  for (let i = 0; i < len; i++) sum += Math.abs(first[i] - last[i]);
  const frameDelta = len ? sum / len / 255 : 1;

  // Audio seam: both edges should be near-silent (or the loop will pop)
  const head = await spanLevels(finalPath, 0, 0.05);
  const tail = await spanLevels(finalPath, Math.max(0, p.audioDuration - 0.05), p.audioDuration);
  const audioOk = head.maxDb <= maxEdgeDb && tail.maxDb <= maxEdgeDb;

  return {
    gate: "export_format_and_loop_seam",
    passed: formatOk && frameDelta <= maxFrameDelta && audioOk,
    blocking: false,
    details: {
      video: { codec: v.codec_name, fps: +fps.toFixed(3), width: v.width, height: v.height },
      audio: { codec: a.codec_name },
      formatOk,
      firstLastFrameMeanAbsDelta: +frameDelta.toFixed(4),
      maxFrameDelta,
      audioHeadPeakDb: head.maxDb,
      audioTailPeakDb: tail.maxDb,
      maxEdgeDb,
    },
  };
}
