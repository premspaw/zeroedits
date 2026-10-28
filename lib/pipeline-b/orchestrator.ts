/**
 * Meta Muse — Pipeline B Persistent Agent Orchestrator
 * Coordinates bounded specialist tools using the Meta Agent Workshop pattern.
 */

import path from "path";
import fs from "fs";
import type { PipelineBRunState, PipelineBStage } from "./types.ts";
import {
  loadState,
  recordStageStart,
  recordStageSuccess,
  recordStageFailure,
  recordNeedsReview,
  saveState,
} from "./state.ts";
import { validateMedia } from "./tools/media-validator.ts";
import { transcribeAudio } from "./tools/transcription.ts";
import { alignTranscriptWithScript } from "./tools/transcript-aligner.ts";
import { planTalkingHeadEdit } from "./tools/edit-planner.ts";
import { validateCuts } from "./tools/cuts-validator.ts";
import { buildCleanVideo } from "./tools/clean-video-builder.ts";
import { generateTalkingHeadMotionCode } from "./tools/motion-generator.ts";
import { exportFinalVideo } from "./tools/export-service.ts";

export interface OrchestratorRunOptions {
  stopAtStage?: PipelineBStage;
}

export async function executePipelineB(
  runId: string,
  options?: OrchestratorRunOptions
): Promise<PipelineBRunState> {
  const state = loadState(runId);
  const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);

  try {
    // 1. MEDIA_VALIDATED
    if (shouldRunStage(state, "MEDIA_VALIDATED")) {
      recordStageStart(state, "MEDIA_VALIDATED", { videoPath: state.rawVideoPath });
      const metadata = await validateMedia(state.rawVideoPath);
      state.metadata = metadata;
      recordStageSuccess(state, "MEDIA_VALIDATED", metadata);
    }
    if (options?.stopAtStage === "MEDIA_VALIDATED") return state;

    // 2. TRANSCRIBED
    if (shouldRunStage(state, "TRANSCRIBED")) {
      const wavPath = path.join(runDir, "extracted_audio.wav");
      recordStageStart(state, "TRANSCRIBED", { wavPath });
      const { segments, silences } = await transcribeAudio({
        videoPath: state.rawVideoPath,
        wavPath,
        totalDuration: state.metadata?.duration || 15,
        userScript: state.userScript,
      });
      state.transcript = segments;
      state.silences = silences;
      recordStageSuccess(state, "TRANSCRIBED", {
        segmentsCount: segments.length,
        silencesCount: silences.length,
      });
    }
    if (options?.stopAtStage === "TRANSCRIBED") return state;

    // 3. TRANSCRIPT_ALIGNED
    if (shouldRunStage(state, "TRANSCRIPT_ALIGNED")) {
      recordStageStart(state, "TRANSCRIPT_ALIGNED");
      const alignment = alignTranscriptWithScript(state.transcript || [], state.userScript);
      state.alignedScript = {
        matchedWords: alignment.matchedWords,
        deviationScore: alignment.deviationScore,
        notes: alignment.notes,
      };
      recordStageSuccess(state, "TRANSCRIPT_ALIGNED", alignment);
    }
    if (options?.stopAtStage === "TRANSCRIPT_ALIGNED") return state;

    // 4. EDIT_PLANNED
    if (shouldRunStage(state, "EDIT_PLANNED")) {
      recordStageStart(state, "EDIT_PLANNED");
      const editPlan = planTalkingHeadEdit({
        transcript: state.transcript || [],
        silences: state.silences || [],
        totalDuration: state.metadata?.duration || 15,
        templateId: state.templateId,
        userScript: state.userScript,
      });
      state.editPlan = editPlan;
      recordStageSuccess(state, "EDIT_PLANNED", {
        cutsCount: editPlan.cuts.length,
        cleanDuration: editPlan.cleanDuration,
        cutSilenceDuration: editPlan.cutSilenceDuration,
        cutSilenceSegmentsCount: editPlan.cutSilenceSegmentsCount,
        cutRepetitionsCount: editPlan.cutRepetitionsCount || 0,
        cutFillersCount: editPlan.cutFillersCount || 0,
      });
    }
    if (options?.stopAtStage === "EDIT_PLANNED") return state;

    // 5. CUTS_VALIDATED (Independent Verification Layer)
    if (shouldRunStage(state, "CUTS_VALIDATED")) {
      recordStageStart(state, "CUTS_VALIDATED");
      const validation = validateCuts(state.editPlan!, state.metadata?.duration || 15);
      if (!validation.passed) {
        const errorMsg = `Cuts validation failed: ${validation.errors.join("; ")}`;
        recordStageFailure(state, "CUTS_VALIDATED", errorMsg);
        throw new Error(errorMsg);
      }
      if (validation.needsReview) {
        recordNeedsReview(state, validation.reviewReason || "Substantial cut ratio detected.");
        return state;
      }
      recordStageSuccess(state, "CUTS_VALIDATED", { passed: true });
    }
    if (options?.stopAtStage === "CUTS_VALIDATED") return state;

    // 6. CLEAN_VIDEO_CREATED (Deterministic Media Cutting)
    if (shouldRunStage(state, "CLEAN_VIDEO_CREATED")) {
      const cleanVideoPath = path.join(runDir, "clean_video.mp4");
      recordStageStart(state, "CLEAN_VIDEO_CREATED", { cleanVideoPath });
      await buildCleanVideo({
        rawVideoPath: state.rawVideoPath,
        keepSegments: state.editPlan!.keepSegments,
        outputPath: cleanVideoPath,
      });
      state.cleanVideoPath = cleanVideoPath;
      recordStageSuccess(state, "CLEAN_VIDEO_CREATED", { cleanVideoPath });
    }
    if (options?.stopAtStage === "CLEAN_VIDEO_CREATED") return state;

    // 7. VISUAL_PLAN_CREATED
    if (shouldRunStage(state, "VISUAL_PLAN_CREATED")) {
      recordStageStart(state, "VISUAL_PLAN_CREATED");
      const overlays = state.editPlan?.visualPlan || [];
      recordStageSuccess(state, "VISUAL_PLAN_CREATED", { overlaysCount: overlays.length });
    }
    if (options?.stopAtStage === "VISUAL_PLAN_CREATED") return state;

    // 8. ASSETS_RESOLVED
    if (shouldRunStage(state, "ASSETS_RESOLVED")) {
      recordStageStart(state, "ASSETS_RESOLVED");
      recordStageSuccess(state, "ASSETS_RESOLVED", { resolved: true });
    }
    if (options?.stopAtStage === "ASSETS_RESOLVED") return state;

    // 9. MOTION_GENERATED (Remotion / Motion code generation)
    if (shouldRunStage(state, "MOTION_GENERATED")) {
      recordStageStart(state, "MOTION_GENERATED");
      const cleanVideoUrl = `/api/pipeline-b/media/${runId}/clean`;
      const motionCode = generateTalkingHeadMotionCode({
        editPlan: state.editPlan!,
        transcript: state.transcript || [],
        cleanVideoUrl,
        templateId: state.templateId,
      });

      const motionCodePath = path.join(runDir, "TalkingHeadReel.tsx");
      fs.writeFileSync(motionCodePath, motionCode, "utf-8");
      state.motionCodePath = motionCodePath;
      recordStageSuccess(state, "MOTION_GENERATED", { motionCodePath });
    }
    if (options?.stopAtStage === "MOTION_GENERATED") return state;

    // 10. PREVIEW_READY
    if (shouldRunStage(state, "PREVIEW_READY")) {
      recordStageStart(state, "PREVIEW_READY");

      // Auto-export the final reel with cuts, punch-ins, burned subtitles, and hook badge
      try {
        const finalOutputPath = path.join(runDir, "final_edited_reel.mp4");
        await exportFinalVideo({
          cleanVideoPath: state.cleanVideoPath || state.rawVideoPath,
          editPlan: state.editPlan!,
          transcript: state.transcript || [],
          outputPath: finalOutputPath,
          templateId: state.templateId,
        });
        state.finalVideoPath = finalOutputPath;
      } catch (exportErr) {
        console.warn("[Pipeline B Orchestrator] Auto final export warning:", exportErr);
      }

      state.previewUrl = `/api/pipeline-b/preview/${runId}`;
      state.status = "completed";
      recordStageSuccess(state, "PREVIEW_READY", {
        previewUrl: state.previewUrl,
        finalVideoPath: state.finalVideoPath,
      });
    }

    return state;
  } catch (err: any) {
    recordStageFailure(state, state.currentStage, err.message || "Unknown error occurred.");
    throw err;
  }
}

export async function exportPipelineBVideo(runId: string): Promise<PipelineBRunState> {
  const state = loadState(runId);
  const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);

  if (state.stages.PREVIEW_READY.status !== "completed") {
    throw new Error(`Cannot export before preview is ready. Current stage: ${state.currentStage}`);
  }

  recordStageStart(state, "EXPORT_REQUESTED");
  recordStageSuccess(state, "EXPORT_REQUESTED", { requestedAt: new Date().toISOString() });

  recordStageStart(state, "EXPORT_COMPLETED");
  const finalOutputPath = path.join(runDir, "final_edited_reel.mp4");

  await exportFinalVideo({
    cleanVideoPath: state.cleanVideoPath || state.rawVideoPath,
    editPlan: state.editPlan!,
    transcript: state.transcript || [],
    outputPath: finalOutputPath,
    templateId: state.templateId,
  });

  state.finalVideoPath = finalOutputPath;
  recordStageSuccess(state, "EXPORT_COMPLETED", { finalVideoPath: finalOutputPath });
  return state;
}

export async function resumePipelineB(runId: string): Promise<PipelineBRunState> {
  const state = loadState(runId);

  // If paused or failed, reset the failed stage to pending and re-execute
  if (state.status === "failed") {
    const failedStage = state.currentStage;
    if (state.stages[failedStage]) {
      state.stages[failedStage].status = "pending";
      state.stages[failedStage].error = undefined;
    }
    state.status = "running";
    saveState(state);
  } else if (state.status === "needs_review") {
    // If escalated and human approved/resumed
    state.status = "running";
    state.reviewReason = undefined;
    saveState(state);
  }

  return executePipelineB(runId);
}

function shouldRunStage(state: PipelineBRunState, stage: PipelineBStage): boolean {
  return state.stages[stage]?.status !== "completed";
}
