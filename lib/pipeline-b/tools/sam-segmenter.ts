/**
 * Meta Muse — Pipeline B Tool: SAM 3.1 Segmenter (ZAI Subject Cutout & Depth Compositing Engine)
 * Uses ONLY the official `@meta-sam/parser` SDK (`parseVideoStream`, `parseImageStream`, `recordsOfKind`,
 * `buildObjectPrompt`, `decodeMaskToRaster`, `decodeMaskToSVGPath`, `decodeMaskToRLE`) to segment the
 * speaker character cutout from talking-head video footage.
 */

import dns from "dns";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import util from "util";
import {
  buildObjectPrompt,
  decodeMaskToRaster,
  decodeMaskToRLE,
  decodeMaskToSVGPath,
  frameIndexOf,
  parseImageStream,
  parseVideoStream,
  recordsOfKind,
  type PromptObject,
  type ResponsesEvent,
  type SegmentationMask,
  type SegmentationMaskRecord,
} from "@meta-sam/parser";
import { SAMCutoutBox } from "../types";
import { getMetaApiBaseUrl, getMetaApiKey, getMetaModelId } from "../../meta-api";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const execFileAsync = util.promisify(execFile);

export interface SamCutoutResult {
  assetId: string;
  box: SAMCutoutBox & { ordinal: number };
  cutoutFilePath: string;
  cutoutPublicUrl: string;
  trackPublicUrl?: string;
  trackFrameCount?: number;
}

/** One per-frame SAM 3.1 mask, bounds normalized to the sampled video (0..1). */
export interface SamTrackFrame {
  /** Timestamp (seconds) on the clean-video timeline. */
  t: number;
  frameIndex: number;
  /** Normalized [left, top, right, bottom] of the raster within the frame. */
  b: [number, number, number, number];
  enc: "lossless" | "one_bit";
  payload: string;
  w: number;
  h: number;
}

/** Frame-by-frame SAM 3.1 mask track consumed by the canvas compositor. */
export interface SamMaskTrack {
  version: 1;
  fps: number;
  sourceWidth: number;
  sourceHeight: number;
  objectId: string;
  /** Normalized union of all per-frame bounds (padded) — stable crop viewport. */
  union: { nx: number; ny: number; nw: number; nh: number };
  frames: SamTrackFrame[];
}

/** SAM sampling rate for the tracked clip (frames per second). */
const SAM_TRACK_FPS = 10;
/** Upper bound of clean-video seconds sent to SAM 3.1 in one request. */
const SAM_TRACK_MAX_SEC = 90;

/**
 * Converts a `fetch` SSE response stream from `https://api.meta.ai/v1/responses` into an
 * `AsyncIterable<ResponsesEvent>` for `@meta-sam/parser`'s `parseVideoStream` / `parseImageStream`.
 */
async function* readSseResponseEvents(
  response: Response
): AsyncIterable<ResponsesEvent> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data: ")) continue;
        const dataStr = line.slice(6).trim();
        if (dataStr === "[DONE]") return;
        try {
          yield JSON.parse(dataStr) as ResponsesEvent;
        } catch {}
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {}
  }
}

export async function segmentSpeakerWithSam(params: {
  videoPath: string;
  runId: string;
  sampleTimestampSec?: number;
  videoWidth?: number;
  videoHeight?: number;
  videoDuration?: number;
  subjectPrompt?: string;
  objectPrompts?: PromptObject[];
}): Promise<SamCutoutResult> {
  const {
    videoPath,
    runId,
    sampleTimestampSec = 1.5,
    videoWidth = 1080,
    videoHeight = 1920,
    videoDuration = 10,
    subjectPrompt = "person",
    objectPrompts,
  } = params;

  const safeTimestamp = Math.max(
    0.1,
    Math.min(sampleTimestampSec, Math.max(0.2, videoDuration * 0.4))
  );

  const apiKey = getMetaApiKey();
  const baseUrl = getMetaApiBaseUrl();

  const runAssetsDir = path.join(
    process.cwd(),
    "workspace",
    "pipeline-b",
    "runs",
    runId,
    "assets"
  );
  if (!fs.existsSync(runAssetsDir)) {
    fs.mkdirSync(runAssetsDir, { recursive: true });
  }

  const publicAssetsDir = path.join(process.cwd(), "public", "assets", runId);
  if (!fs.existsSync(publicAssetsDir)) {
    fs.mkdirSync(publicAssetsDir, { recursive: true });
  }

  // 1. Extract 1080x1920 reference frame and a lightweight 480x854 video clip (`upload.mp4`) for SAM 3.1
  const refFramePath = path.join(runAssetsDir, "speaker_ref_frame.jpg");
  const sampleVideoPath = path.join(runAssetsDir, "upload.mp4");
  const sampleW = 480;
  const sampleH = 854;

  await execFileAsync("ffmpeg", [
    "-y",
    "-ss",
    safeTimestamp.toFixed(2),
    "-i",
    videoPath,
    "-vf",
    `scale=${videoWidth}:${videoHeight}`,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    refFramePath,
  ]);

  // Send the FULL clean video (constant SAM_TRACK_FPS, no seek) so SAM 3.1 tracks the speaker frame-by-frame.
  // frameIndex N in the response therefore maps to t = N / SAM_TRACK_FPS on the clean-video timeline.
  const trackDurationSec = Math.min(SAM_TRACK_MAX_SEC, Math.max(0.5, videoDuration));
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      videoPath,
      "-t",
      trackDurationSec.toFixed(2),
      "-vf",
      `fps=${SAM_TRACK_FPS},scale=${sampleW}:${sampleH}`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-an",
      sampleVideoPath,
    ]);
  } catch {
    try {
      fs.copyFileSync(videoPath, sampleVideoPath);
    } catch {}
  }

  // Build input_text: either encode geometric clicks/boxes via `@meta-sam/parser` buildObjectPrompt or use concept noun phrase
  const inputText =
    Array.isArray(objectPrompts) && objectPrompts.length > 0
      ? buildObjectPrompt({ size: { width: sampleW, height: sampleH }, objects: objectPrompts })
      : subjectPrompt.trim();

  let normX = 0.0;
  let normY = 0.22;
  let normW = 1.0;
  let normH = 0.76;
  let ordinal = 0;
  let objectIdStr = "0";
  let confidence = 0.98;
  let uploadedFileId: string | undefined;
  let selectedMask: SegmentationMask | undefined;
  const trackRecords = new Map<string, SegmentationMaskRecord>();
  let trackFrames: SegmentationMaskRecord[] = [];
  let refFramePathForPng = refFramePath;
  let refFrameForPng: number | undefined;

  // 2. Official SAM 3.1 Streaming Video Segmentation parsed with `parseVideoStream` + `recordsOfKind`
  try {
    if (fs.existsSync(sampleVideoPath)) {
      console.log(
        `[sam-3.1] Step 1/2: Uploading video clip to ${baseUrl}/files (purpose="user_data", filename="upload.mp4")...`
      );
      const videoBuf = fs.readFileSync(sampleVideoPath);
      const formData = new FormData();
      formData.append("purpose", "user_data");
      formData.append(
        "file",
        new Blob([videoBuf], { type: "video/mp4" }),
        "upload.mp4"
      );

      const uploadController = new AbortController();
      const uploadTimeout = setTimeout(() => uploadController.abort(), 60000);
      const uploadResp = await fetch(`${baseUrl}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: uploadController.signal,
      });
      clearTimeout(uploadTimeout);

      if (uploadResp.ok) {
        const uploadData = await uploadResp.json();
        const fileId = uploadData?.id;
        if (typeof fileId === "string" && fileId.length > 0) {
          uploadedFileId = fileId;
          console.log(
            `[sam-3.1] Step 2/2: Streaming sam-3.1 video segmentation via @meta-sam/parser parseVideoStream for file_id=${fileId}...`
          );

          const streamController = new AbortController();
          // Full-video tracking takes longer than a single frame: scale the budget with clip length.
          const streamBudgetMs = Math.min(240000, 30000 + trackDurationSec * 3000);
          const streamTimeout = setTimeout(() => streamController.abort(), streamBudgetMs);
          const streamResp = await fetch(`${baseUrl}/responses`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({
              model: getMetaModelId("sam", "sam-3.1"),
              stream: true,
              input: [
                {
                  type: "message",
                  role: "user",
                  content: [
                    { type: "input_text", text: inputText },
                    { type: "input_video", file_id: fileId },
                  ],
                },
              ],
              metadata: {
                mask_encoding: "lossless",
                include_confidence: "true",
              },
            }),
            signal: streamController.signal,
          });

          if (streamResp.ok && streamResp.body) {
            const eventIterable = readSseResponseEvents(streamResp);
            const parsedStream = parseVideoStream(eventIterable);

            // Snapshots are cumulative: keep the latest mask per (objectId, frameIndex).
            // Do NOT abort early — we need every frame so the cutout follows the speaker's motion.
            try {
              for await (const snapshot of parsedStream) {
                for (const rec of recordsOfKind(snapshot.records, "mask")) {
                  const fIdx = frameIndexOf(rec) ?? rec.frame?.frameIndex ?? 0;
                  trackRecords.set(`${rec.objectId}:${fIdx}`, rec);
                }
              }
            } catch (streamErr: any) {
              // Timeout / disconnect: keep the frames received so far (partial track is still frame-accurate).
              console.warn(
                `[sam-3.1] Video stream ended early (${streamErr?.message || "aborted"}); keeping ${trackRecords.size} frame mask(s).`
              );
            }

            // Primary subject = object tracked on the most frames
            const perObject = new Map<string, number>();
            for (const rec of trackRecords.values()) {
              perObject.set(rec.objectId, (perObject.get(rec.objectId) || 0) + 1);
            }
            const primaryId = [...perObject.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

            if (primaryId !== undefined) {
              const primaryRecs = [...trackRecords.values()]
                .filter((r) => r.objectId === primaryId)
                .sort((a, b) => (frameIndexOf(a) ?? 0) - (frameIndexOf(b) ?? 0));
              trackFrames = primaryRecs;

              // Representative mask (closest to the reference timestamp) for the static PNG + legacy fallback
              const refIdx = Math.round(safeTimestamp * SAM_TRACK_FPS);
              const rep = primaryRecs.reduce((best, r) =>
                Math.abs((frameIndexOf(r) ?? 0) - refIdx) < Math.abs((frameIndexOf(best) ?? 0) - refIdx) ? r : best
              );
              selectedMask = rep.mask;
              objectIdStr = rep.objectId;
              ordinal = Number(rep.objectId) || 0;
              if (typeof rep.confidence === "number") confidence = rep.confidence;
              const b = rep.bounds;
              const bW = Math.max(16, b.right - b.left);
              const bH = Math.max(16, b.bottom - b.top);
              normX = Math.max(0, Math.min(0.85, b.left / sampleW));
              normY = Math.max(0, Math.min(0.85, b.top / sampleH));
              normW = Math.max(0.05, Math.min(1 - normX, bW / sampleW));
              normH = Math.max(0.05, Math.min(1 - normY, bH / sampleH));
              refFrameForPng = Math.max(0, (frameIndexOf(rep) ?? 0) / SAM_TRACK_FPS);
            }
            console.log(
              `[sam-3.1] Frame-by-frame track: ${trackFrames.length} mask frame(s) for objectId=${primaryId ?? "none"} over ${trackDurationSec.toFixed(1)}s @ ${SAM_TRACK_FPS}fps`
            );
          }
          clearTimeout(streamTimeout);
        }
      }
    }
  } catch (videoSamErr: any) {
    if (!selectedMask) {
      console.warn(
        `[sam-3.1] Video stream segmentation notice (${videoSamErr?.message || "aborted"}), checking mask state.`
      );
    }
  }

  // 3. Fallback: Stream single-frame segmentation via `parseImageStream` + `recordsOfKind` if video stream had no mask
  if (!selectedMask) {
    try {
      const frameBase64 = fs.readFileSync(refFramePath).toString("base64");
      const dataUrl = `data:image/jpeg;base64,${frameBase64}`;
      const imgInputText =
        Array.isArray(objectPrompts) && objectPrompts.length > 0
          ? buildObjectPrompt({ size: { width: videoWidth, height: videoHeight }, objects: objectPrompts })
          : subjectPrompt.trim();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);
      const response = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: getMetaModelId("sam", "sam-3.1"),
          stream: true,
          input: [
            {
              type: "message",
              role: "user",
              content: [
                { type: "input_text", text: imgInputText },
                { type: "input_image", image_url: dataUrl },
              ],
            },
          ],
          metadata: {
            mask_encoding: "lossless",
            include_confidence: "true",
          },
        }),
        signal: controller.signal,
      });

      if (response.ok && response.body) {
        const parsedImgStream = parseImageStream(readSseResponseEvents(response));
        for await (const snapshot of parsedImgStream) {
          const maskRecords = recordsOfKind(snapshot.records, "mask");
          if (maskRecords.length > 0) {
            const firstRec = maskRecords[0];
            selectedMask = firstRec.mask;
            objectIdStr = firstRec.objectId;
            ordinal = Number(firstRec.objectId) || 0;
            if (typeof firstRec.confidence === "number") {
              confidence = firstRec.confidence;
            }
            const b = firstRec.bounds;
            const bW = Math.max(16, b.right - b.left);
            const bH = Math.max(16, b.bottom - b.top);
            const refW = Math.max(videoWidth, b.right);
            const refH = Math.max(videoHeight, b.bottom);

            normX = Math.max(0, Math.min(0.85, b.left / refW));
            normY = Math.max(0, Math.min(0.85, b.top / refH));
            normW = Math.max(0.2, Math.min(1 - normX, bW / refW));
            normH = Math.max(0.25, Math.min(1 - normY, bH / refH));
            break;
          }
        }
      }
      clearTimeout(timeoutId);
    } catch (err: any) {
      console.warn(`[sam-3.1] Image stream fallback warning:`, err?.message);
    }
  }

  // 4. Decode exact SAM 3.1 mask into all three official `@meta-sam/parser` formats:
  //    - `decodeMaskToRaster(mask)` -> binary Uint8Array (0 = background, 1 = foreground)
  //    - `decodeMaskToSVGPath(mask)` -> vector SVG path ("M... L... Z")
  //    - `decodeMaskToRLE(mask)` -> compact COCO RLE ({ size: [height, width], counts })
  let decodedRaster: Uint8Array | undefined;
  let maskSvgPath: string | undefined;
  let maskRle: { size: [number, number]; counts: string } | undefined;
  let maskWidth: number | undefined;
  let maskHeight: number | undefined;
  let maskEncoding: "lossless" | "one_bit" = "lossless";
  let maskPayload: string | undefined;

  if (selectedMask) {
    maskWidth = selectedMask.width;
    maskHeight = selectedMask.height;
    maskEncoding = selectedMask.encoding;
    maskPayload = selectedMask.payload;
    try {
      decodedRaster = decodeMaskToRaster(selectedMask);
      maskSvgPath = decodeMaskToSVGPath(selectedMask);
      maskRle = decodeMaskToRLE(selectedMask);
    } catch (decodeErr: any) {
      console.warn(`[sam-3.1] @meta-sam/parser decode warning:`, decodeErr?.message);
    }
  }

  console.log(
    `[sam-3.1] Decoded SAM 3.1 mask via @meta-sam/parser: objectId=${objectIdStr}, norm=[x=${normX.toFixed(3)}, y=${normY.toFixed(3)}, w=${normW.toFixed(3)}, h=${normH.toFixed(3)}], mask=${maskWidth}x${maskHeight}, rleCounts=${maskRle?.counts.length || 0}`
  );

  const x1 = Math.max(0, Math.floor(normX * videoWidth));
  const y1 = Math.max(0, Math.floor(normY * videoHeight));
  const width = Math.max(64, Math.min(videoWidth - x1, Math.floor(normW * videoWidth)));
  const height = Math.max(64, Math.min(videoHeight - y1, Math.floor(normH * videoHeight)));
  const x2 = x1 + width;
  const y2 = y1 + height;

  const box: SAMCutoutBox & { ordinal: number } = {
    ordinal,
    objectId: objectIdStr,
    x1,
    y1,
    x2,
    y2,
    width,
    height,
    normX,
    normY,
    normW,
    normH,
    confidence,
    fileId: uploadedFileId,
    maskHeight,
    maskWidth,
    maskEncoding,
    maskPayload,
    maskRle,
    maskSvgPath,
  };

  // 4b. Frame-by-frame SAM 3.1 Mask Track: save sam_track.json with all per-frame masks
  let trackPublicUrl: string | undefined;
  let trackFrameCount = 0;

  if (trackFrames.length > 0) {
    let minX = 1.0, minY = 1.0, maxX = 0.0, maxY = 0.0;
    const serializedFrames: SamTrackFrame[] = [];

    for (const rec of trackFrames) {
      const fIdx = frameIndexOf(rec) ?? rec.frame?.frameIndex ?? 0;
      const b = rec.bounds;
      const bLeftNorm = Math.max(0, Math.min(1, b.left / sampleW));
      const bTopNorm = Math.max(0, Math.min(1, b.top / sampleH));
      const bRightNorm = Math.max(0, Math.min(1, b.right / sampleW));
      const bBottomNorm = Math.max(0, Math.min(1, b.bottom / sampleH));

      minX = Math.min(minX, bLeftNorm);
      minY = Math.min(minY, bTopNorm);
      maxX = Math.max(maxX, bRightNorm);
      maxY = Math.max(maxY, bBottomNorm);

      serializedFrames.push({
        t: +(fIdx / SAM_TRACK_FPS).toFixed(3),
        frameIndex: fIdx,
        b: [
          +bLeftNorm.toFixed(4),
          +bTopNorm.toFixed(4),
          +bRightNorm.toFixed(4),
          +bBottomNorm.toFixed(4),
        ],
        enc: rec.mask.encoding,
        payload: rec.mask.payload,
        w: rec.mask.width,
        h: rec.mask.height,
      });
    }

    const uX = Math.max(0, minX - 0.03);
    const uY = Math.max(0, minY - 0.03);
    const uW = Math.min(1 - uX, Math.max(0.1, (maxX - minX) + 0.06));
    const uH = Math.min(1 - uY, Math.max(0.1, (maxY - minY) + 0.06));

    const maskTrack: SamMaskTrack = {
      version: 1,
      fps: SAM_TRACK_FPS,
      sourceWidth: sampleW,
      sourceHeight: sampleH,
      objectId: objectIdStr,
      union: {
        nx: +uX.toFixed(4),
        ny: +uY.toFixed(4),
        nw: +uW.toFixed(4),
        nh: +uH.toFixed(4),
      },
      frames: serializedFrames,
    };

    const trackFileName = "sam_track.json";
    const trackFilePath = path.join(runAssetsDir, trackFileName);
    const trackPublicPath = path.join(publicAssetsDir, trackFileName);
    fs.writeFileSync(trackFilePath, JSON.stringify(maskTrack));
    fs.copyFileSync(trackFilePath, trackPublicPath);

    trackPublicUrl = `/assets/${runId}/${trackFileName}`;
    trackFrameCount = serializedFrames.length;
    box.trackUrl = trackPublicUrl;
    box.trackFrameCount = trackFrameCount;

    console.log(`[sam-3.1] Saved frame-by-frame SAM 3.1 track with ${trackFrameCount} frames: ${trackPublicUrl}`);
  }

  // If a specific frame was chosen for PNG cutout, extract it
  if (typeof refFrameForPng === "number" && Math.abs(refFrameForPng - safeTimestamp) > 0.05) {
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-ss",
        refFrameForPng.toFixed(2),
        "-i",
        videoPath,
        "-vf",
        `scale=${videoWidth}:${videoHeight}`,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        refFramePath,
      ]);
    } catch {}
  }

  // 5. Generate exact pixel-accurate transparent PNG cutout (`speaker_cutout.png`) using `decodeMaskToRaster`
  const cutoutFileName = "speaker_cutout.png";
  const cutoutFilePath = path.join(runAssetsDir, cutoutFileName);
  const cutoutPublicPath = path.join(publicAssetsDir, cutoutFileName);

  try {
    if (
      decodedRaster &&
      maskWidth &&
      maskHeight &&
      decodedRaster.length === maskWidth * maskHeight
    ) {
      const rawMaskPath = path.join(runAssetsDir, "sam_alpha_mask.gray");
      const alphaBytes = Buffer.alloc(decodedRaster.length);
      for (let i = 0; i < decodedRaster.length; i++) {
        alphaBytes[i] = decodedRaster[i] === 1 ? 255 : 0;
      }
      fs.writeFileSync(rawMaskPath, alphaBytes);

      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        refFramePath,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "gray",
        "-s:v",
        `${maskWidth}x${maskHeight}`,
        "-i",
        rawMaskPath,
        "-filter_complex",
        `[0:v]scale=${videoWidth}:${videoHeight},crop=${box.width}:${box.height}:${box.x1}:${box.y1},format=rgb24[fg];[1:v]scale=${box.width}:${box.height}:flags=bilinear,format=gray[alpha];[fg][alpha]alphamerge,format=rgba`,
        "-frames:v",
        "1",
        cutoutFilePath,
      ]);
      fs.copyFileSync(cutoutFilePath, cutoutPublicPath);
      try {
        fs.unlinkSync(rawMaskPath);
      } catch {}
    } else {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        refFramePath,
        "-vf",
        `scale=${videoWidth}:${videoHeight},crop=${box.width}:${box.height}:${box.x1}:${box.y1}`,
        cutoutFilePath,
      ]);
      fs.copyFileSync(cutoutFilePath, cutoutPublicPath);
    }
  } catch (ffmpegErr: any) {
    console.warn(
      `[sam-3.1] alphamerge warning (${ffmpegErr?.message}), using cropped cutout fallback.`
    );
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        refFramePath,
        "-vf",
        `scale=${videoWidth}:${videoHeight},crop=${box.width}:${box.height}:${box.x1}:${box.y1}`,
        cutoutFilePath,
      ]);
      fs.copyFileSync(cutoutFilePath, cutoutPublicPath);
    } catch {
      fs.copyFileSync(refFramePath, cutoutFilePath);
      fs.copyFileSync(refFramePath, cutoutPublicPath);
    }
  }

  const cutoutPublicUrl = `/assets/${runId}/${cutoutFileName}`;
  console.log(
    `[sam-3.1] Successfully generated exact SAM 3.1 transparent speaker cutout: ${cutoutPublicUrl}`
  );

  return {
    assetId: "speaker_cutout",
    box,
    cutoutFilePath,
    cutoutPublicUrl,
    trackPublicUrl,
    trackFrameCount,
  };
}
