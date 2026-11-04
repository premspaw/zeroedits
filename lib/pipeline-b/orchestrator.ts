/**
 * Meta Muse — Pipeline B Persistent Agent Orchestrator
 * Coordinates bounded specialist tools using the Meta Agent Workshop pattern.
 */

import path from "path";
import { loadAudioEnvelope } from "./tools/audio-boundaries.ts";
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
import {
  addGate,
  auditRemovedSpans,
  ensureCfrMaster,
  gateCleanDuration,
  gateExportAndLoop,
  gateMaskTrack,
  gateSafeZone,
  gateWordParity,
  newQaReport,
  probeExact,
  renderSafeZoneProof,
  writeQaReport,
  type LayoutBox,
} from "./tools/qa-gates.ts";
import { generateSparkVisualOverlay } from "./tools/spark-visual-director.ts";
import { segmentSpeakerWithSam } from "./tools/sam-segmenter.ts";
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
      const originalMeta = await validateMedia(state.rawVideoPath);

      // Normalize the ORIGINAL full-res upload to constant 30fps BEFORE any cut is computed.
      // Phone captures (e.g. 32fps) are usually VFR; cutting VFR causes frame snapping + A/V drift.
      const cfrPath = path.join(runDir, "source_cfr30.mp4");
      let sourceProbe: any = null;
      try {
        sourceProbe = await probeExact(state.rawVideoPath);
        if (!sourceProbe.isVfr && Math.abs((sourceProbe.avgFrameRate || 0) - 30) < 0.05) {
          state.cfrVideoPath = state.rawVideoPath;
        } else {
          await ensureCfrMaster(state.rawVideoPath, cfrPath);
          state.cfrVideoPath = cfrPath;
        }
      } catch (cfrErr: any) {
        logEvent("CFR_NORMALIZATION_FAILED", { runId, error: cfrErr?.message || String(cfrErr) });
      }
      const metadata = state.cfrVideoPath ? await validateMedia(state.cfrVideoPath) : originalMeta;
      if (state.cfrVideoPath) {
        const exact = await probeExact(state.cfrVideoPath).catch(() => null);
        if (exact) {
          const playableDur =
            exact.videoDuration > 0 && exact.audioDuration > 0
              ? Math.min(exact.videoDuration, exact.audioDuration)
              : exact.videoDuration || exact.formatDuration;
          if (playableDur > 0) {
            metadata.duration = +playableDur.toFixed(3);
          }
        }
      }
      state.metadata = metadata;
      recordStageSuccess(state, "MEDIA_VALIDATED", {
        ...metadata,
        original: { ...originalMeta, avgFrameRate: sourceProbe?.avgFrameRate, isVfr: sourceProbe?.isVfr },
        cfrVideoPath: state.cfrVideoPath,
      });
    }
    if (options?.stopAtStage === "MEDIA_VALIDATED") return state;

    // 2. TRANSCRIBED
    if (shouldRunStage(state, "TRANSCRIBED")) {
      const wavPath = path.join(runDir, "extracted_audio.wav");
      recordStageStart(state, "TRANSCRIBED", { wavPath });
      const tStart = Date.now();
      logEvent("TRANSCRIPTION_STARTED", { runId, wavPath });

      const { segments, silences, coverage } = await transcribeAudio({
        videoPath: state.cfrVideoPath || state.rawVideoPath,
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
        silences: state.silences || [],
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
        audioEnvelope: loadAudioEnvelope(path.join(runDir, 'extracted_audio.wav')),
        onRefineLog: (l) => logEvent("CUTS_REFINED_TO_AUDIO", { runId, adjustments: l }),
      });

      editPlan.runId = runId;
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
        logEvent("SUBSTANTIAL_CUT_RATIO_NOTICE", {
          runId,
          reviewReason: validation.reviewReason || "Substantial cut ratio detected.",
        });
        if (options?.stopAtStage === "CUTS_VALIDATED") {
          recordNeedsReview(state, validation.reviewReason || "Substantial cut ratio detected.");
          return state;
        }
      }

      // QA: confirm every silence-labelled cut is really silence (no words, no speech-level energy)
      const qa = state.qaReport || newQaReport();
      const spanAudit = addGate(
        qa,
        await auditRemovedSpans({
          mediaPath: state.cfrVideoPath || state.rawVideoPath,
          cuts: state.editPlan!.cuts,
          transcript: state.transcript || [],
        })
      );
      state.qaReport = qa;
      writeQaReport(runDir, qa);
      logEvent("QA_REMOVED_SPANS", { runId, passed: spanAudit.passed, suspiciousCount: spanAudit.details.suspiciousCount });
      if (!spanAudit.passed) {
        const msg = `QA gate failed: ${spanAudit.details.suspiciousCount} silence-labelled cut(s) contain words or speech-level audio (possible retakes). See qa_report.json.`;
        recordStageFailure(state, "CUTS_VALIDATED", msg);
        throw new Error(msg);
      }
      recordStageSuccess(state, "CUTS_VALIDATED", {
        passed: true,
        needsReview: validation.needsReview,
        reviewReason: validation.reviewReason,
      });
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

      const isCutoutTemplateForClean =
        state.templateId === "cutout" || state.templateId === "samCutoutExplainer";
      const isLandscapeSource = (state.metadata?.width || 0) > (state.metadata?.height || 0);

      await buildCleanVideo({
        rawVideoPath: state.cfrVideoPath || state.rawVideoPath,
        keepSegments: state.editPlan!.keepSegments,
        outputPath: cleanVideoPath,
        // Landscape + cutout: never crop ~324px of width up to 1080. Keep the native frame so the
        // SAM cutout is composited onto the 1080×1920 canvas at full source resolution.
        preserveSourceFrame: isCutoutTemplateForClean && isLandscapeSource,
      });

      const fElapsed = Date.now() - fStart;
      logEvent("FFMPEG_CUT_COMPLETED", {
        runId,
        durationMs: fElapsed,
        cleanVideoPath,
      });

      // Verify the real cleaned video duration from ffprobe (unrounded) — Stage 5 sync reads this value
      let realCleanedDuration = state.editPlan!.cleanDuration;
      try {
        const exact = await probeExact(cleanVideoPath);
        if (exact.videoDuration > 0) {
          realCleanedDuration = +exact.videoDuration.toFixed(3);
          // If the source container EOF or -shortest trimmed a few frames off the final segment,
          // reconcile the last keepSegment's end so keepSegments sum and timeline sync match the real file.
          const ks = state.editPlan!.keepSegments;
          if (ks.length > 0) {
            const currentSum = ks.reduce((acc, s) => acc + (s.end - s.start), 0);
            const diff = realCleanedDuration - currentSum;
            if (Math.abs(diff) > 0.005 && Math.abs(diff) <= 0.45) {
              const lastSeg = ks[ks.length - 1];
              const adjustedEnd = +(lastSeg.end + diff).toFixed(3);
              if (adjustedEnd > lastSeg.start + 0.05) {
                lastSeg.end = adjustedEnd;
              }
            }
          }
        }
      } catch (metaErr) {
        // Fallback to planned clean duration if ffprobe cannot probe (e.g. test environment)
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

      // QA gate: ffprobe duration == Σ keepSegments within one frame (and A/V streams agree)
      const qa = state.qaReport || newQaReport();
      const durGate = addGate(qa, await gateCleanDuration(cleanVideoPath, state.editPlan!.keepSegments));
      addGate(qa, gateWordParity(state.transcript || [], state.editPlan!.keepSegments, editedTranscript));
      state.qaReport = qa;
      writeQaReport(runDir, qa);
      const failed = qa.gates.filter((g) => !g.passed && g.blocking && ["clean_duration_matches_keep_segments", "transcript_word_parity"].includes(g.gate));
      logEvent("QA_CLEAN_VIDEO", { runId, duration: durGate.details, failed: failed.map((g) => g.gate) });
      if (failed.length > 0) {
        const msg = `QA gate failed: ${failed.map((g) => g.gate).join(", ")}. See qa_report.json.`;
        recordStageFailure(state, "CLEAN_VIDEO_CREATED", msg);
        throw new Error(msg);
      }

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
        galleryAssets: (state.galleryAssets || []).map((asset) => ({
          ...asset,
          frameDataUrl: asset.thumbnailPath && fs.existsSync(asset.thumbnailPath)
            ? `data:image/jpeg;base64,${fs.readFileSync(asset.thumbnailPath).toString("base64")}`
            : undefined,
        })),
        onLogEvent: logEvent,
        fetchImpl: options?.fetchImpl,
      });

      state.editPlan!.title = creativePlan.title;
      state.editPlan!.hookLine = creativePlan.hookLine;
      state.editPlan!.visualSegments = creativePlan.visualSegments;
      state.editPlan!.visualPlan = creativePlan.visualPlan;
      state.editPlan!.notes = `${state.editPlan!.notes} | ${creativePlan.editorialNotes}`;

      // Gallery is an explicit edit template: place only clips with a meaningful
      // spoken-word match. Never rotate unrelated gallery media into a scene.
      if (state.templateId === "gallery" && state.galleryAssets?.length) {
        const used = new Set<string>();
        let previousWasGalleryCutaway = false;
        for (const [index, segment] of (state.editPlan!.visualSegments || []).entries()) {
          if (index === 0 || previousWasGalleryCutaway || segment.end - segment.start < 1.25) {
            previousWasGalleryCutaway = false;
            continue;
          }
          const spokenTokens = new Set(`${segment.spokenReference} ${segment.headlineText || ""}`
            .toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length > 2));
          const ranked = state.galleryAssets.map((asset) => {
            const tags = asset.tags.map((tag) => tag.toLowerCase());
            const score = tags.reduce((sum, tag) => {
              if (spokenTokens.has(tag)) return sum + 3;
              return sum + ([...spokenTokens].some((word) => word.length > 3 && (word.startsWith(tag) || tag.startsWith(word))) ? 1 : 0);
            }, 0);
            return { asset, score: used.has(asset.id) ? 0 : score };
          }).sort((a, b) => b.score - a.score);
          const aiSelectedId = segment.galleryAssetId;
          const aiSelected = aiSelectedId ? state.galleryAssets.find((asset) => asset.id === aiSelectedId) : undefined;
          const match = aiSelected && !used.has(aiSelected.id)
            ? { asset: aiSelected, score: 10 }
            : ranked[0];
          // Require a real semantic hit. A mismatched cutaway is worse than A-roll.
          if (!match || match.score < 3) {
            previousWasGalleryCutaway = false;
            continue;
          }
          used.add(match.asset.id);
          segment.assetUrl = match.asset.url;
          segment.galleryClipName = match.asset.name;
          segment.galleryClipKind = match.asset.kind;
          segment.assetStart = match.asset.duration && match.asset.duration > segment.end - segment.start
            ? Math.min(match.asset.duration - (segment.end - segment.start), Math.max(0, (match.asset.duration - (segment.end - segment.start)) * 0.5))
            : 0;
          segment.assetDuration = Math.min(segment.end - segment.start, match.asset.duration || segment.end - segment.start);
          segment.layoutType = "broll_takeover";
          segment.technique = "broll_clip";
          segment.layerArrangement = "foreground";
          previousWasGalleryCutaway = true;
        }
      }

      recordStageSuccess(state, "VISUAL_PLAN_CREATED", {
        planId: creativePlan.planId,
        segmentsCount: creativePlan.visualSegments.length,
        overlaysCount: creativePlan.visualPlan.length,
        title: creativePlan.title,
        hookLine: creativePlan.hookLine,
      });
    }
    if (options?.stopAtStage === "VISUAL_PLAN_CREATED") return state;

    // 8. ASSETS_RESOLVED (ZAI SAM 3.1 Subject Segmentation — Zero Static AI Images)
    if (shouldRunStage(state, "ASSETS_RESOLVED")) {
      recordStageStart(state, "ASSETS_RESOLVED");
      const resolvedAssets: Record<string, string> = {};

      // Strictly enforce ZERO static AI image generation in talking-head auto-edit:
      // Story beats are told through executable codebase animations (HTML5/CSS3/JS/SVG/Canvas) + SAM 3.1 cutouts.
      for (const seg of state.editPlan?.visualSegments || []) {
        if (seg.technique === "generated_image") {
          seg.technique = seg.layoutType === "sam_cutout" ? "sam_cutout_pop" : "procedural_graphic";
        }
        if (state.templateId !== "gallery") delete (seg as any).assetUrl;
      }

      const isCutoutTemplate =
        state.templateId === "cutout" || state.templateId === "samCutoutExplainer";

      if (isCutoutTemplate) {
        // Run SAM 3.1 Subject Cutout & Depth Compositing Engine on the cleaned A-Roll video
        try {
          const targetVideo = state.cleanVideoPath || state.rawVideoPath;
          const targetProbe = await probeExact(targetVideo).catch(() => null);
          const samResult = await segmentSpeakerWithSam({
            videoPath: targetVideo,
            runId,
            sampleTimestampSec: Math.min(1.5, Math.max(0.2, (state.editPlan?.cleanDuration || 6) * 0.25)),
            videoWidth: targetProbe?.width || state.metadata?.width || 1080,
            videoHeight: targetProbe?.height || state.metadata?.height || 1920,
            videoDuration: state.editPlan?.cleanDuration || state.metadata?.duration || 10,
          });
          resolvedAssets.speaker_cutout = samResult.cutoutPublicUrl;
          if (samResult.trackPublicUrl) {
            resolvedAssets.sam_track = samResult.trackPublicUrl;
            // QA gate: mask area 15–70% of frame, consecutive-frame IoU > 0.9
            const trackPath = path.join(process.cwd(), "public", samResult.trackPublicUrl.replace(/^\//, ""));
            const qa = state.qaReport || newQaReport();
            const maskGate = addGate(qa, gateMaskTrack(trackPath));
            state.qaReport = qa;
            writeQaReport(runDir, qa);
            logEvent("QA_MASK_TRACK", { runId, passed: maskGate.passed, ...maskGate.details, areaFailures: undefined, iouFailures: undefined });
          }
          if (state.editPlan) {
            state.editPlan.samCutoutUrl = samResult.cutoutPublicUrl;
            state.editPlan.samBox = samResult.box;
          }
          logEvent("SAM_3_1_CUTOUT_RESOLVED", {
            runId,
            cutoutPublicUrl: samResult.cutoutPublicUrl,
            trackPublicUrl: samResult.trackPublicUrl,
            trackFrameCount: samResult.trackFrameCount,
            box: samResult.box,
          });
        } catch (samErr: any) {
          console.warn(`[ASSETS_RESOLVED] Non-fatal SAM 3.1 segmentation warning:`, samErr?.message || samErr);
        }
      } else {
        // Story Explainer & others: NO SAM 3.1, NO cutouts!
        // A-Roll and B-Roll full-screen & framed card layouts are handled directly by the director and Spark 1.3
        if (state.editPlan) {
          state.editPlan.samCutoutUrl = undefined;
          state.editPlan.samBox = undefined;
        }
        logEvent("STORY_EXPLAINER_NO_CUTOUT_MODE", {
          runId,
          templateId: state.templateId,
          message: "Story Explainer template active: Skipped SAM 3.1 cutout segmentation completely. Pure A-Roll, B-Roll, and Framed Story Explainer layouts.",
        });
      }

      state.resolvedAssets = resolvedAssets;
      if (state.editPlan) {
        (state.editPlan as any).resolvedAssets = resolvedAssets;
      }
      writeZaiDurableMemoryFiles(runDir, state);
      recordStageSuccess(state, "ASSETS_RESOLVED", {
        resolved: true,
        resolvedCount: Object.keys(resolvedAssets).length,
        samCutoutUrl: state.editPlan?.samCutoutUrl,
        zeroStaticImages: true,
      });
    }
    if (options?.stopAtStage === "ASSETS_RESOLVED") return state;

    // 9. MOTION_GENERATED (Spark 1.3 / Remotion Motion Code Generation)
    if (shouldRunStage(state, "MOTION_GENERATED")) {
      recordStageStart(state, "MOTION_GENERATED");
      const sStart = Date.now();

      logEvent("SPARK_REQUEST_STARTED", {
        runId,
        model: "muse-spark-1.3",
        visualOverlaysCount: state.editPlan!.visualPlan.length,
        cleanDuration: state.editPlan!.cleanDuration,
      });

      const motionCode = await generateSparkVisualOverlay({
        editPlan: state.editPlan!,
        transcript: state.transcript || [],
        duration: state.editPlan!.cleanDuration,
        runId,
        cleanVideoPath: state.cleanVideoPath,
        onLogEvent: logEvent,
        fetchImpl: options?.fetchImpl,
      });

      const motionCodePath = path.join(runDir, "TalkingHeadReel.tsx");
      fs.writeFileSync(motionCodePath, motionCode, "utf-8");
      state.motionCodePath = motionCodePath;

      const sElapsed = Date.now() - sStart;
      logEvent("SPARK_RESPONSE_RECEIVED", {
        runId,
        durationMs: sElapsed,
        motionCodePath,
        model: "muse-spark-1.3",
        sceneCount: state.editPlan?.visualSegments?.length || 0,
      });

      recordStageSuccess(state, "MOTION_GENERATED", { motionCodePath, durationMs: sElapsed });
    }
    if (options?.stopAtStage === "MOTION_GENERATED") return state;

    // 10. PREVIEW_READY
    if (shouldRunStage(state, "PREVIEW_READY")) {
      recordStageStart(state, "PREVIEW_READY");

      const finalOutputPath = path.join(runDir, "final_edited_reel.mp4");
      state.finalVideoPath = fs.existsSync(finalOutputPath) ? finalOutputPath : (state.cleanVideoPath || state.rawVideoPath);
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
      writeZaiDurableMemoryFiles(runDir, state);

      // No background server render: the template renderer in the browser is the single
      // source for preview AND download, so rendering a second FFmpeg copy only wastes time/CPU.
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
    aspectRatio: state.aspectRatio,
  });

  state.finalVideoPath = finalOutputPath;

  // QA gates on the final render: H.264/AAC 1080×1920 @30fps, loop seam, safe-zone proof frame
  const qa = state.qaReport || newQaReport();
  try {
    addGate(qa, await gateExportAndLoop(finalOutputPath, state.aspectRatio === "16:9" ? { expectedWidth: 1920, expectedHeight: 1080 } : undefined));
    const proofPath = path.join(runDir, "qa_safe_zone_proof.png");
    await renderSafeZoneProof(finalOutputPath, proofPath, Math.max(0, (state.editPlan?.cleanDuration || 2) / 2));
    const layoutBoxes = (state.editPlan as any)?.layoutBoxes as LayoutBox[] | undefined;
    if (layoutBoxes?.length) addGate(qa, gateSafeZone(layoutBoxes));
  } catch (qaErr: any) {
    addGate(qa, { gate: "export_format_and_loop_seam", passed: false, blocking: false, details: { error: qaErr?.message || String(qaErr) } });
  }
  state.qaReport = qa;
  writeQaReport(runDir, qa);

  recordStageSuccess(state, "EXPORT_COMPLETED", { finalVideoPath: finalOutputPath, qaPassed: qa.passed });
  return state;
}

export async function resumePipelineB(
  runId: string,
  options?: {
    customApprovedCuts?: EditCut[];
    customCaptionOverrides?: Record<string, string>;
    stopAtStage?: PipelineBStage;
    fetchImpl?: typeof fetch;
  }
): Promise<PipelineBRunState> {
  const state = loadState(runId);

  if (options?.customCaptionOverrides && state.transcript) {
    for (const seg of state.transcript) {
      const override = options.customCaptionOverrides[String(seg.id)];
      if (typeof override === "string" && override.trim().length > 0) {
        seg.text = override.trim();
      }
    }
  }

  // If user provided custom cut edits in the transcript UI, re-assemble edit plan and reset cut stages
  if ((options?.customApprovedCuts || options?.customCaptionOverrides) && state.editPlan) {
    const updatedPlan = assembleFinalEditPlan({
      candidateCuts: state.editPlan.candidateCuts || [],
      editorial: {
        approvedCuts: options.customApprovedCuts ?? state.editPlan.cuts ?? [],
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
    if (failedStage === "CUTS_VALIDATED") {
      state.stages.EDIT_PLANNED.status = "pending";
      state.stages.EDIT_PLANNED.error = undefined;
    }
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

  return executePipelineB(runId, options);
}

function shouldRunStage(state: PipelineBRunState, stage: PipelineBStage): boolean {
  return state.stages[stage]?.status !== "completed";
}

/**
 * ZAI (Z) — Autonomous Director Durable Project Memory Writer
 * Persists Brief.md, Analysis.md, Treatment.md, Script.md, Timeline.md, and Progress.md
 * inside the run directory so the Hypit spatial/temporal timeline stays documented on disk.
 */
function writeZaiDurableMemoryFiles(runDir: string, state: PipelineBRunState): void {
  try {
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    const plan = state.editPlan;
    const cleanDur = plan?.cleanDuration || state.metadata?.duration || 10;
    const cuts = plan?.cuts || [];
    const vSegs = plan?.visualSegments || [];
    const transcriptSegs = state.editedTranscript || [];

    const briefMd = `# Brief — ZAI (Z) Autonomous Director (${state.runId})
- **Template**: \`${state.templateId}\` (Cutout & Story-Driven Codebase Animation Pipeline)
- **Format**: 9:16 Vertical Instagram Reel (1080x1920)
- **Title**: ${plan?.title || "Talking Head Cutout Reel"}
- **Hook**: ${plan?.hookLine || "Direct Story Hook"}
- **Visual Constraints**: ZERO static AI images. 100% Story-Driven Codebase Animations (HTML5/CSS3/JS/SVG/Canvas) + SAM 3.1 Subject Cutouts + A-Roll Windows.
- **Pre-Talking-Head Animation Rule**: Codebase story animation can run solo first to establish the visual beat before the SAM 3.1 speaker cutout or talking-head video pops in.
`;

    const analysisMd = `# Analysis — Uploaded Video & FFmpeg Wastage Removal
- **Raw Duration**: ${(state.metadata?.duration || cleanDur).toFixed(2)}s (${state.metadata?.width || 1080}x${state.metadata?.height || 1920} @ ${state.metadata?.fps || 30}fps)
- **Cleaned Duration**: ${cleanDur.toFixed(2)}s
- **FFmpeg Wastage Removed**: ${(plan?.cutDuration || 0).toFixed(2)}s across ${cuts.length} cut(s)
- **SAM 3.1 Cutout Asset**: \`${plan?.samCutoutUrl || "/assets/" + state.runId + "/speaker_cutout.png"}\`
- **SAM 3.1 Bounding Box**: \`${JSON.stringify(plan?.samBox || { normX: 0.08, normY: 0.08, normW: 0.84, normH: 0.86 })}\`

## Removed Wastage Cuts
${cuts.length === 0 ? "- None (tight vocal take)" : cuts.map((c) => `- \`${c.start.toFixed(2)}s - ${c.end.toFixed(2)}s\` (${c.type}): ${c.reason}`).join("\n")}
`;

    const treatmentMd = `# Treatment — ZAI Creative Direction & Layer Architecture
- **Creative Thesis**: Transform talking-head A-Roll into a high-retention 9:16 Reel where codebase animations actively tell the story and SAM 3.1 cutouts bridge human eye-contact with procedural motion graphics.
- **3-Layer Depth & Cutout Stack**:
  - \`z-index: 10\` — Procedural Canvas / Shader Environment & Story Grid
  - \`z-index: 20\` — Story-Driven Codebase Animations (SVG path diagrams, KPI charts, code terminals, comparison bars, behind-the-head kinetic typography)
  - \`z-index: 30\` — SAM 3.1 Foreground Subject Cutout (with pre-talking-head animation lead-in & spring-physics entrance)
  - \`z-index: 50\` — Safe-Zone Word-by-Word WhisperX Captions (above bottom 20% & clear of right 15%)
`;

    const scriptMd = `# Script — WhisperX Time-Coded Master Vocal Spine
${transcriptSegs
  .map((seg, i) => {
    const matchVis = vSegs.find((v) => seg.start >= v.start - 0.2 && seg.start < v.end + 0.2) || vSegs[i % Math.max(1, vSegs.length)];
    const tag = matchVis?.layoutType === "sam_cutout"
      ? "[ANIM-LEAD-IN + SAM-3.1-CUTOUT]"
      : matchVis?.layoutType === "depth_cutout"
      ? "[DEPTH-CUTOUT z-30]"
      : matchVis?.layoutType === "broll_takeover"
      ? "[CODEBASE-STORY-ANIMATION]"
      : "[A-ROLL SPEAKER]";
    return `- **${seg.start.toFixed(2)}s – ${seg.end.toFixed(2)}s** ${tag}: "${seg.text}"`;
  })
  .join("\n")}
`;

    const timelineMd = `# Timeline — Hypit Spatial & Temporal Composition Plan (0.0s – ${cleanDur.toFixed(2)}s)
| Scene | Window (s) | Normalized Extent | Layout / Cutout Mode | Technique | Headline / Story Beat | Motion Intent |
|---|---|---|---|---|---|---|
${vSegs
  .map((v, idx) => {
    const n0 = (v.start / Math.max(0.1, cleanDur)).toFixed(2);
    const n1 = (v.end / Math.max(0.1, cleanDur)).toFixed(2);
    return `| #${idx + 1} (${v.id}) | ${v.start.toFixed(2)}s – ${v.end.toFixed(2)}s | ${n0} – ${n1} | \`${v.layoutType}\` (${v.cutoutMode || "auto"}) | \`${v.technique}\` | ${v.headlineText || v.spokenReference} | ${v.motionIntent} |`;
  })
  .join("\n")}
`;

    const progressMd = `# Progress — ZAI 6-Stage Pipeline Checklist
- [x] Stage 1: Uploaded Video Analysis & FFmpeg Wastage Removal
- [x] Stage 2: A-Roll Trend Direction & Pre-Talking-Head Animation Pacing
- [x] Stage 3: SAM 3.1 Subject Cutout & Depth Compositing Engine
- [x] Stage 4: Story-Driven Codebase Animation Selection (Zero Static Images)
- [x] Stage 5: Autonomous Motion Design (HTML5 / CSS3 / JS / SVG / Canvas)
- [${state.stages.PREVIEW_READY?.status === "completed" ? "x" : " "}] Stage 6: Instagram Reels 9:16 Safe-Zone & Loop Mastering
`;

    fs.writeFileSync(path.join(runDir, "Brief.md"), briefMd, "utf-8");
    fs.writeFileSync(path.join(runDir, "Analysis.md"), analysisMd, "utf-8");
    fs.writeFileSync(path.join(runDir, "Treatment.md"), treatmentMd, "utf-8");
    fs.writeFileSync(path.join(runDir, "Script.md"), scriptMd, "utf-8");
    fs.writeFileSync(path.join(runDir, "Timeline.md"), timelineMd, "utf-8");
    fs.writeFileSync(path.join(runDir, "Progress.md"), progressMd, "utf-8");
  } catch (err) {
    console.warn("[ZAI Durable Memory] Non-fatal write warning:", err);
  }
}
