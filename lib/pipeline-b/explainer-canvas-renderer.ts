"use client";

import { CaptionStyleId, CAPTION_STYLES, CAPTION_STYLE_LIST } from "@/lib/captions/styles";
import { decodeMaskToRaster, decodeMaskToSVGPath } from "@meta-sam/parser";

export type { CaptionStyleId };
export { CAPTION_STYLES, CAPTION_STYLE_LIST };

export type ExplainerLayoutMode = "auto_reel" | "cutout_reel" | "speaker_only";
export type PaletteId =
  | "auto"
  | "editorial_warm"
  | "midnight_neon"
  | "cyber_blue"
  | "emerald_growth"
  | "royal_violet"
  | "emerald_gold"
  | "titanium_minimal";

export interface VisualPalette {
  id: Exclude<PaletteId, "auto">;
  label: string;
  swatch: string;
  isDarkCanvas: boolean;
  canvasBg: string;
  canvasGradInner: string;
  canvasGradOuter: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  accentSoftBg: string;
  highlight: string;
  calloutBg: string;
  calloutBorder: string;
  calloutText: string;
}

export const PALETTES: Record<Exclude<PaletteId, "auto">, VisualPalette> = {
  editorial_warm: {
    id: "editorial_warm",
    label: "Warm Studio",
    swatch: "#E4491B",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #1A1412 0%, #0A0807 100%)",
    canvasGradInner: "#1A1412",
    canvasGradOuter: "#0A0807",
    cardBg: "#161210",
    cardBorder: "#E4491B",
    cardShadow: "0 16px 40px -10px rgba(228, 73, 27, 0.4)",
    primaryText: "#FFFDF9",
    secondaryText: "#D6C7B7",
    accent: "#E4491B",
    accentSoftBg: "rgba(228, 73, 27, 0.18)",
    highlight: "#FFE600",
    calloutBg: "rgba(20, 16, 14, 0.94)",
    calloutBorder: "#E4491B",
    calloutText: "#FFFFFF",
  },
  midnight_neon: {
    id: "midnight_neon",
    label: "Midnight Studio",
    swatch: "#FF5520",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #161926 0%, #090B10 100%)",
    canvasGradInner: "#161926",
    canvasGradOuter: "#090B10",
    cardBg: "#121521",
    cardBorder: "#FF5520",
    cardShadow: "0 16px 40px -10px rgba(255, 85, 32, 0.35)",
    primaryText: "#FFFFFF",
    secondaryText: "#9CA3AF",
    accent: "#FF5520",
    accentSoftBg: "rgba(255, 85, 32, 0.16)",
    highlight: "#FFE600",
    calloutBg: "rgba(12, 14, 22, 0.92)",
    calloutBorder: "#FF5520",
    calloutText: "#FFFFFF",
  },
  cyber_blue: {
    id: "cyber_blue",
    label: "Cyber Blue",
    swatch: "#2563EB",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #0F1E36 0%, #070D19 100%)",
    canvasGradInner: "#0F1E36",
    canvasGradOuter: "#070D19",
    cardBg: "#111C30",
    cardBorder: "#38BDF8",
    cardShadow: "0 16px 40px -10px rgba(56, 189, 248, 0.3)",
    primaryText: "#F8FAFC",
    secondaryText: "#94A3B8",
    accent: "#38BDF8",
    accentSoftBg: "rgba(56, 189, 248, 0.16)",
    highlight: "#FACC15",
    calloutBg: "rgba(10, 18, 34, 0.92)",
    calloutBorder: "#38BDF8",
    calloutText: "#FFFFFF",
  },
  emerald_growth: {
    id: "emerald_growth",
    label: "Emerald Pulse",
    swatch: "#10B981",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #0D261F 0%, #06120E 100%)",
    canvasGradInner: "#0D261F",
    canvasGradOuter: "#06120E",
    cardBg: "#0F241D",
    cardBorder: "#10B981",
    cardShadow: "0 16px 40px -10px rgba(16, 185, 129, 0.3)",
    primaryText: "#ECFDF5",
    secondaryText: "#A7F3D0",
    accent: "#10B981",
    accentSoftBg: "rgba(16, 185, 129, 0.16)",
    highlight: "#FDE047",
    calloutBg: "rgba(8, 22, 18, 0.92)",
    calloutBorder: "#10B981",
    calloutText: "#FFFFFF",
  },
  royal_violet: {
    id: "royal_violet",
    label: "Royal Violet",
    swatch: "#8B5CF6",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #1E1338 0%, #0C071A 100%)",
    canvasGradInner: "#1E1338",
    canvasGradOuter: "#0C071A",
    cardBg: "#18102E",
    cardBorder: "#A855F7",
    cardShadow: "0 16px 40px -10px rgba(168, 85, 247, 0.35)",
    primaryText: "#FAF5FF",
    secondaryText: "#D8B4FE",
    accent: "#C084FC",
    accentSoftBg: "rgba(192, 132, 252, 0.16)",
    highlight: "#FDE047",
    calloutBg: "rgba(17, 10, 34, 0.92)",
    calloutBorder: "#A855F7",
    calloutText: "#FFFFFF",
  },
  emerald_gold: {
    id: "emerald_gold",
    label: "Emerald Gold",
    swatch: "#FFD700",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #082119 0%, #030D09 100%)",
    canvasGradInner: "#082119",
    canvasGradOuter: "#030D09",
    cardBg: "#0B261D",
    cardBorder: "#FFD700",
    cardShadow: "0 16px 40px -10px rgba(255, 215, 0, 0.35)",
    primaryText: "#FFFDF5",
    secondaryText: "#A7F3D0",
    accent: "#FFD700",
    accentSoftBg: "rgba(255, 215, 0, 0.16)",
    highlight: "#10B981",
    calloutBg: "rgba(6, 25, 19, 0.94)",
    calloutBorder: "#FFD700",
    calloutText: "#FFFFFF",
  },
  titanium_minimal: {
    id: "titanium_minimal",
    label: "Titanium Minimal",
    swatch: "#F8FAFC",
    isDarkCanvas: true,
    canvasBg: "radial-gradient(circle at 50% 35%, #141722 0%, #07090E 100%)",
    canvasGradInner: "#141722",
    canvasGradOuter: "#07090E",
    cardBg: "#11141C",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    cardShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.6)",
    primaryText: "#FFFFFF",
    secondaryText: "#94A3B8",
    accent: "#F8FAFC",
    accentSoftBg: "rgba(255, 255, 255, 0.12)",
    highlight: "#FACC15",
    calloutBg: "rgba(10, 12, 18, 0.95)",
    calloutBorder: "rgba(255, 255, 255, 0.25)",
    calloutText: "#FFFFFF",
  },
};

export type IconKey =
  | "scissors"
  | "captions"
  | "sparkles"
  | "sound"
  | "zap"
  | "clock"
  | "rocket"
  | "check";

export interface WordItem {
  word: string;
  start: number;
  end: number;
}

export interface SpokenStepBeat {
  id: string;
  label: string;
  subText: string;
  iconKey: IconKey;
  triggerTime: number;
  endTime: number;
}

export interface SpokenContrastPlan {
  headerLabel: string;
  partALabel: string;
  partAMetric: string;
  partASub: string;
  partATime: number;
  partABarPct: number;
  partBLabel: string;
  partBMetric: string;
  partBSub: string;
  partBTime: number;
  partBBarPct: number;
}

export interface FaceSpaceCallout {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  iconKey: IconKey;
  triggerTime: number;
  endTime: number;
}

export type BeatRole =
  | "HOOK"
  | "CLAIM"
  | "EXPLAIN"
  | "PROCESS"
  | "LIST"
  | "STAT"
  | "COMPARE"
  | "STORY"
  | "EMPHASIS"
  | "CTA";

export type VisualMode =
  | "A_ROLL"
  | "A_ROLL_PUNCH"
  | "TEXT_BEHIND"
  | "ANIM_BEHIND"
  | "SPLIT"
  | "B_ROLL_FULL";

export interface GalleryClipItem {
  id: string;
  name: string;
  folderName?: string;
  url: string;
  kind: "video" | "image";
  tags: string[];
}

const GALLERY_SEMANTIC_CLUSTERS: string[][] = [
  ["gym", "gyming", "workout", "exercise", "exercising", "fitness", "lifting", "weights", "training", "muscle", "body", "strength", "health", "pushup", "squat", "dumbbell"],
  ["walk", "walking", "steps", "run", "running", "jog", "jogging", "cardio", "outdoor", "outside", "park", "street", "road", "morning", "stroll", "hike", "nature"],
  ["work", "working", "coding", "code", "laptop", "computer", "desk", "office", "study", "studying", "focus", "productive", "typing", "build", "building", "project"],
  ["phone", "scrolling", "screen", "social", "media", "reels", "instagram", "youtube", "app", "mobile", "notification", "distraction"],
  ["food", "eat", "eating", "meal", "diet", "nutrition", "protein", "cook", "cooking", "kitchen", "coffee", "drink", "water", "breakfast", "lunch", "dinner"],
  ["travel", "trip", "drive", "driving", "car", "bike", "cycling", "flight", "city", "beach", "vacation", "explore"],
  ["sleep", "sleeping", "bed", "rest", "night", "wake", "tired", "recovery", "routine", "habit", "life", "personal", "daily", "day"],
];

export function extractGalleryTagsFromName(fileName: string, folderName?: string): string[] {
  const raw = `${folderName || ""} ${fileName.replace(/\.[^/.]+$/, "")}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !["mp4", "mov", "webm", "jpg", "jpeg", "png", "img", "vid", "video", "clip", "final", "new", "copy"].includes(w));
  return Array.from(new Set(raw));
}

export function matchGalleryClipForScene(
  spokenText: string,
  headlineText: string,
  galleryClips: GalleryClipItem[],
  usedClipIds: Set<string>,
  sceneIdx: number,
  allowFallbackCutaway: boolean
): GalleryClipItem | undefined {
  if (!galleryClips || galleryClips.length === 0) return undefined;
  const combined = `${spokenText} ${headlineText}`.toLowerCase();
  const tokens = new Set(
    combined
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
  );

  // Expand spoken tokens with semantic clusters (e.g. "gyming" -> matches "workout", "gym", "exercise", etc.)
  const expandedTokens = new Set<string>(tokens);
  for (const cluster of GALLERY_SEMANTIC_CLUSTERS) {
    if (cluster.some((word) => tokens.has(word) || combined.includes(word))) {
      for (const syn of cluster) expandedTokens.add(syn);
    }
  }

  let bestClip: GalleryClipItem | undefined;
  let bestScore = 0;

  for (const clip of galleryClips) {
    let score = 0;
    const clipTags = clip.tags.length > 0 ? clip.tags : extractGalleryTagsFromName(clip.name, clip.folderName);
    for (const tag of clipTags) {
      if (tokens.has(tag) || combined.includes(tag)) {
        score += 4; // Direct keyword hit
      } else if (expandedTokens.has(tag)) {
        score += 2; // Semantic cluster hit (e.g. talking about exercise matches gym.mp4)
      } else {
        for (const tok of expandedTokens) {
          if (tok.length >= 3 && tag.length >= 3 && (tok.startsWith(tag) || tag.startsWith(tok))) {
            score += 1.5;
          }
        }
      }
    }
    if (score > 0 && !usedClipIds.has(clip.id)) {
      score += 0.5; // Prefer unused clips first for variety
    }
    if (score > bestScore) {
      bestScore = score;
      bestClip = clip;
    }
  }

  if (bestClip && bestScore > 0) {
    usedClipIds.add(bestClip.id);
    return bestClip;
  }

  return undefined;
}

export const DEFAULT_CREATIVE_GALLERY_PACK: GalleryClipItem[] = [
  {
    id: "curated-phone-scroll",
    name: "Phone_Scrolling.jpg",
    folderName: "Creative Pack",
    url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80",
    kind: "image",
    tags: ["phone", "scrolling", "screen", "minutes", "social", "media", "reels", "pick", "habit", "distraction"],
  },
  {
    id: "curated-gym-fitness",
    name: "Gym_Workout.jpg",
    folderName: "Creative Pack",
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
    kind: "image",
    tags: ["gym", "gyming", "workout", "exercise", "fitness", "lifting", "weights", "training", "health", "body"],
  },
  {
    id: "curated-morning-walk",
    name: "Morning_Walk.jpg",
    folderName: "Creative Pack",
    url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80",
    kind: "image",
    tags: ["walk", "walking", "steps", "run", "running", "outdoor", "morning", "cardio", "nature", "outside"],
  },
  {
    id: "curated-deep-work",
    name: "Deep_Work_Desk.jpg",
    folderName: "Creative Pack",
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    kind: "image",
    tags: ["work", "coding", "laptop", "desk", "focus", "productive", "study", "build", "project", "office"],
  },
  {
    id: "curated-time-clock",
    name: "Time_Vanishing.jpg",
    folderName: "Creative Pack",
    url: "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=900&q=80",
    kind: "image",
    tags: ["time", "clock", "hour", "hours", "minutes", "gone", "waste", "schedule", "day", "wait"],
  },
  {
    id: "curated-mind-focus",
    name: "Mind_Dopamine.jpg",
    folderName: "Creative Pack",
    url: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=900&q=80",
    kind: "image",
    tags: ["brain", "mind", "think", "thinking", "dopamine", "attention", "idea", "energy", "focus"],
  },
];

export type StoryVisualArchetype =
  | "phone_timer"
  | "time_drain"
  | "feed_vs_dreams"
  | "battery_vs_life"
  | "scroll_to_build"
  | "money_growth"
  | "code_system"
  | "contrast_split"
  | "process_flow"
  | "mind_focus";

export function inferStoryVisualArchetype(
  spoken: string,
  motionIntent = "",
  headline = "",
  technique = ""
): StoryVisualArchetype {
  const text = `${spoken} ${motionIntent} ${headline}`.toLowerCase();

  // 1. Battery / Power / Life Draining ("phone battery might run out, do not let your life run out")
  if (/\b(battery|charge|recharge|power\s+bar|draining\s+bars?|run\s+out\s+of\s+time)\b/.test(text)) {
    return "battery_vs_life";
  }

  // 2. Stop Scrolling / Start Building / Future ("stop scrolling and start building", "future is waiting")
  if (
    /\b(stop\s+scrolling|start\s+building|building\s+blocks|future\s+is\s+waiting|build\s+your|start\s+creating)\b/.test(
      text
    )
  ) {
    return "scroll_to_build";
  }

  // 3. Watching Other People's Feed vs. Own Dreams ("watching other people's success, lifestyle... ignoring your own dreams")
  if (
    /\b(other\s+people|watching\s+other|lifestyle|happiness|ignoring\s+your|own\s+dreams|borrowed\s+lives|comparison)\b/.test(
      text
    )
  ) {
    return "feed_vs_dreams";
  }

  // 4. Smartphone / Pick Up Phone ("pick up your phone", "it's your smartphone")
  if (/\b(smartphone|cellphone|pick\s+up\s+your\s+phone|scrolling\s+feed)\b/.test(text)) {
    return "phone_timer";
  }

  // 5. Time Drain / Entire Hour Gone / Stealing Valuable Time ("entire hour is gone", "stealing the most valuable")
  if (
    /\b(entire\s+hour|hour\s+is\s+gone|hours?\s+gone|stealing|valuable\s+things?|disappearing\s+hour|time\s+loss|clock|stopwatch|wasting\s+time)\b/.test(
      text
    )
  ) {
    return "time_drain";
  }

  // 6. Money / Revenue / Growth / Views / Analytics
  if (/\b(money|revenue|profit|sales|income|wealth|dollars?|\$|views|followers|growth|roi|metrics?)\b/.test(text)) {
    return "money_growth";
  }

  // 7. Code / AI / System / Pipeline / Automation
  if (/\b(code|coding|ai|algorithm|software|pipeline|system|automate|api|database|terminal|model)\b/.test(text)) {
    return "code_system";
  }

  // 8. Contrast / VS / Comparison
  if (/\b(versus|vs|instead\s+of|rather\s+than|compared\s+to|before\s+and\s+after)\b/.test(text)) {
    return "contrast_split";
  }

  // 9. Multi-Step Process / Workflow
  if (/\b(step\s+1|first|second|third|workflow|process|how\s+to|method)\b/.test(text) || technique === "animated_diagram") {
    return "process_flow";
  }

  return "mind_focus";
}

export type YappingPopupZone =
  | "top-right"
  | "top-left"
  | "mid-right"
  | "mid-left"
  | "top-center";

export type YappingPropKind =
  | "stealing_radar"
  | "diamond_value"
  | "phone_timer"
  | "time_drain"
  | "social_feed"
  | "dream_target"
  | "battery_alert"
  | "build_blocks"
  | "future_rocket"
  | "money_ticker"
  | "code_terminal"
  | "brain_synapse"
  | "metric_counter"
  | "script_glass_card";

export interface YappingPopupBeat {
  id: string;
  start: number;
  end: number;
  zone: YappingPopupZone;
  propKind: YappingPropKind;
  chipLabel: string;
  subBadge: string;
  metricValue?: number;
  metricUnit?: string;
}

export function inferYappingPropFromPhrase(
  phrase: string,
  motionIntent = "",
  fallbackHeadline = ""
): {
  propKind: YappingPropKind;
  chipLabel: string;
  subBadge: string;
  metricValue?: number;
  metricUnit?: string;
} {
  const combined = `${phrase} ${motionIntent}`.toLowerCase();
  const rawWords = phrase
    .replace(/[^\w\s$%]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = rawWords.filter(
    (w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase())
  );
  const shortKeywords =
    meaningful
      .slice(-2)
      .join(" ")
      .toUpperCase() ||
    fallbackHeadline.toUpperCase() ||
    "KEY BEAT";

  // 1. Stealing / Thief / Lock / Trap
  if (/\b(steal|stealing|thief|rob|trap|hijack|hooked|addict)\b/.test(combined)) {
    return {
      propKind: "stealing_radar",
      chipLabel: "TIME THIEF",
      subBadge: "ALERT",
    };
  }

  // 2. Valuable / Precious / Important / Treasure / Life
  if (/\b(valuable|precious|most\s+important|treasure|worth|priceless)\b/.test(combined)) {
    return {
      propKind: "diamond_value",
      chipLabel: "MOST VALUABLE",
      subBadge: "ASSET",
    };
  }

  // 3. Battery / Charge / Power / Run out
  if (/\b(battery|charge|recharge|power|run\s+out|drain|empty|low)\b/.test(combined)) {
    return {
      propKind: "battery_alert",
      chipLabel: "NO RECHARGE",
      subBadge: "FINITE",
    };
  }

  // 4. Stop Scrolling / Start Building / Build / Create
  if (/\b(stop\s+scrolling|start\s+building|building|build|create|creating|execution|action)\b/.test(combined)) {
    return {
      propKind: "build_blocks",
      chipLabel: "START BUILDING",
      subBadge: "ACTION",
    };
  }

  // 5. Future / Waiting / Ahead / Tomorrow / Launch
  if (/\b(future|waiting\s+for\s+you|tomorrow|ahead|destiny|potential|launch|level\s+up)\b/.test(combined)) {
    return {
      propKind: "future_rocket",
      chipLabel: "YOUR FUTURE",
      subBadge: "NEXT LEVEL",
    };
  }

  // 6. Dreams / Goals / Vision / Own Path
  if (/\b(dreams?|goals?|vision|ambition|ignoring\s+your|own\s+path|purpose)\b/.test(combined)) {
    return {
      propKind: "dream_target",
      chipLabel: "YOUR DREAMS",
      subBadge: "FOCUS",
    };
  }

  // 7. Watching Others / Lifestyle / Social Feed / Reels / Happiness
  if (/\b(other\s+people|watching|lifestyle|happiness|success|scrolling|feed|reels|tiktok|instagram)\b/.test(combined)) {
    return {
      propKind: "social_feed",
      chipLabel: "OTHERS' FEED",
      subBadge: "SCROLLING",
    };
  }

  // 8. Phone / Smartphone / Scrolling Feed
  if (/\b(smartphone|cellphone|pick\s+up\s+your\s+phone|scrolling\s*feed)\b/.test(combined)) {
    return {
      propKind: "phone_timer",
      chipLabel: shortKeywords.slice(0, 16) || "SMARTPHONE",
      subBadge: "MOBILE",
    };
  }

  // 9. Time Focus / Speed / Clock / Duration
  if (/\b(hour|gone|wasting|time|minutes?|seconds?|clock|disappear|vanish|lost)\b/.test(combined)) {
    return {
      propKind: "metric_counter",
      chipLabel: shortKeywords.slice(0, 16) || "TIME FLOW",
      subBadge: "PACE",
    };
  }

  // 10. Money / Revenue / Sales / Profit / Growth
  if (/\b(money|revenue|profit|sales|income|dollars?|\$|wealth|clients|roi)\b/.test(combined)) {
    return {
      propKind: "money_ticker",
      chipLabel: shortKeywords.slice(0, 16),
      subBadge: "GROWTH",
    };
  }

  // 11. Code / AI / Software / System / Tech
  if (/\b(code|coding|ai|software|system|algorithm|api|automate|tech|agent|app)\b/.test(combined)) {
    return {
      propKind: "code_terminal",
      chipLabel: shortKeywords.slice(0, 16),
      subBadge: "SYSTEM",
    };
  }

  // 12. Brain / Mindset / Think / Learn / Focus
  if (/\b(brain|mind|mindset|think|thinking|focus|habit|dopamine|neuro|learn)\b/.test(combined)) {
    return {
      propKind: "brain_synapse",
      chipLabel: shortKeywords.slice(0, 16),
      subBadge: "MINDSET",
    };
  }

  // 13. Any explicit number or stat in the spoken phrase
  const numMatch = phrase.match(/(\d[\d,.]*)\s*(%|x|hrs?|hours?|mins?|minutes?|days?|years?|k|m|\$)?/i);
  if (numMatch) {
    const val = parseFloat(numMatch[1].replace(/,/g, "")) || 10;
    const unit = (numMatch[2] || "").toUpperCase();
    return {
      propKind: "metric_counter",
      chipLabel: shortKeywords.slice(0, 16),
      subBadge: "LIVE STAT",
      metricValue: val,
      metricUnit: unit,
    };
  }

  // 14. Dynamic Script Glassmorphic UI Card built directly from the spoken words
  return {
    propKind: "script_glass_card",
    chipLabel: shortKeywords.slice(0, 16),
    subBadge: "STORY BEAT",
  };
}

const YAPPING_ZONES: YappingPopupZone[] = [
  "top-right",
  "top-left",
  "mid-right",
  "mid-left",
  "top-center",
];

export function buildYappingPopupsForScene(
  sceneWords: WordItem[],
  spokenText: string,
  sceneStart: number,
  sceneEnd: number,
  motionIntent = "",
  headlineText = "",
  sceneIdx = 0
): YappingPopupBeat[] {
  const dur = Math.max(0.8, sceneEnd - sceneStart);
  // Split scene into snappy 2.0s–2.8s pop-up beats so pop-ups feel alive and move around the face
  const numBeats = Math.max(1, Math.min(3, Math.round(dur / 2.4)));
  const beatDur = dur / numBeats;
  const beats: YappingPopupBeat[] = [];
  let prevProp: YappingPropKind | null = null;

  for (let b = 0; b < numBeats; b++) {
    const bStart = +(sceneStart + b * beatDur).toFixed(2);
    const bEnd = +(sceneStart + (b + 1) * beatDur).toFixed(2);
    const sliceWords = sceneWords.filter(
      (w) => w.start >= bStart - 0.12 && w.start < bEnd + 0.1
    );
    const phrase =
      sliceWords.map((w) => w.word).join(" ") ||
      spokenText ||
      headlineText;

    const inferred = inferYappingPropFromPhrase(
      phrase,
      b === 0 ? motionIntent : "",
      headlineText
    );

    // If two adjacent sub-beats inside the same scene resolved to the exact same prop,
    // vary the second sub-beat based on its words so it feels fresh!
    let propKind = inferred.propKind;
    if (propKind === prevProp && b > 0) {
      propKind = "script_glass_card";
    }
    prevProp = propKind;

    // Derive the starting zone from this beat's actual language/director cue,
    // then move around the frame within the scene instead of repeating a fixed cycle.
    const placementText = `${phrase} ${motionIntent} ${headlineText}`.toLowerCase();
    let placementHash = 0;
    for (let i = 0; i < placementText.length; i++) {
      placementHash = (placementHash * 31 + placementText.charCodeAt(i)) >>> 0;
    }
    const zone = YAPPING_ZONES[(placementHash + sceneIdx * 3 + b * 2) % YAPPING_ZONES.length];

    beats.push({
      id: `yap-pop-${sceneIdx}-${b}`,
      start: bStart,
      end: bEnd,
      zone,
      propKind,
      chipLabel: inferred.chipLabel,
      subBadge: inferred.subBadge,
      metricValue: inferred.metricValue,
      metricUnit: inferred.metricUnit,
    });
  }

  return beats;
}

export interface SceneSegment {
  id: string;
  start: number;
  end: number;
  shotType: "fullscreen_speaker" | "fullscreen_animation" | "sam_cutout" | "depth_cutout" | VisualMode;
  visualKind: "contrast_comparison" | "step_stack" | "concept_spotlight";
  storyArchetype?: StoryVisualArchetype;
  visualRecipe?: {
    metaphor?: string;
    style?: "auto" | "clay_3d" | "paper_cut" | "paper_card" | "procedural" | "glass" | "black_neon" | "anime";
    objects: Array<{
      label: string;
      shape: "circle" | "rect" | "diamond" | "line" | "text";
      motion: "rise" | "orbit" | "pulse" | "slide" | "unfold" | "scatter";
      position: "upper-left" | "upper-right" | "center" | "lower-left" | "lower-right";
    }>;
  };
  technique?: string;
  motionIntent?: string;
  cutawayWindow?: { start: number; end: number };
  yappingPopups?: YappingPopupBeat[];
  beatRole?: BeatRole;
  visualMode?: VisualMode;
  visualScore?: number;
  spokenReference: string;
  headlineText: string;
  subLabel: string;
  contrast?: SpokenContrastPlan;
  steps: SpokenStepBeat[];
  faceCallouts: FaceSpaceCallout[];
  assetUrl?: string;
  galleryClipName?: string;
  galleryClipKind?: "video" | "image";
  assetStart?: number;
  assetDuration?: number;
  cameraZoom: number;
  animationLeadInSec?: number;
  cutoutMode?: string;
  samCutoutUrl?: string;
  samTrackUrl?: string;
  samBox?: {
    normX: number;
    normY: number;
    normW: number;
    normH: number;
    maskWidth?: number;
    maskHeight?: number;
    maskEncoding?: "lossless" | "one_bit";
    maskPayload?: string;
    maskRle?: {
      size: [number, number];
      counts: string | number[];
    };
    maskSvgPath?: string;
    trackUrl?: string;
    trackFrameCount?: number;
  };
}

const STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "your", "have", "just",
  "like", "uh", "uhhh", "um", "umm", "okay", "so", "when", "what", "into",
  "only", "very", "really", "about", "going", "were", "they", "them", "let",
  "me", "tell", "you", "why", "are", "we", "it", "is", "in", "on", "to", "of",
  "for", "a", "an", "then", "there",
]);

export function classifyBeatRole(spoken: string, isFirst: boolean, isLast: boolean): BeatRole {
  const text = spoken.toLowerCase();
  if (isFirst) return "HOOK";
  if (isLast || /\b(follow|subscribe|comment|link in bio|check out|share|save this)\b/i.test(text)) return "CTA";
  if (/\b(versus|vs|rather than|instead of|compared to|before and after)\b/i.test(text)) return "COMPARE";
  if (/\b(\d+%|\d+\s*(hours?|mins?|minutes?|seconds?|days?|x|times|dollars?|\$))\b/i.test(text)) return "STAT";
  if (/\b(first|second|third|step 1|step 2|step 3|next|then|finally|number one|number two)\b/i.test(text)) return "LIST";
  if (/\b(how to|process|workflow|how it works|system|pipeline|method)\b/i.test(text)) return "PROCESS";
  if (/\b(because|why|reason|means that|in other words|concept)\b/i.test(text)) return "EXPLAIN";
  if (/\b(secret|never|always|truth|biggest mistake|warning|stop doing)\b/i.test(text)) return "EMPHASIS";
  if (/\b(i was|years ago|one day|my friend|when i started|happened)\b/i.test(text)) return "STORY";
  return "CLAIM";
}

export function scoreVisualNeed(params: {
  role: BeatRole;
  spoken: string;
  isFirst: boolean;
  consecutiveFaceSec: number;
}): { score: number; mode: VisualMode } {
  const { role, spoken, isFirst, consecutiveFaceSec } = params;
  let score = 0;
  const text = spoken.toLowerCase();

  // Rule 1: Abstract concepts
  if (/\b(algorithm|architecture|database|workflow|pipeline|ai|system|strategy|concept)\b/i.test(text)) score += 1;
  // Rule 2: Numbers, processes, comparisons, lists
  if (/\b(\d+|step|versus|vs|list|compare|first|then)\b/i.test(text)) score += 1;
  // Rule 3: Pacing limit (if face was on screen > 3.5s in snappy mode)
  if (consecutiveFaceSec >= 3.5) score += 1;
  // Rule 4: Emotional story / personal
  if (role === "STORY" || /\b(i felt|i remember|honestly|in my heart)\b/i.test(text)) score -= 1;
  // Rule 5: First 1.2s hook needs face first
  if (isFirst) score -= 1;

  score = Math.max(0, Math.min(3, score));

  let mode: VisualMode;
  if (score === 0) {
    mode = "A_ROLL";
  } else if (score === 1) {
    mode = role === "CLAIM" || role === "EMPHASIS" ? "TEXT_BEHIND" : "A_ROLL_PUNCH";
  } else {
    // Score >= 2
    if (role === "PROCESS" || role === "STAT") {
      mode = "B_ROLL_FULL";
    } else if (role === "COMPARE" || role === "LIST") {
      mode = "SPLIT";
    } else {
      mode = "ANIM_BEHIND";
    }
  }

  return { score, mode };
}

export function normalizeSpokenPhrase(raw: string): string {
  return raw
    .replace(/\bsinking\s+sound/gi, "Syncing Sound")
    .replace(/\bsinking\b/gi, "Syncing")
    .replace(/\ba\s+hour\b/gi, "1 Hour")
    .replace(/\ban\s+hour\b/gi, "1 Hour")
    .replace(/\ba\s+minute\b/gi, "1 Minute")
    .replace(/\bzero\s+edits?\b/gi, "Zero Edits")
    .trim();
}

export function inferIconKey(text: string): IconKey {
  const lower = text.toLowerCase();
  if (/\b(cut|cutting|trim|trimming|silence|silences|retake|retakes|slice)\b/.test(lower)) {
    return "scissors";
  }
  if (/\b(caption|captions|subtitle|subtitles|text|words|script)\b/.test(lower)) {
    return "captions";
  }
  if (/\b(sound|audio|sfx|effects|music|voice|syncing|sinking)\b/.test(lower)) {
    return "sound";
  }
  if (/\b(animat\w+|motion|visual\w*|graphics|effects|b-roll)\b/.test(lower)) {
    return "sparkles";
  }
  if (/\b(minute|minutes|hour|hours|second|seconds|time|fast|slow|spend)\b/.test(lower)) {
    return "clock";
  }
  if (/\b(build|building|launch|create|creating|zero|future)\b/.test(lower)) {
    return "rocket";
  }
  if (/\b(change|instant|magic|auto|ai|click|clicks)\b/.test(lower)) {
    return "zap";
  }
  return "check";
}

function buildCleanHeadline(spoken: string, fallback = "KEY INSIGHT"): string {
  const normalized = normalizeSpokenPhrase(spoken);
  const tokens = normalized
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t.toLowerCase()));
  if (tokens.length === 0) return fallback.toUpperCase();
  return tokens.slice(0, 3).join(" ").toUpperCase();
}

function extractMetricFromClause(clause: string, fallbackLabel: string): {
  metric: string;
  label: string;
  barPct: number;
} {
  const norm = normalizeSpokenPhrase(clause);
  const lower = norm.toLowerCase();

  const numUnitMatch = norm.match(
    /\b(1|2|3|4|5|10|30|60|one|two|three|four|five|ten|thirty|a|an)\s+(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|clicks?|steps?|x)\b/i
  );
  if (numUnitMatch) {
    const wordToNum: Record<string, string> = {
      a: "1",
      an: "1",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      ten: "10",
      thirty: "30",
    };
    const num = wordToNum[numUnitMatch[1].toLowerCase()] || numUnitMatch[1].toUpperCase();
    const rawUnit = numUnitMatch[2].toUpperCase();
    const unit = rawUnit
      .replace(/^MINUTES?$/, "MIN")
      .replace(/^SECONDS?$/, "SEC")
      .replace(/^HOURS?$/, "HOUR");
    const isLong = /HOUR|DAY/i.test(unit) || Number(num) >= 15;
    const actionVerb =
      norm
        .replace(numUnitMatch[0], "")
        .replace(/\b(so|but|takes?|took|it|is|in|a|an|the)\b/gi, " ")
        .trim() || fallbackLabel;
    return {
      metric: `${num} ${unit}`,
      label: buildCleanHeadline(actionVerb, fallbackLabel),
      barPct: isLong ? 92 : 18,
    };
  }

  if (/\bmore\s+time\b/i.test(lower)) {
    const focus = buildCleanHeadline(
      norm.replace(/\b(creators?|spend|more|time|in)\b/gi, " "),
      "EDITING"
    );
    return {
      metric: `85% ${focus}`,
      label: "MORE TIME SPENT",
      barPct: 86,
    };
  }

  const clean = buildCleanHeadline(norm, fallbackLabel);
  return {
    metric: clean,
    label: fallbackLabel,
    barPct: 24,
  };
}

export function buildSceneDialoguePlan(
  sceneWords: WordItem[],
  spokenRef: string,
  rawHeadline: string | undefined,
  sceneStart: number,
  sceneEnd: number
): {
  visualKind: "contrast_comparison" | "step_stack" | "concept_spotlight";
  headlineText: string;
  subLabel: string;
  contrast?: SpokenContrastPlan;
  steps: SpokenStepBeat[];
  faceCallouts: FaceSpaceCallout[];
} {
  const wordsList: WordItem[] =
    sceneWords.length > 0
      ? sceneWords
      : spokenRef
          .split(/\s+/)
          .filter(Boolean)
          .map((w, i, arr) => {
            const dur = Math.max(0.5, sceneEnd - sceneStart);
            const step = dur / Math.max(1, arr.length);
            return {
              word: w,
              start: +(sceneStart + i * step).toFixed(2),
              end: +(sceneStart + (i + 1) * step).toFixed(2),
            };
          });

  const fullText = normalizeSpokenPhrase(
    wordsList.map((w) => w.word).join(" ") || spokenRef
  );

  const pivotIdx = wordsList.findIndex((w, idx) => {
    if (idx < 2 || idx >= wordsList.length - 1) return false;
    const lw = w.word.toLowerCase().replace(/[^a-z]/g, "");
    return lw === "but" || lw === "rather" || lw === "instead" || lw === "versus" || lw === "vs" || lw === "while";
  });

  const hasContrastSignal =
    pivotIdx !== -1 ||
    (/\b(minute|minutes|second|seconds)\b/i.test(fullText) &&
      /\b(hour|hours|day|days)\b/i.test(fullText)) ||
    /\bmore\s+time\b.*\b(than|creating|filming)\b/i.test(fullText);

  if (hasContrastSignal && wordsList.length >= 4) {
    const splitAt =
      pivotIdx !== -1 ? pivotIdx : Math.max(2, Math.floor(wordsList.length / 2));
    const partAWords = wordsList.slice(0, splitAt);
    const partBWords = wordsList.slice(splitAt);

    const partAText = partAWords.map((w) => w.word).join(" ");
    const partBText = partBWords
      .map((w) => w.word)
      .join(" ")
      .replace(/^(but|rather\s+than|instead\s+of|versus|vs)\s+/i, "");

    const infoA = extractMetricFromClause(partAText, "PART 1");
    const infoB = extractMetricFromClause(partBText, "PART 2");

    const partATime = partAWords[0]?.start ?? sceneStart;
    const partBTime = partBWords[0]?.start ?? +(sceneStart + (sceneEnd - sceneStart) * 0.5).toFixed(2);

    const contrastPlan: SpokenContrastPlan = {
      headerLabel:
        rawHeadline && rawHeadline.length <= 34
          ? rawHeadline.toUpperCase()
          : `${infoA.metric} VS ${infoB.metric}`,
      partALabel: infoA.label,
      partAMetric: infoA.metric,
      partASub: normalizeSpokenPhrase(partAText),
      partATime,
      partABarPct: infoA.barPct,
      partBLabel: infoB.label,
      partBMetric: infoB.metric,
      partBSub: normalizeSpokenPhrase(partBText),
      partBTime,
      partBBarPct: infoB.barPct === infoA.barPct ? 88 : infoB.barPct,
    };

    const faceCallouts: FaceSpaceCallout[] = [
      {
        id: "callout-contrast-a",
        badge: infoA.label,
        title: infoA.metric,
        subtitle: normalizeSpokenPhrase(partAText),
        iconKey: inferIconKey(partAText),
        triggerTime: partATime,
        endTime: partBTime,
      },
      {
        id: "callout-contrast-b",
        badge: infoB.label,
        title: infoB.metric,
        subtitle: normalizeSpokenPhrase(partBText),
        iconKey: inferIconKey(partBText),
        triggerTime: partBTime,
        endTime: sceneEnd,
      },
    ];

    return {
      visualKind: "contrast_comparison",
      headlineText: contrastPlan.headerLabel,
      subLabel: `${infoA.metric} → ${infoB.metric}`,
      contrast: contrastPlan,
      steps: [],
      faceCallouts,
    };
  }

  const actionAnchorRegex =
    /\b(cutting|adding|creating|syncing|sinking|trimming|removing|building|filming|editing|writing|uploading|rendering|exporting|generating|fixing)\b/i;

  const anchorIndices: number[] = [];
  wordsList.forEach((w, idx) => {
    const cleanW = w.word.replace(/[^a-zA-Z]/g, "");
    if (actionAnchorRegex.test(cleanW)) {
      if (anchorIndices.length === 0 || idx - anchorIndices[anchorIndices.length - 1] >= 2) {
        anchorIndices.push(idx);
      }
    }
  });

  if (anchorIndices.length >= 2) {
    const steps: SpokenStepBeat[] = anchorIndices.map((startIdx, i) => {
      const nextIdx =
        i < anchorIndices.length - 1 ? anchorIndices[i + 1] : wordsList.length;
      const slice = wordsList.slice(startIdx, nextIdx);
      const rawPhrase = normalizeSpokenPhrase(slice.map((w) => w.word).join(" "));
      const cleanLabel = rawPhrase
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .split(/\s+/)
        .slice(0, 3)
        .join(" ")
        .toUpperCase();
      const triggerTime = slice[0]?.start ?? sceneStart;
      const endTime = slice[slice.length - 1]?.end ?? sceneEnd;

      return {
        id: `step-${i + 1}-${triggerTime}`,
        label: cleanLabel || `STEP ${i + 1}`,
        subText: rawPhrase,
        iconKey: inferIconKey(rawPhrase),
        triggerTime,
        endTime,
      };
    });

    const faceCallouts: FaceSpaceCallout[] = steps.map((st, idx) => ({
      id: `face-step-${idx + 1}`,
      badge: `STEP 0${idx + 1} • LIVE`,
      title: st.label,
      subtitle: st.subText,
      iconKey: st.iconKey,
      triggerTime: st.triggerTime,
      endTime: idx < steps.length - 1 ? steps[idx + 1].triggerTime : sceneEnd,
    }));

    return {
      visualKind: "step_stack",
      headlineText:
        rawHeadline && rawHeadline.length <= 32
          ? rawHeadline.toUpperCase()
          : `${steps.length} WORKFLOW STEPS`,
      subLabel: "SYNCED TO SPOKEN DIALOGUE",
      steps,
      faceCallouts,
    };
  }

  const contentWords = wordsList.filter(
    (w) => w.word.replace(/[^a-zA-Z0-9]/g, "").length >= 3 && !STOP_WORDS.has(w.word.toLowerCase())
  );

  const steps: SpokenStepBeat[] = [];
  const faceCallouts: FaceSpaceCallout[] = [];

  if (wordsList.length >= 6 && contentWords.length >= 2) {
    const punchStartIdx = Math.max(1, wordsList.length - 3);
    const setupSlice = wordsList.slice(0, punchStartIdx);
    const punchSlice = wordsList.slice(punchStartIdx);

    const setupPhrase = normalizeSpokenPhrase(setupSlice.map((w) => w.word).join(" "));
    const punchPhrase = normalizeSpokenPhrase(punchSlice.map((w) => w.word).join(" "));

    const setupTitle = buildCleanHeadline(setupPhrase, "THE CONTEXT");
    const punchTitle = buildCleanHeadline(
      punchPhrase,
      rawHeadline || "KEY TAKEAWAY"
    );

    const setupTime = setupSlice[0]?.start ?? sceneStart;
    const punchTime = punchSlice[0]?.start ?? +(sceneStart + (sceneEnd - sceneStart) * 0.55).toFixed(2);

    steps.push(
      {
        id: `beat-setup-${setupTime}`,
        label: setupTitle,
        subText: setupPhrase,
        iconKey: inferIconKey(setupPhrase),
        triggerTime: setupTime,
        endTime: punchTime,
      },
      {
        id: `beat-punch-${punchTime}`,
        label: punchTitle,
        subText: punchPhrase,
        iconKey: inferIconKey(punchPhrase),
        triggerTime: punchTime,
        endTime: sceneEnd,
      }
    );

    faceCallouts.push(
      {
        id: `face-setup-${setupTime}`,
        badge: "LIVE CONTEXT",
        title: setupTitle,
        subtitle: setupPhrase,
        iconKey: inferIconKey(setupPhrase),
        triggerTime: setupTime,
        endTime: punchTime,
      },
      {
        id: `face-punch-${punchTime}`,
        badge: "KEY POINT",
        title: punchTitle,
        subtitle: fullText,
        iconKey: inferIconKey(punchPhrase),
        triggerTime: punchTime,
        endTime: sceneEnd,
      }
    );
  } else {
    const cleanTitle =
      rawHeadline && rawHeadline.split(/\s+/).length <= 5
        ? normalizeSpokenPhrase(rawHeadline).toUpperCase()
        : buildCleanHeadline(fullText, "KEY INSIGHT");
    const firstWordTime = wordsList[0]?.start ?? sceneStart;

    steps.push({
      id: `beat-single-${firstWordTime}`,
      label: cleanTitle,
      subText: fullText,
      iconKey: inferIconKey(fullText),
      triggerTime: firstWordTime,
      endTime: sceneEnd,
    });

    faceCallouts.push({
      id: `face-single-${firstWordTime}`,
      badge: "ON CAMERA FOCUS",
      title: cleanTitle,
      subtitle: fullText,
      iconKey: inferIconKey(fullText),
      triggerTime: firstWordTime,
      endTime: sceneEnd,
    });
  }

  const finalHeadline =
    rawHeadline && rawHeadline.split(/\s+/).length <= 5
      ? normalizeSpokenPhrase(rawHeadline).toUpperCase()
      : buildCleanHeadline(fullText, "KEY INSIGHT");

  return {
    visualKind: "concept_spotlight",
    headlineText: finalHeadline,
    subLabel: fullText,
    steps,
    faceCallouts,
  };
}

export function resolveActivePalette(
  paletteChoice: PaletteId,
  topic: string,
  editPlan: any
): VisualPalette {
  if (paletteChoice !== "auto") {
    return PALETTES[paletteChoice];
  }
  const combined = `${topic || ""} ${editPlan?.title || ""} ${editPlan?.notes || ""}`.toLowerCase();
  if (/\b(gold|wealth|rich|luxury|invest|finance)\b/.test(combined)) return PALETTES.emerald_gold;
  if (/\b(minimal|apple|pro|clean|monochrome|slate)\b/.test(combined)) return PALETTES.titanium_minimal;
  if (/\b(blue|cyber|tech|saas|ocean|sky)\b/.test(combined)) return PALETTES.cyber_blue;
  if (/\b(green|emerald|money|growth|wealth|forest)\b/.test(combined)) return PALETTES.emerald_growth;
  if (/\b(purple|violet|magic|royal|indigo|neon)\b/.test(combined)) return PALETTES.royal_violet;
  if (/\b(dark|midnight|black|obsidian|night)\b/.test(combined)) return PALETTES.midnight_neon;
  return PALETTES.editorial_warm;
}

export function extractWordsFromPlan(editPlan: any, beats: any[] = []): WordItem[] {
  if (
    editPlan?.editedTranscript &&
    Array.isArray(editPlan.editedTranscript) &&
    editPlan.editedTranscript.length > 0
  ) {
    const list: WordItem[] = [];
    for (const seg of editPlan.editedTranscript) {
      for (const w of seg.words || []) {
        list.push({
          word: w.word,
          start: typeof w.editedStart === "number" ? w.editedStart : w.start ?? 0,
          end: typeof w.editedEnd === "number" ? w.editedEnd : w.end ?? 0.2,
        });
      }
    }
    if (list.length > 0) return list;
  }

  if (editPlan?.transcript && Array.isArray(editPlan.transcript)) {
    const list: WordItem[] = [];
    for (const seg of editPlan.transcript) {
      for (const w of seg.words || []) {
        list.push({
          word: w.word,
          start: w.start ?? 0,
          end: w.end ?? 0.2,
        });
      }
    }
    if (list.length > 0) return list;
  }

  const fallbackWords: WordItem[] = [];
  let cursor = 0;
  for (const b of beats) {
    const bStart = typeof b.start === "number" ? b.start : cursor;
    const bDur = b.durNum || 2.5;
    const tokens = String(b.script || b.text || "")
      .split(/\s+/)
      .filter(Boolean);
    const wDur = tokens.length > 0 ? bDur / tokens.length : 0.3;
    tokens.forEach((tok, idx) => {
      fallbackWords.push({
        word: tok,
        start: +(bStart + idx * wDur).toFixed(2),
        end: +(bStart + (idx + 1) * wDur).toFixed(2),
      });
    });
    cursor = bStart + bDur;
  }
  return fallbackWords;
}

export function buildExplainerScenes(
  duration: number,
  editPlan: any,
  words: WordItem[],
  beats: any[] = [],
  topic = "",
  galleryClips: GalleryClipItem[] = []
): SceneSegment[] {
  const effectiveGalleryClips: GalleryClipItem[] =
    galleryClips && galleryClips.length > 0
      ? galleryClips
      : Array.isArray(editPlan?.galleryClips)
      ? editPlan.galleryClips
      : [];
  const usedGalleryClipIds = new Set<string>();
  const totalDur = Math.max(duration, editPlan?.cleanDuration || 10);
  const rawSegs: any[] = editPlan?.visualSegments || [];
  const isCutoutTemplate =
    editPlan?.templateId === "cutout" || editPlan?.templateId === "samCutoutExplainer";
  const isGalleryTemplate =
    editPlan?.templateId === "gallery" || editPlan?.templateId === "galleryBroll";
  const samBox = editPlan?.samBox || {
    normX: 0.08,
    normY: 0.08,
    normW: 0.84,
    normH: 0.86,
  };
  const samCutoutUrl =
    editPlan?.samCutoutUrl ||
    (editPlan as any)?.resolvedAssets?.speaker_cutout ||
    (isCutoutTemplate && editPlan?.runId ? `/assets/${editPlan.runId}/speaker_cutout.png` : undefined);
  const samTrackUrl =
    samBox?.trackUrl ||
    (editPlan as any)?.resolvedAssets?.sam_track ||
    (isCutoutTemplate && editPlan?.runId ? `/assets/${editPlan.runId}/sam_track.json` : undefined);
  if (samBox && samTrackUrl && !samBox.trackUrl) {
    samBox.trackUrl = samTrackUrl;
  }

  if (rawSegs.length >= 1) {
    let consecutiveFaceSec = 0;
    let fullScreenCutawayCount = 0;
    const maxFullScreenCutaways = Math.max(1, Math.min(2, Math.floor(totalDur / 14)));
    let lastVisualMode: VisualMode | null = null;
    let lastShotType: SceneSegment["shotType"] | null = null;

    return rawSegs.map((s, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === rawSegs.length - 1 && rawSegs.length >= 3;

      // Ensure seamless contiguous time boundaries so there are zero frame gaps or boundary flickers
      const prevEnd = idx > 0 ? (typeof rawSegs[idx - 1].end === "number" ? rawSegs[idx - 1].end : 0) : 0;
      const sStart = idx === 0 ? 0 : Math.max(prevEnd, typeof s.start === "number" ? s.start : prevEnd);
      const nextStart = idx < rawSegs.length - 1 && typeof rawSegs[idx + 1].start === "number" ? rawSegs[idx + 1].start : totalDur;
      const sEnd = idx === rawSegs.length - 1 ? totalDur : Math.max(sStart + 0.1, typeof s.end === "number" ? Math.min(nextStart, s.end) : nextStart);
      const segDuration = sEnd - sStart;

      const sceneWords = words.filter(
        (w) => w.start >= sStart - 0.12 && w.start < sEnd + 0.05
      );
      const segWordsText = sceneWords.map((w) => w.word).join(" ");
      // Prioritize the actual spoken words in this timestamp window over any hallucinated spokenReference!
      const spokenRef = segWordsText || s.spokenReference || topic;

      // Discard hallucinated headline if it shares zero words with what's actually spoken
      let headlineCandidate = s.headlineText;
      if (headlineCandidate && segWordsText) {
        const segTokens = new Set(
          segWordsText.toLowerCase().split(/\s+/).map((w: string) => w.replace(/[^a-z0-9]/g, ""))
        );
        const headTokens = headlineCandidate
          .toLowerCase()
          .split(/\s+/)
          .map((w: string) => w.replace(/[^a-z0-9]/g, ""))
          .filter((w: string) => w.length > 2);
        const hasOverlap = headTokens.some((t: string) => segTokens.has(t));
        if (!hasOverlap && headTokens.length > 0) {
          headlineCandidate = undefined;
        }
      }

      const plan = buildSceneDialoguePlan(
        sceneWords,
        spokenRef,
        headlineCandidate,
        sStart,
        sEnd
      );

      // Apply reel-visual-director Role Classification & Visual Scoring
      const beatRole = classifyBeatRole(spokenRef, isFirst, isLast);
      const { score: visualScore, mode: initialMode } = scoreVisualNeed({
        role: beatRole,
        spoken: spokenRef,
        isFirst,
        consecutiveFaceSec,
      });

      let visualMode: VisualMode = initialMode;

      // Hard Rules from reel-visual-director:
      // 1. First beat is never B_ROLL_FULL (viewer needs face eye contact for the first ~1.2s)
      if (isFirst && visualMode === "B_ROLL_FULL") {
        visualMode = "A_ROLL_PUNCH";
      }
      // 2. Never same mode three times in a row
      if (lastVisualMode === visualMode && visualMode === "B_ROLL_FULL") {
        visualMode = "ANIM_BEHIND";
      }
      // 3. Always return to face after B_ROLL_FULL
      if (lastVisualMode === "B_ROLL_FULL" && visualMode === "B_ROLL_FULL") {
        visualMode = "A_ROLL_PUNCH";
      }

      const storyArchetype = inferStoryVisualArchetype(
        spokenRef,
        s.motionIntent,
        plan.headlineText,
        s.technique
      );

      // Map VisualMode to runtime shotType:
      let resolvedShotType: SceneSegment["shotType"] = "fullscreen_speaker";

      // An explicitly recreated scene is a user-directed graphic, not a beat that
      // should be reclassified back into the generic face/phone animation template.
      const hasWonderRecipe =
        s.layoutType === "broll_takeover" &&
        s.technique === "procedural_graphic" &&
        s.visualRecipe &&
        Array.isArray(s.visualRecipe.objects) &&
        s.visualRecipe.objects.length > 0;

      if (hasWonderRecipe) {
        resolvedShotType = "fullscreen_animation";
      } else if (isCutoutTemplate) {
        // Cutout workflow:
        // When visual score >= 2 or template demands graphic, use SAM 3.1 cutout in bottom-left over animation!
        if (visualMode === "ANIM_BEHIND" || visualMode === "SPLIT" || visualMode === "TEXT_BEHIND") {
          resolvedShotType = "sam_cutout";
        } else if (visualMode === "B_ROLL_FULL") {
          resolvedShotType = isFirst ? "sam_cutout" : "fullscreen_animation";
        } else if (visualScore >= 1) {
          resolvedShotType = "sam_cutout";
        } else {
          resolvedShotType = "fullscreen_speaker";
        }
      } else {
        // Yapping Style / Story Explainer workflow (NO CUTOUTS, HIGH FACE VALUE):
        // 80–85% of the video stays on the speaker's face ("fullscreen_speaker") with dynamic
        // script-driven pop-up motions around the face. Full-screen animation cutaways ONLY happen
        // on 1–2 climax beats after at least 6s of face time, and each cutaway is capped at 3.2s max!
        const isAiCutaway =
          s.layoutType === "broll_takeover" ||
          s.technique === "ui_mockup" ||
          s.technique === "animated_diagram" ||
          s.technique === "procedural_graphic";

        if (
          !isFirst &&
          !isLast &&
          lastShotType !== "fullscreen_animation" &&
          consecutiveFaceSec >= 6.0 &&
          fullScreenCutawayCount < maxFullScreenCutaways &&
          (isAiCutaway || visualMode === "B_ROLL_FULL" || visualScore >= 2)
        ) {
          resolvedShotType = "fullscreen_animation";
        } else {
          resolvedShotType = "fullscreen_speaker";
        }
      }

      // ONLY match gallery clips/images when the Gallery Template is explicitly selected!
      const matchedGalleryClip = s.assetUrl
        ? { id: s.id, name: s.galleryClipName || "Gallery clip", url: s.assetUrl, kind: s.galleryClipKind || "video", tags: [] }
        : isGalleryTemplate
        ? matchGalleryClipForScene(
            spokenRef,
            plan.headlineText,
            effectiveGalleryClips,
            usedGalleryClipIds,
            idx,
            !isFirst && resolvedShotType === "fullscreen_animation"
          )
        : undefined;
      if (isGalleryTemplate && matchedGalleryClip && !isFirst) {
        resolvedShotType = "fullscreen_animation";
      }

      // Cap any full-screen animation cutaway in Yapping Style to a punchy 3.2s burst window!
      const cutawayDur = Math.min(segDuration, 3.2);
      const cutawayWindow =
        resolvedShotType === "fullscreen_animation" && !isCutoutTemplate && !isGalleryTemplate
          ? {
              start: sStart,
              end: +(sStart + cutawayDur).toFixed(2),
            }
          : undefined;

      // Update consecutive face duration tracker
      if (resolvedShotType === "fullscreen_speaker") {
        consecutiveFaceSec += segDuration;
      } else {
        fullScreenCutawayCount++;
        // Any remaining time after the 3.2s cutaway window returns to the speaker's face
        consecutiveFaceSec = Math.max(0, segDuration - cutawayDur);
      }

      const yappingPopups = buildYappingPopupsForScene(
        sceneWords,
        spokenRef,
        sStart,
        sEnd,
        s.motionIntent || "",
        plan.headlineText,
        idx
      );

      lastVisualMode = visualMode;
      lastShotType = resolvedShotType;

      return {
        id: s.id || `scene-${idx + 1}`,
        start: sStart,
        end: sEnd,
        shotType: resolvedShotType,
        visualKind: plan.visualKind,
        storyArchetype,
        visualRecipe: s.visualRecipe && Array.isArray(s.visualRecipe.objects) ? s.visualRecipe : undefined,
        technique: s.technique,
        // Recreated Wonder scenes stay full-screen for their whole timeline segment.
        ...(hasWonderRecipe
          ? { shotType: "fullscreen_animation" as const, cutawayWindow: undefined }
          : {}),
        motionIntent: s.motionIntent,
        ...(!hasWonderRecipe ? { cutawayWindow } : {}),
        yappingPopups,
        beatRole,
        visualMode,
        visualScore,
        spokenReference: spokenRef,
        headlineText: plan.headlineText,
        subLabel: plan.subLabel,
        contrast: plan.contrast,
        steps: plan.steps,
        faceCallouts: plan.faceCallouts,
        assetUrl: matchedGalleryClip?.url,
        galleryClipName: matchedGalleryClip?.name,
        galleryClipKind: matchedGalleryClip?.kind,
        assetStart: s.assetStart,
        assetDuration: s.assetDuration,
        cameraZoom: visualMode === "A_ROLL_PUNCH" ? (idx % 2 === 0 ? 1.12 : 1.15) : idx % 2 === 0 ? 1.0 : 1.08,
        animationLeadInSec:
          typeof s.animationLeadInSec === "number"
            ? Math.min(0.2, s.animationLeadInSec)
            : resolvedShotType === "sam_cutout"
            ? 0.15
            : undefined,
        cutoutMode: s.cutoutMode,
        samCutoutUrl,
        samTrackUrl,
        samBox,
      };
    });
  }

  const numScenes = Math.max(3, Math.min(6, Math.ceil(totalDur / 3.5)));
  const sliceDur = totalDur / numScenes;
  const cutoutShotSequence: SceneSegment["shotType"][] = [
    "sam_cutout",
    "sam_cutout",
    "fullscreen_animation",
    "sam_cutout",
    "fullscreen_speaker",
  ];

  return Array.from({ length: numScenes }).map((_, idx) => {
    const sStart = +(idx * sliceDur).toFixed(2);
    const sEnd = +((idx + 1) * sliceDur).toFixed(2);
    const sceneWords = words.filter(
      (w) => w.start >= sStart - 0.1 && w.start < sEnd + 0.05
    );
    const spokenText =
      sceneWords.map((w) => w.word).join(" ") ||
      beats[idx]?.script ||
      topic ||
      `Scene ${idx + 1}`;

    const plan = buildSceneDialoguePlan(
      sceneWords,
      spokenText,
      beats[idx]?.headline || beats[idx]?.label,
      sStart,
      sEnd
    );
    const storyArchetype = inferStoryVisualArchetype(spokenText, "", plan.headlineText, "");

    let shotType: SceneSegment["shotType"] = isCutoutTemplate
      ? cutoutShotSequence[idx % cutoutShotSequence.length]
      : idx === 2
      ? "fullscreen_animation"
      : "fullscreen_speaker";

    const matchedGalleryClip = beats[idx]?.assetUrl
      ? { id: beats[idx].id || `gallery-${idx}`, name: beats[idx].galleryClipName || "Gallery clip", url: beats[idx].assetUrl, kind: beats[idx].galleryClipKind || "video", tags: [] }
      : isGalleryTemplate
      ? matchGalleryClipForScene(
          spokenText,
          plan.headlineText,
          effectiveGalleryClips,
          usedGalleryClipIds,
          idx,
          idx > 0 && shotType === "fullscreen_animation"
        )
      : undefined;
    if (isGalleryTemplate && matchedGalleryClip && idx > 0) {
      shotType = "fullscreen_animation";
    }

    const cutawayWindow =
      shotType === "fullscreen_animation" && !isCutoutTemplate && !isGalleryTemplate
        ? {
            start: sStart,
            end: +(sStart + Math.min(sliceDur, 3.2)).toFixed(2),
          }
        : undefined;

    const yappingPopups = buildYappingPopupsForScene(
      sceneWords,
      spokenText,
      sStart,
      sEnd,
      "",
      plan.headlineText,
      idx
    );

    return {
      id: `auto-scene-${idx + 1}`,
      start: sStart,
      end: sEnd,
      shotType,
      visualKind: plan.visualKind,
      storyArchetype,
      visualRecipe: beats[idx]?.visualRecipe,
      cutawayWindow,
      yappingPopups,
      spokenReference: spokenText,
      headlineText: plan.headlineText,
      subLabel: plan.subLabel,
      contrast: plan.contrast,
      steps: plan.steps,
      faceCallouts: plan.faceCallouts,
      assetUrl: matchedGalleryClip?.url,
      galleryClipName: matchedGalleryClip?.name,
      galleryClipKind: matchedGalleryClip?.kind,
      assetStart: beats[idx]?.assetStart,
      assetDuration: beats[idx]?.assetDuration,
      cameraZoom: idx % 2 === 0 ? 1.0 : 1.08,
      animationLeadInSec: shotType === "sam_cutout" ? (idx === 0 ? 0.75 : 0.45) : undefined,
      samCutoutUrl,
      samTrackUrl,
      samBox,
    };
  });
}

// ============================================================================
// DETERMINISTIC 1080×1920 2D CANVAS COMPOSITOR (100% PREVIEW & MP4 PARITY)
// ============================================================================

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(x: number): number {
  const t = clamp01(x);
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(x: number): number {
  const t = clamp01(x);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Traces an exact human head-and-shoulders character cutout silhouette path inside (x, y, w, h).
 * Isolates the speaker character and strips away the rectangular room background corners.
 */
function traceCharacterSilhouettePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const cx = x + w * 0.5;
  ctx.beginPath();
  // Start at bottom-left torso base
  ctx.moveTo(x + w * 0.04, y + h * 0.94);
  // Left torso & shoulder slope up to left neck
  ctx.bezierCurveTo(
    x + w * 0.01,
    y + h * 0.66,
    x + w * 0.08,
    y + h * 0.49,
    x + w * 0.30,
    y + h * 0.43
  );
  // Left jawline & ear up to left temple
  ctx.bezierCurveTo(
    x + w * 0.23,
    y + h * 0.35,
    x + w * 0.22,
    y + h * 0.19,
    x + w * 0.31,
    y + h * 0.09
  );
  // Top of head crown
  ctx.bezierCurveTo(
    x + w * 0.39,
    y + h * 0.01,
    x + w * 0.61,
    y + h * 0.01,
    x + w * 0.69,
    y + h * 0.09
  );
  // Right temple & ear down to right neck
  ctx.bezierCurveTo(
    x + w * 0.78,
    y + h * 0.19,
    x + w * 0.77,
    y + h * 0.35,
    x + w * 0.70,
    y + h * 0.43
  );
  // Right neck out to right shoulder & torso base
  ctx.bezierCurveTo(
    x + w * 0.92,
    y + h * 0.49,
    x + w * 0.99,
    y + h * 0.66,
    x + w * 0.96,
    y + h * 0.94
  );
  // Smooth rounded bottom base
  ctx.quadraticCurveTo(cx, y + h * 1.0, x + w * 0.04, y + h * 0.94);
  ctx.closePath();
}

export interface SamTrackFrame {
  t: number;
  frameIndex: number;
  b: [number, number, number, number];
  enc: "lossless" | "one_bit";
  payload: string;
  w: number;
  h: number;
}

export interface SamMaskTrack {
  version: 1;
  fps: number;
  sourceWidth: number;
  sourceHeight: number;
  objectId: string;
  union: { nx: number; ny: number; nw: number; nh: number };
  frames: SamTrackFrame[];
}

export const SAM_TRACKS_CACHE = new Map<string, SamMaskTrack>();
const PENDING_TRACK_FETCHES = new Set<string>();

export function getOrFetchSamTrack(url?: string): SamMaskTrack | null {
  if (!url) return null;
  const existing = SAM_TRACKS_CACHE.get(url);
  if (existing) return existing;
  if (typeof window !== "undefined" && !PENDING_TRACK_FETCHES.has(url)) {
    PENDING_TRACK_FETCHES.add(url);
    fetch(url)
      .then(async (r) => {
        if (!r.ok && url.includes("/assets/")) {
          const match = url.match(/\/assets\/([^/]+)\/(sam_track\.json)/);
          if (match) {
            const fallbackResp = await fetch(`/api/pipeline-b/media/${match[1]}/sam-track`);
            if (fallbackResp.ok) return fallbackResp;
          }
        }
        return r;
      })
      .then((r) => (r && r.ok ? r.json() : null))
      .then((data: any) => {
        if (data && Array.isArray(data.frames)) {
          SAM_TRACKS_CACHE.set(url, data as SamMaskTrack);
        }
      })
      .catch(() => {})
      .finally(() => {
        PENDING_TRACK_FETCHES.delete(url);
      });
  }
  return null;
}

function findClosestTrackFrame(track: SamMaskTrack, currentTime: number): SamTrackFrame | null {
  const frames = track.frames;
  if (!frames || frames.length === 0) return null;
  const targetT = Math.max(0, currentTime);
  const targetIdx = Math.round(targetT * track.fps);

  const direct = frames[targetIdx];
  if (direct && direct.frameIndex === targetIdx) return direct;

  let low = 0;
  let high = frames.length - 1;
  let best = frames[0];
  let minDiff = Math.abs(best.t - targetT);

  while (low <= high) {
    const mid = (low + high) >> 1;
    const f = frames[mid];
    const diff = Math.abs(f.t - targetT);
    if (diff < minDiff) {
      minDiff = diff;
      best = f;
    }
    if (f.t < targetT) {
      low = mid + 1;
    } else if (f.t > targetT) {
      high = mid - 1;
    } else {
      return f;
    }
  }
  return best;
}

interface CachedFrameMask {
  canvas: HTMLCanvasElement;
  path?: Path2D;
  key: string;
}

const DECODED_FRAME_CANVASES = new Map<string, CachedFrameMask>();
const MAX_DECODED_FRAME_CANVASES = 180;

function getDecodedFrameMask(frame: SamTrackFrame, objectId: string): CachedFrameMask | null {
  if (typeof document === "undefined") return null;
  const key = `${objectId}:${frame.frameIndex}:${frame.w}x${frame.h}:${frame.payload.slice(0, 16)}`;
  const existing = DECODED_FRAME_CANVASES.get(key);
  if (existing) return existing;

  try {
    const maskObj = {
      encoding: frame.enc,
      payload: frame.payload,
      width: frame.w,
      height: frame.h,
    } as const;
    const binaryRaster = decodeMaskToRaster(maskObj);
    if (binaryRaster.length !== frame.w * frame.h) return null;

    const mCanvas = document.createElement("canvas");
    mCanvas.width = frame.w;
    mCanvas.height = frame.h;
    const mCtx = mCanvas.getContext("2d");
    if (!mCtx) return null;

    const rgba = new Uint8ClampedArray(frame.w * frame.h * 4);
    for (let i = 0; i < binaryRaster.length; i++) {
      const alpha = binaryRaster[i] === 1 ? 255 : 0;
      const off = i * 4;
      rgba[off] = alpha;
      rgba[off + 1] = alpha;
      rgba[off + 2] = alpha;
      rgba[off + 3] = alpha;
    }
    mCtx.putImageData(new ImageData(rgba, frame.w, frame.h), 0, 0);

    let path: Path2D | undefined;
    if (typeof Path2D !== "undefined") {
      try {
        const svgStr = decodeMaskToSVGPath(maskObj);
        if (svgStr) path = new Path2D(svgStr);
      } catch {}
    }

    const item: CachedFrameMask = { canvas: mCanvas, path, key };
    if (DECODED_FRAME_CANVASES.size >= MAX_DECODED_FRAME_CANVASES) {
      const firstKey = DECODED_FRAME_CANVASES.keys().next().value;
      if (firstKey) DECODED_FRAME_CANVASES.delete(firstKey);
    }
    DECODED_FRAME_CANVASES.set(key, item);
    return item;
  } catch {
    return null;
  }
}

let cachedCutoutCanvas: HTMLCanvasElement | null = null;
let cachedCutoutCtx: CanvasRenderingContext2D | null = null;
let cachedMaskCanvas: HTMLCanvasElement | null = null;
let cachedMaskPayloadKey: string | null = null;
let cachedSvgPathStr: string | null = null;
let cachedPath2D: Path2D | null = null;

/**
 * Renders the exact SAM 3.1 isolated speaker character onto `ctx` at `(cutX, cutY, cutW, cutH)`.
 * When a frame-by-frame SAM 3.1 track (`sam_track.json`) is available, it continuously tracks and cuts
 * out the character frame-by-frame as they speak and move across the entire video.
 * Otherwise, it falls back to the exact single-frame SAM 3.1 raster mask.
 */
function drawExactSamCharacterCutout(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  cutX: number,
  cutY: number,
  cutW: number,
  cutH: number,
  samBox?: SceneSegment["samBox"],
  samCutoutImg?: HTMLImageElement,
  accentColor = "#FF5A36",
  highlightColor = "#FFE600",
  currentTime = 0
) {
  if (typeof document === "undefined") return;
  if (!cachedCutoutCanvas) {
    cachedCutoutCanvas = document.createElement("canvas");
    cachedCutoutCtx = cachedCutoutCanvas.getContext("2d", { willReadFrequently: true });
  }
  const offCanvas = cachedCutoutCanvas;
  const offCtx = cachedCutoutCtx;
  if (!offCanvas || !offCtx) return;

  const rw = Math.round(cutW);
  const rh = Math.round(cutH);
  if (offCanvas.width !== rw || offCanvas.height !== rh) {
    offCanvas.width = rw;
    offCanvas.height = rh;
  }
  offCtx.clearRect(0, 0, rw, rh);

  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const sb = samBox || { normX: 0.0, normY: 0.22, normW: 1.0, normH: 0.76 };
  const pad = 10;
  const availW = rw - pad * 2;
  const availH = rh - pad * 2;

  // 1. Check for Frame-by-Frame SAM 3.1 Track (`sam_track.json`)
  const trackUrl = sb.trackUrl;
  const track = getOrFetchSamTrack(trackUrl);
  const trackFrame = track ? findClosestTrackFrame(track, currentTime) : null;
  const decodedFrame = track && trackFrame ? getDecodedFrameMask(trackFrame, track.objectId) : null;

  offCtx.save();

  if (decodedFrame && trackFrame && track) {
    // Exact frame-by-frame SAM 3.1 mask tracking the moving speaker
    const sx = Math.max(0, trackFrame.b[0] * vw);
    const sy = Math.max(0, trackFrame.b[1] * vh);
    const sw = Math.max(16, Math.min(vw - sx, (trackFrame.b[2] - trackFrame.b[0]) * vw));
    const sh = Math.max(16, Math.min(vh - sy, (trackFrame.b[3] - trackFrame.b[1]) * vh));

    const maskW = trackFrame.w;
    const maskH = trackFrame.h;
    const scale = Math.min(availW / maskW, availH / maskH);
    const drawW = maskW * scale;
    const drawH = maskH * scale;
    const drawX = (rw - drawW) / 2;
    const drawY = rh - drawH - pad;

    offCtx.drawImage(videoEl, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
    offCtx.globalCompositeOperation = "destination-in";
    offCtx.drawImage(decodedFrame.canvas, 0, 0, maskW, maskH, drawX, drawY, drawW, drawH);
    offCtx.globalCompositeOperation = "source-over";

    if (decodedFrame.path) {
      offCtx.save();
      offCtx.globalCompositeOperation = "destination-over";
      offCtx.translate(drawX, drawY);
      offCtx.scale(scale, scale);
      offCtx.lineJoin = "round";
      offCtx.lineCap = "round";
      offCtx.lineWidth = Math.max(8, 12 / scale);
      offCtx.strokeStyle = "#FFFFFF";
      offCtx.stroke(decodedFrame.path);
      offCtx.restore();
    }
  } else {
    // 2. Fallback: Static Single-Frame SAM 3.1 Mask
    const maskW = sb.maskWidth || vw;
    const maskH = sb.maskHeight || vh;

    if (sb.maskPayload && maskW > 0 && maskH > 0) {
      const key = `${maskW}x${maskH}:${sb.maskEncoding || "lossless"}:${sb.maskPayload}`;
      if (cachedMaskPayloadKey !== key || !cachedMaskCanvas) {
        try {
          const maskObj = {
            encoding: sb.maskEncoding || (sb.maskPayload.startsWith("~") ? "lossless" : "one_bit"),
            payload: sb.maskPayload,
            width: maskW,
            height: maskH,
          } as const;
          const binaryRaster = decodeMaskToRaster(maskObj);
          if (binaryRaster.length === maskW * maskH) {
            const mCanvas = document.createElement("canvas");
            mCanvas.width = maskW;
            mCanvas.height = maskH;
            const mCtx = mCanvas.getContext("2d");
            if (mCtx) {
              const rgba = new Uint8ClampedArray(maskW * maskH * 4);
              for (let i = 0; i < binaryRaster.length; i++) {
                const alpha = binaryRaster[i] === 1 ? 255 : 0;
                const offset = i * 4;
                rgba[offset] = alpha;
                rgba[offset + 1] = alpha;
                rgba[offset + 2] = alpha;
                rgba[offset + 3] = alpha;
              }
              mCtx.putImageData(new ImageData(rgba, maskW, maskH), 0, 0);
              cachedMaskCanvas = mCanvas;
              cachedMaskPayloadKey = key;
            }
          }
          if (!sb.maskSvgPath) {
            sb.maskSvgPath = decodeMaskToSVGPath(maskObj);
          }
        } catch {}
      }
    }

    let exactSamPath: Path2D | null = null;
    if (sb.maskSvgPath && typeof Path2D !== "undefined") {
      try {
        if (cachedSvgPathStr !== sb.maskSvgPath || !cachedPath2D) {
          cachedSvgPathStr = sb.maskSvgPath;
          cachedPath2D = new Path2D(sb.maskSvgPath);
        }
        exactSamPath = cachedPath2D;
      } catch {
        exactSamPath = null;
      }
    }

    const sx = Math.max(0, sb.normX * vw);
    const sy = Math.max(0, sb.normY * vh);
    const sw = Math.max(64, Math.min(vw - sx, sb.normW * vw));
    const sh = Math.max(64, Math.min(vh - sy, sb.normH * vh));

    const scale = Math.min(availW / maskW, availH / maskH);
    const drawW = maskW * scale;
    const drawH = maskH * scale;
    const drawX = (rw - drawW) / 2;
    const drawY = rh - drawH - pad;

    if (cachedMaskCanvas) {
      offCtx.drawImage(videoEl, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
      offCtx.globalCompositeOperation = "destination-in";
      offCtx.drawImage(cachedMaskCanvas, 0, 0, maskW, maskH, drawX, drawY, drawW, drawH);
      offCtx.globalCompositeOperation = "source-over";

      if (exactSamPath) {
        offCtx.save();
        offCtx.globalCompositeOperation = "destination-over";
        offCtx.translate(drawX, drawY);
        offCtx.scale(scale, scale);
        offCtx.lineJoin = "round";
        offCtx.lineCap = "round";
        offCtx.lineWidth = Math.max(8, 12 / scale);
        offCtx.strokeStyle = "#FFFFFF";
        offCtx.stroke(exactSamPath);
        offCtx.restore();
      }
    } else if (exactSamPath && maskW > 0 && maskH > 0) {
      offCtx.translate(drawX, drawY);
      offCtx.scale(scale, scale);
      offCtx.lineJoin = "round";
      offCtx.lineCap = "round";
      offCtx.lineWidth = Math.max(8, 12 / scale);
      offCtx.strokeStyle = "#FFFFFF";
      offCtx.stroke(exactSamPath);
      offCtx.clip(exactSamPath);
      offCtx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, maskW, maskH);
    } else if (samCutoutImg && samCutoutImg.complete && samCutoutImg.naturalWidth > 0) {
      offCtx.drawImage(videoEl, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
      offCtx.globalCompositeOperation = "destination-in";
      offCtx.drawImage(samCutoutImg, drawX, drawY, drawW, drawH);
      offCtx.globalCompositeOperation = "source-over";
    } else {
      traceCharacterSilhouettePath(offCtx, 0, 0, rw, rh);
      offCtx.clip();
      offCtx.drawImage(videoEl, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
    }
  }

  offCtx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.82)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(offCanvas, cutX, cutY, cutW, cutH);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 18;
  ctx.drawImage(offCanvas, cutX, cutY, cutW, cutH);
  ctx.restore();
}

/**
 * Picks a distinct animation archetype per scene so Auto-Edit never repeats the same card:
 * 0 = spotlight card, 1 = kinetic big-word stack, 2 = stat counter ring, 3 = orbit/radial nodes, 4 = spoken quote reveal
 */
function pickSpotlightVariant(scene: SceneSegment, idx: number): number {
  const hasNum = /\d/.test(scene.spokenReference || "");
  const order = [1, 2, 3, 4, 0];
  let v = order[((idx % order.length) + order.length) % order.length];
  if (v === 2 && !hasNum) v = 3;
  return v;
}

function sceneContentWords(scene: SceneSegment): string[] {
  const raw = (scene.spokenReference || scene.headlineText || "")
    .replace(/[^a-zA-Z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()));
  return raw.length > 0 ? raw : (scene.headlineText || "KEY IDEA").split(/\s+/);
}

function drawVariantBigWords(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scene: SceneSegment,
  t: number,
  palette: VisualPalette,
  yShift: number
) {
  const dt = Math.max(0, t - scene.start);
  const words = scene.headlineText.split(/\s+/).filter(Boolean).slice(0, 4);
  const lineH = 190;
  const startY = H / 2 - yShift - ((words.length - 1) * lineH) / 2 - 40;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  words.forEach((w, i) => {
    const local = Math.max(0, dt - i * 0.16);
    const k = easeOutBack(local / 0.32);
    const a = clamp01(local / 0.14);
    const y = startY + i * lineH;
    const isHot = i === words.length - 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, y);
    ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    ctx.rotate((i % 2 === 0 ? -1 : 1) * 0.025 * (1 - clamp01(local / 0.4)));
    ctx.font = "900 168px 'Montserrat', 'Inter', sans-serif";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.strokeText(w.toUpperCase(), 0, 0);
    ctx.fillStyle = isHot ? palette.highlight : palette.primaryText;
    ctx.fillText(w.toUpperCase(), 0, 0);
    ctx.restore();
  });
  // accent underline sweep
  const sweep = easeOutCubic(dt / 0.7);
  const uy = startY + (words.length - 1) * lineH + 120;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 330 * sweep, uy, 660 * sweep, 18, 9);
  ctx.fill();
  ctx.restore();
}

function drawVariantStat(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scene: SceneSegment,
  t: number,
  palette: VisualPalette,
  yShift: number
) {
  const dt = Math.max(0, t - scene.start);
  const m = (scene.spokenReference || "").match(/(\d[\d,.]*)\s*([a-zA-Z%]+)?/);
  const target = m ? parseFloat(m[1].replace(/,/g, "")) || 0 : 0;
  const unit = (m?.[2] || "").toUpperCase();
  const prog = easeOutCubic(dt / 0.9);
  const shown = Math.round(target * prog);
  const cx = W / 2;
  const cy = H / 2 - yShift - 40;
  const R = 330;
  ctx.save();
  ctx.lineWidth = 34;
  ctx.strokeStyle = palette.isDarkCanvas ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = palette.accent;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog * 0.82);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 210px 'Instrument Serif', Georgia, serif";
  ctx.fillStyle = palette.primaryText;
  ctx.fillText(String(shown), cx, cy - 20);
  ctx.font = "800 48px 'JetBrains Mono', monospace";
  ctx.fillStyle = palette.highlight;
  ctx.fillText(unit || "KEY STAT", cx, cy + 120);
  ctx.font = "700 40px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.fillStyle = palette.secondaryText;
  const lines = wrapCanvasText(ctx, scene.headlineText, 780, 2);
  lines.forEach((ln, i) => ctx.fillText(ln, cx, cy + R + 90 + i * 54));
  ctx.restore();
}

function drawVariantOrbit(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scene: SceneSegment,
  t: number,
  palette: VisualPalette,
  yShift: number
) {
  const dt = Math.max(0, t - scene.start);
  const words = sceneContentWords(scene).slice(0, 5);
  const cx = W / 2;
  const cy = H / 2 - yShift - 30;
  const R = 330;
  const spin = t * 0.35;
  const keys: IconKey[] = ["sparkles", "zap", "rocket", "check", "clock"];
  ctx.save();
  ctx.strokeStyle = palette.accent + "55";
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 14]);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  words.forEach((w, i) => {
    const ang = spin + (i / words.length) * Math.PI * 2 - Math.PI / 2;
    const local = clamp01((dt - i * 0.12) / 0.3);
    const rr = R * easeOutCubic(local);
    const nx = cx + Math.cos(ang) * rr;
    const ny = cy + Math.sin(ang) * rr;
    ctx.globalAlpha = local;
    ctx.strokeStyle = palette.accent + "88";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.fillStyle = palette.cardBg;
    ctx.beginPath();
    ctx.arc(nx, ny, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.accent;
    ctx.stroke();
    drawCanvasIcon(ctx, inferIconKey(w) === "sparkles" ? keys[i % keys.length] : inferIconKey(w), nx, ny, 46, palette.accent);
    ctx.font = "800 30px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = palette.primaryText;
    ctx.fillText(truncateTextToWidth(ctx, w.toUpperCase(), 220), nx, ny + 100);
  });
  ctx.globalAlpha = 1;
  const pulse = 1 + 0.05 * Math.sin(t * 4);
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, 120 * pulse, 0, Math.PI * 2);
  ctx.fill();
  drawCanvasIcon(ctx, inferIconKey(scene.spokenReference), cx, cy, 96, "#FFFFFF");
  ctx.restore();
}

function drawVariantQuote(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scene: SceneSegment,
  t: number,
  palette: VisualPalette,
  yShift: number
) {
  const dt = Math.max(0, t - scene.start);
  const dur = Math.max(1, scene.end - scene.start);
  const tokens = (scene.spokenReference || scene.headlineText).split(/\s+/).filter(Boolean).slice(0, 18);
  const revealed = Math.min(tokens.length, Math.ceil((dt / (dur * 0.9)) * tokens.length));
  const cardW = 900;
  const cardH = 640;
  const cardX = (W - cardW) / 2;
  const cardY = H / 2 - yShift - cardH / 2 - 30;
  ctx.save();
  ctx.fillStyle = palette.cardBg;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 56);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = palette.cardBorder;
  ctx.stroke();
  ctx.font = "900 240px 'Instrument Serif', Georgia, serif";
  ctx.fillStyle = palette.accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("\u201C", cardX + 50, cardY - 10);
  ctx.font = "700 62px 'Plus Jakarta Sans', 'Inter', sans-serif";
  ctx.textBaseline = "middle";
  let x = cardX + 70;
  let y = cardY + 230;
  const maxX = cardX + cardW - 70;
  tokens.forEach((tok, i) => {
    const wW = ctx.measureText(tok + " ").width;
    if (x + wW > maxX) {
      x = cardX + 70;
      y += 84;
    }
    const on = i < revealed;
    const latest = i === revealed - 1;
    ctx.globalAlpha = on ? 1 : 0.18;
    ctx.fillStyle = latest ? palette.highlight : palette.primaryText;
    ctx.fillText(tok, x, y);
    x += wW;
  });
  ctx.restore();
}

function truncateTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + "…";
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length >= maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(" ");
        lines.push(truncateTextToWidth(ctx, rest, maxWidth));
        return lines;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * Draws crisp vector Lucide-style icons directly onto the 1080×1920 2D Canvas.
 */
export function drawCanvasIcon(
  ctx: CanvasRenderingContext2D,
  iconKey: IconKey | "layers",
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = size / 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.11);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (iconKey) {
    case "scissors": {
      ctx.beginPath();
      ctx.arc(-r * 0.45, -r * 0.45, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.45, r * 0.45, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.25);
      ctx.lineTo(r * 0.75, r * 0.65);
      ctx.moveTo(-r * 0.2, r * 0.25);
      ctx.lineTo(r * 0.75, -r * 0.65);
      ctx.stroke();
      break;
    }
    case "captions": {
      ctx.beginPath();
      ctx.roundRect(-r * 0.78, -r * 0.62, r * 1.56, r * 1.15, r * 0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.18);
      ctx.lineTo(r * 0.42, -r * 0.18);
      ctx.moveTo(-r * 0.42, r * 0.18);
      ctx.lineTo(r * 0.15, r * 0.18);
      ctx.stroke();
      break;
    }
    case "sparkles": {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.82);
      ctx.quadraticCurveTo(0, 0, r * 0.82, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 0.82);
      ctx.quadraticCurveTo(0, 0, -r * 0.82, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 0.82);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "sound": {
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.25);
      ctx.lineTo(-r * 0.35, -r * 0.25);
      ctx.lineTo(r * 0.1, -r * 0.65);
      ctx.lineTo(r * 0.1, r * 0.65);
      ctx.lineTo(-r * 0.35, r * 0.25);
      ctx.lineTo(-r * 0.75, r * 0.25);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.22, 0, r * 0.42, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      break;
    }
    case "clock": {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.45);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.35, r * 0.22);
      ctx.stroke();
      break;
    }
    case "rocket": {
      ctx.beginPath();
      ctx.moveTo(r * 0.65, -r * 0.65);
      ctx.quadraticCurveTo(r * 0.65, r * 0.25, -r * 0.2, r * 0.55);
      ctx.lineTo(-r * 0.55, r * 0.2);
      ctx.quadraticCurveTo(-r * 0.25, -r * 0.65, r * 0.65, -r * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.15, -r * 0.15, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "zap": {
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.8);
      ctx.lineTo(-r * 0.65, r * 0.08);
      ctx.lineTo(-r * 0.05, r * 0.08);
      ctx.lineTo(-r * 0.1, r * 0.8);
      ctx.lineTo(r * 0.65, -r * 0.08);
      ctx.lineTo(r * 0.05, -r * 0.08);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "layers": {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(r * 0.78, -r * 0.25);
      ctx.lineTo(0, r * 0.2);
      ctx.lineTo(-r * 0.78, -r * 0.25);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, r * 0.2);
      ctx.lineTo(0, r * 0.65);
      ctx.lineTo(r * 0.78, r * 0.2);
      ctx.stroke();
      break;
    }
    default: {
      // check circle
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.34, r * 0.02);
      ctx.lineTo(-r * 0.08, r * 0.28);
      ctx.lineTo(r * 0.38, -r * 0.24);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/**
 * Draws an AI-Directed Yapping Style Spatial Pop-Up Motion Graphic on A-Roll ("fullscreen_speaker").
 * Synced to 2.0s–2.8s word sub-beats and placed dynamically across 5 safe spatial zones
 * ("top-right", "top-left", "mid-right", "mid-left", "top-center") around the speaker's face.
 * Never collides with or repeats the Subtitle Studio (CC) captions at the bottom.
 */
function drawStoryPopUpMotionOnSpeaker(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scene: SceneSegment,
  t: number,
  palette: VisualPalette
) {
  const popups =
    scene.yappingPopups && scene.yappingPopups.length > 0
      ? scene.yappingPopups
      : buildYappingPopupsForScene(
          [],
          scene.spokenReference || "",
          scene.start,
          scene.end,
          scene.motionIntent || "",
          scene.headlineText || "",
          0
        );

  let activeBeat =
    popups.find((p) => t >= p.start - 0.04 && t <= p.end + 0.04) || popups[0];
  if (!activeBeat) return;

  const beatDt = Math.max(0, t - activeBeat.start);
  const beatRem = Math.max(0, activeBeat.end - t);
  const enterScale = 0.72 + 0.28 * easeOutBack(Math.min(1, beatDt / 0.24));
  const exitScale = beatRem < 0.16 ? 0.88 + 0.12 * clamp01(beatRem / 0.16) : 1.0;
  const popScale = enterScale * exitScale;
  const popAlpha = clamp01(beatDt / 0.14) * (beatRem < 0.14 ? clamp01(beatRem / 0.14) : 1);
  const floatY = Math.sin(t * 4.2) * 6;

  // Resolve spatial zone around speaker's face so pop-ups move dynamically across the screen
  let cx = W - 215;
  let cy = 265;
  let tiltDeg = -4.5;
  switch (activeBeat.zone) {
    case "top-left":
      cx = 215;
      cy = 265;
      tiltDeg = 4.5;
      break;
    case "top-right":
      cx = W - 215;
      cy = 265;
      tiltDeg = -4.5;
      break;
    case "mid-left":
      cx = 210;
      cy = 535;
      tiltDeg = 3.5;
      break;
    case "mid-right":
      cx = W - 210;
      cy = 535;
      tiltDeg = -3.5;
      break;
    case "top-center":
      cx = W / 2;
      cy = 215;
      tiltDeg = 0;
      break;
  }

  ctx.save();
  ctx.globalAlpha = popAlpha;
  ctx.translate(cx, cy + floatY);
  ctx.rotate((tiltDeg * Math.PI) / 180);
  ctx.scale(popScale, popScale);

  // Wonder's validated per-scene recipe drives the actual animated objects.
  // Older saved plans without a recipe continue through the legacy renderer below.
  if (scene.visualRecipe?.objects?.length) {
    const box = { x: -158, y: -112, w: 316, h: 224 };
    ctx.fillStyle = "rgba(9, 12, 20, 0.88)";
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 28);
    ctx.fill();
    ctx.stroke();
    drawWonderVisualRecipe(ctx, scene.visualRecipe, t - activeBeat.start, box, palette);
    ctx.restore();
    return;
  }

  // Ambient glow behind pop-up object
  const glow = ctx.createRadialGradient(0, 0, 16, 0, 0, 175);
  glow.addColorStop(0, palette.accent + "88");
  glow.addColorStop(1, palette.accent + "00");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 175, 0, Math.PI * 2);
  ctx.fill();

  const prop = activeBeat.propKind;

  if (prop === "stealing_radar") {
    // Sweeping Radar Lock + "TIME THIEF" Scanner Pop-Up
    const r = 112;
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(12, 15, 24, 0.94)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#EF4444";
    ctx.stroke();

    // Concentric radar rings
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
    for (const rr of [42, 76]) {
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rotating radar sweep beam
    const sweepAng = t * 5.2;
    ctx.fillStyle = "rgba(239, 68, 68, 0.34)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r - 8, sweepAng, sweepAng + 0.75);
    ctx.closePath();
    ctx.fill();

    // Pulsing target lock blip
    const blipPulse = 6 + 4 * Math.sin(t * 10);
    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    ctx.arc(28, -24, blipPulse, 0, Math.PI * 2);
    ctx.fill();

    // Bottom pill tag
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.roundRect(-102, r - 18, 204, 46, 23);
    ctx.fill();
    ctx.font = "900 22px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`🚨 ${activeBeat.chipLabel}`, 0, r + 5);
  } else if (prop === "diamond_value") {
    // Glowing Faceted Diamond + "MOST VALUABLE" Vault Card
    const cw = 236;
    const ch = 215;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "rgba(14, 17, 28, 0.94)";
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 36);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = palette.highlight;
    ctx.stroke();

    // Animated rotating/pulsing diamond vector
    const dScale = 1 + 0.08 * Math.sin(t * 5.5);
    ctx.save();
    ctx.translate(0, -24);
    ctx.scale(dScale, dScale);
    ctx.fillStyle = "#38BDF8";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-36, -34);
    ctx.lineTo(36, -34);
    ctx.lineTo(58, -8);
    ctx.lineTo(0, 48);
    ctx.lineTo(-58, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    ctx.roundRect(-98, ch / 2 - 58, 196, 44, 22);
    ctx.fill();
    ctx.font = "900 21px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`💎 ${activeBeat.chipLabel}`, 0, ch / 2 - 36);
  } else if (prop === "phone_timer") {
    // 3D-tilted Smartphone Pop-Up + Ticking 05:00 Timer Badge
    const pw = 186;
    const ph = 300;
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#11131A";
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 34);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 5;
    ctx.strokeStyle = palette.highlight;
    ctx.stroke();

    const sx = -pw / 2 + 12;
    const sy = -ph / 2 + 16;
    const sw = pw - 24;
    const sh = ph - 32;
    const scrGrad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    scrGrad.addColorStop(0, "#1F2437");
    scrGrad.addColorStop(1, "#0F121C");
    ctx.fillStyle = scrGrad;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 24);
    ctx.fill();

    // Dynamic notch
    ctx.fillStyle = "#07080D";
    ctx.beginPath();
    ctx.roundRect(-28, sy + 8, 56, 12, 6);
    ctx.fill();

    // Scrolling mini feed cards inside phone
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(sx + 8, sy + 28, sw - 16, sh - 84, 16);
    ctx.clip();
    const scrollOffset = (t * 95) % 86;
    for (let i = -1; i < 3; i++) {
      const cardY = sy + 34 + i * 64 - scrollOffset;
      ctx.fillStyle = i % 2 === 0 ? palette.accent + "CC" : "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.roundRect(sx + 14, cardY, sw - 28, 50, 12);
      ctx.fill();
    }
    ctx.restore();

    const mins = Math.min(60, 5 + Math.floor(beatDt * 18));
    const chipW = 168;
    const chipH = 52;
    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    ctx.roundRect(-chipW / 2, ph / 2 - 40, chipW, chipH, 26);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111111";
    ctx.stroke();

    ctx.font = "900 26px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`⏱ ${String(mins).padStart(2, "0")}:00`, 0, ph / 2 - 14);
  } else if (prop === "time_drain") {
    // High-Speed Spinning Chronograph Clock Pop-Up with Draining Time Arc
    const r = 116;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "rgba(14, 17, 26, 0.94)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.stroke();

    const sweep = clamp01(0.25 + (beatDt % 2.0) / 2.0) * Math.PI * 1.85;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, r - 12, -Math.PI / 2, -Math.PI / 2 + sweep);
    ctx.stroke();

    const minAng = t * 7.5;
    const hrAng = t * 1.6;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hrAng) * 46, Math.sin(hrAng) * 46);
    ctx.stroke();

    ctx.strokeStyle = palette.highlight;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(minAng) * 74, Math.sin(minAng) * 74);
    ctx.stroke();

    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.roundRect(-96, r - 14, 192, 46, 23);
    ctx.fill();
    ctx.font = "900 22px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(activeBeat.chipLabel, 0, r + 9);
  } else if (prop === "social_feed") {
    // Floating 3D Social Reel Card Stack ("OTHERS' FEED")
    const cw = 228;
    const ch = 248;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(14, 17, 26, 0.94)";
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 36);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4;
    ctx.strokeStyle = palette.accent;
    ctx.stroke();

    // 2 sliding reel cards inside
    for (let i = 0; i < 2; i++) {
      const yOff = -62 + i * 66 - ((t * 48) % 32);
      ctx.fillStyle = i === 0 ? "rgba(255,255,255,0.16)" : palette.accent + "55";
      ctx.beginPath();
      ctx.roundRect(-cw / 2 + 22, yOff, cw - 44, 52, 16);
      ctx.fill();
      ctx.fillStyle = palette.highlight;
      ctx.beginPath();
      ctx.arc(-cw / 2 + 50, yOff + 26, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.roundRect(-96, ch / 2 - 54, 192, 42, 21);
    ctx.fill();
    ctx.font = "900 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`👁 ${activeBeat.chipLabel}`, 0, ch / 2 - 33);
  } else if (prop === "dream_target" || prop === "future_rocket") {
    // Glowing Target / Rocket Launch Trajectory Widget ("YOUR DREAMS" / "YOUR FUTURE")
    const cw = 236;
    const ch = 228;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(14, 17, 26, 0.94)";
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 36);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = palette.highlight;
    ctx.stroke();

    drawCanvasIcon(
      ctx,
      prop === "future_rocket" ? "rocket" : "sparkles",
      0,
      -26 + Math.sin(t * 6) * 5,
      78,
      palette.highlight
    );

    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    ctx.roundRect(-100, ch / 2 - 56, 200, 44, 22);
    ctx.fill();
    ctx.font = "900 21px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`🚀 ${activeBeat.chipLabel}`, 0, ch / 2 - 34);
  } else if (prop === "battery_alert") {
    // Animated Draining Battery + Urgent Low-Time Alert
    const bw = 220;
    const bh = 124;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(14, 17, 26, 0.94)";
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 28);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(bw / 2 + 4, -22, 12, 44, 5);
    ctx.fill();

    const pct = Math.max(0.1, 0.85 - (beatDt % 2.2) / 2.6);
    const fillW = (bw - 24) * pct;
    ctx.fillStyle = pct < 0.35 ? "#EF4444" : palette.highlight;
    ctx.beginPath();
    ctx.roundRect(-bw / 2 + 12, -bh / 2 + 12, fillW, bh - 24, 18);
    ctx.fill();

    ctx.font = "900 30px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`⚡ ${Math.round(pct * 100)}%`, 0, 0);
  } else if (prop === "build_blocks") {
    // Rising 3D Building Blocks + Rocket Pop-Up
    const boxW = 228;
    const boxH = 224;
    ctx.shadowColor = "rgba(0,0,0,0.58)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(14, 17, 26, 0.94)";
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 36);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = palette.highlight;
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const stepProg = easeOutBack(clamp01((beatDt - i * 0.14) / 0.3));
      const bw = 156 - i * 22;
      const bh = 38;
      const by = 44 - i * 46 - (1 - stepProg) * 32;
      ctx.globalAlpha = popAlpha * stepProg;
      ctx.fillStyle = i === 2 ? palette.highlight : palette.accent;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, by, bw, bh, 12);
      ctx.fill();
    }
    ctx.globalAlpha = popAlpha;
    ctx.font = "900 21px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`🚀 ${activeBeat.chipLabel}`, 0, 84);
  } else if (prop === "money_ticker" || prop === "metric_counter") {
    // Live Animated Bar Chart + Counter Pop-Up
    const boxW = 236;
    const boxH = 216;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(14, 17, 26, 0.94)";
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 34);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#10B981";
    ctx.stroke();

    // 4 rising bars
    for (let i = 0; i < 4; i++) {
      const p = easeOutCubic(clamp01((beatDt - i * 0.08) / 0.4));
      const bh = (32 + i * 22) * p;
      const bx = -72 + i * 38;
      ctx.fillStyle = i === 3 ? "#10B981" : palette.highlight;
      ctx.beginPath();
      ctx.roundRect(bx, 34 - bh, 26, Math.max(10, bh), 8);
      ctx.fill();
    }

    ctx.font = "900 22px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(activeBeat.chipLabel, 0, 72);
  } else if (prop === "code_terminal") {
    // macOS-Style Live Code Terminal Pop-Up
    const boxW = 244;
    const boxH = 196;
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#0D1117";
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 28);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4;
    ctx.strokeStyle = palette.accent;
    ctx.stroke();

    // Window traffic lights
    const dotColors = ["#EF4444", "#F59E0B", "#10B981"];
    dotColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(-boxW / 2 + 28 + i * 20, -boxH / 2 + 26, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Animated code lines
    for (let i = 0; i < 3; i++) {
      const wProg = easeOutCubic(clamp01((beatDt - i * 0.12) / 0.35));
      ctx.fillStyle = i === 1 ? palette.highlight : "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.roundRect(-boxW / 2 + 24, -24 + i * 26, (150 - i * 24) * wProg, 12, 6);
      ctx.fill();
    }

    ctx.font = "800 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.highlight;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`> ${activeBeat.chipLabel}`, 0, boxH / 2 - 28);
  } else {
    // Dynamic Script Glassmorphic UI Card tailored to the exact spoken words
    const boxW = 248;
    const boxH = 192;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(14, 17, 26, 0.92)";
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 34);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = palette.highlight;
    ctx.stroke();

    // Animated icon badge
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(0, -24, 42, 0, Math.PI * 2);
    ctx.fill();
    drawCanvasIcon(
      ctx,
      inferIconKey(activeBeat.chipLabel || scene.spokenReference),
      0,
      -24,
      46,
      "#FFFFFF"
    );

    ctx.font = "900 22px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(truncateTextToWidth(ctx, activeBeat.chipLabel, boxW - 32), 0, 54);
  }

  ctx.restore();
}

function drawWonderVisualRecipe(
  ctx: CanvasRenderingContext2D,
  recipe: NonNullable<SceneSegment["visualRecipe"]>,
  elapsed: number,
  bounds: { x: number; y: number; w: number; h: number },
  palette: VisualPalette
) {
  const positions: Record<string, [number, number]> = {
    "upper-left": [0.23, 0.28],
    "upper-right": [0.77, 0.28],
    center: [0.5, 0.52],
    "lower-left": [0.23, 0.76],
    "lower-right": [0.77, 0.76],
  };
  const objects = recipe.objects.slice(0, 5);
  const style = recipe.style || "procedural";
  const fallbackSlots: Array<keyof typeof positions> = objects.length <= 2
    ? ["upper-left", "lower-right", "upper-right", "lower-left", "center"]
    : ["upper-left", "upper-right", "center", "lower-left", "lower-right"];
  const occupiedSlots = new Set<string>();
  const backdropColors: [string, string] = style === "clay_3d"
    ? ["#FFF1D6", "#F2C06B"]
    : style === "paper_cut" || style === "paper_card"
    ? ["#FFF9EB", "#E8DDC8"]
    : style === "glass"
    ? ["#E5F7FF", "#A6DDF3"]
    : style === "anime"
    ? ["#FFF0F4", "#FFE2AC"]
    : style === "black_neon"
    ? ["#070A12", "#17152A"]
    : ["#FFF7E9", "#D8E9FA"];
  const recipeBg = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
  recipeBg.addColorStop(0, backdropColors[0]);
  recipeBg.addColorStop(1, backdropColors[1]);
  ctx.fillStyle = recipeBg;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
  const recipeGlow = ctx.createRadialGradient(bounds.x + bounds.w * 0.5, bounds.y + bounds.h * 0.42, 12, bounds.x + bounds.w * 0.5, bounds.y + bounds.h * 0.42, bounds.w * 0.72);
  recipeGlow.addColorStop(0, style === "black_neon" ? "rgba(94,75,190,0.48)" : "rgba(255,255,255,0.48)");
  recipeGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = recipeGlow;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
  objects.forEach((item, index) => {
    let resolvedPosition: keyof typeof positions = positions[item.position] ? item.position : "center";
    if (occupiedSlots.has(resolvedPosition)) {
      resolvedPosition = fallbackSlots.find((position) => !occupiedSlots.has(position)) || "center";
    }
    occupiedSlots.add(resolvedPosition);
    const [baseX, baseY] = positions[resolvedPosition];
    const phase = elapsed * 4 + index * 1.7;
    const scatterX = item.motion === "scatter" ? Math.sin(phase * 0.8) * 0.035 : 0;
    const scatterY = item.motion === "scatter" ? Math.cos(phase * 0.65) * 0.035 : 0;
    const float = item.motion === "rise" || item.motion === "scatter" ? -Math.min(bounds.h * 0.08, Math.max(0, elapsed) * 42) : 0;
    const slideX = item.motion === "slide" ? Math.sin(phase) * bounds.w * 0.035 : 0;
    const pulse = item.motion === "pulse" || item.motion === "unfold" ? 0.86 + Math.sin(phase) * 0.14 : 1;
    const orbit = item.motion === "orbit" ? phase * 0.35 : 0;
    const cx = bounds.x + bounds.w * (baseX + scatterX) + slideX;
    const cy = bounds.y + bounds.h * (baseY + scatterY) + float;
    // Scale recipe objects to the actual canvas region. The old fixed 82px marks
    // were tiny on a 1080x1920 frame and their 12px labels were nearly unreadable.
    const size = Math.min(
      bounds.w / (objects.length <= 2 ? 3.1 : objects.length >= 4 ? 4.0 : 3.45),
      bounds.h / 3.1
    ) * (index % 2 === 0 ? 1 : 0.9);
    const color = style === "clay_3d"
      ? (index % 2 === 0 ? "#F4A261" : "#E76F51")
      : style === "paper_cut" || style === "paper_card"
      ? (index % 2 === 0 ? "#D1495B" : "#00798C")
      : style === "black_neon"
      ? (index % 2 === 0 ? "#00F0FF" : "#FF2BD6")
      : style === "anime"
      ? (index % 2 === 0 ? "#FF3366" : "#FFE600")
      : ["#E8473F", "#2563EB", "#0F9D78", "#8B4FE8", "#D97706"][index % 5];

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(orbit + (item.shape === "diamond" ? Math.PI / 4 : 0));
    ctx.scale(pulse, pulse);
    ctx.shadowColor = color + "99";
    ctx.shadowBlur = style === "black_neon" ? 34 : style === "clay_3d" ? 30 : style === "glass" ? 26 : 18;
    ctx.shadowOffsetY = style === "clay_3d" ? 14 : style === "paper_cut" || style === "paper_card" ? 10 : 2;
    if (style === "clay_3d" && item.shape !== "line") {
      const clay = ctx.createRadialGradient(-size * 0.16, -size * 0.2, 2, 0, 0, size * 0.8);
      clay.addColorStop(0, "#FFF2D8");
      clay.addColorStop(0.35, color);
      clay.addColorStop(1, "#A94F3F");
      ctx.fillStyle = clay;
    } else if (style === "paper_card") {
      ctx.fillStyle = "#FFFDF7";
    } else if (style === "paper_cut") {
      ctx.fillStyle = color;
    } else if (style === "glass") {
      ctx.fillStyle = "rgba(255,255,255,0.78)";
    } else if (style === "black_neon") {
      ctx.fillStyle = item.shape === "line" ? color : "rgba(8,10,18,0.82)";
    } else {
      ctx.fillStyle = color;
    }
    ctx.strokeStyle = style === "paper_cut" || style === "paper_card" ? "#253247" : style === "glass" ? "#FFFFFF" : color;
    ctx.lineWidth = item.shape === "line" ? 9 : style === "black_neon" ? 5 : 4;
    ctx.beginPath();
    if (item.shape === "circle") ctx.arc(0, 0, size * 0.43, 0, Math.PI * 2);
    else if (item.shape === "diamond") {
      ctx.moveTo(0, -size * 0.48); ctx.lineTo(size * 0.48, 0);
      ctx.lineTo(0, size * 0.48); ctx.lineTo(-size * 0.48, 0); ctx.closePath();
    } else if (item.shape === "line") {
      ctx.moveTo(-size * 0.5, 0); ctx.lineTo(size * 0.5, 0);
    } else if (item.shape === "rect") ctx.roundRect(-size * 0.48, -size * 0.36, size * 0.96, size * 0.72, 12);
    if (item.shape === "line") ctx.stroke();
    else if (item.shape !== "text") {
      if (item.shape === "rect" && style === "paper_card") {
        ctx.fillStyle = "#FFFDF7";
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#2B2723";
        ctx.font = "800 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("SCENE NOTE", -size * 0.36, -size * 0.24, size * 0.7);
        ctx.fillStyle = color;
        ctx.font = "900 14px 'Montserrat', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(item.label || "").slice(0, 20), 0, size * 0.05, size * 0.78);
      } else {
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    // Draw a semantic pictogram from Wonder's concrete object label so the scene
    // reads as an illustration instead of a row of arbitrary geometry.
    const objectLabel = String(item.label || "").toLowerCase();
    const pictogramColor = style === "paper_card" || style === "glass" ? color : "#FFFFFF";
    const iconSize = size * 0.62;
    if (/phone|mobile|screen|feed|app/.test(objectLabel)) {
      ctx.strokeStyle = pictogramColor;
      ctx.lineWidth = Math.max(4, size * 0.045);
      ctx.beginPath(); ctx.roundRect(-iconSize * 0.28, -iconSize * 0.47 - size * 0.12, iconSize * 0.56, iconSize * 0.94, iconSize * 0.09); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-iconSize * 0.12, -iconSize * 0.36 - size * 0.12); ctx.lineTo(iconSize * 0.12, -iconSize * 0.36 - size * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, iconSize * 0.37 - size * 0.12, size * 0.012, 0, Math.PI * 2); ctx.fillStyle = pictogramColor; ctx.fill();
    } else if (/chart|graph|growth|sales|money|revenue|coin|profit|metric/.test(objectLabel)) {
      const iconY = -size * 0.12;
      ctx.strokeStyle = pictogramColor;
      ctx.fillStyle = pictogramColor;
      ctx.lineWidth = Math.max(4, size * 0.045);
      [-0.25, -0.02, 0.21].forEach((x, barIndex) => {
        ctx.beginPath(); ctx.roundRect(size * x, iconY + size * (0.15 - barIndex * 0.13), size * 0.13, size * (0.18 + barIndex * 0.13), size * 0.025); ctx.fill();
      });
      ctx.beginPath(); ctx.moveTo(-size * 0.30, iconY - size * 0.12); ctx.lineTo(-size * 0.04, iconY - size * 0.27); ctx.lineTo(size * 0.12, iconY - size * 0.16); ctx.lineTo(size * 0.32, iconY - size * 0.39); ctx.stroke();
    } else {
      drawCanvasIcon(ctx, inferIconKey(objectLabel), 0, -size * 0.12, iconSize, pictogramColor);
    }
    ctx.fillStyle = style === "black_neon" ? "#FFFFFF" : "#172033";
    ctx.font = `900 ${item.shape === "text" ? 27 : 22}px 'Montserrat', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = String(item.label || "").slice(0, 20);
    ctx.fillText(label, 0, size * 0.30, size * 1.65);
    ctx.restore();
  });

  if (recipe.metaphor) {
    ctx.save();
    ctx.fillStyle = style === "black_neon" ? "#FFFFFF" : "#172033";
    ctx.font = "800 24px 'Montserrat', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(recipe.metaphor.slice(0, 72).toUpperCase(), bounds.x + bounds.w / 2, bounds.y + bounds.h - 12, bounds.w - 24);
    ctx.restore();
  }
  void palette;
}

/**
 * Draws a 100% Full-Screen AI-Directed Story Visual Animation on short 3-second B-Roll bursts
 * ("fullscreen_animation" or "sam_cutout"). Completes its full energetic motion arc inside the
 * 3.0s–3.2s cutaway window so it never drags or bores the viewer.
 */
function drawFullScreenStoryAnimation(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scene: SceneSegment,
  t: number,
  palette: VisualPalette,
  yShift: number
) {
  const isWonderRecipe = Boolean(scene.visualRecipe?.objects?.length && scene.technique === "procedural_graphic");
  const winStart = scene.cutawayWindow ? scene.cutawayWindow.start : scene.start;
  const winEnd = scene.cutawayWindow
    ? scene.cutawayWindow.end
    : isWonderRecipe
    ? scene.end
    : Math.min(scene.end, scene.start + 3.2);
  const dt = Math.max(0, t - winStart);
  const dur = Math.max(1.2, winEnd - winStart);
  const prog = clamp01(dt / (dur * 0.85));
  const enterScale = 0.92 + 0.08 * easeOutBack(Math.min(1, dt / 0.26));
  const arch: StoryVisualArchetype =
    scene.storyArchetype ||
    inferStoryVisualArchetype(
      scene.spokenReference || "",
      scene.motionIntent || "",
      scene.headlineText || "",
      scene.technique || ""
    );

  const cx = W / 2;
  const cy = H / 2 - yShift - 40;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(enterScale, enterScale);
  ctx.translate(-cx, -cy);

  if (scene.visualRecipe?.objects?.length) {
    const recipeStyle = scene.visualRecipe.style || "procedural";
    const recipeBackground: [string, string] = recipeStyle === "clay_3d"
      ? ["#FFF1D6", "#F2C06B"]
      : recipeStyle === "paper_cut" || recipeStyle === "paper_card"
      ? ["#FFF9EB", "#E8DDC8"]
      : recipeStyle === "glass"
      ? ["#E5F7FF", "#A6DDF3"]
      : recipeStyle === "anime"
      ? ["#FFF0F4", "#FFE2AC"]
      : recipeStyle === "black_neon"
      ? ["#070A12", "#17152A"]
      : ["#FFF7E9", "#D8E9FA"];
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, recipeBackground[0]);
    bg.addColorStop(1, recipeBackground[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(cx, cy - 80, 30, cx, cy, 760);
    glow.addColorStop(0, recipeStyle === "black_neon" ? "rgba(94,75,190,0.48)" : "rgba(255,255,255,0.48)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 64px 'Montserrat', sans-serif";
    ctx.fillStyle = recipeStyle === "black_neon" ? "#FFFFFF" : "#172033";
    ctx.shadowColor = recipeStyle === "black_neon" ? "#00F0FF" : "transparent";
    ctx.shadowBlur = recipeStyle === "black_neon" ? 18 : 0;
    ctx.fillText((scene.headlineText || scene.visualRecipe.metaphor || "").toUpperCase(), cx, 230, W - 120);
    ctx.shadowBlur = 0;
    drawWonderVisualRecipe(
      ctx,
      scene.visualRecipe,
      dt,
      { x: 70, y: 360, w: W - 140, h: 940 },
      palette
    );
    ctx.restore();
    return;
  }

  if (arch === "phone_timer") {
    // FULL-SCREEN UI MOCKUP: Hand-drawn / sleek Smartphone + Brand-Orange Screen + 5:00 -> 60:00 Timer
    const phoneW = 540;
    const phoneH = 980;
    const px = cx - phoneW / 2;
    const py = cy - phoneH / 2;

    // Outer ambient glow
    const glow = ctx.createRadialGradient(cx, cy, 80, cx, cy, 560);
    glow.addColorStop(0, palette.accent + "66");
    glow.addColorStop(1, palette.accent + "00");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 560, 0, Math.PI * 2);
    ctx.fill();

    // Phone chassis
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 55;
    ctx.shadowOffsetY = 24;
    ctx.fillStyle = "#12151E";
    ctx.beginPath();
    ctx.roundRect(px, py, phoneW, phoneH, 76);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 8;
    ctx.strokeStyle = palette.cardBorder;
    ctx.stroke();

    // Screen area lighting up in brand orange / accent gradient
    const sx = px + 26;
    const sy = py + 32;
    const sw = phoneW - 52;
    const sh = phoneH - 64;
    const screenGrad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    screenGrad.addColorStop(0, palette.accent);
    screenGrad.addColorStop(0.55, "#181C29");
    screenGrad.addColorStop(1, "#0E1018");
    ctx.fillStyle = screenGrad;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 54);
    ctx.fill();

    // Dynamic Island / Speaker Notch
    ctx.fillStyle = "#08090E";
    ctx.beginPath();
    ctx.roundRect(cx - 76, sy + 20, 152, 30, 15);
    ctx.fill();

    // Animated Social Feed Cards scrolling inside the phone screen
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(sx + 24, sy + 80, sw - 48, sh - 290, 32);
    ctx.clip();
    const feedScroll = (dt * 190) % 210;
    for (let i = -1; i < 4; i++) {
      const cardY = sy + 95 + i * 210 - feedScroll;
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.beginPath();
      ctx.roundRect(sx + 36, cardY, sw - 72, 180, 28);
      ctx.fill();

      // Avatar circle + skeleton bars (pure visual UI, no competing transcript text)
      ctx.fillStyle = palette.highlight;
      ctx.beginPath();
      ctx.arc(sx + 88, cardY + 54, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();
      ctx.roundRect(sx + 132, cardY + 36, 190, 18, 9);
      ctx.roundRect(sx + 132, cardY + 66, 120, 14, 7);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.beginPath();
      ctx.roundRect(sx + 62, cardY + 106, sw - 124, 48, 14);
      ctx.fill();
    }
    ctx.restore();

    // Large Hero Timer Chip at bottom of phone screen: animates from 05:00 -> 60:00
    const mins = Math.round(5 + prog * 55);
    const chipW = sw - 56;
    const chipH = 148;
    const chipX = sx + 28;
    const chipY = sy + sh - chipH - 36;

    ctx.fillStyle = "#FFFDF9";
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 38);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#141414";
    ctx.stroke();

    ctx.font = "800 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const phoneBanner = (scene.headlineText || scene.spokenReference.slice(0, 24) || "KEY FOCUS").toUpperCase();
    ctx.fillText(truncateTextToWidth(ctx, phoneBanner, chipW - 32), cx, chipY + 42);

    ctx.font = "900 68px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#141414";
    ctx.fillText(`⏱ ${String(mins).padStart(2, "0")}:00`, cx, chipY + 102);
  } else if (arch === "time_drain") {
    // FULL-SCREEN CHRONOGRAPH TIME VORTEX: 5 MIN -> 1 HOUR GONE
    const R = 340;
    ctx.fillStyle = palette.cardBg;
    ctx.beginPath();
    ctx.arc(cx, cy - 30, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = palette.cardBorder;
    ctx.stroke();

    // Tick marks around dial
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r1 = R - 42;
      const r2 = R - 18;
      ctx.strokeStyle = i % 3 === 0 ? palette.accent : palette.secondaryText;
      ctx.lineWidth = i % 3 === 0 ? 7 : 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy - 30 + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy - 30 + Math.sin(ang) * r2);
      ctx.stroke();
    }

    // Sweeping depleted hour arc
    const arcEnd = -Math.PI / 2 + Math.PI * 2 * clamp01(0.15 + prog * 0.85);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy - 30, R - 58, -Math.PI / 2, arcEnd);
    ctx.stroke();

    // Clock hands spinning rapidly
    const handAng = -Math.PI / 2 + dt * 5.2;
    ctx.strokeStyle = palette.primaryText;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx + Math.cos(handAng) * 210, cy - 30 + Math.sin(handAng) * 210);
    ctx.stroke();

    // Center readout
    const elapsedMin = Math.min(60, Math.max(5, Math.round(5 + prog * 55)));
    ctx.font = "900 118px 'Instrument Serif', Georgia, serif";
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${elapsedMin}m`, cx, cy - 42);

    ctx.font = "800 30px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.accent;
    ctx.fillText("1 HOUR VANISHED", cx, cy + 52);
  } else if (arch === "feed_vs_dreams") {
    // FULL-SCREEN SPLIT VISUAL DIAGRAM: "OTHER PEOPLE'S FEED" vs "YOUR OWN DREAMS"
    const cardW = 900;
    const cardH = 430;
    const leftX = cx - cardW / 2;
    const topY = cy - cardH - 28;
    const botY = cy + 28;

    // Top Card: Watching Other People's Feed (Scrolling Social Cards)
    ctx.fillStyle = palette.cardBg;
    ctx.beginPath();
    ctx.roundRect(leftX, topY, cardW, cardH, 48);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = palette.cardBorder;
    ctx.stroke();

    ctx.font = "800 28px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.secondaryText;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("👁 WATCHING OTHERS' LIFESTYLE", leftX + 44, topY + 58);

    // 3 animated social reel thumbnails inside Top Card
    for (let i = 0; i < 3; i++) {
      const tw = 240;
      const th = 270;
      const tx = leftX + 48 + i * 280;
      const ty = topY + 110;
      const pulse = 1 + 0.03 * Math.sin(t * 4 + i);
      ctx.save();
      ctx.translate(tx + tw / 2, ty + th / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(tx + tw / 2), -(ty + th / 2));
      ctx.fillStyle = palette.isDarkCanvas ? "rgba(255,255,255,0.08)" : "#EFECE4";
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 28);
      ctx.fill();
      drawCanvasIcon(ctx, i === 0 ? "sparkles" : i === 1 ? "rocket" : "zap", tx + tw / 2, ty + 110, 64, palette.accent);
      ctx.restore();
    }

    // Bottom Card: Your Own Dreams (Igniting with Brand Accent)
    const dreamActive = prog > 0.35;
    ctx.fillStyle = dreamActive ? palette.accentSoftBg : palette.cardBg;
    ctx.beginPath();
    ctx.roundRect(leftX, botY, cardW, cardH, 48);
    ctx.fill();
    ctx.lineWidth = dreamActive ? 7 : 5;
    ctx.strokeStyle = dreamActive ? palette.accent : palette.cardBorder;
    ctx.stroke();

    ctx.font = "800 28px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "left";
    ctx.fillText("🎯 YOUR OWN DREAMS & GOALS", leftX + 44, botY + 58);

    // Animated rising goal trajectory inside Bottom Card
    const barBaseY = botY + cardH - 58;
    for (let i = 0; i < 5; i++) {
      const bw = 118;
      const targetH = 70 + i * 48;
      const bh = targetH * easeOutCubic(clamp01((prog - i * 0.08) / 0.5));
      const bx = leftX + 64 + i * 160;
      ctx.fillStyle = i >= 3 ? palette.accent : palette.highlight;
      ctx.beginPath();
      ctx.roundRect(bx, barBaseY - bh, bw, Math.max(18, bh), 18);
      ctx.fill();
    }
  } else if (arch === "battery_vs_life") {
    // FULL-SCREEN PROCEDURAL GRAPHIC: Two Draining Bars ("PHONE BATTERY" vs "YOUR LIFE TIME")
    const cardW = 910;
    const cardH = 860;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    ctx.fillStyle = palette.cardBg;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 58);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = palette.cardBorder;
    ctx.stroke();

    // Bar 1: Phone Battery (Rechargeable)
    const b1Y = cardY + 110;
    ctx.font = "800 30px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.secondaryText;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("🔋 PHONE BATTERY (RECHARGEABLE)", cardX + 56, b1Y);

    const trackW = cardW - 112;
    const trackH = 140;
    ctx.fillStyle = palette.isDarkCanvas ? "rgba(255,255,255,0.08)" : "#ECE9E0";
    ctx.beginPath();
    ctx.roundRect(cardX + 56, b1Y + 44, trackW, trackH, 34);
    ctx.fill();

    const phonePct = Math.max(0.18, 0.85 - prog * 0.65);
    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.roundRect(cardX + 56, b1Y + 44, trackW * phonePct, trackH, 34);
    ctx.fill();

    ctx.font = "900 54px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${Math.round(phonePct * 100)}% ⚡`, cardX + 96, b1Y + 44 + trackH / 2);

    // Bar 2: Your Life Time (No Recharge - Brand Orange Urgency)
    const b2Y = cardY + 470;
    ctx.font = "800 30px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "left";
    ctx.fillText("⏳ YOUR LIFE TIME (NO RECHARGE)", cardX + 56, b2Y);

    ctx.fillStyle = palette.isDarkCanvas ? "rgba(255,255,255,0.08)" : "#ECE9E0";
    ctx.beginPath();
    ctx.roundRect(cardX + 56, b2Y + 44, trackW, trackH, 34);
    ctx.fill();

    const lifePct = Math.max(0.22, 0.92 - prog * 0.58);
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.roundRect(cardX + 56, b2Y + 44, trackW * lifePct, trackH, 34);
    ctx.fill();

    ctx.font = "900 54px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("FINITE ⏳", cardX + 96, b2Y + 44 + trackH / 2);
  } else if (arch === "scroll_to_build") {
    // FULL-SCREEN STOP SCROLLING -> START BUILDING ANIMATION
    const cardW = 910;
    const cardH = 880;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    ctx.fillStyle = palette.cardBg;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 58);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = palette.cardBorder;
    ctx.stroke();

    // Top badge
    ctx.font = "800 30px 'JetBrains Mono', monospace";
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✕ STOP SCROLLING  →  🚀 START BUILDING", cx, cardY + 78);

    // 4 stacking architectural blocks rising in center
    const labels = ["FOUNDATION", "DEEP FOCUS", "DAILY EXECUTION", "YOUR FUTURE 🚀"];
    for (let i = 0; i < 4; i++) {
      const stepProg = easeOutBack(clamp01((dt - i * 0.22) / 0.42));
      const bw = 720 - i * 70;
      const bh = 132;
      const bx = cx - bw / 2;
      const by = cardY + 640 - i * 152 - (1 - stepProg) * 60;

      ctx.save();
      ctx.globalAlpha = stepProg;
      ctx.fillStyle = i === 3 ? palette.accent : i % 2 === 0 ? palette.primaryText : palette.highlight;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 32);
      ctx.fill();

      ctx.font = "900 38px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = i === 3 || i % 2 === 0 ? "#FFFFFF" : "#111111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], cx, by + bh / 2);
      ctx.restore();
    }
  } else {
    // DEFAULT STORY VISUAL DIAGRAM: Animated Radial Concept Hub + Connected Visual Nodes
    drawVariantOrbit(ctx, W, H, scene, t, palette, yShift);
  }

  ctx.restore();
}

export interface RenderExplainerFrameOptions {
  scenes: SceneSegment[];
  words: WordItem[];
  duration: number;
  palette: VisualPalette;
  layoutMode: ExplainerLayoutMode;
  brollImages?: Record<string, HTMLImageElement | HTMLVideoElement>;
  captionStyleId?: CaptionStyleId;
  captionSizeScale?: number;
  captionPosition?: "bottom" | "center" | "top";
  captionYOffset?: number;
  captionYPercent?: number;
  hideCaptions?: boolean;
  hiddenCalloutIds?: string[] | Set<string>;
  cutoutPosition?: { xPercent: number; yPercent: number } | "bottom-left" | "bottom-right";
  cutoutScale?: number;
  hideStoryVisuals?: boolean;
}

/**
 * Renders a single 1080×1920 frame of the Talking-Head Story Explainer onto `ctx`.
 * Used by BOTH the live interactive `<canvas>` preview AND the frame-accurate MP4 exporter
 * so that preview and download are 100% pixel-for-pixel identical.
 */
export function renderExplainerFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  currentTime: number,
  options: RenderExplainerFrameOptions
) {
  const W = 1080;
  const H = 1920;
  const { scenes, words, duration, palette, layoutMode, brollImages } = options;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  const isHidden = (id?: string) => {
    if (!id || !options.hiddenCalloutIds) return false;
    if (Array.isArray(options.hiddenCalloutIds)) return options.hiddenCalloutIds.includes(id);
    if (options.hiddenCalloutIds instanceof Set) return options.hiddenCalloutIds.has(id);
    return false;
  };

  // 1. Resolve Active Scene (robust contiguous boundary matching without random fallback jumps)
  let resolvedIdx = scenes.findIndex(
    (s, i) => currentTime >= s.start && (i === scenes.length - 1 ? currentTime <= s.end + 0.5 : currentTime < s.end)
  );
  if (resolvedIdx === -1) {
    for (let i = 0; i < scenes.length; i++) {
      if (currentTime >= scenes[i].start && (i === scenes.length - 1 || currentTime < scenes[i + 1].start)) {
        resolvedIdx = i;
        break;
      }
    }
  }
  if (resolvedIdx === -1) {
    resolvedIdx = currentTime < scenes[0].start ? 0 : scenes.length - 1;
  }
  const activeScene = scenes[resolvedIdx] || scenes[0];

  // 2. Resolve Active Word & 3-Word Caption Chunk
  let activeWordIndex = words.findIndex(
    (w) => currentTime >= w.start - 0.04 && currentTime <= w.end + 0.08
  );
  if (activeWordIndex === -1) {
    for (let i = 0; i < words.length; i++) {
      if (words[i].start <= currentTime) activeWordIndex = i;
      else break;
    }
  }
  const activeWord = activeWordIndex >= 0 ? words[activeWordIndex] : null;
  const chunkStart = Math.floor(Math.max(0, activeWordIndex) / 3) * 3;
  const currentChunk = words.length > 0 ? words.slice(chunkStart, chunkStart + 3) : [];

  let effectiveShot: SceneSegment["shotType"] = activeScene?.shotType || "fullscreen_speaker";
  // Any legacy "depth_cutout" scene is upgraded to "sam_cutout" so the character is always isolated and placed in the bottom-left corner over the codebase story animation
  if (effectiveShot === "depth_cutout") {
    effectiveShot = "sam_cutout";
  }
  const isWonderRecreatedScene = !options.hideStoryVisuals && Boolean(
    activeScene?.technique === "procedural_graphic" &&
    activeScene?.visualRecipe?.objects?.length
  );
  if (options.hideStoryVisuals) {
    effectiveShot = "fullscreen_speaker";
  } else if (layoutMode === "speaker_only" && !isWonderRecreatedScene) {
    effectiveShot = "fullscreen_speaker";
  } else if (layoutMode === "cutout_reel" && !isWonderRecreatedScene) {
    // When Cutout mode is selected (or in Cutout template scenes), keep the exact SAM 3.1 character cutout in the bottom-left corner over the codebase story animation across scenes!
    effectiveShot = "sam_cutout";
  } else if (layoutMode === "auto_reel") {
    // In Yapping Style mode: NEVER use SAM 3.1 cutouts or overlapping SPLIT cards,
    // and cap any full-screen animation cutaway to a snappy 3.2-second burst!
    if (effectiveShot === "sam_cutout" || effectiveShot === "SPLIT") {
      effectiveShot = "fullscreen_animation";
    }
    if (effectiveShot === "fullscreen_animation" && activeScene && !activeScene.assetUrl && !isWonderRecreatedScene) {
      const winStart = activeScene.cutawayWindow ? activeScene.cutawayWindow.start : activeScene.start;
      const winEnd = activeScene.cutawayWindow
        ? activeScene.cutawayWindow.end
        : Math.min(activeScene.end, activeScene.start + 3.2);
      if (currentTime < winStart || currentTime > winEnd) {
        effectiveShot = "fullscreen_speaker";
      }
    }
  }

  const showFullScreenAnimation =
    effectiveShot === "fullscreen_animation" || effectiveShot === "sam_cutout" || effectiveShot === "SPLIT";

  // =========================================================================
  // BRANCH A: FULL-SCREEN SPEAKER
  // =========================================================================
  if (!showFullScreenAnimation) {
    // Fill black base
    ctx.fillStyle = "#0B0C10";
    ctx.fillRect(0, 0, W, H);

    // Draw Speaker Video Frame with smooth cameraZoom
    if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      const sceneElapsed = Math.max(0, currentTime - (activeScene?.start || 0));
      const targetZoom = activeScene?.cameraZoom || 1.0;
      const prevZoom = resolvedIdx > 0 ? scenes[resolvedIdx - 1]?.cameraZoom || 1.0 : 1.0;
      const zoomProgress = easeOutCubic(sceneElapsed / 0.55);
      const liveZoom = prevZoom + (targetZoom - prevZoom) * zoomProgress;

      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      const scale = Math.max(W / vw, H / vh) * liveZoom;
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;

      ctx.drawImage(videoEl, dx, dy, dw, dh);
    }

    // Lower gradient vignette so Subtitle Studio (CC) captions pop cleanly
    const vigGrad = ctx.createLinearGradient(0, H - 560, 0, H);
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(0.55, "rgba(0, 0, 0, 0.36)");
    vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.78)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, H - 560, W, 560);

    // Draw AI-Directed Story Pop-Up Motion Graphic in upper safe zone (NEVER repeating caption words)
    if (activeScene && !options.hideStoryVisuals && !isHidden(`${activeScene.id}-callouts`)) {
      const calloutMedia = activeScene.assetUrl ? brollImages?.[activeScene.id] : undefined;
      const isCalloutVid =
        typeof HTMLVideoElement !== "undefined" && calloutMedia instanceof HTMLVideoElement;
      const isCalloutImg =
        typeof HTMLImageElement !== "undefined" && calloutMedia instanceof HTMLImageElement;
      const calloutMediaReady =
        (isCalloutVid && calloutMedia.readyState >= 2 && calloutMedia.videoWidth > 0) ||
        (isCalloutImg && calloutMedia.complete && calloutMedia.naturalWidth > 0);

      if (calloutMediaReady && calloutMedia) {
        const dt = Math.max(0, currentTime - activeScene.start);
        const popAlpha = clamp01(dt / 0.18);
        const polW = 248;
        const polH = 294;
        const polX = W - polW - 42;
        const polY = 108;
        const floatY = Math.sin(currentTime * 2.8) * 6;
        const polScale = 0.85 + 0.15 * easeOutBack(dt / 0.36);

        ctx.save();
        ctx.globalAlpha = popAlpha * 0.96;
        ctx.translate(polX + polW / 2, polY + polH / 2 + floatY);
        ctx.rotate((-4.5 * Math.PI) / 180);
        ctx.scale(polScale, polScale);
        ctx.translate(-(polX + polW / 2), -(polY + polH / 2));

        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 12;
        ctx.fillStyle = "#FFFDF9";
        ctx.beginPath();
        ctx.roundRect(polX, polY, polW, polH, 24);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#141414";
        ctx.stroke();

        const imgPad = 16;
        const imgW = polW - imgPad * 2;
        const imgH = polH - 72;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(polX + imgPad, polY + imgPad, imgW, imgH, 14);
        ctx.clip();
        const mw = isCalloutVid ? calloutMedia.videoWidth : (calloutMedia as HTMLImageElement).naturalWidth;
        const mh = isCalloutVid ? calloutMedia.videoHeight : (calloutMedia as HTMLImageElement).naturalHeight;
        const sc = Math.max(imgW / mw, imgH / mh) * (1.03 + 0.04 * Math.sin(currentTime * 1.5));
        ctx.drawImage(
          calloutMedia,
          polX + imgPad + (imgW - mw * sc) / 2,
          polY + imgPad + (imgH - mh * sc) / 2,
          mw * sc,
          mh * sc
        );
        ctx.restore();

        const polTag = (activeScene.galleryClipName || "GALLERY")
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]+/g, " ")
          .toUpperCase();
        ctx.font = "800 20px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#141414";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          truncateTextToWidth(ctx, `📸 ${polTag}`, polW - 28),
          polX + polW / 2,
          polY + polH - 28
        );
        ctx.restore();
      } else {
        drawStoryPopUpMotionOnSpeaker(ctx, W, H, activeScene, currentTime, palette);
      }
    }
  } else if (activeScene) {
    // =========================================================================
    // BRANCH B: 100% FULL-SCREEN B-ROLL GALLERY CUTAWAY OR STORY ANIMATION
    // =========================================================================
    const bgGrad = ctx.createRadialGradient(
      W * 0.5,
      H * 0.36,
      60,
      W * 0.5,
      H * 0.5,
      H * 0.72
    );
    bgGrad.addColorStop(0, palette.canvasGradInner);
    bgGrad.addColorStop(1, palette.canvasGradOuter);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const sceneDt = Math.max(0, currentTime - activeScene.start);
    const cardEnterScale = 0.95 + 0.05 * easeOutBack(sceneDt / 0.28);
    const hasDirectWonderRecipe = Boolean(activeScene.visualRecipe?.objects?.length);

    // Check if this scene is backed by a connected Personal Gallery B-Roll video or image
    const brollMedia = activeScene.assetUrl ? brollImages?.[activeScene.id] : undefined;
    const isVideoMedia =
      typeof HTMLVideoElement !== "undefined" && brollMedia instanceof HTMLVideoElement;
    const isImageMedia =
      typeof HTMLImageElement !== "undefined" && brollMedia instanceof HTMLImageElement;
    const mediaReady =
      (isVideoMedia && brollMedia.readyState >= 2 && brollMedia.videoWidth > 0) ||
      (isImageMedia && brollMedia.complete && brollMedia.naturalWidth > 0);

    if (mediaReady && brollMedia && !hasDirectWonderRecipe) {
      if (isVideoMedia && brollMedia.paused) {
        brollMedia.play().catch(() => {});
      }
      const sceneDur = Math.max(1, activeScene.end - activeScene.start);
      const prog = clamp01((currentTime - activeScene.start) / sceneDur);
      const kbZoom = isVideoMedia ? 1.02 : 1.02 + 0.08 * prog;
      const mw = isVideoMedia ? brollMedia.videoWidth : (brollMedia as HTMLImageElement).naturalWidth;
      const mh = isVideoMedia ? brollMedia.videoHeight : (brollMedia as HTMLImageElement).naturalHeight;
      const scale = Math.max(W / mw, H / mh) * kbZoom;
      const dw = mw * scale;
      const dh = mh * scale;

      ctx.save();
      ctx.globalAlpha = isVideoMedia ? 1.0 : 0.38;
      if (isVideoMedia) {
        const sourceDuration = Math.max(0.1, Number(activeScene.assetDuration) || sceneDur);
        const desiredSourceTime = Math.max(0, Number(activeScene.assetStart) || 0) + Math.min(sceneDt, sourceDuration - 0.04);
        if (Number.isFinite(desiredSourceTime) && Math.abs(brollMedia.currentTime - desiredSourceTime) > 0.22) {
          try { brollMedia.currentTime = desiredSourceTime; } catch {}
        }
        ctx.filter = "saturate(1.08) contrast(1.04)";
      }
      ctx.drawImage(brollMedia, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.filter = "none";
      ctx.restore();

      // Cinematic top & bottom vignette
      const topVig = ctx.createLinearGradient(0, 0, 0, 260);
      topVig.addColorStop(0, "rgba(0, 0, 0, 0.55)");
      topVig.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topVig;
      ctx.fillRect(0, 0, W, 260);

      const botVig = ctx.createLinearGradient(0, H - 680, 0, H);
      botVig.addColorStop(0, "rgba(0, 0, 0, 0)");
      botVig.addColorStop(0.55, "rgba(0, 0, 0, 0.52)");
      botVig.addColorStop(1, "rgba(0, 0, 0, 0.86)");
      ctx.fillStyle = botVig;
      ctx.fillRect(0, H - 680, W, 680);

      // Top B-Roll Badge
      const clipLabel = (activeScene.galleryClipName || "GALLERY B-ROLL")
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]+/g, " ")
        .toUpperCase();
      const badgeText = `🎬 B-ROLL • ${clipLabel.slice(0, 26)}`;
      ctx.save();
      ctx.font = "800 22px 'JetBrains Mono', monospace";
      const bw = ctx.measureText(badgeText).width + 48;
      const bx = (W - bw) / 2;
      const by = 80;
      ctx.fillStyle = "rgba(12, 12, 16, 0.82)";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 48, 24);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = palette.accent;
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, W / 2, by + 25);
      ctx.restore();

      if (!isVideoMedia) {
        // Creative Tilted Polaroid Hero Photo Frame + Story Card Collage
        const polW = 840;
        const polH = 540;
        const polX = (W - polW) / 2;
        const polY = 166;
        const tiltRad = ((resolvedIdx % 2 === 0 ? -1.8 : 1.8) * Math.PI) / 180;

        ctx.save();
        ctx.translate(polX + polW / 2, polY + polH / 2);
        ctx.rotate(tiltRad);
        ctx.scale(cardEnterScale, cardEnterScale);
        ctx.translate(-(polX + polW / 2), -(polY + polH / 2));

        // Polaroid Shadow & Cream Frame
        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = 42;
        ctx.shadowOffsetY = 18;
        ctx.fillStyle = "#FFFDF9";
        ctx.beginPath();
        ctx.roundRect(polX, polY, polW, polH, 36);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#141414";
        ctx.stroke();

        // Inner Cropped Photo with Ken Burns Zoom
        const pad = 24;
        const innerW = polW - pad * 2;
        const innerH = polH - 96;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(polX + pad, polY + pad, innerW, innerH, 22);
        ctx.clip();
        const innerScale = Math.max(innerW / mw, innerH / mh) * (1.02 + 0.08 * prog);
        ctx.drawImage(
          brollMedia,
          polX + pad + (innerW - mw * innerScale) / 2,
          polY + pad + (innerH - mh * innerScale) / 2,
          mw * innerScale,
          mh * innerScale
        );
        ctx.restore();

        // Top Yellow Masking Tape Strip
        ctx.save();
        ctx.translate(W / 2, polY - 6);
        ctx.rotate((2.2 * Math.PI) / 180);
        ctx.fillStyle = "rgba(255, 232, 20, 0.92)";
        ctx.beginPath();
        ctx.roundRect(-84, -14, 168, 30, 6);
        ctx.fill();
        ctx.restore();

        // Polaroid Bottom Caption Strip
        ctx.font = "800 24px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#141414";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`📸 ${clipLabel.slice(0, 28)}`, polX + 32, polY + polH - 36);

        ctx.fillStyle = palette.accent;
        ctx.textAlign = "right";
        ctx.fillText(`SCENE 0${resolvedIdx + 1}`, polX + polW - 32, polY + polH - 36);
        ctx.restore();

        // Companion Story Card Below Polaroid
        const scW = 840;
        const scH = 380;
        const scX = (W - scW) / 2;
        const scY = 746;

        ctx.save();
        ctx.translate(scX + scW / 2, scY + scH / 2);
        ctx.scale(cardEnterScale, cardEnterScale);
        ctx.translate(-(scX + scW / 2), -(scY + scH / 2));

        ctx.fillStyle = "rgba(16, 18, 24, 0.88)";
        ctx.beginPath();
        ctx.roundRect(scX, scY, scW, scH, 44);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = palette.accent;
        ctx.stroke();

        ctx.font = "700 62px 'Instrument Serif', Georgia, serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const hLines = wrapCanvasText(ctx, activeScene.headlineText, scW - 96, 2);
        const startY = hLines.length === 1 ? scY + 110 : scY + 84;
        hLines.forEach((ln, i) => {
          ctx.fillText(ln, W / 2, startY + i * 66);
        });

        // Up to 2 Spoken Beat Pills inside the companion card
        activeScene.steps.slice(0, 2).forEach((st, idx) => {
          const isReached = currentTime >= st.triggerTime - 0.1;
          const pW = scW - 96;
          const pH = 68;
          const pX = (W - pW) / 2;
          const pY = scY + 206 + idx * 78;

          ctx.save();
          ctx.globalAlpha = isReached ? 1 : 0.42;
          ctx.fillStyle = isReached ? palette.accent : "rgba(255,255,255,0.08)";
          ctx.beginPath();
          ctx.roundRect(pX, pY, pW, pH, 22);
          ctx.fill();

          ctx.font = "800 26px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            truncateTextToWidth(ctx, `⚡ ${st.label}`, pW - 48),
            W / 2,
            pY + pH / 2 + 1
          );
          ctx.restore();
        });

        ctx.restore();
      }
    } else {
      // Editorial Grid Overlay (when using procedural story animation)
      ctx.save();
      ctx.strokeStyle = palette.isDarkCanvas
        ? "rgba(255, 255, 255, 0.045)"
        : "rgba(20, 20, 20, 0.04)";
      ctx.lineWidth = 2;
      const gridStep = 96;
      const bgPattern = resolvedIdx % 3;
      if (bgPattern === 0) {
        for (let x = 0; x < W; x += gridStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
      } else if (bgPattern === 1) {
        ctx.fillStyle = palette.isDarkCanvas ? "rgba(255,255,255,0.08)" : "rgba(20,20,20,0.08)";
        for (let x = 48; x < W; x += 72) {
          for (let y = 48; y < H; y += 72) {
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        const drift = (currentTime * 40) % 120;
        for (let d = -H; d < W + H; d += 120) {
          ctx.beginPath();
          ctx.moveTo(d + drift, 0);
          ctx.lineTo(d + drift - H, H);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Ambient Floating Glow Orb
      const orbScale = 1 + 0.12 * Math.sin(currentTime * 2.2);
      const orbR = 360 * orbScale;
      const orbGrad = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, orbR);
      orbGrad.addColorStop(0, palette.accent + "44");
      orbGrad.addColorStop(1, palette.accent + "00");
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.45, orbR, 0, Math.PI * 2);
      ctx.fill();
    }

    // -----------------------------------------------------------------------
    // 100% FULL-SCREEN AI-DIRECTED STORY VISUAL ANIMATION
    // -----------------------------------------------------------------------
    if (!mediaReady) {
      const yShift = effectiveShot === "sam_cutout" ? 210 : 80;
      drawFullScreenStoryAnimation(ctx, W, H, activeScene, currentTime, palette, yShift);
    }

    // -----------------------------------------------------------------------
    // ZAI SAM 3.1 SPEAKER CUTOUT LAYER (Clean, natural, continuous character presence)
    // -----------------------------------------------------------------------
    if (effectiveShot === "sam_cutout") {
      if (
        videoEl &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0
      ) {
        // Size: 25% larger by default (450x575), user scalable
        const baseW = 450;
        const baseH = 575;
        const scaleMult = typeof options.cutoutScale === "number" ? Math.max(0.6, Math.min(2.0, options.cutoutScale)) : 1.0;
        const cutW = Math.round(baseW * scaleMult);
        const cutH = Math.round(baseH * scaleMult);

        // Position: Anchored stably in corner by default; freeform movable via options.cutoutPosition
        let cutX = 36;
        let cutY = H - cutH - 180;

        if (options.cutoutPosition === "bottom-right") {
          cutX = W - cutW - 36;
          cutY = H - cutH - 180;
        } else if (options.cutoutPosition === "bottom-left") {
          cutX = 36;
          cutY = H - cutH - 180;
        } else if (
          typeof options.cutoutPosition === "object" &&
          options.cutoutPosition !== null &&
          typeof options.cutoutPosition.xPercent === "number" &&
          typeof options.cutoutPosition.yPercent === "number"
        ) {
          cutX = Math.round((options.cutoutPosition.xPercent / 100) * (W - cutW));
          cutY = Math.round((options.cutoutPosition.yPercent / 100) * (H - cutH));
        }

        cutX = Math.max(16, Math.min(W - cutW - 16, cutX));
        cutY = Math.max(80, Math.min(H - cutH - 40, cutY));

        // Draw character cutout cleanly and continuously across sentences without jumping in/out
        const rawSamImg = brollImages?.[`${activeScene.id}__sam`] || brollImages?.["__sam_cutout__"];
        const samCutoutImg =
          typeof HTMLImageElement !== "undefined" && rawSamImg instanceof HTMLImageElement
            ? rawSamImg
            : undefined;
        drawExactSamCharacterCutout(
          ctx,
          videoEl,
          cutX,
          cutY,
          cutW,
          cutH,
          activeScene.samBox,
          samCutoutImg,
          palette.accent,
          palette.highlight,
          currentTime
        );
      }
    } else if (effectiveShot === "SPLIT") {
      // -----------------------------------------------------------------------
      // STORY EXPLAINER: FRAMED SPEAKER CARD (NO SAM 3.1 CUTOUT)
      // When explaining alongside animation, the speaker is framed cleanly in a sleek
      // rounded-corner window pushed down/up (occupying ~42% of frame), with zero cutouts!
      // -----------------------------------------------------------------------
      // Top Story Explainer Telemetry Pill
      ctx.save();
      const topPillText = "⚡ STORY EXPLAINER • A-ROLL & ANIMATION";
      ctx.font = "800 22px 'JetBrains Mono', monospace";
      const tpw = ctx.measureText(topPillText).width + 48;
      const tpx = (W - tpw) / 2;
      const tpy = 88;
      ctx.fillStyle = "rgba(10, 12, 18, 0.85)";
      ctx.beginPath();
      ctx.roundRect(tpx, tpy, tpw, 48, 24);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = palette.accent;
      ctx.stroke();
      ctx.fillStyle = palette.highlight;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(topPillText, W / 2, tpy + 24);
      ctx.restore();

      // Render Framed Speaker Video Card in bottom section (above captions)
      if (
        videoEl &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0
      ) {
        const frameW = 860;
        const frameH = 500;
        const frameX = (W - frameW) / 2;
        const frameY = 960;

        const popScale = 0.94 + 0.06 * easeOutBack(Math.min(1, sceneDt / 0.32));
        const popAlpha = clamp01(sceneDt / 0.18);

        ctx.save();
        ctx.globalAlpha = popAlpha;
        ctx.translate(frameX + frameW / 2, frameY + frameH / 2);
        ctx.scale(popScale, popScale);
        ctx.translate(-(frameX + frameW / 2), -(frameY + frameH / 2));

        // Card Elevation Shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = 48;
        ctx.shadowOffsetY = 20;
        ctx.fillStyle = "#0A0A0E";
        ctx.beginPath();
        ctx.roundRect(frameX, frameY, frameW, frameH, 44);
        ctx.fill();
        ctx.shadowColor = "transparent";

        // Clip video to sleek rounded-corner frame
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(frameX, frameY, frameW, frameH, 44);
        ctx.clip();

        // Draw cropped A-roll video inside framed card
        const vw = videoEl.videoWidth;
        const vh = videoEl.videoHeight;
        const scale = Math.max(frameW / vw, frameH / vh) * 1.05;
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = frameX + (frameW - dw) / 2;
        const dy = frameY + (frameH - dh) / 2;
        ctx.drawImage(videoEl, dx, dy, dw, dh);

        // Subtle bottom gradient inside video frame
        const innerGrad = ctx.createLinearGradient(0, frameY + frameH - 120, 0, frameY + frameH);
        innerGrad.addColorStop(0, "rgba(0,0,0,0)");
        innerGrad.addColorStop(1, "rgba(0,0,0,0.65)");
        ctx.fillStyle = innerGrad;
        ctx.fillRect(frameX, frameY + frameH - 120, frameW, 120);

        ctx.restore();

        // Crisp Outer Border
        ctx.lineWidth = 5;
        ctx.strokeStyle = palette.accent;
        ctx.beginPath();
        ctx.roundRect(frameX, frameY, frameW, frameH, 44);
        ctx.stroke();

        // Speaker Card Badge
        const sBadgeW = 210;
        const sBadgeH = 38;
        const sBadgeX = frameX + 28;
        const sBadgeY = frameY + 24;
        ctx.fillStyle = "rgba(10, 12, 18, 0.88)";
        ctx.beginPath();
        ctx.roundRect(sBadgeX, sBadgeY, sBadgeW, sBadgeH, 19);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.stroke();

        ctx.fillStyle = "#10B981";
        ctx.beginPath();
        ctx.arc(sBadgeX + 20, sBadgeY + sBadgeH / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "800 17px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("SPEAKER A-ROLL", sBadgeX + 34, sBadgeY + sBadgeH / 2 + 1);

        ctx.restore();
      }
    }

    // Bottom gradient so the continuous lower-third captions stay crisp
    const cutGrad = ctx.createLinearGradient(0, H - 400, 0, H);
    cutGrad.addColorStop(0, "rgba(15, 15, 20, 0)");
    cutGrad.addColorStop(1, "rgba(15, 15, 20, 0.58)");
    ctx.fillStyle = cutGrad;
    ctx.fillRect(0, H - 400, W, 400);
  }

  // =========================================================================
  // LAYER 4: MULTI-STYLE VIRAL & CINEMATIC CAPTIONS
  // =========================================================================
  if (currentChunk.length > 0 && !options.hideCaptions && !isHidden("captions") && !isHidden("cc")) {
    ctx.save();
    const styleId = options.captionStyleId || "hormozi";
    const sizeScale = options.captionSizeScale || 1.0;

    // Shiftable CC title positions: direct percentage from mouse drag OR discrete presets
    let pillY = 1625;
    if (typeof options.captionYPercent === "number") {
      pillY = Math.round((options.captionYPercent / 100) * 1920);
    } else {
      if (options.captionPosition === "top") {
        pillY = 280;
      } else if (options.captionPosition === "center") {
        pillY = 960;
      }
    }
    if (typeof options.captionYOffset === "number") {
      pillY += options.captionYOffset;
    }
    pillY = Math.max(120, Math.min(1800, pillY));

    if (styleId === "beast") {
      // Beast: 1 giant word at a time, bouncy pop, thick outline, 3D shadow
      const curWord = activeWord ? activeWord.word.toUpperCase().replace(/[.,!?;:]+$/g, "") : "";
      if (curWord) {
        const fs = Math.round(96 * sizeScale);
        ctx.font = `900 ${fs}px 'Luckiest Guy', Impact, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Hard black 3D shadow
        ctx.fillStyle = "#000000";
        ctx.fillText(curWord, W / 2 + 6, pillY + 8);

        // Thick outline
        ctx.lineWidth = Math.round(16 * sizeScale);
        ctx.strokeStyle = "#000000";
        ctx.strokeText(curWord, W / 2, pillY);

        // Vibrant pop fill
        ctx.fillStyle = "#FFE600";
        ctx.fillText(curWord, W / 2, pillY);
      }
    } else if (styleId === "cinzel") {
      // Cinzel: Cinematic capitals, wide tracking, ivory and gold
      const fs = Math.round(44 * sizeScale);
      ctx.font = `700 ${fs}px 'Cinzel', Georgia, serif`;
      ctx.textBaseline = "middle";
      const wordGap = 24 * sizeScale;
      const measured = currentChunk.map((w) => {
        const text = w.word.toUpperCase().replace(/[.,!?;:]+$/g, "");
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + (measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m) => {
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = m.isCurrent ? "#F5D58A" : "#F3E9D2";
        ctx.fillText(m.text, curX, pillY);
        curX += m.tw + wordGap;
      });
    } else if (styleId === "editorial") {
      // Editorial: Bodoni Moda italic, elegant magazine headline
      const fs = Math.round(52 * sizeScale);
      ctx.font = `italic 500 ${fs}px 'Bodoni Moda', Georgia, serif`;
      ctx.textBaseline = "middle";
      const wordGap = 16 * sizeScale;
      const measured = currentChunk.map((w) => {
        const text = w.word;
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + (measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m) => {
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(m.text, curX, pillY);
        curX += m.tw + wordGap;
      });
    } else if (styleId === "neon") {
      // Neon: Tall Bebas Neue caps with cyan/violet glowing shadow
      const fs = Math.round(68 * sizeScale);
      ctx.font = `400 ${fs}px 'Bebas Neue', Impact, sans-serif`;
      ctx.textBaseline = "middle";
      const wordGap = 20 * sizeScale;
      const measured = currentChunk.map((w) => {
        const text = w.word.toUpperCase().replace(/[.,!?;:]+$/g, "");
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + (measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m) => {
        if (m.isCurrent) {
          ctx.shadowColor = "#00F0FF";
          ctx.shadowBlur = 28;
          ctx.fillStyle = "#FFFFFF";
        } else {
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "rgba(255,255,255,0.45)";
        }
        ctx.fillText(m.text, curX, pillY);
        curX += m.tw + wordGap;
      });
    } else if (styleId === "pinterest") {
      // Pinterest: DM Serif Display, editorial grace
      const fs = Math.round(52 * sizeScale);
      const wordGap = 16 * sizeScale;
      ctx.textBaseline = "middle";
      let emphIdx = -1;
      let bestLen = 3;
      currentChunk.forEach((w, idx) => {
        const l = w.word.replace(/[^a-zA-Z']/g, "").length;
        if (l > bestLen) {
          bestLen = l;
          emphIdx = idx;
        }
      });
      const measured = currentChunk.map((w, idx) => {
        const text = w.word;
        const isItalic = idx === emphIdx;
        ctx.font = `${isItalic ? "italic " : ""}400 ${fs}px 'DM Serif Display', Georgia, serif`;
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent, isItalic };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + Math.max(0, measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m) => {
        ctx.font = `${m.isItalic ? "italic " : ""}400 ${fs}px 'DM Serif Display', Georgia, serif`;
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 12;
        ctx.lineWidth = Math.round(4 * sizeScale);
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.strokeText(m.text, curX, pillY);
        ctx.fillStyle = m.isItalic ? "#E6C687" : "#FFF9F0";
        ctx.fillText(m.text, curX, pillY);
        curX += m.tw + wordGap;
      });
    } else if (styleId === "trailer") {
      // Trailer: Impact Block Caps
      const fs = Math.round(64 * sizeScale);
      ctx.font = `900 ${fs}px 'Anton', Impact, sans-serif`;
      ctx.textBaseline = "middle";
      const wordGap = 22 * sizeScale;
      const measured = currentChunk.map((w) => {
        const text = w.word.toUpperCase().replace(/[.,!?;:]+$/g, "");
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + Math.max(0, measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m) => {
        ctx.shadowColor = m.isCurrent ? "#FF2D20" : "rgba(0,0,0,0.9)";
        ctx.shadowBlur = m.isCurrent ? 16 : 12;
        ctx.lineWidth = Math.round(6 * sizeScale);
        ctx.strokeStyle = "#000000";
        ctx.strokeText(m.text, curX, pillY);
        ctx.fillStyle = m.isCurrent ? "#FF2D20" : "#F4F4F4";
        ctx.fillText(m.text, curX, pillY);
        curX += m.tw + wordGap;
      });
    } else if (styleId === "clean") {
      // Clean: Modern Inter subtitles
      const fs = Math.round(46 * sizeScale);
      ctx.font = `700 ${fs}px 'Inter', 'Plus Jakarta Sans', sans-serif`;
      ctx.textBaseline = "middle";
      const wordGap = 15 * sizeScale;
      const measured = currentChunk.map((w) => {
        const text = w.word;
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + Math.max(0, measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m) => {
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = Math.round(4 * sizeScale);
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.strokeText(m.text, curX, pillY);
        ctx.fillStyle = m.isCurrent ? "#FFFFFF" : "rgba(255,255,255,0.78)";
        ctx.fillText(m.text, curX, pillY);
        curX += m.tw + wordGap;
      });
    } else if (styleId === "whisper") {
      // Whisper: Jost light wide tracking
      const fs = Math.round(40 * sizeScale);
      ctx.font = `400 ${fs}px 'Jost', 'Inter', sans-serif`;
      ctx.textBaseline = "middle";
      const wordGap = 24 * sizeScale;
      const measured = currentChunk.map((w) => {
        const text = w.word.toUpperCase().replace(/[.,!?;:]+$/g, "");
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + Math.max(0, measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m) => {
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = m.isCurrent ? "#FFFFFF" : "rgba(255,255,255,0.65)";
        ctx.fillText(m.text, curX, pillY);
        curX += m.tw + wordGap;
      });
    } else if (styleId === "hormozi") {
      // Hormozi: Bold Montserrat 900 with thick black outline & yellow/green active word pop
      const fs = Math.round(56 * sizeScale);
      ctx.font = `900 ${fs}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
      ctx.textBaseline = "middle";
      const wordGap = 18 * sizeScale;
      const measured = currentChunk.map((w) => {
        const text = w.word.toUpperCase().replace(/[.,!?;:]+$/g, "");
        const tw = ctx.measureText(text).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { text, tw, isCurrent };
      });
      const totalW = measured.reduce((acc, m) => acc + m.tw, 0) + Math.max(0, measured.length - 1) * wordGap;
      let curX = (W - totalW) / 2;
      measured.forEach((m, idx) => {
        ctx.save();
        const cx = curX + m.tw / 2;
        if (m.isCurrent) {
          ctx.translate(cx, pillY);
          ctx.scale(1.12, 1.12);
          ctx.translate(-cx, -pillY);
        }
        ctx.shadowColor = "rgba(0,0,0,0.95)";
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 4;
        ctx.lineWidth = Math.round(10 * sizeScale);
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000000";
        ctx.strokeText(m.text, curX, pillY);
        ctx.fillStyle = m.isCurrent ? (idx % 2 === 1 ? "#00FF66" : "#FFE814") : "#FFFFFF";
        ctx.fillText(m.text, curX, pillY);
        ctx.restore();
        curX += m.tw + wordGap;
      });
    } else {
      // Pill: Frosted Pill Kinetic Pop
      const fs = Math.round(48 * sizeScale);
      ctx.font = `900 ${fs}px 'Montserrat', 'Plus Jakarta Sans', sans-serif`;
      ctx.textBaseline = "middle";
      const wordGap = 18 * sizeScale;
      const wordPadX = 18 * sizeScale;
      const pillPadX = 32 * sizeScale;
      const pillH = Math.round(92 * sizeScale);

      const measured = currentChunk.map((w) => {
        const upper = w.word.toUpperCase().replace(/[.,!?;:]+$/g, "");
        const tw = ctx.measureText(upper).width;
        const isCurrent = activeWord !== null && w.word === activeWord.word;
        return { upper, tw, boxW: tw + wordPadX * 2, isCurrent };
      });

      const totalWordsW = measured.reduce((acc, m) => acc + m.boxW, 0) + Math.max(0, measured.length - 1) * wordGap;
      const pillW = Math.min(1000, totalWordsW + pillPadX * 2);
      const pillX = (W - pillW) / 2;
      const drawY = pillY - pillH / 2;

      // Outer pill capsule
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "rgba(10, 11, 16, 0.88)";
      ctx.beginPath();
      ctx.roundRect(pillX, drawY, pillW, pillH, 40);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.stroke();

      let cursorX = (W - totalWordsW) / 2;
      const centerY = drawY + pillH / 2;

      measured.forEach((m) => {
        if (m.isCurrent) {
          const wBoxH = Math.round(64 * sizeScale);
          const wBoxY = centerY - wBoxH / 2;
          ctx.save();
          ctx.shadowColor = palette.highlight + "90";
          ctx.shadowBlur = 18;
          ctx.fillStyle = palette.highlight || "#FFE600";
          ctx.beginPath();
          ctx.roundRect(cursorX, wBoxY, m.boxW, wBoxH, 20);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = "#111111";
          ctx.textAlign = "center";
          ctx.fillText(m.upper, cursorX + m.boxW / 2, centerY + 2);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
          ctx.textAlign = "center";
          ctx.fillText(m.upper, cursorX + m.boxW / 2, centerY + 2);
        }
        cursorX += m.boxW + wordGap;
      });
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Preloads B-roll images and connected Personal Gallery videos referenced by `scenes`
 * so the 2D canvas compositor can draw them synchronously.
 */
export async function preloadExplainerBrollImages(
  scenes: SceneSegment[]
): Promise<Record<string, HTMLImageElement | HTMLVideoElement>> {
  const map: Record<string, HTMLImageElement | HTMLVideoElement> = {};
  if (typeof window === "undefined") return map;

  const tasks: Promise<void>[] = [];
  let samLoaded = false;

  for (const s of scenes) {
    if (s.assetUrl) {
      const isVideoAsset =
        s.galleryClipKind === "video" ||
        /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(s.assetUrl) ||
        s.assetUrl.includes("#gallery-video");

      if (isVideoAsset) {
        tasks.push(
          new Promise<void>((resolve) => {
            const vid = document.createElement("video");
            vid.crossOrigin = "anonymous";
            vid.muted = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.preload = "auto";
            vid.playsInline = true;
            let settled = false;
            const finish = () => {
              if (settled) return;
              settled = true;
              map[s.id] = vid;
              vid.play().catch(() => {});
              resolve();
            };
            const timer = setTimeout(finish, 1200);
            vid.onloadeddata = () => {
              clearTimeout(timer);
              if (typeof s.assetStart === "number") {
                try { vid.currentTime = s.assetStart; } catch {}
              }
              finish();
            };
            vid.onerror = () => {
              clearTimeout(timer);
              resolve();
            };
            vid.src = s.assetUrl!;
            vid.load();
          })
        );
      } else {
        tasks.push(
          new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              map[s.id] = img;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = s.assetUrl!;
          })
        );
      }
    }
    if (s.samCutoutUrl && !samLoaded) {
      samLoaded = true;
      tasks.push(
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            map["__sam_cutout__"] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = s.samCutoutUrl!;
        })
      );
    }
    const trackUrl = s.samBox?.trackUrl || s.samTrackUrl;
    if (trackUrl && !SAM_TRACKS_CACHE.has(trackUrl)) {
      tasks.push(
        fetch(trackUrl)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: any) => {
            if (data && Array.isArray(data.frames)) {
              SAM_TRACKS_CACHE.set(trackUrl, data as SamMaskTrack);
            }
          })
          .catch(() => {})
      );
    }
  }

  await Promise.all(tasks);
  return map;
}

/**
 * Forces the browser to preload and rasterize all Google Fonts needed by the canvas compositor,
 * guaranteeing identical text dimensions, kerning, and pill metrics between preview and export.
 */
export async function ensureExplainerFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !(document as any).fonts) return;
  const fontSpecs = [
    "900 42px 'Plus Jakarta Sans'",
    "800 38px 'Plus Jakarta Sans'",
    "700 25px 'Plus Jakarta Sans'",
    "900 48px 'Montserrat'",
    "400 80px 'Luckiest Guy'",
    "400 50px 'DM Serif Display'",
    "800 42px 'Poppins'",
    "400 64px 'Bebas Neue'",
    "700 44px 'Cinzel'",
    "500 54px 'Bodoni Moda'",
    "400 76px 'Anton'",
    "500 36px 'Inter'",
    "300 38px 'Jost'",
    "700 25px 'JetBrains Mono'",
    "800 28px 'JetBrains Mono'",
    "700 54px 'Instrument Serif'",
  ];
  try {
    await Promise.all(
      fontSpecs.map((spec) => (document as any).fonts.load(spec).catch(() => null))
    );
    await (document as any).fonts.ready;
  } catch (err) {
    console.warn("[Fonts] Explainer font preloader warning:", err);
  }
}

/**
 * Deterministically seeks an attached video element to targetTime and resolves only after
 * the GPU/browser decoder presents the decoded video frame.
 */
async function seekVideoAndWait(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const safeTime = Math.max(0, Math.min((video.duration || targetTime) - 0.02, targetTime));
  if (Math.abs(video.currentTime - safeTime) < 0.002 && video.readyState >= 2) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        video.removeEventListener("seeked", handleSeeked);
        video.removeEventListener("error", handleError);
        resolve();
      }
    };
    const handleError = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        video.removeEventListener("seeked", handleSeeked);
        reject(new Error(`Video decoder failed while seeking to ${safeTime.toFixed(3)}s (media error ${video.error?.code || "unknown"}).`));
      }
    };
    const handleSeeked = () => {
      if (video.readyState >= 2) {
        finish();
        return;
      }
      if ("requestVideoFrameCallback" in video) {
        try {
          (video as any).requestVideoFrameCallback(() => finish());
          return;
        } catch {}
      }
      const waitForData = () => {
        if (done) return;
        if (video.readyState >= 2) {
          finish();
          return;
        }
        setTimeout(waitForData, 16);
      };
      waitForData();
    };
    // A missing decoded frame should fail the export instead of silently encoding
    // an empty canvas. 10 seconds allows slower long-GOP source videos to seek.
    const timer = window.setTimeout(() => {
      if (!done) {
        done = true;
        video.removeEventListener("seeked", handleSeeked);
        video.removeEventListener("error", handleError);
        reject(new Error(`Timed out waiting for decoded source video at ${safeTime.toFixed(3)}s; no blank MP4 frame was written.`));
      }
    }, 10_000);
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.currentTime = safeTime;
  });
}

/**
 * Deterministically exports the exact 1080×1920 Story Explainer frames across the video timeline
 * at fixed timestamps t = f / fps, guaranteeing identical visuals between live preview and exported MP4.
 */
export async function exportExactExplainerMp4(params: {
  cleanVideoUrl: string;
  runId?: string;
  scenes: SceneSegment[];
  words: WordItem[];
  duration: number;
  palette: VisualPalette;
  layoutMode: ExplainerLayoutMode;
  brollImages?: Record<string, HTMLImageElement | HTMLVideoElement>;
  captionStyleId?: CaptionStyleId;
  captionSizeScale?: number;
  captionPosition?: "bottom" | "center" | "top";
  captionYOffset?: number;
  captionYPercent?: number;
  hideCaptions?: boolean;
  hiddenCalloutIds?: string[] | Set<string>;
  cutoutPosition?: { xPercent: number; yPercent: number } | "bottom-left" | "bottom-right";
  cutoutScale?: number;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const {
    cleanVideoUrl,
    runId,
    scenes,
    words,
    duration,
    palette,
    layoutMode,
    captionPosition,
    captionYOffset,
    captionYPercent,
    hideCaptions,
    hiddenCalloutIds,
    cutoutPosition,
    cutoutScale,
    onProgress,
  } = params;

  onProgress?.(2);
  const brollImages =
    params.brollImages || (await preloadExplainerBrollImages(scenes));

  await ensureExplainerFontsLoaded();

  // 1080×1920 compositing canvas
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 1080×1920 2D canvas context.");
  }

  // Preload video into local in-memory blob URL so seeking has zero network delay and zero buffering stalls
  onProgress?.(4);
  let localBlobUrl = cleanVideoUrl;
  let createdBlobUrl = false;
  if (cleanVideoUrl && !cleanVideoUrl.startsWith("blob:")) {
    try {
      const resp = await fetch(cleanVideoUrl);
      if (resp.ok) {
        const vidBlob = await resp.blob();
        localBlobUrl = URL.createObjectURL(vidBlob);
        createdBlobUrl = true;
      }
    } catch (fetchErr) {
      console.warn("[Export] Could not preload video blob, falling back to direct URL:", fetchErr);
    }
  }

  // Dedicated decoder video element (placed within viewport at bottom-right with tiny opacity so GPU decoding stays active)
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";
  video.style.position = "fixed";
  video.style.bottom = "0px";
  video.style.right = "0px";
  video.style.width = "320px";
  video.style.height = "180px";
  video.style.opacity = "0.02";
  video.style.zIndex = "-1";
  video.style.pointerEvents = "none";
  if (typeof document !== "undefined" && document.body) {
    document.body.appendChild(video);
  }
  video.src = localBlobUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("Failed to load source video for deterministic export."));
      };
      const cleanup = () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onErr);
      };
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("error", onErr);
      video.load();
    });

    const totalDur =
      video.duration && Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : duration;

    const fps = 30;
    const totalFrames = Math.max(1, Math.round(totalDur * fps));
  let frameError: Error | null = null;

    // Initialize WebCodecs VideoEncoder with multiple fallback codecs (H.264 Annex-B, standard AVC, VP8, VP9)
    let encoder: any = null;
    let encoderFailure: Error | null = null;
    let encodingFailed = false;
    let lastEncodedTimestamp = -1;
    const chunks: Uint8Array[] = [];
    let frameFormData: FormData | null = null;
    let hasWebCodecs = false;

    if (typeof window !== "undefined" && typeof (window as any).VideoEncoder === "function") {
      const VideoEncoderClass = (window as any).VideoEncoder;
      // Only Annex-B H.264 is accepted: the server muxes it into MP4. Other codecs (AVCC/VP8/VP9)
      // produce raw chunks that cannot be remuxed and gave unplayable downloads.
      const candidateConfigs: any[] = [
        { codec: "avc1.640028", width: 1080, height: 1920, bitrate: 10_000_000, framerate: fps, avc: { format: "annexb" } },
        { codec: "avc1.64002A", width: 1080, height: 1920, bitrate: 10_000_000, framerate: fps, avc: { format: "annexb" } },
        { codec: "avc1.4D0028", width: 1080, height: 1920, bitrate: 10_000_000, framerate: fps, avc: { format: "annexb" } },
      ];

      for (const cfg of candidateConfigs) {
        try {
          const support = await VideoEncoderClass.isConfigSupported(cfg).catch(() => null);
          if (support && support.supported) {
            encoder = new VideoEncoderClass({
              output: (chunk: any) => {
                const buf = new Uint8Array(chunk.byteLength);
                chunk.copyTo(buf);
                chunks.push(buf);
              },
              error: (err: any) => {
                encodingFailed = true;
                encoderFailure = err instanceof Error ? err : new Error(String(err));
                if (frameError) {
                  frameError = new Error(`${frameError.message}; encoder: ${encoderFailure.message}`);
                }
                console.error("[WebCodecs] Encoding failed:", err);
              },
            });
            encoder.configure(cfg);
            hasWebCodecs = true;
            break;
          }
        } catch {}
      }
    }

    // Firefox and Safari may not expose WebCodecs. Record the same rendered canvas
    // frames and let the existing FFmpeg endpoint encode them into MP4.
    if (!hasWebCodecs) {
      frameFormData = new FormData();
    }

    // Deterministic frame-by-frame seek and render loop
    for (let f = 0; f < totalFrames; f++) {
      const t = Math.min(totalDur - 0.033, +(f / fps).toFixed(4));
      await seekVideoAndWait(video, t);
      try {
      frameError = null;
      renderExplainerFrameToCanvas(ctx, video, t, {
        scenes,
        words,
        duration: totalDur,
        palette,
        layoutMode,
        brollImages,
        captionStyleId: params.captionStyleId,
        captionSizeScale: params.captionSizeScale,
        captionPosition,
        captionYOffset,
        captionYPercent,
        hideCaptions,
        hiddenCalloutIds,
        cutoutPosition,
        cutoutScale,
      });

      if (hasWebCodecs && encoder && encoder.state === "configured") {
        const VideoFrameClass = (window as any).VideoFrame;
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error(`Source video is not decoded for frame ${f} at ${t.toFixed(3)}s.`);
        }
        const vFrame = new VideoFrameClass(canvas, {
          timestamp: Math.round((f * 1_000_000) / fps),
          duration: Math.round(1_000_000 / fps),
        });
        encoder.encode(vFrame, { keyFrame: f % (fps * 2) === 0 });
        vFrame.close();
        lastEncodedTimestamp = Math.round((f * 1_000_000) / fps);
      }

      if (frameFormData) {
        const frameBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
        if (!frameBlob) throw new Error(`Could not encode fallback frame ${f}.`);
        frameFormData.append(`frame_${f}`, frameBlob, `frame_${f}.jpg`);
      }

      onProgress?.(Math.min(88, 6 + Math.round((f / totalFrames) * 82)));
      if (frameError) throw frameError;
      } catch (frameErr) {
        if (frameErr instanceof Error) {
          throw new Error(`MP4 export stopped at frame ${f}/${totalFrames} (${t.toFixed(3)}s): ${frameErr.message}`);
        }
        throw frameErr;
      }
    }

    if (hasWebCodecs && encoder && encoder.state === "configured") {
      try {
        await encoder.flush();
      } catch (flushErr) {
        encodingFailed = true;
        encoderFailure = flushErr instanceof Error ? flushErr : new Error(String(flushErr));
      }
      try {
        encoder.close();
      } catch {}
    }
    if (encodingFailed) {
      throw new Error(`WebCodecs could not encode the complete video (last submitted frame ${lastEncodedTimestamp / 1_000_000}s): ${encoderFailure?.message || "unknown encoder error"}`);
    }

    onProgress?.(90);

    const qs = new URLSearchParams();
    if (runId) qs.set("runId", runId);
    if (cleanVideoUrl) qs.set("cleanVideoUrl", cleanVideoUrl);

    let remuxResp: Response;

    if (chunks.length > 0) {
      const totalByteLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
      const combined = new Uint8Array(totalByteLen);
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.byteLength;
      }

      remuxResp = await fetch(`/api/remux-mp4?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: combined.buffer,
      });
    } else if (frameFormData) {
      remuxResp = await fetch(`/api/remux-mp4?${qs.toString()}`, {
        method: "POST",
        body: frameFormData,
      });
    } else {
      throw new Error("No rendered video frames were generated during export.");
    }

    if (!remuxResp.ok) {
      const errJson = await remuxResp.json().catch(() => ({}));
      throw new Error(errJson.error || `MP4 remux failed (HTTP ${remuxResp.status}).`);
    }

    const mp4ArrayBuffer = await remuxResp.arrayBuffer();
    if (!mp4ArrayBuffer || mp4ArrayBuffer.byteLength < 1000) {
      throw new Error("Muxed MP4 buffer was empty or corrupted.");
    }

    onProgress?.(100);
    return new Blob([mp4ArrayBuffer], { type: "video/mp4" });
  } finally {
    try {
      if (video.parentElement) video.parentElement.removeChild(video);
      if (createdBlobUrl) URL.revokeObjectURL(localBlobUrl);
    } catch {}
  }
}

