"use client";

import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Download, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { createSparkPreviewDocument } from "./spark-preview-document";

interface SparkLiveRunnerProps {
  code: string;
  duration?: number;
  aspectRatio?: string;
  className?: string;
  replayKey?: number;
  isGenerating?: boolean;
  generatingStep?: string;
  theme?: any;
  storyboard?: any;
  topic?: string;
  showControls?: boolean;
  onRetry?: () => void;
  errorMessage?: string | null;
  onReady?: () => void;
  onError?: (message: string) => void;
  onExportMP4?: () => void;
  onTimeUpdate?: (time: number, isPlaying: boolean) => void;
}

export default function SparkLiveRunner({
  code,
  duration = 10,
  aspectRatio = "9/16",
  className = "",
  replayKey = 0,
  isGenerating = false,
  generatingStep = "",
  theme,
  storyboard,
  showControls = true,
  onRetry,
  errorMessage = null,
  onReady,
  onError,
  onExportMP4,
  onTimeUpdate,
}: SparkLiveRunnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callbacksRef = useRef({ onReady, onError, onTimeUpdate });
  callbacksRef.current = { onReady, onError, onTimeUpdate };
  const instanceId = useId();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const totalVideoDuration = Number.isFinite(duration) && duration > 0 ? duration : 10;
  const background = String(theme?.bg || storyboard?.theme?.bg || "#FFF8F0");
  const ink = String(theme?.ink || storyboard?.theme?.ink || "#3D2E22");
  const previewId = useMemo(() => {
    let hash = 2166136261;
    for (const character of code) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return `${instanceId}-${hash >>> 0}-${replayKey}-${reloadKey}-${totalVideoDuration}`;
  }, [instanceId, code, replayKey, reloadKey, totalVideoDuration]);
  const srcDoc = useMemo(() => createSparkPreviewDocument({
    code, duration: totalVideoDuration, background, ink, previewId, fps: 60,
  }), [code, totalVideoDuration, background, ink, previewId]);
  const visibleError = errorMessage || renderError;

  useEffect(() => {
    setIsLoaded(false);
    setIsPlaying(true);
    setCurrentTime(0);
    setRenderError(null);
    let mounted = false;
    let failed = false;
    const fail = (message: string) => {
      if (failed) return;
      failed = true;
      setRenderError(message);
      callbacksRef.current.onError?.(message);
    };
    const timeout = window.setTimeout(() => {
      if (!mounted && !failed && code && !isGenerating && !errorMessage) {
        fail("The preview took too long to load. Check the connection, then reload the preview.");
      }
    }, 30000);
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.previewId !== previewId) return;
      if (event.data.type === "SPARK_MOUNTED" && !failed) {
        mounted = true;
        window.clearTimeout(timeout);
        setIsLoaded(true);
        callbacksRef.current.onReady?.();
      } else if (event.data.type === "SPARK_RENDER_ERROR") {
        window.clearTimeout(timeout);
        fail(typeof event.data.message === "string" ? event.data.message : "The animation failed to render.");
      } else if (event.data.type === "SPARK_TIME_UPDATE" && !failed) {
        if (Number.isFinite(event.data.currentTime)) setCurrentTime(event.data.currentTime);
        if (typeof event.data.isPlaying === "boolean") setIsPlaying(event.data.isPlaying);
        if (Number.isFinite(event.data.currentTime)) {
          callbacksRef.current.onTimeUpdate?.(
            event.data.currentTime,
            event.data.isPlaying !== false
          );
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
    };
  }, [srcDoc, previewId, code, isGenerating, errorMessage]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const sendCommand = (type: string, data: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage({ type, previewId, ...data }, "*");
  };
  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    sendCommand("SET_PLAYING", { isPlaying: nextState });
  };
  const handleSeek = (time: number) => {
    const target = Math.max(0, Math.min(totalVideoDuration, time));
    setCurrentTime(target);
    sendCommand("SEEK", { time: target });
  };
  const handleReplay = () => {
    handleSeek(0);
    setIsPlaying(true);
    sendCommand("SET_PLAYING", { isPlaying: true });
  };
  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current.requestFullscreen();
    } catch {}
  };

  return (
    <div ref={containerRef} className={`group relative w-full h-full flex flex-col overflow-hidden rounded-[24px] bg-[#ECEAE3] border border-[#D5D2C8] ${className}`} style={{ aspectRatio }}>
      <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-white">
          <span className={`w-2 h-2 rounded-full ${visibleError ? "bg-rose-400" : isLoaded ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
          <span className="font-mono text-[9.5px] tracking-wider uppercase">
            {visibleError ? "Preview needs attention" : isLoaded ? "Spark 1.3 · Live" : "Preparing preview"}
          </span>
        </div>
        <button onClick={handleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen preview"} className="w-8 h-8 rounded-full grid place-items-center bg-black/60 text-white border border-white/10">
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {!visibleError && code && !isGenerating && (
          <iframe
            key={previewId}
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="absolute inset-0 w-full h-full border-none bg-transparent"
            title="Meta Muse Spark 1.3 Live Animation Preview"
          />
        )}
        {visibleError ? (
          <div className="absolute inset-0 z-20 bg-[#F7F5EF] text-[#141414] px-5 pt-14 pb-5 flex flex-col items-center justify-center text-center" role="alert">
            <AlertCircle size={28} className="text-rose-500 mb-3 shrink-0" />
            <h3 className="serif text-[22px] mb-2 text-[#141414]">Preview couldn’t finish</h3>
            <p className="text-[12px] text-[#6B6A64] max-w-[300px] leading-relaxed max-h-40 overflow-y-auto break-words">{visibleError}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {!errorMessage && (
                <button onClick={() => setReloadKey((previous) => previous + 1)} className="px-3 py-2 rounded-full bg-[#ECEAE3] border border-[#D5D2C8] text-[#141414] text-[11px] flex items-center gap-1.5">
                  <RotateCcw size={12} /> Reload preview
                </button>
              )}
              {onRetry && (
                <button onClick={onRetry} className="px-3 py-2 rounded-full bg-[#E4491B] hover:bg-[#C93D14] text-white text-[11px] flex items-center gap-1.5 shadow-xs">
                  <RefreshCw size={12} /> Regenerate video
                </button>
              )}
            </div>
          </div>
        ) : (isGenerating || !isLoaded) && (
          <div className="absolute inset-0 z-20 bg-[#F7F5EF] text-[#141414] flex flex-col items-center justify-center p-6 text-center" role="status">
            <Loader2 size={28} className="animate-spin text-[#E4491B] mb-4" />
            <p className="serif text-[22px] mb-2 text-[#141414]">{isGenerating ? "Spark is creating your video" : "Opening your animation"}</p>
            <p className="text-[12px] text-[#6B6A64] max-w-[250px] leading-relaxed">
              {generatingStep || (isGenerating ? "Explore Wonder’s storyboard while the scenes come together." : "Loading the preview and preparing the first frame.")}
            </p>
          </div>
        )}
      </div>

      {showControls && (
        <div className="relative z-30 bg-black/75 border-t border-white/10 p-3 flex flex-col gap-2">
          <input type="range" min={0} max={totalVideoDuration} step={0.05} value={currentTime} onChange={(event) => handleSeek(Number(event.target.value))} disabled={!isLoaded || !!visibleError} className="w-full accent-[#E4491B] disabled:opacity-40" aria-label="Seek animation" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={handleTogglePlay} disabled={!isLoaded || !!visibleError} aria-label={isPlaying ? "Pause" : "Play"} className="w-8 h-8 rounded-full bg-white/20 text-white grid place-items-center disabled:opacity-40">
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button onClick={handleReplay} disabled={!isLoaded || !!visibleError} aria-label="Replay from start" className="w-8 h-8 rounded-full bg-white/10 text-white grid place-items-center disabled:opacity-40">
                <RotateCcw size={13} />
              </button>
              <span className="mono text-[10px] text-white/90 tabular-nums">{currentTime.toFixed(1)} / {totalVideoDuration.toFixed(1)}s</span>
            </div>
            {onExportMP4 ? (
              <button
                onClick={onExportMP4}
                disabled={!isLoaded || !!visibleError}
                className="px-2.5 py-1 rounded-full bg-[#E4491B] hover:bg-[#C93D14] text-white mono text-[9.5px] font-semibold flex items-center gap-1 transition shadow-xs active:scale-95 disabled:opacity-40"
                title="Download 1080x1920 60fps MP4 Reel"
              >
                <Download size={11} /> Download MP4
              </button>
            ) : (
              <button disabled className="text-[9px] text-white/40 flex items-center gap-1 cursor-not-allowed" title="Video export is not available yet">
                <Download size={12} /> MP4 soon
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
