import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/** Serves back a user's own check-in recording for playback. */
export async function GET(req: NextRequest) {
  try {
    const f = new URL(req.url).searchParams.get("f") || "";
    if (!f || f.includes("/") || f.includes("\\") || f.includes("..")) {
      return NextResponse.json({ success: false, error: "Bad file." }, { status: 400 });
    }
    const abs = path.join(process.cwd(), "data", "storybank", "audio", f);
    if (!fs.existsSync(abs)) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    const buf = fs.readFileSync(abs);
    const ext = f.split(".").pop()?.toLowerCase();
    const type = ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : ext === "m4a" ? "audio/mp4" : "audio/webm";
    return new NextResponse(buf, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Could not load audio." }, { status: 500 });
  }
}
