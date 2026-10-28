import { NextRequest, NextResponse } from "next/server";
import { loadState } from "@/lib/pipeline-b/state";

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const { runId } = params;
    const state = loadState(runId);
    return NextResponse.json({
      success: true,
      state,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load run state." },
      { status: 404 }
    );
  }
}
