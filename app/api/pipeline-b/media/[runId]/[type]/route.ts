import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadState } from "@/lib/pipeline-b/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ runId: string; type: string }> | { runId: string; type: string } }
) {
  try {
    const { runId, type } = await Promise.resolve(context.params);
    const state = loadState(runId);
    const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);

    const cleanCandidate = state.cleanVideoPath || path.join(runDir, "clean_video.mp4");
    // Explicit priority: final_edited_reel.mp4 is the burned master reel from FFmpeg
    const finalCandidate1 = path.join(runDir, "final_edited_reel.mp4");
    const finalCandidate2 = path.join(runDir, "final_reel.mp4");
    const finalCandidate3 =
      state.finalVideoPath &&
      !state.finalVideoPath.endsWith("clean_video.mp4") &&
      !state.finalVideoPath.endsWith("raw_input.mp4")
        ? state.finalVideoPath
        : "";
    const rawCandidate = state.rawVideoPath || path.join(runDir, "raw_input.mp4");

    let filePath = "";
    let mimeType = "video/mp4";

    if (type === "clean") {
      filePath = cleanCandidate;
    } else if (type === "final") {
      if (fs.existsSync(finalCandidate1)) {
        filePath = finalCandidate1;
      } else if (fs.existsSync(finalCandidate2)) {
        filePath = finalCandidate2;
      } else if (finalCandidate3 && fs.existsSync(finalCandidate3)) {
        filePath = finalCandidate3;
      } else if (fs.existsSync(cleanCandidate)) {
        filePath = cleanCandidate;
      } else {
        return NextResponse.json(
          { error: "No rendered final MP4 exists yet. Please render your reel before downloading." },
          { status: 404 }
        );
      }
    } else if (type === "cutout" || type === "speaker_cutout.png") {
      filePath = path.join(runDir, "assets", "speaker_cutout.png");
      mimeType = "image/png";
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), "public", "assets", runId, "speaker_cutout.png");
      }
    } else if (type === "sam-track" || type === "sam_track.json") {
      filePath = path.join(runDir, "assets", "sam_track.json");
      mimeType = "application/json";
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), "public", "assets", runId, "sam_track.json");
      }
    } else {
      filePath = rawCandidate;
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Requested ${type} media file not found on disk.` }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const range = req.headers.get("range");
    const isHead = req.method === "HEAD";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    const cacheHeader = isDownload ? "no-store" : "public, max-age=3600";

    if (isHead) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Accept-Ranges": "bytes",
          "Content-Length": String(fileSize),
          "Content-Type": mimeType,
          "Cache-Control": cacheHeader,
        },
      });
    }

    // When downloading (?download=1), always serve the complete 200 OK binary file
    // so the browser never saves a partial 206 byte range as an incomplete .mp4 file.
    if (range && !isDownload) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Math.max(0, parseInt(parts[0], 10) || 0);
      // Cap open-ended range chunks to 8MB so the initial video frames arrive in <5ms
      const MAX_CHUNK = 8 * 1024 * 1024;
      const requestedEnd = parts[1]
        ? Math.min(fileSize - 1, parseInt(parts[1], 10))
        : Math.min(fileSize - 1, start + MAX_CHUNK - 1);
      const end = Math.max(start, requestedEnd);
      const chunksize = Math.max(0, end - start + 1);

      const buffer = Buffer.alloc(chunksize);
      const fd = fs.openSync(filePath, "r");
      try {
        fs.readSync(fd, buffer, 0, chunksize, start);
      } finally {
        fs.closeSync(fd);
      }

      return new NextResponse(new Uint8Array(buffer), {
        status: 206,
        headers: {
          ...corsHeaders,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunksize),
          "Content-Type": mimeType,
          "Cache-Control": cacheHeader,
        },
      });
    } else {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Accept-Ranges": "bytes",
          "Content-Length": String(fileBuffer.byteLength),
          "Content-Type": mimeType,
          "Cache-Control": cacheHeader,
          ...(isDownload
            ? {
                "Content-Disposition": `attachment; filename="zeroedits-reel-${runId.slice(-6)}.mp4"`,
              }
            : {}),
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ runId: string; type: string }> | { runId: string; type: string } }
) {
  return GET(req, context);
}
