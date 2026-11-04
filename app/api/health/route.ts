import { NextResponse } from "next/server";
import { getMetaApiKey } from "@/lib/meta-api";
import { isR2Configured, testR2Connection } from "@/lib/r2-storage";
import { execFile } from "child_process";
import { promisify } from "util";

const runCmd = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ffmpeg = false;
  try {
    await runCmd("ffmpeg", ["-version"]);
    ffmpeg = true;
  } catch {}

  const metaKey = getMetaApiKey();
  const r2Ok = isR2Configured();

  return NextResponse.json({
    ok: true,
    service: "paper-studio",
    timestamp: new Date().toISOString(),
    env: {
      modelApiKeySet: Boolean(metaKey),
      modelApiKeyPrefix: metaKey ? metaKey.slice(0, 7) + "..." : "missing",
      r2Configured: r2Ok,
      ffmpegAvailable: ffmpeg,
    },
  });
}
