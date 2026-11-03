/**
 * Meta SAM 3.1 Frontend Coordinate Mapping, Interactive Prompt Builder & Alpha Matte Extractor
 * Official `@meta-sam/parser` utilities for 9:16 Vertical Reel Editors (1080x1920).
 */

import {
  buildObjectPrompt,
  decodeMaskToRaster,
  decodeMaskToRLE,
  decodeMaskToSVGPath,
  parseVideoStream,
  recordsOfKind,
  type ResponsesEvent,
  type RLEObject,
  type SegmentationMask,
  type VideoSegmentationResult,
  type VideoSegmentationSnapshot,
} from "@meta-sam/parser";

export interface ClickPoint {
  x: number;
  y: number;
  label: 1 | 0; // 1 = positive (include), 0 = negative (exclude)
}

/**
 * Converts a client mouse click on a scaled preview canvas into source video pixels (1080x1920)
 */
export function mapScreenToSourcePixels(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  sourceWidth: number = 1080,
  sourceHeight: number = 1920
): { x: number; y: number } {
  const relX = clientX - canvasRect.left;
  const relY = clientY - canvasRect.top;

  const rawX = Math.floor((relX * sourceWidth) / canvasRect.width);
  const rawY = Math.floor((relY * sourceHeight) / canvasRect.height);

  return {
    x: Math.max(0, Math.min(sourceWidth - 1, rawX)),
    y: Math.max(0, Math.min(sourceHeight - 1, rawY)),
  };
}

/**
 * Builds the SAM 3.1 token string (`<0f>1<|box;...|>,<|point;...|>`) for multi-object interactive tracking
 */
export function createInteractiveReelPrompt(
  frameIndex: number,
  objectId: string,
  points: ClickPoint[],
  box?: { x1: number; y1: number; x2: number; y2: number },
  sourceWidth = 1080,
  sourceHeight = 1920
): string {
  return buildObjectPrompt({
    size: { width: sourceWidth, height: sourceHeight },
    objects: [
      {
        id: objectId,
        prompts: [
          {
            frame: frameIndex,
            box: box
              ? {
                  left: box.x1,
                  top: box.y1,
                  right: box.x2,
                  bottom: box.y2,
                }
              : undefined,
            points: points.map((pt) => ({
              x: pt.x,
              y: pt.y,
              label: pt.label === 1 ? "positive" : "negative",
            })),
          },
        ],
      },
    ],
  });
}

/**
 * Converts an SSE `Response` stream from `/api/sam/segment-reel` into an `AsyncIterable<ResponsesEvent>`
 * ready for `parseVideoStream(readSseEvents(response))`
 */
export async function* readSseEvents(
  response: Response
): AsyncIterable<ResponsesEvent> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const chunk of lines) {
      const line = chunk.trim();
      if (!line.startsWith("data: ")) continue;
      const dataStr = line.slice(6).trim();
      if (dataStr === "[DONE]") return;
      try {
        yield JSON.parse(dataStr) as ResponsesEvent;
      } catch {}
    }
  }
}

/**
 * Converts a SAM 3.1 `SegmentationMask` directly into an RGBA `ImageData` alpha matte
 * (`0` = transparent background, `255` = opaque isolated character foreground)
 * using `decodeMaskToRaster` from `@meta-sam/parser`.
 */
export function extractMaskToAlphaImageData(
  mask: SegmentationMask
): ImageData | null {
  if (typeof ImageData === "undefined") return null;
  const binaryRaster = decodeMaskToRaster(mask);
  const width = mask.width;
  const height = mask.height;
  if (!width || !height || binaryRaster.length !== width * height) return null;

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < binaryRaster.length; i++) {
    const alpha = binaryRaster[i] === 1 ? 255 : 0;
    const offset = i * 4;
    rgba[offset] = alpha;     // R
    rgba[offset + 1] = alpha; // G
    rgba[offset + 2] = alpha; // B
    rgba[offset + 3] = alpha; // A
  }

  return new ImageData(rgba, width, height);
}

/**
 * Extracts a specific frame + objectId mask from a `VideoSegmentationResult` or `VideoSegmentationSnapshot`
 * as an RGBA `ImageData` alpha matte for Canvas/WebGL compositing.
 */
export function extractFrameAlphaMatte(
  result: VideoSegmentationResult | VideoSegmentationSnapshot,
  targetFrameIndex: number,
  targetObjectId: string,
  width: number = 1080,
  height: number = 1920
): ImageData | null {
  const maskRecords = recordsOfKind(result.records, "mask");
  const maskRecord =
    maskRecords.find(
      (r) =>
        (r.frame?.frameIndex ?? 0) === targetFrameIndex &&
        r.objectId === targetObjectId
    ) ||
    maskRecords.find((r) => r.objectId === targetObjectId) ||
    maskRecords[0];

  if (!maskRecord) return null;

  return extractMaskToAlphaImageData(maskRecord.mask);
}

export {
  buildObjectPrompt,
  decodeMaskToRaster,
  decodeMaskToRLE,
  decodeMaskToSVGPath,
  parseVideoStream,
  recordsOfKind,
  type RLEObject,
  type SegmentationMask,
  type VideoSegmentationResult,
  type VideoSegmentationSnapshot,
};
