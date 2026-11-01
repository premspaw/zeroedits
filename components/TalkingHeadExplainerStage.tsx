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
  GripVertical,
  Eye,
  EyeOff,
  Sliders,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Plus,
  Minus,
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
import { CaptionStyleId, CAPTION_STYLES, CAPTION_STYLE_LIST } from "@/lib/captions/styles";
import CaptionLayerOverlay from "@/components/CaptionLayerOverlay";

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

/**
 * Encodes an AudioBuffer into a standard WAV container blob (MIME: audio/mp3).
 * Plays universally across all media players and browsers.
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let pos = 0;

  const setUint16 = (data: number) => {
    out.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    out.setUint32(pos, data, true);
    pos += 4;
  };

  // "RIFF"
  setUint32(0x46464952);
  setUint32(length - 8);
  // "WAVE"
  setUint32(0x45564157);

  // "fmt " chunk
  setUint32(0x20746d66);
  setUint32(16); // 16 for PCM
  setUint16(1); // Linear quantization (PCM)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // 16-bit

  // "data" chunk
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  for (let offset = 0; offset < buffer.length; offset++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][offset]));
      let intSample = sample < 0 ? sample * 32768 : sample * 32767;
      out.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return new Blob([out], { type: "audio/mp3" });
}

function parseCustomTranscriptInput(input: string, totalDuration: number): WordItem[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // 1. Try parsing JSON (Whisper / faster-whisper array or object)
  try {
    const parsed = JSON.parse(trimmed);
    let rawWords: any[] = [];
    if (Array.isArray(parsed)) {
      rawWords = parsed;
    } else if (parsed.segments && Array.isArray(parsed.segments)) {
      rawWords = parsed.segments.flatMap((s: any) => s.words || []);
    } else if (parsed.words && Array.isArray(parsed.words)) {
      rawWords = parsed.words;
    }
    if (rawWords.length > 0) {
      return rawWords
        .map((w: any) => ({
          word: String(w.word || w.text || "").trim(),
          start: typeof w.start === "number" ? w.start : 0,
          end: typeof w.end === "number" ? w.end : (w.start || 0) + 0.3,
        }))
        .filter((w) => w.word.length > 0);
    }
  } catch {}

  // 2. Parse SRT / VTT timestamps or raw text
  const cleanTokens = trimmed
    .replace(/^\d+\s+\d{2}:\d{2}:\d{2}[,\.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,\.]\d{3}/gm, "")
    .replace(/\r?\n+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (cleanTokens.length === 0) return [];

  const timePerWord = Math.max(0.18, (totalDuration - 0.4) / cleanTokens.length);
  return cleanTokens.map((tok, i) => ({
    word: tok,
    start: +(i * timePerWord + 0.15).toFixed(2),
    end: +((i + 1) * timePerWord + 0.1).toFixed(2),
  }));
}

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const brollImagesRef = useRef<Record<string, HTMLImageElement>>({});

  const [layoutMode, setLayoutMode] = useState<ExplainerLayoutMode>("auto_reel");
  const [paletteChoice, setPaletteChoice] = useState<PaletteId>("auto");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(editPlan?.cleanDuration || 15);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingMp3, setIsDownloadingMp3] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // =========================================================================
  // INTERACTIVE EDITING STATE
  // =========================================================================
  const [isEditMode, setIsEditMode] = useState(false);
  const [hiddenCalloutIds, setHiddenCalloutIds] = useState<Set<string>>(new Set());
  const [captionPosition, setCaptionPosition] = useState<"bottom" | "center" | "top">("bottom");
  const [captionYPercent, setCaptionYPercent] = useState<number>(84.6);
  const [isDraggingCaptions, setIsDraggingCaptions] = useState(false);
  const [captionYOffset, setCaptionYOffset] = useState<number>(0);
  const [hideCaptions, setHideCaptions] = useState(false);

  // CC Subtitles Studio State
  const [captionStyleId, setCaptionStyleId] = useState<CaptionStyleId>("hormozi");
  const [captionSizeScale, setCaptionSizeScale] = useState<number>(1.0);
  const [showCCStudio, setShowCCStudio] = useState<boolean>(false);
  const [customWords, setCustomWords] = useState<WordItem[] | null>(null);
  const [customTranscriptInput, setCustomTranscriptInput] = useState<string>("");
  const [showTranscriptPasteBox, setShowTranscriptPasteBox] = useState<boolean>(false);

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
  const hasDraggedRef = useRef(false);

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

  const effectiveWords = useMemo(() => {
    return customWords && customWords.length > 0 ? customWords : words;
  }, [customWords, words]);

  // 2. Build Base Dialogue-Synced Story Explainer Timeline
  const initialScenes: SceneSegment[] = useMemo(() => {
    return buildExplainerScenes(duration, editPlan, effectiveWords, beats, topic);
  }, [duration, editPlan, effectiveWords, beats, topic]);

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

  // Smooth mouse pointer drag tracking for CC Titles across Top, Center, Bottom
  useEffect(() => {
    if (!isDraggingCaptions) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      hasDraggedRef.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      let pct = ((e.clientY - rect.top) / rect.height) * 100;
      pct = Math.max(12, Math.min(88, pct));

      // Magnetic snap targets: Top (14.5%), Center (50.0%), Bottom (84.6%)
      const SNAP_THRESH = 3.8;
      if (Math.abs(pct - 14.5) < SNAP_THRESH) {
        pct = 14.5;
        setCaptionPosition("top");
      } else if (Math.abs(pct - 50.0) < SNAP_THRESH) {
        pct = 50.0;
        setCaptionPosition("center");
      } else if (Math.abs(pct - 84.6) < SNAP_THRESH) {
        pct = 84.6;
        setCaptionPosition("bottom");
      } else {
        if (pct < 32) setCaptionPosition("top");
        else if (pct < 68) setCaptionPosition("center");
        else setCaptionPosition("bottom");
      }

      setCaptionYPercent(pct);
      setCaptionYOffset(0);
    };

    const handlePointerUp = () => {
      setIsDraggingCaptions(false);
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 200);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingCaptions]);

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
            words: effectiveWords,
            duration: Math.max(duration, 0.5),
            palette,
            layoutMode,
            brollImages: brollImagesRef.current,
            captionPosition,
            captionYOffset,
            captionYPercent,
            captionStyleId,
            captionSizeScale,
            hideCaptions: true, // Live DOM overlay renders captions smoothly
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
    effectiveWords,
    captionStyleId,
    captionSizeScale,
    duration,
    palette,
    layoutMode,
    captionPosition,
    captionYOffset,
    captionYPercent,
    hideCaptions,
    hiddenCalloutIds,
  ]);

  const togglePlay = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
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
        words: effectiveWords,
        captionStyleId,
        captionSizeScale,
        duration: Math.max(duration, 0.5),
        palette,
        layoutMode,
        brollImages: brollImagesRef.current,
        captionPosition,
        captionYOffset,
        captionYPercent,
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
    effectiveWords,
    captionStyleId,
    captionSizeScale,
    duration,
    palette,
    layoutMode,
    captionPosition,
    captionYOffset,
    captionYPercent,
    hideCaptions,
    hiddenCalloutIds,
    topic,
    isDownloading,
  ]);

  // Extract and download clean MP3 audio from active video
  const handleDownloadMp3 = useCallback(async () => {
    if (!activeVideoSrc || isDownloadingMp3) return;
    setIsDownloadingMp3(true);
    setExportError(null);

    try {
      const res = await fetch(activeVideoSrc);
      if (!res.ok) throw new Error("Could not fetch media source for audio.");
      const arrayBuffer = await res.arrayBuffer();

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const mp3Blob = audioBufferToWavBlob(audioBuffer);
      const blobUrl = URL.createObjectURL(mp3Blob);

      const cleanName = (topic || "Zee_Story_Audio")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 36)
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${cleanName || "Zee_Audio"}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
    } catch (err: any) {
      console.error("MP3 export error:", err);
      setExportError(err?.message || "Failed to download MP3 audio.");
    } finally {
      setIsDownloadingMp3(false);
    }
  }, [activeVideoSrc, isDownloadingMp3, topic]);

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
      className={`w-full flex flex-col gap-2.5 select-none ${
        compact ? "scale-[0.98]" : ""
      }`}
    >
      {/* Export Error Alert Banner */}
      {exportError && (
        <div className="rounded-xl bg-rose-950/95 border border-rose-500/60 p-2.5 text-white backdrop-blur-md flex items-center justify-between shadow-xl animate-fade-in">
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
          1. COMPACT TOP TOOLBAR: Colors, Mode & Edit Controls
         ===================================================================== */}
      <div className="w-full bg-[#12141C] border border-white/15 rounded-2xl p-2 flex flex-col gap-1.5 shadow-lg text-white">
        {/* Row 1: Colors & Format Mode */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Color Palette Swatches (Always visible) */}
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/10">
            <Palette size={11} className="text-white/70 shrink-0" />
            <div className="flex items-center gap-1.5">
              {(
                [
                  ["editorial_warm", "#E4491B", "Warm Orange"],
                  ["midnight_neon", "#FF5520", "Neon Flame"],
                  ["cyber_blue", "#38BDF8", "Cyber Blue"],
                  ["emerald_growth", "#10B981", "Emerald Growth"],
                  ["royal_violet", "#A855F7", "Royal Violet"],
                ] as const
              ).map(([id, hex, label]) => {
                const isSel = palette.id === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaletteChoice(id);
                    }}
                    className={`w-4 h-4 rounded-full transition-all transform cursor-pointer flex items-center justify-center ${
                      isSel
                        ? "scale-125 ring-2 ring-white shadow-lg"
                        : "opacity-75 hover:opacity-100 hover:scale-110"
                    }`}
                    style={{ backgroundColor: hex }}
                    title={label}
                  >
                    {isSel && (
                      <Check size={8} className="text-white drop-shadow stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Format Mode & Edit Toggle */}
          <div className="flex items-center gap-1">
            <div className="inline-flex items-center gap-0.5 bg-black/40 p-0.5 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setLayoutMode("auto_reel")}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition cursor-pointer ${
                  layoutMode === "auto_reel"
                    ? "bg-white text-black shadow-sm font-extrabold"
                    : "text-white/75 hover:text-white"
                }`}
              >
                Story
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("speaker_only")}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition cursor-pointer ${
                  layoutMode === "speaker_only"
                    ? "bg-white text-black shadow-sm font-extrabold"
                    : "text-white/75 hover:text-white"
                }`}
              >
                Face
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!isEditMode && videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
                setIsEditMode(!isEditMode);
              }}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition cursor-pointer flex items-center gap-1 border shadow-sm ${
                isEditMode
                  ? "bg-amber-400 text-black border-amber-300 font-extrabold"
                  : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20"
              }`}
              title="Toggle interactive element deletion & editing"
            >
              <Edit3 size={10} className={isEditMode ? "text-black" : "text-amber-400"} />
              <span>{isEditMode ? "Done" : "Edit"}</span>
            </button>
          </div>
        </div>

        {/* Row 2: CC Subtitle Placement & Mouse Drag Slider (Expanded when in Edit Mode) */}
        {isEditMode && (
          <div className="flex items-center justify-between gap-2 bg-black/50 px-2.5 py-1 rounded-xl border border-white/10 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <span className="mono text-[9px] font-extrabold text-sky-400 uppercase tracking-wider">
                CC:
              </span>
              <div className="inline-flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg border border-white/10">
                {(
                  [
                    ["bottom", "Bottom", 84.6],
                    ["center", "Center", 50.0],
                    ["top", "Top", 14.5],
                  ] as const
                ).map(([pos, label, yPct]) => {
                  const isSel = captionPosition === pos;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaptionPosition(pos);
                        setCaptionYPercent(yPct);
                        setCaptionYOffset(0);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold capitalize transition cursor-pointer ${
                        isSel
                          ? "bg-sky-500 text-black font-extrabold shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mouse Drag Slider */}
            <div className="flex items-center gap-1.5 flex-1 max-w-[130px]">
              <input
                type="range"
                min="12"
                max="88"
                step="0.5"
                value={captionYPercent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCaptionYPercent(val);
                  setCaptionYOffset(0);
                  if (Math.abs(val - 14.5) < 5) setCaptionPosition("top");
                  else if (Math.abs(val - 50.0) < 5) setCaptionPosition("center");
                  else if (Math.abs(val - 84.6) < 5) setCaptionPosition("bottom");
                  else setCaptionPosition(val < 32 ? "top" : val < 68 ? "center" : "bottom");
                }}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400"
                title="Slide to move CC titles up or down with mouse"
              />
              <span className="mono text-[8px] font-bold text-white/70 min-w-[24px] text-right">
                {captionYPercent.toFixed(0)}%
              </span>
            </div>

            {/* Visibility toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHideCaptions(!hideCaptions);
              }}
              className={`p-1 rounded-md text-[9px] font-bold flex items-center transition cursor-pointer ${
                hideCaptions
                  ? "bg-rose-500/80 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title={hideCaptions ? "Show CC Captions" : "Hide CC Captions"}
            >
              {hideCaptions ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. PURE CLEAN 9:16 PREVIEW SCREEN (Unobstructed Canvas Video View)
         ===================================================================== */}
      <div
        ref={containerRef}
        className={`aspect-[9/16] w-full rounded-[22px] border-2 border-[#1E2028] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.6)] overflow-hidden relative bg-[#0B0C10] select-none flex flex-col items-center justify-center ${
          isDraggingCaptions ? "cursor-grabbing" : ""
        }`}
      >
        {/* Hardware Audio & Video Decoder */}
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

        {/* 100% Exact Shared Canvas Preview */}
        <div className="absolute inset-0 z-10 overflow-hidden bg-[#0B0C10] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            onClick={() => {
              if (!isEditMode && !showCCStudio) togglePlay();
            }}
            className={`w-full h-full object-cover ${
              isEditMode ? "cursor-default" : "cursor-pointer"
            }`}
          />
        </div>

        {/* Real-time Kinetic Typography & Multi-Style Caption Layer */}
        <CaptionLayerOverlay
          words={effectiveWords}
          currentTime={currentTime}
          styleId={captionStyleId}
          sizeScale={captionSizeScale}
          captionYPercent={captionYPercent}
          hideCaptions={hideCaptions}
        />

        {/* On-Video Subtitle Drag Hotspot */}
        {!hideCaptions && (
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              hasDraggedRef.current = false;
              setIsDraggingCaptions(true);
            }}
            className="pointer-events-auto absolute left-6 right-6 z-25 flex items-center justify-center select-none opacity-80 hover:opacity-100 transition-opacity"
            style={{
              top: `${captionYPercent}%`,
              transform: "translateY(-50%)",
            }}
          >
            <div
              className={`cursor-grab active:cursor-grabbing px-2.5 py-1 rounded-full border shadow-xl flex items-center gap-1.5 transition-all ${
                isDraggingCaptions
                  ? "bg-sky-500 text-black border-white ring-2 ring-sky-300 scale-105"
                  : "bg-black/80 hover:bg-black/95 text-sky-300 border-sky-400/40 hover:border-sky-400"
              }`}
              title="Click and drag with mouse pointer to move CC titles up or down"
            >
              <GripVertical
                size={12}
                className={isDraggingCaptions ? "text-black" : "text-sky-400"}
              />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                {isDraggingCaptions
                  ? `CC: ${captionYPercent.toFixed(0)}%`
                  : `↕ Drag CC (${captionPosition})`}
              </span>
            </div>
          </div>
        )}

        {/* Interactive Mouse Edit Overlays (Active when Edit Mode is ON) */}
        {isEditMode && (
          <div className="absolute inset-0 z-35 pointer-events-none flex flex-col justify-between p-3">
            {/* Top Banner Notice */}
            <div className="flex items-center justify-between bg-black/90 backdrop-blur-md rounded-xl p-2 border border-amber-400/40 pointer-events-auto shadow-xl">
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

            {/* Magnetic Guidelines while Dragging with Mouse */}
            {isDraggingCaptions && (
              <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between">
                {/* Top Guideline */}
                <div
                  className={`absolute inset-x-0 border-b border-dashed transition-all flex items-center justify-between px-3 ${
                    captionPosition === "top"
                      ? "border-sky-400 bg-sky-500/15 py-1"
                      : "border-white/20 py-0.5"
                  }`}
                  style={{ top: "14.5%" }}
                >
                  <span className="mono text-[8px] font-extrabold uppercase tracking-wider text-sky-300 bg-black/85 px-1.5 py-0.5 rounded shadow">
                    Top Header (Face Clear)
                  </span>
                  <span className="mono text-[8px] text-white/60">14.5%</span>
                </div>

                {/* Center Guideline */}
                <div
                  className={`absolute inset-x-0 border-b border-dashed transition-all flex items-center justify-between px-3 ${
                    captionPosition === "center"
                      ? "border-sky-400 bg-sky-500/15 py-1"
                      : "border-white/20 py-0.5"
                  }`}
                  style={{ top: "50%" }}
                >
                  <span className="mono text-[8px] font-extrabold uppercase tracking-wider text-sky-300 bg-black/85 px-1.5 py-0.5 rounded shadow">
                    Center Kinetic (Viral Pop)
                  </span>
                  <span className="mono text-[8px] text-white/60">50.0%</span>
                </div>

                {/* Bottom Guideline */}
                <div
                  className={`absolute inset-x-0 border-b border-dashed transition-all flex items-center justify-between px-3 ${
                    captionPosition === "bottom"
                      ? "border-sky-400 bg-sky-500/15 py-1"
                      : "border-white/20 py-0.5"
                  }`}
                  style={{ top: "84.6%" }}
                >
                  <span className="mono text-[8px] font-extrabold uppercase tracking-wider text-sky-300 bg-black/85 px-1.5 py-0.5 rounded shadow">
                    Bottom Lower-Third (Default)
                  </span>
                  <span className="mono text-[8px] text-white/60">84.6%</span>
                </div>
              </div>
            )}
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

        {/* Minimal Playback Controls (Upon the Preview) */}
        {!isDownloading && (
          <div className="absolute bottom-3 inset-x-3 z-40 bg-black/80 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 flex items-center justify-between text-white shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-1.5">
              {/* 1. Play / Pause Button */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-7 h-7 rounded-full text-white grid place-items-center transition active:scale-95 cursor-pointer shadow-md hover:brightness-110"
                style={{ backgroundColor: palette.accent || "#FF5520" }}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
              </button>

              {/* 2. Replay Button */}
              <button
                type="button"
                onClick={handleRestart}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition active:scale-95 cursor-pointer"
                title="Replay from start"
              >
                <RotateCcw size={11} />
              </button>

              {/* 3. Sound Button */}
              <button
                type="button"
                onClick={toggleMute}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition active:scale-95 cursor-pointer"
                title={isMuted ? "Unmute sound" : "Mute sound"}
              >
                {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>

              {/* Time display */}
              <span className="mono text-[9px] font-bold text-white/80 ml-0.5 select-none">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>

            {/* 4. Controls: CC Studio & Downloads */}
            <div className="flex items-center gap-1">
              {/* CC Subtitles Studio Button */}
              <button
                type="button"
                onClick={() => setShowCCStudio(!showCCStudio)}
                className={`px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm ${
                  showCCStudio
                    ? "bg-amber-400 text-black font-extrabold shadow-amber-500/20"
                    : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                title="CC Subtitles: Change Style, Size & Position"
              >
                <MessageSquare size={10} className={showCCStudio ? "text-black" : "text-amber-400"} />
                <span>CC</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMp3}
                disabled={isDownloadingMp3}
                className="px-2.5 py-1 rounded-full bg-emerald-500/80 hover:bg-emerald-500 disabled:opacity-50 text-white text-[9px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                title="Download Audio Only (MP3)"
              >
                {isDownloadingMp3 ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Volume2 size={10} />
                )}
                <span>{isDownloadingMp3 ? "..." : "MP3"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMp4}
                disabled={isDownloading}
                className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-[9px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                title="Download Video (MP4)"
              >
                {isDownloading ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Download size={10} />
                )}
                <span>{isDownloading ? `${downloadProgress}%` : "MP4"}</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            CC SUBTITLES STUDIO OVERLAY (Opens when clicking CC)
           ===================================================================== */}
        {showCCStudio && (
          <div className="absolute inset-0 z-50 bg-[#0C0E14]/95 backdrop-blur-md p-3.5 flex flex-col justify-between text-white animate-fade-in overflow-y-auto scrollbar-thin select-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/15 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400 text-black grid place-items-center font-black text-[11px]">
                  CC
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <span>Subtitle Studio</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-mono">
                      {CAPTION_STYLES[captionStyleId]?.label}
                    </span>
                  </div>
                  <div className="text-[9px] text-white/50">
                    Style, scale, and move captions in real-time
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCCStudio(false)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center cursor-pointer transition"
              >
                <X size={12} />
              </button>
            </div>

            {/* Content Section: 1. Position & 2. Size Stepper */}
            <div className="flex flex-col gap-2.5 py-2">
              {/* Position Row */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-sky-400 tracking-wider">
                    Position
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCaptionYPercent((prev) => Math.max(12, +(prev - 3).toFixed(1)))}
                      className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-mono flex items-center gap-0.5 cursor-pointer"
                      title="Nudge Up"
                    >
                      <ArrowUp size={10} /> Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionYPercent((prev) => Math.min(88, +(prev + 3).toFixed(1)))}
                      className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-mono flex items-center gap-0.5 cursor-pointer"
                      title="Nudge Down"
                    >
                      <ArrowDown size={10} /> Down
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ["top", "Top", 14.5],
                      ["center", "Center", 50.0],
                      ["bottom", "Bottom", 84.6],
                    ] as const
                  ).map(([pos, label, yPct]) => {
                    const isSel = captionPosition === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          setCaptionPosition(pos);
                          setCaptionYPercent(yPct);
                          setCaptionYOffset(0);
                        }}
                        className={`py-1 rounded-lg text-[9px] font-bold transition cursor-pointer border ${
                          isSel
                            ? "bg-sky-500 text-black border-sky-400 font-extrabold shadow-md"
                            : "bg-white/5 text-white/70 hover:bg-white/15 border-transparent"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Row (NO slider - Easy Steppers & Chips) */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                    Size
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCaptionSizeScale((s) => Math.max(0.7, +(s - 0.1).toFixed(1)))}
                      className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white grid place-items-center cursor-pointer active:scale-95"
                      title="Smaller"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="mono text-[10px] font-bold text-amber-300 min-w-[38px] text-center">
                      {Math.round(captionSizeScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setCaptionSizeScale((s) => Math.min(1.8, +(s + 0.1).toFixed(1)))}
                      className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white grid place-items-center cursor-pointer active:scale-95"
                      title="Bigger"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: "S (80%)", scale: 0.8 },
                    { label: "M (100%)", scale: 1.0 },
                    { label: "L (125%)", scale: 1.25 },
                    { label: "XL (150%)", scale: 1.5 },
                  ].map((preset) => {
                    const isSel = Math.abs(captionSizeScale - preset.scale) < 0.05;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCaptionSizeScale(preset.scale)}
                        className={`py-1 rounded-lg text-[9px] font-bold transition cursor-pointer border ${
                          isSel
                            ? "bg-amber-400 text-black border-amber-300 font-extrabold shadow-md"
                            : "bg-white/5 text-white/70 hover:bg-white/15 border-transparent"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtitle Style Picker (10 Presets from Bundle) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-white/60 tracking-wider">
                  Select Subtitle Style (10 Presets)
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-0.5 scrollbar-thin">
                  {CAPTION_STYLE_LIST.map((style) => {
                    const isSel = captionStyleId === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => setCaptionStyleId(style.id)}
                        className={`p-1.5 rounded-xl border transition cursor-pointer text-left flex flex-col justify-between gap-0.5 ${
                          isSel
                            ? "bg-amber-400/20 border-amber-400 ring-1 ring-amber-400 shadow-md"
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold ${isSel ? "text-amber-300 font-black" : "text-white"}`}>
                            {style.label}
                          </span>
                          {isSel && <Check size={10} className="text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[8px] text-white/60 line-clamp-1 leading-tight">
                          {style.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom CC / Transcript Accordion */}
              <div className="border border-white/10 bg-black/40 rounded-xl p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-white/80">
                    Custom Transcript / CC Codes
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTranscriptPasteBox(!showTranscriptPasteBox)}
                    className="text-[9px] text-amber-400 hover:underline cursor-pointer"
                  >
                    {showTranscriptPasteBox ? "Hide" : "Paste Codes"}
                  </button>
                </div>

                {showTranscriptPasteBox && (
                  <div className="flex flex-col gap-1.5 animate-fade-in pt-1">
                    <textarea
                      rows={3}
                      value={customTranscriptInput}
                      onChange={(e) => setCustomTranscriptInput(e.target.value)}
                      placeholder="Paste Whisper JSON, SRT, or plain transcript text here..."
                      className="bg-black/80 border border-white/20 rounded-lg p-1.5 text-[9px] font-mono text-white outline-none focus:border-amber-400 resize-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      {customWords && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWords(null);
                            setCustomTranscriptInput("");
                          }}
                          className="px-2 py-0.5 rounded text-[9px] bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseCustomTranscriptInput(customTranscriptInput, duration);
                          if (parsed.length > 0) {
                            setCustomWords(parsed);
                            setShowTranscriptPasteBox(false);
                          }
                        }}
                        className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 hover:bg-amber-300 text-black cursor-pointer shadow-sm"
                      >
                        Apply Subtitles
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Done button */}
            <div className="border-t border-white/15 pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowCCStudio(false)}
                className="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[11px] shadow-lg cursor-pointer transition active:scale-98"
              >
                Apply & Done
              </button>
            </div>
          </div>
        )}

        {/* Export Progress Overlay */}
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
      </div>

      {/* =====================================================================
          3. EXTERNAL SCENE TIMELINE SCRUBBER (Placed directly below 9:16 screen)
         ===================================================================== */}
      <div className="w-full bg-[#12141C] border border-white/15 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-md text-white">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="mono text-[10px] font-extrabold uppercase text-amber-300 tracking-wider">
              Scene Timeline
            </span>
            <span className="mono text-[9px] text-white/50">
              ({activeSceneIndex + 1}/{activeScenes.length})
            </span>
          </div>
          <span className="mono text-[8px] text-white/40">
            Click scene to seek & edit
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-thin">
          {activeScenes.map((sc, idx) => {
            const isActive = idx === activeSceneIndex;
            const durSec = Math.max(0.5, sc.end - sc.start).toFixed(1);
            return (
              <div
                key={sc.id || idx}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0 transition cursor-pointer border ${
                  isActive
                    ? "bg-white/20 text-white border-white/40 shadow-md ring-1 ring-white/30"
                    : "bg-white/5 text-white/75 hover:bg-white/10 hover:text-white border-transparent"
                }`}
                onClick={() => handleSeekScene(idx)}
              >
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="mono text-[9px] font-black text-amber-400">
                      S{idx + 1}
                    </span>
                    <span className="mono text-[8px] text-white/60">
                      {durSec}s
                    </span>
                  </div>
                  <span className="text-[9px] font-bold truncate max-w-[85px]">
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
                  className="p-1 rounded-md bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-black transition cursor-pointer"
                  title={`Pin & Recreate Scene ${idx + 1}`}
                >
                  <Sparkles size={11} />
                </button>
              </div>
            );
          })}
        </div>
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
