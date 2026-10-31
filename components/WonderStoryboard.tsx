"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Pip, { PIP_MOOD_META } from "@/components/Pip";
import { buildSceneDialoguePlan, type WordItem } from "@/components/TalkingHeadExplainerStage";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Clapperboard,
  Eye,
  Film,
  FileText,
  Info,
  Layers,
  Loader2,
  Mic2,
  Play,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Undo2,
  Edit3,
} from "lucide-react";

interface StoryboardBeat {
  id: number;
  label: string;
  duration: string;
  script: string;
  visualDesc?: string;
  voiceover?: string;
  motion?: string;
  camera?: string;
  transition?: string;
  sound?: string;
  start?: number;
  end?: number;
}

interface WonderStoryboardProps {
  beats: StoryboardBeat[];
  storyboard?: any;
  editPlan?: any;
  pipeline?: "pipeline-a" | "pipeline-b";
  pipelineBRunId?: string;
  status?: "storyboarding" | "rendering" | "ready" | "error";
  error?: string;
  onPlay: () => void;
  onRetry?: () => void;
  onApproveCuts?: () => void;
  onRebuildCuts?: (customCuts: any[], updatedState?: any) => void;
  onSeekTime?: (timeSec: number) => void;
  disabled?: boolean;
  timing?: string;
  onEdit?: (scene: number) => void;
  onRecreateScene?: (
    sceneIndex: number,
    instruction: string,
    customStart?: number,
    customEnd?: number
  ) => Promise<void>;
  unifiedMode?: boolean;
}

function suppliedText(value: unknown): string {
  return typeof value === "string" && value.trim().toLowerCase() !== "none"
    ? value.trim()
    : "";
}

function sceneTiming(beat: StoryboardBeat): string {
  if (Number.isFinite(beat.start) && Number.isFinite(beat.end)) {
    return `${beat.start}s – ${beat.end}s`;
  }
  return beat.duration;
}

export default function WonderStoryboard({
  beats,
  storyboard,
  editPlan,
  pipeline,
  pipelineBRunId,
  status,
  error,
  onPlay,
  onRetry,
  onApproveCuts,
  onRebuildCuts,
  onSeekTime,
  disabled = false,
  timing,
  onEdit,
  onRecreateScene,
  unifiedMode = true,
}: WonderStoryboardProps) {
  const isPipelineB = pipeline === "pipeline-b" || !!editPlan;
  const cuts = editPlan?.cuts || [];
  const protectedRanges = editPlan?.protectedRanges || [];
  const uncertainDecisions = editPlan?.uncertainDecisions || [];
  const candidateCuts = editPlan?.candidateCuts || [];
  const transcriptSegments = editPlan?.transcript || [];

  // Determine initial tab: when video is ready, show Visual Scenes first so user sees dialogue-synced animations
  const [activeBoardTab, setActiveBoardTab] = useState<"cuts" | "protected" | "transcript" | "scenes">(
    isPipelineB && status !== "ready" && cuts.length > 0 ? "cuts" : "scenes"
  );

  const [userCuts, setUserCuts] = useState<any[]>(cuts);
  const [captionTexts, setCaptionTexts] = useState<Record<number, string>>({});
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildSuccess, setRebuildSuccess] = useState(false);

  // Single-Scene Recreate & Scissor Point Recreate states
  const [recreateOpenForScene, setRecreateOpenForScene] = useState<number | null>(null);
  const [recreatePrompt, setRecreatePrompt] = useState("");
  const [recreateStartSec, setRecreateStartSec] = useState("");
  const [recreateEndSec, setRecreateEndSec] = useState("");
  const [isRecreatingScene, setIsRecreatingScene] = useState(false);

  const [editingCutIdx, setEditingCutIdx] = useState<number | null>(null);
  const [cutStartInput, setCutStartInput] = useState("");
  const [cutEndInput, setCutEndInput] = useState("");

  useEffect(() => {
    if (cuts && cuts.length > 0) {
      setUserCuts(cuts);
    }
  }, [cuts]);

  const [selectedScene, setSelectedScene] = useState(0);
  const [cycling, setCycling] = useState(true);

  useEffect(() => {
    if (!cycling || beats.length < 2 || activeBoardTab !== "scenes") return;
    const timer = setInterval(
      () => setSelectedScene((previous) => (previous + 1) % beats.length),
      4500
    );
    return () => clearInterval(timer);
  }, [cycling, beats.length, activeBoardTab]);

  const activeIndex = Math.min(selectedScene, Math.max(0, beats.length - 1));
  const activeScene = beats[activeIndex];
  const concept = suppliedText(storyboard?.globalDirection?.concept);
  const visualStyle = suppliedText(storyboard?.globalDirection?.visualStyle);
  const isBuilding = status === "rendering";
  const isStoryboarding = status === "storyboarding";
  const isSample = status === undefined;
  const script = suppliedText(activeScene?.script);
  const voiceover = suppliedText(activeScene?.voiceover);
  const visual = suppliedText(activeScene?.visualDesc);
  const sceneDetails = [
    ["Movement", activeScene?.motion],
    ["Camera", activeScene?.camera],
    ["Transition", activeScene?.transition],
    ["Sound", activeScene?.sound],
  ].filter(([, value]) => suppliedText(value));

  const totalCutDuration =
    editPlan?.cutDuration ??
    cuts.reduce((acc: number, c: any) => acc + Math.max(0, (c.end || 0) - (c.start || 0)), 0);

  return (
    <section
      aria-label="Wonder storyboard"
      className={
        unifiedMode
          ? "w-full text-[#141414]"
          : "overflow-hidden rounded-[18px] border border-[#D5D2C8] bg-[#ECEAE3] text-[#141414] shadow-[0_4px_20px_-8px_rgba(70,45,20,0.06)]"
      }
    >
      {!unifiedMode && (
        <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#F6D9CC] bg-[#F6D9CC] text-[#E4491B]">
                <Sparkles size={14} aria-hidden="true" />
              </span>
              <div>
                <p className="mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#E4491B]">
                  {isPipelineB ? "Wonder Muse AI Director" : isSample ? "Sample storyboard" : "Muse Wonder"}
                </p>
                <h3 className="serif text-[18px] leading-tight text-[#141414]">
                  {isPipelineB ? "Editorial Cuts & Creative Direction" : "Your story, scene by scene"}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#D5D2C8] bg-[#F7F5EF] px-2 py-0.5 mono text-[9px] text-[#6B6A64]">
              <Clock3 size={10} aria-hidden="true" />
              {timing && <span>{timing}</span>}
              {timing && <span aria-hidden="true">·</span>}
              <span>{beats.length} {beats.length === 1 ? "scene" : "scenes"}</span>
            </div>
          </div>

          {concept && (
            <p className="mt-2.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-[#6B6A64]">
              {concept}
            </p>
          )}
          {visualStyle && (
            <div className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-normal text-[#6B6A64]">
              <Clapperboard size={12} className="mt-0.5 shrink-0 text-[#E4491B]" aria-hidden="true" />
              <p className="min-w-0 break-words">
                <span className="font-semibold text-[#6B6A64]">Visual direction · </span>
                {visualStyle}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Primary Pipeline B / Editorial Director Header & View Tabs */}
      {isPipelineB && (
        <div className="border-b border-[#141414]/20 bg-[#F5F2EB] px-3.5 pt-3 pb-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="shrink-0">
                <Pip
                  mood={
                    status === "error"
                      ? "concerned"
                      : isBuilding || isRebuilding
                      ? "writing"
                      : rebuildSuccess
                      ? "excited"
                    : activeBoardTab === "cuts"
                      ? cuts.length > 0
                        ? "reading"
                        : "happy"
                      : activeBoardTab === "protected"
                      ? "reading"
                      : activeBoardTab === "transcript"
                      ? Object.keys(captionTexts).length > 0 || userCuts.length !== cuts.length
                        ? "writing"
                        : "listening"
                      : activeScene
                      ? cycling
                        ? "idea"
                        : "thinking"
                      : "thinking"
                  }
                  spin={activeBoardTab === "scenes" && cycling && !isBuilding && !isRebuilding}
                  size={36}
                  interactive={true}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="mono text-[9px] font-bold uppercase tracking-wider text-[#E4491B]">
                    Zee & Wonder Stage A & B
                  </span>
                  <span className="mono text-[8px] bg-[#141414] text-white px-1.5 py-0.2 rounded-full font-semibold">
                    muse-wonder-1.0
                  </span>
                </div>
                <h4 className="serif text-[15px] font-medium leading-tight text-[#141414]">
                  Wonder Editorial Director Decision Board
                </h4>
              </div>
            </div>

            {/* Quick Metrics Badge */}
            {totalCutDuration > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D2C8] bg-white px-2.5 py-1 mono text-[10px] shadow-2xs">
                <span className="text-[#6B6A64]">Trimmed:</span>
                <span className="font-bold text-[#E4491B]">-{Number(totalCutDuration).toFixed(2)}s</span>
                <span className="text-[#6B6A64]">across {cuts.length} cut(s)</span>
              </div>
            )}
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveBoardTab("cuts")}
              className={`rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-bold transition ${
                activeBoardTab === "cuts"
                  ? "bg-[#141414] text-white shadow-2xs"
                  : "bg-white/80 text-[#52504A] hover:bg-white hover:text-[#141414] border border-[#D5D2C8]"
              }`}
            >
              <Scissors size={12} className={activeBoardTab === "cuts" ? "text-[#E4491B]" : ""} />
              <span>Approved Cuts</span>
              <span
                className={`mono text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeBoardTab === "cuts" ? "bg-[#E4491B] text-white" : "bg-[#ECEAE3] text-[#141414]"
                }`}
              >
                {cuts.length}
              </span>
            </button>

            {protectedRanges.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveBoardTab("protected")}
                className={`rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-bold transition ${
                  activeBoardTab === "protected"
                    ? "bg-[#141414] text-white shadow-2xs"
                    : "bg-white/80 text-[#52504A] hover:bg-white hover:text-[#141414] border border-[#D5D2C8]"
                }`}
              >
                <ShieldCheck
                  size={12}
                  className={activeBoardTab === "protected" ? "text-[#537349]" : ""}
                />
                <span>Protected Speech</span>
                <span
                  className={`mono text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeBoardTab === "protected"
                      ? "bg-[#537349] text-white"
                      : "bg-[#ECEAE3] text-[#141414]"
                  }`}
                >
                  {protectedRanges.length}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveBoardTab("scenes")}
              className={`rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-bold transition ${
                activeBoardTab === "scenes"
                  ? "bg-[#141414] text-white shadow-2xs"
                  : "bg-white/80 text-[#52504A] hover:bg-white hover:text-[#141414] border border-[#D5D2C8]"
              }`}
            >
              <Film size={12} className={activeBoardTab === "scenes" ? "text-[#E4491B]" : ""} />
              <span>Visual Scenes</span>
              <span
                className={`mono text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeBoardTab === "scenes"
                    ? "bg-[#E4491B] text-white"
                    : "bg-[#ECEAE3] text-[#141414]"
                }`}
              >
                {beats.length}
              </span>
            </button>

            {transcriptSegments.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveBoardTab("transcript")}
                className={`rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-bold transition ${
                  activeBoardTab === "transcript"
                    ? "bg-[#141414] text-white shadow-2xs"
                    : "bg-white/80 text-[#52504A] hover:bg-white hover:text-[#141414] border border-[#D5D2C8]"
                }`}
              >
                <FileText size={12} className={activeBoardTab === "transcript" ? "text-[#E4491B]" : ""} />
                <span>Transcript Editor</span>
                <span
                  className={`mono text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeBoardTab === "transcript"
                      ? "bg-[#E4491B] text-white"
                      : "bg-[#ECEAE3] text-[#141414]"
                  }`}
                >
                  {transcriptSegments.flatMap((s: any) => s.words || []).length}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline status alert in unified mode if building */}
      {unifiedMode && (isBuilding || isStoryboarding) && (
        <div
          role="status"
          aria-live="polite"
          className="mx-3.5 my-2.5 rounded-lg border border-[#D5D2C8] bg-[#F7F5EF] px-3 py-1.5 flex items-center justify-between text-[10.5px]"
        >
          <span className="inline-flex items-center gap-1.5 text-[#E4491B] font-medium">
            <Loader2 size={12} className="animate-spin text-[#E4491B]" aria-hidden="true" />
            {isBuilding
              ? "Wonder Stage A cuts approved • Spark 1.3 generating motion..."
              : "Wonder AI Director is reviewing speech boundaries & candidate cuts..."}
          </span>
          <span className="mono text-[9px] text-[#6B6A64]">Bounded AI Workflow</span>
        </div>
      )}

      {/* TAB 1: APPROVED CUTS & REDUCTIONS BOARD */}
      {isPipelineB && activeBoardTab === "cuts" && (
        <div className="p-3.5 space-y-3 bg-[#FAF8F3]">
          {/* Executive Stats Card */}
          <div className="rounded-xl border border-[#D5D2C8] bg-white p-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAE3] pb-2 text-[11px]">
              <span className="mono font-semibold uppercase tracking-wider text-[#6B6A64]">
                Timeline Reduction Report
              </span>
              <span className="mono text-[9.5px] text-[#537349] font-bold inline-flex items-center gap-1">
                <CheckCircle2 size={11} /> Verified against spoken words & FFmpeg
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5">
              <div className="rounded-lg bg-[#F7F5EF] p-2 border border-[#EBE7DF]">
                <p className="mono text-[8.5px] uppercase tracking-wider text-[#6B6A64]">Clean Duration</p>
                <p className="serif text-[17px] font-bold text-[#141414]">
                  {editPlan?.cleanDuration ? `${editPlan.cleanDuration}s` : timing || "15.0s"}
                </p>
              </div>
              <div className="rounded-lg bg-[#F7F5EF] p-2 border border-[#EBE7DF]">
                <p className="mono text-[8.5px] uppercase tracking-wider text-[#6B6A64]">Total Reduced</p>
                <p className="serif text-[17px] font-bold text-[#E4491B]">
                  -{Number(totalCutDuration).toFixed(2)}s
                </p>
              </div>
              <div className="rounded-lg bg-[#F7F5EF] p-2 border border-[#EBE7DF]">
                <p className="mono text-[8.5px] uppercase tracking-wider text-[#6B6A64]">Approved Cuts</p>
                <p className="serif text-[17px] font-bold text-[#141414]">{cuts.length}</p>
              </div>
              <div className="rounded-lg bg-[#F7F5EF] p-2 border border-[#EBE7DF]">
                <p className="mono text-[8.5px] uppercase tracking-wider text-[#6B6A64]">Speech Protected</p>
                <p className="serif text-[17px] font-bold text-[#537349]">
                  {protectedRanges.length} ranges
                </p>
              </div>
            </div>
          </div>

          {/* Cuts Detailed List */}
          {cuts.length === 0 ? (
            <div className="rounded-xl border border-[#D5D2C8] bg-white p-4 text-center">
              <CheckCircle2 size={24} className="mx-auto text-[#537349] mb-1.5" />
              <h5 className="font-semibold text-[13px] text-[#141414]">100% Speech Integrity Preserved</h5>
              <p className="text-[11px] text-[#6B6A64] mt-1 max-w-md mx-auto">
                Wonder Editorial Director analyzed all candidate pauses and determined no stutters, false starts or dead air required removal. The talking-head delivery was kept intact.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mono text-[9px] font-bold uppercase tracking-widest text-[#6B6A64] px-1">
                Wonder AI Approved Reductions ({cuts.length})
              </p>
              {userCuts.map((cut: any, idx: number) => {
                const cutDur = Math.max(0.01, (cut.end || 0) - (cut.start || 0));
                const cutWord = cut.affectedText || cut.cutWord || "Detected Pause / Stutter";
                const isEditingThisCut = editingCutIdx === idx;
                return (
                  <div
                    key={cut.id || idx}
                    className="rounded-xl border border-[#141414]/20 bg-white p-3 shadow-2xs hover:border-[#141414] transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-[#ECEAE3]">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[10px] font-bold bg-[#FDE8E8] text-[#9B1C1C] px-2 py-0.5 rounded-full border border-[#F8B4B4]">
                          {Number(cut.start).toFixed(2)}s – {Number(cut.end).toFixed(2)}s
                        </span>
                        <span className="mono text-[9px] font-bold uppercase bg-[#141414] text-white px-2 py-0.5 rounded-full">
                          {String(cut.type).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono text-[10.5px] font-bold text-[#E4491B]">
                          -{cutDur.toFixed(2)}s removed
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingThisCut) {
                              setEditingCutIdx(null);
                            } else {
                              setEditingCutIdx(idx);
                              setCutStartInput(String(Number(cut.start).toFixed(2)));
                              setCutEndInput(String(Number(cut.end).toFixed(2)));
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-[#141414] bg-[#F7F5EF] hover:bg-[#E4491B] hover:text-white px-2.5 py-0.5 mono text-[9.5px] font-bold text-[#141414] transition cursor-pointer"
                        >
                          <RefreshCw size={10} />
                          <span>{isEditingThisCut ? "Close" : "Recreate Cut"}</span>
                        </button>
                      </div>
                    </div>

                    {isEditingThisCut && (
                      <div className="mt-2.5 rounded-lg border-2 border-[#E4491B] bg-[#FFF8F5] p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="mono text-[9.5px] font-bold uppercase tracking-wider text-[#E4491B]">
                            Edit Scissor Point #{idx + 1} Time Range
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              const nextCuts = userCuts.filter((_, i) => i !== idx);
                              setUserCuts(nextCuts);
                              setEditingCutIdx(null);
                              if (pipelineBRunId) {
                                setIsRebuilding(true);
                                try {
                                  const res = await fetch("/api/pipeline-b/resume", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      runId: pipelineBRunId,
                                      customApprovedCuts: nextCuts,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (data.success) onRebuildCuts?.(nextCuts, data.state);
                                } finally {
                                  setIsRebuilding(false);
                                }
                              }
                            }}
                            className="mono text-[9.5px] font-bold text-[#03543F] bg-[#DEF7EC] border border-[#86EFAC] px-2 py-0.5 rounded-full hover:brightness-95 cursor-pointer"
                          >
                            Undo Cut (Keep Speech)
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="mono text-[10px] text-[#52504A] flex items-center gap-1">
                            <span>Start (s):</span>
                            <input
                              type="number"
                              step="0.1"
                              value={cutStartInput}
                              onChange={(e) => setCutStartInput(e.target.value)}
                              className="w-16 rounded border border-[#D5D2C8] bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#141414]"
                            />
                          </label>
                          <label className="mono text-[10px] text-[#52504A] flex items-center gap-1">
                            <span>End (s):</span>
                            <input
                              type="number"
                              step="0.1"
                              value={cutEndInput}
                              onChange={(e) => setCutEndInput(e.target.value)}
                              className="w-16 rounded border border-[#D5D2C8] bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#141414]"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={isRebuilding}
                            onClick={async () => {
                              const sVal = parseFloat(cutStartInput);
                              const eVal = parseFloat(cutEndInput);
                              if (!Number.isFinite(sVal) || !Number.isFinite(eVal) || eVal <= sVal) return;
                              const nextCuts = userCuts.map((c, i) =>
                                i === idx ? { ...c, start: +sVal.toFixed(2), end: +eVal.toFixed(2) } : c
                              );
                              setUserCuts(nextCuts);
                              setEditingCutIdx(null);
                              if (pipelineBRunId) {
                                setIsRebuilding(true);
                                try {
                                  const res = await fetch("/api/pipeline-b/resume", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      runId: pipelineBRunId,
                                      customApprovedCuts: nextCuts,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (data.success) onRebuildCuts?.(nextCuts, data.state);
                                } finally {
                                  setIsRebuilding(false);
                                }
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-[#E4491B] hover:bg-[#C93D14] text-white px-3 py-1 mono text-[10px] font-bold shadow-2xs cursor-pointer"
                          >
                            {isRebuilding ? <Loader2 size={10} className="animate-spin" /> : <Scissors size={10} />}
                            <span>Apply Scissor Point</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex items-start gap-1.5">
                        <span className="mono text-[8.5px] uppercase font-bold text-[#9B1C1C] shrink-0 mt-0.5">
                          Cut Clip:
                        </span>
                        <p className="text-[12px] font-medium text-[#9B1C1C] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#FEE2E2] inline-block line-through">
                          &ldquo;{cutWord}&rdquo;
                        </p>
                      </div>

                      {cut.reason && (
                        <div className="mt-2 flex items-start gap-2 bg-[#F7F5EF] p-2 rounded-lg border border-[#EBE7DF]">
                          <div className="shrink-0 mt-0.5">
                            <Pip
                              mood={
                                /stutter|repetition|retake|false/i.test(String(cut.type))
                                  ? "concerned"
                                  : /filler/i.test(String(cut.type))
                                  ? "thinking"
                                  : "idea"
                              }
                              size={26}
                              interactive={false}
                            />
                          </div>
                          <div className="min-w-0 text-[11px] leading-relaxed text-[#52504A]">
                            <span className="font-semibold text-[#141414]">Zee&apos;s Editorial Rationale: </span>
                            {cut.reason}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Strategic Editorial Notes */}
          {editPlan?.notes && (
            <div className="rounded-xl border border-[#D5D2C8] bg-[#F7F5EF] p-3 text-[11px] text-[#52504A]">
              <div className="flex items-center gap-1.5 font-bold text-[#141414] mb-1">
                <Info size={13} className="text-[#E4491B]" />
                <span>Wonder Editorial Strategy & Rhetorical Notes</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{editPlan.notes}</p>
            </div>
          )}

          {/* Action Bar: Approve Cuts & Generate Reel */}
          {onApproveCuts && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#141414]/15 mt-3 bg-white p-3 rounded-xl border border-[#D5D2C8] shadow-2xs">
              <div className="text-[11px] text-[#52504A]">
                <span className="font-semibold text-[#141414]">Human Editorial Approval: </span>
                <span>Send Wonder-approved cuts to FFmpeg, Wonder Stage B visual director, and Spark 1.3 compositor.</span>
              </div>
              <button
                type="button"
                onClick={onApproveCuts}
                disabled={disabled || isBuilding}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] px-4 py-2 text-[12px] font-bold text-white shadow-[2px_2px_0px_#141414] transition active:scale-95 disabled:opacity-50"
              >
                <Scissors size={13} />
                <span>Apply Cuts & Generate Full Reel</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROTECTED SPEECH RANGES BOARD */}
      {isPipelineB && activeBoardTab === "protected" && (
        <div className="p-3.5 space-y-2.5 bg-[#FAF8F3]">
          <div className="rounded-xl border border-[#D5D2C8] bg-white p-3 text-[11.5px] text-[#52504A] shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-[#537349] mb-1">
              <ShieldCheck size={14} />
              <span>Protected Speech Shield</span>
            </div>
            <p className="leading-relaxed">
              Wonder Muse AI actively shields intentional rhetorical repetition, breathing pauses, and sound effects from accidental truncation. FFmpeg is strictly barred from cutting these intervals.
            </p>
          </div>

          <div className="space-y-2">
            {protectedRanges.map((range: any, idx: number) => (
              <div
                key={idx}
                className="rounded-xl border border-[#D5D2C8] bg-white p-3 shadow-2xs hover:border-[#537349] transition"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-[#ECEAE3]">
                  <span className="mono text-[10px] font-bold bg-[#DEF7EC] text-[#03543F] px-2 py-0.5 rounded-full border border-[#BCF0DA]">
                    {Number(range.start).toFixed(2)}s – {Number(range.end).toFixed(2)}s
                  </span>
                  <span className="mono text-[9px] uppercase font-bold text-[#537349]">
                    Shielded from Cut
                  </span>
                </div>
                <div className="pt-2 flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    <Pip mood="reading" size={26} interactive={false} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    {range.protectedWords && (
                      <p className="text-[12px] font-semibold text-[#141414]">
                        &ldquo;{range.protectedWords}&rdquo;
                      </p>
                    )}
                    <p className="text-[11px] text-[#52504A] leading-relaxed">
                      <span className="font-semibold text-[#141414]">Zee&apos;s Shield Reason: </span>
                      {range.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INTERACTIVE TRANSCRIPT-BASED EDITOR */}
      {isPipelineB && activeBoardTab === "transcript" && (
        <div className="p-3.5 space-y-3 bg-[#FAF8F3]">
          {/* Header Controls */}
          <div className="rounded-xl border border-[#D5D2C8] bg-white p-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAE3] pb-2 text-[11px]">
              <span className="mono font-semibold uppercase tracking-wider text-[#6B6A64]">
                Word-Aligned Interactive Transcript
              </span>
              <div className="flex items-center gap-2">
                <span className="mono text-[9.5px] text-[#52504A] bg-[#F7F5EF] px-2 py-0.5 rounded border border-[#EBE7DF]">
                  Click word to seek video
                </span>
                {pipelineBRunId && (
                  <button
                    type="button"
                    disabled={isRebuilding || disabled}
                    onClick={async () => {
                      setIsRebuilding(true);
                      setRebuildSuccess(false);
                      try {
                        const res = await fetch("/api/pipeline-b/resume", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            runId: pipelineBRunId,
                            customApprovedCuts: userCuts,
                            customCaptionOverrides: captionTexts,
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setRebuildSuccess(true);
                          onRebuildCuts?.(userCuts, data.state);
                          setTimeout(() => setRebuildSuccess(false), 3000);
                        }
                      } catch (err) {
                        console.error("Rebuild error:", err);
                      } finally {
                        setIsRebuilding(false);
                      }
                    }}
                    className="mono text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#E4491B] text-white hover:bg-[#C93D14] transition inline-flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                  >
                    {isRebuilding ? (
                      <>
                        <Loader2 size={11} className="animate-spin" />
                        <span>Rebuilding Cut...</span>
                      </>
                    ) : rebuildSuccess ? (
                      <>
                        <Check size={11} />
                        <span>Rebuilt Successfully!</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={11} />
                        <span>Rebuild Video With Custom Cuts</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] mono">
              <span className="inline-flex items-center gap-1 text-[#9B1C1C]">
                <span className="w-2.5 h-2.5 rounded bg-[#FDE8E8] border border-[#F8B4B4] inline-block" />
                Cut Audio (Click Restore to Keep)
              </span>
              <span className="inline-flex items-center gap-1 text-[#03543F]">
                <span className="w-2.5 h-2.5 rounded bg-[#DEF7EC] border border-[#BCF0DA] inline-block" />
                Protected Rhetorical Delivery
              </span>
              <span className="inline-flex items-center gap-1 text-[#92400E]">
                <span className="w-2.5 h-2.5 rounded bg-[#FEF3C7] border border-[#FDE68A] inline-block" />
                Candidate Stutter / Filler
              </span>
              <span className="inline-flex items-center gap-1 text-[#52504A]">
                <span className="w-2.5 h-2.5 rounded bg-white border border-[#D5D2C8] inline-block" />
                Retained Speech
              </span>
            </div>
          </div>

          {/* Transcript Segments & Words */}
          <div className="space-y-3">
            {transcriptSegments.map((seg: any) => {
              const segText = captionTexts[seg.id] ?? seg.text;
              return (
                <div
                  key={seg.id}
                  className="rounded-xl border border-[#D5D2C8] bg-white p-3.5 shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAE3] pb-2">
                    <span className="mono text-[10px] font-bold bg-[#ECEAE3] text-[#141414] px-2 py-0.5 rounded-full">
                      Block {seg.id} • {Number(seg.start).toFixed(2)}s – {Number(seg.end).toFixed(2)}s
                    </span>
                    <div className="flex items-center gap-1.5 text-[10.5px]">
                      <Edit3 size={11} className="text-[#6B6A64]" />
                      <span className="mono text-[9px] uppercase tracking-wider text-[#6B6A64]">
                        Editable Caption Subtitle:
                      </span>
                    </div>
                  </div>

                  {/* Inline Caption Editor */}
                  <div>
                    <input
                      type="text"
                      value={segText}
                      onChange={(e) =>
                        setCaptionTexts((prev) => ({ ...prev, [seg.id]: e.target.value }))
                      }
                      className="w-full text-[12px] font-medium text-[#141414] bg-[#F7F5EF] border border-[#EBE7DF] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E4491B] transition"
                      placeholder="Custom subtitle caption text..."
                    />
                  </div>

                  {/* Interactive Word Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {(seg.words || []).map((w: any, wIdx: number) => {
                      const mid = (w.start + w.end) / 2;
                      const isCut = userCuts.some((c: any) => mid >= c.start && mid <= c.end);
                      const isProtected = protectedRanges.some(
                        (pr: any) => mid >= pr.start && mid <= pr.end
                      );
                      const candidate = candidateCuts.find(
                        (c: any) => mid >= c.start && mid <= c.end
                      );

                      return (
                        <div
                          key={wIdx}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                            isCut
                              ? "bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B]"
                              : isProtected
                              ? "bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]"
                              : candidate
                              ? "bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E]"
                              : "bg-white border border-[#E5E7EB] text-[#1F2937] hover:border-[#9CA3AF]"
                          }`}
                        >
                          <button
                            type="button"
                            title={`Seek to ${w.start}s`}
                            onClick={() => {
                              onSeekTime?.(w.start);
                              window.dispatchEvent(
                                new CustomEvent("seek-pipeline-b", { detail: { time: w.start } })
                              );
                            }}
                            className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span className={isCut ? "line-through opacity-75" : "font-semibold"}>
                              {w.word}
                            </span>
                            <span className="mono text-[8.5px] opacity-60">
                              {w.start}s
                            </span>
                          </button>

                          {isCut ? (
                            <button
                              type="button"
                              title="Restore this word into clean video"
                              onClick={() => {
                                setUserCuts((prev) =>
                                  prev.filter(
                                    (c: any) => !(mid >= c.start && mid <= c.end)
                                  )
                                );
                              }}
                              className="ml-1 text-[9px] mono px-1.5 py-0.2 rounded bg-white text-[#991B1B] border border-[#FCA5A5] hover:bg-[#FEE2E2] font-bold cursor-pointer"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Cut this word from clean video"
                              onClick={() => {
                                setUserCuts((prev) => [
                                  ...prev,
                                  {
                                    id: `cut-user-${Date.now()}-${wIdx}`,
                                    start: Math.max(0, +w.start.toFixed(2)),
                                    end: Math.max(w.start + 0.1, +w.end.toFixed(2)),
                                    type: candidate?.type || "filler",
                                    reason: `User cut word: '${w.word}'`,
                                  },
                                ]);
                              }}
                              className="ml-1 text-[8.5px] mono px-1 py-0.2 rounded bg-[#F3F4F6] text-[#4B5563] hover:bg-[#FEE2E2] hover:text-[#991B1B] font-bold cursor-pointer"
                            >
                              Cut
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: VISUAL SCENES BOARD (Default Pipeline A / Creative Direction) */}
      {activeBoardTab === "scenes" && activeScene && (
        <div>
          {/* Pill-Style Scene Selector */}
          <div
            aria-label="Choose a storyboard scene"
            className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 scrollbar-none border-b border-[#141414]/30 bg-[#ECEAE3]"
          >
            {beats.map((beat, sceneIndex) => {
              const isSelected = activeIndex === sceneIndex;
              return (
                <button
                  key={`${beat.id}-${sceneIndex}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedScene(sceneIndex);
                    setCycling(false);
                  }}
                  className={`shrink-0 rounded-full border px-2.5 py-1 inline-flex items-center gap-1.5 transition-all duration-200 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4491B] ${
                    isSelected
                      ? "border-2 border-[#141414] bg-[#E4491B] text-white shadow-[2px_2px_0px_#141414] font-semibold scale-[1.02]"
                      : "border border-[#141414]/40 bg-[#FFFFFF] text-[#141414] hover:border-[#141414] hover:bg-[#F6D9CC]/40"
                  }`}
                >
                  <span
                    className={`mono text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/25 text-white" : "bg-[#141414] text-white"
                    }`}
                  >
                    0{sceneIndex + 1}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{beat.label}</span>
                  <span
                    className={`mono text-[8.5px] whitespace-nowrap ${
                      isSelected ? "text-white/90" : "text-[#52504A]"
                    }`}
                  >
                    · {sceneTiming(beat)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5">
            <div className="flex items-center justify-between pb-2 text-[10.5px] font-semibold text-[#E4491B]">
              <button
                type="button"
                onClick={() => setCycling(!cycling)}
                className="hover:underline"
              >
                {cycling ? "Pause scenes" : "Play scenes"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled || isRecreatingScene}
                  onClick={() => {
                    setCycling(false);
                    if (recreateOpenForScene === activeIndex) {
                      setRecreateOpenForScene(null);
                    } else {
                      setRecreateOpenForScene(activeIndex);
                      setRecreatePrompt("");
                      setRecreateStartSec(
                        typeof activeScene.start === "number" ? String(activeScene.start) : ""
                      );
                      setRecreateEndSec(
                        typeof activeScene.end === "number" ? String(activeScene.end) : ""
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#141414] bg-[#E4491B] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-[1px_1px_0px_#141414] hover:bg-[#C93D14] transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={10} className={isRecreatingScene ? "animate-spin" : ""} />
                  <span>
                    {recreateOpenForScene === activeIndex
                      ? "Close Recreate"
                      : `Recreate Scene ${activeIndex + 1}`}
                  </span>
                </button>
              </div>
            </div>
            <motion.article
              key={activeIndex}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35 }}
              aria-label={`Scene ${activeIndex + 1}: ${activeScene.label}`}
              className="overflow-hidden rounded-xl border-2 border-[#141414] bg-[#FFFFFF] shadow-[3px_3px_0px_#141414]"
            >
              <div className="px-3.5 py-3 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mono text-[8.5px] uppercase tracking-[0.12em] text-[#52504A]">
                  <span>
                    Scene {String(activeIndex + 1).padStart(2, "0")} /{" "}
                    {String(beats.length).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const sceneMood = activeIndex === beats.length - 1 ? "happy" : "thinking";
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F5EF] border border-[#D5D2C8] px-2 py-0.5 text-[8.5px] font-bold text-[#141414]">
                          <Pip mood={sceneMood} size={16} interactive={false} />
                          <span>Zee: {PIP_MOOD_META[sceneMood]?.label}</span>
                        </span>
                      );
                    })()}
                    <span>{sceneTiming(activeScene)}</span>
                    <button
                      type="button"
                      disabled={disabled || isRecreatingScene}
                      onClick={() => {
                        setCycling(false);
                        if (recreateOpenForScene === activeIndex) {
                          setRecreateOpenForScene(null);
                        } else {
                          setRecreateOpenForScene(activeIndex);
                          setRecreatePrompt("");
                          setRecreateStartSec(
                            typeof activeScene.start === "number" ? String(activeScene.start) : ""
                          );
                          setRecreateEndSec(
                            typeof activeScene.end === "number" ? String(activeScene.end) : ""
                          );
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-[#141414] bg-[#F7F5EF] hover:bg-[#E4491B] hover:text-white px-2 py-0.5 mono text-[8.5px] font-bold text-[#141414] transition cursor-pointer"
                    >
                      <RefreshCw size={9} />
                      <span>Recreate</span>
                    </button>
                  </div>
                </div>

                {/* Inline Single-Scene Recreate Composer */}
                {recreateOpenForScene === activeIndex && (
                  <div className="mt-2.5 mb-2 rounded-xl border-2 border-[#E4491B] bg-[#FFF8F5] p-3 space-y-2.5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <RefreshCw size={12} className="text-[#E4491B]" />
                        <span className="mono text-[10px] font-bold uppercase tracking-wider text-[#141414]">
                          Recreate Scene {activeIndex + 1} ({sceneTiming(activeScene)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mono text-[9.5px] text-[#52504A]">
                        <label className="flex items-center gap-1">
                          <span>From (s):</span>
                          <input
                            type="number"
                            step="0.1"
                            value={recreateStartSec}
                            onChange={(e) => setRecreateStartSec(e.target.value)}
                            placeholder="0.0"
                            className="w-14 rounded border border-[#D5D2C8] bg-white px-1.5 py-0.5 text-[10.5px] font-bold text-[#141414]"
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span>To (s):</span>
                          <input
                            type="number"
                            step="0.1"
                            value={recreateEndSec}
                            onChange={(e) => setRecreateEndSec(e.target.value)}
                            placeholder="4.0"
                            className="w-14 rounded border border-[#D5D2C8] bg-white px-1.5 py-0.5 text-[10.5px] font-bold text-[#141414]"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Quick Suggestion Chips */}
                    <div className="flex flex-wrap items-center gap-1">
                      {(isPipelineB
                        ? [
                            "Switch to Full-Screen Animation Cutaway",
                            "Switch to Full-Screen Speaker Face",
                            "Add comparison chart visual",
                            "Zoom in 1.15x on speaker",
                          ]
                        : [
                            "Fix character consistency & pose",
                            "Add dramatic zoom & lightning VFX",
                            "Close-up emotional anime shot",
                            "Make scene more vibrant & dynamic",
                          ]
                      ).map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setRecreatePrompt(chip)}
                          className="rounded-full border border-[#D5D2C8] bg-white hover:border-[#E4491B] hover:text-[#E4491B] px-2 py-0.5 text-[9.5px] font-semibold text-[#52504A] transition cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={recreatePrompt}
                        onChange={(e) => setRecreatePrompt(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && onRecreateScene && !isRecreatingScene) {
                            e.preventDefault();
                            setIsRecreatingScene(true);
                            try {
                              const sNum = parseFloat(recreateStartSec);
                              const eNum = parseFloat(recreateEndSec);
                              await onRecreateScene(
                                activeIndex,
                                recreatePrompt.trim(),
                                Number.isFinite(sNum) ? sNum : undefined,
                                Number.isFinite(eNum) ? eNum : undefined
                              );
                              setRecreateOpenForScene(null);
                              setRecreatePrompt("");
                            } finally {
                              setIsRecreatingScene(false);
                            }
                          }
                        }}
                        placeholder={`What should Zee change or recreate in Scene ${activeIndex + 1} (${sceneTiming(activeScene)})?`}
                        className="flex-1 rounded-lg border border-[#D5D2C8] bg-white px-2.5 py-1.5 text-[12px] text-[#141414] placeholder:text-[#6B6A64]/70 focus:border-[#E4491B] focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isRecreatingScene || disabled}
                        onClick={async () => {
                          if (onRecreateScene) {
                            setIsRecreatingScene(true);
                            try {
                              const sNum = parseFloat(recreateStartSec);
                              const eNum = parseFloat(recreateEndSec);
                              await onRecreateScene(
                                activeIndex,
                                recreatePrompt.trim(),
                                Number.isFinite(sNum) ? sNum : undefined,
                                Number.isFinite(eNum) ? eNum : undefined
                              );
                              setRecreateOpenForScene(null);
                              setRecreatePrompt("");
                            } finally {
                              setIsRecreatingScene(false);
                            }
                          } else if (onEdit) {
                            onEdit(activeIndex + 1);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white px-3 py-1.5 text-[11px] font-bold shadow-[2px_2px_0px_#141414] transition active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isRecreatingScene ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Recreating...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} />
                            <span>Recreate Scene {activeIndex + 1}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <h4 className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#E4491B]">
                  {activeScene.label}
                </h4>
                <div className="mt-1.5 border-l-2 border-[#E4491B] pl-2.5">
                  <p className="mb-0.5 mono text-[8px] uppercase tracking-widest text-[#52504A]">
                    {script ? "Spoken Dialogue (Synced)" : "Visual storytelling"}
                  </p>
                  <p
                    className={`whitespace-pre-wrap break-words ${
                      script
                        ? "serif text-[17px] sm:text-[19px] leading-[1.25] text-[#141414] font-medium"
                        : "text-[11.5px] leading-relaxed text-[#52504A]"
                    }`}
                  >
                    {script || "This scene is led by visuals, with no on-screen text specified."}
                  </p>
                </div>

                {/* Dialogue-Synced Animation Triggers for this Scene */}
                {(() => {
                  const sStart = typeof activeScene?.start === "number" ? activeScene.start : activeIndex * 3.5;
                  const sEnd = typeof activeScene?.end === "number" ? activeScene.end : sStart + 3.5;
                  const editedWords: WordItem[] = [];
                  const segSource =
                    editPlan?.editedTranscript && editPlan.editedTranscript.length > 0
                      ? editPlan.editedTranscript
                      : editPlan?.transcript || [];
                  for (const seg of segSource) {
                    for (const w of seg.words || []) {
                      const ws = typeof w.editedStart === "number" ? w.editedStart : w.start ?? 0;
                      const we = typeof w.editedEnd === "number" ? w.editedEnd : w.end ?? ws + 0.2;
                      if (ws >= sStart - 0.12 && ws < sEnd + 0.05) {
                        editedWords.push({ word: w.word, start: ws, end: we });
                      }
                    }
                  }
                  const syncPlan = buildSceneDialoguePlan(
                    editedWords,
                    script || activeScene?.label || "",
                    activeScene?.label,
                    sStart,
                    sEnd
                  );
                  const isEdgeScene =
                    activeIndex === 0 || (activeIndex === beats.length - 1 && beats.length >= 3);
                  const isCutaway =
                    !isEdgeScene &&
                    (syncPlan.visualKind === "contrast_comparison" ||
                      syncPlan.visualKind === "step_stack" ||
                      activeIndex % 2 === 1);

                  return (
                    <div className="mt-3 rounded-xl bg-[#FAF8F3] border border-[#D5D2C8] p-2.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="mono text-[8.5px] font-bold uppercase tracking-wider text-[#E4491B] flex items-center gap-1">
                          <Sparkles size={11} />
                          <span>
                            {isCutaway
                              ? "Full-Screen Story Animation Cutaway"
                              : "Full-Screen Speaker + Lower-Face Floating Animation"}
                          </span>
                        </span>
                        <span className="mono text-[8px] px-2 py-0.5 rounded-full bg-[#141414] text-white font-semibold">
                          {syncPlan.visualKind.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </div>

                      {syncPlan.contrast ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSeekTime?.(syncPlan.contrast!.partATime);
                              window.dispatchEvent(
                                new CustomEvent("seek-pipeline-b", {
                                  detail: { time: syncPlan.contrast!.partATime },
                                })
                              );
                            }}
                            className="text-left rounded-lg bg-white border border-[#D5D2C8] hover:border-[#E4491B] p-2 transition cursor-pointer"
                          >
                            <div className="mono text-[8px] text-[#6B6A64] uppercase">
                              {syncPlan.contrast.partATime.toFixed(2)}s • {syncPlan.contrast.partALabel}
                            </div>
                            <div className="serif text-[15px] font-bold text-[#141414]">
                              {syncPlan.contrast.partAMetric}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSeekTime?.(syncPlan.contrast!.partBTime);
                              window.dispatchEvent(
                                new CustomEvent("seek-pipeline-b", {
                                  detail: { time: syncPlan.contrast!.partBTime },
                                })
                              );
                            }}
                            className="text-left rounded-lg bg-[#FFF3ED] border border-[#E4491B] p-2 transition cursor-pointer"
                          >
                            <div className="mono text-[8px] text-[#E4491B] font-bold uppercase">
                              {syncPlan.contrast.partBTime.toFixed(2)}s • {syncPlan.contrast.partBLabel} ⚡
                            </div>
                            <div className="serif text-[15px] font-bold text-[#E4491B]">
                              {syncPlan.contrast.partBMetric}
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(syncPlan.steps.length > 0 ? syncPlan.steps : syncPlan.faceCallouts).map(
                            (item: any, idx: number) => (
                              <button
                                key={item.id || idx}
                                type="button"
                                onClick={() => {
                                  onSeekTime?.(item.triggerTime);
                                  window.dispatchEvent(
                                    new CustomEvent("seek-pipeline-b", {
                                      detail: { time: item.triggerTime },
                                    })
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#D5D2C8] hover:border-[#E4491B] px-2.5 py-1 text-[10.5px] font-bold text-[#141414] transition cursor-pointer shadow-2xs"
                                title={`Click to seek video to ${item.triggerTime.toFixed(2)}s`}
                              >
                                <span className="mono text-[8.5px] px-1.5 py-0.2 rounded bg-[#F6D9CC] text-[#E4491B]">
                                  {Number(item.triggerTime).toFixed(2)}s
                                </span>
                                <span>{item.label || item.title}</span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {(voiceover || visual) && (
                <div className="space-y-2.5 border-t-2 border-[#141414] bg-[#ECEAE3]/50 px-3.5 py-2.5 sm:px-4">
                  {voiceover && (
                    <div className="flex items-start gap-2">
                      <Mic2 size={13} className="mt-0.5 shrink-0 text-[#E4491B]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="mono text-[8.5px] font-bold uppercase tracking-widest text-[#141414]">
                          Voiceover
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[11.5px] leading-snug text-[#52504A]">
                          {voiceover}
                        </p>
                      </div>
                    </div>
                  )}
                  {visual && (
                    <div className="flex items-start gap-2">
                      <Eye size={13} className="mt-0.5 shrink-0 text-[#E4491B]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="mono text-[8.5px] font-bold uppercase tracking-widest text-[#141414]">
                          What you’ll see
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[11.5px] leading-snug text-[#52504A]">
                          {visual}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {sceneDetails.length > 0 && (
                <details key={activeIndex} className="group border-t-2 border-[#141414]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2 text-[10.5px] font-semibold text-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E4491B] sm:px-4 bg-[#FFFFFF]">
                    Explore motion & sound
                    <ChevronDown
                      size={13}
                      className="transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <dl className="space-y-2 px-3.5 pb-3 sm:px-4 bg-[#FFFFFF]">
                    {sceneDetails.map(([label, value]) => (
                      <div key={label}>
                        <dt className="mono text-[8.5px] uppercase tracking-widest text-[#52504A]">
                          {label}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-normal text-[#141414] font-medium">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </motion.article>
          </div>
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="mx-3 mb-3 rounded-lg border-2 border-[#141414] bg-[#F6D9CC] p-2.5 sm:mx-3.5 shadow-[2px_2px_0px_#141414]"
        >
          <p className="text-[11px] leading-normal font-medium text-[#E4491B]">
            {error || "Spark couldn’t finish this video. Your storyboard is saved here."}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] px-2.5 py-1 text-[10.5px] font-bold text-white shadow-[1px_1px_0px_#141414] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={11} aria-hidden="true" />
              Retry video
            </button>
          )}
        </div>
      )}

      {status === "storyboarding" && onApproveCuts && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#141414]/30 px-3.5 py-2.5 sm:px-4 bg-[#F5F2EB]">
          <p className="text-[11px] font-semibold text-[#141414]">
            Wonder Stage A cut analysis ready for review.
          </p>
          <button
            type="button"
            onClick={onApproveCuts}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[2px_2px_0px_#141414] transition hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Scissors size={12} />
            <span>Apply Cuts & Generate Reel</span>
          </button>
        </div>
      )}

      {(status === "ready" || isSample) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#141414]/30 px-3.5 py-2 sm:px-4 bg-white/50">
          <p className="text-[10.5px] font-medium text-[#52504A]">
            {isSample
              ? "Turn this example into a video."
              : isPipelineB
              ? "Wonder-directed talking-head reel is ready."
              : "Your story is ready to watch."}
          </p>
          <button
            type="button"
            onClick={onPlay}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[2px_2px_0px_#141414] transition hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={11} fill="currentColor" aria-hidden="true" />
            {isSample ? "Generate video" : `Watch ${timing || "video"}`}
          </button>
        </div>
      )}
    </section>
  );
}
