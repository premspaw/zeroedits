import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ runId: string }> | { runId: string } }
) {
  try {
    const { runId } = await Promise.resolve(context.params);
    const mediaType = req.nextUrl.searchParams.get("type") || "audio";
    const runDir = path.join(process.cwd(), "workspace", "audio-stories", runId);

    let filePath = "";
    if (mediaType === "audio") {
      const candidates = [
        path.join(runDir, "voiceover.mp3"),
        path.join(runDir, "voiceover.wav"),
        path.join(runDir, "voiceover.m4a"),
        path.join(runDir, "voiceover.webm"),
        path.join(runDir, "voiceover.ogg"),
      ];
      filePath = candidates.find((p) => fs.existsSync(p)) || "";
    } else if (mediaType === "video" || mediaType === "final") {
      const candidates = [
        path.join(runDir, "final_cinematic_story.mp4"),
        path.join(runDir, "cinematic_story.mp4"),
      ];
      filePath = candidates.find((p) => fs.existsSync(p)) || "";
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Requested ${mediaType} file for run ${runId} not found.` },
        { status: 404 }
      );
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const range = req.headers.get("range");

    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".mp3"
        ? "audio/mpeg"
        : ext === ".wav"
        ? "audio/wav"
        : ext === ".m4a"
        ? "audio/mp4"
        : ext === ".webm"
        ? "audio/webm"
        : ext === ".ogg"
        ? "audio/ogg"
        : "video/mp4";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (range && !isDownload) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Math.max(0, parseInt(parts[0], 10) || 0);
      const end = parts[1] ? Math.min(fileSize - 1, parseInt(parts[1], 10)) : fileSize - 1;
      const chunksize = Math.max(0, end - start + 1);

      const fileStream = fs.createReadStream(filePath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          ...corsHeaders,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
        },
      });
    }

    const fileStream = fs.createReadStream(filePath);
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Length": fileSize.toString(),
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    };

    if (isDownload) {
      const filename =
        mediaType === "audio"
          ? `voiceover_${runId.slice(0, 8)}${ext}`
          : `cinematic_anime_${runId.slice(0, 8)}.mp4`;
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(stream as any, { status: 200, headers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to serve media" }, { status: 500 });
  }
}

