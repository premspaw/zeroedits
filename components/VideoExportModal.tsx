"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Download, Video, CheckCircle2, AlertCircle, Loader2, Play } from "lucide-react";

export interface StoryboardBeat {
  id: number;
  label: string;
  duration: string;
  script: string;
  durNum?: number;
  tone?: string;
  role?: string;
  start?: number;
  end?: number;
  visualDesc?: string;
  voiceover?: string;
  headline?: string;
  sub?: string;
  text?: string;
  camera?: string;
  lighting?: string;
  sound?: string;
  motion?: string;
  color?: string;
  emoji?: string;
}

export interface VoiceTrackInfo {
  id: number | string;
  url: string;
  start: number;
  end: number;
  duration: number;
  hasAudio: boolean;
}

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  beats: StoryboardBeat[];
  duration?: number;
  timing?: string;
  theme?: any;
  topic?: string;
  format?: string;
  storyboard?: any;
  sparkCode?: string;
  voiceTracks?: VoiceTrackInfo[];
  pipelineBRunId?: string;
}

export default function VideoExportModal({
  isOpen,
  onClose,
  beats = [],
  duration = 15,
  timing = "15s",
  theme,
  topic = "Paper Studio Reel",
  format = "paperCard",
  storyboard,
  sparkCode = "",
  voiceTracks = [],
  pipelineBRunId,
}: VideoExportModalProps) {
  // Locally composed code (when the reel arrived without animation code).
  // Effective code drives PATH A; the canvas fallback only runs if composing fails.
  const [localSparkCode, setLocalSparkCode] = useState("");
  const [phase, setPhase] = useState<"idle" | "composing" | "rendering">("idle");
  const [usedFallback, setUsedFallback] = useState(false);
  const [renderedFps, setRenderedFps] = useState(60);
  const effectiveSparkCode = localSparkCode || sparkCode;
  // true = using Remotion server-side path; false = canvas fallback
  const hasSparkCode = effectiveSparkCode.trim().length > 30;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm">("mp4");

  // Determine active beats list (fallback to storyboard beats if needed)
  const activeBeatsList: StoryboardBeat[] =
    beats && beats.length > 0
      ? beats
      : storyboard?.beats && storyboard.beats.length > 0
      ? storyboard.beats
      : [];

  const beatsEnd = activeBeatsList.reduce(
    (m, b) => Math.max(m, typeof b.end === "number" ? b.end : 0),
    0
  );
  // Real timeline wins: voiceover re-times beats away from the timing preset.
  const totalDuration =
    beatsEnd > 0
      ? beatsEnd
      : Number(timing.replace("s", "")) || duration || storyboard?.duration || 15;
  const fps = 60;
  const totalFramesCount = Math.max(60, Math.round(totalDuration * fps));

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  // Helper: Wrap text on 2D canvas with line breaks
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 4
  ) => {
    if (!text) return;
    const words = text.split(/\s+/);
    let line = "";
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + " ";
        if (lines.length >= maxLines - 1) {
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (line.trim() && lines.length < maxLines) {
      lines.push(line.trim());
    }

    const totalHeight = lines.length * lineHeight;
    const startY = y - totalHeight / 2 + lineHeight / 2;

    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k], x, startY + k * lineHeight);
    }
  };

  // Render a specific time t (in seconds) onto the 1080x1920 canvas
  const renderFrameToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      const W = 1080;
      const H = 1920;

      // 1. Format-aware Styling Configuration
      const isNeon = format === "blackNeon" || theme?.bg === "#0A0A0A";
      const isAnime = format === "anime" || (theme?.effect && theme.effect.includes("anime"));
      const isCutout = format === "cutout";
      const isGlass = format === "glass";
      const isPaper = !isNeon && !isAnime && !isGlass;

      const bgColor =
        theme?.bg ||
        (isNeon ? "#0A0A0A" : isAnime ? "#161626" : isGlass ? "#161622" : "#FAF7F2");
      const cardBg =
        theme?.paper ||
        (isNeon ? "#121212" : isAnime ? "#222238" : isGlass ? "rgba(255,255,255,0.08)" : "#FFFEFB");
      const accentColor =
        theme?.accent || (isNeon ? "#00F0FF" : isAnime ? "#FF3366" : "#FF5520");
      const secondaryColor =
        theme?.secondary || (isNeon ? "#FF0055" : isAnime ? "#FFD166" : "#6B8E5A");
      const textColor =
        isNeon || isAnime || isGlass ? "#FFFFFF" : theme?.ink || "#111111";
      const subTextColor =
        isNeon || isAnime || isGlass ? "#A8A8B8" : "#6B6557";
      const borderColor =
        isNeon ? "rgba(0, 240, 255, 0.45)" : isAnime ? "rgba(255, 209, 102, 0.5)" : "#EAE2CC";

      // 2. Background Painting
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      if (isPaper) {
        // Warm paper texture & ambient vignette
        const grad = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * 0.85);
        grad.addColorStop(0, "#FAF7F2");
        grad.addColorStop(1, "#EFE7D8");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Tactile paper grain fibers
        ctx.strokeStyle = "rgba(40, 25, 15, 0.025)";
        ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 36) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
      } else if (isNeon) {
        // Deep obsidian with ambient cyber glows
        const glow1 = ctx.createRadialGradient(200, 300, 10, 200, 300, 600);
        glow1.addColorStop(0, "rgba(0, 240, 255, 0.12)");
        glow1.addColorStop(1, "transparent");
        ctx.fillStyle = glow1;
        ctx.fillRect(0, 0, W, H);

        const glow2 = ctx.createRadialGradient(W - 200, H - 400, 10, W - 200, H - 400, 700);
        glow2.addColorStop(0, "rgba(255, 0, 85, 0.12)");
        glow2.addColorStop(1, "transparent");
        ctx.fillStyle = glow2;
        ctx.fillRect(0, 0, W, H);

        // Subtle cyber grid
        ctx.strokeStyle = "rgba(0, 240, 255, 0.05)";
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
      } else if (isAnime) {
        // Kinetic anime speed lines radiating outward
        ctx.save();
        ctx.translate(W / 2, H / 2 - 80);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.08)";
        ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 360, Math.sin(a) * 360);
          ctx.lineTo(Math.cos(a) * 1200, Math.sin(a) * 1200);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Active Beat Calculation
      const beatCount = Math.max(1, activeBeatsList.length);
      const avgDuration = totalDuration / beatCount;

      let activeIndex = 0;
      let beatStart = 0;
      let beatEnd = avgDuration;

      for (let i = 0; i < activeBeatsList.length; i++) {
        const b = activeBeatsList[i];
        const s = typeof b.start === "number" ? b.start : i * avgDuration;
        const e = typeof b.end === "number" ? b.end : (i + 1) * avgDuration;
        if (t >= s && t <= e) {
          activeIndex = i;
          beatStart = s;
          beatEnd = e;
          break;
        }
      }

      const currentBeat = activeBeatsList[activeIndex] || activeBeatsList[0] || ({} as StoryboardBeat);
      const beatSpan = Math.max(0.1, beatEnd - beatStart);
      const beatProgress = Math.min(1, Math.max(0, (t - beatStart) / beatSpan));

      // 4. Central Storyboard Reel Card
      const cardX = 64;
      const cardY = 160;
      const cardW = W - cardX * 2; // 952
      const cardH = H - cardY * 2; // 1600
      const cardRadius = 40;

      // Spring entrance motion on beat transitions
      const springProg = Math.min(1, beatProgress * 4.5);
      const enterScale = 0.95 + 0.05 * Math.sin((springProg * Math.PI) / 2);
      const bobY = Math.sin(t * 3.2) * 6;
      const tiltAngle = (activeIndex % 2 === 0 ? -0.8 : 0.8) * (1 - springProg) * (Math.PI / 180);

      ctx.save();
      ctx.translate(W / 2, H / 2 + bobY);
      ctx.rotate(tiltAngle);
      ctx.scale(enterScale, enterScale);
      ctx.translate(-W / 2, -H / 2);

      // Card Drop Shadow
      ctx.save();
      ctx.shadowColor = isNeon
        ? "rgba(0, 240, 255, 0.28)"
        : "rgba(40, 25, 15, 0.16)";
      ctx.shadowBlur = isNeon ? 36 : 48;
      ctx.shadowOffsetY = isNeon ? 0 : 24;

      // Card Body Fill
      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.fill();
      ctx.restore();

      // Card Border
      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isNeon ? 3.5 : 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.stroke();
      ctx.restore();

      // For Paper Theme: Realistic Torn Paper Deckle Edges (Top & Bottom)
      if (isPaper) {
        ctx.save();
        ctx.fillStyle = "#FAF7F2";
        // Top deckle mask
        ctx.beginPath();
        ctx.moveTo(cardX + 20, cardY);
        const teeth = 18;
        const toothW = (cardW - 40) / teeth;
        for (let i = 0; i < teeth; i++) {
          const tx = cardX + 20 + i * toothW;
          const ty = cardY + (i % 2 === 0 ? 12 : 2);
          ctx.lineTo(tx + toothW / 2, ty);
          ctx.lineTo(tx + toothW, cardY);
        }
        ctx.lineTo(cardX + cardW - 20, cardY - 14);
        ctx.lineTo(cardX + 20, cardY - 14);
        ctx.closePath();
        ctx.fill();

        // Bottom deckle mask
        ctx.beginPath();
        ctx.moveTo(cardX + 20, cardY + cardH);
        for (let i = 0; i < teeth; i++) {
          const tx = cardX + 20 + i * toothW;
          const ty = cardY + cardH - (i % 2 === 0 ? 12 : 2);
          ctx.lineTo(tx + toothW / 2, ty);
          ctx.lineTo(tx + toothW, cardY + cardH);
        }
        ctx.lineTo(cardX + cardW - 20, cardY + cardH + 14);
        ctx.lineTo(cardX + 20, cardY + cardH + 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 5. Card Header: Multi-Segment Timeline & Live Timecode
      ctx.save();
      // Brand format tag
      ctx.font = "bold 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = isNeon ? "#00F0FF" : subTextColor;
      ctx.textAlign = "left";
      ctx.fillText(
        `PAPER STUDIO • ${(format || "paperCard").toUpperCase()}`,
        cardX + 50,
        cardY + 70
      );

      // Pulsing live indicator dot
      const dotPulse = 8 + 3 * Math.sin(t * 8);
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(cardX + cardW - 230, cardY + 63, dotPulse, 0, Math.PI * 2);
      ctx.fill();

      // Timecode
      ctx.font = "bold 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = textColor;
      ctx.textAlign = "right";
      ctx.fillText(
        `0:${t.toFixed(1).padStart(4, "0")} / 0:${totalDuration.toFixed(1)}s`,
        cardX + cardW - 50,
        cardY + 70
      );

      // Multi-segment timeline bar (matching FullReel15s & PreviewCard)
      const barY = cardY + 104;
      const barTotalW = cardW - 100;
      const segW = (barTotalW - (beatCount - 1) * 10) / beatCount;

      for (let i = 0; i < beatCount; i++) {
        const sx = cardX + 50 + i * (segW + 10);
        const b = activeBeatsList[i];
        const s = typeof b?.start === "number" ? b.start : i * avgDuration;
        const e = typeof b?.end === "number" ? b.end : (i + 1) * avgDuration;

        let fillPct = 0;
        if (t >= e) fillPct = 1;
        else if (t >= s) fillPct = Math.min(1, Math.max(0, (t - s) / Math.max(0.1, e - s)));

        // Background track
        ctx.fillStyle = isNeon
          ? "rgba(255,255,255,0.12)"
          : "rgba(234, 226, 204, 0.7)";
        ctx.beginPath();
        ctx.roundRect(sx, barY, segW, 8, 4);
        ctx.fill();

        // Fill progress
        if (fillPct > 0) {
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.roundRect(sx, barY, segW * fillPct, 8, 4);
          ctx.fill();
        }
      }
      ctx.restore();

      // 6. Scene Role & Tone Pill Badge
      const roleText = (
        currentBeat?.role ||
        currentBeat?.label ||
        `SCENE 0${activeIndex + 1}`
      ).toUpperCase();
      const toneText = currentBeat?.tone ? `— ${currentBeat.tone.toUpperCase()}` : "";
      const fullBadgeText = `${roleText} ${toneText}`.trim();

      ctx.save();
      ctx.font = "bold 22px 'JetBrains Mono', monospace";
      const badgeMetrics = ctx.measureText(fullBadgeText);
      const pillW = Math.max(200, badgeMetrics.width + 48);
      const pillH = 46;
      const pillX = cardX + (cardW - pillW) / 2;
      const pillY = cardY + 160;

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fullBadgeText, pillX + pillW / 2, pillY + pillH / 2);
      ctx.restore();

      // 7. Hero Headline Typography (The Actual Script from Wonder/Spark!)
      ctx.save();
      const heroFontFamily = isAnime
        ? "'Impact', 'Arial Black', sans-serif"
        : isNeon
        ? "'JetBrains Mono', monospace"
        : "'Instrument Serif', Georgia, serif";

      ctx.font = isAnime
        ? `bold 54px ${heroFontFamily}`
        : isNeon
        ? `bold 44px ${heroFontFamily}`
        : `58px ${heroFontFamily}`;

      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const headlineText =
        currentBeat?.script ||
        currentBeat?.headline ||
        currentBeat?.text ||
        topic ||
        "60fps Studio Grade Paper Physics";

      wrapText(ctx, headlineText, W / 2, cardY + 340, cardW - 140, 72, 3);
      ctx.restore();

      // 8. Scene Visual Direction Card (From Wonder Storyboard)
      const visualBoxX = cardX + 50;
      const visualBoxY = cardY + 470;
      const visualBoxW = cardW - 100;
      const visualBoxH = 500;

      ctx.save();
      ctx.fillStyle = isNeon
        ? "rgba(255, 255, 255, 0.04)"
        : isAnime
        ? "rgba(255, 209, 102, 0.06)"
        : "rgba(250, 247, 242, 0.9)";
      ctx.beginPath();
      ctx.roundRect(visualBoxX, visualBoxY, visualBoxW, visualBoxH, 24);
      ctx.fill();

      ctx.strokeStyle = isNeon
        ? "rgba(0, 240, 255, 0.25)"
        : isAnime
        ? "rgba(255, 209, 102, 0.3)"
        : "rgba(234, 226, 204, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Header inside Visual Box: Camera & Visual Badge
      ctx.font = "bold 18px 'JetBrains Mono', monospace";
      ctx.fillStyle = accentColor;
      ctx.textAlign = "left";
      ctx.fillText("🎬 SCENE VISUAL DIRECTION", visualBoxX + 30, visualBoxY + 44);

      if (currentBeat?.camera) {
        ctx.font = "16px 'JetBrains Mono', monospace";
        ctx.fillStyle = subTextColor;
        ctx.textAlign = "right";
        ctx.fillText(
          `📷 ${currentBeat.camera.slice(0, 28)}`,
          visualBoxX + visualBoxW - 30,
          visualBoxY + 44
        );
      }

      // Dynamic Procedural Visual Element (Kinetic Framing Graphic)
      const graphicCenterY = visualBoxY + 190;
      ctx.save();
      ctx.translate(W / 2, graphicCenterY);

      // Rotating aperture framing reticle
      ctx.rotate(t * 0.5);
      ctx.strokeStyle = isNeon ? "rgba(0, 240, 255, 0.5)" : "rgba(255, 85, 32, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([14, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 72, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glowing ring
      ctx.setLineDash([]);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Central Visual Cue Icon / Focal Mark
      ctx.save();
      ctx.translate(W / 2, graphicCenterY);
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // Kinetic crosshair ticks
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(24, 0);
      ctx.moveTo(0, -24);
      ctx.lineTo(0, 24);
      ctx.stroke();
      ctx.restore();

      // Visual Description Text from Storyboard
      ctx.font = "24px 'Inter', system-ui, sans-serif";
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      const visualDescText =
        currentBeat?.visualDesc ||
        "Layered kinetic motion and intentional scene composition.";
      wrapText(ctx, visualDescText, W / 2, visualBoxY + 340, visualBoxW - 60, 38, 3);

      // Camera / Motion cue note
      if (currentBeat?.motion || currentBeat?.lighting) {
        ctx.font = "17px 'JetBrains Mono', monospace";
        ctx.fillStyle = subTextColor;
        ctx.textAlign = "center";
        const cueNote = `Motion: ${currentBeat.motion || "Spring physics"} • ${currentBeat.lighting || "Studio ambient"}`;
        ctx.fillText(cueNote.slice(0, 60), W / 2, visualBoxY + 440);
      }
      ctx.restore();

      // 9. Voiceover / Narration Box (if available)
      const voY = visualBoxY + visualBoxH + 36;
      if (currentBeat?.voiceover) {
        const voW = cardW - 100;
        const voH = 110;
        const voX = cardX + 50;

        ctx.save();
        ctx.fillStyle = isNeon
          ? "rgba(255, 0, 85, 0.08)"
          : "rgba(255, 107, 53, 0.08)";
        ctx.beginPath();
        ctx.roundRect(voX, voY, voW, voH, 18);
        ctx.fill();

        ctx.strokeStyle = isNeon
          ? "rgba(255, 0, 85, 0.3)"
          : "rgba(255, 107, 53, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Audio visualizer waveform bars
        for (let b = 0; b < 9; b++) {
          const barH = 10 + 16 * Math.abs(Math.sin(t * 12 + b * 0.7));
          const bx = voX + 32 + b * 10;
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.roundRect(bx, voY + (voH - barH) / 2, 4, barH, 2);
          ctx.fill();
        }

        // Voiceover dialogue text
        ctx.font = "italic 21px 'Inter', system-ui, sans-serif";
        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        const voText = `"${currentBeat.voiceover}"`;
        wrapText(ctx, voText, voX + 140, voY + voH / 2, voW - 160, 28, 2);
        ctx.restore();
      }

      // 10. Sound & Motion Pills at bottom
      const metaY = cardY + cardH - 120;
      ctx.save();
      ctx.font = "18px 'JetBrains Mono', monospace";
      ctx.fillStyle = subTextColor;
      ctx.textAlign = "center";

      const soundCue = currentBeat?.sound ? `🔊 ${currentBeat.sound.slice(0, 32)}` : "🔊 Paper whoosh";
      const motionCue = currentBeat?.motion ? `⚡ ${currentBeat.motion.slice(0, 32)}` : "⚡ Spring physics";
      ctx.fillText(`${soundCue}   •   ${motionCue}`, W / 2, metaY);
      ctx.restore();

      // 11. Bottom Reel Brand & Scene Tracker
      ctx.save();
      ctx.font = "bold 20px 'JetBrains Mono', monospace";
      ctx.fillStyle = isNeon ? "#00F0FF" : subTextColor;
      ctx.textAlign = "center";
      ctx.fillText(
        `SCENE ${String(activeIndex + 1).padStart(2, "0")} OF ${String(beatCount).padStart(2, "0")} • 1080×1920 60FPS META REEL`,
        W / 2,
        cardY + cardH - 50
      );
      ctx.restore();

      ctx.restore(); // Restore translate/rotate/scale of the card
    },
    [activeBeatsList, duration, format, theme, timing, topic, totalDuration]
  );

  // Render initial frame on canvas immediately when modal opens
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        renderFrameToCanvas(ctx, 0);
      }
    }
  }, [isOpen, renderFrameToCanvas]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setCurrentFrame(0);
      setTotalFrames(totalFramesCount);
      setExportComplete(false);
      setExportError(null);
      setIsExporting(false);
      setLocalSparkCode("");
      setUsedFallback(false);
      setPhase("idle");
    }
  }, [isOpen, totalFramesCount]);

  // Compose the real Spark animation from beats when the reel has no code yet.
  // This keeps every download on the Remotion path (exact preview parity)
  // instead of silently dropping to the simplified canvas fallback.
  const synthesizeSparkCode = async (): Promise<string> => {
    const n = Math.max(1, activeBeatsList.length);
    const step = totalDuration / n;
    const normalizedBeats = activeBeatsList.map((b, i) => ({
      id: typeof b.id === "number" ? b.id : i + 1,
      role: b.role || b.label || `SCENE ${i + 1}`,
      start: +(i * step).toFixed(2),
      end: +((i + 1) * step).toFixed(2),
      duration: +step.toFixed(2),
      text: b.script || b.headline || b.text || topic,
      voiceover: b.voiceover || "",
      visualDesc: b.visualDesc || "",
      motion: b.motion || "",
      camera: b.camera || "",
      lighting: b.lighting || "",
      sound: b.sound || "",
    }));
    const resp = await fetch("/api/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        beats: normalizedBeats,
        theme: theme || storyboard?.theme || null,
        topic,
        duration: totalDuration,
        timing,
        format,
      }),
    });
    const data = await resp.json().catch(() => null);
    if (
      !resp.ok ||
      !data?.success ||
      typeof data?.data?.code !== "string" ||
      data.data.code.trim().length <= 30
    ) {
      throw new Error(data?.error || "Could not compose the full animation.");
    }
    return data.data.code;
  };

  // Start the on-demand recording process
  const startExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setCurrentFrame(0);
    setExportError(null);
    setExportComplete(false);

    // ── PATH Pipeline B: Native Auto-Edit Video Export ──
    if (pipelineBRunId) {
      setProgress(15);
      setPhase("rendering");
      try {
        const resp = await fetch("/api/pipeline-b/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: pipelineBRunId }),
        });
        setProgress(75);
        const result = await resp.json();
        if (!resp.ok || !result.success) {
          throw new Error(result.error || "Failed to render Pipeline B final reel.");
        }
        setProgress(100);
        const finalUrl = `/api/pipeline-b/media/${pipelineBRunId}/final`;
        setDownloadUrl(finalUrl);
        setExportComplete(true);
        const cleanName = topic.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30).replace(/_+/g, "_").replace(/^_|_$/g, "");
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = `${cleanName || "PipelineB"}_Edited.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err: any) {
        console.error("Pipeline B export failed:", err);
        setExportError(err.message || "Failed to export Pipeline B video.");
      } finally {
        setIsExporting(false);
      }
      return;
    }

    // ── Compose the real animation first when the reel has no code yet ────
    // so the download renders the same animation as the preview.
    let codeToRender = effectiveSparkCode;
    if (!hasSparkCode) {
      try {
        setPhase("composing");
        setProgress(2);
        codeToRender = await synthesizeSparkCode();
        setLocalSparkCode(codeToRender);
      } catch (composeErr: any) {
        console.warn("[export] animation compose failed, using canvas fallback:", composeErr);
        setUsedFallback(true);
      }
    }

    // ── PATH A: Remotion server-side render (exact preview parity) ──────────
    let renderedOk = false;
    if (codeToRender.trim().length > 30) {
      try {
        setPhase("rendering");
        setProgress(5); // show immediate activity
        const resp = await fetch("/api/render-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sparkCode: codeToRender,
            duration: totalDuration,
            fps: 30, // 30fps for faster server render (still silky smooth)
            topic,
            // Same stage colours as SparkLiveRunner's preview iframe
            background: String(theme?.bg || storyboard?.theme?.bg || "#FFF8F0"),
            ink: String(theme?.ink || storyboard?.theme?.ink || "#3D2E22"),
            audioTracks: (voiceTracks || [])
              .filter((t) => t?.hasAudio && t?.url)
              .map((t) => ({ url: t.url, start: t.start })),
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `Server render failed (HTTP ${resp.status})`);
        }

        setProgress(90);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setExportFormat("mp4");
        setRenderedFps(30);
        setExportComplete(true);
        setProgress(100);
        renderedOk = true;

        // Auto-trigger download
        const cleanName = topic
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 30)
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "") || "SparkReel";
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cleanName}_${totalDuration}s_Reel.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err: any) {
        console.error("[Remotion export] failed:", err);
        setUsedFallback(true);
        // Fall through to the canvas fallback below so the user still gets a file.
      }
      if (renderedOk) {
        setIsExporting(false);
        return;
      }
      setPhase("rendering");
    }

    // ── PATH B: Canvas fallback (no sparkCode available) ───────────────────
    const canvas = canvasRef.current;
    if (!canvas) { setIsExporting(false); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { setIsExporting(false); return; }

    try {
      const mimeTypes = [
        "video/mp4;codecs=avc1",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      let selectedMimeType = "";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) { selectedMimeType = mime; break; }
      }
      if (!selectedMimeType) throw new Error("Your browser does not support MediaRecorder video encoding.");

      const isMp4 = selectedMimeType.includes("mp4");
      setExportFormat(isMp4 ? "mp4" : "webm");

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType, videoBitsPerSecond: 12_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const renderPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => { try { resolve(new Blob(chunks, { type: selectedMimeType })); } catch (err) { reject(err); } };
        recorder.onerror = () => reject(new Error("MediaRecorder error during render"));
      });

      recorder.start();
      const frameStepTime = 1 / fps;
      for (let f = 0; f < totalFramesCount; f++) {
        renderFrameToCanvas(ctx, f * frameStepTime);
        setCurrentFrame(f + 1);
        setProgress(Math.round(((f + 1) / totalFramesCount) * 100));
        if (f % 3 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      recorder.stop();
      const videoBlob = await renderPromise;
      const url = URL.createObjectURL(videoBlob);
      setDownloadUrl(url);
      setRenderedFps(60);
      setExportComplete(true);

      const cleanName = topic.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30).replace(/_+/g, "_").replace(/^_|_$/g, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName || "PaperStudio"}_${totalDuration}s_Reel.${isMp4 ? "mp4" : "webm"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Export failed:", err);
      setExportError(err.message || "Failed to render video reel.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-[520px] bg-[#FFFFFF] border-2 border-[#141414] rounded-[28px] shadow-[8px_8px_0px_#141414] flex flex-col overflow-hidden text-[#141414]">
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-[#141414] bg-[#ECEAE3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl border border-[#141414] bg-[#E4491B] grid place-items-center text-white shadow-[2px_2px_0px_#141414]">
              <Video size={16} />
            </div>
            <div>
              <div className="mono text-[12px] font-bold tracking-wider text-[#141414] uppercase flex items-center gap-1.5">
                <span>EXPORT VIDEO REEL</span>
                <span className="px-1.5 py-0.2 rounded-full border border-[#141414] bg-[#F6D9CC] text-[#E4491B] text-[9px] font-bold">
                  1080×1920 • {renderedFps}FPS
                </span>
              </div>
              <div className="mono text-[10px] text-[#52504A] font-medium">
                Meta Hackathon Ready • Ready for Reels, Shorts & TikTok
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-full bg-[#ECEAE3] border-2 border-[#141414] text-[#141414] grid place-items-center hover:bg-[#F6D9CC] transition disabled:opacity-40 shadow-[1px_1px_0px_#141414]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Live Render Canvas Preview */}
          <div className="relative w-[216px] h-[384px] rounded-[20px] border-2 border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden bg-[#ECEAE3] mb-5">
            <canvas
              ref={canvasRef}
              width={1080}
              height={1920}
              className="w-full h-full object-cover"
            />
            {!isExporting && !exportComplete && (
              <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition backdrop-blur-[1px] flex flex-col items-center justify-center text-white text-center p-4">
                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md grid place-items-center mb-2 shadow-sm">
                  <Play size={22} className="text-white ml-0.5" fill="currentColor" />
                </div>
                <span className="mono text-[10px] font-bold uppercase tracking-wider drop-shadow-sm">
                  Ready to Download
                </span>
                <span className="text-[11px] opacity-90 drop-shadow-sm mt-0.5">
                  1080×1920 • {totalDuration}s • 60fps
                </span>
              </div>
            )}
            {isExporting && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-white/20 bg-black/90 text-white mono text-[9px] flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#E4491B] animate-ping" />
                <span>REC 60FPS</span>
              </div>
            )}
          </div>

          {/* Status & Progress Information */}
          <div className="w-full text-center space-y-3">
            {exportError ? (
              <div className="rounded-xl border-2 border-rose-600 bg-rose-50 p-3 text-rose-800 text-[12px] flex items-center gap-2 text-left font-medium">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{exportError}</span>
              </div>
            ) : exportComplete ? (
              <div className="rounded-2xl border-2 border-[#141414] bg-[#FFFFFF] p-4 text-[#141414] text-center space-y-2 shadow-[3px_3px_0px_#141414]">
                <div className="inline-flex items-center gap-2 text-[14px] font-bold text-emerald-700">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>Download Complete!</span>
                </div>
                <p className="text-[12px] text-[#52504A] leading-snug">
                  Your {renderedFps}fps reel has been generated and saved to your Downloads / Photos gallery as a{" "}
                  <strong className="text-[#141414]">.{exportFormat.toUpperCase()}</strong> file.
                </p>
                {usedFallback && (
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-2.5 leading-snug text-left">
                    Simplified renderer was used because the full animation could not be composed or rendered.
                    This file may differ from the preview — retry the download for the exact version.
                  </p>
                )}
                {downloadUrl && (
                  <div className="pt-2">
                    <a
                      href={downloadUrl}
                      download={`PaperStudio_${totalDuration}s_Reel.${exportFormat}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#141414] bg-emerald-600 text-white mono text-[11px] font-bold shadow-[2px_2px_0px_#141414] hover:bg-emerald-700 transition"
                    >
                      <Download size={13} />
                      <span>Download Again</span>
                    </a>
                  </div>
                )}
              </div>
            ) : isExporting ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] mono text-[#52504A]">
                  <span className="flex items-center gap-1.5 font-bold text-[#141414]">
                    <Loader2 size={13} className="animate-spin text-[#E4491B]" />
                    {phase === "composing"
                      ? "Composing full animation from scenes…"
                      : hasSparkCode
                        ? progress < 90 ? "Rendering with Remotion…" : "Finalising MP4…"
                        : `Rendering Frame ${currentFrame} / ${totalFrames}`}
                  </span>
                  <span className="font-bold text-[#E4491B]">{progress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-[#ECEAE3] border-2 border-[#141414] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#E4491B] via-[#E4491B] to-[#C93D14] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mono text-[10px] text-[#52504A]">
                  {phase === "composing"
                    ? "Building the exact animation you see in the preview…"
                    : hasSparkCode
                      ? "Frame-accurate Remotion render • 1080×1920 • matches preview exactly"
                      : "Encoding canvas fallback • 1080×1920 • 9:16 portrait"}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <h4 className="serif text-[18px] text-[#141414] font-medium">
                  Export high-definition video
                </h4>
                <p className="text-[12px] text-[#52504A] max-w-[380px] mx-auto leading-relaxed">
                  Synthesizes all {activeBeatsList.length || 6} scenes with paper physics, clean typography,
                  and 1080×1920 9:16 portrait framing for Instagram & Meta Reels.
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          {!exportComplete && (
            <div className="w-full pt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="flex-1 py-2.5 rounded-full border-2 border-[#141414] bg-[#ECEAE3] hover:bg-[#F6D9CC] mono text-[12px] text-[#141414] font-bold transition disabled:opacity-40 shadow-[2px_2px_0px_#141414]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startExport}
                disabled={isExporting}
                className="flex-1 py-2.5 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white mono text-[12px] font-bold shadow-[2px_2px_0px_#141414] transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Rendering ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download MP4 Reel</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
