"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Sparkles,
  FileJson,
  Dices,
  Sliders,
} from "lucide-react";
import {
  renderProceduralFrame,
  sampleTrack,
  PROCEDURAL_STYLE_CATALOG,
  type SceneScript,
} from "@/lib/procedural-engine";

interface ProceduralStageProps {
  sceneScript: SceneScript;
  audioUrl?: string;
  runId?: string;
  topic?: string;
  onUpdateScript?: (updated: SceneScript) => void;
}

export default function ProceduralStage({
  sceneScript,
  audioUrl,
  runId,
  topic,
  onUpdateScript,
}: ProceduralStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [localScript, setLocalScript] = useState<SceneScript>(sceneScript);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    setLocalScript(sceneScript);
    setCurrentTime(0);
    setIsPlaying(true);
  }, [sceneScript]);

  const totalDuration = Math.max(3, Number(localScript?.duration) || 15);
  const activeStyleMeta =
    PROCEDURAL_STYLE_CATALOG.find((s) => s.id === localScript.style) ||
    PROCEDURAL_STYLE_CATALOG[0];

  // Sync audio play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl]);

  // Wall-clock animation timer when no audio is driving currentTime
  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const audio = audioRef.current;
      if (audio && audioUrl && !audio.paused && Number.isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      } else {
        setCurrentTime((prev) => {
          const next = prev + dt;
          return next >= totalDuration ? 0 : next;
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration, audioUrl]);

  // Render current frame to Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !localScript) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderProceduralFrame(ctx, canvas.width, canvas.height, currentTime, localScript, {
      showSubtitles,
    });
  }, [currentTime, localScript, showSubtitles]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReplay = () => {
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(true);
  };

  const handleSeek = (t: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, t));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  };

  const handleRegenerateSeed = () => {
    const nextSeed = Math.floor(10 + Math.random() * 9900);
    const next: SceneScript = {
      ...localScript,
      seed: nextSeed,
    };
    setLocalScript(next);
    onUpdateScript?.(next);
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {}
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Deterministic Frame-by-Frame 1080x1920 MP4 Export
  const handleExportMP4 = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(5);

    try {
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
              error: (e: any) => console.warn("[ProceduralStage WebCodecs]:", e),
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
        renderProceduralFrame(offCtx, 1080, 1920, t, localScript, { showSubtitles });

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

      const qs = new URLSearchParams({
        ...(runId ? { runId } : {}),
        allowSilent: "1",
      });

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

      if (!remuxResp || !remuxResp.ok) {
        throw new Error("Failed to encode procedural MP4 video.");
      }

      const mp4Buf = await remuxResp.arrayBuffer();
      const mp4Blob = new Blob([mp4Buf], { type: "video/mp4" });
      const downloadUrl = URL.createObjectURL(mp4Blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeTitle = (topic || localScript.title || localScript.style || "procedural_reel")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 36);
      a.download = `${safeTitle}_seed${localScript.seed}_${Math.round(totalDuration)}s.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      setExportProgress(100);
    } catch (err) {
      console.error("[ProceduralStage] MP4 export error:", err);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, totalDuration, localScript, showSubtitles, runId, topic]);

  useEffect(() => {
    const onTrigger = () => handleExportMP4();
    window.addEventListener("export-procedural-story-mp4", onTrigger);
    return () => window.removeEventListener("export-procedural-story-mp4", onTrigger);
  }, [handleExportMP4]);

  // Live evaluated track values at currentTime for telemetry badge
  const liveTod = sampleTrack(localScript.tracks?.timeOfDay, currentTime, 0.45);
  const liveWind = sampleTrack(localScript.tracks?.wind, currentTime, 0.35);
  const liveClouds = sampleTrack(localScript.tracks?.cloudDensity, currentTime, 0.4);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full max-w-[360px] mx-auto select-none ${
        isFullscreen ? "fixed inset-0 z-50 max-w-none bg-black p-4" : ""
      }`}
    >
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

      {/* 9:16 Procedural Canvas Frame */}
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

        {/* Top Overlay: Active Look Badge + Seed Regenerator */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 inset-x-3 flex items-center justify-between gap-1.5 z-20"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white mono text-[9.5px] font-bold">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: activeStyleMeta.accent }}
            />
            <span className="truncate max-w-[130px]">{activeStyleMeta.name}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRegenerateSeed}
              title="Regenerate Seed — same story, new procedural world"
              className="px-2 py-1 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/15 text-white mono text-[9.5px] font-bold flex items-center gap-1 transition active:scale-95"
            >
              <Dices size={11} className="text-[#FFE17D]" />
              <span>Seed #{localScript.seed}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJsonInspector((p) => !p)}
              title="Inspect Scene Script JSON & Live Tracks"
              className={`w-7 h-7 rounded-full backdrop-blur-md border grid place-items-center transition ${
                showJsonInspector
                  ? "bg-[#E4491B] border-[#E4491B] text-white"
                  : "bg-black/65 border-white/15 text-white hover:bg-black/85"
              }`}
            >
              <FileJson size={12} />
            </button>

            <button
              type="button"
              onClick={handleFullscreen}
              aria-label="Toggle fullscreen"
              className="w-7 h-7 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/15 text-white grid place-items-center transition"
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          </div>
        </div>

        {/* Scene Script JSON & Live Track Drawer */}
        {showJsonInspector && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-3 top-12 bottom-3 z-25 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/15 p-3 flex flex-col text-white overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5 mono text-[10px] font-bold text-[#FFE17D] uppercase tracking-wider">
                <Sliders size={11} />
                <span>Live Scene Script • render(t, params, {localScript.seed})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonInspector(false)}
                className="mono text-[9.5px] text-white/70 hover:text-white px-2 py-0.5 rounded bg-white/10"
              >
                Close
              </button>
            </div>

            {/* Live Track Bars */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <div className="rounded-lg bg-white/5 border border-white/10 p-1.5">
                <div className="mono text-[8.5px] text-white/60 uppercase">timeOfDay</div>
                <div className="mono text-[11px] font-bold text-[#FFE17D]">
                  {(liveTod * 100).toFixed(0)}%
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-[#FFE17D]"
                    style={{ width: `${liveTod * 100}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 p-1.5">
                <div className="mono text-[8.5px] text-white/60 uppercase">cloudDensity</div>
                <div className="mono text-[11px] font-bold text-sky-300">
                  {(liveClouds * 100).toFixed(0)}%
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${liveClouds * 100}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 p-1.5">
                <div className="mono text-[8.5px] text-white/60 uppercase">wind</div>
                <div className="mono text-[11px] font-bold text-emerald-300">
                  {(liveWind * 100).toFixed(0)}%
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${liveWind * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <pre className="flex-1 overflow-auto mono text-[9.5px] leading-relaxed text-emerald-200/90 bg-black/50 rounded-xl p-2.5 border border-white/10">
              {JSON.stringify(
                {
                  style: localScript.style,
                  aspect: localScript.aspect,
                  seed: localScript.seed,
                  duration: localScript.duration,
                  tracks: localScript.tracks,
                  elements: localScript.elements,
                  captions: localScript.captions,
                  music: localScript.music,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Exporting Overlay */}
        {isExporting && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30 text-white p-6 text-center"
          >
            <Loader2 size={36} className="animate-spin text-[#FFE17D]" />
            <div className="font-bold text-[14px]">
              Rendering 1080×1920 Procedural MP4...
            </div>
            <div className="w-48 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-[#FFE17D] transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="mono text-[11px] text-white/75">
              {exportProgress}% • Deterministic render(t, params, {localScript.seed})
            </div>
          </div>
        )}
      </div>

      {/* Scrubber & Controls Deck */}
      <div className="w-full mt-1.5 px-3 py-2 rounded-2xl bg-[#FAF9F5]/95 border border-[#141414]/15 shadow-xs flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.05}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Seek procedural timeline"
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

            {audioUrl && (
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                aria-label="Toggle mute"
                title={isMuted ? "Unmute voiceover" : "Mute voiceover"}
                className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-[#555] hover:text-[#141414] transition"
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSubtitles((prev) => !prev)}
              title={showSubtitles ? "Hide captions" : "Show captions"}
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

