import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadState } from "@/lib/pipeline-b/state";

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string; type: string } }
) {
  try {
    const { runId, type } = params;
    const state = loadState(runId);
    const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);

    let filePath = "";
    if (type === "clean") {
      filePath = state.cleanVideoPath || path.join(runDir, "clean_video.mp4");
    } else if (type === "final") {
      filePath = state.finalVideoPath || path.join(runDir, "final_edited_reel.mp4");
    } else {
      filePath = state.rawVideoPath || path.join(runDir, "raw_input.mp4");
    }

    if (!fs.existsSync(filePath)) {
      // Fallback to raw if clean is not finished
      filePath = state.rawVideoPath || path.join(runDir, "raw_input.mp4");
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Media file not found." }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      // @ts-ignore
      return new NextResponse(fileStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunksize),
          "Content-Type": "video/mp4",
        },
      });
    } else {
      const fileStream = fs.createReadStream(filePath);
      // @ts-ignore
      return new NextResponse(fileStream, {
        headers: {
          "Content-Length": String(fileSize),
          "Content-Type": "video/mp4",
          ...(type === "final" ? { "Content-Disposition": 'attachment; filename="edited_reel.mp4"' } : {}),
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
