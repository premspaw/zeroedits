"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Loader2,
  Subtitles,
} from "lucide-react";

export type CameraMotionType =
  | "push_in"
  | "pull_out"
  | "pan_left"
  | "pan_right"
  | "tilt_up"
  | "dramatic_zoom"
  | "slow_drift";

export type AtmosphereType =
  | "sakura"
  | "embers"
  | "rain"
  | "starlight"
  | "golden_dust"
  | "snow"
  | "wind_streaks"
  | "none";

export type LightingMoodType =
  | "golden_hour"
  | "twilight"
  | "moonlight"
  | "neon_night"
  | "stormy"
  | "sunbeams";

export type VisualEffectType =
  | "divine_aura"
  | "lightning_flash"
  | "speed_lines"
  | "sun_flare"
  | "shockwave"
  | "magic_sparkles"
  | "none";

export interface CinematicStoryScene {
  id: string;
  index: number;
  start: number;
  end: number;
  duration: number;
  spokenText: string;
  headline: string;
  visualPrompt: string;
  cameraMotion: CameraMotionType;
  atmosphere?: AtmosphereType;
  lightingMood?: LightingMoodType;
  visualEffect?: VisualEffectType;
  assetUrl?: string;
}

export interface CinematicWordItem {
  word: string;
  start: number;
  end: number;
}

interface SpokenClauseItem {
  text: string;
  start: number;
  end: number;
  words: CinematicWordItem[];
}

interface CinematicStoryStageProps {
  audioUrl?: string;
  finalVideoUrl?: string;
  scenes?: CinematicStoryScene[];
  words?: CinematicWordItem[];
  duration?: number;
  topic?: string;
  style?: string;
  runId?: string;
  onDownloadMp4?: () => void;
}

function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * Math.max(0, Math.min(1, x))) - 1) / 2;
}

function easeOutCubic(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - clamped, 3);
}

function buildClausesFromWords(words: CinematicWordItem[], maxPerClause = 6): SpokenClauseItem[] {
  if (!words || words.length === 0) return [];
  const clauses: SpokenClauseItem[] = [];
  let current: CinematicWordItem[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    current.push(w);
    const nextW = words[i + 1];
    const endsPunct = /[.!?;,:]$/.test(w.word);
    const hasPause = nextW ? nextW.start - w.end > 0.36 : true;

    if (current.length >= maxPerClause || endsPunct || hasPause || !nextW) {
      clauses.push({
        text: current.map((item) => item.word).join(" "),
        start: current[0].start,
        end: current[current.length - 1].end,
        words: [...current],
      });
      current = [];
    }
  }
  return clauses;
}

function drawSceneImageWithCamera(
  ctx: CanvasRenderingContext2D,
  scene: CinematicStoryScene,
  img: HTMLImageElement | undefined,
  t: number,
  W: number,
  H: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  const sceneDur = Math.max(0.5, scene.end - scene.start);
  const rawProg = Math.max(0, Math.min(1, (t - scene.start) / sceneDur));
  const easedProg = easeInOutSine(rawProg);

  // Organic handheld floating motion
  const floatX = Math.sin(t * 1.45 + scene.index) * 8;
  const floatY = Math.cos(t * 1.15 + scene.index) * 6;

  let zoom = 1.06;
  let panX = floatX;
  let panY = floatY;
  let rollRad = 0;

  switch (scene.cameraMotion) {
    case "push_in":
      zoom = 1.02 + 0.20 * easedProg;
      panY = -24 * easedProg + floatY;
      break;
    case "pull_out":
      zoom = 1.24 - 0.20 * easedProg;
      panY = 20 * (1 - easedProg) + floatY;
      break;
    case "pan_left":
      zoom = 1.15;
      panX = 68 * (0.5 - easedProg) + floatX;
      rollRad = -0.012 * Math.sin(rawProg * Math.PI);
      break;
    case "pan_right":
      zoom = 1.15;
      panX = -68 * (0.5 - easedProg) + floatX;
      rollRad = 0.012 * Math.sin(rawProg * Math.PI);
      break;
    case "tilt_up":
      zoom = 1.15;
      panY = 76 * (0.5 - easedProg) + floatY;
      break;
    case "dramatic_zoom":
      zoom = 1.02 + 0.26 * easeOutCubic(rawProg);
      // Subtle impact camera shake on opening beat
      if (rawProg < 0.22) {
        const shake = (1 - rawProg / 0.22) * 9;
        panX += Math.sin(t * 52) * shake;
        panY += Math.cos(t * 47) * shake;
      }
      break;
    default:
      zoom = 1.05 + 0.09 * Math.sin(rawProg * Math.PI);
      panX = 28 * Math.sin(rawProg * Math.PI * 2) + floatX;
      break;
  }

  if (img && img.complete && img.naturalWidth > 0) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(W / iw, H / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.translate(W / 2 + panX, H / 2 + panY);
    if (rollRad !== 0) ctx.rotate(rollRad);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  } else {
    // Lush Procedural Makoto Shinkai Anime Sky & Horizon Fallback while artwork loads
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    if (scene.lightingMood === "neon_night" || scene.lightingMood === "moonlight") {
      skyGrad.addColorStop(0, "#090D24");
      skyGrad.addColorStop(0.5, "#192655");
      skyGrad.addColorStop(0.82, "#384B8C");
      skyGrad.addColorStop(1, "#7C68A6");
    } else {
      skyGrad.addColorStop(0, "#16193B");
      skyGrad.addColorStop(0.42, "#3E2F6D");
      skyGrad.addColorStop(0.74, "#9E4F6E");
      skyGrad.addColorStop(1, "#F29F6D");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Glowing celestial body
    ctx.save();
    ctx.shadowColor = "rgba(255, 228, 175, 0.85)";
    ctx.shadowBlur = 65;
    ctx.fillStyle = "#FFF9EC";
    ctx.beginPath();
    ctx.arc(W * 0.68 + panX * 0.4, H * 0.28 + panY * 0.4, 72 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawSceneVisualEffects(
  ctx: CanvasRenderingContext2D,
  scene: CinematicStoryScene,
  t: number,
  W: number,
  H: number
) {
  const vfx = scene.visualEffect || "none";
  const textLower = `${scene.spokenText || ""} ${scene.visualPrompt || ""}`.toLowerCase();

  // Auto-enhance effect from narrative keywords if "none"
  const activeVfx: VisualEffectType =
    vfx !== "none"
      ? vfx
      : /lightning|thunder|struck|indra|storm/i.test(textLower)
      ? "lightning_flash"
      : /soar|leap|race|fast|flew|rush|speed/i.test(textLower)
      ? "speed_lines"
      : /sun|golden fruit|blaze|solar/i.test(textLower)
      ? "sun_flare"
      : /bless|god|divine|heal|magic|spark/i.test(textLower)
      ? "divine_aura"
      : "magic_sparkles";

  const sceneDur = Math.max(0.5, scene.end - scene.start);
  const localT = Math.max(0, t - scene.start);
  const prog = Math.min(1, localT / sceneDur);

  ctx.save();

  if (activeVfx === "sun_flare" || activeVfx === "divine_aura") {
    // Rotating volumetric golden god-rays & pulsating aura rings
    const cx = W * 0.5;
    const cy = activeVfx === "sun_flare" ? H * 0.24 : H * 0.44;
    const rayCount = 12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.18);
    for (let i = 0; i < rayCount; i++) {
      ctx.rotate((Math.PI * 2) / rayCount);
      const rayGrad = ctx.createLinearGradient(0, 0, 0, H * 0.75);
      const pulse = 0.09 + 0.05 * Math.sin(t * 2.4 + i);
      rayGrad.addColorStop(0, `rgba(255, 226, 130, ${pulse})`);
      rayGrad.addColorStop(0.5, `rgba(255, 175, 70, ${pulse * 0.45})`);
      rayGrad.addColorStop(1, "rgba(255, 140, 30, 0)");
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.lineTo(95, H * 0.75);
      ctx.lineTo(-95, H * 0.75);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Expanding golden aura ring
    const ringRadius = 110 + ((localT * 180) % 520);
    const ringAlpha = Math.max(0, 1 - ringRadius / 630) * 0.32;
    ctx.strokeStyle = `rgba(255, 232, 150, ${ringAlpha})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (activeVfx === "lightning_flash") {
    // Periodic electric lightning flash & branching bolt
    const cycle = (localT * 1.45) % 1.0;
    if (cycle < 0.22) {
      const flashIntensity = (1 - cycle / 0.22) * 0.42;
      ctx.fillStyle = `rgba(210, 238, 255, ${flashIntensity})`;
      ctx.fillRect(0, 0, W, H);

      // Draw jagged lightning bolt
      ctx.save();
      ctx.strokeStyle = `rgba(240, 250, 255, ${Math.min(1, flashIntensity * 2.3)})`;
      ctx.shadowColor = "rgba(90, 195, 255, 0.95)";
      ctx.shadowBlur = 28;
      ctx.lineWidth = 5;
      ctx.beginPath();
      let bx = W * (0.35 + ((Math.floor(localT * 2) * 0.23) % 0.35));
      let by = 0;
      ctx.moveTo(bx, by);
      for (let step = 1; step <= 9; step++) {
        bx += Math.sin(step * 7.3 + localT * 15) * 58;
        by = (H * 0.72 * step) / 9;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();
    }
  } else if (activeVfx === "speed_lines") {
    // Radial anime action speed-lines around perimeter
    const cx = W * 0.5;
    const cy = H * 0.45;
    const lines = 36;
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < lines; i++) {
      const angle = (i / lines) * Math.PI * 2 + Math.sin(t * 8 + i) * 0.02;
      const innerR = W * (0.36 + ((i * 19 + t * 420) % 140) / 1000);
      const outerR = W * 0.95;
      const alpha = 0.14 + 0.12 * Math.sin(t * 14 + i * 3.1);
      ctx.strokeStyle = `rgba(255, 250, 235, ${alpha})`;
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.stroke();
    }
    ctx.restore();
  } else if (activeVfx === "shockwave") {
    const waveProg = (localT * 0.75) % 1.0;
    const rad = waveProg * W * 0.85;
    const alpha = (1 - waveProg) * 0.45;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 220, 150, ${alpha})`;
    ctx.lineWidth = 6 * (1 - waveProg) + 1;
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.48, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Twinkling 4-point anime starlight sparkles for depth
  const starCount = 10;
  for (let i = 0; i < starCount; i++) {
    const sx = ((i * 193 + Math.sin(t * 0.8 + i) * 60) % (W - 120)) + 60;
    const sy = ((i * 271 + Math.cos(t * 0.7 + i) * 50) % (H * 0.75)) + 70;
    const twinkle = Math.max(0, Math.sin(t * 3.4 + i * 1.9));
    if (twinkle > 0.25) {
      const size = (8 + (i % 3) * 5) * twinkle;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = `rgba(255, 248, 220, ${twinkle * 0.78})`;
      ctx.shadowColor = "rgba(255, 215, 120, 0.9)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.quadraticCurveTo(size * 0.18, -size * 0.18, size, 0);
      ctx.quadraticCurveTo(size * 0.18, size * 0.18, 0, size);
      ctx.quadraticCurveTo(-size * 0.18, size * 0.18, -size, 0);
      ctx.quadraticCurveTo(-size * 0.18, -size * 0.18, 0, -size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Subtle anamorphic light-leak flash during the first 0.55s of a scene transition
  if (prog < 0.12 && scene.index > 1) {
    const leakAlpha = (1 - prog / 0.12) * 0.28;
    const leakGrad = ctx.createLinearGradient(0, 0, W, H * 0.6);
    leakGrad.addColorStop(0, `rgba(255, 210, 140, ${leakAlpha})`);
    leakGrad.addColorStop(0.5, `rgba(255, 140, 80, ${leakAlpha * 0.5})`);
    leakGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = leakGrad;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

function drawLightingAndAtmosphere(
  ctx: CanvasRenderingContext2D,
  scene: CinematicStoryScene,
  t: number,
  W: number,
  H: number
) {
  const mood = scene.lightingMood || "golden_hour";
  const atmosphere = scene.atmosphere || "golden_dust";

  // 1. Volumetric Cinematic Lighting Bloom
  ctx.save();
  if (mood === "golden_hour" || mood === "sunbeams") {
    const sunGrad = ctx.createRadialGradient(W * 0.8, H * 0.12, 20, W * 0.8, H * 0.12, W * 0.95);
    sunGrad.addColorStop(0, "rgba(255, 215, 140, 0.26)");
    sunGrad.addColorStop(0.5, "rgba(255, 165, 90, 0.10)");
    sunGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, W, H);
  } else if (mood === "twilight" || mood === "moonlight") {
    const moonGrad = ctx.createRadialGradient(W * 0.25, H * 0.15, 20, W * 0.25, H * 0.15, W * 0.85);
    moonGrad.addColorStop(0, "rgba(155, 195, 255, 0.20)");
    moonGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, W, H);
  } else if (mood === "neon_night") {
    const neonGrad = ctx.createLinearGradient(0, 0, W, H);
    neonGrad.addColorStop(0, "rgba(0, 217, 255, 0.10)");
    neonGrad.addColorStop(1, "rgba(255, 45, 135, 0.12)");
    ctx.fillStyle = neonGrad;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // 2. Deterministic Anime Atmospheric Particles
  if (atmosphere === "none") return;

  ctx.save();
  if (atmosphere === "rain") {
    const dropCount = 48;
    ctx.strokeStyle = "rgba(205, 228, 255, 0.38)";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < dropCount; i++) {
      const rx = ((i * 97 + t * 240) % (W + 160)) - 80;
      const ry = ((i * 173 + t * 1350) % (H + 200)) - 100;
      const len = 36 + (i % 4) * 14;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - len * 0.18, ry + len);
      ctx.stroke();
    }
  } else if (atmosphere === "wind_streaks") {
    const streakCount = 12;
    for (let i = 0; i < streakCount; i++) {
      const sy = ((i * 157 + t * 40) % (H * 0.85)) + H * 0.05;
      const sx = ((i * 311 + t * 420) % (W + 500)) - 250;
      const sLen = 140 + (i % 3) * 80;
      const alpha = 0.12 + 0.12 * Math.sin(t * 2 + i);
      const grad = ctx.createLinearGradient(sx, sy, sx + sLen, sy);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + sLen * 0.5, sy - 16, sx + sLen, sy);
      ctx.stroke();
    }
  } else {
    // Sakura petals, glowing embers, starlight, snow, or golden dust bokeh
    const count = 30;
    for (let i = 0; i < count; i++) {
      const speedY = atmosphere === "embers" ? -68 : atmosphere === "sakura" ? 54 : 32;
      const driftX = Math.sin(t * 1.4 + i * 1.7) * 45;
      const rawX = (i * 137.5) % W;
      const px = (rawX + driftX + t * (atmosphere === "sakura" ? 28 : 10) + W) % W;
      const rawY = (i * 223 + t * speedY) % H;
      const py = rawY < 0 ? rawY + H : rawY;
      const pulse = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1));

      if (atmosphere === "sakura") {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 1.5 + i);
        ctx.fillStyle = `rgba(255, 205, 222, ${pulse * 0.85})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7 + (i % 3) * 2.5, 4 + (i % 2) * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (atmosphere === "embers") {
        ctx.save();
        ctx.shadowColor = "rgba(255, 120, 40, 0.9)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(255, 195, 95, ${pulse})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + (i % 4) * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (atmosphere === "snow") {
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.85})`;
        ctx.beginPath();
        ctx.arc(px, py, 3 + (i % 4) * 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // golden_dust or starlight bokeh
        ctx.save();
        ctx.shadowColor =
          atmosphere === "starlight"
            ? "rgba(200, 230, 255, 0.85)"
            : "rgba(255, 225, 145, 0.85)";
        ctx.shadowBlur = 16;
        ctx.fillStyle =
          atmosphere === "starlight"
            ? `rgba(235, 248, 255, ${pulse * 0.8})`
            : `rgba(255, 236, 175, ${pulse * 0.78})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + (i % 5) * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

export default function CinematicStoryStage({
  audioUrl,
  finalVideoUrl,
  scenes = [],
  words = [],
  duration = 15,
  topic = "Cinematic Anime Story",
  style = "anime",
  runId,
}: CinematicStoryStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const imagesMapRef = useRef<Record<string, HTMLImageElement>>({});

  const totalDuration = useMemo(() => {
    if (duration > 0) return duration;
    if (scenes.length > 0) return scenes[scenes.length - 1].end;
    return 15;
  }, [duration, scenes]);

  const clauses = useMemo(() => buildClausesFromWords(words, 6), [words]);

  // Preload all 9:16 scene images
  useEffect(() => {
    let mounted = true;
    const loadedImages: Record<string, HTMLImageElement> = {};

    scenes.forEach((sc) => {
      if (sc.assetUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (!mounted) return;
          loadedImages[sc.id] = img;
          imagesMapRef.current = { ...imagesMapRef.current, [sc.id]: img };
        };
        img.src = sc.assetUrl;
      }
    });

    return () => {
      mounted = false;
    };
  }, [scenes]);

  // Auto-play audio when loaded
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (audio.currentTime >= totalDuration - 0.15) {
        audio.currentTime = 0;
      }
      audio.play().catch(console.warn);
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [totalDuration]);

  const handleReplay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(console.warn);
    setIsPlaying(true);
  }, []);

  const handleSeek = useCallback(
    (newTime: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, newTime));
      setCurrentTime(clamped);
      if (audioRef.current) {
        audioRef.current.currentTime = clamped;
      }
    },
    [totalDuration]
  );

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {}
  }, []);

  // Pure, deterministic 1080x1920 frame renderer (shared by live 60fps preview & MP4 export)
  const renderFrameToContext = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      // 1. Clear base with deep cinema black
      ctx.fillStyle = "#08090E";
      ctx.fillRect(0, 0, W, H);

      if (scenes.length === 0) return;

      // 2. Find active scene & previous scene for smooth 0.65s cross-dissolve
      let activeIdx = scenes.findIndex((sc) => t >= sc.start && t <= sc.end);
      if (activeIdx < 0) {
        activeIdx = Math.min(
          scenes.length - 1,
          Math.max(0, Math.floor((t / Math.max(0.1, totalDuration)) * scenes.length))
        );
      }
      const activeScene = scenes[activeIdx] || scenes[0];
      const prevScene = activeIdx > 0 ? scenes[activeIdx - 1] : null;

      const dissolveWindow = 0.65;
      const timeIntoScene = Math.max(0, t - activeScene.start);
      const isDissolving = prevScene !== null && timeIntoScene < dissolveWindow;

      if (isDissolving && prevScene) {
        drawSceneImageWithCamera(
          ctx,
          prevScene,
          imagesMapRef.current[prevScene.id],
          t,
          W,
          H,
          1.0
        );
        const fadeAlpha = easeInOutSine(timeIntoScene / dissolveWindow);
        drawSceneImageWithCamera(
          ctx,
          activeScene,
          imagesMapRef.current[activeScene.id],
          t,
          W,
          H,
          fadeAlpha
        );
      } else {
        drawSceneImageWithCamera(
          ctx,
          activeScene,
          imagesMapRef.current[activeScene.id],
          t,
          W,
          H,
          1.0
        );
      }

      // 3. Atmospheric Particles, Volumetric Lighting Bloom & Dynamic Scene VFX
      drawLightingAndAtmosphere(ctx, activeScene, t, W, H);
      drawSceneVisualEffects(ctx, activeScene, t, W, H);

      // 4. Soft Theatrical Vignette (pure film aesthetic — NO bottom bars, NO oak/hook badges)
      const vigGrad = ctx.createRadialGradient(
        W / 2,
        H / 2,
        H * 0.36,
        W / 2,
        H / 2,
        H * 0.78
      );
      vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.52)");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, W, H);

      // 5. Optional Clean Cinema Subtitles (Pure film dialogue, zero boxes, zero bottom lines)
      if (showSubtitles) {
        // Soft lower-third shadow gradient for text legibility
        const subGrad = ctx.createLinearGradient(0, H - 360, 0, H);
        subGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        subGrad.addColorStop(0.65, "rgba(0, 0, 0, 0.38)");
        subGrad.addColorStop(1, "rgba(0, 0, 0, 0.72)");
        ctx.fillStyle = subGrad;
        ctx.fillRect(0, H - 360, W, 360);

        // Locate active spoken clause at time t
        const activeClause =
          clauses.find((c) => t >= c.start - 0.12 && t <= c.end + 0.18) ||
          clauses.find(
            (c) =>
              c.start >= activeScene.start - 0.1 && c.end <= activeScene.end + 0.1
          );

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 38px 'Montserrat', 'Plus Jakarta Sans', sans-serif";

        const maxLineWidth = W - 150;
        const subtitleY = H - 175;

        if (activeClause && activeClause.words.length > 0) {
          // Wrap clause words into 1 or 2 balanced lines
          const lines: CinematicWordItem[][] = [];
          let currentLine: CinematicWordItem[] = [];
          let currentLineW = 0;
          const spaceW = ctx.measureText(" ").width;

          for (const w of activeClause.words) {
            const wWidth = ctx.measureText(w.word).width;
            if (currentLine.length > 0 && currentLineW + spaceW + wWidth > maxLineWidth) {
              lines.push(currentLine);
              currentLine = [w];
              currentLineW = wWidth;
            } else {
              currentLine.push(w);
              currentLineW += (currentLine.length > 1 ? spaceW : 0) + wWidth;
            }
          }
          if (currentLine.length > 0) lines.push(currentLine);

          const lineHeight = 52;
          const startY =
            lines.length === 1 ? subtitleY : subtitleY - ((lines.length - 1) * lineHeight) / 2;

          lines.forEach((lineWords, lineIdx) => {
            const lineY = startY + lineIdx * lineHeight;
            const totalLineW = lineWords.reduce((acc, w, idx) => {
              return acc + ctx.measureText(w.word).width + (idx > 0 ? spaceW : 0);
            }, 0);

            let cursorX = (W - totalLineW) / 2;
            ctx.textAlign = "left";

            for (const w of lineWords) {
              const isSpokenNow = t >= w.start - 0.06 && t <= w.end + 0.08;
              const isAlreadySpoken = t > w.end + 0.08;
              const wordW = ctx.measureText(w.word).width;

              // Crisp cinema stroke + drop shadow (no boxes or banners)
              ctx.lineJoin = "round";
              ctx.lineWidth = 7;
              ctx.strokeStyle = "rgba(0, 0, 0, 0.88)";
              ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
              ctx.shadowBlur = 12;
              ctx.shadowOffsetY = 3;
              ctx.strokeText(w.word, cursorX, lineY);

              ctx.shadowColor = isSpokenNow ? "rgba(255, 224, 125, 0.55)" : "transparent";
              ctx.shadowBlur = isSpokenNow ? 16 : 0;
              ctx.fillStyle = isSpokenNow
                ? "#FFE17D"
                : isAlreadySpoken
                ? "#FFFFFF"
                : "rgba(255, 255, 255, 0.86)";
              ctx.fillText(w.word, cursorX, lineY);

              cursorX += wordW + spaceW;
            }
          });
        } else if (activeScene.spokenText) {
          // Clean wrapped fallback if word timestamps are unavailable
          const rawWords = activeScene.spokenText.split(/\s+/).filter(Boolean).slice(0, 12);
          const line1 = rawWords.slice(0, 6).join(" ");
          const line2 = rawWords.slice(6, 12).join(" ");

          ctx.lineJoin = "round";
          ctx.lineWidth = 7;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.88)";
          ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
          ctx.shadowBlur = 12;
          ctx.fillStyle = "#FFFFFF";

          if (line2) {
            ctx.strokeText(line1, W / 2, subtitleY - 26);
            ctx.fillText(line1, W / 2, subtitleY - 26);
            ctx.strokeText(line2, W / 2, subtitleY + 26);
            ctx.fillText(line2, W / 2, subtitleY + 26);
          } else {
            ctx.strokeText(line1, W / 2, subtitleY);
            ctx.fillText(line1, W / 2, subtitleY);
          }
        }

        ctx.restore();
      }
    },
    [scenes, clauses, totalDuration, showSubtitles]
  );

  // 60fps Live Canvas Animation Loop synced to audio
  useEffect(() => {
    let animId: number;
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const audio = audioRef.current;
          const t = audio && !audio.paused ? audio.currentTime : currentTime;
          renderFrameToContext(ctx, canvas.width, canvas.height, t);
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderFrameToContext, currentTime]);

  // Deterministic 1080x1920 H.264 MP4 Export with Original Voiceover Audio
  const handleExportMP4 = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(4);

    try {
      // Wait for all scene images to be ready before deterministic frame export
      await Promise.all(
        scenes.map(
          (sc) =>
            new Promise<void>((resolve) => {
              if (!sc.assetUrl) return resolve();
              if (imagesMapRef.current[sc.id]?.complete) return resolve();
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                imagesMapRef.current[sc.id] = img;
                resolve();
              };
              img.onerror = () => resolve();
              img.src = sc.assetUrl;
            })
        )
      );

      const fps = 30;
      const totalFrames = Math.max(1, Math.round(totalDuration * fps));
      const offCanvas = document.createElement("canvas");
      offCanvas.width = 1080;
      offCanvas.height = 1920;
      const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
      if (!offCtx) throw new Error("Could not initialize 1080x1920 export canvas");

      let encoder: any = null;
      const chunks: Uint8Array[] = [];
      let hasWebCodecs = false;

      if (typeof window !== "undefined" && typeof (window as any).VideoEncoder === "function") {
        try {
          const VideoEncoderClass = (window as any).VideoEncoder;
          const isSupported = await VideoEncoderClass.isConfigSupported({
            codec: "avc1.640028",
            width: 1080,
            height: 1920,
            bitrate: 10_000_000,
            framerate: fps,
            avc: { format: "annexb" },
          })
            .then((r: any) => r.supported)
            .catch(() => false);

          if (isSupported) {
            encoder = new VideoEncoderClass({
              output: (chunk: any) => {
                const buf = new Uint8Array(chunk.byteLength);
                chunk.copyTo(buf);
                chunks.push(buf);
              },
              error: (e: any) => console.warn("[AudioStory WebCodecs]:", e),
            });
            encoder.configure({
              codec: "avc1.640028",
              width: 1080,
              height: 1920,
              bitrate: 10_000_000,
              framerate: fps,
              avc: { format: "annexb" },
            });
            hasWebCodecs = true;
          }
        } catch {
          hasWebCodecs = false;
          encoder = null;
        }
      }

      const formData = !hasWebCodecs ? new FormData() : null;

      for (let f = 0; f < totalFrames; f++) {
        const t = Math.min(totalDuration - 0.02, +(f / fps).toFixed(4));
        renderFrameToContext(offCtx, 1080, 1920, t);

        if (hasWebCodecs && encoder && encoder.state === "configured") {
          const VideoFrameClass = (window as any).VideoFrame;
          const vFrame = new VideoFrameClass(offCanvas, {
            timestamp: Math.round((f * 1_000_000) / fps),
            duration: Math.round(1_000_000 / fps),
          });
          encoder.encode(vFrame, { keyFrame: f % (fps * 2) === 0 });
          vFrame.close();
        } else if (formData) {
          const blob = await new Promise<Blob | null>((res) =>
            offCanvas.toBlob((b) => res(b), "image/jpeg", 0.9)
          );
          if (blob) formData.append(`frame_${f}`, blob, `frame_${f}.jpg`);
        }

        if (f % 5 === 0 || f === totalFrames - 1) {
          setExportProgress(Math.min(88, 6 + Math.round((f / totalFrames) * 82)));
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (hasWebCodecs && encoder) {
        await encoder.flush();
        encoder.close();
      }

      setExportProgress(92);

      if (runId) {
        const qs = new URLSearchParams({ runId });
        let remuxResp: Response | null = null;

        if (hasWebCodecs && chunks.length > 0) {
          const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
          const combined = new Uint8Array(totalLen);
          let offset = 0;
          for (const c of chunks) {
            combined.set(c, offset);
            offset += c.byteLength;
          }
          remuxResp = await fetch(`/api/remux-mp4?${qs.toString()}`, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: combined.buffer,
          });
        } else if (formData) {
          remuxResp = await fetch(`/api/remux-mp4?${qs.toString()}`, {
            method: "POST",
            body: formData,
          });
        }

        if (remuxResp && remuxResp.ok) {
          const mp4Buf = await remuxResp.arrayBuffer();
          const mp4Blob = new Blob([mp4Buf], { type: "video/mp4" });
          const downloadUrl = URL.createObjectURL(mp4Blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          const safeTitle = (topic || "cinematic_anime_story")
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .slice(0, 36);
          a.download = `${safeTitle}_${Math.round(totalDuration)}s.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
          setExportProgress(100);
          setIsExporting(false);
          return;
        }

        // Fallback to server-rendered MP4 if available
        const checkServerMp4 = await fetch(`/api/audio-story/media/${runId}?type=final`, {
          method: "HEAD",
        });
        if (checkServerMp4.ok || finalVideoUrl) {
          const a = document.createElement("a");
          a.href = `/api/audio-story/media/${runId}?type=final&download=1`;
          a.download = `cinematic_story_${runId}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setExportProgress(100);
          setIsExporting(false);
          return;
        }
      }

      throw new Error("Could not mux MP4 video file.");
    } catch (err: any) {
      console.error("MP4 Export error:", err);
      if (runId) {
        window.location.href = `/api/audio-story/media/${runId}?type=final&download=1`;
      }
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, scenes, totalDuration, renderFrameToContext, runId, topic, finalVideoUrl]);

  // Listen for global export events (triggered by chat card, modal header, or Post tab)
  useEffect(() => {
    const onTriggerExport = () => {
      handleExportMP4();
    };
    window.addEventListener("export-audio-story-mp4", onTriggerExport);
    return () => {
      window.removeEventListener("export-audio-story-mp4", onTriggerExport);
    };
  }, [handleExportMP4]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full max-w-[360px] mx-auto select-none ${
        isFullscreen ? "fixed inset-0 z-50 max-w-none bg-black p-4" : ""
      }`}
    >
      {/* Hidden audio element playing user voiceover */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          muted={isMuted}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Pure 9:16 Cinematic Anime Frame (Zero overlays/badges cluttering the artwork) */}
      <div
        onClick={togglePlay}
        className="relative w-full aspect-[9/16] rounded-[24px] overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.38)] border-2 border-[#141414] bg-black cursor-pointer group"
      >
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="w-full h-full object-cover"
        />

        {/* Fullscreen button on hover only */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFullscreen();
          }}
          aria-label="Toggle fullscreen"
          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white grid place-items-center hover:bg-black/80"
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        {/* Exporting Overlay */}
        {isExporting && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30 text-white p-6 text-center"
          >
            <Loader2 size={36} className="animate-spin text-[#FFE17D]" />
            <div className="font-bold text-[14px]">
              Rendering 1080×1920 Cinematic Anime MP4...
            </div>
            <div className="w-48 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-[#FFE17D] transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="mono text-[11px] text-white/75">
              {exportProgress}% • Syncing voiceover & anime scenes
            </div>
          </div>
        )}
      </div>

      {/* External Scrubber & Controls Deck (Outside the video canvas so the video stays 100% pure) */}
      <div className="w-full mt-2.5 px-3 py-2 rounded-2xl bg-[#FAF9F5]/95 border border-[#141414]/15 shadow-xs flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.05}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Seek story timeline"
            className="flex-1 h-1.5 accent-[#E4491B] cursor-pointer"
          />
          <span className="mono text-[10px] text-[#555] font-semibold tabular-nums shrink-0">
            {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-8 h-8 rounded-full bg-[#141414] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleReplay}
              aria-label="Replay"
              title="Replay from start"
              className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-[#555] hover:text-[#141414] transition"
            >
              <RotateCcw size={13} />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              aria-label="Toggle mute"
              title={isMuted ? "Unmute voiceover" : "Mute voiceover"}
              className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-[#555] hover:text-[#141414] transition"
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>

            <button
              type="button"
              onClick={() => setShowSubtitles((prev) => !prev)}
              title={showSubtitles ? "Hide film subtitles" : "Show film subtitles"}
              className={`px-2 py-1 rounded-full mono text-[9.5px] font-bold flex items-center gap-1 transition ${
                showSubtitles
                  ? "bg-[#141414] text-white"
                  : "bg-black/5 text-[#666] hover:text-[#141414]"
              }`}
            >
              <Subtitles size={11} />
              <span>CC</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportMP4}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-full bg-[#E4491B] hover:bg-[#C93D14] text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            <span>{isExporting ? `${exportProgress}%` : "Download MP4"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
