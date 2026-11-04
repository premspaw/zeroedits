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
  GalleryClipItem,
  buildSceneDialoguePlan,
  resolveActivePalette,
  extractWordsFromPlan,
  buildExplainerScenes,
  preloadExplainerBrollImages,
  ensureExplainerFontsLoaded,
  renderExplainerFrameToCanvas,
  exportExactExplainerMp4,
  inferIconKey,
  inferStoryVisualArchetype,
} from "@/lib/pipeline-b/explainer-canvas-renderer";
import { CaptionStyleId, CAPTION_STYLES, CAPTION_STYLE_LIST } from "@/lib/captions/styles";
import CaptionLayerOverlay from "@/components/CaptionLayerOverlay";
import SparkLiveRunner from "@/components/SparkLiveRunner";

export type {
  ExplainerLayoutMode,
  PaletteId,
  VisualPalette,
  WordItem,
  SpokenStepBeat,
  SpokenContrastPlan,
  FaceSpaceCallout,
  SceneSegment,
  GalleryClipItem,
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

/** Visual Typography Previews for all 10 Caption Styles */
const STYLE_VISUAL_PREVIEWS: Record<
  CaptionStyleId,
  {
    tagline: string;
    renderText: () => React.ReactNode;
  }
> = {
  hormozi: {
    tagline: "Bold Montserrat 900 · Kinetic Pop",
    renderText: () => (
      <div className="flex items-center gap-1 font-black uppercase tracking-tight text-[11px]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <span className="text-white drop-shadow-[0_1.5px_2px_#000]">SCALE</span>
        <span className="text-[#FFE814] bg-black/70 px-1 py-0.5 rounded drop-shadow-[0_1.5px_2px_#000]">VIRAL</span>
        <span className="text-[#00FF66] drop-shadow-[0_1.5px_2px_#000]">HOOK</span>
      </div>
    ),
  },
  beast: {
    tagline: "Heavy 3D Pop · MrBeast Energy",
    renderText: () => (
      <div className="flex items-center gap-1 font-black uppercase text-[11px] tracking-wide" style={{ fontFamily: "'Anton', 'Luckiest Guy', sans-serif" }}>
        <span className="text-[#FFE600] drop-shadow-[0_2px_0px_#000]">100%</span>
        <span className="text-white drop-shadow-[0_2px_0px_#000]">INSANE</span>
        <span className="text-[#FFE600] drop-shadow-[0_2px_0px_#000]">REEL</span>
      </div>
    ),
  },
  pinterest: {
    tagline: "DM Serif Display · Editorial Grace",
    renderText: () => (
      <div className="flex items-center gap-1 font-serif italic text-[11.5px] tracking-normal" style={{ fontFamily: "'DM Serif Display', serif" }}>
        <span className="text-[#FFF9F0]">modern</span>
        <span className="text-[#E6C687] font-semibold underline decoration-[#E6C687]/50">aesthetic</span>
        <span className="text-[#FFF9F0]/80">story</span>
      </div>
    ),
  },
  pill: {
    tagline: "Frosted Pill · Active Word Glow",
    renderText: () => (
      <div className="px-2 py-0.5 rounded-full bg-black/80 border border-white/30 backdrop-blur-sm flex items-center gap-1 text-[10px] font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <span className="text-white/80">SMART</span>
        <span className="text-[#FFE814] font-extrabold bg-[#FF4A1C]/80 px-1 rounded">ACTIVE</span>
        <span className="text-white/80">PILL</span>
      </div>
    ),
  },
  neon: {
    tagline: "Electric Cyan Glow · High Voltage",
    renderText: () => (
      <div className="flex items-center gap-1 uppercase tracking-wider text-[11px] font-extrabold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        <span className="text-white drop-shadow-[0_0_8px_#00F0FF]">FUTURE</span>
        <span className="text-[#00F0FF] drop-shadow-[0_0_10px_#00F0FF]">CYBER</span>
        <span className="text-white drop-shadow-[0_0_8px_#00F0FF]">GLOW</span>
      </div>
    ),
  },
  cinzel: {
    tagline: "Roman Serif · Luxury Metallic Gold",
    renderText: () => (
      <div className="flex items-center gap-1.5 uppercase tracking-[0.16em] text-[10px] font-serif font-bold" style={{ fontFamily: "'Cinzel', serif" }}>
        <span className="text-[#FAF5E8]/80">LEGACY</span>
        <span className="text-[#E5C378] font-extrabold drop-shadow-[0_1px_3px_rgba(229,195,120,0.5)]">EMPIRE</span>
      </div>
    ),
  },
  editorial: {
    tagline: "Bodoni Moda · High Fashion Noir",
    renderText: () => (
      <div className="flex items-center gap-1 font-serif italic text-[11.5px]" style={{ fontFamily: "'Bodoni Moda', serif" }}>
        <span className="text-white">The</span>
        <span className="text-[#E5A88B] font-bold">Refined</span>
        <span className="text-white/80">Cut</span>
      </div>
    ),
  },
  trailer: {
    tagline: "Impact Block Caps · Cinematic Trailer",
    renderText: () => (
      <div className="flex items-center gap-1 uppercase tracking-[0.15em] text-[10.5px] font-black" style={{ fontFamily: "'Anton', sans-serif" }}>
        <span className="text-white">DON&apos;T</span>
        <span className="text-[#FF2D20] drop-shadow-[0_0_6px_#FF2D20]">BLINK</span>
        <span className="text-white">NOW</span>
      </div>
    ),
  },
  clean: {
    tagline: "Modern Inter · Clean Subtitles",
    renderText: () => (
      <div className="flex items-center gap-1 text-[10.5px] font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
        <span className="text-white/80">Clean</span>
        <span className="text-white font-extrabold underline decoration-white/40">dialogue</span>
        <span className="text-white/80">flow</span>
      </div>
    ),
  },
  whisper: {
    tagline: "Jost Tracking · Subtle Minimalist",
    renderText: () => (
      <div className="flex items-center gap-1 uppercase text-[9.5px] font-light tracking-[0.22em]" style={{ fontFamily: "'Jost', sans-serif" }}>
        <span className="text-white/60">QUIET</span>
        <span className="text-white font-medium">WHISPER</span>
      </div>
    ),
  },
};

interface TalkingHeadExplainerStageProps {
  cleanVideoUrl?: string;
  finalVideoUrl?: string;
  runId?: string;
  editPlan?: any;
  sparkCode?: string;
  beats?: any[];
  topic?: string;
  compact?: boolean;
  previewCropRatio?: "9:16" | "16:9";
  galleryClips?: GalleryClipItem[];
  onExportMP4?: () => void;
  onRecreateScene?: (sceneIndex: number, instruction: string, visualStyle?: string, customStart?: number, customEnd?: number) => Promise<any> | any;
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
  sparkCode = "",
  beats = [],
  topic = "",
  compact = false,
  previewCropRatio = "9:16",
  galleryClips = [],
  onExportMP4,
  onRecreateScene,
}: TalkingHeadExplainerStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const brollImagesRef = useRef<Record<string, HTMLImageElement | HTMLVideoElement>>({});

  const isCutoutTemplate =
    editPlan?.templateId === "cutout" || editPlan?.templateId === "samCutoutExplainer";

  const [layoutMode, setLayoutMode] = useState<ExplainerLayoutMode>(
    isCutoutTemplate ? "cutout_reel" : "auto_reel"
  );

  useEffect(() => {
    if (isCutoutTemplate) {
      setLayoutMode("cutout_reel");
    } else {
      setLayoutMode("auto_reel");
    }
  }, [editPlan?.templateId, isCutoutTemplate]);
  const [showZaiInstructions, setShowZaiInstructions] = useState(false);
  const [paletteChoice, setPaletteChoice] = useState<PaletteId>("auto");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(editPlan?.cleanDuration || 15);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingMp3, setIsDownloadingMp3] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadModal, setDownloadModal] = useState<{
    isOpen: boolean;
    status: "rendering" | "downloading" | "ready" | "error";
    progress: number;
    stepMessage: string;
    blobUrl?: string;
    directUrl?: string;
    filename: string;
    error?: string;
  } | null>(null);

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
  const [recreatingSceneIdx, setRecreatingSceneIdx] = useState<number | null>(null);

  // Cutout Positioning & Scale State (25% bigger base, corner default, interactive hold-to-move)
  const [cutoutSide, setCutoutSide] = useState<"left" | "right">("left");
  const [isCustomCutoutPos, setIsCustomCutoutPos] = useState<boolean>(false);
  const [cutoutXPercent, setCutoutXPercent] = useState<number>(5.7);
  const [cutoutYPercent, setCutoutYPercent] = useState<number>(86.6);
  const [cutoutScale, setCutoutScale] = useState<number>(1.0);
  const [isDraggingCutout, setIsDraggingCutout] = useState<boolean>(false);
  const cutoutDragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Inline Callout Editor Popover
  const [editingCallout, setEditingCallout] = useState<{
    sceneIdx: number;
    calloutId: string;
    title: string;
    subtitle: string;
  } | null>(null);

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

  const serverFinalUrl = runId ? `/api/pipeline-b/media/${runId}/final` : finalVideoUrl;
  const normalizedCleanUrl = cleanVideoUrl
    ? cleanVideoUrl.replace(/\/final(\?.*)?$/, "/clean$1")
    : undefined;
  const serverCleanUrl =
    normalizedCleanUrl || (runId ? `/api/pipeline-b/media/${runId}/clean` : undefined);

  // Always use the clean cut video as the source for the unified template + live CC canvas stage
  const activeVideoSrc = serverCleanUrl || serverFinalUrl || finalVideoUrl;

  // 1. Extract word-by-word timestamps
  const words: WordItem[] = useMemo(() => {
    return extractWordsFromPlan(editPlan, beats);
  }, [editPlan, beats]);

  const effectiveWords = useMemo(() => {
    return customWords && customWords.length > 0 ? customWords : words;
  }, [customWords, words]);

  // 2. Build Base Dialogue-Synced Story Explainer Timeline (with Personal Gallery B-Roll matching)
  const initialScenes: SceneSegment[] = useMemo(() => {
    return buildExplainerScenes(duration, editPlan, effectiveWords, beats, topic, galleryClips);
  }, [duration, editPlan, effectiveWords, beats, topic, galleryClips]);

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
  const activeVisualSegment = (editPlan?.visualSegments || []).find(
    (segment: any, index: number) => currentTime >= Number(segment.start || 0) &&
      (index === (editPlan?.visualSegments?.length || 0) - 1
        ? currentTime <= Number(segment.end || 0) + 0.05
        : currentTime < Number(segment.end || 0))
  );
  const activeCameraZoom = (() => {
    const pacing = Array.isArray(activeVisualSegment?.cameraPacing)
      ? activeVisualSegment.cameraPacing
      : [];
    const localTime = Math.max(0, currentTime - Number(activeVisualSegment?.start || 0));
    let zoom = Number(activeVisualSegment?.cameraZoom) || 1;
    for (const beat of pacing) {
      if (Number(beat.time) > localTime) break;
      if (Number.isFinite(Number(beat.zoom))) zoom = Number(beat.zoom);
    }
    return Math.min(1.28, Math.max(1, zoom));
  })();
  const activeSceneSparkCode = typeof activeVisualSegment?.sparkCode === "string"
    ? activeVisualSegment.sparkCode
    : "";
  const activeSparkCode = activeSceneSparkCode || sparkCode;
  const activeSparkStart = activeSceneSparkCode ? Number(activeVisualSegment?.start || 0) : 0;
  const activeSparkDuration = activeSceneSparkCode
    ? Math.max(0.5, Number(activeVisualSegment?.end || 0) - activeSparkStart)
    : duration;

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

  // Base cutout size is 450x575 (25% bigger than previous 360x460 base)
  const baseCutW = 450;
  const baseCutH = 575;
  const effectiveCutW = Math.round(baseCutW * cutoutScale);
  const effectiveCutH = Math.round(baseCutH * cutoutScale);

  const { computedCutX, computedCutY } = useMemo(() => {
    let cutX = 36;
    let cutY = 1920 - effectiveCutH - 180;

    if (isCustomCutoutPos) {
      cutX = Math.round((cutoutXPercent / 100) * (1080 - effectiveCutW));
      cutY = Math.round((cutoutYPercent / 100) * (1920 - effectiveCutH));
    } else if (cutoutSide === "right") {
      cutX = 1080 - effectiveCutW - 36;
      cutY = 1920 - effectiveCutH - 180;
    } else {
      cutX = 36;
      cutY = 1920 - effectiveCutH - 180;
    }

    cutX = Math.max(16, Math.min(1080 - effectiveCutW - 16, cutX));
    cutY = Math.max(80, Math.min(1920 - effectiveCutH - 40, cutY));

    return { computedCutX: cutX, computedCutY: cutY };
  }, [isCustomCutoutPos, cutoutSide, cutoutXPercent, cutoutYPercent, effectiveCutW, effectiveCutH]);

  const hotspotLeftPct = (computedCutX / 1080) * 100;
  const hotspotTopPct = (computedCutY / 1920) * 100;
  const hotspotWidthPct = (effectiveCutW / 1080) * 100;
  const hotspotHeightPct = (effectiveCutH / 1920) * 100;

  const handleCutoutPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasDraggedRef.current = false;
    cutoutDragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: computedCutX,
      startY: computedCutY,
    };
    setIsDraggingCutout(true);
    setIsCustomCutoutPos(true);
  };

  // Interactive Cutout Dragging (hold-to-move anywhere in preview player)
  useEffect(() => {
    if (!isDraggingCutout) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !cutoutDragStartRef.current) return;
      hasDraggedRef.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = 1080 / rect.width;
      const scaleY = 1920 / rect.height;

      const dx = (e.clientX - cutoutDragStartRef.current.clientX) * scaleX;
      const dy = (e.clientY - cutoutDragStartRef.current.clientY) * scaleY;

      let newX = cutoutDragStartRef.current.startX + dx;
      let newY = cutoutDragStartRef.current.startY + dy;

      const maxMoveX = 1080 - effectiveCutW;
      const maxMoveY = 1920 - effectiveCutH;

      // Magnetic Snapping to Corners
      if (newX < 90 && newY > maxMoveY - 260) {
        newX = 36;
        newY = 1920 - effectiveCutH - 180;
        setCutoutSide("left");
        setIsCustomCutoutPos(false);
      } else if (newX > maxMoveX - 90 && newY > maxMoveY - 260) {
        newX = 1080 - effectiveCutW - 36;
        newY = 1920 - effectiveCutH - 180;
        setCutoutSide("right");
        setIsCustomCutoutPos(false);
      } else {
        setIsCustomCutoutPos(true);
      }

      newX = Math.max(16, Math.min(maxMoveX - 16, newX));
      newY = Math.max(80, Math.min(maxMoveY - 40, newY));

      const pctX = maxMoveX > 0 ? (newX / maxMoveX) * 100 : 0;
      const pctY = maxMoveY > 0 ? (newY / maxMoveY) * 100 : 0;

      setCutoutXPercent(pctX);
      setCutoutYPercent(pctY);
    };

    const handlePointerUp = () => {
      setIsDraggingCutout(false);
      cutoutDragStartRef.current = null;
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
  }, [isDraggingCutout, effectiveCutW, effectiveCutH]);

  const drawSingleFrame = useCallback(
    (overrideTime?: number) => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const t =
        typeof overrideTime === "number"
          ? overrideTime
          : v && !v.paused
          ? v.currentTime
          : currentTimeRef.current;
      currentTimeRef.current = t;
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
        hideCaptions: true,
        hideStoryVisuals: sparkCode.trim().length > 30,
        hiddenCalloutIds,
        cutoutPosition: isCustomCutoutPos
          ? { xPercent: cutoutXPercent, yPercent: cutoutYPercent }
          : cutoutSide === "right"
          ? "bottom-right"
          : "bottom-left",
        cutoutScale,
      });
    },
    [
      activeScenes,
      effectiveWords,
      duration,
      palette,
      sparkCode,
      layoutMode,
      captionPosition,
      captionYOffset,
      captionYPercent,
      captionStyleId,
      captionSizeScale,
      hiddenCalloutIds,
      isCustomCutoutPos,
      cutoutXPercent,
      cutoutYPercent,
      cutoutSide,
      cutoutScale,
    ]
  );

  // Redraw immediately when paused and any visual setting changes
  useEffect(() => {
    if (!isPlaying) {
      drawSingleFrame();
    }
  }, [isPlaying, currentTime, drawSingleFrame]);

  // Continuous 60fps RAF loop ONLY while video is playing or user is actively dragging
  useEffect(() => {
    if (!isPlaying && !isDraggingCaptions && !isDraggingCutout) {
      drawSingleFrame();
      return;
    }

    let rafId: number;
    const renderLoop = () => {
      const v = videoRef.current;
      const t = v && !v.paused ? v.currentTime : currentTimeRef.current;
      currentTimeRef.current = t;

      if (v && !v.paused) {
        const now = performance.now();
        if (now - lastUiScrubUpdateRef.current > 33) {
          lastUiScrubUpdateRef.current = now;
          setCurrentTime(t);
        }
      }

      drawSingleFrame(t);
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [
    isPlaying,
    isDraggingCaptions,
    isDraggingCutout,
    drawSingleFrame,
  ]);

  const togglePlay = useCallback(() => {
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
  }, []);

  const handleRestart = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    currentTimeRef.current = 0;
    setCurrentTime(0);
    v.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  // Handle external seek & playback events from parent header buttons
  useEffect(() => {
    const handleSeek = (e: Event) => {
      const custom = e as CustomEvent<{ time: number }>;
      if (custom.detail && typeof custom.detail.time === "number" && videoRef.current) {
        videoRef.current.currentTime = custom.detail.time;
        currentTimeRef.current = custom.detail.time;
        setCurrentTime(custom.detail.time);
        drawSingleFrame(custom.detail.time);
      }
    };
    const handleExtTogglePlay = () => togglePlay();
    const handleExtRestart = () => handleRestart();
    window.addEventListener("seek-pipeline-b", handleSeek);
    window.addEventListener("toggle-play-pipeline-b", handleExtTogglePlay);
    window.addEventListener("restart-pipeline-b", handleExtRestart);
    return () => {
      window.removeEventListener("seek-pipeline-b", handleSeek);
      window.removeEventListener("toggle-play-pipeline-b", handleExtTogglePlay);
      window.removeEventListener("restart-pipeline-b", handleExtRestart);
    };
  }, [drawSingleFrame, togglePlay, handleRestart]);

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

  // Exact 1080×1920 Frame-by-Frame MP4 Exporter (100% Shared Canvas Parity)
  const handleDownloadMp4 = useCallback(async () => {
    if (sparkCode.trim().length > 30 && onExportMP4) {
      onExportMP4();
      return;
    }
    if (!activeVideoSrc || isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(2);
    setExportError(null);

    const cleanName = (topic || "Zee_Story_Explainer")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 36)
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    const filename = `${cleanName || "Zee_Reel"}_1080x1920.mp4`;
    const serverDirectUrl = runId ? `/api/pipeline-b/media/${runId}/final?download=1` : null;

    setDownloadModal({
      isOpen: true,
      status: "rendering",
      progress: 4,
      stepMessage: "Rendering your exact template & CC subtitles (1080×1920)...",
      directUrl: serverDirectUrl || undefined,
      filename,
    });

    try {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      let mp4Blob: Blob | null = null;
      try {
        mp4Blob = await exportExactExplainerMp4({
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
          cutoutPosition: isCustomCutoutPos
            ? { xPercent: cutoutXPercent, yPercent: cutoutYPercent }
            : (cutoutSide === "right" ? "bottom-right" : "bottom-left"),
          cutoutScale,
          onProgress: (pct) => {
            setDownloadProgress(pct);
            setDownloadModal((prev) =>
              prev
                ? {
                    ...prev,
                    progress: pct,
                    stepMessage:
                      pct < 85
                        ? `Rendering frames (${pct}%)...`
                        : pct < 95
                        ? "Muxing synced audio & encoding H.264..."
                        : "Finalizing video download...",
                  }
                : null
            );
          },
        });
      } catch (renderErr) {
        // Never fall back to the server FFmpeg render: it is a different video than the preview.
        console.warn("[Export] Canvas rendering failed:", renderErr);
        throw renderErr;
      }

      const blobUrl = URL.createObjectURL(mp4Blob);

      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {}

      // Keep downloadModal OPEN so user can clearly see and click to save!
      setDownloadModal({
        isOpen: true,
        status: "ready",
        progress: 100,
        stepMessage: "Your 1080×1920 reel is ready!",
        blobUrl,
        directUrl: blobUrl,
        filename,
      });
    } catch (err: any) {
      console.error("Exact MP4 export error:", err);
      setExportError(err?.message || "Failed to render exact MP4 reel.");
      setDownloadModal({
        isOpen: true,
        status: "error",
        progress: 0,
        stepMessage: "Export failed",
        filename,
        error: err?.message || "Could not generate MP4 file.",
      });
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
    isCustomCutoutPos,
    cutoutSide,
    cutoutXPercent,
    cutoutYPercent,
    cutoutScale,
    topic,
    isDownloading,
    sparkCode,
    onExportMP4,
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

      {/* Cutout Corner & Size Placement Controls (Only shown when Cutout template was explicitly selected) */}
      {isCutoutTemplate && layoutMode === "cutout_reel" && (
        <div className="w-full bg-[#12141C] border border-amber-400/30 rounded-2xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-lg animate-fade-in text-white">
          <div className="flex items-center gap-1.5">
            <span className="mono text-[9px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              Cutout:
            </span>
            <div className="inline-flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCustomCutoutPos(false);
                  setCutoutSide("left");
                }}
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  !isCustomCutoutPos && cutoutSide === "left"
                    ? "bg-amber-400 text-black font-extrabold shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
                title="Place character in bottom-left corner"
              >
                <span>Left Corner</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCustomCutoutPos(false);
                  setCutoutSide("right");
                }}
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  !isCustomCutoutPos && cutoutSide === "right"
                    ? "bg-amber-400 text-black font-extrabold shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
                title="Place character in bottom-right corner"
              >
                <span>Right Corner</span>
              </button>
            </div>
          </div>

          {/* Size Controls (+25% bigger default base) */}
          <div className="flex items-center gap-1.5">
            <span className="mono text-[8px] font-bold text-white/60 uppercase">Scale:</span>
            <div className="inline-flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCutoutScale((s) => Math.max(0.7, Number((s - 0.1).toFixed(2))));
                }}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/20 text-white cursor-pointer"
                title="Make cutout smaller"
              >
                <Minus size={10} />
              </button>
              <span className="mono text-[9px] font-extrabold text-amber-300 px-1 min-w-[34px] text-center">
                {(cutoutScale * 1.25).toFixed(2).replace(/\.?0+$/, "")}x
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCutoutScale((s) => Math.min(1.6, Number((s + 0.1).toFixed(2))));
                }}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/20 text-white cursor-pointer"
                title="Make cutout bigger"
              >
                <Plus size={10} />
              </button>
            </div>

            {isCustomCutoutPos && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCustomCutoutPos(false);
                  setCutoutSide("left");
                }}
                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[8px] font-bold flex items-center gap-1 cursor-pointer transition"
                title="Reset cutout position to bottom-left corner"
              >
                <RotateCcw size={9} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          PURE CLEAN 9:16 PREVIEW SCREEN (Unobstructed Canvas Video View)
         ===================================================================== */}
      <div
        ref={containerRef}
        className={`aspect-[9/16] w-full rounded-[22px] border-2 border-[#1E2028] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.6)] overflow-hidden relative bg-[#0B0C10] select-none flex flex-col items-center justify-center ${
          isDraggingCaptions || isDraggingCutout ? "cursor-grabbing" : ""
        }`}
      >
        {/* Hardware Audio & Video Decoder / Final Reel Player */}
        <video
          ref={videoRef}
          src={activeVideoSrc}
          preload="auto"
          playsInline
          muted={isMuted}
          onClick={() => {
            if (!isEditMode && !showCCStudio) togglePlay();
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => {
            currentTimeRef.current = e.currentTarget.currentTime;
          }}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
            drawSingleFrame(e.currentTarget.currentTime);
          }}
          onLoadedData={(e) => {
            drawSingleFrame(e.currentTarget.currentTime);
          }}
          onCanPlay={(e) => {
            drawSingleFrame(e.currentTarget.currentTime);
          }}
          onSeeked={(e) => {
            drawSingleFrame(e.currentTarget.currentTime);
          }}
          onEnded={() => setIsPlaying(false)}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-0 ${
            activeSparkCode.trim().length > 30 ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `scale(${activeCameraZoom})`, transformOrigin: "center center", clipPath: previewCropRatio === "16:9" ? "inset(34.18% 0 34.18% 0)" : undefined }}
        />

        {/* 100% Unified Template Canvas Preview */}
        <div style={previewCropRatio === "16:9" ? { clipPath: "inset(34.18% 0 34.18% 0)" } : undefined} className={`absolute inset-0 z-10 overflow-hidden bg-[#0B0C10] flex items-center justify-center ${
          activeSparkCode.trim().length > 30 ? "invisible" : "visible"
        }`}>
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

        {activeSparkCode.trim().length > 30 && (
          <SparkLiveRunner
            code={activeSparkCode}
            duration={activeSparkDuration}
            playbackTime={Math.max(0, currentTime - activeSparkStart)}
            playbackIsPlaying={isPlaying}
            transparent
            previewCropRatio={previewCropRatio}
            theme={{ bg: "transparent", ink: "#FFFFFF" }}
            topic={activeVisualSegment?.spokenReference || topic}
            showControls={false}
            className="pointer-events-none absolute inset-0 z-20 !h-full !w-full !aspect-auto !rounded-none !border-0 !shadow-none"
            onError={(message) => setExportError(`Spark overlay: ${message}`)}
          />
        )}

        {/* Real-time Kinetic Typography & Multi-Style Caption Layer */}
        {!hideCaptions && (
          <div className="absolute inset-0 z-30 pointer-events-none" style={previewCropRatio === "16:9" ? { clipPath: "inset(34.18% 0 34.18% 0)" } : undefined}>
            <CaptionLayerOverlay
            words={effectiveWords}
            currentTime={currentTime}
            styleId={captionStyleId}
            sizeScale={captionSizeScale}
            captionYPercent={captionYPercent}
            hideCaptions={hideCaptions}
            />
          </div>
        )}

        {previewCropRatio === "16:9" && (
          <div className="absolute inset-x-0 top-[34.18%] bottom-[34.18%] z-[35] border-y border-white/30 pointer-events-none" aria-hidden="true" />
        )}

        {/* On-Video Subtitle Drag Hotspot (Shown when CC Studio or Edit Mode is open) */}
        {!hideCaptions && (showCCStudio || isEditMode || isDraggingCaptions) && (
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              hasDraggedRef.current = false;
              setIsDraggingCaptions(true);
            }}
            className="pointer-events-auto absolute left-6 right-6 z-25 flex items-center justify-center select-none opacity-85 hover:opacity-100 transition-opacity"
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

        {/* On-Video Interactive Cutout Drag Hotspot (Only active when Cutout template was selected) */}
        {isCutoutTemplate && layoutMode === "cutout_reel" && (
          <div
            onPointerDown={handleCutoutPointerDown}
            className={`pointer-events-auto absolute z-26 select-none cursor-grab active:cursor-grabbing rounded-3xl transition-colors duration-75 flex flex-col items-center justify-between p-2 border-2 ${
              isDraggingCutout
                ? "border-amber-400 bg-amber-400/20 shadow-[0_0_30px_rgba(251,191,36,0.6)] ring-2 ring-amber-300"
                : "border-amber-400/0 hover:border-amber-400/60 hover:bg-amber-400/10 group"
            }`}
            style={{
              left: `${hotspotLeftPct}%`,
              top: `${hotspotTopPct}%`,
              width: `${hotspotWidthPct}%`,
              height: `${hotspotHeightPct}%`,
            }}
            title="Click and hold to drag character anywhere on screen"
          >
            {/* Floating Handle Pill */}
            <div
              className={`px-2 py-0.5 rounded-full bg-black/90 text-amber-300 border border-amber-400/60 text-[9px] font-mono font-bold flex items-center gap-1 shadow-lg transition-opacity ${
                isDraggingCutout
                  ? "opacity-100 scale-105"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <GripVertical size={11} className="text-amber-400" />
              <span>
                {isDraggingCutout
                  ? `Cutout: ${hotspotLeftPct.toFixed(0)}%, ${hotspotTopPct.toFixed(0)}%`
                  : "Hold to Move Cutout"}
              </span>
            </div>

            {/* Corner guide indicators on active drag */}
            {isDraggingCutout && (
              <div className="w-full flex justify-between items-end px-1 pb-1">
                <span className="mono text-[8px] font-bold text-amber-300 bg-black/85 px-1.5 py-0.5 rounded">
                  {!isCustomCutoutPos && cutoutSide === "left"
                    ? "LEFT CORNER"
                    : !isCustomCutoutPos && cutoutSide === "right"
                    ? "RIGHT CORNER"
                    : "CUSTOM"}
                </span>
                <span className="mono text-[8px] text-white/80 bg-black/85 px-1.5 py-0.5 rounded">
                  {(cutoutScale * 1.25).toFixed(1)}x
                </span>
              </div>
            )}
          </div>
        )}

        {/* Magnetic Corner Snap Guides during Cutout Drag */}
        {isDraggingCutout && (
          <div className="absolute inset-0 pointer-events-none z-24">
            {/* Left Corner Target */}
            <div
              className={`absolute rounded-3xl border-2 border-dashed transition-all duration-150 flex items-center justify-center ${
                cutoutSide === "left" && !isCustomCutoutPos
                  ? "border-amber-400 bg-amber-400/20 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.5)]"
                  : "border-white/20 bg-white/5 opacity-50"
              }`}
              style={{
                left: "3.33%",
                bottom: "9.37%",
                width: `${hotspotWidthPct}%`,
                height: `${hotspotHeightPct}%`,
              }}
            >
              <span className="mono text-[8px] font-extrabold uppercase tracking-wider text-amber-300 bg-black/85 px-2 py-0.5 rounded shadow">
                Left Corner
              </span>
            </div>

            {/* Right Corner Target */}
            <div
              className={`absolute rounded-3xl border-2 border-dashed transition-all duration-150 flex items-center justify-center ${
                cutoutSide === "right" && !isCustomCutoutPos
                  ? "border-amber-400 bg-amber-400/20 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.5)]"
                  : "border-white/20 bg-white/5 opacity-50"
              }`}
              style={{
                right: "3.33%",
                bottom: "9.37%",
                width: `${hotspotWidthPct}%`,
                height: `${hotspotHeightPct}%`,
              }}
            >
              <span className="mono text-[8px] font-extrabold uppercase tracking-wider text-amber-300 bg-black/85 px-2 py-0.5 rounded shadow">
                Right Corner
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

        {/* Export Progress & Download Success/Error Modal */}
        {downloadModal?.isOpen && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white select-none animate-fade-in">
            {downloadModal.status === "rendering" || downloadModal.status === "downloading" ? (
              <div className="w-full max-w-[280px] flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E4491B] to-[#C93D14] grid place-items-center mb-3 shadow-[0_0_25px_rgba(228,73,27,0.4)]">
                  <Loader2 size={26} className="animate-spin text-white" />
                </div>
                <div className="mono text-[13px] font-black uppercase tracking-wider mb-1 text-white">
                  Rendering 1080×1920 Reel
                </div>
                <p className="text-[11px] text-white/70 mb-3 leading-snug">
                  {downloadModal.stepMessage}
                </p>
                <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden border border-white/20 mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-200 bg-[#E4491B]"
                    style={{ width: `${downloadModal.progress}%` }}
                  />
                </div>
                <div className="mono text-[10px] font-bold text-amber-300">
                  {downloadModal.progress}% complete • 1080×1920
                </div>
                {downloadModal.directUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (downloadModal.directUrl) {
                        window.open(downloadModal.directUrl, "_blank");
                      }
                    }}
                    className="mt-4 text-[10px] text-white/60 hover:text-white underline cursor-pointer"
                  >
                    Skip wait and download master reel directly ↗
                  </button>
                )}
              </div>
            ) : downloadModal.status === "ready" ? (
              <div className="w-full max-w-[300px] flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 grid place-items-center mb-3 shadow-[0_0_25px_rgba(52,211,153,0.3)] text-emerald-400">
                  <CheckCircle2 size={30} />
                </div>
                <div className="mono text-[14px] font-black uppercase tracking-wider mb-1 text-white">
                  Download Ready!
                </div>
                <p className="text-[11px] text-white/70 mb-4 leading-relaxed">
                  Your 1080×1920 reel has started downloading. If it didn&apos;t save automatically, tap below:
                </p>

                {/* Big Prominent Direct Save Button */}
                <a
                  href={downloadModal.blobUrl || downloadModal.directUrl}
                  download={downloadModal.filename}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-[12px] flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer mb-2"
                >
                  <Download size={15} />
                  <span>Save Video (.MP4)</span>
                </a>

                {downloadModal.directUrl && (
                  <a
                    href={downloadModal.directUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer py-1"
                  >
                    <span>Open video in new tab ↗</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setDownloadModal(null)}
                  className="mt-3 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-semibold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[300px] flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 grid place-items-center mb-3 text-rose-400">
                  <AlertCircle size={24} />
                </div>
                <div className="mono text-[12px] font-bold text-rose-300 mb-1">
                  {downloadModal.stepMessage}
                </div>
                <p className="text-[11px] text-white/70 mb-4 leading-snug">
                  {downloadModal.error || "You can download the verified master reel directly below:"}
                </p>
                {downloadModal.directUrl && (
                  <a
                    href={downloadModal.directUrl}
                    download={downloadModal.filename}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[12px] flex items-center justify-center gap-2 shadow-lg transition cursor-pointer mb-2"
                  >
                    <Download size={15} />
                    <span>Download Master Video Directly</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setDownloadModal(null)}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-semibold transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          CC SUBTITLES STUDIO OVERLAY (Docks to Left of Preview on Desktop)
         ===================================================================== */}
      {showCCStudio && (
        <>
          {/* Subtle mobile backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-black/60 lg:hidden"
            onClick={() => setShowCCStudio(false)}
          />

          <div
            className="fixed top-8 bottom-6 right-[412px] w-[370px] max-h-[calc(100vh-56px)] z-[9999] border-2 border-[#2A2E3D] rounded-[24px] shadow-[0_25px_80px_rgba(0,0,0,0.98)] p-4 flex flex-col justify-between text-white animate-fade-in overflow-y-auto scrollbar-thin select-none max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:top-14 max-lg:w-auto max-lg:max-h-[calc(100vh-32px)]"
            style={{ backgroundColor: "#0C0E14" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-black grid place-items-center font-black text-[12px] shadow-sm">
                  CC
                </div>
                <div>
                  <div className="text-[12px] font-bold text-white flex items-center gap-1.5">
                    <span>Subtitle Studio</span>
                    <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold">
                      {CAPTION_STYLES[captionStyleId]?.label}
                    </span>
                  </div>
                  <div className="text-[9px] text-white/50">
                    Live font preview, scaling, positioning & custom codes
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCCStudio(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center cursor-pointer transition active:scale-95"
                title="Close Studio"
              >
                <X size={13} />
              </button>
            </div>

            {/* Content Section: Accent Color, Position, Size Stepper & Style Picker */}
            <div className="flex flex-col gap-3 py-2.5 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
              {/* Theme Color & Visibility Row */}
              <div className="bg-[#151824] border border-[#262C3E] rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Palette size={12} className="text-white/70 shrink-0" />
                  <span className="text-[10px] font-mono font-bold uppercase text-white/80">
                    Accent
                  </span>
                  <div className="flex items-center gap-1.5 ml-1">
                    {(
                      [
                        ["editorial_warm", "#E4491B", "Warm Studio"],
                        ["emerald_gold", "#FFD700", "Emerald Gold"],
                        ["cyber_blue", "#38BDF8", "Cyber Sapphire"],
                        ["titanium_minimal", "#F8FAFC", "Titanium Minimal"],
                        ["emerald_growth", "#10B981", "Emerald Growth"],
                        ["royal_violet", "#A855F7", "Royal Violet"],
                      ] as const
                    ).map(([id, hex, label]) => {
                      const isSel = palette.id === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPaletteChoice(id)}
                          className={`w-4.5 h-4.5 rounded-full transition-all transform cursor-pointer flex items-center justify-center ${
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

                <button
                  type="button"
                  onClick={() => setHideCaptions(!hideCaptions)}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    hideCaptions
                      ? "bg-rose-500/80 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {hideCaptions ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{hideCaptions ? "Hidden" : "Visible"}</span>
                </button>
              </div>

              {/* Position Row */}
              <div className="bg-[#151824] border border-[#262C3E] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-sky-400 tracking-wider">
                    Position ({captionYPercent.toFixed(0)}%)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCaptionYPercent((prev) => Math.max(12, +(prev - 3).toFixed(1)))}
                      className="px-2 py-0.5 rounded bg-[#1E2333] hover:bg-[#282F45] border border-white/10 text-white text-[9px] font-mono flex items-center gap-0.5 cursor-pointer active:scale-95 transition"
                      title="Nudge Up"
                    >
                      <ArrowUp size={10} /> Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionYPercent((prev) => Math.min(88, +(prev + 3).toFixed(1)))}
                      className="px-2 py-0.5 rounded bg-[#1E2333] hover:bg-[#282F45] border border-white/10 text-white text-[9px] font-mono flex items-center gap-0.5 cursor-pointer active:scale-95 transition"
                      title="Nudge Down"
                    >
                      <ArrowDown size={10} /> Down
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
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
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                          isSel
                            ? "bg-sky-500 text-black border-sky-400 font-extrabold shadow-md"
                            : "bg-[#1E2333] text-white/90 hover:bg-[#282F45] border-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Row (NO slider - Easy Steppers & Chips) */}
              <div className="bg-[#151824] border border-[#262C3E] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                    Font Size Scale
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCaptionSizeScale((s) => Math.max(0.7, +(s - 0.1).toFixed(1)))}
                      className="w-7 h-7 rounded-md bg-[#1E2333] hover:bg-[#282F45] border border-white/10 text-white grid place-items-center cursor-pointer active:scale-95 transition"
                      title="Smaller"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="mono text-[11px] font-bold text-amber-300 min-w-[42px] text-center tabular-nums">
                      {Math.round(captionSizeScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setCaptionSizeScale((s) => Math.min(1.8, +(s + 0.1).toFixed(1)))}
                      className="w-7 h-7 rounded-md bg-[#1E2333] hover:bg-[#282F45] border border-white/10 text-white grid place-items-center cursor-pointer active:scale-95 transition"
                      title="Bigger"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
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
                        className={`py-1 rounded-lg text-[9.5px] font-bold transition cursor-pointer border ${
                          isSel
                            ? "bg-amber-400 text-black border-amber-300 font-extrabold shadow-md"
                            : "bg-[#1E2333] text-white/90 hover:bg-[#282F45] border-white/10"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtitle Style Picker (10 Presets with Live Rendered Typography Previews) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-white/80 tracking-wider">
                    Select Caption Style (10 Presets)
                  </span>
                  <span className="text-[9px] text-white/40">Visual font preview</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {CAPTION_STYLE_LIST.map((style) => {
                    const isSel = captionStyleId === style.id;
                    const visual = STYLE_VISUAL_PREVIEWS[style.id];
                    return (
                      <div
                        key={style.id}
                        onClick={() => setCaptionStyleId(style.id)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer text-left flex flex-col justify-between gap-1.5 shadow-sm ${
                          isSel
                            ? "bg-[#1C2234] border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-md"
                            : "bg-[#151824] border-[#262C3E] hover:bg-[#1A1F2E] hover:border-amber-400/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10.5px] font-bold ${isSel ? "text-amber-300 font-black" : "text-white"}`}>
                            {style.label}
                          </span>
                          {isSel ? (
                            <div className="w-4 h-4 rounded-full bg-amber-400 text-black grid place-items-center">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          ) : (
                            <span className="text-[8px] font-mono text-white/30 uppercase">{style.id}</span>
                          )}
                        </div>

                        {/* Rendered live typography preview */}
                        <div className="w-full py-1.5 px-2 rounded-lg bg-[#08090E] border border-white/15 flex items-center justify-center min-h-[34px] overflow-hidden select-none">
                          {visual?.renderText()}
                        </div>

                        <p className="text-[8px] text-white/50 line-clamp-1 leading-tight">
                          {visual?.tagline || style.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom CC / Transcript Accordion */}
              <div className="bg-[#151824] border border-[#262C3E] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-mono font-bold text-white/80">
                    Custom Transcript / CC Codes
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTranscriptPasteBox(!showTranscriptPasteBox)}
                    className="text-[9.5px] text-amber-400 hover:underline cursor-pointer font-bold"
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
                      className="bg-[#08090E] border border-white/20 rounded-lg p-2 text-[9.5px] font-mono text-white outline-none focus:border-amber-400 resize-none"
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
                        className="px-2.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-400 hover:bg-amber-300 text-black cursor-pointer shadow-sm transition active:scale-95"
                      >
                        Apply Subtitles
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Done button */}
            <div className="border-t border-white/15 pt-2.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowCCStudio(false)}
                className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[12px] shadow-lg cursor-pointer transition active:scale-98"
              >
                Apply & Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          3. EXTERNAL SCENE TIMELINE SCRUBBER
         ===================================================================== */}
      <div className="w-full bg-[#12141C] border border-white/15 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-md text-white">
        <div className="flex items-center justify-between px-1 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="mono text-[10px] font-extrabold uppercase text-amber-300 tracking-wider">
              Scene Timeline
            </span>
            <span className="mono text-[9px] text-white/50">
              ({activeSceneIndex + 1}/{activeScenes.length})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-thin">
          {activeScenes.map((sc, idx) => {
            const isActive = idx === activeSceneIndex;
            const durSec = Math.max(0.5, sc.end - sc.start).toFixed(1);
            const shotBadge = isCutoutTemplate
              ? sc.shotType === "sam_cutout" || sc.shotType === "depth_cutout"
                ? "CUTOUT"
                : sc.shotType === "fullscreen_animation"
                ? "STORY ANIM"
                : "SPEAKER"
              : sc.shotType === "fullscreen_animation" || sc.shotType === "SPLIT"
              ? "STORY ANIM"
              : "SPEAKER";
            const shotColor =
              shotBadge === "CUTOUT"
                ? "bg-[#E4491B]/30 text-[#FFE600] border-[#E4491B]/60"
                : shotBadge === "STORY ANIM"
                ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/50"
                : "bg-white/10 text-white/75 border-white/20";

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
                <div className="flex flex-col text-left gap-0.5">
                  <div className="flex items-center gap-1">
                    <span className="mono text-[9px] font-black text-amber-400">
                      S{idx + 1}
                    </span>
                    <span className="mono text-[8px] text-white/60">
                      {durSec}s
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const order: SceneSegment["shotType"][] = isCutoutTemplate
                          ? ["sam_cutout", "fullscreen_animation", "fullscreen_speaker"]
                          : ["fullscreen_animation", "fullscreen_speaker"];
                        const curIdx = order.indexOf(sc.shotType);
                        const nextShot = order[(curIdx + 1) % order.length];
                        setUserScenes((prev) => (prev.length > 0 ? prev : activeScenes).map((item, sIdx) =>
                          sIdx === idx
                            ? { ...item, shotType: nextShot, animationLeadInSec: nextShot === "sam_cutout" ? 0.8 : undefined }
                            : item
                        ));
                      }}
                      className={`px-1.5 py-0.2 rounded mono text-[7.5px] font-extrabold border transition cursor-pointer ${shotColor}`}
                      title="Switch this scene between face and animation"
                    >
                      {shotBadge}
                    </button>
                    {onRecreateScene && (
                      <button
                        type="button"
                        disabled={recreatingSceneIdx !== null}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            setRecreatingSceneIdx(idx);
                            await onRecreateScene(
                              idx,
                              "Recreate animation for this scene with fresh, script-grounded visual layout and motion",
                              undefined
                            );
                          } catch (err) {
                            console.warn("Failed to recreate scene:", err);
                          } finally {
                            setRecreatingSceneIdx(null);
                          }
                        }}
                        className="px-1.5 py-0.5 rounded mono text-[7.5px] font-extrabold bg-amber-500/15 hover:bg-amber-400 hover:text-black text-amber-300 border border-amber-400/40 transition flex items-center gap-0.5 cursor-pointer ml-auto"
                        title="Recreate animation for this scene only"
                      >
                        {recreatingSceneIdx === idx ? (
                          <Loader2 size={7.5} className="animate-spin" />
                        ) : (
                          <Sparkles size={7.5} />
                        )}
                        <span>{recreatingSceneIdx === idx ? "..." : "Recreate"}</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] font-bold truncate max-w-[105px]">
                    {sc.headlineText || `Scene ${idx + 1}`}
                  </span>
                </div>

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


    </div>
  );
}
