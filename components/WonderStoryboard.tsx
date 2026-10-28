"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Clapperboard,
  Eye,
  Loader2,
  Mic2,
  Play,
  RefreshCw,
  Sparkles,
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
  status?: "storyboarding" | "rendering" | "ready" | "error";
  error?: string;
  onPlay: () => void;
  onRetry?: () => void;
  disabled?: boolean;
  timing?: string;
  onEdit?: (scene: number) => void;
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
  status,
  error,
  onPlay,
  onRetry,
  disabled = false,
  timing,
  onEdit,
  unifiedMode = true,
}: WonderStoryboardProps) {
  const [selectedScene, setSelectedScene] = useState(0);
  const [cycling, setCycling] = useState(true);
  useEffect(() => {
    if (!cycling || beats.length < 2) return;
    const timer = setInterval(() => setSelectedScene((previous) => (previous + 1) % beats.length), 4500);
    return () => clearInterval(timer);
  }, [cycling, beats.length]);
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
                <p className="mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#E4491B]">{isSample ? "Sample storyboard" : "Muse Wonder"}</p>
                <h3 className="serif text-[18px] leading-tight text-[#141414]">Your story, scene by scene</h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#D5D2C8] bg-[#F7F5EF] px-2 py-0.5 mono text-[9px] text-[#6B6A64]">
              <Clock3 size={10} aria-hidden="true" />
              {timing && <span>{timing}</span>}
              {timing && <span aria-hidden="true">·</span>}
              <span>{beats.length} {beats.length === 1 ? "scene" : "scenes"}</span>
            </div>
          </div>

          {concept && <p className="mt-2.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-[#6B6A64]">{concept}</p>}
          {visualStyle && (
            <div className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-normal text-[#6B6A64]">
              <Clapperboard size={12} className="mt-0.5 shrink-0 text-[#E4491B]" aria-hidden="true" />
              <p className="min-w-0 break-words"><span className="font-semibold text-[#6B6A64]">Visual direction · </span>{visualStyle}</p>
            </div>
          )}

          <div role="status" aria-live="polite" className="mt-2.5 rounded-lg border border-[#D5D2C8] bg-[#F7F5EF] px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] font-medium">
              <span className="inline-flex items-center gap-1.5 text-[#537349]">
                {isStoryboarding ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : isSample ? <Clapperboard size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                {isSample ? "Sample storyboard" : isStoryboarding ? "Wonder is planning" : "Wonder storyboard ready"}
              </span>
              <ArrowRight size={11} className="text-[#BAAA95]" aria-hidden="true" />
              <span className={`inline-flex items-center gap-1.5 ${status === "error" ? "text-[#B44231]" : "text-[#E4491B]"}`}>
                {isBuilding ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : status === "ready" ? <Check size={12} aria-hidden="true" /> : <Clapperboard size={12} aria-hidden="true" />}
                {isSample ? "Video not generated" : isBuilding ? "Spark 1.3 is building your video" : status === "ready" ? "Video ready to preview" : status === "error" ? "Video needs another try" : "Spark is up next"}
              </span>
            </div>
            {isBuilding && <p className="mt-1.5 text-[10px] leading-normal text-[#6B6A64]">Explore the script and visual direction below while your scenes come to life.</p>}
          </div>
        </div>
      )}

      {/* Inline status alert in unified mode if building */}
      {unifiedMode && (isBuilding || isStoryboarding) && (
        <div role="status" aria-live="polite" className="mx-4 my-2 rounded-lg border border-[#D5D2C8] bg-[#F7F5EF] px-3 py-1.5 flex items-center justify-between text-[10.5px]">
          <span className="inline-flex items-center gap-1.5 text-[#E4491B] font-medium">
            <Loader2 size={12} className="animate-spin text-[#E4491B]" aria-hidden="true" />
            {isBuilding ? "Spark 1.3 is building 60fps paper physics..." : "Wonder is planning your scenes..."}
          </span>
          <span className="mono text-[9px] text-[#6B6A64]">60fps live canvas</span>
        </div>
      )}

      {activeScene && (
        <div>
          {/* Pill-Style Scene Selector */}
          <div aria-label="Choose a storyboard scene" className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 scrollbar-none border-b border-[#141414]/30 bg-[#ECEAE3]">
            {beats.map((beat, sceneIndex) => {
              const isSelected = activeIndex === sceneIndex;
              return (
                <button
                  key={`${beat.id}-${sceneIndex}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => { setSelectedScene(sceneIndex); setCycling(false); }}
                  className={`shrink-0 rounded-full border px-2.5 py-1 inline-flex items-center gap-1.5 transition-all duration-200 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4491B] ${
                    isSelected
                      ? "border-2 border-[#141414] bg-[#E4491B] text-white shadow-[2px_2px_0px_#141414] font-semibold scale-[1.02]"
                      : "border border-[#141414]/40 bg-[#FFFFFF] text-[#141414] hover:border-[#141414] hover:bg-[#F6D9CC]/40"
                  }`}
                >
                  <span className={`mono text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/25 text-white" : "bg-[#141414] text-white"
                  }`}>
                    0{sceneIndex + 1}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{beat.label}</span>
                  <span className={`mono text-[8.5px] whitespace-nowrap ${isSelected ? "text-white/90" : "text-[#52504A]"}`}>
                    · {sceneTiming(beat)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5">
            <div className="flex items-center justify-between pb-2 text-[10.5px] font-semibold text-[#E4491B]">
              <button type="button" onClick={() => setCycling(!cycling)} className="hover:underline">{cycling ? "Pause scenes" : "Play scenes"}</button>
              {onEdit && <button type="button" disabled={disabled} onClick={() => { setCycling(false); onEdit(activeIndex + 1); }} className="hover:underline">Edit scene {activeIndex + 1}</button>}
            </div>
            <motion.article key={activeIndex} initial={{ opacity: 0, y: 8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35 }} aria-label={`Scene ${activeIndex + 1}: ${activeScene.label}`} className="overflow-hidden rounded-xl border-2 border-[#141414] bg-[#FFFFFF] shadow-[3px_3px_0px_#141414]">
              <div className="px-3.5 py-3 sm:px-4">
                <div className="flex items-center justify-between gap-2 mono text-[8.5px] uppercase tracking-[0.12em] text-[#52504A]">
                  <span>Scene {String(activeIndex + 1).padStart(2, "0")} / {String(beats.length).padStart(2, "0")}</span>
                  <span>{sceneTiming(activeScene)}</span>
                </div>
                <h4 className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#E4491B]">{activeScene.label}</h4>
                <div className="mt-1.5 border-l-2 border-[#E4491B] pl-2.5">
                  <p className="mb-0.5 mono text-[8px] uppercase tracking-widest text-[#52504A]">{script ? "On-screen words" : "Visual storytelling"}</p>
                  <p className={`whitespace-pre-wrap break-words ${script ? "serif text-[17px] sm:text-[19px] leading-[1.25] text-[#141414] font-medium" : "text-[11.5px] leading-relaxed text-[#52504A]"}`}>
                    {script || "This scene is led by visuals, with no on-screen text specified."}
                  </p>
                </div>
              </div>

              {(voiceover || visual) && (
                <div className="space-y-2.5 border-t-2 border-[#141414] bg-[#ECEAE3]/50 px-3.5 py-2.5 sm:px-4">
                  {voiceover && (
                    <div className="flex items-start gap-2">
                      <Mic2 size={13} className="mt-0.5 shrink-0 text-[#E4491B]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="mono text-[8.5px] font-bold uppercase tracking-widest text-[#141414]">Voiceover</p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[11.5px] leading-snug text-[#52504A]">{voiceover}</p>
                      </div>
                    </div>
                  )}
                  {visual && (
                    <div className="flex items-start gap-2">
                      <Eye size={13} className="mt-0.5 shrink-0 text-[#E4491B]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="mono text-[8.5px] font-bold uppercase tracking-widest text-[#141414]">What you’ll see</p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[11.5px] leading-snug text-[#52504A]">{visual}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {sceneDetails.length > 0 && (
                <details key={activeIndex} className="group border-t-2 border-[#141414]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2 text-[10.5px] font-semibold text-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E4491B] sm:px-4 bg-[#FFFFFF]">
                    Explore motion & sound
                    <ChevronDown size={13} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <dl className="space-y-2 px-3.5 pb-3 sm:px-4 bg-[#FFFFFF]">
                    {sceneDetails.map(([label, value]) => (
                      <div key={label}>
                        <dt className="mono text-[8.5px] uppercase tracking-widest text-[#52504A]">{label}</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-normal text-[#141414] font-medium">{value}</dd>
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
        <div role="alert" className="mx-3 mb-3 rounded-lg border-2 border-[#141414] bg-[#F6D9CC] p-2.5 sm:mx-3.5 shadow-[2px_2px_0px_#141414]">
          <p className="text-[11px] leading-normal font-medium text-[#E4491B]">{error || "Spark couldn’t finish this video. Your storyboard is saved here."}</p>
          {onRetry && <button type="button" onClick={onRetry} disabled={disabled} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] px-2.5 py-1 text-[10.5px] font-bold text-white shadow-[1px_1px_0px_#141414] disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={11} aria-hidden="true" />Retry video</button>}
        </div>
      )}
      {(status === "ready" || isSample) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#141414]/30 px-3.5 py-2 sm:px-4">
          <p className="text-[10.5px] font-medium text-[#52504A]">{isSample ? "Turn this example into a video." : "Your story is ready to watch."}</p>
          <button type="button" onClick={onPlay} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[2px_2px_0px_#141414] transition hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"><Play size={11} fill="currentColor" aria-hidden="true" />{isSample ? "Generate video" : `Watch ${timing || "video"}`}</button>
        </div>
      )}
    </section>
  );
}
