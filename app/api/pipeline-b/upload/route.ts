import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createRun } from "@/lib/pipeline-b/state";
import { executePipelineB } from "@/lib/pipeline-b/orchestrator";

export const maxDuration = 300; // Allow sufficient time for media processing

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const userScript = (formData.get("userScript") as string) || "";
    const templateId = (formData.get("templateId") as string) || "hormoziPunch";
    const mode = (formData.get("mode") as "wonder-ai" | "rules-only") || "wonder-ai";

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: "No video file uploaded. Please upload a talking-head video up to 60s." },
        { status: 400 }
      );
    }

    const clientRunId = formData.get("runId") as string | null;
    const stopAtStage = (formData.get("stopAtStage") as any) || undefined;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const runId = clientRunId || `run-b-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
    const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);

    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    // Save video file to run directory
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const rawVideoPath = path.join(runDir, "raw_input.mp4");
    fs.writeFileSync(rawVideoPath, buffer);

    // Initialize state
    createRun({
      runId,
      rawVideoPath,
      userScript,
      templateId,
      mode,
    });

    // Run the orchestrator pipeline up to PREVIEW_READY (or stopAtStage)
    const finalState = await executePipelineB(runId, stopAtStage ? { stopAtStage } : undefined);

    return NextResponse.json({
      success: true,
      runId,
      state: finalState,
    });
  } catch (err: any) {
    console.error("Pipeline B upload/run error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to process video in Pipeline B.",
      },
      { status: 500 }
    );
  }
}
