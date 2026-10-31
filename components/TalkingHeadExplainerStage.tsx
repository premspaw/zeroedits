"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Scissors,
  Zap,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Film,
  UserCheck,
  MessageSquare,
  Wand2,
  Volume1,
  Layers,
  Rocket,
  Palette,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  ExplainerLayoutMode,
  PaletteId,
  VisualPalette,
  PALETTES,
  WordItem,
  SpokenStepBeat,
  SpokenContrastPlan,
  FaceSpaceCallout,
  SceneSegment,
  buildSceneDialoguePlan,
  resolveActivePalette,
  extractWordsFromPlan,
  buildExplainerScenes,
  preloadExplainerBrollImages,
  ensureExplainerFontsLoaded,
  renderExplainerFrameToCanvas,
  exportExactExplainerMp4,
  inferIconKey,
} from "@/lib/pipeline-b/explainer-canvas-renderer";

export type {
  ExplainerLayoutMode,
  PaletteId,
  VisualPalette,
  WordItem,
  SpokenStepBeat,
  SpokenContrastPlan,
  FaceSpaceCallout,
  SceneSegment,
};

export { PALETTES, buildSceneDialoguePlan };

export function renderContextualIcon(
  iconKey: SpokenStepBeat["iconKey"],
  size = 16,
  className = ""
) {
  switch (iconKey) {
    case "scissors":
      return <Scissors size={size} className={className} />;
    case "captions":
      return <MessageSquare size={size} className={className} />;
    case "sparkles":
      return <Wand2 size={size} className={className} />;
    case "sound":
      return <Volume1 size={size} className={className} />;
    case "clock":
      return <Clock size={size} className={className} />;
    case "rocket":
      return <Rocket size={size} className={className} />;
    case "zap":
      return <Zap size={size} className={className} />;
    default:
      return <CheckCircle2 size={size} className={className} />;
  }
}

interface TalkingHeadExplainerStageProps {
  cleanVideoUrl?: string;
  finalVideoUrl?: string;
  runId?: string;
  editPlan?: any;
  beats?: any[];
  topic?: string;
  compact?: boolean;
}

/**
 * TalkingHeadExplainerStage
 * 
 * Unified Preview & Export Stage:
 * The live interactive preview AND the downloaded MP4 are BOTH powered directly by the
 * exact same `renderExplainerFrameToCanvas` function, ensuring 100% visual parity across
 * video zoom, floating dialogue callouts, kinetic typography, cutaways, and colors.
 */
export default function TalkingHeadExplainerStage({
  cleanVideoUrl,
  finalVideoUrl,
  runId: propRunId,
  editPlan,
  beats = [],
  topic = "",
  compact = false,
}: TalkingHeadExplainerStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brollImagesRef = useRef<Record<string, HTMLImageElement>>({});

  const [layoutMode, setLayoutMode] = useState<ExplainerLayoutMode>("auto_reel");
  const [paletteChoice, setPaletteChoice] = useState<PaletteId>("auto");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(editPlan?.cleanDuration || 15);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const currentTimeRef = useRef(0);
  const lastUiScrubUpdateRef = useRef(0);

  const palette = useMemo(
    () => resolveActivePalette(paletteChoice, topic, editPlan),
    [paletteChoice, topic, editPlan]
  );

  const runId =
    propRunId ||
    editPlan?.runId ||
    (cleanVideoUrl ? cleanVideoUrl.match(/run-b-[^/?#&]+/)?.[0] : undefined) ||
    (finalVideoUrl ? finalVideoUrl.match(/run-b-[^/?#&]+/)?.[0] : undefined);

  // Always prioritize clean video footage so the canvas renderer composes dynamic overlays
  // cleanly without underlying burned-in ASS titles or rectangles.
  const activeVideoSrc =
    cleanVideoUrl ||
    (runId ? `/api/pipeline-b/media/${runId}/clean` : undefined) ||
    finalVideoUrl;

  // 1. Extract word-by-word timestamps
  const words: WordItem[] = useMemo(() => {
    return extractWordsFromPlan(editPlan, beats);
  }, [editPlan, beats]);

  // 2. Build Dialogue-Synced Story Explainer Timeline
  const scenes: SceneSegment[] = useMemo(() => {
    return buildExplainerScenes(duration, editPlan, words, beats, topic);
  }, [duration, editPlan, words, beats, topic]);

  // Ensure all canvas typography fonts are preloaded into memory
  useEffect(() => {
    ensureExplainerFontsLoaded();
  }, []);

  // Preload any scene B-roll images
  useEffect(() => {
    let cancelled = false;
    preloadExplainerBrollImages(scenes).then((map) => {
      if (!cancelled) {
        brollImagesRef.current = map;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scenes]);

  // Handle external seek events (e.g., from transcript cut clicks)
  useEffect(() => {
    const handleSeek = (e: Event) => {
      const custom = e as CustomEvent<{ time: number }>;
      if (custom.detail && typeof custom.detail.time === "number" && videoRef.current) {
        videoRef.current.currentTime = custom.detail.time;
        currentTimeRef.current = custom.detail.time;
        setCurrentTime(custom.detail.time);
      }
    };
    window.addEventListener("seek-pipeline-b", handleSeek);
    return () => window.removeEventListener("seek-pipeline-b", handleSeek);
  }, []);

  // Continuous 60fps RAF preview render loop decoupled from React state updates
  // to eliminate render thrashing, DOM re-renders, and blinking.
  useEffect(() => {
    let rafId: number;
    const renderLoop = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      const t = v && !v.paused ? v.currentTime : currentTimeRef.current;
      currentTimeRef.current = t;

      // Throttle UI scrubber text state updates to ~8fps to avoid 60 DOM re-renders per second
      if (v && !v.paused) {
        const now = performance.now();
        if (now - lastUiScrubUpdateRef.current > 120) {
          lastUiScrubUpdateRef.current = now;
          setCurrentTime(t);
        }
      }

      if (c) {
        const ctx = c.getContext("2d");
        if (ctx) {
          renderExplainerFrameToCanvas(ctx, v, t, {
            scenes,
            words,
            duration: Math.max(duration, 0.5),
            palette,
            layoutMode,
            brollImages: brollImagesRef.current,
          });
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [scenes, words, duration, palette, layoutMode]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    currentTimeRef.current = 0;
    setCurrentTime(0);
    v.play().catch(() => {});
    setIsPlaying(true);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  // Exact 1080×1920 Frame-by-Frame MP4 Exporter (100% Shared Canvas Parity)
  const handleDownloadMp4 = useCallback(async () => {
    if (!activeVideoSrc || isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(2);
    setExportError(null);

    try {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      // Requirement 2: Exact same scenes, words, duration, palette, layoutMode, brollImages
      const mp4Blob = await exportExactExplainerMp4({
        cleanVideoUrl: activeVideoSrc,
        runId,
        scenes,
        words,
        duration: Math.max(duration, 0.5),
        palette,
        layoutMode,
        brollImages: brollImagesRef.current,
        onProgress: (pct) => setDownloadProgress(pct),
      });

      const blobUrl = URL.createObjectURL(mp4Blob);
      const cleanName = (topic || "Zee_Story_Explainer")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 36)
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${cleanName || "Zee_Reel"}_1080x1920.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
    } catch (err: any) {
      console.error("Exact MP4 export error:", err);
      // Requirement 1: Visible error only — never trigger a fallback download of the raw/clean video!
      setExportError(err?.message || "Failed to render exact MP4 reel.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [activeVideoSrc, runId, scenes, words, duration, palette, layoutMode, topic, isDownloading]);

  // Listen for global export trigger from full reel modal header / action pills
  useEffect(() => {
    const handleGlobalExport = () => {
      handleDownloadMp4();
    };
    window.addEventListener("export-pipeline-b-mp4", handleGlobalExport);
    return () => window.removeEventListener("export-pipeline-b-mp4", handleGlobalExport);
  }, [handleDownloadMp4]);

  return (
    <div
      className={`aspect-[9/16] w-full rounded-[22px] border-2 border-[#141414] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.45)] overflow-hidden relative bg-[#0B0C10] select-none flex flex-col ${
        compact ? "scale-[0.98]" : ""
      }`}
    >
      {/* Export Error Alert Banner (Never fall back to source video) */}
      {exportError && (
        <div className="absolute top-12 inset-x-3 z-55 rounded-xl bg-rose-950/95 border border-rose-500/60 p-2.5 text-white backdrop-blur-md flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2 text-[10px] font-medium text-rose-200 min-w-0 pr-2">
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <span className="truncate">{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-white/60 hover:text-white px-1.5 py-0.5 rounded text-[11px] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          1. TOP MODE & THEME BAR (Hover-revealed for a clean frame)
         ===================================================================== */}
      <div className="absolute top-2.5 inset-x-2.5 z-50 flex items-center justify-between gap-1.5 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <div className="inline-flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-full border border-white/15">
          <button
            type="button"
            onClick={() => setLayoutMode("auto_reel")}
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition cursor-pointer flex items-center gap-1 ${
              layoutMode === "auto_reel" ? "text-white" : "text-white/75 hover:text-white"
            }`}
            style={{
              backgroundColor: layoutMode === "auto_reel" ? palette.accent : "transparent",
            }}
          >
            <Film size={10} />
            <span>Story Format</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("speaker_only")}
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition cursor-pointer flex items-center gap-1 ${
              layoutMode === "speaker_only" ? "text-white" : "text-white/75 hover:text-white"
            }`}
            style={{
              backgroundColor: layoutMode === "speaker_only" ? palette.accent : "transparent",
            }}
          >
            <UserCheck size={10} />
            <span>Face + Callouts</span>
          </button>
        </div>

        {/* Live Color Theme Swatches */}
        <div
          className="inline-flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/15"
          title="Customize format color palette"
        >
          <Palette size={10} className="text-white/70 mr-0.5" />
          {(
            [
              ["editorial_warm", "#E4491B"],
              ["midnight_neon", "#FF5520"],
              ["cyber_blue", "#38BDF8"],
              ["emerald_growth", "#10B981"],
              ["royal_violet", "#A855F7"],
            ] as const
          ).map(([id, hex]) => {
            const isSel = palette.id === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPaletteChoice(id)}
                className={`w-3.5 h-3.5 rounded-full transition transform cursor-pointer ${
                  isSel ? "scale-125 ring-2 ring-white" : "opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: hex }}
                title={PALETTES[id].label}
              />
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. HARDWARE AUDIO & VIDEO DECODER ELEMENT (Hidden, active in DOM)
         ===================================================================== */}
      <video
        ref={videoRef}
        key={activeVideoSrc}
        src={activeVideoSrc}
        crossOrigin="anonymous"
        playsInline
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          currentTimeRef.current = e.currentTarget.currentTime;
        }}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.001, zIndex: 0 }}
      />

      {/* =====================================================================
          3. 100% EXACT SHARED CANVAS PREVIEW STAGE
         ===================================================================== */}
      <div className="absolute inset-0 z-10 overflow-hidden bg-[#0B0C10] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />
      </div>

      {/* Center Play Button Overlay when Paused */}
      {!isPlaying && !isDownloading && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer bg-black/15 hover:bg-black/25 transition-colors"
        >
          <div
            className="w-13 h-13 rounded-full flex items-center justify-center shadow-2xl text-white transform active:scale-90 transition-transform"
            style={{ backgroundColor: palette.accent }}
          >
            <Play size={22} className="ml-0.5 fill-white" />
          </div>
        </div>
      )}

      {/* =====================================================================
          4. EXPORT PROGRESS OVERLAY (When downloading exact MP4)
         ===================================================================== */}
      {isDownloading && (
        <div className="absolute inset-0 z-45 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 grid place-items-center mb-3 shadow-lg">
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
          <div className="mono text-[12px] font-bold uppercase tracking-wider mb-1">
            Rendering 1080×1920 Reel
          </div>
          <div className="text-[11px] text-white/70 max-w-[240px] mb-3">
            Deterministic seek-and-render encoding with lossless studio audio...
          </div>
          <div className="w-48 bg-white/15 h-2 rounded-full overflow-hidden border border-white/20">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${downloadProgress}%`,
                backgroundColor: palette.highlight,
              }}
            />
          </div>
          <div className="mono text-[10px] font-bold text-white/90 mt-2">
            {downloadProgress}% complete
          </div>
        </div>
      )}

      {/* =====================================================================
          5. BOTTOM PLAYBACK & DOWNLOAD CONTROL BAR
         ===================================================================== */}
      <div className="absolute bottom-2.5 inset-x-2.5 z-50 flex items-center justify-between gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-lg">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlay}
            className="w-7 h-7 rounded-full text-white grid place-items-center transition active:scale-95 cursor-pointer"
            style={{ backgroundColor: palette.accent }}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition cursor-pointer"
            title="Restart reel"
          >
            <RotateCcw size={11} />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
          </button>
          <span className="mono text-[10px] font-bold text-white/85 ml-1">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </span>
        </div>

        <button
          type="button"
          onClick={handleDownloadMp4}
          disabled={isDownloading}
          className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-[10px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
          title="Download verified 1080×1920 MP4 reel matching preview frame-by-frame"
        >
          {isDownloading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Download size={11} />
          )}
          <span>{isDownloading ? `${downloadProgress}%` : "MP4"}</span>
        </button>
      </div>
    </div>
  );
}
