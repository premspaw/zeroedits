// captions/CaptionLayer.tsx
// Drop <CaptionLayer /> on top of your video inside any Remotion composition.
// Works in Remotion Studio, <Player> (live preview in your app) and renders.

import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { buildPages, Word } from './pages';
import { CAPTION_STYLES, CaptionStyleId } from './styles';

export interface CaptionLayerProps {
  words: Word[];
  styleId?: CaptionStyleId;
  yRatio?: number; // override vertical position (0 = top, 1 = bottom)
  sizeScale?: number; // 1 = default, 1.2 = 20% bigger
  accentColors?: string[]; // override the active-word colour cycle
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CaptionLayer: React.FC<CaptionLayerProps> = ({
  words,
  styleId = 'hormozi',
  yRatio,
  sizeScale = 1,
  accentColors,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cfg = CAPTION_STYLES[styleId];

  const fontFamily = useMemo(() => cfg.loadFont(), [cfg]);
  const pages = useMemo(() => buildPages(words, cfg), [words, cfg]);

  const t = frame / fps;
  const pageIndex = pages.findIndex((p) => t >= p.start && t < p.end);
  if (pageIndex < 0) return null;

  const page = pages[pageIndex];
  const accents = accentColors?.length ? accentColors : cfg.colors.active;

  // ---- sizing (auto-shrink if a single word would overflow) ----
  const maxWidth = width * 0.88;
  const clean = (s: string) => (cfg.stripPunctuation ? s.replace(/[.,!?;:]+$/g, '') : s);
  const longest = Math.max(...page.words.map((w) => clean(w.text).length));
  const baseSize = Math.min(width, height) * cfg.sizeRatio * sizeScale;
  const fs = Math.min(baseSize, maxWidth / (longest * (cfg.charWidthEm + cfg.letterSpacing)));

  // ---- page-level timing ----
  const pageStartF = Math.round(page.start * fps);
  const pageEndF = Math.round(page.end * fps);
  const pageIn = spring({
    frame: frame - pageStartF,
    fps,
    config: { damping: 16, stiffness: 220, mass: 0.6 },
  });
  const fade =
    cfg.fadeOutFrames > 0
      ? interpolate(frame, [pageEndF - cfg.fadeOutFrames, pageEndF], [1, 0], clamp)
      : 1;
  const push = cfg.push ? interpolate(frame, [pageStartF, pageEndF], [1, 1.06], clamp) : 1;
  const entryScale =
    (cfg.entry === 'scale' ? interpolate(pageIn, [0, 1], [0.88, 1]) : 1) * push;
  const entryY = cfg.entry === 'rise' ? interpolate(pageIn, [0, 1], [fs * 0.3, 0]) : 0;

  // ---- active word ----
  const activeIdx = page.words.reduce((a, w, i) => (t >= w.start ? i : a), -1);

  // Pinterest: the longest word on the page gets the permanent italic emphasis
  let emphasisIdx = -1;
  if (styleId === 'pinterest') {
    let best = 3;
    page.words.forEach((w, i) => {
      const len = w.text.replace(/[^a-zA-Z']/g, '').length;
      if (len > best) {
        best = len;
        emphasisIdx = i;
      }
    });
  }

  const wordStyle = (w: Word, i: number): React.CSSProperties => {
    const local = frame - Math.round(w.start * fps); // frames since this word started
    const isActive = i === activeIdx;
    const accent = accents[(pageIndex + i) % accents.length];
    const stroke = cfg.strokeRatio * fs;

    const outlined: React.CSSProperties =
      stroke > 0
        ? { WebkitTextStroke: `${stroke}px ${cfg.colors.stroke}`, paintOrder: 'stroke fill' }
        : {};

    switch (styleId) {
      case 'hormozi': {
        const pop = spring({ frame: local, fps, config: { damping: 12, stiffness: 260, mass: 0.5 } });
        return {
          ...outlined,
          display: 'inline-block',
          color: isActive ? accent : cfg.colors.text,
          transform: `scale(${isActive ? 1 + 0.12 * pop : 1})`,
          textShadow: `0 ${fs * 0.04}px ${fs * 0.08}px rgba(0,0,0,0.55)`,
        };
      }

      case 'beast': {
        const pop = spring({ frame: local, fps, config: { damping: 8, stiffness: 200, mass: 0.6 } });
        const tilt = (pageIndex % 2 === 0 ? 1 : -1) * 3;
        return {
          ...outlined,
          display: 'inline-block',
          color: accent,
          transform: `scale(${interpolate(pop, [0, 1], [0.35, 1])}) rotate(${tilt}deg)`,
          textShadow: `0 ${fs * 0.06}px 0 #000`,
        };
      }

      case 'pinterest': {
        const o = interpolate(local, [-2, 6], [0, 1], clamp);
        const blur = interpolate(local, [-2, 10], [fs * 0.12, 0], clamp);
        const y = interpolate(local, [-2, 10], [fs * 0.18, 0], clamp);
        return {
          display: 'inline-block',
          color: cfg.colors.text,
          fontStyle: i === emphasisIdx ? 'italic' : 'normal',
          opacity: o,
          filter: `blur(${blur}px)`,
          transform: `translateY(${y}px)`,
          textShadow: `0 ${fs * 0.02}px ${fs * 0.12}px rgba(0,0,0,0.35)`,
        };
      }

      case 'pill': {
        const pop = isActive
          ? spring({ frame: local, fps, config: { damping: 14, stiffness: 300, mass: 0.5 } })
          : 0;
        return {
          display: 'inline-block',
          color: cfg.colors.text,
          background: isActive ? accent : 'transparent',
          padding: '0.04em 0.28em',
          borderRadius: '0.28em',
          transform: `scale(${isActive ? 0.92 + 0.08 * pop : 1})`,
          textShadow: isActive ? 'none' : `0 ${fs * 0.03}px ${fs * 0.1}px rgba(0,0,0,0.6)`,
        };
      }

      case 'neon': {
        const [c1, c2] = cfg.colors.glow ?? ['#00F0FF', '#8A5CFF'];
        const flicker = isActive ? 0.92 + 0.08 * Math.sin(frame * 1.7) : 1;
        return {
          display: 'inline-block',
          color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
          opacity: flicker,
          textShadow: isActive
            ? `0 0 ${fs * 0.08}px ${c1}, 0 0 ${fs * 0.25}px ${c1}, 0 0 ${fs * 0.5}px ${c2}`
            : `0 ${fs * 0.03}px ${fs * 0.1}px rgba(0,0,0,0.6)`,
        };
      }

      case 'cinzel': {
        const o = interpolate(local, [-2, 14], [0, 1], clamp);
        const s = interpolate(local, [-2, 14], [1.08, 1], clamp);
        return {
          display: 'inline-block',
          color: isActive ? accent : cfg.colors.text,
          opacity: o,
          transform: `scale(${s})`,
          textShadow: `0 ${fs * 0.03}px ${fs * 0.15}px rgba(0,0,0,0.5)`,
        };
      }

      case 'editorial': {
        const p = spring({ frame: local, fps, config: { damping: 20, stiffness: 120, mass: 0.8 } });
        return {
          display: 'inline-block',
          color: cfg.colors.text,
          fontStyle: 'italic',
          opacity: interpolate(local, [-2, 8], [0, 1], clamp),
          transform: `translateY(${interpolate(p, [0, 1], [fs * 0.35, 0])}px)`,
          textShadow: `0 ${fs * 0.02}px ${fs * 0.12}px rgba(0,0,0,0.35)`,
        };
      }

      case 'trailer': {
        const s = interpolate(local, [0, 6], [1.14, 1], clamp);
        return {
          display: 'inline-block',
          color: isActive ? accent : cfg.colors.text,
          opacity: local >= 0 ? 1 : 0,
          transform: `scale(${s})`,
          textShadow: `0 ${fs * 0.03}px ${fs * 0.12}px rgba(0,0,0,0.6)`,
        };
      }

      case 'clean': {
        return {
          display: 'inline-block',
          color: cfg.colors.text,
          opacity: isActive ? 1 : 0.55,
          textShadow: `0 ${fs * 0.03}px ${fs * 0.2}px rgba(0,0,0,0.5)`,
        };
      }

      case 'whisper': {
        return {
          display: 'inline-block',
          color: cfg.colors.text,
          opacity: interpolate(local, [-2, 10], [0, 1], clamp),
          textShadow: `0 ${fs * 0.03}px ${fs * 0.2}px rgba(0,0,0,0.5)`,
        };
      }
    }
  };

  // Beast shows the page word only once it has started; others show the whole page immediately
  const visibleWords = styleId === 'beast' ? page.words.filter((w) => t >= w.start) : page.words;

  return (
    <AbsoluteFill style={{ opacity: fade, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: height * (yRatio ?? cfg.yRatio),
          width: maxWidth,
          transform: `translate(-50%, -50%) translateY(${entryY}px) scale(${entryScale})`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          columnGap: '0.22em',
          rowGap: '0.08em',
          textAlign: 'center',
          fontFamily,
          fontWeight: cfg.weight,
          fontSize: fs,
          lineHeight: cfg.lineHeight,
          letterSpacing: `${cfg.letterSpacing}em`,
          textTransform: cfg.uppercase ? 'uppercase' : 'none',
        }}
      >
        {visibleWords.map((w) => {
          const i = page.words.indexOf(w);
          return (
            <span key={`${w.start}-${i}`} style={wordStyle(w, i)}>
              {clean(w.text)}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
