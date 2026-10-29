/**
 * Meta Muse — Pipeline B Persistent Agent Orchestrator
 * Coordinates bounded specialist tools using the Meta Agent Workshop pattern.
 */

import path from "path";
import fs from "fs";
import type { PipelineBRunState, PipelineBStage, EditCut } from "./types.ts";
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
import {
  generateCandidateCuts,
  assembleFinalEditPlan,
  PACING_CONFIGS,
} from "./tools/edit-planner.ts";
import {
  callWonderEditorialCleanup,
  callWonderCreativeDirector,
  buildEditedTranscript,
} from "./tools/wonder-director.ts";
import { validateCuts } from "./tools/cuts-validator.ts";
import { buildCleanVideo } from "./tools/clean-video-builder.ts";
import { generateTalkingHeadMotionCode } from "./tools/motion-generator.ts";
import { generateMuseImage } from "./tools/image-generator.ts";
import { exportFinalVideo } from "./tools/export-service.ts";

export interface OrchestratorRunOptions {
  stopAtStage?: PipelineBStage;
  fetchImpl?: typeof fetch;
}

export async function executePipelineB(
  runId: string,
  options?: OrchestratorRunOptions
): Promise<PipelineBRunState> {
  const state = loadState(runId);
  const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);

  const logEvent = (event: string, meta?: any) => {
    state.logs.push({
      timestamp: new Date().toISOString(),
      level: "info",
      message: `[${event}] runId=${runId} ${JSON.stringify(meta || {})}`,
    });
    saveState(state);
  };

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
      const tStart = Date.now();
      logEvent("TRANSCRIPTION_STARTED", { runId, wavPath });

      const { segments, silences, coverage } = await transcribeAudio({
        videoPath: state.rawVideoPath,
        wavPath,
        totalDuration: state.metadata?.duration || 15,
        userScript: state.userScript,
      });

      const tElapsed = Date.now() - tStart;
      const allWords = segments.flatMap((s) => s.words);
      state.transcript = segments;
      state.silences = silences;
      if (coverage) state.transcriptionCoverage = coverage;

      logEvent("TRANSCRIPTION_COMPLETED", {
        runId,
        durationMs: tElapsed,
        wordsCount: allWords.length,
        segmentsCount: segments.length,
        silencesCount: silences.length,
        coverage,
      });

      recordStageSuccess(state, "TRANSCRIBED", {
        segmentsCount: segments.length,
        silencesCount: silences.length,
        wordsCount: allWords.length,
        durationMs: tElapsed,
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

    // 4. EDIT_PLANNED (Candidate Cut Detection + Wonder Muse AI Editorial Director)
    if (shouldRunStage(state, "EDIT_PLANNED")) {
      recordStageStart(state, "EDIT_PLANNED");
      const allWords = (state.transcript || []).flatMap((s) => s.words);
      const pacingProfile = state.pacingProfile || "natural";
      const pacing = PACING_CONFIGS[pacingProfile] || PACING_CONFIGS.natural;

      // Step 4a: Candidate Cut Detection (Silences, Fillers, Repetitions, False Starts)
      const candidateCuts = generateCandidateCuts({
        allWords,
        transcript: state.transcript || [],
        silences: state.silences || [],
        totalDuration: state.metadata?.duration || 15,
        pacing,
        userScript: state.userScript,
      });

      // Step 4b: Wonder Muse AI Stage A — Editorial Cleanup (Cut approval & rhetorical protection)
      // Fail-safe behavior: If Wonder fails or is unconfigured, throws an explicit error and preserves original video.
      const cleanupDecision = await callWonderEditorialCleanup({
        transcript: state.transcript || [],
        candidateCuts,
        totalDuration: state.metadata?.duration || 15,
        templateId: state.templateId,
        userScript: state.userScript,
        pacingProfile,
        runId,
        mode: state.mode || "wonder-ai",
        onLogEvent: logEvent,
        fetchImpl: options?.fetchImpl,
      });

      // Step 4c: Assemble Edit Decision List from validated cuts
      const editPlan = assembleFinalEditPlan({
        candidateCuts,
        editorial: {
          approvedCuts: cleanupDecision.approvedCuts,
          protectedRanges: cleanupDecision.protectedRanges,
          visualPlan: [],
          hookLine: (state.transcript?.[0]?.words || []).slice(0, 6).map((w) => w.word).join(" ") || "Talking Head Reel",
          editorialNotes: cleanupDecision.editorialNotes,
          uncertainDecisions: cleanupDecision.uncertainDecisions,
        },
        totalDuration: state.metadata?.duration || 15,
        templateId: state.templateId,
        pacingProfile,
        transcript: state.transcript || [],
      });

      state.editPlan = editPlan;
      recordStageSuccess(state, "EDIT_PLANNED", {
        planId: cleanupDecision.planId,
        cutsCount: editPlan.cuts.length,
        cleanDuration: editPlan.cleanDuration,
        cutSilenceDuration: editPlan.cutSilenceDuration,
        cutSilenceSegmentsCount: editPlan.cutSilenceSegmentsCount,
        cutRepetitionsCount: editPlan.cutRepetitionsCount || 0,
        cutFillersCount: editPlan.cutFillersCount || 0,
        protectedRangesCount: cleanupDecision.protectedRanges.length,
        uncertainDecisionsCount: cleanupDecision.uncertainDecisions?.length || 0,
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

    // 6. CLEAN_VIDEO_CREATED (Deterministic FFmpeg Media Cutting based strictly on AI-approved cuts)
    if (shouldRunStage(state, "CLEAN_VIDEO_CREATED")) {
      const cleanVideoPath = path.join(runDir, "clean_video.mp4");
      recordStageStart(state, "CLEAN_VIDEO_CREATED", { cleanVideoPath });
      const fStart = Date.now();

      logEvent("FFMPEG_CUT_STARTED", {
        runId,
        keepSegmentsCount: state.editPlan!.keepSegments.length,
        cleanDuration: state.editPlan!.cleanDuration,
        rawVideoPath: state.rawVideoPath,
        outputPath: cleanVideoPath,
      });

      await buildCleanVideo({
        rawVideoPath: state.rawVideoPath,
        keepSegments: state.editPlan!.keepSegments,
        outputPath: cleanVideoPath,
      });

      const fElapsed = Date.now() - fStart;
      logEvent("FFMPEG_CUT_COMPLETED", {
        runId,
        durationMs: fElapsed,
        cleanVideoPath,
      });

      // Verify the real cleaned video duration and media stream on disk
      let realCleanedDuration = state.editPlan!.cleanDuration;
      try {
        const cleanMetadata = await validateMedia(cleanVideoPath);
        if (cleanMetadata && cleanMetadata.duration > 0) {
          realCleanedDuration = +cleanMetadata.duration.toFixed(2);
        }
      } catch (metaErr) {
        // Fallback to planned clean duration if validateMedia cannot probe (e.g. test environment)
      }

      // Rebuild final source-to-edited timeline mapping using the verified clean video duration
      state.editPlan!.cleanDuration = realCleanedDuration;

      // Compute edited transcript and timestamp mapping on verified clean video timeline
      const editedTranscript = buildEditedTranscript(
        state.transcript || [],
        state.editPlan!.keepSegments
      );
      state.editedTranscript = editedTranscript;
      state.editPlan!.editedTranscript = editedTranscript;

      logEvent("CLEAN_VIDEO_VERIFIED", {
        runId,
        cleanVideoPath,
        verifiedDuration: realCleanedDuration,
        editedWordsCount: editedTranscript.flatMap((s) => s.words).length,
      });

      state.cleanVideoPath = cleanVideoPath;
      recordStageSuccess(state, "CLEAN_VIDEO_CREATED", {
        cleanVideoPath,
        durationMs: fElapsed,
        verifiedDuration: realCleanedDuration,
        editedSegmentsCount: editedTranscript.length,
      });
    }
    if (options?.stopAtStage === "CLEAN_VIDEO_CREATED") return state;

    // 7. VISUAL_PLAN_CREATED (Stage B — Creative Direction)
    if (shouldRunStage(state, "VISUAL_PLAN_CREATED")) {
      recordStageStart(state, "VISUAL_PLAN_CREATED");

      // Stage B — Creative Direction: Analyze final clean narrative & design complete visual edit
      const creativePlan = await callWonderCreativeDirector({
        editedTranscript: state.editedTranscript || [],
        cleanDuration: state.editPlan!.cleanDuration,
        templateId: state.templateId,
        userScript: state.userScript,
        runId,
        mode: state.mode || "wonder-ai",
        onLogEvent: logEvent,
        fetchImpl: options?.fetchImpl,
      });

      state.editPlan!.title = creativePlan.title;
      state.editPlan!.hookLine = creativePlan.hookLine;
      state.editPlan!.visualSegments = creativePlan.visualSegments;
      state.editPlan!.visualPlan = creativePlan.visualPlan;
      state.editPlan!.notes = `${state.editPlan!.notes} | ${creativePlan.editorialNotes}`;

      recordStageSuccess(state, "VISUAL_PLAN_CREATED", {
        planId: creativePlan.planId,
        segmentsCount: creativePlan.visualSegments.length,
        overlaysCount: creativePlan.visualPlan.length,
        title: creativePlan.title,
        hookLine: creativePlan.hookLine,
      });
    }
    if (options?.stopAtStage === "VISUAL_PLAN_CREATED") return state;

    // 8. ASSETS_RESOLVED
    if (shouldRunStage(state, "ASSETS_RESOLVED")) {
      recordStageStart(state, "ASSETS_RESOLVED");
      const resolvedAssets: Record<string, string> = {};

      const imageSegments = (state.editPlan?.visualSegments || []).filter(
        (seg) => seg.technique === "generated_image" || seg.layoutType === "broll_takeover"
      );

      for (const seg of imageSegments) {
        try {
          const prompt =
            seg.headlineText ||
            seg.spokenReference ||
            seg.motionIntent ||
            "Cinematic social video b-roll";
          const genResult = await generateMuseImage({
            prompt,
            runId,
            assetId: seg.id,
          });
          resolvedAssets[seg.id] = genResult.publicUrl;
        } catch (assetErr) {
          console.warn(`[ASSETS_RESOLVED] Non-fatal asset generation warning for segment ${seg.id}:`, assetErr);
        }
      }

      state.resolvedAssets = resolvedAssets;
      recordStageSuccess(state, "ASSETS_RESOLVED", {
        resolved: true,
        resolvedCount: Object.keys(resolvedAssets).length,
      });
    }
    if (options?.stopAtStage === "ASSETS_RESOLVED") return state;

    // 9. MOTION_GENERATED (Spark 1.3 / Remotion Motion Code Generation)
    if (shouldRunStage(state, "MOTION_GENERATED")) {
      recordStageStart(state, "MOTION_GENERATED");
      const cleanVideoUrl = `/api/pipeline-b/media/${runId}/clean`;
      const sStart = Date.now();

      logEvent("SPARK_REQUEST_STARTED", {
        runId,
        model: "muse-spark-1.3",
        visualOverlaysCount: state.editPlan!.visualPlan.length,
        cleanDuration: state.editPlan!.cleanDuration,
      });

      const motionCode = generateTalkingHeadMotionCode({
        editPlan: state.editPlan!,
        transcript: state.transcript || [],
        cleanVideoUrl,
        templateId: state.templateId,
        resolvedAssets: state.resolvedAssets,
      });

      const motionCodePath = path.join(runDir, "TalkingHeadReel.tsx");
      fs.writeFileSync(motionCodePath, motionCode, "utf-8");
      state.motionCodePath = motionCodePath;

      const sElapsed = Date.now() - sStart;
      logEvent("SPARK_RESPONSE_RECEIVED", {
        runId,
        durationMs: sElapsed,
        motionCodePath,
      });

      recordStageSuccess(state, "MOTION_GENERATED", { motionCodePath, durationMs: sElapsed });
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

      logEvent("PREVIEW_READY", {
        runId,
        previewUrl: state.previewUrl,
        finalVideoPath: state.finalVideoPath,
      });

      recordStageSuccess(state, "PREVIEW_READY", {
        previewUrl: state.previewUrl,
        finalVideoPath: state.finalVideoPath,
      });
    }

    return state;
  } catch (err: any) {
    recordStageFailure(state, state.currentStage, err.message || "Unknown error occurred.");
    saveState(state);
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

export async function resumePipelineB(
  runId: string,
  options?: {
    customApprovedCuts?: EditCut[];
    customCaptionOverrides?: Record<string, string>;
  }
): Promise<PipelineBRunState> {
  const state = loadState(runId);

  // If user provided custom cut edits in the transcript UI, re-assemble edit plan and reset cut stages
  if (options?.customApprovedCuts && state.editPlan) {
    const updatedPlan = assembleFinalEditPlan({
      candidateCuts: state.editPlan.candidateCuts || [],
      editorial: {
        approvedCuts: options.customApprovedCuts,
        protectedRanges: state.editPlan.protectedRanges || [],
        visualPlan: state.editPlan.visualPlan || [],
        hookLine: state.editPlan.hookLine || "Talking Head Reel",
        title: state.editPlan.title,
      },
      totalDuration: state.metadata?.duration || 15,
      templateId: state.templateId,
      pacingProfile: state.pacingProfile,
      transcript: state.transcript || [],
    });
    state.editPlan = updatedPlan;
    state.stages.CLEAN_VIDEO_CREATED.status = "pending";
    state.stages.VISUAL_PLAN_CREATED.status = "pending";
    state.stages.ASSETS_RESOLVED.status = "pending";
    state.stages.MOTION_GENERATED.status = "pending";
    state.stages.PREVIEW_READY.status = "pending";
    state.status = "running";
    saveState(state);
  } else if (state.status === "failed") {
    // If paused or failed, reset the failed stage to pending and re-execute
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
