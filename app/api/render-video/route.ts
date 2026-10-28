import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const runCmd = promisify(execFile);

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

/** Mix per-beat voice mp3s onto one timeline track at their start offsets. */
async function buildVoiceTrack(
  tracks: { url: string; start: number }[],
  renderDir: string
): Promise<string | null> {
  const placed: { file: string; startMs: number }[] = [];
  for (const t of tracks || []) {
    const file = resolveVoiceFile(t?.url);
    const startMs = Math.max(0, Math.round(Number(t?.start) * 1000));
    if (!file || !Number.isFinite(startMs)) continue;
    placed.push({ file, startMs });
  }
  if (!placed.length) return null;

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
  let audioMap = labels[0];
  if (labels.length > 1) {
    filters.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0[aout]`);
    audioMap = "[aout]";
  }
  const mixed = path.join(renderDir, "voice.m4a");
  await runCmd("ffmpeg", [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    audioMap,
    "-c:a",
    "aac",
    mixed,
  ]);
  return mixed;
}

// Allow up to 5 minutes for long renders
export const maxDuration = 300;
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
  let renderDir: string | null = null;

  try {
    const body = await req.json();
    const {
      sparkCode,
      duration = 15,
      fps = 30,
      topic = "SparkReel",
      background = "#FFF8F0",
      ink = "#3D2E22",
      audioTracks = [],
    } = body;

    if (!sparkCode || typeof sparkCode !== "string" || sparkCode.trim().length < 20) {
      return NextResponse.json({ error: "sparkCode is required and must be non-empty." }, { status: 400 });
    }

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    renderDir = path.join(process.cwd(), ".render-temp", jobId);
    fs.mkdirSync(renderDir, { recursive: true });

    // Write the spark component to its own file so webpack can resolve imports normally
    const componentFile = path.join(renderDir, "SparkComponent.tsx");
    fs.writeFileSync(componentFile, sparkCode, "utf-8");

    // Detect the exported name so we can reference it directly
    const detectedName = detectComponentName(sparkCode);
    const componentRef = detectedName
      ? `SparkModule.default ?? (SparkModule as any).${detectedName} ?? SparkModule`
      : `SparkModule.default ?? (SparkModule as any).GeneratedReel ?? (SparkModule as any).FullReel ?? SparkModule`;

    const totalFrames = Math.max(1, Math.round(Number(duration) * Number(fps)));
    const safeFps = Math.min(60, Math.max(1, Number(fps)));

    // Remotion entry point — wraps SparkComponent in a Remotion Composition
    const entryFile = path.join(renderDir, "index.tsx");
    const entryContent = [
      'import React from "react";',
      'import { registerRoot, Composition, useCurrentFrame, useVideoConfig } from "remotion";',
      'import * as SparkModule from "./SparkComponent";',
      "",
      `const SparkComponent: React.ComponentType<any> = ${componentRef};`,
      "",
      // Mirror the preview iframe's #root stage exactly (spark-preview-document.ts)
      `const STAGE_BG = ${JSON.stringify(String(background))};`,
      `const STAGE_INK = ${JSON.stringify(String(ink))};`,
      "const STAGE_CSS = `#spark-stage > * { width: 100% !important; height: 100% !important; min-height: 100% !important; } * { box-sizing: border-box; }`;",
      "",
      "const RemotionWrapper: React.FC = () => {",
      "  const frame = useCurrentFrame();",
      "  const { fps, durationInFrames, width, height } = useVideoConfig();",
      "  const duration = durationInFrames / fps;",
      "  const currentTime = Math.min(duration, frame / fps);",
      "  return React.createElement(",
      "    'div',",
      "    {",
      "      id: 'spark-stage',",
      "      style: { position: 'absolute', inset: 0, width, height, overflow: 'hidden', background: STAGE_BG, color: STAGE_INK, fontFamily: 'Inter, system-ui, sans-serif' },",
      "    },",
      "    React.createElement('style', null, STAGE_CSS),",
      "    React.createElement(SparkComponent, {",
      "      currentTime, time: currentTime, duration, fps, frame, width, height, isPlaying: false,",
      "    })",
      "  );",
      "};",
      "",
      "export const Root: React.FC = () => (",
      "  <Composition",
      '    id="SparkReel"',
      "    component={RemotionWrapper}",
      `    durationInFrames={${totalFrames}}`,
      `    fps={${safeFps}}`,
      "    width={1080}",
      "    height={1920}",
      "  />",
      ");",
      "",
      "registerRoot(Root);",
    ].join("\n");

    fs.writeFileSync(entryFile, entryContent, "utf-8");

    // Bundle
    const bundleLocation = await bundle({ entryPoint: entryFile });

    // Select composition
    const composition = await selectComposition({ serveUrl: bundleLocation, id: "SparkReel" });

    // Render MP4
    const outputFile = path.join(renderDir, "output.mp4");
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputFile,
      imageFormat: "jpeg",
      jpegQuality: 95,
    });

    // Mux the voiceover track when beat audio was supplied.
    let finalFile = outputFile;
    try {
      const mixed = await buildVoiceTrack(audioTracks, renderDir);
      if (mixed) {
        const muxed = path.join(renderDir, "output_vo.mp4");
        await runCmd("ffmpeg", [
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
          "copy",
          "-c:a",
          "aac",
          "-shortest",
          muxed,
        ]);
        finalFile = muxed;
      }
    } catch (muxErr) {
      console.warn("[render-video] voice mux failed, returning silent video:", muxErr);
    }

    const videoBuffer = fs.readFileSync(finalFile);

    const cleanName = topic
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40)
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "SparkReel";

    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${cleanName}_${duration}s_60fps.mp4"`,
        "Content-Length": String(videoBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[render-video] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Render failed. Check server logs." },
      { status: 500 }
    );
  } finally {
    if (renderDir) {
      try { fs.rmSync(renderDir, { recursive: true, force: true }); } catch {}
    }
  }
}
