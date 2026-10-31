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
  Edit3,
  Trash2,
  Sparkles,
  Check,
  X,
  MoveVertical,
  Eye,
  EyeOff,
  Sliders,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
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
  onRecreateScene?: (sceneIndex: number, instruction: string) => Promise<void> | void;
}

/**
 * TalkingHeadExplainerStage
 * 
 * Unified Preview & Export Stage with Interactive Edit Mode:
 * - Direct mouse-click deletion & editing of overlay callouts, steps, and headlines
 * - Shiftable CC titles (Top, Center, Bottom) with live positioning
 * - Exact scene-by-scene navigation and scrubber
 * - Pinned scene recreation ("Pin Recreate") with live progress
 * - 100% visual parity between live preview and exported MP4
 */
export default function TalkingHeadExplainerStage({
  cleanVideoUrl,
  finalVideoUrl,
  runId: propRunId,
  editPlan,
  beats = [],
  topic = "",
  compact = false,
  onRecreateScene,
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

  // =========================================================================
  // INTERACTIVE EDITING STATE
  // =========================================================================
  const [isEditMode, setIsEditMode] = useState(false);
  const [hiddenCalloutIds, setHiddenCalloutIds] = useState<Set<string>>(new Set());
  const [captionPosition, setCaptionPosition] = useState<"bottom" | "center" | "top">("bottom");
  const [captionYOffset, setCaptionYOffset] = useState<number>(0);
  const [hideCaptions, setHideCaptions] = useState(false);

  // Inline Callout Editor Popover
  const [editingCallout, setEditingCallout] = useState<{
    sceneIdx: number;
    calloutId: string;
    title: string;
    subtitle: string;
  } | null>(null);

  // Pin & Recreate Scene Modal State
  const [recreateModalSceneIdx, setRecreateModalSceneIdx] = useState<number | null>(null);
  const [recreateInstruction, setRecreateInstruction] = useState("");
  const [isRecreatingScene, setIsRecreatingScene] = useState(false);
  const [recreateStatusMessage, setRecreateStatusMessage] = useState("");

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

  const activeVideoSrc =
    cleanVideoUrl ||
    (runId ? `/api/pipeline-b/media/${runId}/clean` : undefined) ||
    finalVideoUrl;

  // 1. Extract word-by-word timestamps
  const words: WordItem[] = useMemo(() => {
    return extractWordsFromPlan(editPlan, beats);
  }, [editPlan, beats]);

  // 2. Build Base Dialogue-Synced Story Explainer Timeline
  const initialScenes: SceneSegment[] = useMemo(() => {
    return buildExplainerScenes(duration, editPlan, words, beats, topic);
  }, [duration, editPlan, words, beats, topic]);

  // 3. Mutable user scene segments (allows modifying headlineText, callouts, etc.)
  const [userScenes, setUserScenes] = useState<SceneSegment[]>([]);

  useEffect(() => {
    setUserScenes(initialScenes);
  }, [initialScenes]);

  const activeScenes = userScenes.length > 0 ? userScenes : initialScenes;

  // Derive current scene index based on currentTime
  const activeSceneIndex = useMemo(() => {
    if (activeScenes.length === 0) return 0;
    const idx = activeScenes.findIndex(
      (s, i) =>
        currentTime >= s.start &&
        (i === activeScenes.length - 1 ? currentTime <= s.end + 0.5 : currentTime < s.end)
    );
    if (idx !== -1) return idx;
    for (let i = 0; i < activeScenes.length; i++) {
      if (
        currentTime >= activeScenes[i].start &&
        (i === activeScenes.length - 1 || currentTime < activeScenes[i + 1].start)
      ) {
        return i;
      }
    }
    return currentTime < activeScenes[0].start ? 0 : activeScenes.length - 1;
  }, [currentTime, activeScenes]);

  const activeScene = activeScenes[activeSceneIndex] || activeScenes[0];

  // Derive active callout within current scene
  const activeFaceCallout = useMemo(() => {
    if (!activeScene || !activeScene.faceCallouts || activeScene.faceCallouts.length === 0) {
      return null;
    }
    const visible = activeScene.faceCallouts.filter((c) => !hiddenCalloutIds.has(c.id));
    let match: FaceSpaceCallout | null = null;
    for (const c of visible) {
      if (currentTime >= c.triggerTime - 0.08) {
        match = c;
      }
    }
    return match || visible[0] || null;
  }, [activeScene, currentTime, hiddenCalloutIds]);

  // Preload fonts
  useEffect(() => {
    ensureExplainerFontsLoaded();
  }, []);

  // Preload scene B-roll images
  useEffect(() => {
    let cancelled = false;
    preloadExplainerBrollImages(activeScenes).then((map) => {
      if (!cancelled) {
        brollImagesRef.current = map;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeScenes]);

  // Handle external seek events
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
  useEffect(() => {
    let rafId: number;
    const renderLoop = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      const t = v && !v.paused ? v.currentTime : currentTimeRef.current;
      currentTimeRef.current = t;

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
            scenes: activeScenes,
            words,
            duration: Math.max(duration, 0.5),
            palette,
            layoutMode,
            brollImages: brollImagesRef.current,
            captionPosition,
            captionYOffset,
            hideCaptions,
            hiddenCalloutIds,
          });
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [
    activeScenes,
    words,
    duration,
    palette,
    layoutMode,
    captionPosition,
    captionYOffset,
    hideCaptions,
    hiddenCalloutIds,
  ]);

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

  // Jump directly to exact scene
  const handleSeekScene = (idx: number) => {
    const target = activeScenes[idx];
    if (!target) return;
    const v = videoRef.current;
    const seekT = Math.max(0, target.start + 0.05);
    if (v) {
      v.pause();
      setIsPlaying(false);
      v.currentTime = seekT;
    }
    currentTimeRef.current = seekT;
    setCurrentTime(seekT);
  };

  // Delete/hide an overlay element with mouse click
  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHiddenCalloutIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Restore deleted elements
  const handleRestoreAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHiddenCalloutIds(new Set());
    setHideCaptions(false);
  };

  // Save edited callout
  const handleSaveCallout = () => {
    if (!editingCallout) return;
    setUserScenes((prev) =>
      prev.map((sc, i) => {
        if (i !== editingCallout.sceneIdx) return sc;
        return {
          ...sc,
          faceCallouts: sc.faceCallouts.map((fc) =>
            fc.id === editingCallout.calloutId
              ? {
                  ...fc,
                  title: editingCallout.title,
                  subtitle: editingCallout.subtitle,
                }
              : fc
          ),
        };
      })
    );
    setEditingCallout(null);
  };

  // Pin & Recreate Scene trigger
  const handleTriggerRecreate = async () => {
    if (recreateModalSceneIdx === null || !onRecreateScene) return;
    setIsRecreatingScene(true);
    setRecreateStatusMessage(
      `Recreating Scene ${recreateModalSceneIdx + 1} with Meta Wonder & Image 1.0...`
    );

    try {
      await onRecreateScene(
        recreateModalSceneIdx,
        recreateInstruction.trim() ||
          "Make this scene punchier with bold kinetic visuals and clean badges"
      );
      setRecreateModalSceneIdx(null);
      setRecreateInstruction("");
    } catch (err: any) {
      console.error("Recreate scene failed:", err);
      setExportError(err?.message || "Failed to recreate scene.");
    } finally {
      setIsRecreatingScene(false);
      setRecreateStatusMessage("");
    }
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

      const mp4Blob = await exportExactExplainerMp4({
        cleanVideoUrl: activeVideoSrc,
        runId,
        scenes: activeScenes,
        words,
        duration: Math.max(duration, 0.5),
        palette,
        layoutMode,
        brollImages: brollImagesRef.current,
        captionPosition,
        captionYOffset,
        hideCaptions,
        hiddenCalloutIds,
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
      setExportError(err?.message || "Failed to render exact MP4 reel.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [
    activeVideoSrc,
    runId,
    activeScenes,
    words,
    duration,
    palette,
    layoutMode,
    captionPosition,
    captionYOffset,
    hideCaptions,
    hiddenCalloutIds,
    topic,
    isDownloading,
  ]);

  // Listen for global export trigger
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
      {/* Export Error Alert Banner */}
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
          1. TOP CONTROL BAR (Format Mode, Edit Toggle & Theme Swatches)
         ===================================================================== */}
      <div className="absolute top-2.5 inset-x-2.5 z-50 flex items-center justify-between gap-1.5 transition-opacity duration-200">
        <div className="inline-flex items-center gap-1 bg-black/85 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-md">
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
            <span>Story</span>
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
            <span>Face</span>
          </button>
        </div>

        {/* Center / Right: Interactive Edit Mode Toggle */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (!isEditMode && videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
              setIsEditMode(!isEditMode);
            }}
            className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition cursor-pointer flex items-center gap-1 shadow-md border ${
              isEditMode
                ? "bg-amber-400 text-black border-amber-300 font-extrabold animate-pulse"
                : "bg-black/85 text-white/90 border-white/20 hover:bg-black/95 hover:text-white"
            }`}
            title="Toggle interactive mouse editing of callouts, captions, and scenes"
          >
            <Edit3 size={11} className={isEditMode ? "text-black" : "text-amber-400"} />
            <span>{isEditMode ? "Done Editing" : "Edit Elements"}</span>
          </button>

          {/* Color Palette Swatches */}
          <div
            className="inline-flex items-center gap-1 bg-black/85 backdrop-blur-md px-2 py-1 rounded-full border border-white/15 shadow-md"
            title="Customize format color palette"
          >
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
          onClick={() => {
            if (!isEditMode) togglePlay();
          }}
          className={`w-full h-full object-cover ${isEditMode ? "cursor-default" : "cursor-pointer"}`}
        />
      </div>

      {/* =====================================================================
          4. INTERACTIVE MOUSE EDIT OVERLAYS (Active in Edit Mode)
         ===================================================================== */}
      {isEditMode && (
        <div className="absolute inset-0 z-35 pointer-events-none flex flex-col justify-between p-3">
          {/* Top Banner Notice */}
          <div className="mt-11 flex items-center justify-between bg-black/90 backdrop-blur-md rounded-xl p-2 border border-amber-400/40 pointer-events-auto shadow-xl">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              <span className="font-bold">Interactive Edit Mode</span>
              <span className="text-white/60">
                (Scene {activeSceneIndex + 1}/{activeScenes.length})
              </span>
            </div>
            {hiddenCalloutIds.size > 0 && (
              <button
                type="button"
                onClick={handleRestoreAll}
                className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={9} />
                <span>Restore ({hiddenCalloutIds.size})</span>
              </button>
            )}
          </div>

          {/* Interactive Callout Bounding Capsule */}
          {activeFaceCallout && !hiddenCalloutIds.has(activeFaceCallout.id) && (
            <div
              className="pointer-events-auto absolute left-4 right-4 rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-400/10 backdrop-blur-xs p-2 flex items-center justify-between shadow-2xl transition animate-fade-in"
              style={{ bottom: "24.5%" }}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1 text-[9px] uppercase font-mono font-bold text-amber-300">
                  <span>Badge Callout</span>
                  <span className="opacity-60">• Click to edit or trash</span>
                </div>
                <div className="text-[11px] font-bold text-white truncate">
                  {activeFaceCallout.title}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setEditingCallout({
                      sceneIdx: activeSceneIndex,
                      calloutId: activeFaceCallout.id,
                      title: activeFaceCallout.title,
                      subtitle: activeFaceCallout.subtitle,
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-amber-300 hover:text-white border border-amber-400/50 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Edit callout text"
                >
                  <Edit3 size={11} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteElement(activeFaceCallout.id, e)}
                  className="w-7 h-7 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white grid place-items-center cursor-pointer transition shadow-md"
                  title="Delete this callout"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Interactive CC Captions Placement Bar */}
          <div
            className="pointer-events-auto absolute left-3 right-3 rounded-2xl border-2 border-dashed border-sky-400/80 bg-black/90 backdrop-blur-md p-2 flex items-center justify-between shadow-2xl transition"
            style={{
              top:
                captionPosition === "top"
                  ? "17%"
                  : captionPosition === "center"
                  ? "48%"
                  : "auto",
              bottom: captionPosition === "bottom" ? "12%" : "auto",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-extrabold text-sky-400 uppercase">
                CC Titles:
              </span>
              <div className="inline-flex items-center gap-1 bg-white/10 p-0.5 rounded-lg border border-white/15">
                {(["bottom", "center", "top"] as const).map((pos) => {
                  const isSel = captionPosition === pos;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setCaptionPosition(pos)}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold capitalize transition cursor-pointer ${
                        isSel
                          ? "bg-sky-500 text-black font-extrabold"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCaptionYOffset((prev) => prev - 20)}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white grid place-items-center text-[10px] cursor-pointer"
                title="Nudge titles upward"
              >
                <ArrowUp size={11} />
              </button>
              <button
                type="button"
                onClick={() => setCaptionYOffset((prev) => prev + 20)}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white grid place-items-center text-[10px] cursor-pointer"
                title="Nudge titles downward"
              >
                <ArrowDown size={11} />
              </button>
              <button
                type="button"
                onClick={() => setHideCaptions(!hideCaptions)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  hideCaptions
                    ? "bg-rose-500/80 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title={hideCaptions ? "Show CC Captions" : "Hide CC Captions"}
              >
                {hideCaptions ? <EyeOff size={10} /> : <Eye size={10} />}
                <span>{hideCaptions ? "Hidden" : "Hide"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Play Button Overlay when Paused */}
      {!isPlaying && !isDownloading && !isEditMode && (
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
          5. EXPORT PROGRESS OVERLAY (When downloading exact MP4)
         ===================================================================== */}
      {isDownloading && (
        <div className="absolute inset-0 z-45 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 grid place-items-center mb-3 shadow-lg">
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
          <div className="mono text-[12px] font-bold uppercase tracking-wider mb-1">
            Rendering 1080×1920 Reel
          </div>
          <div className="text-[11px] text-white/70 max-w-[240px] mb-3">
            Deterministic seek-and-render encoding matching live preview with your exact deletions & shifted CC titles...
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
          6. EXACT SCENE-BY-SCENE SCRUBBER PILL BAR
         ===================================================================== */}
      <div className="absolute bottom-11 inset-x-2 z-40 flex items-center gap-1 overflow-x-auto py-1 px-1 bg-black/85 backdrop-blur-md rounded-xl border border-white/15 scrollbar-none shadow-xl">
        {activeScenes.map((sc, idx) => {
          const isActive = idx === activeSceneIndex;
          const durSec = Math.max(0.5, sc.end - sc.start).toFixed(1);
          return (
            <div
              key={sc.id || idx}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 transition cursor-pointer border ${
                isActive
                  ? "bg-white/20 text-white border-white/40 shadow-sm"
                  : "bg-white/5 text-white/75 hover:bg-white/10 border-transparent"
              }`}
              onClick={() => handleSeekScene(idx)}
            >
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="mono text-[9px] font-extrabold text-amber-400">
                    S{idx + 1}
                  </span>
                  <span className="mono text-[8px] text-white/60">
                    {durSec}s
                  </span>
                </div>
                <span className="text-[9px] font-bold truncate max-w-[70px]">
                  {sc.headlineText || `Scene ${idx + 1}`}
                </span>
              </div>

              {/* Pin Recreate button per scene */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRecreateModalSceneIdx(idx);
                }}
                className="ml-0.5 p-1 rounded-md bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-black transition cursor-pointer"
                title={`Pin & Recreate Scene ${idx + 1}`}
              >
                <Sparkles size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          7. BOTTOM PLAYBACK & DOWNLOAD CONTROL BAR
         ===================================================================== */}
      <div className="absolute bottom-2 inset-x-2 z-40 flex items-center justify-between gap-2 bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-lg">
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

      {/* =====================================================================
          8. INLINE CALLOUT TEXT EDITOR MODAL
         ===================================================================== */}
      {editingCallout && (
        <div className="absolute inset-0 z-60 bg-black/85 backdrop-blur-sm p-4 flex flex-col justify-center animate-fade-in">
          <div className="bg-[#14161F] border border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase">
                Edit Callout Badge
              </span>
              <button
                type="button"
                onClick={() => setEditingCallout(null)}
                className="text-white/60 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/70 font-bold uppercase">
                Title
              </label>
              <input
                type="text"
                value={editingCallout.title}
                onChange={(e) =>
                  setEditingCallout({ ...editingCallout, title: e.target.value })
                }
                className="bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/70 font-bold uppercase">
                Subtitle
              </label>
              <input
                type="text"
                value={editingCallout.subtitle}
                onChange={(e) =>
                  setEditingCallout({ ...editingCallout, subtitle: e.target.value })
                }
                className="bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingCallout(null)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCallout}
                className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[11px] font-extrabold flex items-center gap-1 shadow-md"
              >
                <Check size={12} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          9. PIN & RECREATE SCENE MODAL
         ===================================================================== */}
      {recreateModalSceneIdx !== null && (
        <div className="absolute inset-0 z-60 bg-black/85 backdrop-blur-sm p-4 flex flex-col justify-center animate-fade-in">
          <div className="bg-[#14161F] border border-amber-400/40 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-[11px] font-mono font-bold text-amber-400 uppercase">
                  Pin & Recreate Scene {recreateModalSceneIdx + 1}
                </span>
              </div>
              {!isRecreatingScene && (
                <button
                  type="button"
                  onClick={() => setRecreateModalSceneIdx(null)}
                  className="text-white/60 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="text-[10px] text-white/70">
              Target timestamps:{" "}
              <span className="mono font-bold text-white">
                {activeScenes[recreateModalSceneIdx]?.start.toFixed(1)}s –{" "}
                {activeScenes[recreateModalSceneIdx]?.end.toFixed(1)}s
              </span>
              . All other scenes will remain untouched.
            </div>

            {/* Quick preset prompt chips */}
            <div className="flex flex-wrap gap-1">
              {[
                "⚡ Kinetic pop typography & energetic motion",
                "🎨 Full-screen animated procedural b-roll",
                "🔍 Camera zoom 1.25x punch-in on speaker",
                "🧼 Minimal clean badges, clear face view",
                "🔥 Hormozi high-contrast captions & badges",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRecreateInstruction(chip)}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white/90 text-[9px] text-left transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/70 font-bold uppercase">
                Custom Instruction for Scene {recreateModalSceneIdx + 1}
              </label>
              <textarea
                rows={2}
                value={recreateInstruction}
                onChange={(e) => setRecreateInstruction(e.target.value)}
                placeholder="e.g. Focus on the metric with glowing green badges..."
                className="bg-black/60 border border-white/20 rounded-lg p-2 text-[11px] text-white outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {isRecreatingScene ? (
              <div className="flex items-center justify-center gap-2 py-2 bg-amber-400/10 border border-amber-400/30 rounded-lg">
                <Loader2 size={14} className="animate-spin text-amber-400" />
                <span className="text-[10px] text-amber-300 font-bold">
                  {recreateStatusMessage || "Generating scene variant..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRecreateModalSceneIdx(null)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerRecreate}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[11px] font-extrabold flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Sparkles size={12} />
                  <span>Start Recreating</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
