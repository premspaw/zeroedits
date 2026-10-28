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

    return NextResponse.json({
      success: true,
      runId,
      finalVideoPath: state.finalVideoPath,
      downloadUrl: `/api/pipeline-b/media/${runId}/final`,
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
