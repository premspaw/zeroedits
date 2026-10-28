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

  // Collect all words with adjusted timestamps relative to clean duration
  const words = transcript.flatMap((s) => s.words);

  return `import React from "react";
import { AbsoluteFill, Video, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const TalkingHeadReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  const words = ${JSON.stringify(words, null, 2)};
  const visualOverlays = ${JSON.stringify(editPlan.visualPlan, null, 2)};

  // Active word detection
  const activeWordIndex = words.findIndex(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  // Active 4-word chunk for current window
  const activeWord = words[activeWordIndex] || words[0];
  const chunkStart = Math.max(0, activeWordIndex - 2);
  const currentChunk = words.slice(chunkStart, chunkStart + 5);

  // Top progress bar calculation
  const progressPercent = Math.min(100, (currentTime / ${durationSec}) * 100);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "${template.fontFamily}" }}>
      {/* 1. Cleaned Talking Head Video Base */}
      <Video
        src="${cleanVideoUrl}"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* 2. Top Sleek Progress Bar */}
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

      {/* 3. Pop-up Graphic Badges & Animated Image Overlays */}
      {visualOverlays.map((item: any) => {
        if (item.type !== "icon_badge" && item.type !== "image_overlay") return null;
        const isVisible = currentTime >= item.timestamp && currentTime <= item.timestamp + item.duration;
        if (!isVisible) return null;

        const timeIn = currentTime - item.timestamp;
        const scale = Math.min(1.0, Math.max(0.1, timeIn * 5));

        return (
          <div
            key={item.id}
            style={{
              position: "absolute",
              top: 140,
              left: "50%",
              transform: \`translateX(-50%) scale(\${scale})\`,
              backgroundColor: "${template.cardBg}",
              border: "3px solid ${template.primaryColor}",
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
              borderRadius: 20,
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              zIndex: 50,
            }}
          >
            <span style={{ fontSize: 24 }}>{item.type === "image_overlay" ? "✨" : "⚡"}</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: "${template.highlightColor}",
              }}
            >
              {item.content}
            </span>
          </div>
        );
      })}

      {/* 4. Kinetic Subtitles Container (Centered in lower third) */}
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
          zIndex: 40,
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

      {/* 5. Paper Studio Pipeline B Watermark Stamp */}
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
