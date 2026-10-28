import { NextRequest, NextResponse } from "next/server";
import { resumePipelineB } from "@/lib/pipeline-b/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const { runId } = await req.json();
    if (!runId) {
      return NextResponse.json(
        { success: false, error: "Missing runId parameter." },
        { status: 400 }
      );
    }

    const state = await resumePipelineB(runId);

    return NextResponse.json({
      success: true,
      runId,
      state,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resume run." },
      { status: 500 }
    );
  }
}
