import { NextRequest, NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/pipeline-b/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ runId: string }> | { runId: string } }
) {
  let runId = "unknown";
  try {
    const resolvedParams = await Promise.resolve(context.params);
    runId = resolvedParams.runId;
    const state = loadState(runId);
    return NextResponse.json({
      success: true,
      state,
    });
  } catch (err: any) {
    // If run state is not yet initialized on disk (file upload/transfer still in flight),
    // return an initial uploading stage with HTTP 200 so polling doesn't spam 404 errors.
    return NextResponse.json({
      success: true,
      state: {
        runId,
        currentStage: "UPLOADING",
        status: "processing",
      },
    });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ runId: string }> | { runId: string } }
) {
  try {
    const { runId } = await Promise.resolve(context.params);
    const { editPlan, motionCode } = await req.json();
    const state = loadState(runId);
    if (editPlan && Array.isArray(editPlan.visualSegments)) state.editPlan = editPlan;
    if (typeof motionCode === "string" && motionCode.length > 30) (state as any).motionCode = motionCode;
    saveState(state);
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update Pipeline B scene." }, { status: 500 });
  }
}
