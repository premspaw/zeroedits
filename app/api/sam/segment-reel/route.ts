/**
 * POST /api/sam/segment-reel
 * Official Meta SAM 3.1 (`sam-3.1`) Streaming Video Segmentation Route for the Reel Editor.
 * Supports:
 *  - Mode A (Concept Prompting): Concrete noun phrase (`conceptPrompt`, e.g. "person", "main speaker")
 *  - Mode B (Interactive Visual Prompting): Boxes & positive/negative click points encoded via `buildObjectPrompt`
 * Streams Server-Sent Events (SSE) directly from `https://api.meta.ai/v1/responses` to `@meta-sam/parser`'s `parseVideoStream`.
 */

import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { buildObjectPrompt } from "@meta-sam/parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      videoUrl,
      fileId: providedFileId,
      runId,
      conceptPrompt = "person",
      objectPrompts,
      width = 1080,
      height = 1920,
      maskEncoding = "one_bit",
    } = body;

    const apiKey =
      process.env.MODEL_API_KEY ||
      process.env.MUSE_API_KEY ||
      process.env.META_API_KEY ||
      "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

    const baseUrl = (
      process.env.MODEL_API_BASE_URL || "https://api.meta.ai/v1"
    ).replace(/\/+$/, "");

    // Build input_text: either encode geometric clicks/boxes via @meta-sam/parser buildObjectPrompt or use concept noun phrase
    const inputText =
      Array.isArray(objectPrompts) && objectPrompts.length > 0
        ? buildObjectPrompt({ size: { width, height }, objects: objectPrompts })
        : String(conceptPrompt || "person").trim();

    let resolvedFileId = providedFileId;

    // If a local runId is passed without a remote fileId, upload the run's `upload.mp4` clip to `/v1/files`
    if (!resolvedFileId && runId) {
      const sampleVideoPath = path.join(
        process.cwd(),
        "workspace",
        "pipeline-b",
        "runs",
        runId,
        "assets",
        "upload.mp4"
      );
      if (fs.existsSync(sampleVideoPath)) {
        const videoBuf = fs.readFileSync(sampleVideoPath);
        const formData = new FormData();
        formData.append("purpose", "user_data");
        formData.append(
          "file",
          new Blob([videoBuf], { type: "video/mp4" }),
          "upload.mp4"
        );
        const uploadResp = await fetch(`${baseUrl}/files`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        });
        if (uploadResp.ok) {
          const uploadData = await uploadResp.json();
          if (typeof uploadData?.id === "string") {
            resolvedFileId = uploadData.id;
          }
        }
      }
    }

    const videoInputContent = resolvedFileId
      ? { type: "input_video", file_id: resolvedFileId }
      : { type: "input_video", video_url: videoUrl };

    const upstreamResp = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: "sam-3.1",
        stream: true,
        input: [
          {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: inputText },
              videoInputContent,
            ],
          },
        ],
        metadata: {
          mask_encoding: maskEncoding,
          include_confidence: "true",
        },
      }),
    });

    if (!upstreamResp.ok || !upstreamResp.body) {
      const errText = await upstreamResp.text().catch(() => "Upstream error");
      return new Response(JSON.stringify({ error: errText }), {
        status: upstreamResp.status || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Pipe SSE stream directly to client so `parseVideoStream` from `@meta-sam/parser` can consume it live
    return new Response(upstreamResp.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[/api/sam/segment-reel] SAM 3.1 Segmentation Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "SAM 3.1 segmentation failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
