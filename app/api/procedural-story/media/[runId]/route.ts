import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "audio";
    const download = searchParams.get("download") === "1";

    const safeRunId = runId.replace(/[^a-zA-Z0-9_-]/g, "");
    const runDir = path.join(process.cwd(), "workspace", "procedural-stories", safeRunId);

    if (!fs.existsSync(runDir)) {
      return NextResponse.json({ error: "Procedural run not found" }, { status: 404 });
    }

    if (type === "final") {
      const mp4Path = path.join(runDir, "final_procedural_story.mp4");
      if (!fs.existsSync(mp4Path)) {
        return NextResponse.json({ error: "Final MP4 not found" }, { status: 404 });
      }
      const buf = fs.readFileSync(mp4Path);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(buf.byteLength),
          ...(download
            ? {
                "Content-Disposition": `attachment; filename="procedural_${safeRunId}.mp4"`,
              }
            : {}),
        },
      });
    }

    // Default: serve voiceover audio file
    const audioCandidates = [
      "voiceover.mp3",
      "voiceover.wav",
      "voiceover.m4a",
      "voiceover.aac",
      "voiceover.ogg",
      "voiceover.webm",
      "extracted_audio.wav",
    ];
    for (const file of audioCandidates) {
      const candidatePath = path.join(runDir, file);
      if (fs.existsSync(candidatePath)) {
        const buf = fs.readFileSync(candidatePath);
        const ext = path.extname(file).toLowerCase();
        const mime =
          ext === ".wav"
            ? "audio/wav"
            : ext === ".m4a"
            ? "audio/mp4"
            : ext === ".ogg"
            ? "audio/ogg"
            : "audio/mpeg";
        return new NextResponse(new Uint8Array(buf), {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Content-Length": String(buf.byteLength),
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
          },
        });
      }
    }

    return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to serve procedural story media" },
      { status: 500 }
    );
  }
}

