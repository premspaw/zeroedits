"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Download,
  Film,
  Layers,
  Code2,
  FileText,
  Volume2,
  VolumeX,
  Sliders,
  Share2,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Wand2,
  Cpu,
  CheckCircle2,
  Clock,
  Palette,
  Eye,
  RefreshCw,
} from "lucide-react";
import type { HeaderTab } from "./AppleDockNav";

interface ClayStudioViewProps {
  onSwitchToTab?: (tab: HeaderTab) => void;
  onSendScriptToStudio?: (scriptText: string, title?: string) => void;
  onSendToScriptBank?: (topic: string) => void;
}

interface ClayTopicPreset {
  id: string;
  emoji: string;
  title: string;
  hookLine: string;
  pillWord: string;
  metricNumber: string;
  metricLabel: string;
  subtitle: string;
  subtitleHighlight: string;
  characterName: string;
  heroObject: string;
  personality: string;
  worldDesc: string;
  masterPrompt: string;
  explanation: string;
}

const CLAY_PRESETS: ClayTopicPreset[] = [
  {
    id: "honey",
    emoji: "🍯",
    title: "HONEY NEVER SPOILS",
    hookLine: "Honey never spoils.",
    pillWord: "NEVER",
    metricNumber: "3,000",
    metricLabel: "YEARS",
    subtitle: "Found in Egyptian tombs, still edible",
    subtitleHighlight: "edible",
    characterName: "Horus the Honey Jar",
    heroObject: "smiling honey jar with clay lid and amber honey",
    personality: "Smug, immortal ancient elder",
    worldDesc: "Soft peach clay kitchen table (#FBE8D3) with diffuse studio lighting",
    masterPrompt:
      'Handmade claymation 3D, 9:16, 5 s. A smiling honey jar character with big glossy eyes drops onto a soft peach clay table, squashes and bounces. Plasticine texture with visible fingerprints, soft studio lighting, subtle grain, warm cream and amber palette. Slow camera push-in. Chunky cream title text "HONEY NEVER SPOILS" pops in word by word with "NEVER" in a coral pill. A clay bar chart grows to "3,000 YEARS", then a subtitle "Found in Egyptian tombs, still edible". Stop-motion feel at 12 fps.',
    explanation:
      "Because of zero moisture and high acidity, bacteria and microorganisms physically cannot survive inside pure honey.",
  },
  {
    id: "octopus",
    emoji: "🐙",
    title: "OCTOPUS HAS 3 HEARTS",
    hookLine: "An octopus has three hearts.",
    pillWord: "3 HEARTS",
    metricNumber: "3",
    metricLabel: "HEARTS",
    subtitle: "Two stop beating when they swim",
    subtitleHighlight: "stop beating",
    characterName: "Ollie the Clay Octopus",
    heroObject: "curious terracotta clay octopus with bead eyes and wiggling clay tentacles",
    personality: "Charming, multitasking alien marvel",
    worldDesc: "Deep teal clay ocean diorama (#2A9D8F) with clay bubbles and coral stones",
    masterPrompt:
      'Handmade claymation 3D, 9:16, 5 s. A charming terracotta clay octopus with bead eyes drops onto a soft turquoise clay seafloor, squashes and bounces. Plasticine texture with visible thumbprints, soft studio lighting, subtle grain. Slow camera push-in. Chunky title "OCTOPUS HAS 3 HEARTS" pops in with "3 HEARTS" in a coral pill. Three pulsing clay hearts light up with a counter "3 HEARTS", then subtitle "Two stop beating when they swim". Stop-motion feel at 12 fps.',
    explanation:
      "Two branchial hearts pump blue copper-rich blood through the gills, while one systemic heart circulates it to the body.",
  },
  {
    id: "banana",
    emoji: "🍌",
    title: "BANANAS ARE BERRIES",
    hookLine: "Bananas are scientifically berries.",
    pillWord: "BERRIES",
    metricNumber: "100%",
    metricLabel: "BOTANICAL",
    subtitle: "Strawberries are not even real berries",
    subtitleHighlight: "not real berries",
    characterName: "Barnaby the Clay Banana",
    heroObject: "cheerful yellow clay banana with expressive clay eyebrows and tiny clay shoes",
    personality: "Playful, smug botanical rule-breaker",
    worldDesc: "Warm cream clay countertop (#FFFDF7) with mini clay leaves and soil pot",
    masterPrompt:
      'Handmade claymation 3D, 9:16, 5 s. A cheerful yellow clay banana character with glossy bead eyes drops onto a warm peach clay surface, squashing and bouncing playfully. Plasticine modeling clay with visible fingerprints. Title "BANANAS ARE BERRIES" pops in word-by-word with "BERRIES" in a coral pill. A clay botanical badge stamps "100% BOTANICAL", followed by subtitle "Strawberries are not even real berries". Stop-motion 12 fps.',
    explanation:
      "In botanical terms, a berry comes from a flower with a single ovary, making bananas, avocados, and tomatoes true berries.",
  },
  {
    id: "trees",
    emoji: "🌲",
    title: "TREES TALK UNDERGROUND",
    hookLine: "Trees talk to each other underground.",
    pillWord: "TALK",
    metricNumber: "500+",
    metricLabel: "METERS",
    subtitle: "Through a secret fungal internet",
    subtitleHighlight: "fungal internet",
    characterName: "Rowan the Clay Pine",
    heroObject: "wise mini clay pine tree with mossy clay canopy and clay root tendrils",
    personality: "Ancient subterranean communicator",
    worldDesc: "Layered clay forest soil diorama with glowing terracotta mycelium threads",
    masterPrompt:
      'Handmade claymation 3D, 9:16, 5 s. A stylized clay pine tree with glowing clay root tendrils drops onto a terracotta soil bed, squashes and settles. Plasticine texture, soft cinematic rim lighting. Title "TREES TALK UNDERGROUND" pops in with "TALK" in a coral capsule. Clay network lines pulse to "500+ METERS", then subtitle "Through a secret fungal internet". Stop-motion 12 fps.',
    explanation:
      "Mycorrhizal fungal networks connect tree roots across entire forests, sharing carbon, nutrients, and warning signals of pest attacks.",
  },
];

// Web Audio API Procedural SFX Synthesizer
class ClaySoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playThud() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(38, this.ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {}
  }

  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(820, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {}
  }

  playChime() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.0, this.ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {}
  }
}

export default function ClayStudioView({
  onSwitchToTab,
  onSendScriptToStudio,
  onSendToScriptBank,
}: ClayStudioViewProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("honey");
  const [activeTab, setActiveTab] = useState<"player" | "storyboard" | "prompts" | "guide">("player");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [is12Fps, setIs12Fps] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Custom topic / script editing state
  const [customTopic, setCustomTopic] = useState<string>("");
  const [customScript, setCustomScript] = useState<string>("");
  const [isDirectingCustom, setIsDirectingCustom] = useState<boolean>(false);

  const soundEngineRef = useRef<ClaySoundEngine | null>(null);
  const lastSoundTriggerRef = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number>(performance.now());

  const currentPreset = useMemo(() => {
    return CLAY_PRESETS.find((p) => p.id === selectedPresetId) || CLAY_PRESETS[0];
  }, [selectedPresetId]);

  // Initialize sound engine on client
  useEffect(() => {
    soundEngineRef.current = new ClaySoundEngine();
  }, []);

  // Main playback timer loop (0.0 to 5.0 seconds loop)
  useEffect(() => {
    if (!isPlaying) {
      lastWallTimeRef.current = performance.now();
      return;
    }

    lastWallTimeRef.current = performance.now();

    const loop = (now: number) => {
      const deltaSec = ((now - lastWallTimeRef.current) / 1000) * playbackSpeed;
      lastWallTimeRef.current = now;

      setCurrentTime((prev) => {
        let next = prev + deltaSec;
        if (next >= 5.0) {
          next = 0.0;
          lastSoundTriggerRef.current = {}; // reset triggers
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Step-quantized time if 12 FPS stop-motion is enabled
  const renderTime = useMemo(() => {
    if (!is12Fps) return currentTime;
    const fps = 12;
    return Math.floor(currentTime * fps) / fps;
  }, [currentTime, is12Fps]);

  // Audio Cue Synchronizer
  useEffect(() => {
    if (!isAudioEnabled || !soundEngineRef.current) return;

    // 0.35s - Thud on impact
    if (renderTime >= 0.35 && renderTime < 0.6 && !lastSoundTriggerRef.current["thud"]) {
      soundEngineRef.current.playThud();
      lastSoundTriggerRef.current["thud"] = true;
    }
    // 1.10s - Pop on pill reveal
    if (renderTime >= 1.1 && renderTime < 1.35 && !lastSoundTriggerRef.current["pill"]) {
      soundEngineRef.current.playPop();
      lastSoundTriggerRef.current["pill"] = true;
    }
    // 3.0s - Chime on subtitle & hop
    if (renderTime >= 3.0 && renderTime < 3.4 && !lastSoundTriggerRef.current["hop"]) {
      soundEngineRef.current.playChime();
      lastSoundTriggerRef.current["hop"] = true;
    }
  }, [renderTime, isAudioEnabled]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Physics calculation for squash and stretch
  const { jarY, scaleX, scaleY, rotation, isBlinking } = useMemo(() => {
    const t = renderTime;

    let y = 0;
    let sx = 1.0;
    let sy = 1.0;
    let rot = 0;

    // 0.0s to 0.8s: Drop, Impact, Squash & Stretch, Settle
    if (t < 0.35) {
      // Falling from top
      const p = t / 0.35;
      y = -190 * (1 - p * p);
      sx = 0.94;
      sy = 1.08;
      rot = -3 * (1 - p);
    } else if (t < 0.46) {
      // Maximum squash on table impact
      const p = (t - 0.35) / 0.11;
      y = 12 * Math.sin(p * Math.PI);
      sx = 1.0 + 0.38 * Math.sin(p * Math.PI);
      sy = 1.0 - 0.36 * Math.sin(p * Math.PI);
      rot = 0;
    } else if (t < 0.62) {
      // Rebound stretch jump
      const p = (t - 0.46) / 0.16;
      y = -22 * Math.sin(p * Math.PI);
      sx = 1.0 - 0.14 * Math.sin(p * Math.PI);
      sy = 1.0 + 0.2 * Math.sin(p * Math.PI);
      rot = 2 * Math.sin(p * Math.PI);
    } else if (t < 0.82) {
      // Settle bounce
      const p = (t - 0.62) / 0.2;
      y = 4 * Math.sin(p * Math.PI);
      sx = 1.0 + 0.08 * Math.sin(p * Math.PI);
      sy = 1.0 - 0.08 * Math.sin(p * Math.PI);
    } else if (t >= 3.0 && t < 3.65) {
      // Celebratory hop at 3.0s
      const p = (t - 3.0) / 0.65;
      y = -32 * Math.sin(p * Math.PI);
      sx = p < 0.5 ? 0.92 : 1.08;
      sy = p < 0.5 ? 1.15 : 0.92;
      rot = 4 * Math.sin(p * Math.PI * 2);
    } else {
      // Idle breathing pulse
      const breathe = Math.sin((t - 0.82) * 3.5);
      y = 0;
      sx = 1.0 + breathe * 0.02;
      sy = 1.0 - breathe * 0.02;
    }

    // Eye blinking at 1.25s and 3.75s
    const isBlink =
      (t >= 1.25 && t <= 1.38) ||
      (t >= 3.75 && t <= 3.88);

    return { jarY: y, scaleX: sx, scaleY: sy, rotation: rot, isBlinking: isBlink };
  }, [renderTime]);

  // Words breakdown for title pop-in (0.8s - 1.6s)
  const titleWords = useMemo(() => {
    return currentPreset.title.split(" ");
  }, [currentPreset.title]);

  // Metric fill progress (1.8s - 3.2s)
  const metricProgress = useMemo(() => {
    if (renderTime < 1.8) return 0;
    if (renderTime >= 3.2) return 1;
    return (renderTime - 1.8) / 1.4;
  }, [renderTime]);

  // Subtitle visibility (3.0s - 4.8s)
  const isSubtitleVisible = renderTime >= 3.0;

  // Camera zoom push-in (1.00x -> 1.10x)
  const cameraZoom = 1.0 + (renderTime / 5.0) * 0.09;

  // Generated Storyboard JSON compliant with schema
  const storyboardJson = useMemo(() => {
    return {
      meta: {
        topic: currentPreset.title,
        aspect: "9:16",
        fps: is12Fps ? 12 : 30,
        audio_duration: 5.0,
      },
      style_bible: "clay-v1",
      scenes: [
        {
          id: 1,
          start: 0.0,
          end: 2.4,
          vo_text: currentPreset.hookLine,
          word_timestamps: [
            { word: titleWords[0] || "Topic", start: 0.8, end: 1.1 },
            { word: currentPreset.pillWord, start: 1.1, end: 1.4 },
            { word: titleWords[titleWords.length - 1] || "Fact", start: 1.4, end: 1.8 },
          ],
          world: currentPreset.worldDesc,
          hero_object: currentPreset.heroObject,
          personality: currentPreset.personality,
          camera: { move: "slow push-in", speed: "subtle" },
          motion: ["drop", "squash-stretch", "blink"],
          on_screen: {
            title: currentPreset.title,
            highlight: [currentPreset.pillWord],
            max_words_visible: 3,
          },
          data_viz: {
            type: "bar",
            value: currentPreset.metricNumber,
            unit: currentPreset.metricLabel,
          },
          render_route: "video_model",
          video_prompt: currentPreset.masterPrompt,
          fallback_route: "remotion_puppet",
          transition: "clay wipe",
          sfx: [
            { t: 0.35, cue: "clay_thud" },
            { t: 1.1, cue: "pill_pop" },
          ],
        },
        {
          id: 2,
          start: 2.4,
          end: 5.0,
          vo_text: currentPreset.subtitle,
          word_timestamps: [
            { word: currentPreset.subtitleHighlight, start: 3.0, end: 3.5 },
          ],
          world: currentPreset.worldDesc,
          hero_object: currentPreset.heroObject,
          personality: currentPreset.personality,
          camera: { move: "macro tracking", speed: "gentle" },
          motion: ["joy_hop", "side_tilt", "smile_expand"],
          on_screen: {
            subtitle: currentPreset.subtitle,
            highlight: [currentPreset.subtitleHighlight],
          },
          data_viz: {
            type: "counter_fill",
            current: currentPreset.metricNumber,
          },
          render_route: "video_model",
          video_prompt: `Handmade claymation 3D close-up. ${currentPreset.heroObject} hops joyfully with big glossy eyes, clay particles around. Warm amber studio light, 12 fps stop-motion.`,
          fallback_route: "remotion_puppet",
          transition: "fade to clay emblem",
          sfx: [{ t: 3.0, cue: "chime_hop" }],
        },
      ],
    };
  }, [currentPreset, is12Fps, titleWords]);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 pt-1 pb-16 min-h-[calc(100vh-60px)] flex flex-col gap-6 text-[#141414]">
      {/* Top Studio Bar */}
      <div className="w-full bg-[#FFFFFF] border-2 border-[#141414] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#141414] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#F6D9CC] text-[#E4491B] border border-[#141414]">
              Clay 3D Template Engine
            </span>
            <span className="mono text-[11px] text-[#4A4842] flex items-center gap-1 font-semibold">
              <Sparkles size={13} className="text-[#E4491B]" />
              Plasticine Stop-Motion • 9:16 Vertical Reel
            </span>
          </div>
          <h1 className="serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141414]">
            Clay 3D Reel Studio & Director
          </h1>
          <p className="text-[13px] text-[#4A4842] mt-0.5">
            Deterministic Remotion physics compositor + Meta Wonder & Veo/Kling prompts for tactile stop-motion storytelling.
          </p>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              if (onSendScriptToStudio) {
                onSendScriptToStudio(
                  `${currentPreset.hookLine}\n${currentPreset.subtitle}\n\n${currentPreset.explanation}`,
                  currentPreset.title
                );
              } else if (onSwitchToTab) {
                onSwitchToTab("edit");
              }
            }}
            className="py-2 px-3.5 rounded-xl border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] transition"
          >
            <Film size={14} />
            <span>Open in Video Studio</span>
          </button>

          <button
            onClick={() => {
              if (onSendToScriptBank) {
                onSendToScriptBank(currentPreset.title);
              } else if (onSwitchToTab) {
                onSwitchToTab("script");
              }
            }}
            className="py-2 px-3.5 rounded-xl border-2 border-[#141414] bg-[#FBE8D3] hover:bg-[#F6D9CC] text-[#141414] text-[12px] font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] transition"
          >
            <BookOpen size={14} />
            <span>Send to Script Bank</span>
          </button>
        </div>
      </div>

      {/* Preset Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="mono text-[11px] font-bold uppercase tracking-wider text-[#4A4842] shrink-0 mr-1">
          Select Topic Preset:
        </span>
        {CLAY_PRESETS.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setCurrentTime(0);
                lastSoundTriggerRef.current = {};
              }}
              className={`py-1.5 px-3 rounded-xl border-2 text-[12px] font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                isSelected
                  ? "bg-[#141414] text-white border-[#141414] shadow-[2px_2px_0px_#E4491B]"
                  : "bg-white text-[#141414] border-[#141414]/30 hover:border-[#141414]"
              }`}
            >
              <span>{preset.emoji}</span>
              <span>{preset.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Studio Grid: Left Reel Stage, Right Director Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 5-Second Clay Reel Stage (9:16 Mockup) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[380px] bg-[#FFFFFF] border-2 border-[#141414] rounded-3xl p-3 shadow-[6px_6px_0px_#141414] relative">
            {/* Header info bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#141414]/15 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E4491B] animate-pulse" />
                <span className="mono text-[11px] font-bold uppercase tracking-wider text-[#141414]">
                  Clay 3D Canvas (9:16)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIs12Fps(!is12Fps)}
                  className={`mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    is12Fps
                      ? "bg-[#E76F51] text-white border-[#141414]"
                      : "bg-[#ECEAE3] text-[#4A4842] border-[#141414]/30"
                  }`}
                  title="Toggle 12 FPS Stop-Motion stepping cadence"
                >
                  {is12Fps ? "12 FPS Step" : "60 FPS Fluid"}
                </button>
                <button
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className="p-1 rounded-md text-[#141414] hover:bg-[#ECEAE3] transition"
                  title="Toggle Clay SFX Synthesizer"
                >
                  {isAudioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-[#999]" />}
                </button>
              </div>
            </div>

            {/* Vertical Video Stage (9:16 Aspect Ratio) */}
            <div
              className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden border-2 border-[#141414] shadow-inner select-none"
              style={{
                background: "linear-gradient(180deg, #FBE8D3 0%, #F5D2B3 55%, #E9C46A 100%)",
              }}
            >
              {/* Camera Push-in Wrapper */}
              <div
                className="w-full h-full relative flex flex-col items-center justify-between p-5 transition-transform duration-75"
                style={{
                  transform: `scale(${cameraZoom})`,
                  transformOrigin: "center 55%",
                }}
              >
                {/* Subtle Table Horizon Line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[42%] bg-gradient-to-t from-[#E5A86D] via-[#F4A261] to-[#FBE8D3] border-t-2 border-[#D48C18]/40"
                  style={{
                    borderRadius: "40% 40% 0 0 / 12px",
                  }}
                />

                {/* Soft Studio Shadow beneath character */}
                <div
                  className="absolute bottom-[35%] w-[140px] h-[34px] rounded-full bg-[#3D2612]/25 blur-[6px] transition-all duration-75"
                  style={{
                    transform: `scale(${scaleX * 1.05}, ${scaleY * 0.45}) translate(${jarY * 0.1}px, ${-jarY * 0.15}px)`,
                    opacity: jarY < -50 ? 0.2 : 0.6,
                  }}
                />

                {/* TOP: Pop-in Word-by-Word Title (0.8s - 1.6s) */}
                <div className="relative z-20 w-full pt-4 flex flex-col items-center text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[260px]">
                    {titleWords.map((word, idx) => {
                      const wordPopTime = 0.8 + idx * 0.24;
                      const isVisible = renderTime >= wordPopTime;
                      const isPill = word.toUpperCase() === currentPreset.pillWord.toUpperCase();

                      if (!isVisible) return null;

                      if (isPill) {
                        return (
                          <span
                            key={idx}
                            className="inline-block px-3 py-1 rounded-full text-white font-extrabold text-[15px] tracking-wide shadow-[0px_4px_10px_rgba(231,111,81,0.5)] border-2 border-[#FFFDF7]"
                            style={{
                              backgroundColor: "#E76F51",
                              fontFamily: "Montserrat, Poppins, sans-serif",
                              transform: `scale(${renderTime < wordPopTime + 0.14 ? 1.25 : 1.0})`,
                              transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                          >
                            {word}
                          </span>
                        );
                      }

                      return (
                        <span
                          key={idx}
                          className="font-black text-[17px] tracking-tight text-[#FFFDF7] drop-shadow-[0_2px_4px_rgba(20,20,20,0.6)]"
                          style={{
                            fontFamily: "Montserrat, Anton, sans-serif",
                            transform: `scale(${renderTime < wordPopTime + 0.12 ? 1.18 : 1.0})`,
                            transition: "transform 0.12s ease-out",
                          }}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* MIDDLE: Animated Clay Character with Drop & Squash/Stretch */}
                <div
                  className="relative z-10 flex flex-col items-center justify-center my-auto transition-transform duration-75"
                  style={{
                    transform: `translateY(${jarY}px) scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`,
                    transformOrigin: "bottom center",
                  }}
                >
                  {/* Clay Jar Character Illustration */}
                  <div className="relative w-[130px] h-[155px] flex flex-col items-center">
                    {/* Clay Lid */}
                    <div
                      className="w-[90px] h-[26px] rounded-t-xl rounded-b-md border-3 border-[#2A170B] shadow-[0_4px_0_#9E452E] flex items-center justify-center relative z-20"
                      style={{ backgroundColor: "#E76F51" }}
                    >
                      <div className="w-[30px] h-[6px] rounded-full bg-[#FFFDF7]/40 mb-1" />
                    </div>

                    {/* Clay Jar Neck & Ribbon */}
                    <div className="w-[74px] h-[12px] bg-[#C85A3E] border-x-3 border-[#2A170B] z-15" />

                    {/* Clay Jar Body with Honey Glow */}
                    <div
                      className="w-[126px] h-[120px] rounded-3xl border-3 border-[#2A170B] shadow-[inset_0_-8px_0_rgba(0,0,0,0.15),0_6px_14px_rgba(40,20,5,0.3)] flex flex-col items-center justify-center relative overflow-hidden"
                      style={{
                        background:
                          selectedPresetId === "octopus"
                            ? "linear-gradient(180deg, #F4A261 0%, #E76F51 100%)"
                            : selectedPresetId === "banana"
                            ? "linear-gradient(180deg, #FFE17D 0%, #F4A261 100%)"
                            : selectedPresetId === "trees"
                            ? "linear-gradient(180deg, #2A9D8F 0%, #264653 100%)"
                            : "linear-gradient(180deg, #F4A261 0%, #D48C18 70%, #B8730E 100%)",
                      }}
                    >
                      {/* Clay highlight streak */}
                      <div className="absolute top-2 left-3 w-[16px] h-[40px] rounded-full bg-[#FFFDF7]/45 rotate-[18deg]" />

                      {/* Character Face: Big Bead Eyes with Specular Highlights */}
                      <div className="flex items-center gap-7 mt-[-10px] relative z-10">
                        {/* Left Eye */}
                        <div
                          className="w-[16px] h-[16px] rounded-full bg-[#1A1A1A] border border-[#000] relative flex items-start justify-end p-0.5 transition-transform"
                          style={{
                            height: isBlinking ? "2px" : "16px",
                            transform: isBlinking ? "scaleY(0.1)" : "none",
                          }}
                        >
                          {!isBlinking && (
                            <>
                              <div className="w-[5px] h-[5px] rounded-full bg-white mr-0.5 mt-0.5" />
                              <div className="w-[2px] h-[2px] rounded-full bg-white absolute bottom-1 left-1" />
                            </>
                          )}
                        </div>

                        {/* Right Eye */}
                        <div
                          className="w-[16px] h-[16px] rounded-full bg-[#1A1A1A] border border-[#000] relative flex items-start justify-end p-0.5 transition-transform"
                          style={{
                            height: isBlinking ? "2px" : "16px",
                            transform: isBlinking ? "scaleY(0.1)" : "none",
                          }}
                        >
                          {!isBlinking && (
                            <>
                              <div className="w-[5px] h-[5px] rounded-full bg-white mr-0.5 mt-0.5" />
                              <div className="w-[2px] h-[2px] rounded-full bg-white absolute bottom-1 left-1" />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Clay Rosy Cheeks */}
                      <div className="w-full flex items-center justify-between px-5 mt-[-2px] opacity-75">
                        <div className="w-[12px] h-[6px] rounded-full bg-[#E76F51]" />
                        <div className="w-[12px] h-[6px] rounded-full bg-[#E76F51]" />
                      </div>

                      {/* Happy Clay Smile */}
                      <div className="w-[20px] h-[10px] border-b-3 border-[#1A1A1A] rounded-b-full mt-[-2px]" />

                      {/* Clay Label / Emblem on belly */}
                      <div className="mt-2 px-2.5 py-0.5 rounded-md bg-[#FFFDF7] border border-[#2A170B]/60 text-[9px] font-black text-[#2A170B] tracking-wider uppercase shadow-xs">
                        {selectedPresetId === "honey"
                          ? "PURE HONEY"
                          : selectedPresetId === "octopus"
                          ? "3 HEARTS"
                          : selectedPresetId === "banana"
                          ? "100% BERRY"
                          : "MYCELIUM"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM: Metric Counter & Physical Clay Bar (1.8s - 3.2s) + Subtitle (3.0s - 4.8s) */}
                <div className="relative z-20 w-full flex flex-col items-center gap-2 pb-2">
                  {/* Metric Counter & Clay Bar */}
                  {renderTime >= 1.8 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-[260px] bg-[#FFFDF7]/95 border-2 border-[#141414] rounded-xl p-2.5 shadow-[0px_4px_0px_#141414] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="mono text-[10px] font-black uppercase text-[#E76F51] tracking-wider">
                          Physical Evidence
                        </span>
                        <span className="mono text-[14px] font-black text-[#141414]">
                          {metricProgress >= 0.98
                            ? `${currentPreset.metricNumber} ${currentPreset.metricLabel}`
                            : `${Math.round(metricProgress * (parseInt(currentPreset.metricNumber.replace(/[^0-9]/g, "")) || 100))} ${currentPreset.metricLabel}`}
                        </span>
                      </div>

                      {/* Clay Progress Bar */}
                      <div className="w-full h-3 bg-[#ECEAE3] rounded-full border border-[#141414] overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-75 shadow-xs"
                          style={{
                            width: `${Math.min(100, Math.max(8, metricProgress * 100))}%`,
                            background: "linear-gradient(90deg, #F4A261 0%, #E76F51 100%)",
                          }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Subtitle with highlighted keyword */}
                  {isSubtitleVisible && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full max-w-[270px] bg-[#141414]/90 text-white border border-[#FFFDF7]/40 rounded-xl px-3 py-1.5 text-center shadow-lg"
                    >
                      <p className="text-[11px] font-semibold leading-tight text-[#ECEAE3]">
                        {currentPreset.subtitle.split(currentPreset.subtitleHighlight)[0]}
                        <span className="text-[#FFE17D] font-black underline decoration-2 underline-offset-2">
                          {currentPreset.subtitleHighlight}
                        </span>
                        {currentPreset.subtitle.split(currentPreset.subtitleHighlight)[1]}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Tactile 35mm Film Grain Simulation Overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
                  style={{
                    backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                    backgroundSize: "4px 4px",
                  }}
                />
              </div>
            </div>

            {/* Playback Scrub & Control Bar */}
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => {
                    setCurrentTime(parseFloat(e.target.value));
                    lastSoundTriggerRef.current = {};
                  }}
                  className="w-full h-1.5 bg-[#ECEAE3] rounded-lg appearance-none cursor-pointer accent-[#E4491B]"
                />
                <span className="mono text-[11px] font-bold text-[#141414] w-[38px] text-right">
                  {renderTime.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-lg border border-[#141414] bg-[#141414] text-white hover:bg-[#333] transition"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTime(0);
                      lastSoundTriggerRef.current = {};
                    }}
                    className="p-1.5 rounded-lg border border-[#141414] bg-white text-[#141414] hover:bg-[#ECEAE3] transition"
                    title="Restart reel to 0.0s"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {[0.5, 1.0, 1.5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        playbackSpeed === speed
                          ? "bg-[#141414] text-white border-[#141414]"
                          : "bg-white text-[#4A4842] border-[#141414]/30"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Director Deck (Storyboards, Prompts & Style Bible) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-2 border-b-2 border-[#141414] pb-2">
            {[
              { id: "player", label: "Overview & Controls", icon: <Film size={14} /> },
              { id: "storyboard", label: "Director Storyboard JSON", icon: <Code2 size={14} /> },
              { id: "prompts", label: "Veo / Kling / Seedance", icon: <Wand2 size={14} /> },
              { id: "guide", label: "Full Style Guide & Architecture", icon: <FileText size={14} /> },
            ].map((tab) => {
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-3 rounded-xl border-2 text-[12px] font-bold flex items-center gap-1.5 transition-all ${
                    isTabActive
                      ? "bg-[#141414] text-white border-[#141414] shadow-[2px_2px_0px_#E4491B]"
                      : "bg-white text-[#4A4842] border-[#141414]/30 hover:border-[#141414] hover:text-[#141414]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Overview & Director Controls */}
          {activeTab === "player" && (
            <div className="flex flex-col gap-4">
              {/* Active Scene Breakdown */}
              <div className="bg-white border-2 border-[#141414] rounded-2xl p-4 shadow-[3px_3px_0px_#141414]">
                <h3 className="serif text-lg font-bold text-[#141414] mb-2 flex items-center gap-2">
                  <span>Active Preset: {currentPreset.title}</span>
                  <span className="text-xl">{currentPreset.emoji}</span>
                </h3>
                <p className="text-[13px] text-[#4A4842] mb-3">
                  {currentPreset.explanation}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                  <div className="bg-[#FBE8D3]/60 border border-[#141414]/20 rounded-xl p-2.5">
                    <span className="mono font-bold text-[10px] uppercase text-[#E76F51] block mb-0.5">
                      Hero Object & Personality
                    </span>
                    <p className="font-semibold text-[#141414]">{currentPreset.characterName}</p>
                    <p className="text-[11px] text-[#4A4842] mt-0.5">{currentPreset.personality}</p>
                  </div>

                  <div className="bg-[#FBE8D3]/60 border border-[#141414]/20 rounded-xl p-2.5">
                    <span className="mono font-bold text-[10px] uppercase text-[#E76F51] block mb-0.5">
                      Tactile World Environment
                    </span>
                    <p className="font-semibold text-[#141414]">{currentPreset.worldDesc}</p>
                  </div>
                </div>
              </div>

              {/* 5-Second Timeline Beat Breakdown */}
              <div className="bg-white border-2 border-[#141414] rounded-2xl p-4 shadow-[3px_3px_0px_#141414]">
                <h4 className="mono text-[11px] font-bold uppercase tracking-wider text-[#141414] mb-3">
                  5-Second Directorial Execution Beat Sheet:
                </h4>

                <div className="space-y-2.5">
                  {[
                    {
                      time: "0.0s – 0.8s",
                      title: "The Drop & Squash Impact",
                      desc: `${currentPreset.characterName} drops onto peach clay table, squashes with spring physics (scaleX 1.38), bounces and settles.`,
                      active: renderTime < 0.8,
                    },
                    {
                      time: "0.8s – 1.6s",
                      title: "Word-by-Word Title Pop-In",
                      desc: `Title words pop with "${currentPreset.pillWord}" encased in a coral clay pill capsule. Eyes track and blink.`,
                      active: renderTime >= 0.8 && renderTime < 1.8,
                    },
                    {
                      time: "1.8s – 3.2s",
                      title: "Physical Counter & Clay Bar Fill",
                      desc: `A clay meter extrudes upward as the odometer spins up to "${currentPreset.metricNumber} ${currentPreset.metricLabel}".`,
                      active: renderTime >= 1.8 && renderTime < 3.2,
                    },
                    {
                      time: "3.0s – 4.2s",
                      title: "Subtitle Reveal & Celebratory Hop",
                      desc: `Subtitle card shows "${currentPreset.subtitleHighlight}" in gold pill while character hops joyfully.`,
                      active: renderTime >= 3.0,
                    },
                  ].map((beat, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border-2 transition-all flex items-start gap-3 ${
                        beat.active
                          ? "bg-[#F6D9CC] border-[#141414] shadow-[2px_2px_0px_#141414]"
                          : "bg-[#ECEAE3]/50 border-[#141414]/20"
                      }`}
                    >
                      <span className="mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-white border border-[#141414] shrink-0">
                        {beat.time}
                      </span>
                      <div>
                        <p className="text-[12px] font-bold text-[#141414]">{beat.title}</p>
                        <p className="text-[11px] text-[#4A4842] mt-0.5">{beat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Topic Generator */}
              <div className="bg-[#FFFDF7] border-2 border-[#141414] rounded-2xl p-4 shadow-[3px_3px_0px_#141414]">
                <h4 className="serif text-base font-bold text-[#141414] mb-1">
                  Direct Any Custom Script or Audio in Clay 3D
                </h4>
                <p className="text-[12px] text-[#4A4842] mb-3">
                  Enter any fact, script, or voiceover text — the Clay Director Agent normalizes it into physical clay worlds.
                </p>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. Sharks existed before trees, or paste custom voice script..."
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#141414] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#E4491B]"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!customTopic.trim()) return;
                        setIsDirectingCustom(true);
                        setTimeout(() => {
                          setSelectedPresetId("honey");
                          if (onSendScriptToStudio) {
                            onSendScriptToStudio(customTopic, customTopic.slice(0, 30));
                          }
                          setIsDirectingCustom(false);
                        }, 600);
                      }}
                      disabled={isDirectingCustom || !customTopic.trim()}
                      className="py-2 px-4 rounded-xl border-2 border-[#141414] bg-[#141414] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#E4491B] hover:bg-[#333] transition disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      <span>{isDirectingCustom ? "Directing Clay World..." : "Generate Clay Storyboard"}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onSendToScriptBank) {
                          onSendToScriptBank(customTopic || currentPreset.title);
                        } else if (onSwitchToTab) {
                          onSwitchToTab("script");
                        }
                      }}
                      className="py-2 px-3.5 rounded-xl border-2 border-[#141414] bg-white text-[#141414] text-[12px] font-bold hover:bg-[#ECEAE3] transition"
                    >
                      <span>Send to Script Bank</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Storyboard JSON */}
          {activeTab === "storyboard" && (
            <div className="bg-white border-2 border-[#141414] rounded-2xl p-4 shadow-[3px_3px_0px_#141414] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="serif text-base font-bold text-[#141414]">
                    Deterministic Storyboard Schema (`clay-v1`)
                  </h3>
                  <p className="text-[12px] text-[#4A4842]">
                    Structured JSON emitted by Claude / Meta Wonder Director Agent for Remotion compositing.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(JSON.stringify(storyboardJson, null, 2), "storyboard")}
                  className="py-1.5 px-3 rounded-xl border-2 border-[#141414] bg-white hover:bg-[#ECEAE3] text-[12px] font-bold flex items-center gap-1.5 transition"
                >
                  {copiedKey === "storyboard" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  <span>{copiedKey === "storyboard" ? "Copied JSON" : "Copy JSON"}</span>
                </button>
              </div>

              <pre className="mono text-[11px] leading-relaxed bg-[#141414] text-[#FBE8D3] p-4 rounded-xl overflow-x-auto max-h-[460px] border border-[#141414]">
                {JSON.stringify(storyboardJson, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 3: Video Model Prompts (Veo / Kling / Seedance) */}
          {activeTab === "prompts" && (
            <div className="bg-white border-2 border-[#141414] rounded-2xl p-4 shadow-[3px_3px_0px_#141414] flex flex-col gap-4">
              <div>
                <h3 className="serif text-base font-bold text-[#141414]">
                  Master Generation Prompts for Video Models
                </h3>
                <p className="text-[12px] text-[#4A4842]">
                  Tested formulas for Google Veo, Kling 1.5, and Seedance image-to-video pipelines.
                </p>
              </div>

              {/* Master Prompt Card */}
              <div className="bg-[#FFFDF7] border-2 border-[#141414] rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="mono text-[11px] font-bold text-[#E4491B] uppercase">
                    Veo / Kling / Seedance Master Prompt (5s 9:16)
                  </span>
                  <button
                    onClick={() => handleCopy(currentPreset.masterPrompt, "masterPrompt")}
                    className="mono text-[11px] font-bold px-2.5 py-1 rounded-md border border-[#141414] bg-white hover:bg-[#ECEAE3] flex items-center gap-1 transition"
                  >
                    {copiedKey === "masterPrompt" ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    <span>{copiedKey === "masterPrompt" ? "Copied" : "Copy Prompt"}</span>
                  </button>
                </div>
                <p className="text-[12px] leading-relaxed text-[#141414] font-medium bg-white p-3 rounded-lg border border-[#141414]/20">
                  {currentPreset.masterPrompt}
                </p>
              </div>

              {/* Prompt Engineering Formula Breakdown */}
              <div className="border border-[#141414]/20 rounded-xl p-3 bg-[#FBE8D3]/40">
                <h4 className="mono text-[11px] font-bold uppercase text-[#141414] mb-2">
                  The Clay 3D Prompt Formula:
                </h4>
                <div className="space-y-1.5 text-[12px] text-[#4A4842]">
                  <p>
                    <strong className="text-[#141414]">1. Core Style Block:</strong>{" "}
                    <code>Handmade claymation 3D, 9:16, stop-motion feel at 12 fps.</code>
                  </p>
                  <p>
                    <strong className="text-[#141414]">2. Character & Action:</strong>{" "}
                    <code>Smiling [Hero Object] character with big glossy bead eyes drops onto soft peach clay table, squashes and bounces.</code>
                  </p>
                  <p>
                    <strong className="text-[#141414]">3. Material & Lighting:</strong>{" "}
                    <code>Plasticine texture with visible thumbprints, soft studio three-point lighting, subtle grain, warm cream and amber palette.</code>
                  </p>
                  <p>
                    <strong className="text-[#141414]">4. Camera & Timing:</strong>{" "}
                    <code>Slow camera push-in. High quality, miniature tabletop diorama aesthetic.</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Style Guide & Architecture */}
          {activeTab === "guide" && (
            <div className="bg-white border-2 border-[#141414] rounded-2xl p-4 shadow-[3px_3px_0px_#141414] flex flex-col gap-5 max-h-[620px] overflow-y-auto">
              <div>
                <h3 className="serif text-lg font-bold text-[#141414]">
                  Clay 3D Reusable Style Guide & Architecture
                </h3>
                <p className="text-[12px] text-[#4A4842]">
                  Permanent specification for the 3-layer video production pipeline.
                </p>
              </div>

              {/* Part 1: Script Style */}
              <div className="border border-[#141414]/20 rounded-xl p-3.5 bg-[#FFFDF7]">
                <h4 className="serif text-base font-bold text-[#E4491B] mb-2">
                  Part 1: Script Style Guide
                </h4>
                <ul className="space-y-2 text-[12px] text-[#4A4842]">
                  <li>
                    <strong className="text-[#141414]">• 1.5s Hook Ownership:</strong> The strongest visual (drop + squash) and the punchiest fact go first (e.g. &quot;Honey never spoils.&quot;).
                  </li>
                  <li>
                    <strong className="text-[#141414]">• Everyday Physical Metaphors:</strong> Every scientific or historical fact is embodied by a single everyday object with eyes and an indented smile.
                  </li>
                  <li>
                    <strong className="text-[#141414]">• 4-Beat Structure:</strong> Hook (0–2.5s) → Physical Proof (2.5–12s) → Mechanism Twist (12–22s) → Lingering Takeaway (22–30s).
                  </li>
                  <li>
                    <strong className="text-[#141414]">• Pacing:</strong> 2.2 to 2.6 words per second (130–155 WPM). Let sound effects and character hops breathe.
                  </li>
                </ul>
              </div>

              {/* Part 2: Animation Style */}
              <div className="border border-[#141414]/20 rounded-xl p-3.5 bg-[#FFFDF7]">
                <h4 className="serif text-base font-bold text-[#E4491B] mb-2">
                  Part 2: Animation & Clay Material Bible
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Peach Base", hex: "#FBE8D3" },
                    { label: "Terracotta Pill", hex: "#E76F51" },
                    { label: "Warm Amber", hex: "#F4A261" },
                    { label: "Gold Metric", hex: "#E9C46A" },
                  ].map((color, idx) => (
                    <div key={idx} className="p-2 rounded-lg border border-[#141414]/30 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md border border-[#141414]" style={{ backgroundColor: color.hex }} />
                      <div>
                        <p className="text-[10px] font-bold text-[#141414] leading-tight">{color.label}</p>
                        <p className="mono text-[9px] text-[#666]">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <ul className="space-y-1.5 text-[12px] text-[#4A4842]">
                  <li>
                    <strong className="text-[#141414]">• Squash & Stretch:</strong> ScaleX expands to 1.35 on table impact while ScaleY compresses to 0.65, followed by damped spring oscillation.
                  </li>
                  <li>
                    <strong className="text-[#141414]">• Text & Numbers in Remotion:</strong> Video models make only the clay background/character. Remotion handles all exact text, pill capsules, and counters deterministically.
                  </li>
                </ul>
              </div>

              {/* Part 3: Architecture & Tools */}
              <div className="border border-[#141414]/20 rounded-xl p-3.5 bg-[#FBE8D3]/50">
                <h4 className="serif text-base font-bold text-[#141414] mb-2">
                  Part 3: Toolchain & Stack Requirements
                </h4>
                <div className="space-y-2 text-[12px] text-[#4A4842]">
                  <p>
                    <strong className="text-[#141414]">1. Input Normalizer:</strong> Whisper (WhisperX / wav2vec2) for word timestamps + ElevenLabs / Google Cloud TTS.
                  </p>
                  <p>
                    <strong className="text-[#141414]">2. Director Agent:</strong> Claude API or Meta Wonder producing deterministic Storyboard JSON.
                  </p>
                  <p>
                    <strong className="text-[#141414]">3. Asset & Motion:</strong> Veo, Kling, Seedance (for hero shots) + Remotion spring rigs (for filler/charts).
                  </p>
                  <p>
                    <strong className="text-[#141414]">4. Compositor & Audio:</strong> Remotion (React) for overlays + FFmpeg for voiceover ducking and audio SFX cues.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

