import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { resumePipelineB } from "@/lib/pipeline-b/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const { runId, customApprovedCuts, customCaptionOverrides } = await req.json();
    if (!runId) {
      return NextResponse.json(
        { success: false, error: "Missing runId parameter." },
        { status: 400 }
      );
    }

    const state = await resumePipelineB(runId, {
      customApprovedCuts,
      customCaptionOverrides,
    });
    const motionCode = state.motionCodePath && fs.existsSync(state.motionCodePath)
      ? fs.readFileSync(state.motionCodePath, "utf-8")
      : "";

    return NextResponse.json({
      success: true,
      runId,
      state,
      motionCode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resume run." },
      { status: 500 }
    );
  }
}
