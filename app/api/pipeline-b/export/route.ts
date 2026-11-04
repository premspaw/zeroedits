import { NextRequest, NextResponse } from "next/server";
import { exportPipelineBVideo } from "@/lib/pipeline-b/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const { runId } = await req.json();
    if (!runId) {
      return NextResponse.json(
        { success: false, error: "Missing runId parameter." },
        { status: 400 }
      );
    }

    const state = await exportPipelineBVideo(runId);
    let r2Url: string | undefined;

    try {
      const { isR2Configured, uploadLocalFileToR2 } = await import("@/lib/r2-storage");
      if (isR2Configured() && state.finalVideoPath) {
        const uploadRes = await uploadLocalFileToR2(
          state.finalVideoPath,
          `exports/${runId}.mp4`,
          "video/mp4"
        );
        if (uploadRes.success) {
          r2Url = uploadRes.url;
        }
      }
    } catch (r2Err) {
      console.warn("Optional Cloudflare R2 backup skipped:", r2Err);
    }

    return NextResponse.json({
      success: true,
      runId,
      finalVideoPath: state.finalVideoPath,
      downloadUrl: `/api/pipeline-b/media/${runId}/final`,
      r2Url,
      state,
    });
  } catch (err: any) {
    console.error("Export error in Pipeline B:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to export video." },
      { status: 500 }
    );
  }
}
