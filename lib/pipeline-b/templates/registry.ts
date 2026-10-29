/**
 * Meta Muse — Pipeline B Template Registry
 * Defines distinct creative directions for talking-head video editing.
 */

export interface PipelineBTemplate {
  id: string;
  name: string;
  tagline: string;
  fontFamily: string;
  primaryColor: string;
  highlightColor: string;
  textColor: string;
  cardBg: string;
  punchInFrequency: "high" | "medium" | "low";
  captionStyle: "word_by_word" | "sentence_chunk" | "editorial_highlight";
  enableSfx: boolean;
  enableProgressBar: boolean;
  enablePaperBadge: boolean;
  aspectRatio: "9:16";
}

export const PIPELINE_B_TEMPLATES: Record<string, PipelineBTemplate> = {
  hormoziPunch: {
    id: "hormoziPunch",
    name: "Hormozi Punch",
    tagline: "Bold active-word highlight, punchy camera zooms & pop animations",
    fontFamily: "Montserrat, Anton, sans-serif",
    primaryColor: "#E4491B",
    highlightColor: "#FFDD00",
    textColor: "#FFFFFF",
    cardBg: "rgba(20, 20, 20, 0.9)",
    punchInFrequency: "high",
    captionStyle: "word_by_word",
    enableSfx: true,
    enableProgressBar: true,
    enablePaperBadge: true,
    aspectRatio: "9:16",
  },
  voxEditorial: {
    id: "voxEditorial",
    name: "Vox Editorial",
    tagline: "Warm paper stationery, highlighter strokes & documentary notes",
    fontFamily: "Instrument Serif, Georgia, serif",
    primaryColor: "#E4491B",
    highlightColor: "#F6D9CC",
    textColor: "#141414",
    cardBg: "#FFFFFF",
    punchInFrequency: "medium",
    captionStyle: "editorial_highlight",
    enableSfx: false,
    enableProgressBar: true,
    enablePaperBadge: true,
    aspectRatio: "9:16",
  },
  siliconMinimal: {
    id: "siliconMinimal",
    name: "Silicon Minimal",
    tagline: "Clean Linear/Apple aesthetic with monospace markers & glass pills",
    fontFamily: "JetBrains Mono, monospace",
    primaryColor: "#0EA5E9",
    highlightColor: "#38BDF8",
    textColor: "#FFFFFF",
    cardBg: "rgba(17, 24, 39, 0.85)",
    punchInFrequency: "low",
    captionStyle: "sentence_chunk",
    enableSfx: false,
    enableProgressBar: true,
    enablePaperBadge: false,
    aspectRatio: "9:16",
  },
  creatorFastPaced: {
    id: "creatorFastPaced",
    name: "Creator Fast-Paced",
    tagline: "High-octane YouTube/TikTok shorts with sound cues & emojis",
    fontFamily: "Anton, Montserrat, sans-serif",
    primaryColor: "#EC4899",
    highlightColor: "#A855F7",
    textColor: "#FFFFFF",
    cardBg: "rgba(0, 0, 0, 0.8)",
    punchInFrequency: "high",
    captionStyle: "word_by_word",
    enableSfx: true,
    enableProgressBar: true,
    enablePaperBadge: true,
    aspectRatio: "9:16",
  },
};

export function getPipelineBTemplate(id?: string): PipelineBTemplate {
  if (id && PIPELINE_B_TEMPLATES[id]) {
    return PIPELINE_B_TEMPLATES[id];
  }
  return PIPELINE_B_TEMPLATES.hormoziPunch;
}
