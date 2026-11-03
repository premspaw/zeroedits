/**
 * Clay Reel Director Engine — TypeScript Implementation
 * Direct port of `clay-reel-director` skill:
 * - Palette generator (derived from hero hex + mood)
 * - Master prompts for Veo / Kling / Seedance
 * - Storyboard schema validator & builder
 */

export type ClayMood = "warm" | "cool" | "night" | "fresh" | "pastel";

export interface ClayPaletteTokens {
  mood: ClayMood;
  sky_top: string;
  sky_bottom: string;
  sun: string;
  hills_far: string;
  hills_mid: string;
  hills_near: string;
  floor_light: string;
  floor_dark: string;
  hero_light: string;
  hero_mid: string;
  hero_dark: string;
  secondary_light: string;
  secondary_dark: string;
  block_light: string;
  block_dark: string;
  text: string;
  gold: string;
  accent: string;
  accent_stroke: string;
  highlight_word: string;
  stroke: string;
  shadow: string;
  checks: {
    text_vs_stroke: number;
    text_vs_accent: number;
    hero_vs_floor: number;
    hero_vs_sky: number;
  };
  warnings: string[];
}

const CREAM = "#fff6e8";
const GOLD = "#ffcf63";
const CORAL = "#e8644a";
const HILITE = "#ff7a5c";

function hexToRgb(h: string): [number, number, number] {
  const clean = h.replace(/^#/, "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHls(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, l, s];
}

function hlsToRgb(h: number, l: number, s: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  l = Math.max(0, Math.min(1, l));
  s = Math.max(0, Math.min(1, s));

  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hue2rgb = (t: number) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return [hue2rgb(h + 1 / 3) * 255, hue2rgb(h) * 255, hue2rgb(h - 1 / 3) * 255];
}

function hls(h: number, l: number, s: number): string {
  return rgbToHex(hlsToRgb(h, l, s));
}

function lum(hexc: string): number {
  const [r, g, b] = hexToRgb(hexc);
  const f = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const [la, lb] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

function lerpHue(a: number, b: number, t: number): number {
  let d = ((b - a + 0.5) % 1.0) - 0.5;
  return ((a + d * t) % 1.0 + 1.0) % 1.0;
}

const ENV: Record<ClayMood, [number, number, number, number]> = {
  warm: [30 / 360, 0.88, 0.76, 0.72],
  cool: [205 / 360, 0.88, 0.78, 0.55],
  night: [240 / 360, 0.2, 0.3, 0.38],
  fresh: [95 / 360, 0.88, 0.78, 0.5],
  pastel: [330 / 360, 0.92, 0.86, 0.6],
};

function darkenUntil(color: string, against: string, ratio: number, step = 0.02): string {
  let [h, l, s] = rgbToHls(...hexToRgb(color));
  while (contrast(color, against) < ratio && l > 0.05) {
    l -= step;
    color = hls(h, l, s);
  }
  return color;
}

export function deriveClayPalette(
  heroHex: string,
  mood: ClayMood = "warm",
  accent?: string
): ClayPaletteTokens {
  const [h, l, s] = rgbToHls(...hexToRgb(heroHex));
  const [baseH, tl, bl, es] = ENV[mood];
  const eh = lerpHue(baseH, h, 0.22);
  const night = mood === "night";
  const wt = mood === "cool" || mood === "night" ? 0.0 : 0.3;

  const p: any = {
    mood,
    sky_top: hls(eh, tl, es),
    sky_bottom: hls(lerpHue(eh, 22 / 360, wt), bl, es + 0.05),
    sun: hls(40 / 360, !night ? 0.93 : 0.85, 0.9),
    hills_far: hls(eh, !night ? 0.8 : 0.26, 0.3),
    hills_mid: hls(eh, !night ? 0.7 : 0.22, 0.34),
    hills_near: hls(eh, !night ? 0.62 : 0.18, 0.36),
    floor_light: hls(lerpHue(eh, 32 / 360, wt * 1.3), !night ? 0.8 : 0.34, 0.5),
    floor_dark: hls(lerpHue(eh, 30 / 360, wt * 1.3), !night ? 0.67 : 0.26, 0.48),
    hero_light: hls(h, Math.min(0.8, l + 0.16), s),
    hero_mid: heroHex,
    hero_dark: hls(h, Math.max(0.24, l - 0.24), Math.min(1, s * 1.05)),
    secondary_light: hls(lerpHue(h, 28 / 360, 0.5), 0.66, 0.36),
    secondary_dark: hls(lerpHue(h, 28 / 360, 0.5), 0.45, 0.34),
    block_light: hls(h, 0.86, 0.3),
    block_dark: hls(h, 0.66, 0.28),
    text: CREAM,
    gold: GOLD,
  };

  // Signature accent (coral or teal)
  let acc =
    accent ||
    (Math.min(Math.abs(h - 10 / 360), 1 - Math.abs(h - 10 / 360)) > 0.05 ? CORAL : "#2fa8a0");
  acc = darkenUntil(acc, CREAM, 3.0);
  const [ah, al, as_] = rgbToHls(...hexToRgb(acc));
  p.accent = acc;
  p.accent_stroke = hls(ah, Math.max(0.16, al - 0.26), as_);
  p.highlight_word = acc === CORAL ? HILITE : hls(ah, Math.min(0.7, al + 0.12), as_);

  // Stroke outline
  const stroke = darkenUntil(hls(h, !night ? 0.17 : 0.1, 0.45), CREAM, 9.0);
  p.stroke = stroke;
  p.shadow = hls(h, 0.26, 0.45);

  p.checks = {
    text_vs_stroke: Math.round(contrast(CREAM, stroke) * 10) / 10,
    text_vs_accent: Math.round(contrast(CREAM, acc) * 10) / 10,
    hero_vs_floor: Math.round(contrast(p.hero_mid, p.floor_light) * 100) / 100,
    hero_vs_sky: Math.round(contrast(p.hero_mid, p.sky_bottom) * 100) / 100,
  };

  const warnings: string[] = [];
  if (p.checks.hero_vs_floor < 1.25)
    warnings.push("hero too close to floor: lighten/darken hero or change mood");
  if (p.checks.hero_vs_sky < 1.25)
    warnings.push("hero too close to sky: pick another mood");
  p.warnings = warnings;

  return p as ClayPaletteTokens;
}

/**
 * Generate Master Video Prompt for Veo / Kling / Seedance
 * Formula from `character-recipes.md`
 */
export function generateClayMasterPrompt(params: {
  hero: string;
  action: string;
  world: string;
  durationSec?: number;
  palette?: ClayPaletteTokens;
}): string {
  const { hero, action, world, durationSec = 5, palette } = params;
  const p = palette || deriveClayPalette("#f0a22c", "warm");

  return `Handmade claymation, 9:16 vertical aspect ratio, ${durationSec} s, slow camera push-in.
Subject: a smiling ${hero} character with big glossy bead eyes, coral cheeks, and simple smile, ${action}.
World: ${world}, soft studio golden light, shallow depth of field.
Material: plasticine with visible fingerprints, subtle grain, soft rounded edges.
Palette: sky ${p.sky_top} to ${p.sky_bottom}, floor ${p.floor_light}, hero ${p.hero_mid} with ${p.hero_light} highlights, accents ${p.accent}.
Motion: squash and stretch on landing, slight stop-motion stutter at 12 fps.
No text, no numbers, no logos, no watermark.`;
}

