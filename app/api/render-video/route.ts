import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia, selectComposition } from "@remotion/renderer";
import { getFfmpegPath } from "@/lib/media-binaries";

const runCmd = promisify(execFile);

function chooseRenderScratchRoot(durationSeconds: number): string {
  // Remotion writes its frame sequence to os.tmpdir(), in addition to the MP4.
  // Long videos need several GB of temporary space even when the final file is small.
  const requiredBytes = Math.max(256 * 1024 * 1024, Math.ceil(durationSeconds) * 20 * 1024 * 1024);
  const candidates = [
    process.env.MUSE_RENDER_TEMP_DIR,
    process.platform === "win32" ? path.join("D:\\", "MuseRenderTemp") : null,
    path.join(process.cwd(), ".render-temp"),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const freeSpace: string[] = [];

  for (const candidate of candidates) {
    try {
      const absolute = path.resolve(candidate);
      const disk = fs.statfsSync(path.parse(absolute).root);
      const availableBytes = disk.bavail * disk.bsize;
      freeSpace.push(`${path.parse(absolute).root} ${(availableBytes / (1024 ** 3)).toFixed(1)} GB free`);
      if (availableBytes < requiredBytes) continue;
      fs.mkdirSync(absolute, { recursive: true });
      fs.accessSync(absolute, fs.constants.W_OK);
      // Remotion's internal renderMedia() calls os.tmpdir() at render time.
      process.env.TMP = absolute;
      process.env.TEMP = absolute;
      process.env.TMPDIR = absolute;
      return absolute;
    } catch {
      // Try the next configured or local drive.
    }
  }

  throw new Error(`Not enough temporary disk space to export this ${durationSeconds}s video. About ${(requiredBytes / (1024 ** 3)).toFixed(1)} GB is needed; ${freeSpace.join(", ") || "no writable render drive is available"}. Free space or set MUSE_RENDER_TEMP_DIR to a drive with room, then retry the download.`);
}

/** Only files we synthesized ourselves may be muxed into the export. */
function resolveVoiceFile(url: string): string | null {
  try {
    const clean = String(url || "").split("?")[0].split("#")[0];
    if (!clean.startsWith("/voiceover/")) return null;
    const abs = path.join(process.cwd(), "public", ...clean.split("/").filter(Boolean));
    const root = path.join(process.cwd(), "public", "voiceover") + path.sep;
    if (!abs.startsWith(root) || !fs.existsSync(abs)) return null;
    return abs;
  } catch {
    return null;
  }
}

function resolveSoundEffectsFile(url: string): string | null {
  const clean = String(url || "").split("?")[0].split("#")[0];
  if (!/^\/sfx\/[0-9a-f-]+\.m4a$/i.test(clean)) return null;
  const file = path.join(process.cwd(), "public", "sfx", path.basename(clean));
  return fs.existsSync(file) ? file : null;
}

/** Mix placed narration and the Create effects bed onto one timeline track. */
async function buildAudioTrack(
  tracks: { url: string; start: number }[],
  soundEffectsUrl: string | undefined,
  renderDir: string
): Promise<string | null> {
  const placed: { file: string; startMs: number }[] = [];
  for (const t of tracks || []) {
    const file = resolveVoiceFile(t?.url);
    const startMs = Math.max(0, Math.round(Number(t?.start) * 1000));
    if (!file || !Number.isFinite(startMs)) throw new Error("A narration file is missing. Regenerate the reel and try again.");
    placed.push({ file, startMs });
  }
  const effectsFile = soundEffectsUrl ? resolveSoundEffectsFile(soundEffectsUrl) : null;
  if (soundEffectsUrl && !effectsFile) throw new Error("The sound effects file is missing. Regenerate the reel and try again.");
  if (!placed.length && !effectsFile) return null;

  const inputArgs: string[] = [];
  const filters: string[] = [];
  const labels: string[] = [];
  placed.forEach((p, i) => {
    inputArgs.push("-i", p.file);
    const label = `[a${i}]`;
    // Input indices are 0-based here: this command takes only the voice files.
    filters.push(`[${i}:a]adelay=${p.startMs}|${p.startMs}${label}`);
    labels.push(label);
  });
  if (effectsFile) {
    const index = placed.length;
    inputArgs.push("-i", effectsFile);
    filters.push(`[${index}:a]volume=0.7[sfx]`);
    labels.push("[sfx]");
  }
  let audioMap = labels[0];
  if (labels.length > 1) {
    filters.push(`${labels.join("")}amix=inputs=${labels.length}:duration=longest:normalize=0,volume=0.85[aout]`);
    audioMap = "[aout]";
  }
  const mixed = path.join(renderDir, "audio.m4a");
  await runCmd(getFfmpegPath(), [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    audioMap,
    "-c:a",
    "aac",
    "-f",
    "mp4",
    mixed,
  ]);
  return mixed;
}

// Allow up to 5 minutes for long renders
export const maxDuration = 1800;
export const dynamic = "force-dynamic";

/** Detect the exported component name from raw sparkCode */
function detectComponentName(code: string): string | null {
  const patterns = [
    /export\s+default\s+function\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
    /export\s+default\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[;({]/,
    /export\s+(?:const|function)\s+(GeneratedReel|FullReel|MuseReel|SparkReel|ReelComponent|VideoReel|Reel)\b/,
    /export\s+(?:const|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
    /^const\s+(GeneratedReel|FullReel|MuseReel|SparkReel)\s*=/m,
  ];
  for (const p of patterns) {
    const m = code.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  let cancelRender: (() => void) | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
    cancel() {
      cancelRender?.();
    },
  });
  const sendEvent = (event: Record<string, unknown>) => {
    try {
      streamController?.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`));
      if (event.type === "error" || event.type === "cancelled") streamController?.close();
    } catch {}
  };
  void renderVideoRequest(req, sendEvent, (bytes) => {
    try {
      if (streamController) {
        streamController.enqueue(new TextEncoder().encode("--VIDEO--\n"));
        streamController.enqueue(bytes);
        streamController.close();
      }
    } catch {}
  }, (cancel) => { cancelRender = cancel; });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-paper-studio-render", "Cache-Control": "no-store" },
  });
}

async function renderVideoRequest(
  req: NextRequest,
  sendEvent: (event: Record<string, unknown>) => void,
  sendVideo: (bytes: Uint8Array) => void,
  onCancelReady: (cancel: () => void) => void
) {
  let renderDir: string | null = null;
  let scratchDir: string | null = null;
  const { cancelSignal, cancel } = makeCancelSignal();
  let wasCancelled = false;
  const cancelRequest = () => { wasCancelled = true; cancel(); };
  onCancelReady(cancelRequest);
  req.signal.addEventListener("abort", cancelRequest, { once: true });

  try {
    const body = await req.json();
    const {
      sparkCode,
      duration = 15,
      aspectRatio = "9:16",
      fps = 30,
      topic = "SparkReel",
      background = "#FFF8F0",
      ink = "#3D2E22",
      audioTracks = [],
      soundEffectsUrl,
      backgroundVideoUrl,
      backgroundVideoStart = 0,
      sceneOverlayCode,
      sceneOverlayStart = 0,
      sceneOverlayDuration = 0,
      sceneCameraPacing = [],
      galleryBrollSegments = [],
    } = body;
    const landscape = aspectRatio === "16:9";

    let resolvedBackgroundVideoUrl = "";
    if (typeof backgroundVideoUrl === "string" && backgroundVideoUrl.trim()) {
      const parsedBackgroundUrl = new URL(backgroundVideoUrl, req.nextUrl.origin);
      if (parsedBackgroundUrl.protocol !== "http:" && parsedBackgroundUrl.protocol !== "https:") {
        throw new Error("The background video URL must use HTTP or HTTPS.");
      }
      if (parsedBackgroundUrl.origin !== req.nextUrl.origin || !parsedBackgroundUrl.pathname.startsWith("/api/pipeline-b/media/")) {
        throw new Error("The background video must be a Pipeline B media URL from this app.");
      }
      resolvedBackgroundVideoUrl = parsedBackgroundUrl.toString();
    }
    const backgroundStartFrame = Math.max(0, Math.round(Number(backgroundVideoStart || 0) * Math.min(60, Math.max(1, Number(fps)))));

    if (!sparkCode || typeof sparkCode !== "string" || sparkCode.trim().length < 20) {
      throw new Error("sparkCode is required and must be non-empty.");
    }

    let cleanedSparkCode = sparkCode
      .trim()
      .replace(/^```(?:tsx|jsx|typescript|javascript)?\s*\r?\n/i, "")
      .replace(/\r?\n```\s*$/, "")
      .trim();

    if (
      !/import\s+React\b/.test(cleanedSparkCode) &&
      !/import\s+\*\s+as\s+React\b/.test(cleanedSparkCode)
    ) {
      cleanedSparkCode = 'import React from "react";\n' + cleanedSparkCode;
    }

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    renderDir = path.join(process.cwd(), ".render-temp", jobId);
    fs.mkdirSync(renderDir, { recursive: true });
    scratchDir = path.join(chooseRenderScratchRoot(Number(duration) || 15), jobId);
    fs.mkdirSync(scratchDir, { recursive: true });

    // Write the spark component to its own file so webpack can resolve imports normally
    const componentFile = path.join(renderDir, "SparkComponent.tsx");
    fs.writeFileSync(componentFile, cleanedSparkCode, "utf-8");

    const hasSceneOverlay = typeof sceneOverlayCode === "string" && sceneOverlayCode.trim().length >= 20;
    let cleanedSceneOverlayCode = "";
    if (hasSceneOverlay) {
      cleanedSceneOverlayCode = sceneOverlayCode
        .trim()
        .replace(/^```(?:tsx|jsx|typescript|javascript)?\s*\r?\n/i, "")
        .replace(/\r?\n```\s*$/, "")
        .trim();
      if (!/import\s+React\b/.test(cleanedSceneOverlayCode) && !/import\s+\*\s+as\s+React\b/.test(cleanedSceneOverlayCode)) {
        cleanedSceneOverlayCode = 'import React from "react";\n' + cleanedSceneOverlayCode;
      }
      fs.writeFileSync(path.join(renderDir, "SceneOverlay.tsx"), cleanedSceneOverlayCode, "utf-8");
    }

    // Detect the exported name so we can reference it directly
    const detectedName = detectComponentName(cleanedSparkCode);
    const componentRef = detectedName
      ? `SparkModule.default ?? (SparkModule as any).${detectedName} ?? SparkModule`
      : `SparkModule.default ?? (SparkModule as any).GeneratedReel ?? (SparkModule as any).FullReel ?? SparkModule`;
    const detectedSceneOverlayName = hasSceneOverlay ? detectComponentName(cleanedSceneOverlayCode) : null;
    const sceneOverlayRef = detectedSceneOverlayName
      ? `SceneOverlayModule.default ?? (SceneOverlayModule as any).${detectedSceneOverlayName} ?? SceneOverlayModule`
      : `SceneOverlayModule.default ?? (SceneOverlayModule as any).GeneratedReel ?? (SceneOverlayModule as any).FullReel ?? SceneOverlayModule`;

    const totalFrames = Math.max(1, Math.round(Number(duration) * Number(fps)));
    const safeFps = Math.min(60, Math.max(1, Number(fps)));
    const safeGalleryBrollSegments = Array.isArray(galleryBrollSegments)
      ? galleryBrollSegments.flatMap((segment: any) => {
          try {
            const start = Math.max(0, Number(segment?.start) || 0);
            const end = Math.min(Number(duration) || 0, Number(segment?.end) || 0);
            const parsed = new URL(String(segment?.assetUrl || ""), req.nextUrl.origin);
            if (parsed.origin !== req.nextUrl.origin || !parsed.pathname.startsWith("/gallery-assets/") || parsed.pathname.split("/").includes("..") || end <= start) return [];
            const assetPath = path.resolve(process.cwd(), "public", `.${decodeURIComponent(parsed.pathname)}`);
            const galleryRoot = path.resolve(process.cwd(), "public", "gallery-assets") + path.sep;
            if (!assetPath.startsWith(galleryRoot) || !fs.existsSync(assetPath)) return [];
            return [{
              start,
              end,
              assetUrl: parsed.toString(),
              kind: segment.galleryClipKind === "image" ? "image" : "video",
              assetStart: Math.max(0, Number(segment.assetStart) || 0),
              name: String(segment.galleryClipName || "Gallery clip").slice(0, 100),
            }];
          } catch { return []; }
        })
      : [];
    const safeSceneCameraPacing = Array.isArray(sceneCameraPacing)
      ? sceneCameraPacing
          .filter((beat: any) => Number.isFinite(Number(beat?.time)) && Number.isFinite(Number(beat?.zoom)))
          .map((beat: any) => ({
            time: Math.max(0, Math.min(Number(sceneOverlayDuration) || 0, Number(beat.time))),
            zoom: Math.max(1, Math.min(1.28, Number(beat.zoom))),
          }))
          .sort((a: { time: number }, b: { time: number }) => a.time - b.time)
      : [];

    // Remotion entry point — wraps SparkComponent in a Remotion Composition
    const entryFile = path.join(renderDir, "index.tsx");
    const entryContent = [
      'import React from "react";',
      'import { registerRoot, Composition, Video, Img, useCurrentFrame, useVideoConfig } from "remotion";',
      'import * as SparkModule from "./SparkComponent";',
      ...(hasSceneOverlay ? ['import * as SceneOverlayModule from "./SceneOverlay";'] : []),
      "",
      "try {",
      '  if (typeof window !== "undefined" && window.SVGElement) {',
      "    const orig = SVGElement.prototype.setAttribute;",
      "    SVGElement.prototype.setAttribute = function(n, v) {",
      '      if (v === "NaN" || (typeof v === "number" && Number.isNaN(v))) v = "0";',
      "      return orig.call(this, n, v);",
      "    };",
      "  }",
      "} catch {}",
      "",
      `const SparkComponent: React.ComponentType<any> = ${componentRef};`,
      ...(hasSceneOverlay ? [`const SceneOverlayComponent: React.ComponentType<any> = ${sceneOverlayRef};`] : []),
      `const SCENE_OVERLAY_START = ${Math.max(0, Number(sceneOverlayStart) || 0)};`,
      `const SCENE_OVERLAY_DURATION = ${Math.max(0, Number(sceneOverlayDuration) || 0)};`,
      `const SCENE_CAMERA_PACING = ${JSON.stringify(safeSceneCameraPacing)};`,
      `const GALLERY_BROLL_SEGMENTS = ${JSON.stringify(safeGalleryBrollSegments)};`,
      "",
      // Mirror the preview iframe's #root stage exactly (spark-preview-document.ts)
      `const STAGE_BG = ${JSON.stringify(resolvedBackgroundVideoUrl ? "transparent" : String(background))};`,
      `const BASE_VIDEO_URL = ${JSON.stringify(resolvedBackgroundVideoUrl)};`,
      `const BASE_VIDEO_START_FRAME = ${backgroundStartFrame};`,
      `const STAGE_INK = ${JSON.stringify(String(ink))};`,
      `const LANDSCAPE = ${landscape};`,
      "const STAGE_CSS = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Montserrat:ital,wght@0,700;0,800;0,900;1,900&family=Poppins:wght@800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;700&display=swap'); #spark-stage > * { width: 100% !important; height: 100% !important; min-height: 100% !important; } * { box-sizing: border-box; }`;",
      "",
      "const RemotionWrapper: React.FC = () => {",
      "  const frame = useCurrentFrame();",
      "  const { fps, durationInFrames, width, height } = useVideoConfig();",
      "  const stageWidth = 1080;",
      "  const stageHeight = 1920;",
      "  const stageScale = LANDSCAPE ? 1080 / stageHeight : 1;",
      "  const duration = durationInFrames / fps;",
      "  const currentTime = Math.min(duration, frame / fps);",
      "  const sceneOverlayActive = SCENE_OVERLAY_DURATION > 0 && currentTime >= SCENE_OVERLAY_START && currentTime < SCENE_OVERLAY_START + SCENE_OVERLAY_DURATION;",
      "  const sceneLocalTime = Math.max(0, currentTime - SCENE_OVERLAY_START);",
      "  const activeGalleryBroll = GALLERY_BROLL_SEGMENTS.find((segment:any) => currentTime >= segment.start && currentTime < segment.end);",
      "  let sceneCameraZoom = 1;",
      "  for (const beat of SCENE_CAMERA_PACING) { if (sceneLocalTime < beat.time) break; sceneCameraZoom = beat.zoom; }",
      "  return React.createElement(",
      "    'div',",
      "    { style: { position: 'absolute', inset: 0, width, height, overflow: 'hidden', background: '#0B0C10' } },",
      "    React.createElement('div',",
      "    {",
      "      id: 'spark-stage',",
      "      style: { position: 'absolute', left: LANDSCAPE ? (width - stageWidth * stageScale) / 2 : 0, top: 0, width: stageWidth, height: stageHeight, overflow: 'hidden', transform: `scale(${stageScale})`, transformOrigin: 'top left', background: STAGE_BG, color: STAGE_INK, fontFamily: 'Inter, system-ui, sans-serif' },",
      "    },",
      "    React.createElement('style', null, STAGE_CSS),",
      "    BASE_VIDEO_URL ? React.createElement(Video, { src: BASE_VIDEO_URL, startFrom: BASE_VIDEO_START_FRAME, endAt: BASE_VIDEO_START_FRAME + durationInFrames, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: activeGalleryBroll ? 0 : 1, transform: sceneOverlayActive ? `scale(${sceneCameraZoom})` : 'scale(1)', transformOrigin: 'center center' } }) : null,",
      "    activeGalleryBroll ? (activeGalleryBroll.kind === 'image' ? React.createElement(Img, { src: activeGalleryBroll.assetUrl, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.08) contrast(1.04)' } }) : React.createElement(Video, { src: activeGalleryBroll.assetUrl, startFrom: Math.round(activeGalleryBroll.assetStart * fps), endAt: Math.round((activeGalleryBroll.assetStart + activeGalleryBroll.end - activeGalleryBroll.start) * fps), style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.08) contrast(1.04)' } })) : null,",
      "    React.createElement(React.Fragment, null,",
      "      !sceneOverlayActive ? React.createElement(SparkComponent, { currentTime, time: currentTime, duration, fps, frame, width: stageWidth, height: stageHeight, isPlaying: false }) : null,",
      hasSceneOverlay
        ? "      sceneOverlayActive ? React.createElement('div', { style: { position: 'absolute', inset: 0, width: stageWidth, height: stageHeight, overflow: 'hidden' } }, React.createElement(SceneOverlayComponent, { currentTime: sceneLocalTime, time: sceneLocalTime, duration: SCENE_OVERLAY_DURATION, fps, frame: Math.floor(sceneLocalTime * fps), width: stageWidth, height: stageHeight, isPlaying: false })) : null"
        : "      null",
      "    )",
      "    )",
      "  );",
      "};",
      "",
      "export const Root: React.FC = () => (",
      "  <Composition",
      '    id="SparkReel"',
      "    component={RemotionWrapper}",
      `    durationInFrames={${totalFrames}}`,
      `    fps={${safeFps}}`,
      `    width={${landscape ? 1920 : 1080}}`,
      `    height={${landscape ? 1080 : 1920}}`,
      "  />",
      ");",
      "",
      "registerRoot(Root);",
    ].join("\n");

    fs.writeFileSync(entryFile, entryContent, "utf-8");

    // Bundle
    const bundleLocation = await bundle({ entryPoint: entryFile, outDir: path.join(scratchDir, "bundle") });
    if (wasCancelled) throw new Error("Export cancelled.");
    sendEvent({ type: "progress", phase: "composing", progress: 0 });

    // Select composition
    const composition = await selectComposition({ serveUrl: bundleLocation, id: "SparkReel" });

    // Render MP4
    const outputFile = path.join(scratchDir, "output.mp4");
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputFile,
      imageFormat: "jpeg",
      jpegQuality: 95,
      cancelSignal,
      onProgress: ({ progress, renderedFrames, encodedFrames, stitchStage }) => {
        sendEvent({
          type: "progress",
          phase: stitchStage === "encoding" ? "rendering" : "finalizing",
          progress,
          renderedFrames,
          encodedFrames,
        });
      },
    });

    // Mux narration and effects, then enforce +faststart / yuv420p.
    let finalFile = outputFile;
    try {
      const mixed = await buildAudioTrack(audioTracks, soundEffectsUrl, scratchDir);
      const faststartFile = path.join(scratchDir, "output_faststart.mp4");
      if (mixed) {
        await runCmd(getFfmpegPath(), [
          "-y",
          "-i",
          outputFile,
          "-i",
          mixed,
          "-map",
          "0:v",
          "-map",
          "1:a",
          "-c:v",
          "libx264",
          "-profile:v",
          "high",
          "-level",
          "4.1",
          "-pix_fmt",
          "yuv420p",
          "-preset",
          "veryfast",
          "-crf",
          "20",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-shortest",
          "-movflags",
          "+faststart",
          faststartFile,
        ]);
      } else {
        await runCmd(getFfmpegPath(), [
          "-y",
          "-i",
          outputFile,
          "-c:v",
          "libx264",
          "-profile:v",
          "high",
          "-level",
          "4.1",
          "-pix_fmt",
          "yuv420p",
          "-preset",
          "veryfast",
          "-crf",
          "20",
          "-movflags",
          "+faststart",
          faststartFile,
        ]);
      }
      finalFile = faststartFile;
    } catch (muxErr) {
      if (audioTracks.length || soundEffectsUrl) throw muxErr;
      console.warn("[render-video] faststart warning, returning output.mp4:", muxErr);
    }

    sendEvent({ type: "progress", phase: "finalizing", progress: 0.98 });

    const videoBuffer = fs.readFileSync(finalFile);

    const cleanName = topic
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40)
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "SparkReel";

    sendEvent({ type: "complete", filename: `${cleanName}_${duration}s_60fps.mp4`, bytes: videoBuffer.byteLength });
    sendVideo(new Uint8Array(videoBuffer));
  } catch (err: any) {
    console.error("[render-video] Error:", err);
    const message = String(err?.message || "Render failed. Check server logs.");
    sendEvent({
      type: wasCancelled || req.signal.aborted ? "cancelled" : "error",
      error: /ENOSPC|no space left|not enough space/i.test(message)
        ? `The render drive ran out of temporary space. ${message} Free several GB on the render drive and retry; your storyboard and preview are still available.`
        : message,
    });
  } finally {
    req.signal.removeEventListener("abort", cancelRequest);
    if (renderDir) {
      try { fs.rmSync(renderDir, { recursive: true, force: true }); } catch {}
    }
    if (scratchDir && scratchDir !== renderDir) {
      try { fs.rmSync(scratchDir, { recursive: true, force: true }); } catch {}
    }
  }
}
