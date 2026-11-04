import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createRun } from "@/lib/pipeline-b/state";
import { executePipelineB } from "@/lib/pipeline-b/orchestrator";
import { extractGalleryTagsFromName } from "@/lib/pipeline-b/explainer-canvas-renderer";
import { execFile } from "child_process";
import { promisify } from "util";

const runCmd = promisify(execFile);

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
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(runId)) {
      return NextResponse.json({ success: false, error: "Invalid run identifier." }, { status: 400 });
    }
    const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);

    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    // Save video file to run directory
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const rawVideoPath = path.join(runDir, "raw_input.mp4");
    fs.writeFileSync(rawVideoPath, buffer);

    const galleryFiles = formData.getAll("galleryAsset").filter((item): item is File => item instanceof File);
    const galleryAssets: Array<{ id: string; name: string; url: string; kind: "video" | "image"; tags: string[]; duration?: number; thumbnailPath?: string }> = [];
    if (templateId === "gallery" && galleryFiles.length > 0) {
      if (galleryFiles.length > 80) throw new Error("Connect at most 80 gallery assets per edit.");
      const galleryBytes = galleryFiles.reduce((sum, file) => sum + file.size, 0);
      if (galleryBytes > 500 * 1024 * 1024) throw new Error("Gallery upload is over 500 MB. Connect a smaller folder or fewer clips.");
      const galleryDir = path.join(process.cwd(), "public", "gallery-assets", runId);
      fs.mkdirSync(galleryDir, { recursive: true });
      for (let i = 0; i < galleryFiles.length; i++) {
        const file = galleryFiles[i];
        const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || (file.type.startsWith("image/") ? ".jpg" : ".mp4");
        const safeBase = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || `clip-${i + 1}`;
        const diskName = `${String(i + 1).padStart(3, "0")}-${safeBase}${ext}`;
        fs.writeFileSync(path.join(galleryDir, diskName), Buffer.from(await file.arrayBuffer()));
        const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(ext);
        let duration: number | undefined;
        if (isVideo) {
          try {
            const probe = await runCmd("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path.join(galleryDir, diskName)]);
            duration = Number(probe.stdout.trim()) || undefined;
          } catch {}
        }
        const thumbnailPath = path.join(galleryDir, `${String(i + 1).padStart(3, "0")}-${safeBase}-sample.jpg`);
        try {
          const inputPath = path.join(galleryDir, diskName);
          const sampleTime = duration ? Math.min(duration * 0.35, Math.max(0.2, duration - 0.1)) : 0;
          await runCmd("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...(isVideo ? ["-ss", sampleTime.toFixed(2)] : []), "-i", inputPath, "-frames:v", "1", "-vf", "scale=448:448:force_original_aspect_ratio=decrease", "-q:v", "6", thumbnailPath]);
        } catch {}
        galleryAssets.push({
          id: `gallery-${i + 1}`,
          name: file.name,
          url: `/gallery-assets/${encodeURIComponent(runId)}/${encodeURIComponent(diskName)}`,
          kind: isVideo ? "video" : "image",
          tags: extractGalleryTagsFromName(file.name),
          duration,
          thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : undefined,
        });
      }
    }

    // Initialize state
    const runState = createRun({
      runId,
      rawVideoPath,
      userScript,
      templateId,
      mode,
    });
    if (galleryAssets.length) {
      runState.galleryAssets = galleryAssets;
      const { saveState } = await import("@/lib/pipeline-b/state");
      saveState(runState);
    }

    // Run the orchestrator pipeline up to PREVIEW_READY (or stopAtStage)
    const finalState = await executePipelineB(runId, stopAtStage ? { stopAtStage } : undefined);

    let motionCode = "";
    if (finalState.motionCodePath && fs.existsSync(finalState.motionCodePath)) {
      motionCode = fs.readFileSync(finalState.motionCodePath, "utf-8");
    }

    return NextResponse.json({
      success: true,
      runId,
      state: finalState,
      motionCode,
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
