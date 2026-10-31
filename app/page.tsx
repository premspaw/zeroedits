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
  RefreshCw,
} from "lucide-react";
import SparkLiveRunner from "@/components/SparkLiveRunner";
import WonderStoryboard from "@/components/WonderStoryboard";
import VideoExportModal from "@/components/VideoExportModal";
import StoryBankView from "@/components/StoryBankView";
import TalkingHeadExplainerStage from "@/components/TalkingHeadExplainerStage";
import CinematicStoryStage from "@/components/CinematicStoryStage";
import ProceduralStage from "@/components/ProceduralStage";
import {
  PROCEDURAL_STYLE_CATALOG,
  MOOD_PRESET_MAP,
  validateSceneScript,
  type SceneScript,
  type ProceduralStyleId,
  type ProceduralMoodPreset,
} from "@/lib/procedural-engine";
import AppleDockNav, { type HeaderTab, DOCK_TABS } from "@/components/AppleDockNav";
import ZeeView from "@/components/ZeeView";
import YouView from "@/components/YouView";
import PostView from "@/components/PostView";
import { useZeeBrain } from "@/lib/zee-brain";
import Pip, {
  type PipMood,
  type PipAction,
  PIP_MOOD_META,
  inferPipMoodFromContext,
  cleanZeeDialogue,
} from "@/components/Pip";

type FormatType =
  | "auto"
  | "procedural"
  | "paperCut"
  | "imageStory"
  | "storyExplainer"
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
  audioStory?: {
    runId: string;
    audioUrl: string;
    finalVideoUrl?: string;
    referenceImageUrl?: string;
    characterAndWorldBible?: string;
    scenes: any[];
    words: any[];
    duration: number;
    title: string;
    style: string;
  };
  proceduralStory?: {
    runId: string;
    audioUrl?: string;
    sceneScript: SceneScript;
    duration: number;
    title: string;
  };
}

const TEMPLATES: Record<string, ThemeConfig> = {
  procedural: {
    bg: "#090D24",
    paper: "#161B33",
    accent: "#F97316",
    effect: "Procedural (generative) math & noise animation engine: style separated from story, driven by Scene Script JSON tracks, seeded randomness, script & voiceover",
    font: "Montserrat",
  },
  paperCut: {
    bg: "#F5F1E8",
    paper: "#FFFEFB",
    accent: "#E4491B",
    effect: "Selected visual direction: story-specific paper-cut animation with layered handmade paper scenery, tactile cut edges, believable parallax depth, and scene-dependent camera and transitions. Wonder must design distinct visuals from the user's exact topic/script/audio and direct Spark to implement those scenes; do not reuse a generic hills, sun, traveler, lantern, or repeated-card animation unless the story calls for them.",
    font: "Instrument Serif",
  },
  imageStory: {
    bg: "#090D24",
    paper: "#16193B",
    accent: "#FFE17D",
    effect: "Consistent AI story images (muse-image-1.0) directed by Wonder AI with 2.5D camera motion & dynamic VFX",
    font: "Montserrat",
  },
  storyExplainer: {
    bg: "#0E101A",
    paper: "#FAF7F0",
    accent: "#E4491B",
    effect: "Full-frame speaker face value alternating with 100% full-screen clean visual animation cutaways & continuous captions",
    font: "Montserrat",
  },
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
    id: "procedural",
    label: "Procedural",
    swatch: "linear-gradient(135deg, #1E1B4B 0%, #F97316 55%, #00F0FF 100%)",
    desc: "Generative math & noise looks driven by story, script & voice",
  },
  {
    id: "paperCut",
    label: "Paper Cut",
    swatch: "linear-gradient(135deg, #F5F1E8 0%, #E4491B 55%, #2D4A43 100%)",
    desc: "Layered paper diorama shaped around your story",
  },
  {
    id: "imageStory",
    label: "Image Storyteller",
    swatch: "linear-gradient(135deg, #16193B 0%, #9E4F6E 55%, #FFE17D 100%)",
    desc: "Consistent AI story images + motion & VFX",
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

const AUTO_EDIT_TEMPLATE_OPTIONS: {
  id: "storyExplainer" | "auto";
  label: string;
  swatch: string;
  desc: string;
}[] = [
  {
    id: "storyExplainer",
    label: "Story Explainer",
    swatch: "linear-gradient(135deg, #14182B 0%, #E4491B 50%, #FFE600 100%)",
    desc: "Full face speaker + clean full-screen animation cutaways",
  },
  {
    id: "auto",
    label: "Auto (AI Decides)",
    swatch: "linear-gradient(135deg, #E4491B 0%, #00D9FF 100%)",
    desc: "AI cuts between speaker face & clean full-screen visuals",
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
    id: "reel-procedural-dusk",
    role: "assistant",
    topic: "A traveller walks from morning into night",
    text: "✨ Procedural Style Engine ready. Style ('Procedural Dusk') is separated from Story (Scene Script JSON): timeOfDay, cloudDensity & wind tracks evolve deterministically with seed #42.",
    format: "procedural",
    timing: "20s",
    voice: "EN-IN",
    generationStatus: "ready",
    beats: [
      {
        id: 1,
        role: "DAWN",
        label: "Scene 1 • Morning Road",
        tone: "calm",
        start: 0,
        end: 10,
        durNum: 10,
        duration: "0s - 10s",
        script: "Morning, and the road begins",
        visualDesc: "Look: Procedural Dusk • timeOfDay 0.0 → 0.5 • 6 birds, gentle breeze across mountain ridges",
        motion: "render(t, params, 42) — sun arc rises into golden afternoon",
      },
      {
        id: 2,
        role: "DUSK TO NIGHT",
        label: "Scene 2 • By The Water",
        tone: "dreamy",
        start: 10,
        end: 20,
        durNum: 10,
        duration: "10s - 20s",
        script: "Night finds him by the water",
        visualDesc: "Look: Procedural Dusk • timeOfDay 0.5 → 1.0 • 40 fireflies emerge over shimmering lake reflection",
        motion: "render(t, params, 42) — twilight deepens into starlight & crescent moon",
      },
    ],
    proceduralStory: {
      runId: "demo-procedural-dusk",
      title: "A traveller walks from morning into night",
      duration: 20,
      sceneScript: validateSceneScript({
        style: "procedural-dusk",
        aspect: "9:16",
        seed: 42,
        duration: 20,
        mood: "calm",
        tracks: {
          timeOfDay: [[0, 0.0], [10, 0.5], [20, 1.0]],
          cloudDensity: [[0, 0.3], [20, 0.7]],
          wind: [[0, 0.2], [20, 1.0]],
          cameraDrift: [[0, 0.1], [20, 0.85]],
          intensity: [[0, 0.3], [10, 0.65], [20, 0.8]],
          colorMood: [[0, 0.2], [20, 0.8]],
        },
        elements: { birds: 6, fireflies: 40, lake: true, stars: 95, trees: 12, traveler: true },
        captions: [
          { t: 1.5, end: 9.5, text: "Morning, and the road begins" },
          { t: 11.5, end: 19.2, text: "Night finds him by the water" },
        ],
        music: { mood: "calm", bpm: 70 },
      }),
    },
  },
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
  editPlan,
  topic = "",
  videoUrl,
  finalDownloadUrl,
  audioStory,
  proceduralStory,
  onUpdateProceduralScript,
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
  editPlan?: any;
  topic?: string;
  videoUrl?: string;
  finalDownloadUrl?: string;
  audioStory?: any;
  proceduralStory?: ChatMessageItem["proceduralStory"];
  onUpdateProceduralScript?: (updated: SceneScript) => void;
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
  const uploadedNarration = voiceTracks?.length === 1 && String(voiceTracks[0]?.id).startsWith("upload-")
    ? voiceTracks[0]
    : null;

  const syncUploadedNarration = useCallback((time: number, playing: boolean) => {
    if (!uploadedNarration?.url) return;
    let audio = beatAudioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      beatAudioRef.current = audio;
    }
    if (audio.dataset.trackUrl !== uploadedNarration.url) {
      audio.pause();
      audio.src = uploadedNarration.url;
      audio.dataset.trackUrl = uploadedNarration.url;
      audio.currentTime = Math.max(0, time);
    }
    if (!playing) {
      audio.pause();
      return;
    }
    const withinAudio = !Number.isFinite(audio.duration) || time < audio.duration;
    if (Number.isFinite(audio.duration) && Math.abs(audio.currentTime - time) > 0.35 && withinAudio) {
      try { audio.currentTime = Math.max(0, time); } catch {}
    }
    if (audio.paused && withinAudio) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
    }
  }, [uploadedNarration]);

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
      if (uploadedNarration) {
        syncUploadedNarration(t, playing);
        return;
      }
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
    [beatIndexAt, playBeatVoice, uploadedNarration, syncUploadedNarration]
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
    if (activeVideoUrl || audioStory || proceduralStory) {
      stopVoice();
    }
  }, [activeVideoUrl, audioStory, proceduralStory, stopVoice]);

  if (proceduralStory?.sceneScript) {
    return (
      <ProceduralStage
        sceneScript={proceduralStory.sceneScript}
        audioUrl={proceduralStory.audioUrl}
        runId={proceduralStory.runId}
        topic={proceduralStory.title || topic}
        onUpdateScript={onUpdateProceduralScript}
      />
    );
  }

  if (audioStory) {
    return (
      <CinematicStoryStage
        audioUrl={audioStory.audioUrl}
        finalVideoUrl={audioStory.finalVideoUrl}
        scenes={audioStory.scenes}
        words={audioStory.words}
        duration={audioStory.duration}
        topic={audioStory.title || topic}
        style={audioStory.style}
        runId={audioStory.runId}
      />
    );
  }

  if (activeVideoUrl) {
    return (
      <TalkingHeadExplainerStage
        cleanVideoUrl={videoUrl}
        finalVideoUrl={finalDownloadUrl}
        runId={editPlan?.runId || editPlan?.planId}
        editPlan={editPlan}
        beats={beats}
        topic={topic}
        compact={compact}
      />
    );
  }

  if (isGenerating && !sparkCode && !storyboard) {
    const stageMood = inferPipMoodFromContext(generatingStep, "thinking");
    const stageAction = stageMood === "thinking" ? "spin-up" : stageMood === "idea" ? "spin-right" : "float";
    const cleanSpeech = cleanZeeDialogue(generatingStep, stageMood);
    return (
      <div
        className={`aspect-[9/16] w-full rounded-[22px] border-2 border-[#141414] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)] overflow-hidden relative bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#F5EFE6] text-[#141414] flex flex-col items-center justify-center p-6 text-center ${compact ? "scale-[0.98]" : ""}`}
      >
        <div className="w-full max-w-[270px] flex flex-col items-center">
          <Pip
            mood={stageMood}
            action={stageAction}
            size={76}
            interactive={true}
            showDialogue={true}
            question={cleanSpeech}
          />
        </div>
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
  const { recordPageActivity } = useZeeBrain();
  const [format, setFormat] = useState<FormatType>("auto");
  const [autoEditTemplate, setAutoEditTemplate] = useState<"storyExplainer" | "auto">("storyExplainer");
  const [timing, setTiming] = useState<TimingType>("15s");
  const [voice, setVoice] = useState<VoiceType>("EN-IN");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [activeHeaderTab, setActiveHeaderTab] = useState<HeaderTab>("edit");
  // Pipeline B (auto-edit) staging — chat bar only, engine lands next.
  type StudioMode = "create" | "autoEdit";
  const [studioMode, setStudioMode] = useState<StudioMode>("create");
  const [editScript, setEditScript] = useState("");
  const [showEditScript, setShowEditScript] = useState(false);
  const [editVideoName, setEditVideoName] = useState<string | null>(null);
  const [editVideoDuration, setEditVideoDuration] = useState<number | null>(null);
  const editVideoFileRef = useRef<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [audioVoiceoverName, setAudioVoiceoverName] = useState<string | null>(null);
  const [audioVoiceoverDuration, setAudioVoiceoverDuration] = useState<number | null>(null);
  const [audioVoiceoverUrl, setAudioVoiceoverUrl] = useState<string | null>(null);
  const [audioVoiceoverPlaying, setAudioVoiceoverPlaying] = useState(false);
  const [audioStyle, setAudioStyle] = useState<"auto" | "anime" | "cinematic" | "storybook" | "noir">("anime");
  const audioVoiceoverFileRef = useRef<File | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const referenceImageFileRef = useRef<File | null>(null);
  const referenceImageInputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");
  const [isInternetEnabled, setIsInternetEnabled] = useState(false);
  const [reviewCutsFirst, setReviewCutsFirst] = useState(false);

  const [messages, setMessages] = useState<ChatMessageItem[]>(SHOWCASE_REELS);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>("reel-1");
  const hasHydratedHistoryRef = useRef(false);
  const skipNextMessageScrollRef = useRef(false);
  const restoreChatScrollRef = useRef<number | null>(null);
  const skipSelectedPersistRef = useRef(true);

  // Load persisted history safely on client mount.
  // Drop stuck in-flight messages (typing / storyboarding / rendering with no
  // content): they come from a reload or crash mid-generation and would sit as
  // a permanent spinner with no storyboard and a paused preview. Real history
  // is never deleted — only content-less in-flight states are repaired.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as HeaderTab | null;
      const hash = window.location.hash.replace("#", "") as HeaderTab;
      const targetTab = tabParam || hash;
      if (targetTab && (targetTab === "z" || targetTab === "u" || targetTab === "script" || targetTab === "edit" || targetTab === "post")) {
        setActiveHeaderTab(targetTab);
      }
    }
    try {
      const saved = localStorage.getItem("paper_studio_reels_v4");
      const savedSelectedId = localStorage.getItem("paper_studio_selected_reel_v1");
      const savedScroll = Number(sessionStorage.getItem("paper_studio_chat_scroll_v1"));
      restoreChatScrollRef.current = Number.isFinite(savedScroll) ? savedScroll : null;
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
            skipNextMessageScrollRef.current = true;
            setMessages(repaired);
            const preferredId = savedSelectedId || parsed[0]?.id;
            const stillThere = repaired.some((m: any) => m?.id === preferredId);
            setSelectedMessageId(
              stillThere ? preferredId : repaired[0]?.id || "reel-1"
            );
          }
        }
      }
    } catch (e) {
      console.warn("Could not load reels from localStorage", e);
    } finally {
      hasHydratedHistoryRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (skipSelectedPersistRef.current) {
      skipSelectedPersistRef.current = false;
      return;
    }
    if (selectedMessageId) localStorage.setItem("paper_studio_selected_reel_v1", selectedMessageId);
  }, [selectedMessageId]);

  // Save history to localStorage
  useEffect(() => {
    if (!hasHydratedHistoryRef.current) return;
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
  const isInitialMountRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedTop = restoreChatScrollRef.current;
    if (savedTop === null || !chatContainerRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (chatContainerRef.current) chatContainerRef.current.scrollTop = savedTop;
      restoreChatScrollRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages]);

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

  // Smooth scroll: ONLY when a brand new message is actively submitted during the live session
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevMessagesLengthRef.current = messages.length;
      return;
    }
    if (messages.length > prevMessagesLengthRef.current) {
      prevMessagesLengthRef.current = messages.length;
      if (skipNextMessageScrollRef.current) {
        skipNextMessageScrollRef.current = false;
        return;
      }
      latestMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages.length]);

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

  // Audio Storytelling Pipeline: handle uploaded voiceover
  const handleAudioVoiceoverFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.test(file.name)) return;
    audioVoiceoverFileRef.current = file;
    setAudioVoiceoverName(file.name.length > 28 ? `${file.name.slice(0, 25)}...` : file.name);
    setAudioVoiceoverDuration(null);
    try {
      const url = URL.createObjectURL(file);
      setAudioVoiceoverUrl(url);
      const probe = new Audio(url);
      probe.onloadedmetadata = () => {
        if (Number.isFinite(probe.duration)) setAudioVoiceoverDuration(probe.duration);
      };
    } catch {}
  };

  const handleClearAudioVoiceover = () => {
    if (audioPreviewAudioRef.current) {
      audioPreviewAudioRef.current.pause();
    }
    audioVoiceoverFileRef.current = null;
    setAudioVoiceoverName(null);
    setAudioVoiceoverDuration(null);
    setAudioVoiceoverUrl(null);
    setAudioVoiceoverPlaying(false);
  };

  const toggleAudioVoiceoverPreview = () => {
    const audio = audioPreviewAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(console.warn);
      setAudioVoiceoverPlaying(true);
    } else {
      audio.pause();
      setAudioVoiceoverPlaying(false);
    }
  };

  const handleReferenceImageFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) return;
    referenceImageFileRef.current = file;
    setReferenceImageName(file.name.length > 24 ? `${file.name.slice(0, 21)}...` : file.name);
    try {
      const url = URL.createObjectURL(file);
      setReferenceImageUrl(url);
    } catch {}
  };

  const handleClearReferenceImage = () => {
    if (referenceImageUrl) {
      try {
        URL.revokeObjectURL(referenceImageUrl);
      } catch {}
    }
    referenceImageFileRef.current = null;
    setReferenceImageName(null);
    setReferenceImageUrl(null);
  };

  const handleApproveCuts = async (message: ChatMessageItem) => {
    if (!message.pipelineBRunId || isGenerating || isGeneratingCode) return;
    const runId = message.pipelineBRunId;
    setIsGenerating(true);
    setGeneratingStep("Applying your cuts");

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
            setGeneratingStep("Finishing your video");
          } else if (curStage === "VISUAL_PLAN_CREATED") {
            setGeneratingStep("Planning your scenes");
          } else if (curStage === "MOTION_GENERATED") {
            setGeneratingStep("Adding motion to your video");
          } else if (curStage === "PREVIEW_READY") {
            setGeneratingStep("Your video is ready!");
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
      const cleanVideoUrl = `/api/pipeline-b/media/${runId}/clean`;
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
        pipeline: "pipeline-b",
        pipelineBRunId: runId,
        videoUrl: cleanVideoUrl,
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

  const handleRecreateSingleScene = async (
    targetMessage: ChatMessageItem,
    sceneIndex: number,
    instruction: string,
    customStart?: number,
    customEnd?: number
  ) => {
    if (!targetMessage) return;
    setSelectedMessageId(targetMessage.id);
    setActiveBeat(sceneIndex);
    setIsGenerating(true);
    setGeneratingStep(
      `Recreating Scene ${sceneIndex + 1} for you...`
    );

    try {
      const currentBeat = targetMessage.beats?.[sceneIndex];
      const res = await fetch("/api/recreate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: targetMessage.audioStory
            ? "imageStory"
            : targetMessage.pipeline === "pipeline-b" || targetMessage.editPlan
            ? "pipeline-b"
            : "pipeline-a",
          runId:
            targetMessage.audioStory?.runId ||
            targetMessage.pipelineBRunId ||
            targetMessage.editPlan?.runId,
          sceneIndex,
          userInstruction: instruction,
          customStart,
          customEnd,
          currentBeat,
          storyboard: targetMessage.storyboard,
          editPlan: targetMessage.editPlan,
          audioStory: targetMessage.audioStory,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to recreate Scene ${sceneIndex + 1}`);
      }

      const nextBeats = (targetMessage.beats || []).map((b, i) =>
        i === sceneIndex ? { ...b, ...data.updatedBeat } : b
      );

      if (data.mode === "imageStory" && targetMessage.audioStory) {
        const nextScenes = (targetMessage.audioStory.scenes || []).map((sc: any, i: number) =>
          i === sceneIndex ? data.updatedScene : sc
        );
        updateMessage(targetMessage.id, {
          beats: nextBeats,
          audioStory: {
            ...targetMessage.audioStory,
            scenes: nextScenes,
          },
          text: `✨ Recreated Scene ${sceneIndex + 1} (${data.updatedScene.start}s–${data.updatedScene.end}s) with Meta Wonder 1.0 & Meta Image 1.0! All other scenes were preserved untouched.`,
        });
      } else if (data.mode === "pipeline-b") {
        const nextVisualSegments = (targetMessage.editPlan?.visualSegments || []).map(
          (seg: any, i: number) => (i === sceneIndex ? data.updatedVisualSegment : seg)
        );
        updateMessage(targetMessage.id, {
          beats: nextBeats,
          sparkCode: data.updatedMotionCode || targetMessage.sparkCode,
          editPlan: targetMessage.editPlan
            ? {
                ...targetMessage.editPlan,
                visualSegments: nextVisualSegments,
              }
            : targetMessage.editPlan,
          text: `✨ Recreated Auto-Edit Scene ${sceneIndex + 1} (${data.updatedVisualSegment.start}s–${data.updatedVisualSegment.end}s)!`,
        });
      } else {
        const nextStoryboard = targetMessage.storyboard
          ? {
              ...targetMessage.storyboard,
              beats: (targetMessage.storyboard.beats || []).map((sb: any, i: number) =>
                i === sceneIndex ? data.updatedStoryboardBeat : sb
              ),
            }
          : targetMessage.storyboard;

        const updatedMsg: ChatMessageItem = {
          ...targetMessage,
          beats: nextBeats,
          storyboard: nextStoryboard,
          sparkCode: "",
          generationError: undefined,
        };
        updateMessage(targetMessage.id, updatedMsg);
        await handleOpenFullReel(updatedMsg);
      }
    } catch (err: any) {
      console.error("Failed to recreate single scene:", err);
    } finally {
      setIsGenerating(false);
      setGeneratingStep("");
    }
  };

  const handleSend = async () => {
    // Use the Image Storyteller pipeline only when that template is selected.
    if (studioMode === "create" && format === "imageStory") {
      if (isGenerating || isGeneratingCode) return;
      const audioFile = audioVoiceoverFileRef.current;
      const refImgFile = referenceImageFileRef.current;
      const userNote = input.trim();
      const customScript =
        userNote.length > 220 || userNote.split("\n").filter(Boolean).length >= 3
          ? userNote
          : "";

      if (!audioFile && !userNote && !customScript) {
        return;
      }

      setIsGenerating(true);
      setGeneratingStep(
        audioFile
          ? "Listening to your voiceover..."
          : "Thinking a story for you..."
      );

      const userMsgId = Date.now().toString();
      const botMsgId = (Date.now() + 1).toString();

      const stagedUser: ChatMessageItem = {
        id: userMsgId,
        role: "user",
        text: audioFile
          ? `🖼️ Image Storyteller • Voiceover: ${audioFile.name} (${Math.round(audioVoiceoverDuration || 0)}s)${refImgFile ? ` • Ref Image: ${refImgFile.name}` : ""}${userNote ? ` • Prompt: ${userNote}` : ""}`
          : `🖼️ Image Storyteller (${timing})${refImgFile ? ` • Ref Image: ${refImgFile.name}` : ""}: ${userNote || customScript}`,
      };

      const clientRunId = `story-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 7)}`;
      const stagedReply: ChatMessageItem = {
        id: botMsgId,
        role: "assistant",
        text: `✨ Zee is directing your scenes & getting character-consistent artwork ready...`,
        typing: true,
        generationStatus: "storyboarding",
        topic: userNote || customScript || "Image Story",
        format: "imageStory",
      };

      setMessages((prev) => [...prev, stagedUser, stagedReply]);
      setSelectedMessageId(botMsgId);
      setInput("");

      try {
        const formData = new FormData();
        if (audioFile) {
          formData.append("audio", audioFile);
        }
        formData.append("style", "auto");
        formData.append("prompt", userNote);
        formData.append("userScript", customScript);
        formData.append("timing", timing);
        formData.append("voice", voice);
        formData.append("runId", clientRunId);
        if (refImgFile) {
          formData.append("referenceImage", refImgFile);
        }

        setGeneratingStep("Getting the images for you...");

        const response = await fetch("/api/audio-story", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to direct image storytelling animation");
        }

        const beats: Beat[] = (data.beats || []).map((b: any) => ({
          id: b.id,
          label: b.label,
          start: b.start,
          end: b.end,
          durNum: b.durNum,
          duration: b.duration,
          script: b.script,
          headline: b.headline,
          visualDesc: b.visualDesc,
          motion: b.motion,
          camera: b.camera,
          tone: data.style || "anime",
        }));

        updateMessage(botMsgId, {
          typing: false,
          generationStatus: "ready",
          generationError: undefined,
          format: "imageStory",
          text: `✨ Directed by Meta Wonder (muse-wonder-1.0) & illustrated by Meta Image (muse-image-1.0): Created ${data.scenes?.length || 4} character-consistent 9:16 scenes (${Math.round(data.duration || 15)}s) with dynamic 2.5D motion, VFX & MP4 video output.`,
          beats,
          audioStory: {
            runId: data.runId,
            audioUrl: data.audioUrl,
            finalVideoUrl: data.finalVideoUrl,
            referenceImageUrl: data.referenceImageUrl,
            characterAndWorldBible: data.characterAndWorldBible,
            scenes: data.scenes,
            words: data.transcriptWords,
            duration: data.duration,
            title: data.title,
            style: data.style || "anime",
          },
        });
      } catch (err: any) {
        updateMessage(botMsgId, {
          typing: false,
          generationStatus: "error",
          generationError: err.message,
          text: `❌ Image Storyteller error: ${err.message}`,
        });
      } finally {
        setIsGenerating(false);
        setGeneratingStep("");
      }
      return;
    }

    if (studioMode === "create" && format === "procedural") {
      if (isGenerating || isGeneratingCode) return;
      const audioFile = audioVoiceoverFileRef.current;
      const userNote = input.trim();
      if (!audioFile && !userNote) return;
      const userMsgId = Date.now().toString();
      const botMsgId = (Date.now() + 1).toString();
      const runId = `proc-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 7)}`;
      setMessages((previous) => [
        ...previous,
        { id: userMsgId, role: "user", text: audioFile ? `Procedural voiceover: ${audioFile.name}${userNote ? ` • Direction: ${userNote}` : ""}` : userNote },
        { id: botMsgId, role: "assistant", topic: userNote || "Procedural audio story", text: "Building a procedural story from your input…", typing: true, generationStatus: "storyboarding", format, timing, voice },
      ]);
      setSelectedMessageId(botMsgId);
      setInput("");
      setIsGenerating(true);
      setGeneratingStep(audioFile ? "Listening to your voiceover..." : "Thinking a story for you...");
      try {
        const formData = new FormData();
        if (audioFile) formData.append("audio", audioFile);
        formData.append("prompt", userNote);
        formData.append("userScript", userNote);
        formData.append("timing", timing);
        formData.append("voice", voice);
        formData.append("voiceoverEnabled", String(voiceEnabled));
        formData.append("style", "auto");
        formData.append("runId", runId);
        const response = await fetch("/api/procedural-story", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Could not build the procedural story.");
        updateMessage(botMsgId, {
          typing: false,
          generationStatus: "ready",
          format,
          beats: data.beats || [],
          sparkCode: data.sparkCode || "",
          proceduralStory: { runId: data.runId, audioUrl: data.audioUrl, sceneScript: data.sceneScript, duration: data.duration, title: data.title },
          text: `Procedural story ready: ${data.title || userNote || "voiceover story"}.`,
        });
      } catch (err: any) {
        updateMessage(botMsgId, { typing: false, generationStatus: "error", generationError: err.message, text: `Procedural story error: ${err.message}` });
      } finally {
        setIsGenerating(false);
        setGeneratingStep("");
      }
      return;
    }

    // Auto-edit mode: activate Pipeline B (upload -> transcribe -> silence cut -> clean video -> overlays)
    if (studioMode === "autoEdit") {
      if (isGenerating || isGeneratingCode) return;
      const videoFile = editVideoFileRef.current;
      if (!videoFile) {
        editFileInputRef.current?.click();
        return;
      }

      setIsGenerating(true);
      setGeneratingStep("Getting your video ready");

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
        text: "Hey, I’m Zee! Analyzing your talking-head video & script to craft your best clean cut...",
        topic: userNote || userScriptContent || videoFile.name,
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
        }
        if (reviewCutsFirst) {
          formData.append("stopAtStage", "EDIT_PLANNED");
        }
        formData.append("templateId", autoEditTemplate === "auto" ? "storyExplainer" : autoEditTemplate);

        setGeneratingStep("Getting your video ready");

        // Poll run status to update UI step in real-time as Wonder AI processes stages
        pollTimer = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/pipeline-b/status/${clientRunId}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const curStage = statusData?.state?.currentStage;
              if (curStage === "MEDIA_VALIDATED") {
                setGeneratingStep("Checking your video");
              } else if (curStage === "TRANSCRIBED") {
                setGeneratingStep("Listening to your video");
              } else if (curStage === "TRANSCRIPT_ALIGNED") {
                setGeneratingStep("Finding the best takes");
              } else if (curStage === "EDIT_PLANNED") {
                setGeneratingStep("Cleaning up your video");
              } else if (curStage === "CUTS_VALIDATED") {
                setGeneratingStep("Shaping the cuts");
              } else if (curStage === "CLEAN_VIDEO_CREATED") {
                setGeneratingStep("Putting your edit together");
              } else if (curStage === "VISUAL_PLAN_CREATED") {
                setGeneratingStep("Creating your images");
              } else if (curStage === "MOTION_GENERATED") {
                setGeneratingStep("Adding motion to your video");
              } else if (curStage === "PREVIEW_READY") {
                setGeneratingStep("Your video is ready!");
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
          videoUrl: isPausedAtEditorial ? undefined : cleanVideoUrl,
          finalDownloadUrl: isPausedAtEditorial ? undefined : finalVideoUrl,
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
    const paperCutAudio = format === "paperCut" ? audioVoiceoverFileRef.current : null;
    if ((!trimmed && !paperCutAudio) || isGenerating || isGeneratingCode) return;
    const sceneEdit = trimmed.match(/^(?:recreate|regenerate|edit|change|update)\s+scene\s+(\d+)\s*(?::|text\s+to)?\s*([\s\S]*)$/i);
    if (sceneEdit && activeMessage?.beats) {
      const sceneIndex = Number(sceneEdit[1]) - 1;
      const instruction = (sceneEdit[2] || "").trim().replace(/^["“]|["”]$/g, "");
      if (sceneIndex >= 0 && sceneIndex < (activeMessage.beats?.length || 0)) {
        setInput("");
        await handleRecreateSingleScene(activeMessage, sceneIndex, instruction);
        return;
      }
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
      : scriptTopic || (paperCutAudio ? "Create a story from the uploaded audio" : "");

    const typingMessage: ChatMessageItem = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      text: "",
      typing: true,
      generationStatus: "storyboarding",
      topic: scriptTopic || (paperCutAudio ? "Audio story" : ""),
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
        ? "Thinking a story & voiceover for you..."
        : "Thinking a story for you..."
    );

    const stepTimer1 = setTimeout(() => {
      setGeneratingStep("Writing the scenes for you...");
    }, 700);

    const stepTimer2 = setTimeout(() => {
      setGeneratingStep("Making the video for you...");
    }, 1500);

    try {
      let creativeInput = trimmed;
      let audioDurationSec: number | null = null;
      let uploadedAudioTrack: VoiceTrack | null = null;
      const selectedAudio = format !== "imageStory" ? audioVoiceoverFileRef.current : null;
      if (selectedAudio) {
        setGeneratingStep("Listening to your audio...");
        const audioForm = new FormData();
        audioForm.append("audio", selectedAudio);
        audioForm.append("userScript", userScript);
        const transcriptRes = await fetch("/api/transcribe-audio", { method: "POST", body: audioForm });
        const transcriptData = await transcriptRes.json();
        if (!transcriptRes.ok || !transcriptData.success || !transcriptData.transcript) {
          throw new Error(transcriptData.error || "Could not transcribe the uploaded audio.");
        }
        creativeInput = [trimmed, `Audio transcript: ${transcriptData.transcript}`].filter(Boolean).join("\n\n");
        audioDurationSec = Number(transcriptData.duration) || null;
        uploadedAudioTrack = {
          id: `upload-${Date.now()}`,
          url: transcriptData.audioUrl,
          file: selectedAudio.name,
          start: 0,
          end: audioDurationSec || 0,
          duration: audioDurationSec || 0,
          hasAudio: Boolean(transcriptData.audioUrl),
        };
      }
      const durationNum = audioDurationSec || Number(timing.replace("s", "")) || 10;
      const selectedTemplate = format === "auto" ? null : TEMPLATES[format] || null;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedAudio ? creativeInput : finalTopic,
          duration: durationNum,
          timing,
          template: selectedTemplate,
          format: format === "auto" ? null : format,
          voice,
          language: voiceLangOf(voice),
          voiceName: voiceNameOf(voice),
          voiceoverEnabled: voiceEnabled,
          userScript: selectedAudio ? creativeInput : userScript,
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
        if (voiceEnabled && !uploadedAudioTrack) {
          try {
            setGeneratingStep("Voicing your scenes...");
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

        setGeneratingStep("Making your video");

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
          voiceTracks: uploadedAudioTrack ? [uploadedAudioTrack] : voiceTracks,
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
    if (!targetMessage || isGenerating || isGeneratingCode) return;
    setSelectedMessageId(targetMessage.id);

    setIsFullReelMode(true);
    setModalActiveBeatIndex(targetBeatIndex);
    const totalSec = Number((targetMessage.timing || timing).replace("s", "")) || 15;
    const initialElapsed = targetMessage.beats?.[targetBeatIndex]?.start ?? 0;
    setModalElapsed(initialElapsed);
    setIsModalPlaying(true);
    setIsCodeModalOpen(true);
    setModalTab("preview");
    setReplayKey((k) => k + 1);

    // If this message has an Audio Story or Pipeline B video, open the live stage immediately!
    if (
      targetMessage.audioStory ||
      targetMessage.pipeline === "pipeline-b" ||
      targetMessage.videoUrl ||
      targetMessage.finalDownloadUrl
    ) {
      setIsGeneratingCode(false);
      return;
    }

    if (!targetMessage.beats || targetMessage.beats.length === 0) return;

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

  const currentFormat =
    studioMode === "autoEdit"
      ? AUTO_EDIT_TEMPLATE_OPTIONS.find((t) => t.id === autoEditTemplate) || AUTO_EDIT_TEMPLATE_OPTIONS[0]
      : FORMAT_OPTIONS.find((f) => f.id === format);

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

            {/* Mobile Navigation Tabs: Z, U, Script, Edit, Post */}
            <div className="grid grid-cols-5 gap-1 p-1 mb-4 rounded-2xl bg-[#ECEAE3] border border-[#D5D2C8] shrink-0">
              {DOCK_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveHeaderTab(tab.id);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`py-2 px-1 rounded-xl mono text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    activeHeaderTab === tab.id
                      ? "bg-[#141414] text-white shadow-xs"
                      : "text-[#6B6A64] hover:text-[#141414]"
                  }`}
                >
                  <span className={activeHeaderTab === tab.id ? "text-white" : ""}>
                    {typeof tab.icon === "function" ? tab.icon(activeHeaderTab === tab.id) : tab.icon}
                  </span>
                  <span className="text-[10px] tracking-tight">{tab.label}</span>
                </button>
              ))}
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

      {/* Apple-Style Floating Dock Navigation Bar (Replaces traditional header) */}
      <div
        className="sticky top-1 z-40 w-full px-3 pointer-events-none flex items-center justify-center -mb-2"
        style={{ top: "max(0.25rem, env(safe-area-inset-top, 0.25rem))" }}
      >
        <div className="pointer-events-auto flex items-center justify-center gap-2">
          {/* Mobile drawer trigger for small screens */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Open menu"
            className="lg:hidden shrink-0 w-9 h-9 rounded-[14px] bg-gradient-to-b from-white/45 via-white/25 to-white/15 backdrop-blur-2xl border border-white/65 grid place-items-center shadow-[0_8px_24px_-4px_rgba(20,20,20,0.08),inset_0_1px_0.5px_rgba(255,255,255,0.85)] hover:bg-white/50 transition active:scale-95 text-[#141414]"
          >
            <Menu size={15} />
          </button>

          <AppleDockNav
            activeTab={activeHeaderTab}
            onTabChange={setActiveHeaderTab}
          />
        </div>
      </div>

      {/* Main Viewport: Z vs U vs Script vs Edit vs Post */}
      {activeHeaderTab === "z" ? (
        <ZeeView
          onSwitchToTab={(tab) => {
            setActiveHeaderTab(tab);
            recordPageActivity(tab, `Switched to ${tab.toUpperCase()}`, `Opened ${tab.toUpperCase()} stage from Zee Brain`);
          }}
          onNewReel={handleNewReel}
          recentTopic={activeMessage?.topic || activeMessage?.text || input}
          totalReelsCount={messages.filter((m) => m.role === "assistant" && (m.topic || m.beats)).length}
        />
      ) : activeHeaderTab === "u" ? (
        <YouView
          onSwitchToTab={(tab) => {
            setActiveHeaderTab(tab);
            recordPageActivity(tab, `Switched to ${tab.toUpperCase()}`, `Navigated from You Memory Bank to ${tab.toUpperCase()}`);
          }}
          onSelectTopicForScript={(hookIdea, matchedFormat) => {
            setInput(hookIdea);
            if (matchedFormat) {
              setFormat(matchedFormat as FormatType);
            }
            recordPageActivity("script", "Script • Story Bank", `Loaded personal memory hook: "${hookIdea.slice(0, 48)}..."`, hookIdea);
            setActiveHeaderTab("script");
          }}
        />
      ) : activeHeaderTab === "script" ? (
        <div className="w-full max-w-[1600px] mx-auto px-1 sm:px-2 pt-0 pb-2">
          <StoryBankView
            hideHeader={true}
            initialTopicFromYou={input}
            onSwitchToStudio={(fullScriptText, title) => {
              if (fullScriptText) {
                setEditScript(fullScriptText);
                setShowEditScript(true);
                setInput(fullScriptText);
              }
              if (title) {
                recordPageActivity(
                  "script",
                  "Script • Story Bank",
                  `Locked script for "${title}"`,
                  title
                );
              }
              setActiveHeaderTab("edit");
            }}
            onCompleteRecordingToStudio={(videoFile, fullScriptText, title) => {
              editVideoFileRef.current = videoFile;
              setEditVideoName(videoFile.name);
              setEditVideoDuration(28);
              setEditScript(fullScriptText);
              setShowEditScript(true);
              setStudioMode("autoEdit");
              setInput(title);
              recordPageActivity(
                "edit",
                "Edit • Video Studio",
                `Received recorded take "${videoFile.name}" from Teleprompter & Mobile Loop`,
                title
              );
              setActiveHeaderTab("edit");
            }}
          />
        </div>
      ) : activeHeaderTab === "post" ? (
        <PostView
          onSwitchToTab={setActiveHeaderTab}
          activeTopic={activeMessage?.topic || activeMessage?.text || input}
          activeVideoUrl={
            activeMessage?.audioStory?.finalVideoUrl ||
            activeMessage?.videoUrl ||
            activeMessage?.finalDownloadUrl
          }
          duration={
            activeMessage?.audioStory?.duration ||
            activeMessage?.editPlan?.cleanDuration ||
            33.5
          }
          onDownloadMp4={() => {
            if (activeMessage?.audioStory) {
              if (activeMessage.audioStory.finalVideoUrl) {
                window.location.href = `${activeMessage.audioStory.finalVideoUrl}&download=1`;
              } else {
                setActiveHeaderTab("edit");
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("export-audio-story-mp4"));
                }, 300);
              }
            } else if (activeMessage?.videoUrl || activeMessage?.finalDownloadUrl) {
              window.dispatchEvent(new CustomEvent("export-pipeline-b-mp4"));
            } else {
              setIsExportModalOpen(true);
            }
          }}
        />
      ) : (
        <>
          {/* Main Studio Viewport (Edit) */}
          <div className="mx-auto max-w-[1600px] w-full flex flex-col lg:flex-row min-h-[calc(100vh-50px)]">
        {/* Left History Sidebar */}
        <aside className="hidden lg:flex w-[280px] shrink-0 border-r-2 border-[#141414] bg-[#ECEAE3] flex-col p-4 sticky top-0 h-screen overflow-y-auto">
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
            onScroll={(event) => {
              try { sessionStorage.setItem("paper_studio_chat_scroll_v1", String(event.currentTarget.scrollTop)); } catch {}
            }}
            className="flex-1 overflow-y-auto px-4 lg:px-10 pt-2 lg:pt-3 space-y-6 lg:space-y-8 pb-[140px] lg:pb-[160px]"
          >
            {/* Zee Welcome & Live Agent Greeting Banner */}
            <div className="w-full max-w-[780px] mx-auto rounded-[20px] border-2 border-[#141414] bg-gradient-to-r from-[#FFFDF8] via-[#FAF6EC] to-[#F6D9CC]/45 p-3.5 sm:p-4 shadow-[3px_3px_0px_#141414]">
              <Pip
                mood={
                  isGenerating || isGeneratingCode
                    ? inferPipMoodFromContext(generatingStep, "thinking")
                    : studioMode === "autoEdit" && editVideoName
                    ? "listening"
                    : input.trim().length > 0
                    ? "listening"
                    : "happy"
                }
                size={48}
                spin={false}
                orientation="horizontal"
                interactive={true}
                userInstruction={input.trim() || activeMessage?.topic || activeMessage?.text}
                isAutoEdit={studioMode === "autoEdit"}
                question={
                  isGenerating || isGeneratingCode
                    ? cleanZeeDialogue(generatingStep, "thinking", studioMode === "autoEdit")
                    : studioMode === "autoEdit"
                    ? editVideoName
                      ? `"${editVideoName}" loaded. Tap Auto-Edit to trim & build your video!`
                      : "Upload your video — I’ll trim retakes, cut dead air & animate it for you."
                    : input.trim().length > 0
                    ? `Ready to make your video: "${input.trim().slice(0, 48)}${input.trim().length > 48 ? "…" : ""}".`
                    : "Tell me your idea or paste a script. Let’s make something good!"
                }
              />
            </div>

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
                                  message.generationStatus === "error"
                                    ? "concerned"
                                    : message.typing ||
                                      (isGenerating && messageIndex === messages.length - 1)
                                    ? "thinking"
                                    : message.generationStatus === "storyboarding"
                                    ? message.pipeline === "pipeline-b"
                                      ? "idea"
                                      : "thinking"
                                    : message.generationStatus === "rendering"
                                    ? "writing"
                                    : message.pipeline === "pipeline-b" && message.videoUrl
                                    ? "excited"
                                    : isSelectedReel && currentBeats[activeBeat]
                                    ? "happy"
                                    : "idle"
                                }
                                size={28}
                                interactive={false}
                              />
                            </div>
                            <div>
                              <div className="mono text-[11px] font-bold tracking-[0.08em] text-[#141414] flex items-center gap-1.5">
                                <span>ZEE • PAPER STUDIO</span>
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
                            <Pip
                              mood={inferPipMoodFromContext(generatingStep, "thinking")}
                              size={46}
                              orientation="horizontal"
                              userInstruction={message.topic || message.text}
                              isAutoEdit={message.pipeline === "pipeline-b"}
                              question={cleanZeeDialogue(
                                generatingStep || "Thinking a story for you...",
                                "thinking",
                                message.pipeline === "pipeline-b"
                              )}
                              interactive={true}
                            />
                            <div className="mono text-[10.5px] text-[#6B6A64] bg-[#ECEAE3] border border-[#D5D2C8] rounded-xl px-3 py-2 flex items-center justify-between">
                              <span>{cleanZeeDialogue(generatingStep, "thinking", message.pipeline === "pipeline-b")}</span>
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

                            {/* Pip Interactive Question & Decision Presenter */}
                            {(() => {
                              const isPipelineB = message.pipeline === "pipeline-b" || !!message.editPlan;
                              const cuts = message.editPlan?.cuts || [];
                              const cutDur = cuts.reduce((acc: number, c: any) => acc + Math.max(0, (c.end || 0) - (c.start || 0)), 0);

                              let pipMood: PipMood = "idle";
                              let question = "";
                              let actions: PipAction[] = [];

                              if (message.generationStatus === "error") {
                                pipMood = "concerned";
                                question = message.generationError
                                  ? `Hey, I’m Zee — ${message.generationError} Want me to retry this custom reel for you?`
                                  : "Hey, I’m Zee — I ran into an issue while crafting this reel. Want me to retry?";
                                actions = [
                                  {
                                    label: "Retry Reel",
                                    icon: <RefreshCw size={11} />,
                                    variant: "primary",
                                    onClick: () => handleOpenFullReel({ ...message, sparkCode: "" }),
                                  },
                                ];
                              } else if (message.generationStatus === "rendering") {
                                pipMood = inferPipMoodFromContext(generatingStep, "writing");
                                question =
                                  generatingStep ||
                                  "Hey, I’m Zee! Coding the custom 60fps animations and typography for each scene right now…";
                              } else if (isPipelineB) {
                                if (message.videoUrl && message.generationStatus === "ready") {
                                  pipMood = cuts.length > 0 ? "excited" : "happy";
                                  question =
                                    cuts.length > 0
                                      ? `Boom! I’m Zee — I trimmed -${cutDur.toFixed(2)}s across ${cuts.length} retake/silence cut(s) and locked your custom explainer reel. Ready to watch or download?`
                                      : "Hey, I’m Zee! Your clean talking-head reel is locked with kinetic subtitles & custom explainer visuals! Ready to watch or export?";
                                } else {
                                  pipMood = cuts.length > 0 ? "idea" : "reading";
                                  question = cuts.length > 0
                                    ? `Hey, I’m Zee! I found ${cuts.length} retake/silence cuts saving -${cutDur.toFixed(2)}s. Shall we trim them and punch in on your key points?`
                                    : "Hey, I’m Zee! Speech boundaries verified with 100% natural cadence. Ready to export?";
                                }
                                actions = [
                                  ...(cuts.length > 0 && !message.videoUrl
                                    ? [
                                        {
                                          label: "Apply Editorial Cuts",
                                          icon: <Scissors size={11} />,
                                          variant: "primary" as const,
                                          onClick: () => handleApproveCuts(message),
                                        },
                                      ]
                                    : []),
                                  {
                                    label: "Play Reel",
                                    icon: <Play size={11} />,
                                    variant: cuts.length > 0 && !message.videoUrl ? ("secondary" as const) : ("primary" as const),
                                    onClick: () => handleOpenFullReel(message),
                                  },
                                  ...(message.videoUrl || message.finalDownloadUrl || message.pipeline === "pipeline-b"
                                    ? [
                                        {
                                          label: "Download MP4",
                                          icon: <Download size={11} />,
                                          variant: "secondary" as const,
                                          onClick: () => {
                                            setSelectedMessageId(message.id);
                                            handleOpenFullReel(message);
                                            setTimeout(() => {
                                              window.dispatchEvent(new CustomEvent("export-pipeline-b-mp4"));
                                            }, 400);
                                          },
                                        },
                                      ]
                                    : []),
                                  {
                                    label: "Want a punchier hook?",
                                    icon: <Sparkles size={11} />,
                                    variant: "subtle" as const,
                                    onClick: () => {
                                      setInput("Make the hook punchier and shorten first 3 seconds");
                                      textareaRef.current?.focus();
                                    },
                                  },
                                ];
                              } else {
                                const liveBeat = isSelectedReel ? currentBeats[activeBeat] : message.beats?.[0];
                                pipMood = liveBeat
                                  ? inferPipMoodFromContext(
                                      `${liveBeat.label} ${liveBeat.tone || ""} ${liveBeat.script}`,
                                      "happy"
                                    )
                                  : "happy";
                                question =
                                  isSelectedReel && liveBeat
                                    ? `Scene ${activeBeat + 1} (${liveBeat.label}) is ready! Tap play to watch the full reel.`
                                    : "Your video is ready! Tap play to watch.";
                                actions = [
                                  {
                                    label: "Play Full Reel",
                                    icon: <Play size={11} />,
                                    variant: "primary" as const,
                                    onClick: () => handleOpenFullReel(message),
                                  },
                                  {
                                    label: "Download MP4",
                                    icon: <Download size={11} />,
                                    variant: "secondary" as const,
                                    onClick: () => {
                                      setSelectedMessageId(message.id);
                                      if (message.audioStory) {
                                        handleOpenFullReel(message);
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent("export-audio-story-mp4"));
                                        }, 400);
                                      } else if (message.videoUrl || message.finalDownloadUrl || message.pipelineBRunId) {
                                        handleOpenFullReel(message);
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent("export-pipeline-b-mp4"));
                                        }, 400);
                                      } else {
                                        setIsExportModalOpen(true);
                                      }
                                    },
                                  },
                                  {
                                    label: "Want a punchier hook?",
                                    icon: <Sparkles size={11} />,
                                    variant: "subtle" as const,
                                    onClick: () => {
                                      setInput("Make the opening hook punchier and more dramatic");
                                      textareaRef.current?.focus();
                                    },
                                  },
                                ];
                              }

                              return (
                                <div className="p-3 border-b border-[#D5D2C8]/50 bg-gradient-to-r from-[#F7F5EF] via-[#FAF8F3] to-[#F7F5EF]">
                                  <Pip
                                    mood={pipMood}
                                    size={46}
                                    orientation="horizontal"
                                    question={question}
                                    actions={actions}
                                    interactive={true}
                                    userInstruction={message.topic || message.text}
                                    isAutoEdit={isPipelineB}
                                  />
                                </div>
                              );
                            })()}

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
                                onEdit={(scene) => { setSelectedMessageId(message.id); setInput(`Recreate scene ${scene}: `); textareaRef.current?.focus(); }}
                                onRecreateScene={(sceneIdx, instruction, customStart, customEnd) =>
                                  handleRecreateSingleScene(
                                    message,
                                    sceneIdx,
                                    instruction,
                                    customStart,
                                    customEnd
                                  )
                                }
                                disabled={isGenerating || isGeneratingCode}
                                onPlay={() => handleOpenFullReel(message)}
                                onRetry={() => handleOpenFullReel({ ...message, sparkCode: "" })}
                                onApproveCuts={() => handleApproveCuts(message)}
                                onRebuildCuts={(_customCuts, updatedState) => {
                                  const bust = Date.now();
                                  const rid = message.pipelineBRunId;
                                  updateMessage(message.id, {
                                    generationStatus: "ready",
                                    videoUrl: rid ? `/api/pipeline-b/media/${rid}/clean?t=${bust}` : message.videoUrl,
                                    finalDownloadUrl: rid ? `/api/pipeline-b/media/${rid}/final?t=${bust}` : message.finalDownloadUrl,
                                    editPlan: updatedState?.editPlan || message.editPlan,
                                  });
                                }}
                                unifiedMode={true}
                              />
                            )}
                          </>
                        )}
                      </div>

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
                  <div className="absolute bottom-full mb-2 left-0 right-0 flex justify-start z-30">
                    <div className="rounded-[20px] bg-[#F7F5EF] border border-[#D5D2C8] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-2 w-[320px] max-w-[92vw] max-h-[min(70dvh,520px)] overflow-y-auto overscroll-contain animate-popover">
                      {activePopover === "format" && (
                        <div className="space-y-1">
                          <div className="px-3 py-2 mono text-[11px] uppercase tracking-widest text-[#6B6A64] font-semibold">
                            {studioMode === "autoEdit"
                              ? "Template • Auto-edit"
                              : "Format • Paper engine"}
                          </div>
                          {studioMode === "autoEdit"
                            ? AUTO_EDIT_TEMPLATE_OPTIONS.map((t) => {
                                const isSelected = autoEditTemplate === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    onClick={() => {
                                      setAutoEditTemplate(t.id);
                                      setActivePopover(null);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-left transition ${
                                      isSelected
                                        ? "bg-gradient-to-r from-[#E4491B] to-[#E4491B] text-white shadow-xs"
                                        : "hover:bg-[#EAE7DF] text-[#141414]"
                                    }`}
                                  >
                                    <span
                                      className="w-7 h-7 rounded-full border border-[#D5D2C8] grid place-items-center text-[11px] font-bold shrink-0 shadow-xs text-white"
                                      style={{ background: t.swatch }}
                                    >
                                      50
                                    </span>
                                    <span className="flex-1">
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
                                        {t.desc}
                                      </span>
                                    </span>
                                    {isSelected && <Check size={16} className="text-white" />}
                                  </button>
                                );
                              })
                            : FORMAT_OPTIONS.map((f) => {
                                const isSelected = format === f.id;
                                return (
                                  <button
                                    key={f.id}
                                    onClick={() => {
                                      setFormat(f.id);
                                      setActivePopover(null);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[12px] text-left transition ${
                                      isSelected
                                        ? "bg-gradient-to-r from-[#E4491B] to-[#E4491B] text-white shadow-xs"
                                        : "hover:bg-[#EAE7DF] text-[#141414]"
                                    }`}
                                  >
                                    <span
                                      className="w-6 h-6 rounded-full border border-[#D5D2C8] grid place-items-center text-[10px] font-bold shrink-0 shadow-xs"
                                      style={{
                                        background: f.swatch,
                                        color:
                                          f.id === "blackNeon" ? "white" : "#111",
                                      }}
                                    >
                                      Aa
                                    </span>
                                    <span className="flex-1">
                                      <span className="block text-[12px] font-semibold">
                                        {f.label}
                                      </span>
                                      <span
                                        className={`block mono text-[9.5px] ${
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
                  {/* Image Storyteller Controller Banner (Shows when Image Storyteller template is selected or Audio/Ref Image is attached) */}
                  {studioMode === "create" && (format === "imageStory" || audioVoiceoverName || referenceImageName) && (
                    <div className="w-full px-3.5 py-2 bg-gradient-to-r from-[#F6F4EE] via-[#FDFBF7] to-[#F6F4EE] border-b border-[#D5D2C8] flex flex-wrap items-center justify-between gap-2">
                      {/* Left: Voiceover Audio + Reference Image Controls */}
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-full bg-[#141414] text-white mono text-[9.5px] font-bold tracking-wide uppercase">
                          Image Storyteller
                        </span>

                        {audioVoiceoverName ? (
                          <div className="flex items-center gap-2 bg-white border border-[#2563EB]/25 rounded-full pl-1.5 pr-2.5 py-0.5 shadow-2xs">
                            {audioVoiceoverUrl && (
                              <audio
                                ref={audioPreviewAudioRef}
                                src={audioVoiceoverUrl}
                                onEnded={() => setAudioVoiceoverPlaying(false)}
                              />
                            )}
                            <button
                              type="button"
                              onClick={toggleAudioVoiceoverPreview}
                              className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition"
                              title={audioVoiceoverPlaying ? "Pause preview" : "Play voiceover preview"}
                            >
                              {audioVoiceoverPlaying ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
                            </button>
                            <span className="font-bold text-[11px] text-[#141414] truncate max-w-[140px]">
                              {audioVoiceoverName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[#2563EB] mono text-[9px] font-bold">
                              {audioVoiceoverDuration ? `${Math.round(audioVoiceoverDuration)}s` : "Audio"}
                            </span>
                            <button
                              type="button"
                              onClick={handleClearAudioVoiceover}
                              className="text-[#888] hover:text-rose-600 transition ml-0.5"
                              title="Remove voiceover audio"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => audioFileInputRef.current?.click()}
                            className="px-2.5 py-0.5 rounded-full bg-white hover:bg-[#ECEAE3] border border-dashed border-[#141414]/30 text-[10.5px] font-bold text-[#444] hover:text-[#141414] flex items-center gap-1 transition"
                            title="Upload optional voiceover audio (or leave empty to generate from your prompt/script)"
                          >
                            <Mic size={10} className="text-[#2563EB]" />
                            <span>+ Voiceover Audio (Optional)</span>
                          </button>
                        )}

                        {referenceImageName ? (
                          <div className="flex items-center gap-2 bg-white border border-[#E4491B]/30 rounded-full pl-1.5 pr-2.5 py-0.5 shadow-2xs">
                            {referenceImageUrl && (
                              <img
                                src={referenceImageUrl}
                                alt="Reference"
                                className="w-5 h-5 rounded-full object-cover border border-black/15 shrink-0"
                              />
                            )}
                            <span className="font-bold text-[11px] text-[#141414] truncate max-w-[120px]">
                              {referenceImageName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-[#F6D9CC] text-[#E4491B] mono text-[9px] font-bold">
                              Ref Image
                            </span>
                            <button
                              type="button"
                              onClick={handleClearReferenceImage}
                              className="text-[#888] hover:text-rose-600 transition ml-0.5"
                              title="Remove reference image"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => referenceImageInputRef.current?.click()}
                            className="px-2.5 py-0.5 rounded-full bg-white hover:bg-[#ECEAE3] border border-dashed border-[#141414]/30 text-[10.5px] font-bold text-[#444] hover:text-[#141414] flex items-center gap-1 transition"
                            title="Add reference image for character or style consistency"
                          >
                            <Upload size={10} className="text-[#E4491B]" />
                            <span>+ Character / Style Ref Image</span>
                          </button>
                        )}
                      </div>

                      <div className="mono text-[9.5px] text-[#6B6A64] flex items-center gap-1.5">
                        <Sparkles size={10} className="text-[#E4491B] shrink-0" />
                        <span>
                          Wonder 1.0 + Muse Image 1.0 • Prompt decides style (Anime, Storybook, etc.) with locked Character Sheet
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top: Text Input + Clear button */}
                  <div className="px-3.5 pt-2 pb-1 relative flex items-start gap-2.5">
                    <div
                      className="shrink-0 pt-0.5"
                      title={
                        isGenerating || isGeneratingCode
                          ? "Zee is crafting your custom script & video..."
                          : input.trim().length > 0
                          ? "Zee is listening to your instruction..."
                          : "Hey, I’m Zee! Tell me your idea!"
                      }
                    >
                      <Pip
                        mood={
                          isGenerating || isGeneratingCode
                            ? "writing"
                            : input.trim().length > 0
                            ? "listening"
                            : "idle"
                        }
                        size={32}
                        interactive={true}
                      />
                    </div>

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
                        audioVoiceoverName
                          ? `Add optional story direction, character details, or visual prompt (or leave blank and let the AI Storyteller decide from your voice)...`
                          : studioMode === "autoEdit"
                          ? "Hey, I’m Zee! Add custom edit instructions (optional) — e.g. 'cut retakes & silences, 50/50 story explainer'"
                          : "Hey, I’m Zee! Tell me what video to create, then choose a template for its look."
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

                  {/* Bottom Toolbar: Single-line horizontal control bar */}
                  <div className="px-3 py-1.5 bg-[#ECEAE3] border-t-2 border-[#141414] flex items-center justify-between gap-2 flex-nowrap">
                    <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none min-w-0">
                      {/* Format / Template Selector Pill */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover((prev) =>
                            prev === "format" ? null : "format"
                          )
                        }
                        className={`h-7 px-2 sm:px-2.5 rounded-full border-2 flex items-center gap-1 mono text-[10px] sm:text-[11px] font-bold transition active:scale-95 shrink-0 whitespace-nowrap ${
                          activePopover === "format" ||
                          (studioMode === "autoEdit"
                            ? autoEditTemplate === "storyExplainer"
                            : format !== "auto")
                            ? "bg-[#E4491B] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                            : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            background:
                              studioMode === "autoEdit"
                                ? currentFormat?.swatch
                                : format === "blackNeon"
                                ? "#00D9FF"
                                : format === "anime"
                                ? "#FF3366"
                                : format === "minimal"
                                ? "#111111"
                                : currentFormat?.swatch || "#FF5520",
                          }}
                        />
                        <span>
                          {currentFormat?.label}
                        </span>
                        <ChevronUp
                          size={12}
                          className={`transition-transform duration-200 opacity-60 ${
                            activePopover === "format" ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Timing Selector Pill — Create mode only (when no voiceover file is overriding duration) */}
                      {studioMode === "create" && !audioVoiceoverName && (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover((prev) =>
                            prev === "timing" ? null : "timing"
                          )
                        }
                        className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 shrink-0 whitespace-nowrap ${
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

                      {/* Voice Selector Pill — Create mode only (when no custom voiceover file is uploaded) */}
                      {studioMode === "create" && !audioVoiceoverName && (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover((prev) =>
                            prev === "voice" ? null : "voice"
                          )
                        }
                        className={`h-7 w-8 p-0 rounded-full border-2 hidden sm:flex items-center justify-center mono text-[10px] font-bold transition active:scale-95 shrink-0 whitespace-nowrap ${
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
                      </button>
                      )}

                      {/* Voiceover Audio & Reference Image Upload Pills — Create mode */}
                      {studioMode === "create" && (
                        <>
                          <button
                            type="button"
                            onClick={() => audioFileInputRef.current?.click()}
                            title={
                              audioVoiceoverName
                                ? `Voiceover: ${audioVoiceoverName}`
                                : "Upload voiceover audio; the selected template controls the visuals"
                            }
                            className={`h-7 px-2 sm:px-2.5 rounded-full border-2 flex items-center gap-1 mono text-[10px] sm:text-[11px] font-bold transition active:scale-95 shrink-0 whitespace-nowrap ${
                              audioVoiceoverName
                                ? "bg-[#2563EB] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                                : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                            }`}
                          >
                            <Volume2 size={12} className={audioVoiceoverName ? "text-white" : "text-[#2563EB]"} />
                            <span>
                              {audioVoiceoverName
                                ? `Audio ready${audioVoiceoverDuration ? ` • ${Math.round(audioVoiceoverDuration)}s` : ""}`
                                : "Audio"}
                            </span>
                          </button>
                          <input
                            ref={audioFileInputRef}
                            type="file"
                            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac"
                            className="hidden"
                            onChange={(e) => {
                              handleAudioVoiceoverFile(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => referenceImageInputRef.current?.click()}
                            title={
                              referenceImageName
                                ? `Reference image: ${referenceImageName}`
                                : "Upload optional reference image for character or visual style"
                            }
                            className={`h-7 px-2 sm:px-2.5 rounded-full border-2 flex items-center gap-1 mono text-[10px] sm:text-[11px] font-bold transition active:scale-95 shrink-0 whitespace-nowrap ${
                              referenceImageName
                                ? "bg-[#141414] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                                : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                            }`}
                          >
                            <Upload size={12} className={referenceImageName ? "text-[#FFDD67]" : "text-[#E4491B]"} />
                            <span>
                              {referenceImageName ? "Ref Image ✓" : "Ref Image"}
                            </span>
                          </button>
                          <input
                            ref={referenceImageInputRef}
                            type="file"
                            accept="image/*,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            onChange={(e) => {
                              handleReferenceImageFile(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </>
                      )}

                      {/* Auto-edit pills: video upload + running script — Pipeline B only */}
                      {studioMode === "autoEdit" && (
                        <>
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            title={
                              editVideoName
                                ? `Uploaded: ${editVideoName}`
                                : "Upload your talking video"
                            }
                            className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 shrink-0 whitespace-nowrap ${
                              editVideoName
                                ? "bg-[#E4491B] text-white border-[#141414] shadow-[1px_1px_0px_#141414]"
                                : "bg-[#FFFFFF] border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                            }`}
                          >
                            {editVideoName ? <Check size={12} /> : <Upload size={12} />}
                            <span>
                              {editVideoName
                                ? `Video ready${editVideoDuration ? ` • ${Math.round(editVideoDuration)}s` : ""}`
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
                            className={`h-8 px-2.5 sm:px-3 rounded-full border-2 flex items-center gap-1.5 mono text-[11px] sm:text-[12px] font-bold transition active:scale-95 shrink-0 whitespace-nowrap ${
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
                        </>
                      )}
                    </div>

                    {/* Right: Vibrant Generate Button with Pip */}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={
                        isGenerating ||
                        isGeneratingCode ||
                        (audioVoiceoverName
                          ? false
                          : studioMode === "autoEdit"
                          ? !editVideoFileRef.current && !editVideoName && !input.trim()
                          : !input.trim())
                      }
                      aria-label="Generate Reel"
                      className="h-8.5 sm:h-9 px-3 sm:px-4 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white font-bold text-[13px] flex items-center gap-1.5 shadow-[2px_2px_0px_#141414] disabled:opacity-40 disabled:shadow-none hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition shrink-0 ml-auto"
                    >
                      <div className="shrink-0">
                        <Pip
                          mood={
                            isGenerating || isGeneratingCode
                              ? inferPipMoodFromContext(generatingStep, "writing")
                              : studioMode === "autoEdit" && editVideoName
                              ? "listening"
                              : input.trim().length > 100
                              ? "thinking"
                              : input.trim().length > 0
                              ? isInternetEnabled
                                ? "reading"
                                : "listening"
                              : activePopover !== null
                              ? "thinking"
                              : "idle"
                          }
                          size={18}
                          interactive={false}
                        />
                      </div>
                      {isGenerating || isGeneratingCode ? (
                        <span>Directing...</span>
                      ) : (
                        <>
                          <span>
                            {audioVoiceoverName
                              ? `Direct ${audioStyle.toUpperCase()} Story`
                              : studioMode === "autoEdit"
                              ? "Auto-Edit Video"
                              : "Generate"}
                          </span>
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
        <aside className="hidden lg:flex w-[400px] shrink-0 border-l border-[#D5D2C8] bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#F5EFE6] flex-col items-center sticky top-0 h-screen overflow-hidden shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.04)]">
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
              audioStory={activeMessage?.audioStory}
              proceduralStory={activeMessage?.proceduralStory}
              editPlan={activeMessage?.editPlan}
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
                      audioStory={activeMessage?.audioStory}
                      proceduralStory={activeMessage?.proceduralStory}
                      editPlan={activeMessage?.editPlan}
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
                  onClick={() => {
                    if (activeMessage?.audioStory) {
                      window.dispatchEvent(new CustomEvent("export-audio-story-mp4"));
                    } else if (
                      activeMessage?.pipeline === "pipeline-b" ||
                      activeMessage?.videoUrl ||
                      activeMessage?.finalDownloadUrl
                    ) {
                      window.dispatchEvent(new CustomEvent("export-pipeline-b-mp4"));
                    } else {
                      setIsExportModalOpen(true);
                    }
                  }}
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

                  if (activeMessage?.audioStory) {
                    return (
                      <div className="w-full max-w-[360px] flex flex-col items-center">
                        <CinematicStoryStage
                          audioUrl={activeMessage.audioStory.audioUrl}
                          finalVideoUrl={activeMessage.audioStory.finalVideoUrl}
                          scenes={activeMessage.audioStory.scenes}
                          words={activeMessage.audioStory.words}
                          duration={activeMessage.audioStory.duration}
                          topic={activeMessage.audioStory.title || activeMessage.text || input}
                          style={activeMessage.audioStory.style}
                          runId={activeMessage.audioStory.runId}
                        />
                      </div>
                    );
                  }

                  if (activeMessage?.videoUrl || activeMessage?.finalDownloadUrl) {
                    return (
                      <div className="w-full max-w-[360px] flex flex-col items-center">
                        <TalkingHeadExplainerStage
                          cleanVideoUrl={activeMessage.videoUrl}
                          finalVideoUrl={activeMessage.finalDownloadUrl}
                          runId={activeMessage?.pipelineBRunId || activeMessage?.editPlan?.runId || activeMessage?.editPlan?.planId}
                          editPlan={activeMessage.editPlan}
                          beats={currentBeats}
                          topic={activeMessage.text || input}
                        />
                      </div>
                    );
                  }

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
