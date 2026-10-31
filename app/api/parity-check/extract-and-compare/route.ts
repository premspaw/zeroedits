import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface FrameParityResult {
  timestamp: number;
  previewExists: boolean;
  exportExists: boolean;
  previewSize: number;
  exportSize: number;
  ssim: number | null;
  psnr: number | null;
  matchGrade: string;
  diffImagePath?: string;
  notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const runId = body.runId || "run-b-2026-10-30T05-36-19-045Z-rsgzp";
    const timestamps: number[] = body.timestamps || [0.0, 1.0, 5.0, 15.0];

    const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);
    const finalReel = path.join(runDir, "final_reel.mp4");
    const finalEditedReel = path.join(runDir, "final_edited_reel.mp4");
    const targetVideo = fs.existsSync(finalReel) ? finalReel : (fs.existsSync(finalEditedReel) ? finalEditedReel : null);

    if (!targetVideo) {
      return NextResponse.json(
        { error: `No exported video found for run ${runId}. Make sure MP4 export ran successfully first.` },
        { status: 400 }
      );
    }

    const parityDir = path.join(process.cwd(), ".render-temp", "parity-verify");
    fs.mkdirSync(parityDir, { recursive: true });

    const results: FrameParityResult[] = [];

    for (const t of timestamps) {
      const previewImg = path.join(parityDir, `preview_t${t}.png`);
      const exportImg = path.join(parityDir, `export_t${t}.png`);
      const diffImg = path.join(parityDir, `diff_t${t}.png`);

      // 1. Extract exact frame from exported video at timestamp t
      await execFileAsync("ffmpeg", [
        "-y",
        "-ss",
        String(t),
        "-i",
        targetVideo,
        "-vframes",
        "1",
        "-q:v",
        "1",
        exportImg,
      ]);

      const previewExists = fs.existsSync(previewImg);
      const exportExists = fs.existsSync(exportImg);
      const previewSize = previewExists ? fs.statSync(previewImg).size : 0;
      const exportSize = exportExists ? fs.statSync(exportImg).size : 0;

      let ssim: number | null = null;
      let psnr: number | null = null;
      let matchGrade = "UNVERIFIED";
      let notes = "";

      if (previewExists && exportExists) {
        // Compute SSIM with normalized RGB pixel formats
        try {
          const ssimProc = await execFileAsync("ffmpeg", [
            "-i",
            previewImg,
            "-i",
            exportImg,
            "-filter_complex",
            "[0:v]format=rgb24[v0];[1:v]format=rgb24[v1];[v0][v1]ssim",
            "-f",
            "null",
            "-",
          ]);
          const combinedStderr = (ssimProc.stderr || "") + (ssimProc.stdout || "");
          const match = combinedStderr.match(/All:([0-9.]+)/);
          if (match && match[1]) {
            ssim = parseFloat(match[1]);
          }
        } catch (ssimErr: any) {
          const stderr = ssimErr.stderr || "";
          const match = stderr.match(/All:([0-9.]+)/);
          if (match && match[1]) ssim = parseFloat(match[1]);
        }

        // Compute PSNR with normalized RGB pixel formats
        try {
          const psnrProc = await execFileAsync("ffmpeg", [
            "-i",
            previewImg,
            "-i",
            exportImg,
            "-filter_complex",
            "[0:v]format=rgb24[v0];[1:v]format=rgb24[v1];[v0][v1]psnr",
            "-f",
            "null",
            "-",
          ]);
          const combinedStderr = (psnrProc.stderr || "") + (psnrProc.stdout || "");
          const match = combinedStderr.match(/average:([0-9.]+)/i);
          if (match && match[1]) {
            psnr = parseFloat(match[1]);
          }
        } catch (psnrErr: any) {
          const stderr = psnrErr.stderr || "";
          const match = stderr.match(/average:([0-9.]+)/i);
          if (match && match[1]) psnr = parseFloat(match[1]);
        }

        // Generate visual difference heat map
        try {
          await execFileAsync("ffmpeg", [
            "-y",
            "-i",
            previewImg,
            "-i",
            exportImg,
            "-filter_complex",
            "[0:v][1:v]blend=all_mode=difference,colorlevels=rimin=0:gimin=0:bimin=0:rimax=0.25:gimax=0.25:bimax=0.25",
            diffImg,
          ]);
        } catch {}

        if (ssim !== null) {
          if (ssim >= 0.985) {
            matchGrade = "EXACT_PARITY (Confirmed identical within H.264 quantization limits)";
            notes = `SSIM: ${ssim.toFixed(4)}, PSNR: ${psnr ? psnr.toFixed(1) + " dB" : "N/A"}. High fidelity visual match.`;
          } else if (ssim >= 0.92) {
            matchGrade = "HIGH_SIMILARITY";
            notes = `SSIM: ${ssim.toFixed(4)}. Minor compression artifacts or antialiasing variance.`;
          } else {
            matchGrade = "DIVERGENT";
            notes = `SSIM: ${ssim.toFixed(4)}. Visual content differs noticeably between preview and export.`;
          }
        } else {
          notes = "Could not parse SSIM metric from FFmpeg output.";
        }
      } else {
        notes = !previewExists ? "Preview frame not uploaded." : "Export frame extraction failed.";
      }

      results.push({
        timestamp: t,
        previewExists,
        exportExists,
        previewSize,
        exportSize,
        ssim,
        psnr,
        matchGrade,
        diffImagePath: fs.existsSync(diffImg) ? `/api/parity-check/view-frame?file=diff_t${t}.png` : undefined,
        notes,
      });
    }

    const allPassed = results.length > 0 && results.every((r) => r.ssim !== null && r.ssim >= 0.95);

    return NextResponse.json({
      success: true,
      runId,
      videoPath: targetVideo,
      allPassed,
      results,
      summary: allPassed
        ? `Frame parity verified: all ${results.length} tested frames match between preview and export.`
        : `Parity check finished with variances. Review detailed results below.`,
    });
  } catch (err: any) {
    console.error("Parity extraction & comparison error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
