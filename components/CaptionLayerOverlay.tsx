"use client";

import React, { useMemo } from "react";
import { CaptionStyleId, CAPTION_STYLES } from "@/lib/captions/styles";

export interface RawWord {
  text?: string;
  word?: string;
  start: number;
  end: number;
}

export interface WordItemClean {
  text: string;
  start: number;
  end: number;
}

export interface CaptionLayerOverlayProps {
  words: RawWord[];
  currentTime: number;
  styleId?: CaptionStyleId;
  sizeScale?: number;
  captionYPercent?: number;
  hideCaptions?: boolean;
}

interface PageData {
  words: WordItemClean[];
  start: number;
  end: number;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const back = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function buildCaptionPages(
  words: WordItemClean[],
  maxWords: number,
  maxChars: number
): PageData[] {
  if (!words || words.length === 0) return [];
  const pages: PageData[] = [];
  let cur: WordItemClean[] = [];

  const flush = () => {
    if (cur.length) {
      pages.push({
        words: cur,
        start: cur[0].start,
        end: cur[cur.length - 1].end,
      });
      cur = [];
    }
  };

  for (const w of words) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (
      cur.length &&
      (cur.length >= maxWords || chars > maxChars || (prev && w.start - prev.end > 0.6))
    ) {
      flush();
    }
    cur.push(w);
    if (/[.?!]$/.test(w.text)) flush();
  }
  flush();

  for (let i = 0; i < pages.length; i++) {
    const n = pages[i + 1];
    pages[i].end = n && n.start - pages[i].end < 0.4 ? n.start : pages[i].end + 0.12;
  }
  return pages;
}

export default function CaptionLayerOverlay({
  words,
  currentTime,
  styleId = "hormozi",
  sizeScale = 1.0,
  captionYPercent = 82,
  hideCaptions = false,
}: CaptionLayerOverlayProps) {
  const cfg = CAPTION_STYLES[styleId] || CAPTION_STYLES.hormozi;

  const normalizedWords: WordItemClean[] = useMemo(() => {
    return (words || [])
      .map((w: any) => ({
        text: (w.text || w.word || "").trim(),
        start: typeof w.start === "number" ? w.start : 0,
        end: typeof w.end === "number" ? w.end : (w.start || 0) + 0.3,
      }))
      .filter((w) => w.text.length > 0)
      .sort((a, b) => a.start - b.start);
  }, [words]);

  const pages = useMemo(() => {
    return buildCaptionPages(normalizedWords, cfg.maxWords, cfg.maxChars);
  }, [normalizedWords, cfg.maxWords, cfg.maxChars]);

  if (hideCaptions || pages.length === 0) return null;

  const pageIndex = pages.findIndex(
    (p) => currentTime >= p.start && currentTime < p.end
  );
  if (pageIndex < 0) return null;

  const page = pages[pageIndex];
  const cleanWord = (s: string) => (cfg.stripPunctuation ? s.replace(/[.,!?;:]+$/g, "") : s);

  // Sizing relative to standard 9:16 mobile container
  // Base width 360px in preview card, 1080px in full HD
  const fsEm = Math.max(0.65, Math.min(2.4, cfg.sizeRatio * 18 * sizeScale));

  const activeIdx = page.words.reduce(
    (a, w, i) => (currentTime >= w.start ? i : a),
    -1
  );

  const pageLocalTime = currentTime - page.start;
  let ex = 1;
  let ey = 0;

  if (styleId === "hormozi") {
    ex = 0.88 + 0.12 * clamp(back(clamp(pageLocalTime / 0.18, 0, 1)), 0, 1.05);
  } else if (styleId === "pill") {
    ey = fsEm * 6 * (1 - clamp(back(clamp(pageLocalTime / 0.2, 0, 1)), 0, 1));
  } else if (styleId === "trailer") {
    ex = 1 + 0.06 * clamp(pageLocalTime / Math.max(0.1, page.end - page.start), 0, 1);
  }

  const fade =
    cfg.fadeOutFrames > 0
      ? clamp((page.end - currentTime) / (cfg.fadeOutFrames * 0.033), 0, 1)
      : 1;

  let emphIdx = -1;
  if (styleId === "pinterest") {
    let best = 3;
    page.words.forEach((w, i) => {
      const l = w.text.replace(/[^a-zA-Z']/g, "").length;
      if (l > best) {
        best = l;
        emphIdx = i;
      }
    });
  }

  const visibleWords =
    styleId === "beast"
      ? page.words.filter((w) => currentTime >= w.start)
      : page.words;

  return (
    <div
      className="absolute inset-x-0 pointer-events-none select-none z-30 flex items-center justify-center transition-all duration-75"
      style={{
        top: `${captionYPercent}%`,
        transform: `translateY(-50%) translateY(${ey}px) scale(${ex})`,
        opacity: fade,
      }}
    >
      <div
        className="w-[90%] max-w-[92%] flex flex-wrap justify-center items-center text-center select-none px-2.5 py-1 rounded-2xl"
        style={{
          fontFamily: cfg.loadFont(),
          fontWeight: cfg.weight,
          fontSize: `${fsEm}rem`,
          lineHeight: cfg.lineHeight,
          letterSpacing: `${cfg.letterSpacing}em`,
          textTransform: cfg.uppercase ? "uppercase" : "none",
          columnGap: "0.28em",
          rowGap: "0.14em",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.98)) drop-shadow(0 6px 18px rgba(0,0,0,0.9))",
        }}
      >
        {visibleWords.map((w, i) => {
          const origIdx = page.words.indexOf(w);
          const isA = origIdx === activeIdx;
          const localTime = currentTime - w.start;
          const acc = cfg.colors.active[(pageIndex + origIdx) % cfg.colors.active.length];
          const strokePx = Math.max(1.5, Math.round(cfg.strokeRatio * fsEm * 18));
          const outlineStyle: React.CSSProperties = {
            WebkitTextStroke: `${strokePx}px ${cfg.colors.stroke || "#000000"}`,
            paintOrder: "stroke fill",
          };

          let wordStyle: React.CSSProperties = {
            display: "inline-block",
            transition: "transform 0.08s ease, color 0.08s ease, opacity 0.08s ease",
            WebkitTextStroke: "1px rgba(0,0,0,0.85)",
            paintOrder: "stroke fill",
          };

          if (styleId === "hormozi") {
            const p = clamp(back(clamp(localTime / 0.18, 0, 1)), 0, 1.3);
            wordStyle = {
              ...wordStyle,
              ...outlineStyle,
              color: isA ? acc : "#FFFFFF",
              transform: `scale(${isA ? 1 + 0.14 * p : 1})`,
              textShadow: "0 3px 0 #000, 0 4px 14px rgba(0,0,0,0.95)",
            };
          } else if (styleId === "beast") {
            const p = back(clamp(localTime / 0.3, 0, 1));
            const tilt = (pageIndex % 2 === 0 ? 1 : -1) * 3;
            wordStyle = {
              ...wordStyle,
              ...outlineStyle,
              color: acc,
              transform: `scale(${0.4 + 0.6 * p}) rotate(${tilt}deg)`,
              textShadow: "0 4px 0 #000000, 0 8px 16px rgba(0,0,0,0.95)",
            };
          } else if (styleId === "pinterest") {
            const o = clamp((localTime + 0.07) / 0.27, 0, 1);
            wordStyle = {
              ...wordStyle,
              color: "#FFFFFF",
              fontStyle: origIdx === emphIdx ? "italic" : "normal",
              opacity: o,
              textShadow: "0 2px 0 #000, 0 3px 12px rgba(0,0,0,0.9)",
            };
          } else if (styleId === "pill") {
            const p = isA ? clamp(back(clamp(localTime / 0.15, 0, 1)), 0, 1.2) : 0;
            wordStyle = {
              ...wordStyle,
              color: "#FFFFFF",
              backgroundColor: isA ? acc : "rgba(0,0,0,0.65)",
              padding: "0.1em 0.36em",
              borderRadius: "0.32em",
              transform: `scale(${isA ? 0.94 + 0.08 * p : 1})`,
              boxShadow: isA ? "0 4px 14px rgba(255,74,28,0.5)" : "0 2px 8px rgba(0,0,0,0.8)",
              textShadow: "0 2px 0 #000, 0 2px 8px rgba(0,0,0,0.9)",
            };
          } else if (styleId === "neon") {
            const fl = isA ? 0.94 + 0.06 * Math.sin(currentTime * 50) : 1;
            wordStyle = {
              ...wordStyle,
              color: isA ? "#FFFFFF" : "rgba(255,255,255,0.75)",
              opacity: fl,
              textShadow: isA
                ? "0 0 10px #00F0FF, 0 0 25px #00F0FF, 0 2px 4px #000"
                : "0 2px 0 #000, 0 2px 8px rgba(0,0,0,0.9)",
            };
          } else if (styleId === "cinzel") {
            const o = clamp((localTime + 0.07) / 0.53, 0, 1);
            wordStyle = {
              ...wordStyle,
              color: isA ? acc : "#F3E9D2",
              opacity: o,
              transform: `scale(${1.08 - 0.08 * o})`,
              textShadow: "0 2px 0 #000, 0 3px 14px rgba(0,0,0,0.9)",
            };
          } else if (styleId === "editorial") {
            const o = clamp((localTime + 0.07) / 0.33, 0, 1);
            wordStyle = {
              ...wordStyle,
              color: "#FFFFFF",
              fontStyle: "italic",
              opacity: o,
              textShadow: "0 2px 0 #000, 0 3px 12px rgba(0,0,0,0.9)",
            };
          } else if (styleId === "trailer") {
            const sc = 1.14 - 0.14 * clamp(localTime / 0.2, 0, 1);
            wordStyle = {
              ...wordStyle,
              ...outlineStyle,
              color: isA ? acc : "#F4F4F4",
              opacity: localTime >= 0 ? 1 : 0,
              transform: `scale(${sc})`,
              textShadow: "0 3px 0 #000, 0 4px 14px rgba(0,0,0,0.95)",
            };
          } else if (styleId === "clean") {
            wordStyle = {
              ...wordStyle,
              color: "#FFFFFF",
              opacity: isA ? 1 : 0.75,
              textShadow: "0 2px 0 #000, 0 2px 10px rgba(0,0,0,0.9)",
            };
          } else {
            // whisper
            const o = clamp((localTime + 0.07) / 0.4, 0, 1);
            wordStyle = {
              ...wordStyle,
              color: "#FFFFFF",
              opacity: o,
              textShadow: "0 2px 0 #000, 0 2px 12px rgba(0,0,0,0.9)",
            };
          }

          return (
            <span key={`${w.text}-${origIdx}`} style={wordStyle}>
              {cleanWord(w.text)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
