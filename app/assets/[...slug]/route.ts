import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// 1x1 transparent PNG fallback buffer
const TRANSPARENT_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> | { slug: string[] } }
) {
  try {
    const { slug } = await Promise.resolve(context.params);
    if (!slug || slug.length === 0) {
      return NextResponse.json({ error: "Missing asset path" }, { status: 400 });
    }

    const runId = slug[0];
    const subPath = slug.slice(1).join("/");
    const ext = path.extname(subPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    // Search order:
    // 1. public/assets/[runId]/[subPath]
    // 2. workspace/pipeline-b/runs/[runId]/assets/[subPath]
    // 3. workspace/pipeline-b/runs/[runId]/[subPath]
    const candidates = [
      path.join(process.cwd(), "public", "assets", runId, subPath),
      path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId, "assets", subPath),
      path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId, subPath),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const buffer = fs.readFileSync(filePath);
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": mimeType,
              "Content-Length": String(stat.size),
              "Cache-Control": "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      }
    }

    // Graceful fallback for non-existent speaker_cutout.png or sam_track.json
    // Prevents breaking UI playback or polluting console with 404 errors when cutouts are not used
    if (ext === ".png") {
      return new NextResponse(TRANSPARENT_1X1_PNG, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(TRANSPARENT_1X1_PNG.length),
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (ext === ".json") {
      const fallbackJson = JSON.stringify({ version: 1, frames: [], union: { nx: 0, ny: 0, nw: 1, nh: 1 } });
      return new NextResponse(fallbackJson, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal asset server error" }, { status: 500 });
  }
}

