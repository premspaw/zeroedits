"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Clock,
  FileJson,
  FileText,
  Copy,
  Check,
  Clapperboard,
  Scissors,
  Upload,
  History,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  X,
  Maximize2,
  Layers,
  Mic,
  ChevronUp,
  ChevronDown,
  Send,
  Disc3,
  Loader2,
  Volume2,
  Wand2,
  Code2,
  Download,
  FileCode,
  Globe,
  Plus,
  Trash2,
  Video,
  BookOpen,
} from "lucide-react";
import SparkLiveRunner from "@/components/SparkLiveRunner";
import WonderStoryboard from "@/components/WonderStoryboard";
import VideoExportModal from "@/components/VideoExportModal";
import StoryBankView from "@/components/StoryBankView";
import Pip from "@/components/Pip";

type FormatType =
  | "auto"
  | "paperCard"
  | "blackNeon"
  | "minimal"
  | "cutout"
  | "anime"
  | "glass";
type TimingType = "5s" | "10s" | "15s" | "20s" | "30s";
type VoiceType =
  | "EN-IN"
  | "EN-US"
  | "HI-VIHAAN"
  | "HI-ANANYA"
  | "KN-DIVYA"
  | "KN-KIRAN";
type VoiceLang = "EN" | "HI" | "KN";

interface VoiceTrack {
  id: number | string;
  url: string;
  file: string;
  start: number;
  end: number;
  duration: number;
  hasAudio: boolean;
}

interface ThemeConfig {
  bg: string;
  paper: string;
  accent: string;
  effect: string;
  font?: string;
}

interface Beat {
  id: number;
  role?: string;
  label: string;
  tone: string;
  start?: number;
  end?: number;
  duration: string;
  durNum?: number;
  script: string;
  text?: string;
  visualDesc?: string;
  motion?: string;
  layout?: string;
  camera?: string;
  lighting?: string;
  transition?: string;
  voiceover?: string;
  sound?: string;
  emphasis?: string[];
}

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  typing?: boolean;
  beats?: Beat[];
  format?: FormatType | string;
  timing?: TimingType;
  voice?: VoiceType;
  voiceEnabled?: boolean;
  voiceLang?: VoiceLang;
  voiceTracks?: VoiceTrack[];
  theme?: ThemeConfig;
  styleHint?: string;
  storyboard?: any;
  editPlan?: any;
  sparkCode?: string;
  generationStatus?: "storyboarding" | "rendering" | "ready" | "error";
  generationError?: string;
  topic?: string;
  pipeline?: "pipeline-a" | "pipeline-b";
  pipelineBRunId?: string;
  videoUrl?: string;
  finalDownloadUrl?: string;
}

const TEMPLATES: Record<string, ThemeConfig> = {
  paperCard: {
    bg: "#F5F1E8",
    paper: "#FFFEFB",
    accent: "#E4491B",
    effect: "torn paper edges, soft shadow, #F5F1E8 bg, orange pop",
    font: "Instrument Serif",
  },
  blackNeon: {
    bg: "#0A0A0A",
    paper: "#141414",
    accent: "#00D9FF",
    effect: "black bg #0A0A0A, electric blue #00D9FF + purple #8B5CF6 glow, glitch, RGB split",
    font: "JetBrains Mono",
  },
  minimal: {
    bg: "#FFFFFF",
    paper: "#FAFAFA",
    accent: "#111111",
    effect: "white bg, black bold typography, lots of negative space",
    font: "Inter",
  },
  cutout: {
    bg: "#F5F1E8",
    paper: "#FFFFFF",
    accent: "#E63946",
    effect: "person cutout with SAM 3.1 transparent, floating on beige board",
    font: "Instrument Serif",
  },
  anime: {
    bg: "#181824",
    paper: "#222238",
    accent: "#FF3366",
    effect: "anime cel shading, speed lines, impact frames",
    font: "Impact, Inter",
  },
  glass: {
    bg: "#1E1E2E",
    paper: "rgba(255, 255, 255, 0.12)",
    accent: "#64B5F6",
    effect: "glassmorphism blur, frosted cards",
    font: "Inter",
  },
};

const FORMAT_OPTIONS: {
  id: FormatType;
  label: string;
  swatch: string;
  desc: string;
}[] = [
  {
    id: "auto",
    label: "Auto (AI Decides)",
    swatch: "linear-gradient(135deg, #E4491B 0%, #00D9FF 100%)",
    desc: "AI decides theme & style",
  },
  {
    id: "paperCard",
    label: "Paper Card",
    swatch: "#FFFEFB",
    desc: "Torn edges, soft shadow",
  },
  {
    id: "blackNeon",
    label: "Black Neon",
    swatch: "#111111",
    desc: "High contrast, glow",
  },
  {
    id: "minimal",
    label: "Minimal",
    swatch: "#FFFFFF",
    desc: "Clean, editorial",
  },
  {
    id: "cutout",
    label: "Cutout",
    swatch: "#F5F1E8",
    desc: "SAM 3.1 floating cutout",
  },
  {
    id: "anime",
    label: "Anime",
    swatch: "#181824",
    desc: "Cel shading, speed lines",
  },
  {
    id: "glass",
    label: "Glass",
    swatch: "rgba(255, 255, 255, 0.2)",
    desc: "Glassmorphism blur",
  },
];

const TIMING_OPTIONS: {
  id: TimingType;
  label: string;
  words: string;
  count: number;
  desc: string;
}[] = [
  { id: "5s", label: "5s", words: "14 words", count: 2, desc: "Fast whipPan, 2 beats" },
  { id: "10s", label: "10s", words: "28 words", count: 4, desc: "Punchy, 4 beats" },
  { id: "15s", label: "15s", words: "42 words", count: 6, desc: "Detailed, 6 beats" },
  { id: "20s", label: "20s", words: "56 words", count: 8, desc: "Storytelling, 8 beats" },
  { id: "30s", label: "30s", words: "84 words", count: 8, desc: "Extended cut, 8 beats" },
];

const VOICE_LANGUAGES: { id: VoiceLang; label: string; note: string }[] = [
  { id: "EN", label: "English", note: "Default narration" },
  { id: "HI", label: "Hindi", note: "हिंदी वॉइसओवर" },
  { id: "KN", label: "Kannada", note: "ಕನ್ನಡ ವಾಯ್ಸ್‌ಓವರ್" },
];

const VOICE_OPTIONS: {
  id: VoiceType;
  lang: VoiceLang;
  label: string;
  flag: string;
  name: string;
}[] = [
  { id: "EN-IN", lang: "EN", label: "EN-IN", flag: "🇮🇳", name: "Aarav • Warm" },
  { id: "EN-US", lang: "EN", label: "EN-US", flag: "🇺🇸", name: "Mason • Crisp" },
  { id: "HI-VIHAAN", lang: "HI", label: "HI-IN", flag: "🇮🇳", name: "Vihaan • Warm" },
  { id: "HI-ANANYA", lang: "HI", label: "HI-IN", flag: "🇮🇳", name: "Ananya • Bright" },
  { id: "KN-DIVYA", lang: "KN", label: "KN-IN", flag: "🇮🇳", name: "Divya • Warm" },
  { id: "KN-KIRAN", lang: "KN", label: "KN-IN", flag: "🇮🇳", name: "Kiran • Clear" },
];

function voiceLangOf(v: VoiceType): VoiceLang {
  return VOICE_OPTIONS.find((o) => o.id === v)?.lang || "EN";
}

function voiceNameOf(v: VoiceType): string {
  return VOICE_OPTIONS.find((o) => o.id === v)?.name || v;
}

const PROMPT_SUGGESTIONS = [
  "how to ride a bicycle in anime style",
  "Now Edit Reels with AI",
  "Why paper cards convert better",
  "Explain quantum computing in 5s",
];

function generateBeats(topic: string, timing: TimingType): Beat[] {
  const cleanTopic = topic.trim().replace(/[.!?]+$/, "");
  const durationNum = parseInt(timing.replace("s", ""), 10) || 10;
  const count =
    durationNum <= 7 ? 2 : durationNum <= 10 ? 4 : durationNum <= 15 ? 6 : 8;

  const beatTemplates = [
    { label: "Hook", tone: "tension" },
    { label: "Transform", tone: "shift" },
    { label: "Mechanism", tone: "proof" },
    { label: "Magic", tone: "wonder" },
    { label: "Benefit", tone: "uplift" },
    { label: "Payoff", tone: "action" },
    { label: "Detail", tone: "clarity" },
    { label: "Outro", tone: "impact" },
  ];

  const scriptTemplates = [
    `${cleanTopic} — but not how you think.`,
    `Most people fail at ${cleanTopic} in seconds.`,
    `We rebuilt ${cleanTopic} as movable cards.`,
    `One idea per card for ${cleanTopic} that feels real.`,
    `Save hours. Your ${cleanTopic} reel edits itself.`,
    `Master ${cleanTopic} with a studio-grade cut.`,
    `Everything connects seamlessly from start to finish.`,
    `Now you have the exact formula forever.`,
  ];

  const step = durationNum / count;

  return Array.from({ length: count }).map((_, index) => {
    const template = beatTemplates[index % beatTemplates.length];
    const startSec = Math.round(index * step);
    const endSec = Math.round((index + 1) * step);

    return {
      id: index,
      role: template.label.toUpperCase(),
      label: template.label,
      tone: template.tone,
      duration: `${startSec}s - ${endSec}s`,
      durNum: Math.max(1, endSec - startSec),
      script: scriptTemplates[index % scriptTemplates.length],
      visualDesc: `Visual for ${cleanTopic} • Beat ${index + 1}`,
      motion: durationNum <= 7 ? "popSpring (0.3s fast)" : "spring (0.7s)",
    };
  });
}

const SHOWCASE_REELS: ChatMessageItem[] = [
  {
    id: "reel-1",
    role: "assistant",
    topic: "Now Edit Reels with AI",
    text: "Paper Studio ready. 6 studio scenes planned with movable paper cards — 9:16, script-locked, ready for export.",
    beats: generateBeats("Now Edit Reels with AI", "15s"),
    format: "paperCard",
    timing: "15s",
    voice: "EN-IN",
    generationStatus: "ready",
  },
  {
    id: "reel-2",
    role: "assistant",
    topic: "Why paper cards convert better",
    text: "Tactile motion hooks viewers in the first 2 seconds. 6 dynamic paper card scenes prepared.",
    beats: generateBeats("Why paper cards convert better", "15s"),
    format: "paperCard",
    timing: "15s",
    voice: "EN-IN",
    generationStatus: "ready",
  },
  {
    id: "reel-3",
    role: "assistant",
    topic: "how to ride a bicycle in anime style",
    text: "Anime cel shading, speed lines, and impact frames breaking down cycling fundamentals.",
    beats: generateBeats("how to ride a bicycle in anime style", "15s"),
    format: "anime",
    timing: "15s",
    voice: "EN-US",
    generationStatus: "ready",
  },
  {
    id: "reel-4",
    role: "assistant",
    topic: "Explain quantum computing in 5s",
    text: "Black neon glitch and electric blue pulses explaining superposition and qubits in 5 seconds.",
    beats: generateBeats("Explain quantum computing in 5s", "5s"),
    format: "blackNeon",
    timing: "5s",
    voice: "EN-US",
    generationStatus: "ready",
  },
];

function PreviewCard({
  format,
  beats,
  activeBeat,
  isPlaying,
  voice,
  timing,
  voiceTracks = [],
  voiceEnabled = false,
  theme,
  compact = false,
  isGenerating = false,
  generatingStep = "",
  sparkCode = "",
  storyboard,
  topic = "",
  videoUrl,
  finalDownloadUrl,
  onRetry,
  errorMessage,
  onReady,
  onError,
  onExportMP4,
}: {
  format: FormatType | string;
  beats: Beat[];
  activeBeat: number;
  isPlaying: boolean;
  voice: VoiceType;
  timing: TimingType;
  voiceTracks?: VoiceTrack[];
  voiceEnabled?: boolean;
  theme?: ThemeConfig;
  compact?: boolean;
  isGenerating?: boolean;
  generatingStep?: string;
  sparkCode?: string;
  storyboard?: any;
  topic?: string;
  videoUrl?: string;
  finalDownloadUrl?: string;
  onRetry?: () => void;
  errorMessage?: string | null;
  onReady?: () => void;
  onError?: (message: string) => void;
  onExportMP4?: () => void;
}) {
  const beatsDuration = beats.reduce(
    (m, b) => Math.max(m, typeof b.end === "number" ? b.end : 0),
    0
  );
  const durationNum = beatsDuration > 0 ? beatsDuration : Number(timing.replace("s", "")) || 10;
  const effectiveTheme = theme || (format !== "auto" && TEMPLATES[format] ? TEMPLATES[format] : null);
  const [showCleanCut, setShowCleanCut] = useState(false);

  // Beat-level voiceover playback, driven by the animation clock.
  const beatAudioRef = useRef<HTMLAudioElement | null>(null);
  const voicedBeatRef = useRef(-1);
  const wasPlayingRef = useRef(true);

  const stopVoice = useCallback(() => {
    voicedBeatRef.current = -1;
    const a = beatAudioRef.current;
    if (a) {
      try {
        a.pause();
      } catch {}
    }
  }, []);

  const playBeatVoice = useCallback(
    (index: number) => {
      if (!voiceEnabled) return;
      const track = voiceTracks?.[index];
      const a0 = beatAudioRef.current;
      if (!track || !track.hasAudio) {
        voicedBeatRef.current = index;
        if (a0) {
          try {
            a0.pause();
          } catch {}
        }
        return;
      }
      if (voicedBeatRef.current === index) return;
      voicedBeatRef.current = index;
      let a = a0;
      if (!a) {
        a = new Audio();
        a.preload = "auto";
        beatAudioRef.current = a;
      }
      try {
        a.pause();
        a.src = track.url;
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    },
    [voiceEnabled, voiceTracks]
  );

  const beatIndexAt = useCallback(
    (t: number) => {
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i];
        const s = typeof b.start === "number" ? b.start : i * 2.5;
        const e = typeof b.end === "number" ? b.end : (i + 1) * 2.5;
        if (t >= s && t < e) return i;
      }
      return beats.length ? beats.length - 1 : -1;
    },
    [beats]
  );

  const handleVoiceTime = useCallback(
    (t: number, playing: boolean) => {
      if (!playing) {
        wasPlayingRef.current = false;
        const a = beatAudioRef.current;
        if (a) {
          try {
            a.pause();
          } catch {}
        }
        return;
      }
      if (!wasPlayingRef.current) {
        wasPlayingRef.current = true;
        voicedBeatRef.current = -1;
      }
      const idx = beatIndexAt(t);
      if (idx >= 0) playBeatVoice(idx);
    },
    [beatIndexAt, playBeatVoice]
  );

  // Card (non-Spark) path follows the parent's activeBeat.
  useEffect(() => {
    if (sparkCode || errorMessage || storyboard) return;
    if (!isPlaying) {
      wasPlayingRef.current = false;
      const a = beatAudioRef.current;
      if (a) {
        try {
          a.pause();
        } catch {}
      }
      return;
    }
    if (!wasPlayingRef.current) {
      wasPlayingRef.current = true;
      voicedBeatRef.current = -1;
    }
    playBeatVoice(activeBeat);
  }, [activeBeat, isPlaying, sparkCode, errorMessage, storyboard, playBeatVoice]);

  // Reset voice when the reel changes.
  useEffect(() => {
    stopVoice();
    wasPlayingRef.current = true;
  }, [sparkCode, beats.length, stopVoice]);

  useEffect(() => () => stopVoice(), [stopVoice]);

  const activeVideoUrl = showCleanCut ? (videoUrl || finalDownloadUrl) : (finalDownloadUrl || videoUrl);

  useEffect(() => {
    if (activeVideoUrl) {
      stopVoice();
    }
  }, [activeVideoUrl, stopVoice]);

  if (activeVideoUrl) {
    return (
      <div
        className={`aspect-[9/16] w-full rounded-[22px] border-2 border-[#141414] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)] overflow-hidden relative bg-black flex flex-col items-center justify-center ${compact ? "scale-[0.98]" : ""}`}
      >
        <video
          key={activeVideoUrl}
          src={activeVideoUrl}
          controls
          playsInline
          className="w-full h-full object-contain"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[11px] font-bold text-white border border-white/20 pointer-events-none z-10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {showCleanCut ? "✂️ Clean Cuts" : "✨ Edited Reel (Cuts + Subtitles + Badges)"}
        </div>

        {finalDownloadUrl && videoUrl && finalDownloadUrl !== videoUrl && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-full p-0.5 border border-white/20 z-10 text-[10px]">
            <button
              onClick={() => setShowCleanCut(false)}
              className={`px-2 py-0.5 rounded-full font-bold transition ${!showCleanCut ? "bg-[#E4491B] text-white" : "text-white/70 hover:text-white"}`}
            >
              Full Reel
            </button>
            <button
              onClick={() => setShowCleanCut(true)}
              className={`px-2 py-0.5 rounded-full font-bold transition ${showCleanCut ? "bg-[#E4491B] text-white" : "text-white/70 hover:text-white"}`}
            >
              Cuts Only
            </button>
          </div>
        )}

        <a
          href={finalDownloadUrl ? `${finalDownloadUrl}?download=1` : activeVideoUrl}
          download="pipeline-b-edited-reel.mp4"
          className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full bg-[#E4491B] hover:bg-[#C93D14] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition active:scale-95 z-10"
        >
          <Download size={13} />
          <span>Download Reel</span>
        </a>
      </div>
    );
  }

  if (isGenerating && !sparkCode && !storyboard) {
    return (
      <div
        className={`aspect-[9/16] w-full rounded-[22px] border-2 border-[#141414] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)] overflow-hidden relative bg-[#141414] text-white flex flex-col items-center justify-center p-6 text-center ${compact ? "scale-[0.98]" : ""}`}
      >
        <div className="w-12 h-12 rounded-full border-4 border-[#E4491B] border-t-transparent animate-spin mb-4" />
        <h3 className="mono text-sm font-bold uppercase tracking-wider mb-2 text-[#E4491B]">Pipeline B Processing</h3>
        <p className="text-xs text-[#ECEAE3]/80 leading-relaxed max-w-[220px]">
          {generatingStep || "Trimming silences, synchronizing audio & building clean cut..."}
        </p>
      </div>
    );
  }

  if (sparkCode || errorMessage || storyboard) {
    return (
      <div
        className={`aspect-[9/16] w-full rounded-[22px] border border-[#D5D2C8] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)] overflow-hidden relative ${compact ? "scale-[0.98]" : ""}`}
      >
        <SparkLiveRunner
          code={sparkCode}
          duration={durationNum}
          isGenerating={isGenerating}
          generatingStep={generatingStep}
          theme={effectiveTheme}
          storyboard={storyboard}
          topic={topic || beats[0]?.script || ""}
          showControls={true}
          onRetry={storyboard || beats.length ? onRetry : undefined}
          errorMessage={errorMessage}
          onReady={onReady}
          onError={onError}
          onExportMP4={onExportMP4}
          onTimeUpdate={handleVoiceTime}
        />
      </div>
    );
  }

  const currentBeat = beats[activeBeat] || beats[0];

  const isPaper = format === "paperCard" || (effectiveTheme ? effectiveTheme.effect.includes("torn paper") : true);
  const isNeon = format === "blackNeon" || (effectiveTheme ? effectiveTheme.bg === "#0A0A0A" : false);
  const isAnime = format === "anime" || (effectiveTheme ? effectiveTheme.effect.includes("anime") : false);

  const cardBg = effectiveTheme?.paper || (isPaper ? "#FFFEFB" : isNeon ? "#0A0A0A" : isAnime ? "#222238" : "#FFFFFF");
  const isDark = isNeon || isAnime || effectiveTheme?.bg === "#0A0A0A" || effectiveTheme?.bg === "#181824";
  const textColor = isDark ? "text-white" : "text-[#111]";
  const accentColor = effectiveTheme?.accent || "#E4491B";

  return (
    <div
      className={`aspect-[9/16] w-full rounded-[22px] border border-[#D5D2C8] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)] overflow-hidden relative ${textColor} ${compact ? "scale-[0.98]" : ""}`}
      style={{ perspective: "1000px", backgroundColor: cardBg }}
    >
      {/* Paper texture overlay */}
      {isPaper && (
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Torn Paper Edges */}
      {isPaper && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-[18px] bg-[#FFFEFB] pointer-events-none z-10"
            style={{
              clipPath:
                "polygon(0 0, 5% 60%, 12% 20%, 18% 55%, 26% 15%, 33% 50%, 42% 10%, 51% 45%, 60% 20%, 70% 60%, 78% 15%, 88% 40%, 100% 0)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[18px] bg-[#FFFEFB] pointer-events-none rotate-180 z-10"
            style={{
              clipPath:
                "polygon(0 0, 5% 60%, 12% 20%, 18% 55%, 26% 15%, 33% 50%, 42% 10%, 51% 45%, 60% 20%, 70% 60%, 78% 15%, 88% 40%, 100% 0)",
            }}
          />
        </>
      )}

      {/* Generating State Screen */}
      {isGenerating ? (
        <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center z-20 bg-[#F5F1E8]/95 backdrop-blur-md">
          {/* 3D Rotating Card Mockup */}
          <motion.div
            animate={{
              rotateY: [0, 180, 360],
              rotateZ: [-2, 2.5, -2],
              scale: [0.96, 1.02, 0.96],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.4,
              ease: "easeInOut",
            }}
            className="w-36 h-52 rounded-[18px] bg-[#FFFEFB] border-2 border-[#111] shadow-[0_16px_36px_rgba(0,0,0,0.18)] p-3.5 flex flex-col justify-between mb-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <Disc3 className="w-4 h-4 text-[#E4491B] animate-spin" />
              <span className="mono text-[8px] font-bold tracking-wider text-[#E4491B] bg-[#F6D9CC] px-1.5 py-0.5 rounded-full">
                AI ENGINE
              </span>
            </div>
            <div className="my-auto">
              <div className="serif text-[20px] font-medium leading-none text-[#111]">
                Paper Reel
              </div>
              <div className="mono text-[9px] text-[#6B6A64] mt-1">
                Meta Muse Model
              </div>
            </div>
            <div className="w-full bg-[#D5D2C8] h-1 rounded-full overflow-hidden">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-1/2 h-full bg-[#E4491B]"
              />
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mono text-[11px] font-bold text-[#111] uppercase tracking-wider mb-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E4491B]" />
            <span>Stitching All {beats.length || 6} Beats...</span>
          </div>
          <div className="mono text-[10px] text-[#6B6A64] max-w-[220px] leading-snug">
            {generatingStep || `Rendering complete ${timing} timeline. Holding preview until all beats are stitched...`}
          </div>
        </div>
      ) : !currentBeat ? (
        <div className="aspect-[9/16] rounded-[22px] bg-[#F5F1E8] border border-dashed border-[#D5D2C8] grid place-items-center p-8 text-center">
          <div className="mono text-[12px] text-[#6B6A64]">
            Type a topic to generate paper cards
          </div>
        </div>
      ) : (
        /* Active Preview Reel Content */
        <div className="absolute inset-0 p-4 lg:p-5 flex flex-col z-0">
          {/* Top Status Header */}
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full mono text-[10px] tracking-widest border ${
                isNeon
                  ? "bg-white/10 border-white/20 text-white/70"
                  : "bg-[#F5F1E8] border-[#D5D2C8] text-[#6B6A64]"
              }`}
            >
              <span>{timing}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {voice}
                {isPlaying && (
                  <span className="flex items-end gap-[2px] h-2.5 ml-0.5">
                    <span className="w-[2px] bg-[#E4491B] rounded-full animate-pulse h-full" />
                    <span className="w-[2px] bg-[#E4491B] rounded-full animate-pulse h-2/3" />
                    <span className="w-[2px] bg-[#E4491B] rounded-full animate-pulse h-4/5" />
                  </span>
                )}
              </span>
              <span>•</span>
              <span className={isPlaying ? "text-[#E4491B] font-semibold" : ""}>
                {isPlaying ? "PLAYING" : "PAUSED"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="mono text-[10px] text-[#6B6A64]">
                {(() => {
                  const totalSec = Number(timing.replace("s", "")) || 15;
                  const slice = totalSec / (beats.length || 6);
                  const currentSec = (activeBeat * slice).toFixed(1);
                  return `0:${currentSec.padStart(4, "0")} / 0:${totalSec.toFixed(1)}s`;
                })()}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${
                  isPlaying ? "bg-[#E4491B] animate-pulse" : "bg-[#D5D2C8]"
                }`}
              />
            </div>
          </div>

          {/* Dynamic Paper Card with Physics Motion & Rotation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`card-${activeBeat}-${currentBeat.id}`}
              initial={{
                opacity: 0,
                y: 18,
                rotate: activeBeat % 2 === 0 ? -3.5 : 3.5,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: activeBeat % 2 === 0 ? -1.2 : 1.2,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -18,
                rotate: activeBeat % 2 === 0 ? 3 : -3,
                scale: 0.95,
              }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 24,
              }}
              className="flex-1 flex flex-col justify-center gap-4 mt-6 select-none"
            >
              <div
                className={`inline-flex self-start px-3 py-1 rounded-full mono text-[10px] tracking-widest shadow-sm ${
                  isNeon ? "bg-[#E4491B] text-white" : "bg-[#111] text-white"
                }`}
              >
                {currentBeat.label.toUpperCase()} — {currentBeat.tone}
              </div>

              <div
                className={`serif leading-[0.95] tracking-[-0.02em] text-[30px] lg:text-[34px] drop-shadow-sm`}
              >
                <span className={isNeon ? "text-white" : "text-[#111]"}>
                  {currentBeat.script}
                </span>
              </div>

              {currentBeat.visualDesc && (
                <div
                  className={`rounded-[10px] p-2.5 mono text-[10px] leading-[1.4] border ${
                    isNeon
                      ? "bg-white/[0.06] border-white/10 text-white/80"
                      : "bg-[#F5F1E8] border-[#D5D2C8] text-[#6B6A64]"
                  }`}
                >
                  <span className="text-[#E4491B] font-semibold mr-1.5 uppercase tracking-wider text-[9px]">
                    Visual:
                  </span>
                  <span>{currentBeat.visualDesc}</span>
                </div>
              )}

              <div
                className={`h-px w-full ${
                  isNeon ? "bg-white/15" : "bg-[#D5D2C8]"
                } my-1`}
              />

              {/* Dynamic Full Reel Progress Segments (all beats across total video duration) */}
              <div className="flex gap-1.5">
                {beats.map((b, segIndex) => {
                  const isActive = segIndex === activeBeat;
                  const isPast = segIndex < activeBeat;
                  const segDuration = b.durNum || 2.5;

                  return (
                    <div
                      key={b.id ?? segIndex}
                      className={`h-[3.5px] flex-1 rounded-full overflow-hidden ${
                        isNeon ? "bg-white/10" : "bg-[#D5D2C8]/80"
                      }`}
                    >
                      <div
                        className="h-full bg-[#E4491B] transition-all ease-linear"
                        style={{
                          width: isPast ? "100%" : isActive ? "100%" : "0%",
                          opacity: isPast ? 0.45 : 1,
                          transitionDuration: isActive ? `${segDuration * 1000}ms` : "150ms",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Tape Reel Controller */}
          <div className="mt-auto">
            <div
              className={`rounded-[14px] border p-3 flex items-center gap-3 shadow-sm ${
                isNeon
                  ? "bg-white/[0.06] border-white/10"
                  : "bg-[#F5F1E8]/80 border-[#D5D2C8] backdrop-blur"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                  isNeon ? "bg-white text-black" : "bg-[#111] text-white"
                }`}
              >
                <Disc3
                  size={16}
                  className={isPlaying ? "animate-spin text-[#E4491B]" : ""}
                />
              </div>
              <div className="min-w-0">
                <div className="mono text-[11px] font-medium leading-none truncate flex items-center gap-1.5">
                  <span>Paper physics • 60fps</span>
                  {isPlaying && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  )}
                </div>
                <div className="mono text-[10px] opacity-60 mt-1 leading-none">
                  {beats.length} cards • Ready to export
                </div>
              </div>
              <div className="ml-auto mono text-[10px] px-2 py-1 rounded-full bg-[#E4491B] text-white font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>REC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isNeon && (
        <div
          className="absolute -inset-[40px] pointer-events-none opacity-30 blur-[40px]"
          style={{
            background:
              "radial-gradient(400px at 50% 0%, #E4491B 0%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
}

function generateFullReelCode(
  beats: Beat[],
  timing: string,
  theme: any,
  topic: string
) {
  const totalSec = Number(timing.replace("s", "")) || 15;
  const numBeats = beats.length || 6;
  const sliceDur = totalSec / numBeats;

  const beatItems = beats.map((b, i) => {
    const bStart = typeof b.start === "number" ? b.start : +(i * sliceDur).toFixed(1);
    const bEnd = typeof b.end === "number" ? b.end : +((i + 1) * sliceDur).toFixed(1);
    return {
      id: b.id ?? i + 1,
      role: b.role || b.label || `BEAT 0${i + 1}`,
      start: bStart,
      end: bEnd,
      headline: (b.script || b.text || "").replace(/"/g, '\\"'),
      sub: b.visualDesc
        ? b.visualDesc.replace(/"/g, '\\"')
        : `Beat ${i + 1} of ${numBeats}`,
      badge: `${b.role || b.label || "BEAT"} • 0${i + 1}`,
    emoji:
      i === 0
        ? "🌱"
        : i === 1
        ? "💧"
        : i === 2
        ? "☀️"
        : i === 3
        ? "🌿"
        : i === 4
        ? "🌸"
        : "☕",
    color:
      i === 0
        ? "#E4491B"
        : i === 1
        ? "#3B82F6"
        : i === 2
        ? "#D97706"
        : i === 3
        ? "#6B8E5A"
        : i === 4
        ? "#EC4899"
        : "#E4491B",
    };
  });

  return `import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FullReel${totalSec}s - Complete ${totalSec}-Second Video Reel Component
 * Topic: "${topic.replace(/"/g, '\\"')}"
 * 
 * Sequences all ${numBeats} beats across the full ${totalSec}s timeline (0:00 - 0:${totalSec}):
${beatItems
  .map(
    (b) =>
      ` * - ${b.badge} (${b.start}s - ${b.end}s): "${b.headline.slice(0, 35)}..."`
  )
  .join("\n")}
 */
export default function FullReel${totalSec}s() {
  const TOTAL_DURATION = ${totalSec};
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const theme = {
    bg: "${theme?.bg || "#F5F1E8"}",
    paper: "${theme?.paper || "#FFFEFB"}",
    accent: "${theme?.accent || "#E4491B"}",
    ink: "${theme?.textColor || "#111111"}",
    font: "'${theme?.font || "Instrument Serif"}', Georgia, serif",
  };

  const beats = ${JSON.stringify(beatItems, null, 2)};
  const currentBeat = beats[activeBeatIndex] || beats[0];

  // Global ${totalSec}-second Timeline Clock
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 50;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + intervalMs / 1000;
        return next >= TOTAL_DURATION ? 0 : next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Sync active beat to elapsed video timeline
  useEffect(() => {
    const matching = beats.findIndex((b) => elapsed >= b.start && elapsed < b.end);
    if (matching !== -1 && matching !== activeBeatIndex) {
      setActiveBeatIndex(matching);
    }
  }, [elapsed, activeBeatIndex]);

  const tornClip = "polygon(0% 2%, 4% 0.8%, 9% 2.2%, 14% 0.9%, 19% 2%, 24% 1%, 29% 2.1%, 34% 0.9%, 39% 2.2%, 44% 0.8%, 49% 2%, 54% 1%, 59% 2.2%, 64% 0.8%, 69% 2%, 74% 1%, 79% 2.3%, 84% 1%, 89% 2%, 94% 0.8%, 100% 2%, 100% 98%, 95% 99.2%, 90% 97.8%, 85% 99.1%, 80% 97.6%, 75% 99%, 70% 97.8%, 65% 99.2%, 60% 97.6%, 55% 99%, 50% 97.8%, 45% 99.2%, 40% 97.6%, 35% 98.9%, 30% 97.8%, 25% 99.2%, 20% 97.9%, 15% 99%, 10% 97.7%, 5% 99.1%, 0% 97.9%)";

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: theme.bg, color: theme.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: theme.font }}>
      <div style={{ width: "100%", maxWidth: "400px", aspectRatio: "9 / 16", background: theme.paper, borderRadius: "26px", border: "2px solid #111", boxShadow: "0 28px 60px rgba(0,0,0,0.22)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px 18px" }}>
        
        {/* Top ${totalSec}s Global Timecode Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", fontFamily: "monospace", fontSize: "11px", color: "#6B6A64" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isPlaying ? theme.accent : "#6B6A64", display: "inline-block" }} />
              <span style={{ fontWeight: 700, color: "#111" }}>
                0:{elapsed.toFixed(1).padStart(4, "0")} / 0:${totalSec.toFixed(1)}s REEL
              </span>
            </div>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: "#111", color: "#fff", border: "none", borderRadius: "100px", padding: "3px 10px", fontSize: "10px", fontFamily: "monospace", cursor: "pointer", fontWeight: 700 }}>
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>
          </div>

          {/* ${numBeats}-Segment Full Reel Scrubber */}
          <div style={{ display: "flex", gap: "4px", width: "100%" }}>
            {beats.map((b, idx) => {
              const isActive = idx === activeBeatIndex;
              const isPast = idx < activeBeatIndex;
              const beatProg = isActive ? Math.min(1, Math.max(0, (elapsed - b.start) / (b.end - b.start))) : isPast ? 1 : 0;
              return (
                <div key={b.id} onClick={() => setElapsed(b.start)} style={{ flex: 1, height: "4px", borderRadius: "100px", background: isPast ? "#6B8E5A" : "rgba(0,0,0,0.1)", overflow: "hidden", cursor: "pointer" }}>
                  {isActive && <div style={{ height: "100%", width: \`\${beatProg * 100}%\`, background: theme.accent, borderRadius: "100px" }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Card Transitioning Across All ${numBeats} Beats */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBeat.id}
            initial={{ y: -240, opacity: 0, scale: 0.92 }}
            animate={{ y: [0, -6, 0], opacity: 1, scale: 1 }}
            exit={{ y: 220, opacity: 0, scale: 0.9 }}
            transition={{ opacity: { duration: 0.3 }, scale: { type: "spring", damping: 20, stiffness: 220 }, y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } }}
            style={{ width: "100%", height: "78%", background: "#FFFEFB", clipPath: tornClip, boxShadow: "0 18px 40px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "24px 20px", textAlign: "center", border: "1px solid rgba(234,226,204,0.6)" }}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ background: currentBeat.color, color: "#fff", fontSize: "10px", letterSpacing: "0.2em", fontFamily: "system-ui, sans-serif", fontWeight: 800, padding: "6px 14px", borderRadius: "100px" }}>
              {currentBeat.badge}
            </motion.div>

            <div style={{ position: "relative", width: "110px", height: "110px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: \`2px dashed \${currentBeat.color}66\` }} />
              <div style={{ width: "76px", height: "76px", borderRadius: "50%", background: \`radial-gradient(circle, #F6D9CC 0%, \${currentBeat.color} 100%)\`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>
                <motion.span animate={{ y: [-2, 2, -2], rotate: [-4, 4, -4] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>{currentBeat.emoji}</motion.span>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: "25px", lineHeight: 1.08, margin: "0 0 6px", fontWeight: 400, color: "#111" }}>{currentBeat.headline}</h2>
              <p style={{ fontSize: "12px", fontFamily: "system-ui, sans-serif", color: "#6B6A64", margin: 0 }}>{currentBeat.sub}</p>
            </div>

            <div style={{ fontFamily: "monospace", fontSize: "9.5px", color: "#6B6A64", background: "rgba(245,241,232,0.8)", padding: "4px 10px", borderRadius: "100px" }}>
              TIMEFRAME: {currentBeat.start}s - {currentBeat.end}s ({sliceDur.toFixed(1)}s duration)
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Master Reel Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "monospace", fontSize: "10px", color: "#6B6A64", borderTop: "1px solid #D5D2C8", paddingTop: "8px" }}>
          <span>${totalSec}s FULL VIDEO REEL</span>
          <span style={{ color: theme.accent, fontWeight: 700 }}>BEAT {activeBeatIndex + 1} OF ${numBeats}</span>
        </div>
      </div>
    </div>
  );
}`;
}

async function readGenerationResponse(response: Response, stage: string) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || `${stage} request failed (HTTP ${response.status}). Please retry.`);
  }
  return payload;
}

export default function ProperMobileResponsiveChat() {
  const [format, setFormat] = useState<FormatType>("auto");
  const [timing, setTiming] = useState<TimingType>("15s");
  const [voice, setVoice] = useState<VoiceType>("EN-IN");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  type HeaderTab = "script" | "edit";
  const [activeHeaderTab, setActiveHeaderTab] = useState<HeaderTab>("script");
  // Pipeline B (auto-edit) staging — chat bar only, engine lands next.
  type StudioMode = "create" | "autoEdit";
  const [studioMode, setStudioMode] = useState<StudioMode>("create");
  const [editScript, setEditScript] = useState("");
  const [showEditScript, setShowEditScript] = useState(false);
  const [editVideoName, setEditVideoName] = useState<string | null>(null);
  const [editVideoDuration, setEditVideoDuration] = useState<number | null>(null);
  const editVideoFileRef = useRef<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");
  const [isInternetEnabled, setIsInternetEnabled] = useState(false);
  const [reviewCutsFirst, setReviewCutsFirst] = useState(false);

  const [messages, setMessages] = useState<ChatMessageItem[]>(SHOWCASE_REELS);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>("reel-1");

  // Load persisted history safely on client mount.
  // Drop stuck in-flight messages (typing / storyboarding / rendering with no
  // content): they come from a reload or crash mid-generation and would sit as
  // a permanent spinner with no storyboard and a paused preview. Real history
  // is never deleted — only content-less in-flight states are repaired.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "edit" || window.location.hash === "#edit") {
        setActiveHeaderTab("edit");
      } else if (tabParam === "script" || window.location.hash === "#script") {
        setActiveHeaderTab("script");
      }
    }
    try {
      const saved = localStorage.getItem("paper_studio_reels_v4");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((m: any) => !m?.typing);
          const repaired = cleaned.map((m: any) => {
            const stuck =
              (m?.generationStatus === "storyboarding" ||
                m?.generationStatus === "rendering") &&
              (!Array.isArray(m?.beats) || m.beats.length === 0) &&
              !m?.sparkCode &&
              !m?.storyboard;
            return stuck
              ? {
                  ...m,
                  typing: false,
                  generationStatus: "error",
                  text: m?.text || "This generation was interrupted. Press Generate to try again.",
                  generationError: "Interrupted before any scenes were planned. Your other reels are untouched.",
                }
              : m;
          });
          if (repaired.length > 0) {
            setMessages(repaired);
            const stillThere = repaired.some((m: any) => m?.id === parsed[0]?.id);
            setSelectedMessageId(
              stillThere ? parsed[0]?.id : repaired[0]?.id || "reel-1"
            );
          }
        }
      }
    } catch (e) {
      console.warn("Could not load reels from localStorage", e);
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    try {
      if (messages && messages.length > 0) {
        localStorage.setItem("paper_studio_reels_v4", JSON.stringify(messages));
      }
    } catch (e) {
      console.warn("Could not save reels to localStorage", e);
    }
  }, [messages]);

  const [activePopover, setActivePopover] = useState<
    "format" | "timing" | "voice" | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeBeat, setActiveBeat] = useState(0);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeModalContent, setCodeModalContent] = useState("");
  const [codeModalBeat, setCodeModalBeat] = useState<Beat | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [modalTab, setModalTab] = useState<"preview" | "code">("preview");
  const [isFullReelMode, setIsFullReelMode] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [modalActiveBeatIndex, setModalActiveBeatIndex] = useState(0);
  const [modalElapsed, setModalElapsed] = useState(0);
  const [isModalPlaying, setIsModalPlaying] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [expandedPromptIds, setExpandedPromptIds] = useState<Record<string, boolean>>({});
  const togglePrompt = (id: string) => {
    setExpandedPromptIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectHistoryItem = (messageId: string) => {
    setSelectedMessageId(messageId);
    const target = messages.find((m) => m.id === messageId);
    if (target) {
      if (target.format && target.format !== "auto") {
        setFormat(target.format as FormatType);
      }
      if (target.timing) {
        setTiming(target.timing as TimingType);
      }
      if (target.voice) {
        setVoice(target.voice as VoiceType);
      }
    }
    setActiveBeat(0);
    setIsPlaying(true);
    setIsMobileDrawerOpen(false);

    // Smooth scroll to message in chat
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
  };

  const handleNewReel = () => {
    setInput("");
    setSelectedMessageId(null);
    setIsMobileDrawerOpen(false);
    textareaRef.current?.focus();
    setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  };

  const handleDeleteHistoryItem = (messageId: string) => {
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== messageId);
      if (filtered.length === 0) return SHOWCASE_REELS;
      return filtered;
    });
    if (selectedMessageId === messageId) {
      setSelectedMessageId(null);
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeMessage = useMemo(() => {
    if (selectedMessageId) return messages.find((message) => message.id === selectedMessageId);
    return [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.beats);
  }, [messages, selectedMessageId]);

  const currentSparkCode = activeMessage?.sparkCode || "";
  const currentStoryboard = activeMessage?.storyboard;
  const sparkError = activeMessage?.generationError || null;

  const updateMessage = (messageId: string, patch: Partial<ChatMessageItem>) => {
    setMessages((previous) => previous.map((message) => message.id === messageId ? { ...message, ...patch } : message));
  };

  const handlePreviewReady = () => {
    if (activeMessage?.generationStatus !== "rendering" || !activeMessage.sparkCode) return;
    updateMessage(activeMessage.id, { generationStatus: "ready", generationError: undefined, text: "Your video is ready. Watch it here, or explore Wonder’s scene-by-scene direction below." });
  };

  const handlePreviewError = (message: string) => {
    if (!activeMessage || activeMessage.generationError === message) return;
    updateMessage(activeMessage.id, { generationStatus: "error", generationError: message, text: "Your storyboard is saved. Spark needs another try to finish the preview." });
  };

  const currentBeats = useMemo(() => {
    return activeMessage?.beats || [];
  }, [activeMessage]);

  const currentTheme =
    activeMessage?.theme || (format !== "auto" ? TEMPLATES[format] : undefined);

  const hasBeats = currentBeats.length > 0;

  // Autoplay ticker synced to each beat's real duration in the total video
  useEffect(() => {
    if (!isPlaying || currentBeats.length === 0 || isGenerating) return;
    const currentDur = currentBeats[activeBeat]?.durNum || 2.5;
    const timer = setTimeout(() => {
      setActiveBeat((prev) => (prev + 1) % currentBeats.length);
    }, currentDur * 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, currentBeats, activeBeat, isGenerating]);

  // Modal continuous playback timer cycling all beats across exact validated timestamps
  useEffect(() => {
    if (!isCodeModalOpen || !isModalPlaying || currentBeats.length === 0) return;
    const totalSec = Number(timing.replace("s", "")) || 15;
    const interval = setInterval(() => {
      setModalElapsed((prev) => {
        const next = +(prev + 0.1).toFixed(1);
        if (next >= totalSec) {
          setModalActiveBeatIndex(0);
          return 0;
        }
        // Match exact beat start and end from Wonder's validated storyboard
        const matchingIdx = currentBeats.findIndex((b) => {
          const bStart = typeof b.start === "number" ? b.start : 0;
          const bEnd = typeof b.end === "number" ? b.end : totalSec;
          return next >= bStart && next < bEnd;
        });
        if (matchingIdx !== -1) {
          setModalActiveBeatIndex(matchingIdx);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isCodeModalOpen, isModalPlaying, currentBeats, timing]);

  // Smooth scroll
  useEffect(() => {
    if (messages.length > 1) latestMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages.length, messages[messages.length - 1]?.storyboard]);

  const handleRetrySpark = async () => {
    const targetMessage = activeMessage;
    const sb = targetMessage?.storyboard;
    if (!targetMessage || isGenerating || isGeneratingCode) return;
    if (!sb) return handleOpenFullReel({ ...targetMessage, sparkCode: "" });
    setIsGeneratingCode(true);
    updateMessage(targetMessage.id, { generationStatus: "rendering", generationError: undefined, sparkCode: "" });
    try {
      const durationNum = sb.duration || Number((targetMessage.timing || timing).replace("s", "")) || 10;
      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboard: sb,
          topic: targetMessage.topic || targetMessage.text,
          duration: durationNum,
          timing: targetMessage.timing,
          format: targetMessage.format,
        }),
      });
      const codeJson = await readGenerationResponse(res, "Spark");
      if (codeJson.success && codeJson.data?.code) {
        updateMessage(targetMessage.id, { sparkCode: codeJson.data.code });
        setCodeModalContent(codeJson.data.code);
      } else {
        throw new Error(codeJson.error || "Spark animation synthesis failed");
      }
    } catch (err: any) {
      const msg = err.message || "Network error connecting to Spark 1.3";
      updateMessage(targetMessage.id, { generationStatus: "error", generationError: msg });
      setCodeModalContent("");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Pipeline B staging: keep the raw file client-side.
  const handleEditVideoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)) return;
    editVideoFileRef.current = file;
    setEditVideoName(
      file.name.length > 28 ? `${file.name.slice(0, 25)}...` : file.name
    );
    setEditVideoDuration(null);
    try {
      const url = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        if (Number.isFinite(probe.duration)) setEditVideoDuration(probe.duration);
        URL.revokeObjectURL(url);
      };
      probe.onerror = () => URL.revokeObjectURL(url);
      probe.src = url;
    } catch {}
  };

  const handleApproveCuts = async (message: ChatMessageItem) => {
    if (!message.pipelineBRunId || isGenerating || isGeneratingCode) return;
    const runId = message.pipelineBRunId;
    setIsGenerating(true);
    setGeneratingStep("Executing verified FFmpeg cuts based strictly on Wonder AI decisions...");

    updateMessage(message.id, {
      generationStatus: "rendering",
    });

    let pollTimer: NodeJS.Timeout | null = null;
    pollTimer = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/pipeline-b/status/${runId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const curStage = statusData?.state?.currentStage;
          if (curStage === "CLEAN_VIDEO_CREATED") {
            setGeneratingStep("FFmpeg cutting clean video & verifying duration on disk...");
          } else if (curStage === "VISUAL_PLAN_CREATED") {
            setGeneratingStep("Wonder Muse AI Stage B: Planning creative layouts, kinetic titles & assets...");
          } else if (curStage === "MOTION_GENERATED") {
            setGeneratingStep("Spark 1.3: Generating 60fps compositor code...");
          } else if (curStage === "PREVIEW_READY") {
            setGeneratingStep("Final video & interactive storyboard ready!");
          }
        }
      } catch {}
    }, 800);

    try {
      const resumeRes = await fetch("/api/pipeline-b/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      if (pollTimer) clearInterval(pollTimer);
      const data = await resumeRes.json();
      if (!resumeRes.ok || !data.success) {
        throw new Error(data.error || "Failed to resume Pipeline B execution");
      }

      const state = data.state;
      const finalVideoUrl = `/api/pipeline-b/media/${runId}/final`;

      const visualSegments = state?.editPlan?.visualSegments || [];
      const keepSegments = state?.editPlan?.keepSegments || [];
      const beats: Beat[] = (visualSegments.length > 0 ? visualSegments : keepSegments).map((seg: any, idx: number) => {
        const segStart = typeof seg?.start === "number" ? seg.start : Number(seg?.inSec ?? 0);
        const segEnd = typeof seg?.end === "number" ? seg.end : Number(seg?.outSec ?? segStart + 1);
        const segDur = Math.max(0.1, +(segEnd - segStart).toFixed(2));
        const zoom = typeof seg?.cameraZoom === "number" ? seg.cameraZoom : (typeof seg?.zoomScale === "number" ? seg.zoomScale : 1.0);
        const techniqueLabel = seg?.technique ? String(seg.technique).replace(/_/g, " ").toUpperCase() : "";
        const layoutLabel = seg?.layoutType ? String(seg.layoutType).replace(/_/g, " ") : "";

        return {
          id: idx + 1,
          label: `Scene ${idx + 1}${techniqueLabel ? ` • ${techniqueLabel}` : ""}`,
          duration: `${segDur.toFixed(1)}s`,
          durNum: segDur,
          start: +segStart.toFixed(2),
          end: +segEnd.toFixed(2),
          script: seg?.spokenReference || `Scene ${idx + 1} (${zoom > 1 ? `${zoom.toFixed(2)}x Punch-in` : "Wide Shot"})`,
          headline: seg?.headlineText || (techniqueLabel || (zoom > 1 ? `Punch-in ${zoom.toFixed(2)}x` : "Wide Shot")),
          visualDesc: seg?.motionIntent
            ? `${techniqueLabel} (${layoutLabel}) — ${seg.motionIntent}`
            : `Retained speech segment from ${segStart.toFixed(1)}s to ${segEnd.toFixed(1)}s`,
          motion: seg?.motionIntent || "Synchronized animated sticker & kinetic punch",
          camera: zoom > 1 ? `Dynamic ${zoom.toFixed(2)}x Zoom Punch-in` : "Static Wide Angle",
          transition: seg?.transitionDirection ? `${String(seg.transitionDirection).replace(/_/g, " ")} entrance` : "Cut",
        };
      });

      updateMessage(message.id, {
        generationStatus: "ready",
        generationError: undefined,
        videoUrl: finalVideoUrl,
        finalDownloadUrl: finalVideoUrl,
        beats: beats.length > 0 ? beats : message.beats,
        editPlan: state.editPlan,
        text: `✨ Wonder AI cuts executed & Spark 1.3 motion reel completed! Trimmed ${state?.editPlan?.cutSilenceDuration || 0}s. Clean video composited with 60fps kinetic graphics.`,
      });
    } catch (err: any) {
      if (pollTimer) clearInterval(pollTimer);
      updateMessage(message.id, {
        generationStatus: "error",
        generationError: err.message,
        text: `❌ Error cutting video: ${err.message}`,
      });
    } finally {
      if (pollTimer) clearInterval(pollTimer);
      setIsGenerating(false);
      setGeneratingStep("");
    }
  };

  const handleSend = async () => {
    // Auto-edit mode: activate Pipeline B (upload -> transcribe -> silence cut -> clean video -> overlays)
    if (studioMode === "autoEdit") {
      if (isGenerating || isGeneratingCode) return;
      const videoFile = editVideoFileRef.current;
      if (!videoFile) {
        editFileInputRef.current?.click();
        return;
      }

      setIsGenerating(true);
      setGeneratingStep("Validating media & uploading to Pipeline B...");

      const userNote = input.trim();
      const userScriptContent = editScript.trim();
      const userMsgId = Date.now().toString();
      const botMsgId = (Date.now() + 1).toString();

      const stagedUser: ChatMessageItem = {
        id: userMsgId,
        role: "user",
        text: `🎬 Auto-Edit: ${videoFile.name} (${Math.round(editVideoDuration || 0)}s)${userScriptContent ? " • Script provided" : ""}${userNote ? ` • Note: ${userNote}` : ""}`,
      };

      const clientRunId = `run-b-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).substring(2, 7)}`;
      const stagedReply: ChatMessageItem = {
        id: botMsgId,
        role: "assistant",
        text: "Pipeline B initiated: Uploading talking-head video to Wonder Muse AI Editorial Director...",
        generationStatus: "rendering",
        pipeline: "pipeline-b",
        pipelineBRunId: clientRunId,
      };

      setMessages((prev) => [...prev, stagedUser, stagedReply]);
      setSelectedMessageId(botMsgId);
      setInput("");

      let pollTimer: NodeJS.Timeout | null = null;

      try {
        const formData = new FormData();
        formData.append("video", videoFile);
        formData.append("runId", clientRunId);
        if (userScriptContent && userNote) {
          formData.append("userScript", `[Target Script]:\n${userScriptContent}\n\n[Director Instructions]:\n${userNote}`);
        } else if (userScriptContent) {
          formData.append("userScript", userScriptContent);
        } else if (userNote) {
          formData.append("userScript", userNote);
        }
        if (reviewCutsFirst) {
          formData.append("stopAtStage", "EDIT_PLANNED");
        }
        formData.append("templateId", "hormoziPunch");

        setGeneratingStep("Uploading talking-head video & extracting audio...");

        // Poll run status to update UI step in real-time as Wonder AI processes stages
        pollTimer = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/pipeline-b/status/${clientRunId}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const curStage = statusData?.state?.currentStage;
              if (curStage === "MEDIA_VALIDATED") {
                setGeneratingStep("Validating media streams & audio channels...");
              } else if (curStage === "TRANSCRIBED") {
                setGeneratingStep("Transcribing spoken speech with exact word-level timestamps...");
              } else if (curStage === "TRANSCRIPT_ALIGNED") {
                setGeneratingStep("Aligning transcript & computing deviation scores...");
              } else if (curStage === "EDIT_PLANNED") {
                setGeneratingStep("Wonder Muse AI Stage A: Analyzing stutters, pauses & protected speech...");
              } else if (curStage === "CUTS_VALIDATED") {
                setGeneratingStep("Validating approved cuts against spoken-word boundaries...");
              } else if (curStage === "CLEAN_VIDEO_CREATED") {
                setGeneratingStep("Executing verified FFmpeg cuts based strictly on Wonder AI decisions...");
              } else if (curStage === "VISUAL_PLAN_CREATED") {
                setGeneratingStep("Wonder Muse AI Stage B: Planning creative layouts, kinetic titles & assets...");
              } else if (curStage === "MOTION_GENERATED") {
                setGeneratingStep("Spark 1.3: Generating 60fps compositor code...");
              } else if (curStage === "PREVIEW_READY") {
                setGeneratingStep("Final video & interactive storyboard ready!");
              }
            }
          } catch {
            // Ignore polling errors
          }
        }, 800);

        const response = await fetch("/api/pipeline-b/upload", {
          method: "POST",
          body: formData,
        });

        if (pollTimer) clearInterval(pollTimer);
        const data = await response.json();

        if (!response.ok || !data.success) {
          const errMsg = data.error || "Failed to process video in Pipeline B";
          updateMessage(botMsgId, {
            generationStatus: "error",
            generationError: errMsg,
            text: `❌ Pipeline B error: ${errMsg}`,
          });
          return;
        }

        const runId = data.runId || clientRunId;
        const state = data.state;
        const keepSegments = state?.editPlan?.keepSegments || [];
        const cutDuration = Number(state?.editPlan?.cutSilenceDuration ?? 0).toFixed(1);
        const cutCount = state?.editPlan?.cutSilenceSegmentsCount || 0;
        const repCount = state?.editPlan?.cutRepetitionsCount || 0;
        const fillerCount = state?.editPlan?.cutFillersCount || 0;

        const visualPlan = state?.editPlan?.visualPlan || [];
        const visualSegments = state?.editPlan?.visualSegments || [];
        const animCount = visualSegments.length > 0 ? visualSegments.length : visualPlan.filter((v: any) => v.type === "image_overlay" || v.type === "icon_badge").length;

        // Map segments to Storyboard beats so the timeline is interactive
        const beats: Beat[] = (visualSegments.length > 0 ? visualSegments : keepSegments).map((seg: any, idx: number) => {
          const segStart = typeof seg?.start === "number" ? seg.start : Number(seg?.inSec ?? 0);
          const segEnd = typeof seg?.end === "number" ? seg.end : Number(seg?.outSec ?? segStart + 1);
          const segDur = Math.max(0.1, +(segEnd - segStart).toFixed(2));
          const zoom = typeof seg?.cameraZoom === "number" ? seg.cameraZoom : (typeof seg?.zoomScale === "number" ? seg.zoomScale : 1.0);

          const techniqueLabel = seg?.technique ? String(seg.technique).replace(/_/g, " ").toUpperCase() : "";
          const layoutLabel = seg?.layoutType ? String(seg.layoutType).replace(/_/g, " ") : "";

          return {
            id: idx + 1,
            label: `Scene ${idx + 1}${techniqueLabel ? ` • ${techniqueLabel}` : ""}`,
            duration: `${segDur.toFixed(1)}s`,
            durNum: segDur,
            start: +segStart.toFixed(2),
            end: +segEnd.toFixed(2),
            script: seg?.spokenReference || `Scene ${idx + 1} (${zoom > 1 ? `${zoom.toFixed(2)}x Punch-in` : "Wide Shot"})`,
            headline: seg?.headlineText || (techniqueLabel || (zoom > 1 ? `Punch-in ${zoom.toFixed(2)}x` : "Wide Shot")),
            visualDesc: seg?.motionIntent
              ? `${techniqueLabel} (${layoutLabel}) — ${seg.motionIntent}`
              : `Retained speech segment from ${segStart.toFixed(1)}s to ${segEnd.toFixed(1)}s`,
            motion: seg?.motionIntent || "Synchronized animated sticker & kinetic punch",
            camera: zoom > 1 ? `Dynamic ${zoom.toFixed(2)}x Zoom Punch-in` : "Static Wide Angle",
            transition: seg?.transitionDirection ? `${String(seg.transitionDirection).replace(/_/g, " ")} entrance` : "Cut",
          };
        });

        const cleanVideoUrl = `/api/pipeline-b/media/${runId}/clean`;
        const finalVideoUrl = `/api/pipeline-b/media/${runId}/final`;
        const isPausedAtEditorial = state?.currentStage === "EDIT_PLANNED";

        updateMessage(botMsgId, {
          generationStatus: isPausedAtEditorial ? "storyboarding" : "ready",
          generationError: undefined,
          pipeline: "pipeline-b",
          pipelineBRunId: runId,
          videoUrl: isPausedAtEditorial ? undefined : finalVideoUrl,
          sparkCode: data.motionCode || undefined,
          beats: beats.length > 0 ? beats : undefined,
          editPlan: state?.editPlan,
          storyboard: beats.length > 0 ? {
            globalDirection: {
              concept: state?.editPlan?.title || "Talking-Head Reel",
              visualStyle: state?.templateId || "hormoziPunch",
            },
            beats: beats.map((b) => ({
              id: b.id,
              role: b.label,
              start: b.start,
              end: b.end,
              duration: b.durNum,
              text: b.script,
              script: b.script,
              visualDesc: b.visualDesc,
              motion: "Synchronized animated sticker & kinetic punch",
            })),
            duration: beats.reduce((acc, b) => acc + (b.durNum || 0), 0),
          } : undefined,
          text: isPausedAtEditorial
            ? `✨ Wonder Muse Stage A Editorial Cleanup complete! Found ${cutCount} approved cut(s) (${cutDuration}s reduction) and protected ${state?.editPlan?.protectedRanges?.length || 0} speech ranges. Review decisions below, then click "Apply Cuts & Generate Reel" to execute FFmpeg cutting and Spark 1.3 motion overlays.`
            : `✨ Wonder AI Director & Pipeline B complete! Trimmed ${cutDuration}s across ${cutCount} pause(s)${repCount > 0 ? `, ${repCount} repetition retake(s)` : ""}${fillerCount > 0 ? `, ${fillerCount} vocal filler(s)` : ""}. Added ${animCount} Wonder-directed animated graphic stickers and burned synchronized kinetic subtitles.`,
        });
      } catch (err: any) {
        if (pollTimer) clearInterval(pollTimer);
        updateMessage(botMsgId, {
          generationStatus: "error",
          generationError: err.message || "Network error running Pipeline B",
          text: `❌ Failed to run Pipeline B: ${err.message || "Unknown error"}`,
        });
      } finally {
        if (pollTimer) clearInterval(pollTimer);
        setIsGenerating(false);
        setGeneratingStep("");
      }
      return;
    }

    const trimmed = input.trim();
    if (!trimmed || isGenerating || isGeneratingCode) return;
    const sceneEdit = trimmed.match(/^(?:edit|change|update)\s+scene\s+(\d+)\s*(?::|text\s+to)\s*([\s\S]+)$/i);
    if (sceneEdit && activeMessage?.storyboard) {
      const sceneIndex = Number(sceneEdit[1]) - 1;
      const replacement = sceneEdit[2].trim().replace(/^["“]|["”]$/g, "");
      if (sceneIndex < 0 || sceneIndex >= (activeMessage.beats?.length || 0) || !replacement) return;
      const beats = activeMessage.beats!.map((beat, index) => index === sceneIndex ? { ...beat, script: replacement } : beat);
      const storyboard = { ...activeMessage.storyboard, beats: activeMessage.storyboard.beats.map((beat: any, index: number) => index === sceneIndex ? { ...beat, text: replacement } : beat) };
      const editedMessage = { ...activeMessage, beats, storyboard, sparkCode: "", generationError: undefined };
      updateMessage(activeMessage.id, editedMessage);
      setInput("");
      await handleOpenFullReel(editedMessage);
      return;
    }

    const userMessage: ChatMessageItem = {
      id: Date.now().toString(),
      role: "user",
      text: isInternetEnabled ? `🌐 ${trimmed}` : trimmed,
    };

    // Pasted script: long or multi-line input is the user's own script.
    // Wonder must use it for the voiceover instead of inventing dialogues.
    const nonEmptyLines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    const isPastedScript = trimmed.length > 220 || nonEmptyLines.length >= 3;
    const userScript = isPastedScript ? trimmed : "";
    const scriptTopic = isPastedScript
      ? nonEmptyLines[0].slice(0, 120)
      : trimmed;

    const finalTopic = isInternetEnabled
      ? `${scriptTopic} (incorporating live web facts & trends)`
      : scriptTopic;

    const typingMessage: ChatMessageItem = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      text: "",
      typing: true,
      generationStatus: "storyboarding",
      topic: scriptTopic,
      timing,
      format,
      voice,
      voiceEnabled,
      voiceLang: voiceLangOf(voice),
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setSelectedMessageId(typingMessage.id);
    setInput("");
    setActiveBeat(0);
    setIsMobilePreviewOpen(false);
    setIsGenerating(true);
    setCodeModalContent("");
    setGeneratingStep(
      voiceEnabled
        ? `Directing voiceover in ${voiceLangOf(voice) === "HI" ? "Hindi" : voiceLangOf(voice) === "KN" ? "Kannada" : "English"} • ${voiceNameOf(voice)}${isPastedScript ? " • your script" : ""}...`
        : isInternetEnabled
          ? "Searching web trends & connecting to Meta muse-wonder-1.0..."
          : "Connecting to Meta muse-wonder-1.0 model..."
    );

    const stepTimer1 = setTimeout(() => {
      setGeneratingStep(
        isInternetEnabled
          ? "Incorporating live web insights into storyboard..."
          : "Director analyzing format & word counts..."
      );
    }, 700);

    const stepTimer2 = setTimeout(() => {
      setGeneratingStep("Generating format-specific visualDesc & beats...");
    }, 1500);

    try {
      const durationNum = Number(timing.replace("s", "")) || 10;
      const selectedTemplate = format === "auto" ? null : TEMPLATES[format] || null;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: finalTopic,
          duration: durationNum,
          timing,
          template: selectedTemplate,
          format: format === "auto" ? null : format,
          voice,
          language: voiceLangOf(voice),
          voiceName: voiceNameOf(voice),
          voiceoverEnabled: voiceEnabled,
          userScript,
          internet: isInternetEnabled,
        }),
      });

      const json = await readGenerationResponse(res, "Wonder");
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (json.success && json.data?.beats && json.data.beats.length > 0) {
        const theme = json.data.theme;
        const formatUsed = json.data.formatUsed || format;
        const styleHint = json.data.styleHint || "";
        const validatedStoryboard = json.data;

        const metaBeats: Beat[] = json.data.beats.map((b: any, idx: number) => ({
          id: b.id ?? idx,
          role: b.role || `Beat ${idx + 1}`,
          label: b.role || `Beat ${idx + 1}`,
          tone: (b.role || "reel").toLowerCase(),
          start: typeof b.start === "number" ? b.start : idx * 2.5,
          end: typeof b.end === "number" ? b.end : (idx + 1) * 2.5,
          duration: `${b.start ?? idx * 2}s - ${b.end ?? (idx + 1) * 2}s`,
          durNum: b.duration || (b.end && b.start ? b.end - b.start : 2.5),
          script: b.text || b.script || "",
          text: b.text || b.script || "",
          visualDesc: b.visualDesc || "",
          motion: b.motion || "",
          layout: b.layout || "9:16 vertical center",
          camera: b.camera || "",
          lighting: b.lighting || "",
          transition: b.transition || "",
          voiceover: b.voiceover || "",
          sound: b.sound || "",
          emphasis: b.emphasis || [],
        }));

        // Voiceover first: synthesize real audio, then re-time beats to the
        // measured durations so animation and voice stay locked by construction.
        let voiceTracks: VoiceTrack[] = [];
        let reelDuration = durationNum;
        if (voiceEnabled) {
          try {
            setGeneratingStep(`Voicing ${metaBeats.length} beats in ${voiceLangOf(voice) === "HI" ? "Hindi" : voiceLangOf(voice) === "KN" ? "Kannada" : "English"} • ${voiceNameOf(voice)}...`);
            const voiceRes = await fetch("/api/voiceover", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                beats: metaBeats.map((b) => ({
                  id: b.id,
                  voiceover: b.voiceover || b.script || b.text || "",
                  estDuration: b.durNum,
                })),
                voice,
                language: voiceLangOf(voice),
              }),
            });
            const voiceJson = await voiceRes.json().catch(() => null);
            if (!voiceRes.ok || !voiceJson?.success || !Array.isArray(voiceJson?.data?.tracks)) {
              throw new Error(voiceJson?.error || "Voiceover synthesis failed.");
            }
            voiceTracks = voiceJson.data.tracks;
            reelDuration = Number(voiceJson.data.totalDuration) || durationNum;

            // Re-time beats (page + storyboard) to the real audio timeline.
            voiceTracks.forEach((t, i) => {
              const beat = metaBeats[i];
              if (!beat) return;
              beat.start = t.start;
              beat.end = t.end;
              beat.durNum = Math.max(0.5, t.end - t.start);
              beat.duration = `${t.start}s - ${t.end}s`;
            });
            if (Array.isArray(validatedStoryboard.beats)) {
              validatedStoryboard.beats.forEach((sb: any, i: number) => {
                const t = voiceTracks[i];
                if (!sb || !t) return;
                sb.start = t.start;
                sb.end = t.end;
                sb.duration = Math.max(0.5, t.end - t.start);
              });
              validatedStoryboard.duration = reelDuration;
            }
          } catch (voiceErr: any) {
            console.warn("Voiceover synthesis error (continuing silent):", voiceErr);
            voiceTracks = [];
            reelDuration = durationNum;
          }
        }

        setGeneratingStep("Spark 1.3 generating React/TSX animation code...");

        updateMessage(typingMessage.id, {
          typing: false,
          text: voiceEnabled && voiceTracks.length
            ? `Wonder has planned your ${reelDuration}s narrated story. Explore the scenes while Spark brings them to life.`
            : `Wonder has planned your ${durationNum}s story. Explore the scenes while Spark brings them to life.`,
          beats: metaBeats,
          format: formatUsed,
          theme,
          styleHint,
          storyboard: validatedStoryboard,
          voiceTracks,
          generationStatus: "rendering",
        });

        // Pass complete validated storyboard JSON to /api/code
        let generatedSparkCode = "";
        try {
          const codeRes = await fetch("/api/code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storyboard: validatedStoryboard,
              topic: trimmed,
              duration: reelDuration,
              timing,
              format: formatUsed,
            }),
          });
          const codeJson = await readGenerationResponse(codeRes, "Spark");
          if (codeJson.success && codeJson.data?.code) {
            generatedSparkCode = codeJson.data.code;
            updateMessage(typingMessage.id, { sparkCode: generatedSparkCode });
            setCodeModalContent(generatedSparkCode);
            setIsMobilePreviewOpen(true);
          } else {
            throw new Error(codeJson.error || "Spark did not return animation code. Please retry.");
          }
        } catch (codeErr: any) {
          console.warn("Spark code synthesis error:", codeErr);
          updateMessage(typingMessage.id, {
            generationStatus: "error",
            text: "Your storyboard is saved. Spark needs another try to finish the preview.",
            generationError: codeErr.message || "Spark could not be reached. Your storyboard is saved below; retry the video.",
          });
        }
      } else {
        throw new Error(json.error || "Failed to generate beats");
      }
    } catch (err: any) {
      const message = err.message || "Wonder could not create the storyboard. Please submit your prompt again.";
      updateMessage(typingMessage.id, { typing: false, text: message, generationStatus: "error", generationError: message });
      setInput(trimmed);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsGenerating(false);
      setIsPlaying(true);
    }
  };

  const handleExport = () => {
    const payload = JSON.stringify(
      {
        format,
        timing,
        voice,
        beats: currentBeats,
      },
      null,
      2
    );

    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(payload);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = payload;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  const handleSelectPrompt = (prompt: string) => {
    setInput(prompt);
    setIsMobileDrawerOpen(false);
    textareaRef.current?.focus();
  };

  const handleOpenFullReel = async (message?: ChatMessageItem, targetBeatIndex: number = 0) => {
    const targetMessage = message || activeMessage;
    if (!targetMessage || !targetMessage.beats || targetMessage.beats.length === 0 || isGenerating || isGeneratingCode) return;
    setSelectedMessageId(targetMessage.id);

    setIsFullReelMode(true);
    setModalActiveBeatIndex(targetBeatIndex);
    const totalSec = Number((targetMessage.timing || timing).replace("s", "")) || 15;
    const initialElapsed = targetMessage.beats[targetBeatIndex]?.start ?? 0;
    setModalElapsed(initialElapsed);
    setIsModalPlaying(true);
    setIsCodeModalOpen(true);
    setModalTab("preview");
    setReplayKey((k) => k + 1);
    setIsGeneratingCode(true);
    if (targetMessage.sparkCode) {
      setCodeModalContent(targetMessage.sparkCode);
      setIsGeneratingCode(false);
      return;
    }
    updateMessage(targetMessage.id, { generationStatus: "rendering", generationError: undefined });

    setCodeModalContent(
      "// Connecting to Meta muse-spark-1.3...\n// Synthesizing & stitching all " +
        targetMessage.beats.length +
        " beats into complete " +
        (targetMessage.timing || timing) +
        " video reel component..."
    );

    try {
      const activeTheme =
        targetMessage.theme || (format !== "auto" ? TEMPLATES[format] : null);
      const durationNum = Number((targetMessage.timing || timing).replace("s", "")) || 15;

      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboard: targetMessage.storyboard,
          beats: targetMessage.beats,
          duration: durationNum,
          timing: targetMessage.timing || timing,
          theme: activeTheme,
          format: targetMessage.format || format,
          topic: targetMessage.topic || targetMessage.text || input || "Paper Reel",
        }),
      });

      const data = await readGenerationResponse(res, "Spark");
      if (data.success && data.data?.code) {
        setCodeModalContent(data.data.code);
        updateMessage(targetMessage.id, { sparkCode: data.data.code });
      } else {
        const errMsg = data.error || "Meta Muse Spark 1.3 failed to synthesize animation code.";
        updateMessage(targetMessage.id, { generationStatus: "error", generationError: errMsg });
        setCodeModalContent("");
      }
    } catch (err: any) {
      const errMsg = err.message || "Network error connecting to Spark 1.3.";
      updateMessage(targetMessage.id, { generationStatus: "error", generationError: errMsg });
      setCodeModalContent("");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleOpenCodeForBeat = (beat: Beat) => {
    // Jump directly to this beat inside the continuous full-stitched reel
    const targetIdx = currentBeats.findIndex((b) => b.id === beat.id);
    handleOpenFullReel(activeMessage, targetIdx !== -1 ? targetIdx : 0);
  };

  const handleCopyCode = () => {
    if (
      !codeModalContent ||
      isGeneratingCode ||
      codeModalContent.startsWith("// Connecting")
    )
      return;
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(codeModalContent);
    }
    setIsCodeCopied(true);
    setTimeout(() => setIsCodeCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    if (
      !codeModalContent ||
      isGeneratingCode ||
      codeModalContent.startsWith("// Connecting")
    )
      return;
    const blob = new Blob([codeModalContent], {
      type: "text/typescript;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isFullReelMode
      ? `FullReel_${timing}.tsx`
      : `Beat_${codeModalBeat?.id ?? 1}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentFormat = FORMAT_OPTIONS.find((f) => f.id === format);

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen w-full bg-[#ECEAE3] studio-ambient text-[#141414] antialiased overflow-x-clip selection:bg-[#F6D9CC] selection:text-[#E4491B]"
      style={{
        paddingTop: "var(--safe-area-inset-top)",
      }}
    >
      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#E4491B]/30 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[310px] bg-[#F7F5EF] border-r border-[#D5D2C8] p-5 flex flex-col shadow-2xl animate-popover">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#E4491B] via-[#E4491B] to-[#E4491B] text-white grid place-items-center serif text-[18px] leading-none shadow-sm shadow-[#E4491B]/25 select-none">
                  P
                </div>
                <span className="serif text-[20px] tracking-tight font-medium">
                  PAPER STUDIO
                </span>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#ECEAE3] border border-[#D5D2C8] grid place-items-center hover:bg-[#EAE7DF] transition active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mobile Navigation Tabs: Script first, Edit second */}
            <div className="grid grid-cols-2 gap-1.5 p-1 mb-4 rounded-xl bg-[#ECEAE3] border border-[#D5D2C8] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveHeaderTab("script");
                  setIsMobileDrawerOpen(false);
                }}
                className={`py-2 rounded-lg mono text-[12px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                  activeHeaderTab === "script"
                    ? "bg-[#141414] text-white shadow-xs"
                    : "text-[#6B6A64] hover:text-[#141414]"
                }`}
              >
                <BookOpen size={13} className={activeHeaderTab === "script" ? "text-[#E4491B]" : ""} />
                <span>Script</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveHeaderTab("edit");
                  setIsMobileDrawerOpen(false);
                }}
                className={`py-2 rounded-lg mono text-[12px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                  activeHeaderTab === "edit"
                    ? "bg-[#141414] text-white shadow-xs"
                    : "text-[#6B6A64] hover:text-[#141414]"
                }`}
              >
                <Scissors size={13} className={activeHeaderTab === "edit" ? "text-[#E4491B]" : ""} />
                <span>Edit</span>
              </button>
            </div>

            <button
              onClick={handleNewReel}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-[#E4491B] via-[#E4491B] to-[#C93D14] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,85,32,0.25)] hover:brightness-110 active:scale-[0.98] transition mb-4 shrink-0"
            >
              <Plus size={16} />
              <span>New Studio Reel</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] mono uppercase tracking-widest text-[#6B6A64] mb-3">
              <History size={12} className="text-[#E4491B]" />
              <span>Studio History</span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {messages
                .filter((m) => m.role === "assistant" && (m.topic || m.beats))
                .slice()
                .reverse()
                .map((m) => {
                  const isActive = activeMessage?.id === m.id;
                  const title = m.topic || m.text.slice(0, 35) || "Studio Reel";
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectHistoryItem(m.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all text-[13px] leading-[1.35] ${
                        isActive
                          ? "bg-gradient-to-r from-[#F6D9CC] to-[#ECEAE3] border-[#E4491B] shadow-sm text-[#141414]"
                          : "bg-[#F7F5EF] border-[#D5D2C8] text-[#141414] hover:border-[#E4491B]/40"
                      }`}
                    >
                      <span className="block font-medium line-clamp-2">{title}</span>
                      <div className="mt-2 flex items-center gap-1.5 mono text-[10px] text-[#6B6A64]">
                        <span className="px-1.5 py-0.5 rounded bg-[#F6D9CC] text-[#E4491B] font-medium">{m.timing || "15s"}</span>
                        <span>•</span>
                        <span>{m.format || "paperCard"}</span>
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="mt-auto pt-4 border-t border-[#D5D2C8] mono text-[11px] text-[#6B6A64]">
              v2.4 • 60fps Paper engine active
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        suppressHydrationWarning
        className="sticky top-0 z-30 backdrop-blur-[16px] bg-[#ECEAE3]/85 border-b border-[#D5D2C8]"
        style={{ top: "var(--safe-area-inset-top)" }}
      >
        <div
          suppressHydrationWarning
          className="mx-auto max-w-[1600px] w-full h-[64px] px-4 lg:px-8 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open menu"
              className="lg:hidden w-10 h-10 rounded-full bg-[#F7F5EF] border border-[#D5D2C8] grid place-items-center shadow-xs hover:bg-[#EAE7DF] transition active:scale-95"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0 flex items-center justify-center">
                <Pip mood="idle" size={32} interactive={true} />
              </div>
              <span className="serif text-[19px] lg:text-[21px] tracking-[-0.02em] font-medium select-none text-[#141414]">
                PAPER STUDIO
              </span>
              <span className="hidden sm:inline-flex ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#E4491B]/15 to-[#C93D14]/15 border border-[#E4491B]/30 text-[#E4491B] mono text-[10px] font-semibold tracking-wider">
                BETA
              </span>
            </div>
          </div>

          {/* Header Navigation Tabs: Script first, Edit second */}
          <nav aria-label="Main Navigation" className="flex items-center gap-1 p-1 rounded-full bg-[#F7F5EF] border border-[#D5D2C8] shadow-xs">
            <button
              type="button"
              onClick={() => setActiveHeaderTab("script")}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full mono text-[12px] font-bold transition-all active:scale-95 ${
                activeHeaderTab === "script"
                  ? "bg-[#141414] text-white shadow-xs"
                  : "text-[#6B6A64] hover:text-[#141414] hover:bg-[#ECEAE3]"
              }`}
            >
              <BookOpen size={13} className={activeHeaderTab === "script" ? "text-[#E4491B]" : ""} />
              <span>Script</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHeaderTab("edit")}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full mono text-[12px] font-bold transition-all active:scale-95 ${
                activeHeaderTab === "edit"
                  ? "bg-[#141414] text-white shadow-xs"
                  : "text-[#6B6A64] hover:text-[#141414] hover:bg-[#ECEAE3]"
              }`}
            >
              <Scissors size={13} className={activeHeaderTab === "edit" ? "text-[#E4491B]" : ""} />
              <span>Edit</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F5EF] border border-[#D5D2C8] shadow-xs select-none">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" />
            <span className="mono text-[11px] uppercase tracking-widest text-[#6B6A64]">
              Format
            </span>
            <span className="mono text-[12px] font-medium text-[#141414]">
              {currentFormat?.label || "Paper Card"}
            </span>
            <span className="w-px h-3 bg-[#EAE7DF] mx-1" />
            <Clock size={12} className="text-[#E4491B]" />
            <span className="mono text-[12px] text-[#141414] font-medium">{timing}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="hidden sm:flex items-center gap-2 px-4 h-9 rounded-full bg-[#F7F5EF] border border-[#D5D2C8] mono text-[12px] font-medium shadow-xs hover:border-[#E4491B]/40 hover:bg-[#EAE7DF] transition active:scale-95 text-[#141414]"
            >
              {isCopied ? (
                <Check size={14} className="text-emerald-600" />
              ) : (
                <FileJson size={14} className="text-[#E4491B]" />
              )}
              <span>{isCopied ? "Copied" : "Export JSON"}</span>
            </button>

            <button
              onClick={handleExport}
              aria-label="Copy JSON"
              className="sm:hidden w-9 h-9 rounded-full bg-[#F7F5EF] border border-[#D5D2C8] grid place-items-center shadow-xs hover:bg-[#EAE7DF] transition active:scale-95 text-[#141414]"
            >
              {isCopied ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>

            <div className="w-9 h-9 rounded-full bg-[#E4491B] text-white grid place-items-center mono text-[12px] select-none font-medium shadow-xs">
              AK
            </div>
          </div>
        </div>
      </header>

      {/* Main Viewport: Script (Story Bank) vs Edit (Studio) */}
      {activeHeaderTab === "script" ? (
        <div className="mx-auto max-w-[1600px] w-full min-h-[calc(100vh-64px)] p-4 sm:p-6">
          <StoryBankView hideHeader={true} onSwitchToStudio={() => setActiveHeaderTab("edit")} />
        </div>
      ) : (
        <>
          {/* Main Studio Viewport */}
          <div className="mx-auto max-w-[1600px] w-full flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Left History Sidebar */}
        <aside className="hidden lg:flex w-[280px] shrink-0 border-r-2 border-[#141414] bg-[#ECEAE3] flex-col p-4 sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
          {/* Top: New Studio Reel button */}
          <button
            onClick={handleNewReel}
            className="w-full py-2.5 px-3.5 rounded-2xl border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] transition mb-4 shrink-0"
          >
            <Plus size={16} />
            <span>New Studio Reel</span>
          </button>

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 mono text-[11px] uppercase tracking-[0.12em] text-[#141414] font-bold">
              <History size={13} className="text-[#E4491B]" />
              <span>Studio History</span>
            </div>
            <span className="mono text-[10px] px-2 py-0.5 rounded-full border border-[#141414] bg-[#FFFFFF] text-[#141414] font-bold">
              {messages.filter((m) => m.role === "assistant" && (m.topic || m.beats)).length} reels
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
            {messages
              .filter((message) => message.role === "assistant" && (message.topic || message.beats))
              .slice()
              .reverse()
              .map((message) => {
                const isActive = activeMessage?.id === message.id;
                const title = message.topic || message.text.slice(0, 35) || "Studio Reel";
                return (
                  <div
                    key={message.id}
                    onClick={() => handleSelectHistoryItem(message.id)}
                    className={`group relative w-full rounded-2xl border-2 p-3 text-left transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-[#F6D9CC] border-[#141414] shadow-[3px_3px_0px_#141414]"
                        : "bg-[#FFFFFF] border-[#141414]/30 hover:border-[#141414] hover:shadow-[2px_2px_0px_#141414]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`block line-clamp-2 text-[13px] font-bold leading-[1.35] ${isActive ? "text-[#141414]" : "text-[#141414]"}`}>
                        {title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(message.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#6B6A64] hover:text-rose-500 hover:bg-rose-50 rounded-md transition shrink-0"
                        title="Delete reel"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-1.5 mono text-[10.5px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-md bg-[#F6D9CC] text-[#E4491B] border border-[#E4491B]/20 font-medium">
                          {message.timing || "15s"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-[#ECEAE3] text-[#6B6A64] border border-[#D5D2C8]">
                          {message.format || "paperCard"}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {message.generationStatus === "ready" ? "Ready" : "Draft"}
                      </span>
                    </div>

                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-[#E4491B] to-[#C93D14] rounded-r-full" />
                    )}
                  </div>
                );
              })}
          </div>

          {/* Quick Ideas Section */}
          <div className="mt-4 pt-3 border-t border-[#D5D2C8]/70">
            <div className="mono text-[10px] uppercase tracking-wider text-[#6B6A64] font-semibold mb-2 px-1">
              Quick Prompt Ideas
            </div>
            <div className="space-y-1.5">
              {PROMPT_SUGGESTIONS.slice(0, 2).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSelectPrompt(prompt)}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-[#ECEAE3] border border-transparent hover:border-[#D5D2C8] hover:bg-[#EAE7DF] transition text-[12px] text-[#444] line-clamp-1 flex items-center justify-between"
                >
                  <span className="truncate">{prompt}</span>
                  <Sparkles size={11} className="text-[#E4491B] shrink-0 ml-1 opacity-70" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <div className="rounded-[18px] bg-gradient-to-br from-[#E4491B] via-[#111113] to-[#251711] text-[#FFFFFF] p-3.5 border border-[#E4491B]/20 shadow-md">
              <div className="serif text-[17px] leading-[1.15] text-[#FFE8DC]">
                Studio cuts, not slides.
              </div>
              <div className="mono text-[10px] text-[#A1A1AA] mt-1.5 leading-[1.4]">
                Paper physics + 60fps real type. Export as code.
              </div>
            </div>
          </div>
        </aside>

        {/* Center Chat View */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 lg:py-10 space-y-6 lg:space-y-8 pb-[140px] lg:pb-[160px]"
          >
            {messages.map((message, messageIndex) => {
              const isUser = message.role === "user";
              const isSelectedReel = activeMessage?.id === message.id;
              return (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  ref={messageIndex === messages.length - 1 ? latestMessageRef : undefined}
                  className={`flex w-full max-w-[780px] mx-auto scroll-mt-24 transition-all duration-300 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {isUser ? (
                    <div className="max-w-[82%] lg:max-w-[65%] flex flex-col items-end gap-1.5">
                      <div className="px-5 py-3 rounded-[22px] rounded-br-[6px] bg-gradient-to-r from-[#E4491B] via-[#E4491B] to-[#C93D14] text-white shadow-[0_8px_24px_-8px_rgba(255,85,32,0.4)] text-[15px] leading-[1.45] font-normal">
                        {message.text}
                      </div>
                      <div className="mono text-[10px] tracking-widest uppercase text-[#6B6A64] mr-1">
                        You • now
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-2">
                      <div className={`rounded-[20px] bg-[#F7F5EF] border transition-all duration-300 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden ${
                        isSelectedReel
                          ? "border-[#E4491B] ring-4 ring-[#E4491B]/10 shadow-[0_16px_40px_-16px_rgba(255,85,32,0.2)]"
                          : "border-[#D5D2C8]"
                      }`}>
                        {/* Single Unified Header */}
                        <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#D5D2C8]/60 bg-[#ECEAE3]/50">
                          <div className="flex items-center gap-2.5">
                            <div className="shrink-0 flex items-center justify-center">
                              <Pip
                                mood={
                                  message.generationStatus === "ready"
                                    ? "happy"
                                    : message.generationStatus === "error"
                                    ? "thinking"
                                    : message.generationStatus === "storyboarding" ||
                                      message.generationStatus === "rendering" ||
                                      message.typing ||
                                      (isGenerating && messageIndex === messages.length - 1)
                                    ? "writing"
                                    : "idle"
                                }
                                size={28}
                                interactive={false}
                              />
                            </div>
                            <div>
                              <div className="mono text-[11px] font-bold tracking-[0.08em] text-[#141414] flex items-center gap-1.5">
                                <span>PIP • PAPER STUDIO</span>
                                {isSelectedReel && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-[#F6D9CC] text-[#E4491B] text-[8.5px] uppercase font-semibold">Active In Preview</span>
                                )}
                              </div>
                              <div className="mono text-[9.5px] text-[#6B6A64] flex items-center gap-1">
                                <span className="capitalize">{message.format || "paperCard"}</span>
                                <span>•</span>
                                <span>{message.timing || "15s"}</span>
                                <span>•</span>
                                <span>{message.voice || "EN-IN"}</span>
                                {message.beats && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-[#8B4826]">{message.beats.length} scenes</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border mono text-[9.5px] font-semibold ${
                            message.generationStatus === "ready"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : message.generationStatus === "storyboarding"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : message.generationStatus === "rendering"
                              ? "bg-sky-50 border-sky-200 text-sky-700"
                              : message.generationStatus === "error"
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-[#ECEAE3] border-[#D5D2C8] text-[#6B6A64]"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              message.generationStatus === "ready"
                                ? "bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"
                                : message.generationStatus === "storyboarding"
                                ? "bg-amber-500 animate-ping"
                                : message.generationStatus === "rendering"
                                ? "bg-sky-500 animate-pulse"
                                : message.generationStatus === "error"
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            }`} />
                            <span>
                              {message.generationStatus === "storyboarding" ? "WONDER IS PLANNING" : message.generationStatus === "rendering" ? "SPARK IS CREATING" : message.generationStatus === "error" ? "NEEDS A RETRY" : message.generationStatus === "ready" ? "VIDEO READY" : "STORYBOARD READY"}
                            </span>
                          </div>
                        </div>

                        {message.typing ? (
                          <div className="px-4.5 pb-4.5 pt-3 flex flex-col gap-2.5">
                            <div className="flex items-center gap-2 mono text-[11.5px] font-semibold text-[#E4491B]">
                              <Disc3 size={15} className="animate-spin text-[#E4491B]" />
                              <span>Wonder is crafting your storyboard...</span>
                            </div>
                            <div className="mono text-[10.5px] text-[#6B6A64] bg-[#ECEAE3] border border-[#D5D2C8] rounded-lg px-3 py-2 flex items-center justify-between">
                              <span>{generatingStep || "Generating 60fps paper physics..."}</span>
                              <Loader2 size={12} className="animate-spin text-[#E4491B]" />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Expandable Prompt: 1 line by default */}
                            <div className="px-4 py-2 border-b border-[#D5D2C8]/40 bg-[#ECEAE3]/20">
                              <button
                                type="button"
                                onClick={() => togglePrompt(message.id)}
                                className="w-full flex items-center justify-between gap-3 text-left group"
                                title={expandedPromptIds[message.id] ? "Click to collapse prompt" : "Click to expand prompt"}
                              >
                                <div className="min-w-0 flex-1 flex items-baseline gap-2">
                                  <span className="mono text-[9px] uppercase tracking-wider font-bold text-[#E4491B] shrink-0">
                                    PROMPT
                                  </span>
                                  <span className={`text-[#332B22] ${
                                    expandedPromptIds[message.id]
                                      ? "text-[14px] leading-relaxed break-words whitespace-pre-wrap serif"
                                      : "text-[12.5px] truncate block serif"
                                  }`}>
                                    {message.text}
                                  </span>
                                </div>
                                <div className="shrink-0 flex items-center gap-1 mono text-[9px] uppercase font-semibold text-[#6B6A64] group-hover:text-[#E4491B] transition bg-[#ECEAE3] border border-[#D5D2C8] rounded-full px-2 py-0.5 shadow-2xs">
                                  <span>{expandedPromptIds[message.id] ? "Collapse" : "Expand"}</span>
                                  <ChevronDown
                                    size={11}
                                    className={`transition-transform duration-200 ${
                                      expandedPromptIds[message.id] ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                              </button>
                            </div>

                            {(message.beats || message.editPlan) && (
                              <WonderStoryboard
                                beats={message.beats || []}
                                storyboard={message.storyboard}
                                editPlan={message.editPlan}
                                pipeline={message.pipeline}
                                pipelineBRunId={message.pipelineBRunId}
                                status={message.generationStatus}
                                error={message.generationError}
                                timing={message.timing}
                                onEdit={(scene) => { setSelectedMessageId(message.id); setInput(`Edit scene ${scene}: `); textareaRef.current?.focus(); }}
                                disabled={isGenerating || isGeneratingCode}
                                onPlay={() => handleOpenFullReel(message)}
                                onRetry={() => handleOpenFullReel({ ...message, sparkCode: "" })}
                                onApproveCuts={() => handleApproveCuts(message)}
                                unifiedMode={true}
                              />
                            )}
                          </>
                        )}
                      </div>

                      {!message.typing && (
                        <div className="mono text-[9px] tracking-widest uppercase text-[#6B6A64] ml-1.5 flex items-center gap-1.5">
                          <span>Paper Engine • 60fps real type</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {hasBeats && (
              <div className="lg:hidden flex justify-center pt-2">
                <button
                  onClick={() => setIsMobilePreviewOpen((prev) => !prev)}
                  className="px-4 py-2 rounded-full bg-[#E4491B] text-white mono text-[12px] flex items-center gap-2 shadow-lg active:scale-95 transition"
                >
                  <Play size={14} />
                  <span>
                    {isMobilePreviewOpen
                      ? "Hide preview"
                      : "Show 9:16 preview"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Sticky Capsule Input */}
          <div className="sticky bottom-0 z-20 px-3 lg:px-8 pb-[calc(14px+var(--safe-area-inset-bottom,0px))] pt-2 bg-gradient-to-t from-[#ECEAE3] via-[#ECEAE3]/95 to-transparent">
            <div className="mx-auto max-w-[780px]">
              <div className="relative">
                {activePopover && (
                  <div className="absolute bottom-full mb-3 left-0 right-0 flex justify-start z-30">
                    <div className="rounded-[20px] bg-[#F7F5EF] border border-[#D5D2C8] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-2 w-[320px] max-w-[92vw] animate-popover">
                      {activePopover === "format" && (
                        <div className="space-y-1">
                          <div className="px-3 py-2 mono text-[11px] uppercase tracking-widest text-[#6B6A64] font-semibold">
                            Format • Paper engine
                          </div>
                          {FORMAT_OPTIONS.map((f) => {
                            const isSelected = format === f.id;
                            return (
                              <button
                                key={f.id}
                                onClick={() => {
                                  setFormat(f.id);
                                  setActivePopover(null);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-left transition ${
                                  isSelected
                                    ? "bg-gradient-to-r from-[#E4491B] to-[#E4491B] text-white shadow-xs"
                                    : "hover:bg-[#EAE7DF] text-[#141414]"
                                }`}
                              >
                                <span
                                  className="w-7 h-7 rounded-full border border-[#D5D2C8] grid place-items-center text-[11px] font-bold shrink-0 shadow-xs"
                                  style={{
                                    background: f.swatch,
                                    color:
                                      f.id === "blackNeon" ? "white" : "#111",
                                  }}
                                >
                                  Aa
                                </span>
                                <span className="flex-1">
                                  <span className="block text-[13px] font-semibold">
                                    {f.label}
                                  </span>
                                  <span
                                    className={`block mono text-[10.5px] ${
                                      isSelected
                                        ? "text-white/70"
                                        : "text-[#6B6A64]"
                                    }`}
                                  >
                                    {f.desc}
                                  </span>
                                </span>
                                {isSelected && <Check size={16} className="text-[#E4491B]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {activePopover === "timing" && (
                        <div className="space-y-1">
                          <div className="px-3 py-2 mono text-[11px] uppercase tracking-widest text-[#6B6A64] font-semibold">
                            Duration • Word budget
                          </div>
                          {TIMING_OPTIONS.map((t) => {
                            const isSelected = timing === t.id;
                            return (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setTiming(t.id);
                                  setActivePopover(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[14px] text-left transition ${
                                  isSelected
                                    ? "bg-gradient-to-r from-[#E4491B] to-[#E4491B] text-white shadow-xs"
                                    : "hover:bg-[#EAE7DF] text-[#141414]"
                                }`}
                              >
                                <span className="flex items-center gap-2.5">
                                  <span
                                    className={`w-7 h-7 rounded-full grid place-items-center ${
                                      isSelected
                                        ? "bg-white/15"
                                        : "bg-[#ECEAE3] border border-[#D5D2C8]"
                                    }`}
                                  >
                                    <Clock size={13} className={isSelected ? "text-white" : "text-[#E4491B]"} />
                                  </span>
                                  <span>
                                    <span className="block text-[13px] font-semibold">
                                      {t.label}
                                    </span>
                                    <span
                                      className={`block mono text-[10.5px] ${
                                        isSelected
                                          ? "text-white/70"
                                          : "text-[#6B6A64]"
                                      }`}
                                    >
                                      {t.words}
                                    </span>
                                  </span>
                                </span>
                                {isSelected && <Check size={16} className="text-[#E4491B]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {activePopover === "voice" && (
                        <div className="space-y-2">
                          <div className="px-3 py-2 mono text-[11px] uppercase tracking-widest text-[#6B6A64] font-semibold">
                            Voice • Dub
                          </div>

                          {/* Voiceover on/off toggle — default off */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={voiceEnabled}
                            onClick={() => setVoiceEnabled((prev) => !prev)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-left transition hover:bg-[#EAE7DF] text-[#141414]"
                          >
                            <span
                              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                                voiceEnabled ? "bg-[#E4491B]" : "bg-[#EAE7DF]"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#F7F5EF] shadow transition-all ${
                                  voiceEnabled ? "left-[18px]" : "left-0.5"
                                }`}
                              />
                            </span>
                            <span className="flex-1">
                              <span className="block text-[13px] font-semibold">
                                Voiceover {voiceEnabled ? "On" : "Off"}
                              </span>
                              <span className="block mono text-[10.5px] text-[#6B6A64]">
                                {voiceEnabled
                                  ? "Wonder writes speakable lines"
                                  : "Turn on for narrated reels"}
                              </span>
                            </span>
                          </button>

                          {/* Language tabs — English / Hindi / Kannada */}
                          <div className="flex gap-1.5 px-3">
                            {VOICE_LANGUAGES.map((lang) => {
                              const isActive = voiceLangOf(voice) === lang.id;
                              return (
                                <button
                                  key={lang.id}
                                  type="button"
                                  title={lang.note}
                                  onClick={() => {
                                    if (!isActive) {
                                      const first = VOICE_OPTIONS.find(
                                        (o) => o.lang === lang.id
                                      );
                                      if (first) setVoice(first.id);
                                    }
                                  }}
                                  className={`flex-1 px-2 py-1.5 rounded-full mono text-[11px] font-semibold transition active:scale-95 ${
                                    isActive
                                      ? "bg-[#E4491B] text-white shadow-xs"
                                      : "bg-[#ECEAE3] text-[#6B6A64] hover:text-[#141414] border border-[#D5D2C8]"
                                  }`}
                                >
                                  {lang.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Voices for the active language */}
                          {VOICE_OPTIONS.filter(
                            (v) => v.lang === voiceLangOf(voice)
                          ).map((v) => {
                            const isSelected = voice === v.id;
                            return (
                              <button
                                key={v.id}
                                onClick={() => {
                                  setVoice(v.id);
                                  setVoiceEnabled(true);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-left transition ${
                                  isSelected
                                    ? "bg-gradient-to-r from-[#E4491B] to-[#E4491B] text-white shadow-xs"
                                    : "hover:bg-[#EAE7DF] text-[#141414]"
                                }`}
                              >
                                <span className="text-[18px]">{v.flag}</span>
                                <span className="flex-1">
                                  <span className="block text-[13px] font-semibold">
                                    {v.label}
                                  </span>
                                  <span
                                    className={`block mono text-[10.5px] ${
                                      isSelected
                                        ? "text-white/70"
                                        : "text-[#6B6A64]"
                                    }`}
                                  >
                                    {v.name}
                                  </span>
                                </span>
                                {isSelected &&
                                  (voiceEnabled ? (
                                    <span
                                      className="flex items-end gap-[2.5px] h-4"
                                      aria-label="Voiceover active"
                                    >
                                      {[0, 1, 2, 3].map((i) => (
                                        <span
                                          key={i}
                                          className="w-[3px] rounded-full bg-[#E4491B] animate-pulse"
                                          style={{
                                            height: `${6 + ((i * 5) % 9)}px`,
                                            animationDelay: `${i * 0.18}s`,
                                          }}
                                        />
                                      ))}
                                    </span>
                                  ) : (
                                    <Check
                                      size={16}
                                      className="text-[#E4491B]"
                                    />
                                  ))}
                              </button>
                            );
                          })}
                          <div className="px-3 pb-1 mono text-[10px] text-[#A8A094]">
                            Paste your own script in chat to use it as the
                            voiceover, or leave it to Wonder.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode Switch above the chat bar: Create (Pipeline A) vs Auto-edit (Pipeline B) */}
                <div className="flex items-center gap-2 pb-2">
                  <div
                    className="h-8 rounded-full border-2 border-[#141414] overflow-hidden flex items-center bg-[#FFFFFF] shadow-[1px_1px_0px_#141414]"
                    role="tablist"
                    aria-label="Studio mode"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioMode === "create"}
                      onClick={() => {
                        setStudioMode("create");
                        setActivePopover(null);
                      }}
                      title="Create — animation pipeline"
                      className={`h-full px-3 sm:px-4 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                        studioMode === "create"
                          ? "bg-[#141414] text-white"
                          : "text-[#141414] hover:bg-[#ECEAE3]"
                      }`}
                    >
                      <Clapperboard size={12} />
                      <span>Create</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={studioMode === "autoEdit"}
                      onClick={() => {
                        setStudioMode("autoEdit");
                        setActivePopover(null);
                      }}
                      title="Auto-edit — raw video to edited reel"
                      className={`h-full px-3 sm:px-4 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                        studioMode === "autoEdit"
                          ? "bg-[#E4491B] text-white"
                          : "text-[#141414] hover:bg-[#ECEAE3]"
                      }`}
                    >
                      <Scissors size={12} />
                      <span>Auto-edit</span>
                    </button>
                  </div>
                  <span className="mono text-[10px] font-semibold text-[#6B6A64]">
                    {studioMode === "create"
                      ? "Pipeline A • Wonder & Spark 1.3 Code Animation"
                      : "Pipeline B • Talking-Head Auto Video Editor"}
                  </span>
                </div>

                {/* Structured, Aligned Studio Input Console */}
                <div className="rounded-[20px] bg-[#FFFFFF] border-2 border-[#141414] shadow-[4px_4px_0px_#141414] focus-within:border-[#E4491B] focus-within:shadow-[4px_4px_0px_#E4491B] transition-all overflow-hidden">
                  {/* Auto-edit running-script box — Pipeline B only */}
                  {studioMode === "autoEdit" && showEditScript && (
                    <div className="px-3.5 pt-2.5">
                      <div className="rounded-[14px] border-2 border-dashed border-[#141414]/30 bg-[#F6F4EE] p-2.5">
                        <div className="mono text-[10px] uppercase tracking-widest text-[#6B6A64] font-semibold px-1 pb-1.5">
                          Pipeline B Script — AI matches speech to this
                        </div>
                        <textarea
                          value={editScript}
                          onChange={(e) => setEditScript(e.target.value)}
                          placeholder="Paste the script you spoke (optional). Pipeline B cuts pauses & filler words, keeping matching speech."
                          rows={3}
                          className="w-full resize-y bg-transparent outline-none border-none text-[13px] leading-[1.5] text-[#141414] placeholder:text-[#6B6A64]/60 min-h-[64px] max-h-[160px]"
                        />
                        {editScript.trim() && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setEditScript("")}
                              className="mono text-[10px] text-[#6B6A64] hover:text-[#E4491B] font-semibold transition"
                            >
                              Clear script
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Top: Text Input + Clear button */}
                  <div className="px-3.5 pt-2 pb-1 relative flex items-start gap-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                        if (e.key === "Escape") {
                          setActivePopover(null);
                        }
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.style.height = "auto";
                        target.style.height = `${Math.min(
                          target.scrollHeight,
                          104
                        )}px`;
                      }}
                      placeholder={
                        studioMode === "autoEdit"
                          ? "Pipeline B: Add an editor instruction (optional) — e.g. 'cut pauses, punch in on key points'"
                          : "Pipeline A: Ask anything... e.g., 'Explain quantum computing in 5s' or 'Why paper cards convert better'"
                      }
                      rows={1}
                      className="w-full resize-none bg-transparent outline-none border-none text-[14px] sm:text-[15px] leading-[1.4] text-[#141414] placeholder:text-[#6B6A64]/60 min-h-[36px] max-h-[104px] py-1"
                    />
                    {input.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setInput("");
                          textareaRef.current?.focus();
                        }}
                        title="Clear input"
                        className="shrink-0 p-1.5 rounded-full text-[#6B6A64] hover:text-[#141414] hover:bg-[#EAE7DF] transition active:scale-95 mt-0.5"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Bottom Toolbar: Perfectly aligned horizontal control bar */}
                  <div className="px-3 py-1.5 bg-[#ECEAE3] border-t-2 border-[#141414] flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Format Selector Pill */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover((prev) =>
                            prev === "format" ? null : "format"
                          )
                        }
                        className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                          activePopover === "format" || format !== "auto"
                            ? "bg-[#E4491B] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                            : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            background:
                              format === "blackNeon"
                                ? "#00D9FF"
                                : format === "anime"
                                ? "#FF3366"
                                : format === "minimal"
                                ? "#111111"
                                : currentFormat?.swatch || "#FF5520",
                          }}
                        />
                        <span className="hidden sm:inline">
                          {currentFormat?.label}
                        </span>
                        <span className="sm:hidden">Format</span>
                        <ChevronUp
                          size={12}
                          className={`transition-transform duration-200 opacity-60 ${
                            activePopover === "format" ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Timing Selector Pill — Create mode only (auto-edit uses the uploaded video's length) */}
                      {studioMode === "create" && (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover((prev) =>
                            prev === "timing" ? null : "timing"
                          )
                        }
                        className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                          activePopover === "timing"
                            ? "bg-[#E4491B] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                            : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                        }`}
                      >
                        <Clock size={12} className="text-[#E4491B]" />
                        <span>{timing}</span>
                        <ChevronUp
                          size={12}
                          className={`transition-transform duration-200 opacity-60 ${
                            activePopover === "timing" ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      )}

                      {/* Voice Selector Pill — Create mode only (auto-edit keeps your own voice) */}
                      {studioMode === "create" && (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover((prev) =>
                            prev === "voice" ? null : "voice"
                          )
                        }
                        className={`h-8 px-2.5 sm:px-3 rounded-full border-2 hidden sm:flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                          activePopover === "voice"
                            ? "bg-[#E4491B] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                            : voiceEnabled
                              ? "bg-[#F6D9CC] border-[#141414] text-[#141414] shadow-[1px_1px_0px_#141414]"
                              : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                        }`}
                      >
                        <Mic
                          size={12}
                          className={
                            voiceEnabled ? "text-[#E4491B]" : "text-[#0EA5E9]"
                          }
                        />
                        <span>
                          {voiceEnabled ? `${voiceLangOf(voice)} • ${voice}` : "Voice off"}
                        </span>
                        {voiceEnabled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        <ChevronUp
                          size={12}
                          className={`transition-transform duration-200 opacity-60 ${
                            activePopover === "voice" ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      )}

                      {/* Auto-edit pills: video upload + running script — Pipeline B only */}
                      {studioMode === "autoEdit" && (
                        <>
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            title="Upload your talking video"
                            className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                              editVideoName
                                ? "bg-[#E4491B] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                                : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                            }`}
                          >
                            <Upload size={12} />
                            <span className="max-w-[140px] truncate">
                              {editVideoName
                                ? `${editVideoName}${editVideoDuration ? ` • ${Math.round(editVideoDuration)}s` : ""}`
                                : "Upload video"}
                            </span>
                          </button>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              handleEditVideoFile(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditScript((prev) => !prev)}
                            title="Paste the running script for the AI to match"
                            className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                              showEditScript || editScript.trim()
                                ? "bg-[#141414] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                                : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                            }`}
                          >
                            <FileText size={12} />
                            <span>Script</span>
                            {editScript.trim() && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewCutsFirst((prev) => !prev)}
                            title="Pause after Wonder Stage A cut analysis to review cuts in storyboard before FFmpeg slices"
                            className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                              reviewCutsFirst
                                ? "bg-[#E4491B] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                                : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                            }`}
                          >
                            <Scissors size={12} />
                            <span>{reviewCutsFirst ? "Review cuts ON" : "Review cuts"}</span>
                          </button>
                        </>
                      )}

                      {/* Internet / Web Search Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setIsInternetEnabled((prev) => !prev)}
                        className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 ${
                          isInternetEnabled
                            ? "bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                            : "bg-[#FFFFFF] border-[#141414]/30 text-[#555] hover:text-[#141414] hover:border-[#141414]"
                        }`}
                        title="Toggle live Internet / Web Search context"
                      >
                        <Globe
                          size={13}
                          className={isInternetEnabled ? "animate-pulse" : "text-[#0EA5E9]"}
                        />
                        <span>Internet</span>
                        {isInternetEnabled ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF] animate-ping ml-0.5" />
                        ) : null}
                      </button>
                    </div>

                    {/* Right: Vibrant Generate Button */}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={
                        isGenerating ||
                        isGeneratingCode ||
                        (studioMode === "autoEdit"
                          ? !editVideoFileRef.current && !editVideoName && !input.trim()
                          : !input.trim())
                      }
                      aria-label="Generate Reel"
                      className="h-8.5 sm:h-9 px-4 sm:px-5 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white font-bold text-[13px] flex items-center gap-1.5 shadow-[2px_2px_0px_#141414] disabled:opacity-40 disabled:shadow-none hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition shrink-0 ml-auto"
                    >
                      {isGenerating || isGeneratingCode ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Generate</span>
                          <Send size={12} className="opacity-80 ml-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-center gap-2 mono text-[10px] lg:text-[11px] text-[#6B6A64]/80 text-center leading-[1.3] px-4">
                <span>
                  AI Studio • Paper format generates fresh 60fps animations each time.
                </span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-[#EAE7DF]" />
                <span className="hidden sm:inline">
                  Shift+Enter for new line
                </span>
              </div>
            </div>

            {activePopover && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setActivePopover(null)}
              />
            )}
          </div>
        </main>

        {/* Right Desktop Preview & Timeline */}
        <aside className="hidden lg:flex w-[400px] shrink-0 border-l border-[#D5D2C8] bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#F5EFE6] flex-col items-center sticky top-[64px] h-[calc(100vh-64px)] overflow-hidden shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.04)]">
          <div className="py-4" style={{ width: "min(352px, calc((100dvh - 160px) * 9 / 16))" }}>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-1.5 mono text-[11px] uppercase tracking-widest text-[#6B6A64] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E4491B] animate-pulse" />
                <span>Live Preview • 9:16</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setActiveBeat((prev) => Math.max(0, prev - 1))
                  }
                  aria-label="Previous beat"
                  className="w-8 h-8 rounded-full bg-[#F7F5EF] border border-[#D5D2C8] grid place-items-center hover:bg-[#EAE7DF] hover:border-[#E4491B]/40 transition active:scale-95 shadow-xs"
                >
                  <RotateCcw size={14} className="text-[#141414]" />
                </button>
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E4491B] to-[#E4491B] text-white grid place-items-center hover:brightness-125 transition active:scale-95 shadow-xs"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} className="text-[#C93D14]" />}
                </button>
              </div>
            </div>

            <PreviewCard
              videoUrl={activeMessage?.videoUrl}
              finalDownloadUrl={activeMessage?.finalDownloadUrl}
              format={activeMessage?.format || format}
              beats={currentBeats}
              activeBeat={activeBeat}
              isPlaying={isPlaying}
              voice={voice}
              timing={activeMessage?.timing || timing}
              voiceTracks={activeMessage?.voiceTracks}
              voiceEnabled={activeMessage?.voiceEnabled}
              theme={currentTheme}
              isGenerating={isGenerating || isGeneratingCode}
              generatingStep={generatingStep}
              sparkCode={currentSparkCode || activeMessage?.sparkCode}
              storyboard={currentStoryboard || activeMessage?.storyboard}
              topic={activeMessage?.text || input}
              onRetry={handleRetrySpark}
              errorMessage={sparkError}
              onReady={handlePreviewReady}
              onError={handlePreviewError}
              onExportMP4={() => setIsExportModalOpen(true)}
            />

          </div>
        </aside>
      </div>

      {/* Mobile Slide-Up Preview Sheet */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${
          isMobilePreviewOpen && hasBeats
            ? "translate-y-0"
            : "translate-y-[110%]"
        }`}
      >
        <div className="mx-auto max-w-[520px] px-3 pb-[calc(12px+var(--safe-area-inset-bottom,0px))]">
          <div className="rounded-[28px] bg-[#F7F5EF] border border-[#D5D2C8] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 rounded-full bg-[#EAE7DF]" />
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 mono text-[11px] uppercase tracking-widest text-[#6B6A64] font-semibold">
                  <Maximize2 size={12} className="text-[#E4491B]" />
                  <span>
                    Preview • {timing} • {voice}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPlaying((prev) => !prev)}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="w-9 h-9 rounded-full bg-[#E4491B] text-white grid place-items-center hover:bg-[#C93D14] transition active:scale-95 shadow-xs"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="text-[#C93D14]" />}
                  </button>
                  <button
                    onClick={() => setIsMobilePreviewOpen(false)}
                    aria-label="Close preview sheet"
                    className="w-9 h-9 rounded-full bg-[#ECEAE3] border border-[#D5D2C8] grid place-items-center hover:bg-[#EAE7DF] transition active:scale-95"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-[66vw] max-w-[280px]">
                  {isMobilePreviewOpen && (
                    <PreviewCard
                      videoUrl={activeMessage?.videoUrl}
                      finalDownloadUrl={activeMessage?.finalDownloadUrl}
                      format={activeMessage?.format || format}
                      beats={currentBeats}
                      activeBeat={activeBeat}
                      isPlaying={isPlaying}
                      voice={voice}
                      timing={activeMessage?.timing || timing}
                      voiceTracks={activeMessage?.voiceTracks}
                      voiceEnabled={activeMessage?.voiceEnabled}
                      theme={currentTheme}
                      compact={true}
                      isGenerating={isGenerating || isGeneratingCode}
                      generatingStep={generatingStep}
                      sparkCode={currentSparkCode || activeMessage?.sparkCode}
                      storyboard={currentStoryboard || activeMessage?.storyboard}
                      topic={activeMessage?.text || input}
                      onRetry={handleRetrySpark}
                      errorMessage={sparkError}
                      onReady={handlePreviewReady}
                      onError={handlePreviewError}
                      onExportMP4={() => setIsExportModalOpen(true)}
                    />
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {currentBeats.map((beat, index) => {
                  const isActive = index === activeBeat;
                  return (
                    <button
                      key={beat.id ?? index}
                      onClick={() => setActiveBeat(index)}
                      className={`shrink-0 px-3.5 py-2 rounded-full border mono text-[11px] transition ${
                        isActive
                          ? "bg-[#E4491B] text-white border-[#D5D2C8]"
                          : "bg-[#ECEAE3] border-[#D5D2C8] text-[#141414] hover:bg-[#EAE7DF]"
                      }`}
                    >
                      {beat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Spark 1.3 JSX Code & Live Animation Modal */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] bg-[#F7F5EF] border border-[#D5D2C8] rounded-[26px] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#D5D2C8] flex flex-wrap items-center justify-between gap-3 bg-[#ECEAE3]/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E4491B] grid place-items-center text-white shrink-0 shadow-sm">
                  <Code2 size={17} />
                </div>
                <div>
                  <div className="serif text-[19px] font-medium leading-none text-[#141414]">
                    {isFullReelMode
                      ? `<FullReel${timing} /> Complete Video Reel`
                      : codeModalBeat
                      ? `<Beat${codeModalBeat.id} /> Component`
                      : "React Component"}
                  </div>
                  <div className="mono text-[11px] text-[#6B6A64] mt-1">
                    {isFullReelMode
                      ? `Full ${timing} video • All ${currentBeats.length} beats sequenced • 60fps`
                      : "Meta muse-spark-1.3 • 9:16 reel"}
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-[#EAE7DF]/60 p-1 rounded-full border border-[#D5D2C8]">
                <button
                  onClick={() => setModalTab("preview")}
                  className={`px-3.5 py-1.5 rounded-full mono text-[12px] font-medium transition flex items-center gap-1.5 ${
                    modalTab === "preview"
                      ? "bg-[#E4491B] text-white shadow-sm"
                      : "text-[#6B6A64] hover:text-[#141414]"
                  }`}
                >
                  <Play size={13} />
                  <span>Live Animation</span>
                </button>
                <button
                  onClick={() => setModalTab("code")}
                  className={`px-3.5 py-1.5 rounded-full mono text-[12px] font-medium transition flex items-center gap-1.5 ${
                    modalTab === "code"
                      ? "bg-[#E4491B] text-white shadow-sm"
                      : "text-[#6B6A64] hover:text-[#141414]"
                  }`}
                >
                  <FileCode size={13} />
                  <span>JSX Code</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {modalTab === "preview" && (
                  <button
                    onClick={() => setReplayKey((k) => k + 1)}
                    className="px-3 py-1.5 rounded-full border border-[#D5D2C8] bg-[#F7F5EF] hover:bg-[#EAE7DF] mono text-[12px] flex items-center gap-1.5 transition active:scale-95 shadow-sm text-[#141414]"
                    title="Replay animation with spring physics"
                  >
                    <RotateCcw size={13} className="text-[#E4491B]" />
                    <span className="hidden sm:inline">Replay</span>
                  </button>
                )}

                <button
                  onClick={handleCopyCode}
                  disabled={
                    isGeneratingCode ||
                    !codeModalContent ||
                    codeModalContent.startsWith("// Connecting")
                  }
                  className="px-3 py-1.5 rounded-full border border-[#D5D2C8] bg-[#F7F5EF] hover:bg-[#EAE7DF] mono text-[12px] flex items-center gap-1.5 transition active:scale-95 shadow-sm text-[#141414] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCodeCopied ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{isCodeCopied ? "Copied" : "Copy JSX"}</span>
                </button>

                <button
                  onClick={handleDownloadCode}
                  disabled={
                    isGeneratingCode ||
                    !codeModalContent ||
                    codeModalContent.startsWith("// Connecting")
                  }
                  className="px-3 py-1.5 rounded-full bg-[#ECEAE3] border border-[#D5D2C8] text-[#141414] mono text-[12px] flex items-center gap-1.5 hover:bg-[#EAE7DF] transition active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={13} />
                  <span>.tsx</span>
                </button>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={isGeneratingCode}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#E4491B] to-[#C93D14] text-white mono text-[12px] font-bold flex items-center gap-1.5 hover:brightness-105 transition active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Render and Download 1080x1920 60fps MP4 Reel"
                >
                  <Video size={13} />
                  <span>Download MP4</span>
                </button>

                <button
                  onClick={() => setIsCodeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#ECEAE3] hover:bg-[#EAE7DF] grid place-items-center transition active:scale-95 ml-1 text-[#141414]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto bg-[#ECEAE3]/40 p-4 sm:p-6 flex items-center justify-center">
              {isGeneratingCode ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F6D9CC] border-2 border-[#E4491B] grid place-items-center relative">
                    <Disc3 size={28} className="animate-spin text-[#E4491B]" />
                    <span className="w-2 h-2 rounded-full bg-[#E4491B] animate-ping absolute" />
                  </div>
                  <div className="serif text-[22px] text-[#141414] font-medium tracking-tight">
                    Meta Spark 1.3 Synthesizing & Stitching All {currentBeats.length} Beats
                  </div>
                  <div className="mono text-[11px] text-[#6B6A64] max-w-md leading-relaxed">
                    Stitching all beats into a continuous {timing} video reel.
                    Holding preview until all clips are synthesized and stitched together...
                  </div>
                  <div className="w-48 bg-[#EAE7DF] h-1.5 rounded-full overflow-hidden mt-2">
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                      className="w-1/2 h-full bg-[#E4491B]"
                    />
                  </div>
                </div>
              ) : modalTab === "preview" ? (
                /* LIVE ANIMATION PREVIEW - STITCHED FULL REEL */
                (() => {
                  const totalSec = Number((activeMessage?.timing || timing).replace("s", "")) || 15;
                  const numBeatsCount = currentBeats.length || 6;
                  const currentModalBeat = currentBeats[modalActiveBeatIndex] || currentBeats[0];
                  const bStart = typeof currentModalBeat?.start === "number" ? currentModalBeat.start : 0;
                  const bEnd = typeof currentModalBeat?.end === "number" ? currentModalBeat.end : totalSec;

                  const sparkCodeToRun = codeModalContent || currentSparkCode || activeMessage?.sparkCode;

                  if (sparkError || (sparkCodeToRun && !sparkCodeToRun.startsWith("// Connecting"))) {
                    return (
                      <div className="w-full max-w-[360px] flex flex-col items-center">
                        <div className="w-full aspect-[9/16] rounded-[28px] border-2 border-[#D5D2C8] shadow-[0_28px_60px_-16px_rgba(0,0,0,0.35)] overflow-hidden relative bg-[#E4491B]">
                          <SparkLiveRunner
                            code={sparkCodeToRun || ""}
                            duration={totalSec}
                            replayKey={replayKey}
                            theme={currentTheme}
                            storyboard={currentStoryboard || activeMessage?.storyboard}
                            topic={activeMessage?.text || input}
                            showControls={true}
                            onRetry={handleRetrySpark}
                            errorMessage={sparkError}
                            onReady={handlePreviewReady}
                            onError={handlePreviewError}
                            onExportMP4={() => setIsExportModalOpen(true)}
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="w-full max-w-[360px] flex flex-col items-center">
                      {/* Phone Bezel */}
                      <div className="w-full aspect-[9/16] bg-[#F7F5EF] rounded-[28px] border-2 border-[#D5D2C8] shadow-[0_28px_60px_-16px_rgba(0,0,0,0.35)] overflow-hidden relative flex flex-col justify-between p-5">
                        {/* Torn Paper Top Edge */}
                        <div
                          className="absolute top-0 left-0 right-0 h-[14px] bg-[#F7F5EF] pointer-events-none z-10"
                          style={{
                            clipPath:
                              "polygon(0 0, 5% 60%, 12% 20%, 18% 55%, 26% 15%, 33% 50%, 42% 10%, 51% 45%, 60% 20%, 70% 60%, 78% 15%, 88% 40%, 100% 0)",
                          }}
                        />

                        {/* Top Header & Continuous Scrubber */}
                        <div className="z-10 pt-1">
                          <div className="flex items-center justify-between text-[#6B6A64] mono text-[10px] uppercase tracking-wider mb-2">
                            <span className="font-semibold text-[#141414] flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isModalPlaying ? "bg-[#E4491B] animate-pulse" : "bg-[#999]"}`} />
                              <span>{timing} STITCHED REEL</span>
                            </span>
                            <span className="text-[#141414] font-bold">
                              0:{modalElapsed.toFixed(1).padStart(4, "0")} / 0:{totalSec.toFixed(1)}s
                            </span>
                          </div>

                          {/* Multi-segment full video tracker showing all beats of the total reel */}
                          <div className="flex gap-1.5 w-full">
                            {currentBeats.map((b, i) => {
                              const isActive = i === modalActiveBeatIndex;
                              const isPast = i < modalActiveBeatIndex;
                              const segStart = typeof b.start === "number" ? b.start : 0;
                              const segEnd = typeof b.end === "number" ? b.end : totalSec;
                              const segDuration = Math.max(0.1, segEnd - segStart);
                              const segProgress = isActive
                                ? Math.min(100, Math.max(0, ((modalElapsed - segStart) / segDuration) * 100))
                                : isPast
                                ? 100
                                : 0;

                              return (
                                <div
                                  key={b.id ?? i}
                                  onClick={() => {
                                    setModalActiveBeatIndex(i);
                                    setModalElapsed(typeof b.start === "number" ? b.start : 0);
                                  }}
                                  className={`h-[4px] flex-1 rounded-full overflow-hidden cursor-pointer ${
                                    isActive
                                      ? "bg-[#F6D9CC] border border-[#E4491B]"
                                      : isPast
                                      ? "bg-[#6B8E5A]/40"
                                      : "bg-[#EAE7DF]"
                                  }`}
                                  title={`Seek to Beat ${i + 1} (${segStart}s)`}
                                >
                                  <div
                                    className="h-full bg-[#E4491B] transition-all duration-100 ease-linear"
                                    style={{ width: `${segProgress}%` }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Animated Beat Content running Framer Motion Spring & Continuous Transitions */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`modal-card-${modalActiveBeatIndex}-${replayKey}`}
                            initial={{
                              y: 40,
                              opacity: 0,
                              scale: 0.94,
                            }}
                            animate={{
                              y: [0, -6, 0],
                              opacity: 1,
                              scale: 1,
                            }}
                            exit={{ y: -40, opacity: 0, scale: 0.95 }}
                            transition={{
                              opacity: { duration: 0.25 },
                              scale: { type: "spring", damping: 20, stiffness: 200 },
                              y: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.25 },
                            }}
                            className="my-auto flex flex-col items-center text-center w-full px-2"
                          >
                            {/* Spring Role Badge with Continuous Live Pulse */}
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                damping: 20,
                                stiffness: 200,
                                delay: 0.1,
                              }}
                              className="px-3.5 py-1 rounded-full bg-[#E4491B] text-white mono text-[10px] font-bold tracking-widest uppercase mb-4 shadow-sm flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F7F5EF] animate-pulse inline-block" />
                              <span>{currentModalBeat?.role || currentModalBeat?.label || "HOOK"} • 0{modalActiveBeatIndex + 1}</span>
                            </motion.div>

                            {/* Central Animated Illustration with Continuous Timeline Rotation */}
                            <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-full border-2 border-dashed border-[#E4491B]/40"
                              />

                              <motion.div
                                animate={{ scale: [1, 1.08, 1] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                className="w-16 h-16 rounded-full bg-[#F6D9CC] border-2 border-[#E4491B] flex items-center justify-center text-[28px] shadow-[0_8px_20px_rgba(255,107,53,0.25)] relative"
                              >
                                <motion.span
                                  animate={{ y: [-2, 2, -2], rotate: [-3, 3, -3] }}
                                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  {modalActiveBeatIndex === 0
                                    ? "🌱"
                                    : modalActiveBeatIndex === 1
                                    ? "💧"
                                    : modalActiveBeatIndex === 2
                                    ? "☀️"
                                    : modalActiveBeatIndex === 3
                                    ? "🌿"
                                    : modalActiveBeatIndex === 4
                                    ? "🌸"
                                    : "☕"}
                                </motion.span>
                              </motion.div>
                            </div>

                            {/* Script Text with Emphasis */}
                            <h2 className="serif text-[24px] sm:text-[28px] leading-[1.08] text-[#141414] tracking-tight">
                              {currentModalBeat?.script || currentModalBeat?.text || "Now Edit Reels with AI"}
                            </h2>

                            {/* Visual prompt desc */}
                            {currentModalBeat?.visualDesc && (
                              <div className="mt-3 px-3 py-1.5 rounded-[10px] bg-[#ECEAE3] border border-[#D5D2C8] mono text-[10px] text-[#6B6A64] leading-tight">
                                <span className="text-[#E4491B] font-semibold mr-1">Visual:</span>
                                {currentModalBeat.visualDesc}
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>

                        {/* Bottom Timing and Beat Switcher Pills */}
                        <div className="z-10 pt-2 border-t border-[#D5D2C8] flex items-center justify-between">
                          <div className="flex gap-1">
                            {currentBeats.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setModalActiveBeatIndex(i);
                                  setModalElapsed(typeof currentBeats[i]?.start === "number" ? currentBeats[i].start : 0);
                                }}
                                className={`w-5 h-5 rounded-full mono text-[9px] font-bold transition ${
                                  i === modalActiveBeatIndex
                                    ? "bg-[#E4491B] text-white"
                                    : "bg-[#ECEAE3] text-[#6B6A64] hover:bg-[#EAE7DF]"
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                          <span className="mono text-[10px] font-bold text-[#E4491B]">
                            BEAT {modalActiveBeatIndex + 1} OF {numBeatsCount}
                          </span>
                        </div>

                        {/* Torn Paper Bottom Edge */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-[14px] bg-[#F7F5EF] pointer-events-none rotate-180 z-10"
                          style={{
                            clipPath:
                              "polygon(0 0, 5% 60%, 12% 20%, 18% 55%, 26% 15%, 33% 50%, 42% 10%, 51% 45%, 60% 20%, 70% 60%, 78% 15%, 88% 40%, 100% 0)",
                          }}
                        />
                      </div>

                      {/* Controls Under Canvas */}
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => {
                            setModalActiveBeatIndex(0);
                            setModalElapsed(0);
                            setIsModalPlaying(true);
                            setReplayKey((k) => k + 1);
                          }}
                          className="px-4 py-2 rounded-full bg-[#E4491B] text-white mono text-[12px] flex items-center gap-2 hover:bg-[#C93D14] transition active:scale-95 shadow-md"
                        >
                          <RotateCcw size={14} className="text-[#E4491B]" />
                          <span>Replay Entire Reel</span>
                        </button>
                        <button
                          onClick={() => setIsModalPlaying((p) => !p)}
                          className="px-4 py-2 rounded-full border border-[#D5D2C8] bg-[#F7F5EF] text-[#141414] mono text-[12px] flex items-center gap-1.5 hover:bg-[#EAE7DF] transition active:scale-95 shadow-sm"
                        >
                          {isModalPlaying ? <Pause size={14} /> : <Play size={14} />}
                          <span>{isModalPlaying ? "Pause" : "Play"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* CODE VIEW */
                <div className="w-full h-[65vh] rounded-[18px] bg-[#E4491B] text-[#6B6A64] p-4 sm:p-6 overflow-auto font-mono text-[12px] leading-[1.65]">
                  <pre className="select-all whitespace-pre overflow-x-auto text-[#FFFFFF]/90">
                    <code>{codeModalContent}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* On-Demand Video Export Modal (Activated only when Download MP4 is clicked) */}
      <VideoExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        pipelineBRunId={activeMessage?.pipelineBRunId}
        beats={currentBeats.length > 0 ? currentBeats : (activeMessage?.storyboard?.beats || [])}
        duration={Number((activeMessage?.timing || timing).replace("s", "")) || 15}
        timing={activeMessage?.timing || timing}
        theme={currentTheme}
        topic={activeMessage?.topic || activeMessage?.text || input || "Paper Studio Reel"}
        format={activeMessage?.format || format}
        storyboard={currentStoryboard || activeMessage?.storyboard}
        sparkCode={codeModalContent || currentSparkCode || activeMessage?.sparkCode || ""}
        voiceTracks={activeMessage?.voiceTracks}
      />
    </div>
  );
}
