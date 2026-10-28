/**
 * Meta Muse — Pipeline B Run State Persistence
 * Modeled after Meta Agent Workshop's `progress.py`.
 * Provides atomic state saves, stage tracking, and resumption.
 */

import fs from "fs";
import path from "path";
import type { PipelineBRunState, PipelineBStage, StageRecord } from "./types.ts";

const RUNS_ROOT = path.join(process.cwd(), "workspace", "pipeline-b", "runs");

const INITIAL_STAGES: PipelineBStage[] = [
  "UPLOADED",
  "MEDIA_VALIDATED",
  "TRANSCRIBED",
  "TRANSCRIPT_ALIGNED",
  "EDIT_PLANNED",
  "CUTS_VALIDATED",
  "CLEAN_VIDEO_CREATED",
  "VISUAL_PLAN_CREATED",
  "ASSETS_RESOLVED",
  "MOTION_GENERATED",
  "PREVIEW_READY",
  "EXPORT_REQUESTED",
  "EXPORT_COMPLETED",
];

function getRunFolder(runId: string): string {
  return path.join(RUNS_ROOT, runId);
}

function getStatePath(runId: string): string {
  return path.join(getRunFolder(runId), "state.json");
}

export function createRun(params: {
  runId?: string;
  rawVideoPath: string;
  userScript?: string;
  templateId?: string;
  mode?: "wonder-ai" | "rules-only";
}): PipelineBRunState {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runId = params.runId || `run-b-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
  const folder = getRunFolder(runId);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const stagesMap: Record<string, StageRecord> = {};
  for (const stage of INITIAL_STAGES) {
    stagesMap[stage] = {
      stage,
      status: stage === "UPLOADED" ? "completed" : "pending",
      ...(stage === "UPLOADED"
        ? {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: 0,
            output: { path: params.rawVideoPath },
          }
        : {}),
    };
  }

  // Also initialize error and review states
  stagesMap["FAILED"] = { stage: "FAILED", status: "pending" };
  stagesMap["NEEDS_REVIEW"] = { stage: "NEEDS_REVIEW", status: "pending" };

  const state: PipelineBRunState = {
    runId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStage: "UPLOADED",
    status: "idle",
    rawVideoPath: params.rawVideoPath,
    userScript: params.userScript || "",
    templateId: params.templateId || "hormoziPunch",
    mode: params.mode || "wonder-ai",
    stages: stagesMap as Record<PipelineBStage, StageRecord>,
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Run ${runId} initialized for talking-head video editing.`,
      },
    ],
  };

  saveState(state);
  return state;
}

export function loadState(runId: string): PipelineBRunState {
  const stateFile = getStatePath(runId);
  if (!fs.existsSync(stateFile)) {
    throw new Error(`Pipeline B run not found: ${runId}`);
  }
  const content = fs.readFileSync(stateFile, "utf-8");
  return JSON.parse(content) as PipelineBRunState;
}

export function saveState(state: PipelineBRunState): void {
  const folder = getRunFolder(state.runId);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  state.updatedAt = new Date().toISOString();
  const targetPath = getStatePath(state.runId);
  const tmpPath = `${targetPath}.tmp`;

  // Atomic write via temporary file
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmpPath, targetPath);
}

export function recordStageStart(state: PipelineBRunState, stage: PipelineBStage, input?: any): void {
  state.currentStage = stage;
  state.status = "running";
  state.stages[stage] = {
    ...state.stages[stage],
    stage,
    status: "running",
    startedAt: new Date().toISOString(),
    input: input !== undefined ? input : state.stages[stage]?.input,
  };
  state.logs.push({
    timestamp: new Date().toISOString(),
    level: "info",
    message: `Stage [${stage}] started.`,
  });
  saveState(state);
}

export function recordStageSuccess(state: PipelineBRunState, stage: PipelineBStage, output?: any): void {
  const now = new Date().toISOString();
  const startedAt = state.stages[stage]?.startedAt;
  const durationMs = startedAt ? new Date(now).getTime() - new Date(startedAt).getTime() : 0;

  state.stages[stage] = {
    ...state.stages[stage],
    stage,
    status: "completed",
    completedAt: now,
    durationMs,
    output: output !== undefined ? output : state.stages[stage]?.output,
  };
  state.logs.push({
    timestamp: now,
    level: "info",
    message: `Stage [${stage}] completed in ${durationMs}ms.`,
  });
  saveState(state);
}

export function recordStageFailure(state: PipelineBRunState, stage: PipelineBStage, error: string): void {
  const now = new Date().toISOString();
  state.status = "failed";
  state.stages[stage] = {
    ...state.stages[stage],
    stage,
    status: "failed",
    completedAt: now,
    error,
  };
  state.stages["FAILED"] = {
    stage: "FAILED",
    status: "completed",
    completedAt: now,
    error,
  };
  state.logs.push({
    timestamp: now,
    level: "error",
    message: `Stage [${stage}] failed: ${error}`,
  });
  saveState(state);
}

export function recordNeedsReview(state: PipelineBRunState, reason: string): void {
  const now = new Date().toISOString();
  state.status = "needs_review";
  state.reviewReason = reason;
  state.stages["NEEDS_REVIEW"] = {
    stage: "NEEDS_REVIEW",
    status: "completed",
    completedAt: now,
    output: { reason },
  };
  state.logs.push({
    timestamp: now,
    level: "warn",
    message: `Run flagged for human review: ${reason}`,
  });
  saveState(state);
}

export function listRuns(): { runId: string; createdAt: string; currentStage: PipelineBStage; status: string }[] {
  if (!fs.existsSync(RUNS_ROOT)) return [];
  const entries = fs.readdirSync(RUNS_ROOT, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      try {
        const state = loadState(entry.name);
        results.push({
          runId: state.runId,
          createdAt: state.createdAt,
          currentStage: state.currentStage,
          status: state.status,
        });
      } catch {}
    }
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
