/**
 * Meta Muse — Pipeline B Tool: Motion Generator
 * Generates frame-accurate Remotion / React motion overlay components for talking-head reels.
 */

import type { EditPlan, TranscriptSegment } from "../types.ts";
import { getPipelineBTemplate } from "../templates/registry.ts";

export function generateTalkingHeadMotionCode(params: {
  editPlan: EditPlan;
  transcript: TranscriptSegment[];
  cleanVideoUrl: string;
  templateId?: string;
}): string {
  const { editPlan, transcript, cleanVideoUrl, templateId } = params;
  const template = getPipelineBTemplate(templateId);

  const durationSec = editPlan.cleanDuration;
  const totalFrames = Math.round(durationSec * 30);

  // Collect words relative to clean video duration
  const words = editPlan.editedTranscript && editPlan.editedTranscript.length > 0
    ? editPlan.editedTranscript.flatMap((s) => s.words.map((w) => ({
        word: w.word,
        start: w.editedStart,
        end: w.editedEnd,
      })))
    : transcript.flatMap((s) => s.words);

  const visualSegments = editPlan.visualSegments || [];
  const visualOverlays = editPlan.visualPlan || [];

  return `import React from "react";
import { AbsoluteFill, Video, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const TalkingHeadReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  const words = ${JSON.stringify(words, null, 2)};
  const visualSegments = ${JSON.stringify(visualSegments, null, 2)};
  const visualOverlays = ${JSON.stringify(visualOverlays, null, 2)};

  // Active visual segment detection for camera framing & layout
  const activeSegment = visualSegments.find(
    (seg: any) => currentTime >= seg.start && currentTime <= seg.end
  );
  const layoutType = activeSegment?.layoutType || "fullscreen_speaker";
  const currentCameraZoom = activeSegment?.cameraZoom || 1.0;

  // Active word detection
  const activeWordIndex = words.findIndex(
    (w) => currentTime >= w.start && currentTime <= w.end
  );
  const activeWord = words[activeWordIndex] || words[0];
  const chunkStart = Math.max(0, activeWordIndex - 2);
  const currentChunk = words.slice(chunkStart, chunkStart + 5);

  // Top progress bar calculation
  const progressPercent = Math.min(100, (currentTime / ${durationSec}) * 100);

  // Base video styling based on activeSegment layoutType
  let videoContainerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: activeSegment?.layerArrangement === "background" ? 10 : 20,
    overflow: "hidden",
    transition: "all 0.3s ease-in-out",
  };

  if (layoutType === "picture_in_picture") {
    videoContainerStyle = {
      position: "absolute",
      right: 36,
      bottom: 220,
      width: 320,
      height: 480,
      borderRadius: 24,
      border: "4px solid ${template.primaryColor}",
      boxShadow: "0 20px 48px rgba(0,0,0,0.75)",
      overflow: "hidden",
      zIndex: 50,
      transition: "all 0.3s ease-out",
    };
  } else if (layoutType === "split_screen") {
    videoContainerStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      width: "50%",
      height: "100%",
      zIndex: 20,
      overflow: "hidden",
      borderRight: "3px solid ${template.primaryColor}",
    };
  } else if (layoutType === "stacked_layout") {
    videoContainerStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "50%",
      zIndex: 20,
      overflow: "hidden",
      borderBottom: "3px solid ${template.primaryColor}",
    };
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0B", fontFamily: "${template.fontFamily}" }}>
      {/* 1. Primary Clean Talking Head Video */}
      <div style={videoContainerStyle}>
        <Video
          src="${cleanVideoUrl}"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: \`scale(\${currentCameraZoom})\`,
            transition: "transform 0.25s ease-out",
          }}
        />
      </div>

      {/* 2. Layout Supporting Panes (Split Screen / Stacked Layout / Picture-in-Picture) */}
      {layoutType === "split_screen" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "50%",
            height: "100%",
            backgroundColor: "${template.cardBg}",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.15em", color: "${template.textColor}", opacity: 0.7 }}>
            {activeSegment?.technique?.replace(/_/g, " ")}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "${template.highlightColor}", textAlign: "center", marginTop: 8 }}>
            {activeSegment?.headlineText || activeSegment?.spokenReference?.slice(0, 30)}
          </div>
        </div>
      )}

      {layoutType === "stacked_layout" && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "50%",
            backgroundColor: "${template.cardBg}",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.15em", color: "${template.textColor}", opacity: 0.7 }}>
            {activeSegment?.technique?.replace(/_/g, " ")}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "${template.highlightColor}", textAlign: "center", marginTop: 12 }}>
            {activeSegment?.headlineText || activeSegment?.spokenReference?.slice(0, 40)}
          </div>
        </div>
      )}

      {/* 3. Authoritative Visual Segments Compositing */}
      {visualSegments.map((seg: any) => {
        const isVisible = currentTime >= seg.start && currentTime <= seg.end;
        if (!isVisible) return null;

        const timeIn = currentTime - seg.start;
        const scale = Math.min(1.0, Math.max(0.1, timeIn * 6));
        const zIdx = seg.layerArrangement === "foreground" ? 60 : (seg.layerArrangement === "overlay" ? 40 : 20);

        // Technique A: Animated Diagram & UI Mockup
        if (seg.technique === "animated_diagram" || seg.technique === "ui_mockup") {
          return (
            <div
              key={seg.id}
              style={{
                position: "absolute",
                top: layoutType === "picture_in_picture" ? 180 : 120,
                left: "50%",
                transform: \`translateX(-50%) scale(\${scale})\`,
                width: 440,
                backgroundColor: "${template.cardBg}",
                border: "3px solid ${template.primaryColor}",
                borderRadius: 24,
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                zIndex: zIdx,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#EF4444" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#10B981" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "${template.textColor}", opacity: 0.6 }}>
                  {seg.technique === "animated_diagram" ? "Architecture Diagram" : "UI Demo"}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "${template.highlightColor}" }}>
                {seg.headlineText || "Interactive Flow"}
              </div>
              <div style={{ fontSize: 13, color: "${template.textColor}", opacity: 0.85, lineHeight: 1.4 }}>
                {seg.motionIntent}
              </div>
            </div>
          );
        }

        // Technique B: B-roll Clip Takeover
        if (seg.technique === "broll_clip" || seg.layoutType === "broll_takeover") {
          return (
            <div
              key={seg.id}
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(10, 10, 15, 0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 48,
                zIndex: zIdx,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "${template.highlightColor}" }}>
                B-Roll Overlay
              </div>
              <div style={{ fontSize: 40, fontWeight: 900, textAlign: "center", color: "${template.textColor}", marginTop: 16 }}>
                {seg.headlineText || seg.spokenReference}
              </div>
              <div style={{ fontSize: 16, color: "${template.textColor}", opacity: 0.7, marginTop: 12, textAlign: "center", maxWidth: 460 }}>
                {seg.motionIntent}
              </div>
            </div>
          );
        }

        // Technique C: Kinetic Word Emphasis / Badge
        if (seg.technique === "kinetic_typography" || seg.technique === "camera_punch_in") {
          return (
            <div
              key={seg.id}
              style={{
                position: "absolute",
                top: 130,
                left: "50%",
                transform: \`translateX(-50%) scale(\${scale})\`,
                backgroundColor: "${template.cardBg}",
                border: "3px solid ${template.primaryColor}",
                boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
                borderRadius: 20,
                padding: "10px 28px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                zIndex: zIdx,
              }}
            >
              <span style={{ fontSize: 24 }}>⚡</span>
              <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.08em", color: "${template.highlightColor}" }}>
                {seg.headlineText || seg.spokenReference?.slice(0, 24)?.toUpperCase()}
              </span>
            </div>
          );
        }

        // Technique D: Brand Lower Third
        if (seg.technique === "brand_lower_third") {
          return (
            <div
              key={seg.id}
              style={{
                position: "absolute",
                bottom: 120,
                left: 36,
                right: 36,
                backgroundColor: "${template.cardBg}",
                borderLeft: "6px solid ${template.highlightColor}",
                padding: "12px 20px",
                borderRadius: "0 16px 16px 0",
                boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
                zIndex: zIdx,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, color: "${template.highlightColor}" }}>
                {seg.headlineText || "Meta Muse Directorial Cut"}
              </div>
              <div style={{ fontSize: 13, color: "${template.textColor}", opacity: 0.8 }}>
                {seg.motionIntent}
              </div>
            </div>
          );
        }

        return null;
      })}

      {/* 4. Top Sleek Progress Bar */}
      ${
        template.enableProgressBar
          ? `<div
        style={{
          position: "absolute",
          top: 24,
          left: 32,
          right: 32,
          height: 6,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderRadius: 999,
          overflow: "hidden",
          zIndex: 40,
        }}
      >
        <div
          style={{
            height: "100%",
            width: \`\${progressPercent}%\`,
            backgroundColor: "${template.highlightColor}",
            borderRadius: 999,
          }}
        />
      </div>`
          : ""
      }

      {/* 5. Synchronized Kinetic Captions (Lower Third) */}
      <div
        style={{
          position: "absolute",
          bottom: 220,
          left: 40,
          right: 40,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px 14px",
          textAlign: "center",
          zIndex: 45,
        }}
      >
        {currentChunk.map((w: any, idx: number) => {
          const isCurrent = currentTime >= w.start && currentTime <= w.end;
          return (
            <span
              key={idx}
              style={{
                fontSize: isCurrent ? 52 : 44,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
                color: isCurrent ? "${template.highlightColor}" : "${template.textColor}",
                backgroundColor: isCurrent ? "rgba(0, 0, 0, 0.75)" : "transparent",
                padding: isCurrent ? "4px 14px" : "0 4px",
                borderRadius: 12,
                transform: isCurrent ? "scale(1.08)" : "scale(1)",
                transition: "all 0.08s ease-out",
                textShadow: "0 4px 12px rgba(0,0,0,0.8)",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>

      {/* 6. Paper Studio Watermark */}
      ${
        template.enablePaperBadge
          ? `<div
        style={{
          position: "absolute",
          bottom: 40,
          right: 32,
          padding: "6px 14px",
          borderRadius: 999,
          backgroundColor: "${template.cardBg}",
          border: "2px solid ${template.primaryColor}",
          color: "${template.textColor}",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.85,
          zIndex: 50,
        }}
      >
        ${template.name} • Auto Edit
      </div>`
          : ""
      }
    </AbsoluteFill>
  );
};
`;
}
