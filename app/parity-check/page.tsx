"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  extractWordsFromPlan,
  buildExplainerScenes,
  preloadExplainerBrollImages,
  ensureExplainerFontsLoaded,
  renderExplainerFrameToCanvas,
  resolveActivePalette,
  exportExactExplainerMp4,
  PALETTES,
} from "@/lib/pipeline-b/explainer-canvas-renderer";

const DEFAULT_RUN_ID = "run-b-2026-10-30T05-36-19-045Z-rsgzp";
const TIMESTAMPS = [0.0, 1.0, 5.0, 15.0];

export default function ParityCheckPage() {
  const [status, setStatus] = useState<string>("Ready to run parity test.");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<any[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const remoteLog = async (msg: string) => {
    console.log("[Parity Runner]", msg);
    try {
      await fetch("/api/parity-check/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msg }),
      });
    } catch {}
  };

  const runTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);
    setSummary(null);
    setProgress(5);

    try {
      const targetRunId =
        (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("runId")) ||
        DEFAULT_RUN_ID;

      await remoteLog(`1/4 Loading test run state for ${targetRunId}...`);
      setStatus(`1/4 Loading test run state for ${targetRunId}...`);
      const res = await fetch(`/api/pipeline-b/status/${targetRunId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load run state.");
      }
      const state = data.state;
      const cleanVideoUrl = `/api/pipeline-b/media/${targetRunId}/clean`;
      const duration = state.metadata?.duration || 21.8;
      const topic = state.editPlan?.title || "Story Explainer Reel";

      const words = extractWordsFromPlan(state.editPlan, []);
      const scenes = buildExplainerScenes(duration, state.editPlan, words, [], topic);
      const palette = resolveActivePalette("auto", topic, state.editPlan);
      const layoutMode = "auto_reel";

      await remoteLog("2/4 Preloading assets & initializing decoder video...");
      setStatus("2/4 Preloading assets & initializing decoder video...");
      const brollImages = await preloadExplainerBrollImages(scenes);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        throw new Error("Video or Canvas ref is missing.");
      }

      video.src = cleanVideoUrl;
      await new Promise<void>((resolve, reject) => {
        let loaded = false;
        const cleanup = () => {
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("error", onErr);
        };
        const onLoaded = () => {
          if (!loaded) {
            loaded = true;
            cleanup();
            resolve();
          }
        };
        const onErr = () => {
          if (!loaded) {
            loaded = true;
            cleanup();
            reject(new Error("Video failed to load in test runner."));
          }
        };
        if (video.readyState >= 2) return resolve();
        video.addEventListener("loadeddata", onLoaded);
        video.addEventListener("error", onErr);
        setTimeout(() => {
          if (!loaded && video.readyState >= 1) {
            loaded = true;
            cleanup();
            resolve();
          }
        }, 3000);
        video.load();
      });

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not acquire 2D context.");

      await ensureExplainerFontsLoaded();
      await remoteLog("Google Fonts preloaded and compiled in browser cache.");

      // Step A: Capture preview frames at exact timestamps
      await remoteLog("3/4 Capturing preview frames at timestamps [0.0, 1.0, 5.0, 15.0]s...");
      setStatus("3/4 Capturing preview frames at timestamps [0.0, 1.0, 5.0, 15.0]s...");
      for (const t of TIMESTAMPS) {
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              clearTimeout(timer);
              video.removeEventListener("seeked", onSeeked);
              resolve();
            }
          };
          const onSeeked = () => {
            setTimeout(finish, 20);
          };
          const timer = setTimeout(finish, 500);
          video.addEventListener("seeked", onSeeked, { once: true });
          video.currentTime = Math.min(duration - 0.05, t);
        });

        renderExplainerFrameToCanvas(ctx, video, t, {
          scenes,
          words,
          duration,
          palette,
          layoutMode,
          brollImages,
        });

        const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png"));
        if (!blob) throw new Error(`Could not capture preview frame at t=${t}s.`);

        await fetch(`/api/parity-check/save-frame?type=preview&t=${t}`, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: blob,
        });
        await remoteLog(`Saved preview frame at t=${t}s (${blob.size} bytes)`);
      }

      setProgress(40);

      // Step B: Render export MP4
      await remoteLog("4/4 Rendering exact MP4 via deterministic seek-and-render...");
      setStatus("4/4 Rendering exact MP4 via deterministic seek-and-render...");
      await exportExactExplainerMp4({
        cleanVideoUrl,
        runId: targetRunId,
        scenes,
        words,
        duration,
        palette,
        layoutMode,
        brollImages,
        onProgress: (p) => {
          setProgress(40 + Math.round((p / 100) * 45));
          if (p % 10 === 0) {
            remoteLog(`Export render progress: ${p}%`);
          }
        },
      });

      setProgress(90);
      await remoteLog("Calling /api/parity-check/extract-and-compare...");
      setStatus("Comparing preview frames against exported MP4 frames with FFmpeg SSIM/PSNR...");

      // Step C: Compare frames
      const compResp = await fetch("/api/parity-check/extract-and-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: targetRunId, timestamps: TIMESTAMPS }),
      });
      const compData = await compResp.json();
      if (!compResp.ok || !compData.success) {
        throw new Error(compData.error || "Frame comparison failed.");
      }

      setProgress(100);
      setResults(compData.results);
      setSummary(compData.summary);
      setStatus("Parity verification completed successfully.");
      await remoteLog(`Parity check finished! allPassed: ${compData.allPassed}`);
    } catch (err: any) {
      await remoteLog(`ERROR: ${err.message}`);
      console.error("Parity test failed:", err);
      console.error("Parity test failed:", err);
      setError(err.message || "Parity check failed.");
      setStatus("Failed with error.");
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autorun") === "1") {
      runTest();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white p-8">
      {/* Invisible font preloader elements to trigger immediate layout calculation in headless Chromium */}
      <div style={{ position: "absolute", opacity: 0.001, pointerEvents: "none", zIndex: -10 }} aria-hidden="true">
        <span style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 900 }}>Preload Plus Jakarta Sans 900</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800 }}>Preload Plus Jakarta Sans 800</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 700 }}>Preload Plus Jakarta Sans 700</span>
        <span style={{ fontFamily: "'Montserrat'", fontWeight: 900 }}>Preload Montserrat 900</span>
        <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 800 }}>Preload JetBrains Mono 800</span>
        <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>Preload JetBrains Mono 700</span>
        <span style={{ fontFamily: "'Instrument Serif'", fontWeight: 700 }}>Preload Instrument Serif 700</span>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MP4 Export Frame Parity Verification</h1>
            <p className="text-sm text-white/60">
              Validates that preview canvas and exported MP4 frames match at identical timestamps.
            </p>
          </div>
          <button
            onClick={runTest}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-xl font-bold bg-[#FF5520] hover:bg-[#E4491B] disabled:opacity-50 text-white transition cursor-pointer shadow-lg"
          >
            {isRunning ? `Running (${progress}%)...` : "Run Frame Parity Check"}
          </button>
        </div>

        {/* Status / Progress */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="mono text-xs font-bold uppercase tracking-wider text-white/70">
              Runner Status:
            </span>
            <span className="mono text-xs text-orange-400 font-bold">{progress}%</span>
          </div>
          <p className="text-sm font-medium text-white/90">{status}</p>
          {isRunning && (
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-500 rounded-2xl p-4 text-rose-200 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Summary */}
        {summary && (
          <div className="bg-emerald-950/80 border border-emerald-500 rounded-2xl p-4 text-emerald-200 text-sm font-medium">
            {summary}
          </div>
        )}

        {/* Detailed Comparison Table */}
        {results && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">Side-by-Side Frame Comparisons</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((r) => (
                <div
                  key={r.timestamp}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-white/10">
                      Timestamp: {r.timestamp.toFixed(1)}s
                    </span>
                    <span
                      className={`mono text-xs font-bold px-2 py-0.5 rounded ${
                        r.ssim && r.ssim >= 0.95
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      }`}
                    >
                      {r.matchGrade}
                    </span>
                  </div>

                  <p className="text-xs text-white/70">{r.notes}</p>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] mono text-white/60">
                    <div>
                      <div className="mb-1 font-bold">Preview Frame</div>
                      <img
                        src={`/api/parity-check/view-frame?file=preview_t${r.timestamp}.png`}
                        alt={`Preview t=${r.timestamp}`}
                        className="rounded-lg border border-white/20 aspect-[9/16] object-cover bg-black"
                      />
                    </div>
                    <div>
                      <div className="mb-1 font-bold">Exported MP4</div>
                      <img
                        src={`/api/parity-check/view-frame?file=export_t${r.timestamp}.png`}
                        alt={`Export t=${r.timestamp}`}
                        className="rounded-lg border border-white/20 aspect-[9/16] object-cover bg-black"
                      />
                    </div>
                    <div>
                      <div className="mb-1 font-bold">Diff Heatmap</div>
                      {r.diffImagePath ? (
                        <img
                          src={r.diffImagePath}
                          alt={`Diff t=${r.timestamp}`}
                          className="rounded-lg border border-white/20 aspect-[9/16] object-cover bg-black"
                        />
                      ) : (
                        <div className="aspect-[9/16] rounded-lg border border-white/10 grid place-items-center">
                          N/A
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decoder elements (Must stay mounted in DOM without display:none so Chrome decodes frames) */}
        <div style={{ position: "fixed", top: -9999, left: -9999, opacity: 0.01, pointerEvents: "none" }}>
          <video ref={videoRef} crossOrigin="anonymous" playsInline muted preload="auto" style={{ width: 480, height: 854 }} />
          <canvas ref={canvasRef} width={1080} height={1920} />
        </div>
      </div>
    </div>
  );
}
