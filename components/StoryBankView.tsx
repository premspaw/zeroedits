"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Eye,
  Flame,
  Hash,
  Layers,
  Lightbulb,
  Menu,
  Mic,
  MicOff,
  Music2,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Video,
  Wand2,
  X,
  QrCode,
  Smartphone,
  RotateCcw,
  ExternalLink,
  Camera,
  Square,
  Check,
  Edit3,
  Copy,
  Lock,
  Unlock,
  Send,
  MessageSquare,
  Bot,
  FileText,
  ListOrdered,
} from "lucide-react";
import {
  useZeeBrain,
  CATEGORY_META,
  type LifeCategory,
  type MemoryBankItem,
} from "@/lib/zee-brain";

export interface ScriptBeatCard {
  id: number;
  label: string;
  range: string;
  text: string;
  visual: string;
  motion: string;
  voice: string;
  coaching: string;
  durationSec: number;
  bRollLabel?: string;
  matchedPhotoUrl?: string;
}

export interface CompactMemoryLog {
  id: string;
  title: string;
  time: string;
  emotion: string;
  color: string;
  note: string;
  category: LifeCategory;
  story: string;
  suggestionTitle: string;
  suggestionSub: string;
  beats: ScriptBeatCard[];
}

interface StoryBankViewProps {
  onSwitchToStudio?: (fullScriptText?: string, title?: string) => void;
  onCompleteRecordingToStudio?: (
    videoFile: File,
    fullScriptText: string,
    title: string
  ) => void;
  hideHeader?: boolean;
  initialTopicFromYou?: string;
}

const DEFAULT_BEATS: ScriptBeatCard[] = [
  {
    id: 1,
    label: "HOOK",
    range: "0–2s",
    text: "Still editing reels manually for 3 hours?",
    visual:
      "Close-up of Prem staring at timeline, cursor lagging — jump cut to 3x speed scrub. Paper ripped corner shows clock.",
    motion: "whip-pan + scale pop",
    voice: "annoyed, fast — your real voice",
    coaching:
      "use your own voice here, faster pace — like you're venting to a friend. Add that sigh before 'manually'.",
    durationSec: 3,
    bRollLabel: "B-ROLL + PAPER CUT",
  },
  {
    id: 2,
    label: "TRANSFORM",
    range: "2–5s",
    text: "I was same, then I found this workflow that cuts it to 11 minutes.",
    visual:
      "Torn paper reveal: before/after timeline — messy → clean with AI blocks. Your hands tap 'Generate'.",
    motion: "paper slide left, ink bleed",
    voice: "calm, confiding",
    coaching:
      "Lower your shoulders, look slightly off-cam. This is the 'let me show you' moment your audience trusts.",
    durationSec: 4,
    bRollLabel: "B-ROLL + PAPER CUT",
  },
  {
    id: 3,
    label: "MAGIC",
    range: "5–8s",
    text: "Watch — prompt in, 10 sec transformation. Count with me: 3, 2, 1...",
    visual:
      "Split screen counting numbers torn out, AI avatar renders, UGC captions auto-popping like stickers.",
    motion: "countdown zoom, sticker burst",
    voice: "playful, counting",
    coaching:
      "Point at screen on each count. Your gym memory energy works here — driven but light.",
    durationSec: 4,
    bRollLabel: "B-ROLL + PAPER CUT",
  },
  {
    id: 4,
    label: "PAYOFF",
    range: "8–10s",
    text: "Comment AI and I'll send the exact prompt + template. No gatekeeping.",
    visual:
      "You leaning forward, paper CTA 'COMMENT AI' taped on desk. B-roll: DMs flooding screenshot (blurred).",
    motion: "dolly-in + CTA wiggle",
    voice: "warm, direct CTA",
    coaching:
      "Smile on 'no gatekeeping' — that's your 2am call vulnerability tone. It converts.",
    durationSec: 3,
    bRollLabel: "B-ROLL + PAPER CUT",
  },
];

const CURATED_MEMORY_LOGS: CompactMemoryLog[] = [
  {
    id: "curated-pitch",
    title: "Client pitch anxiety",
    time: "2:04",
    emotion: "tense",
    color: "#FFB5A7",
    note: "84% engagement",
    category: "work",
    story:
      "Client asked for 5 revisions at 11pm while I was still editing manually — until we automated the entire AI UGC pipeline.",
    suggestionTitle: "Make reel: POV: client asks for 5 revisions at 11pm",
    suggestionSub:
      "Use your 2:04am voice log, add paper-cut counting of revisions.",
    beats: DEFAULT_BEATS,
  },
  {
    id: "curated-chai",
    title: "Morning chai thought",
    time: "2:12",
    emotion: "calm",
    color: "#F5D6A8",
    note: "idea on hook",
    category: "personal",
    story:
      "Every morning starts with chai and three raw lines in a physical notebook before touching a single screen.",
    suggestionTitle:
      "Make reel: POV: 45 mins of analog notebook before touching AI",
    suggestionSub:
      "Pair your 2:12 morning chai voice log with warm paper-cut B-roll.",
    beats: [
      {
        id: 1,
        label: "HOOK",
        range: "0–3s",
        text: "Why do my best AI product ideas always happen over morning chai with zero screens?",
        visual:
          "Steam rising from chai cup next to a physical notebook — torn paper clock badge shows 6:45 AM.",
        motion: "soft push-in + paper tear",
        voice: "calm, unhurried morning voice",
        coaching:
          "hold the cup naturally, speak softly for the first two words so viewers lean in.",
        durationSec: 3,
        bRollLabel: "MORNING B-ROLL + PAPER CUT",
      },
      {
        id: 2,
        label: "TRANSFORM",
        range: "3–6s",
        text: "For months I started my day inside Slack and notifications — and my creative output felt like autopilot.",
        visual:
          "Torn paper split: chaotic notification wall vs clean ink lines in your notebook.",
        motion: "paper slide left, ink bleed",
        voice: "honest, confiding",
        coaching:
          "slight head shake on 'autopilot' — let your founder honesty come through.",
        durationSec: 3,
        bRollLabel: "NOTEBOOK + PAPER CUT",
      },
      {
        id: 3,
        label: "MAGIC",
        range: "6–9s",
        text: "Now I write 3 raw lines by hand, feed that voice note to Zee, and my entire reel script is ready in 60 seconds.",
        visual:
          "Handwritten note morphs into your AI studio timeline with kinetic captions popping.",
        motion: "snap zoom + sticker burst",
        voice: "energized, clear",
        coaching:
          "tap the notebook then point to the screen — bridges analog soul with AI speed.",
        durationSec: 3,
        bRollLabel: "AI STUDIO + PAPER CUT",
      },
      {
        id: 4,
        label: "PAYOFF",
        range: "9–12s",
        text: "Protect your first 45 minutes. Comment CHAI and I'll share my morning founder workflow.",
        visual:
          "Warm smile at desk, taped paper card 'PROTECT YOUR MORNING' in foreground.",
        motion: "dolly-in + CTA wiggle",
        voice: "warm, friend-to-friend CTA",
        coaching:
          "pause half a beat before 'Comment CHAI' and keep warm eye contact.",
        durationSec: 3,
        bRollLabel: "CTA + PAPER CUT",
      },
    ],
  },
  {
    id: "curated-2am",
    title: "Love - 2am call",
    time: "2:31",
    emotion: "vulnerable",
    color: "#C1B6FF",
    note: "storytelling gold",
    category: "relationships",
    story:
      "A 2am unfiltered conversation reminded me that people don't connect with perfection — they connect with what's real.",
    suggestionTitle:
      "Make reel: What a 2AM call taught me about building real things",
    suggestionSub:
      "Use your 2:31 vulnerable voice log + low-light studio B-roll.",
    beats: [
      {
        id: 1,
        label: "HOOK",
        range: "0–3s",
        text: "Someone told me one sentence on a 2 AM call last night that completely changed how I build.",
        visual:
          "Warm desk lamp glow at 2:00 AM, phone on speaker, torn paper timestamp '02:14 AM'.",
        motion: "slow push-in + subtle grain",
        voice: "quiet, vulnerable — late-night tone",
        coaching:
          "drop your volume 20% here. Make it feel like the viewer is right there at 2 AM.",
        durationSec: 3,
        bRollLabel: "2AM LAMP + PAPER CUT",
      },
      {
        id: 2,
        label: "TRANSFORM",
        range: "3–6s",
        text: "We spend hours polishing every frame so we look invincible online, hiding the real messy journey.",
        visual:
          "Torn paper reveal stripping away a glossy template to show raw studio notes.",
        motion: "paper peel + ink bleed",
        voice: "reflective, real",
        coaching:
          "look briefly down at your desk, then straight back into the lens.",
        durationSec: 3,
        bRollLabel: "RAW NOTES + PAPER CUT",
      },
      {
        id: 3,
        label: "MAGIC",
        range: "6–9s",
        text: "The moment I started putting my real life, my Gokarna trips, and my honest lessons into my work — everything clicked.",
        visual:
          "Quick 3-frame paper collage: Gokarna cliff sunset → studio whiteboard → engagement graph.",
        motion: "3-beat collage pop",
        voice: "warm conviction",
        coaching:
          "let your energy rise naturally on 'everything clicked'.",
        durationSec: 3,
        bRollLabel: "GOKARNA + STUDIO CUT",
      },
      {
        id: 4,
        label: "PAYOFF",
        range: "9–12s",
        text: "Stop sanding off your human edges. Save this for the next time you overthink a post.",
        visual:
          "Direct eye contact, paper sticker 'STAY HUMAN' taped to monitor corner.",
        motion: "gentle dolly-in",
        voice: "warm, grounding sign-off",
        coaching:
          "slight nod at the end — leave 0.5s of quiet before the cut.",
        durationSec: 3,
        bRollLabel: "SIGN-OFF + PAPER CUT",
      },
    ],
  },
  {
    id: "curated-aivideo",
    title: "AI video idea",
    time: "2:18",
    emotion: "excited",
    color: "#A8E6CF",
    note: "your top saver",
    category: "insight",
    story:
      "Turning raw spoken memories directly into paper-cut UGC ads and reels without touching a complex timeline.",
    suggestionTitle:
      "Make reel: How I turn a 2-min voice note into an AI UGC Reel",
    suggestionSub:
      "Combine your 2:18 AI video idea log with before/after paper-cut blocks.",
    beats: DEFAULT_BEATS,
  },
  {
    id: "curated-gokarna",
    title: "Gokarna dawn & gym drive",
    time: "2:02",
    emotion: "driven",
    color: "#FFE082",
    note: "Gokarna B-roll ready",
    category: "travel",
    story:
      "Walking the coastal cliffs in Gokarna at 6 AM with espresso unlocked the exact clarity I couldn't see from my desk.",
    suggestionTitle:
      "Make reel: I left my desk for Gokarna — and solved a 3-month bug",
    suggestionSub:
      "Pair your Gokarna GPS cliff photos with your 2:02 driven voice log.",
    beats: [
      {
        id: 1,
        label: "HOOK",
        range: "0–3s",
        text: "I left my studio desk for 72 hours in Gokarna — and realized I was solving the wrong problem.",
        visual:
          "Om Beach golden cliff in Gokarna at sunrise with torn-paper GPS tag '14.5°N GOKARNA'.",
        motion: "whip-pan + horizon pop",
        voice: "driven, crisp dawn energy",
        coaching:
          "start with energy right on '72 hours in Gokarna' — your travel visuals hook immediately.",
        durationSec: 3,
        bRollLabel: "GOKARNA GPS + PAPER CUT",
      },
      {
        id: 2,
        label: "TRANSFORM",
        range: "3–6s",
        text: "Back at my desk, I was trying to force features. Standing by the Arabian Sea, the real bottleneck became obvious.",
        visual:
          "Torn paper transition from Kudle headland palm horizon to your clean studio architecture diagram.",
        motion: "paper slide left, ink bleed",
        voice: "calm, sharp clarity",
        coaching:
          "use your hands to contrast 'back at my desk' vs 'standing by the sea'.",
        durationSec: 3,
        bRollLabel: "COAST TO STUDIO CUT",
      },
      {
        id: 3,
        label: "MAGIC",
        range: "6–9s",
        text: "We rebuilt the workflow around your real memories — voice in, paper-cut story out in 11 minutes.",
        visual:
          "Split screen: Gokarna travel folder auto-syncing into the AI reel timeline.",
        motion: "countdown zoom, sticker burst",
        voice: "excited, builder pride",
        coaching:
          "point at the synced Gokarna folder cutaway — shows real product magic.",
        durationSec: 3,
        bRollLabel: "WALLET SYNC + PAPER CUT",
      },
      {
        id: 4,
        label: "PAYOFF",
        range: "9–12s",
        text: "Change your horizon when you're stuck. Comment GOKARNA for my founder reset checklist.",
        visual:
          "Prem smiling in studio with Gokarna polaroid taped to monitor edge.",
        motion: "dolly-in + CTA wiggle",
        voice: "warm, direct CTA",
        coaching:
          "warm smile at the end — blends travel soul with founder execution.",
        durationSec: 3,
        bRollLabel: "POLAROID CTA + PAPER CUT",
      },
    ],
  },
];

const POPPING_IG_FORMATS = [
  {
    title: "POV: your edit hits different",
    views: "2.4M",
    growth: "+312%",
    hookPrefix: "POV: your edit hits different when you stop doing it manually — ",
  },
  {
    title: "I was today years old...",
    views: "1.8M",
    growth: "+188%",
    hookPrefix:
      "I was today years old when I realized you can turn a 2-min voice note into this — ",
  },
  {
    title: "Tell me you edit without telling me",
    views: "956K",
    growth: "+94%",
    hookPrefix:
      "Tell me you're a founder building AI video tools at 2am without telling me — ",
  },
];

const TRENDING_AUDIOS = [
  {
    name: "sped up phonk",
    use: "12.4K reels",
    bars: [65, 88, 52, 95, 74, 60, 92, 48, 84, 70, 96, 62],
  },
  {
    name: "soft morning vlog",
    use: "8.1K reels",
    bars: [45, 62, 78, 55, 82, 68, 50, 75, 60, 85, 58, 72],
  },
];

const NICHE_PILLS = [
  "AI avatars",
  "UGC ads with paper cut",
  "Before/After AI",
  "AI voice clones",
  "Prompt packs",
];

const HASHTAGS = [
  "#AIVideo",
  "#UGCAds",
  "#ContentCreator",
  "#PremEdits",
  "#AIautomation",
  "#ReelTips",
];

const ANGLES = ["POV burnout", "Client savage", "Founder flex", "Gokarna horizon"];

export interface ScriptAngleOption {
  id: string;
  badge: string;
  title: string;
  hook: string;
  tone: string;
  targetLength: "15s" | "30s";
  metrics: { hookRate: string; saves: string };
  fullScriptText: string;
  beats: ScriptBeatCard[];
}

export function buildScriptAnglesForMemory(
  mem: CompactMemoryLog,
  userName: string = "Prem"
): ScriptAngleOption[] {
  const baseTitle = mem?.title || "My Founder Story";

  // 1. Raw POV (Vulnerable Founder)
  const opt1Beats: ScriptBeatCard[] = [
    {
      id: 1,
      label: "HOOK",
      range: "0–3s",
      text:
        mem?.beats?.[0]?.text ||
        `POV: ${baseTitle.toLowerCase()} — and you realize nobody talks about the messy part.`,
      visual: "Handheld close-up in studio, warm natural light, torn-paper timestamp badge.",
      motion: "soft push-in + subtle paper jitter",
      voice: "raw, vulnerable founder tone",
      coaching: "Speak softly for the first 3 words so viewers lean in and stop scrolling.",
      durationSec: 3,
      bRollLabel: "RAW FOUNDER POV",
    },
    {
      id: 2,
      label: "TRANSFORM",
      range: "3–7s",
      text:
        mem?.beats?.[1]?.text ||
        `For months I was trapped doing this manually until 2 AM, feeling like an autopilot robot.`,
      visual: "Torn paper split: chaotic screen capture vs clean notebook ink lines.",
      motion: "paper tear transition + speed cut",
      voice: "honest, confiding realization",
      coaching: "Slight head tilt — let genuine founder transparency show.",
      durationSec: 4,
      bRollLabel: "STRUGGLE VS SHIFT",
    },
    {
      id: 3,
      label: "MAGIC",
      range: "7–11s",
      text:
        mem?.beats?.[2]?.text ||
        `Then we rebuilt our entire workflow around real voice notes — turning 2-minute thoughts into finished video.`,
      visual: "Fast-motion timeline cutaway: voice waveform auto-animating into paper-cut scenes.",
      motion: "dolly zoom + sticker pop",
      voice: "clear, energized, builder pride",
      coaching: "Point towards the screen cutaway — showcase the simplicity.",
      durationSec: 4,
      bRollLabel: "WORKFLOW IN ACTION",
    },
    {
      id: 4,
      label: "PAYOFF",
      range: "11–15s",
      text:
        mem?.beats?.[3]?.text ||
        `Stop over-editing. Comment REEL and I'll send you our exact prompt + setup for free.`,
      visual: `${userName} smiling directly at camera, torn paper CTA 'COMMENT REEL' taped to desk.`,
      motion: "dolly-in + CTA wiggle",
      voice: "warm, direct CTA",
      coaching: "Smile as you say 'for free' — authentic generosity converts.",
      durationSec: 4,
      bRollLabel: "DESK CTA + PAPER BADGE",
    },
  ];

  // 2. Contrarian Pattern-Interrupt
  const opt2Beats: ScriptBeatCard[] = [
    {
      id: 1,
      label: "HOOK",
      range: "0–3s",
      text: `Stop editing reels frame-by-frame. Here's why that 3-hour manual edit is actually hurting your reach.`,
      visual: "Direct eye contact, hand up to camera with bold paper-cut 'STOP' stencil.",
      motion: "hard cut + whip punch",
      voice: "direct, authoritative, scroll-stopping",
      coaching: "Hit 'Stop' with real authority — immediate pattern interrupt in feed.",
      durationSec: 3,
      bRollLabel: "PATTERN INTERRUPT",
    },
    {
      id: 2,
      label: "TRANSFORM",
      range: "3–7s",
      text: `Viewers don't connect with sterile 60fps polished ads anymore. They save raw, personal stories like this.`,
      visual: "Side-by-side metric comparison: high-gloss ad vs raw voice-note reel metrics.",
      motion: "split-screen slider",
      voice: "grounded, insightful contrast",
      coaching: "Use your hands to contrast 'sterile' with 'real'.",
      durationSec: 4,
      bRollLabel: "RETENTION COMPARISON",
    },
    {
      id: 3,
      label: "MAGIC",
      range: "7–11s",
      text: `We feed our raw voice notes into our AI engine, and it builds kinetic paper layers around our exact voice.`,
      visual: "Paper layers falling into place with tactile shadow depth.",
      motion: "layered pop + kinetic bounce",
      voice: "fascinated, quick tempo",
      coaching: "Keep pace crisp — maintain high viewer velocity.",
      durationSec: 4,
      bRollLabel: "PAPER ENGINE DEMO",
    },
    {
      id: 4,
      label: "PAYOFF",
      range: "11–15s",
      text: `Save this reel before your next shoot, and drop a comment below if you want the template link.`,
      visual: "Animated save bookmark icon + torn paper link capsule.",
      motion: "bookmark pulse + camera zoom",
      voice: "actionable, clear instruction",
      coaching: "Look straight down lens on 'Save this reel'.",
      durationSec: 4,
      bRollLabel: "SAVE BOOKMARK CTA",
    },
  ];

  // 3. 3-Step Rapid Breakdown
  const opt3Beats: ScriptBeatCard[] = [
    {
      id: 1,
      label: "HOOK",
      range: "0–3s",
      text: `Here is the exact 3-step storytelling blueprint we use to turn a 2-minute voice note into 100K views.`,
      visual: `${userName} holding up fingers '1-2-3' with 3 torn paper badges popping on screen.`,
      motion: "snap zoom + badge pop",
      voice: "curious, value-driven, educational",
      coaching: "Crisp hand gesture on '3-step blueprint' to anchor viewer visual attention.",
      durationSec: 3,
      bRollLabel: "BLUEPRINT PROMISE",
    },
    {
      id: 2,
      label: "TRANSFORM",
      range: "3–7s",
      text: `Step 1: Record your unfiltered thought the moment it happens. Don't edit it. Keep the raw pauses.`,
      visual: "Phone lock screen with active voice memo recording timer ticking.",
      motion: "paper push-in + audio wave glow",
      voice: "instructive, encouraging",
      coaching: "Emphasize 'Keep the raw pauses' — counters standard perfectionism.",
      durationSec: 4,
      bRollLabel: "STEP 1: RAW VOICE",
    },
    {
      id: 3,
      label: "MAGIC",
      range: "7–11s",
      text: `Step 2: Let AI generate kinetic paper-cut layers that visualize the metaphor behind your story.`,
      visual: "Metaphor animation bursting from paper background: clock, compass, lightbulb.",
      motion: "paper origami unfold",
      voice: "illuminating, crisp breakdown",
      coaching: "Nod as the origami unfolds — validates the visual payoff.",
      durationSec: 4,
      bRollLabel: "STEP 2: METAPHOR BURST",
    },
    {
      id: 4,
      label: "PAYOFF",
      range: "11–15s",
      text: `Step 3: End with one clear lesson. Comment SCRIPT to get our complete automated prompt pack.`,
      visual: `${userName} in studio smiling, 'SCRIPT' stamped across screen in paper cutout letters.`,
      motion: "dolly-in + stamp impact",
      voice: "sharp, confident sign-off",
      coaching: "Warm nod at the end — makes viewer feel capable of doing this today.",
      durationSec: 4,
      bRollLabel: "STEP 3: BLUEPRINT PAYOFF",
    },
  ];

  return [
    {
      id: "angle-vulnerable",
      badge: "High Retention · 92% Hook",
      title: "The Raw POV (Vulnerable Founder)",
      hook: opt1Beats[0].text,
      tone: "Vulnerable · Personal Story · High Trust",
      targetLength: "15s",
      metrics: { hookRate: "92%", saves: "78%" },
      fullScriptText: opt1Beats.map((b) => b.text).join(" "),
      beats: opt1Beats,
    },
    {
      id: "angle-contrarian",
      badge: "Scroll Stopper · +188% Saves",
      title: "Contrarian Pattern-Interrupt",
      hook: opt2Beats[0].text,
      tone: "Bold · Pattern Interrupt · Debate Starter",
      targetLength: "15s",
      metrics: { hookRate: "88%", saves: "94%" },
      fullScriptText: opt2Beats.map((b) => b.text).join(" "),
      beats: opt2Beats,
    },
    {
      id: "angle-breakdown",
      badge: "High Saves · 3.2x Bookmarks",
      title: "3-Step Rapid Breakdown",
      hook: opt3Beats[0].text,
      tone: "Educational · Framework · High Saves",
      targetLength: "15s",
      metrics: { hookRate: "85%", saves: "96%" },
      fullScriptText: opt3Beats.map((b) => b.text).join(" "),
      beats: opt3Beats,
    },
  ];
}

export default function StoryBankView({
  onSwitchToStudio,
  onCompleteRecordingToStudio,
  initialTopicFromYou,
  hideHeader = false,
}: StoryBankViewProps) {
  const { brain } = useZeeBrain();
  const userName = brain.virtualYou.userName || "Prem";

  // Merge Prem's live memories from `YouView` with the 5 signature compact voice logs
  const memoryBankList = useMemo<CompactMemoryLog[]>(() => {
    const palette = ["#F5D6A8", "#FFB5A7", "#C1B6FF", "#A8E6CF", "#FFE082"];
    const notes = [
      "idea on hook",
      "84% engagement",
      "storytelling gold",
      "your top saver",
      "B-roll ready",
    ];

    const dynamicFromBrain: CompactMemoryLog[] = brain.memories
      .slice(0, 3)
      .map((m, idx) => {
        const isTravel = m.category === "travel";
        const isWork = m.category === "work";
        const matchedPhoto =
          brain.gallery.find((g) =>
            isTravel
              ? /gokarna/i.test(`${g.location} ${g.title}`)
              : g.category === m.category
          ) || brain.gallery[idx % Math.max(1, brain.gallery.length)];

        return {
          id: m.id,
          title: m.title.length > 26 ? `${m.title.slice(0, 24)}...` : m.title,
          time: m.durationLabel || `2:0${(idx * 3 + 4) % 9}`,
          emotion: m.emotionTone.split(" ")[0].toLowerCase() || "calm",
          color: palette[idx % palette.length],
          note: isTravel
            ? "Gokarna GPS matched"
            : notes[idx % notes.length],
          category: m.category,
          story: m.story,
          suggestionTitle: isTravel
            ? `Make reel: POV: 6AM in Gokarna unlocked this idea`
            : isWork
            ? `Make reel: POV: midnight studio build (${m.title.slice(0, 20)})`
            : `Make reel: ${m.reelHookIdea.slice(0, 46)}`,
          suggestionSub: `Use your ${m.durationLabel || "2:04"} voice log + paper-cut ${
            matchedPhoto?.folderTitle || "studio"
          } B-roll.`,
          beats: [
            {
              id: 1,
              label: "HOOK",
              range: "0–2s",
              text:
                m.reelHookIdea ||
                "Still editing reels manually for 3 hours?",
              visual: `Close-up of ${userName} + ${
                matchedPhoto?.title || "timeline scrub"
              }. Paper ripped corner shows clock.`,
              motion: "whip-pan + scale pop",
              voice: "annoyed, fast — your real voice",
              coaching: `use your own voice here, faster pace — like you're venting to a friend about "${m.title.slice(
                0,
                28
              )}".`,
              durationSec: 3,
              bRollLabel: matchedPhoto?.folderTitle
                ? `${matchedPhoto.folderTitle.toUpperCase()}`
                : "B-ROLL + PAPER CUT",
              matchedPhotoUrl: matchedPhoto?.url,
            },
            {
              id: 2,
              label: "TRANSFORM",
              range: "2–5s",
              text: m.story,
              visual: `Torn paper reveal: before/after timeline — messy → clean with AI blocks. Your hands tap 'Generate'.`,
              motion: "paper slide left, ink bleed",
              voice: "calm, confiding",
              coaching:
                "Lower your shoulders, look slightly off-cam. This is the 'let me show you' moment your audience trusts.",
              durationSec: 4,
              bRollLabel: "B-ROLL + PAPER CUT",
              matchedPhotoUrl: matchedPhoto?.url,
            },
            {
              id: 3,
              label: "MAGIC",
              range: "5–8s",
              text: "Watch — voice memory in, 10 sec transformation. Count with me: 3, 2, 1...",
              visual:
                "Split screen counting numbers torn out, AI avatar renders, UGC captions auto-popping like stickers.",
              motion: "countdown zoom, sticker burst",
              voice: "playful, counting",
              coaching:
                "Point at screen on each count. Your driven builder energy works here — driven but light.",
              durationSec: 4,
              bRollLabel: "B-ROLL + PAPER CUT",
            },
            {
              id: 4,
              label: "PAYOFF",
              range: "8–10s",
              text: "Comment AI and I'll send the exact prompt + template. No gatekeeping.",
              visual: `You leaning forward, paper CTA 'COMMENT AI' taped on desk. B-roll: DMs flooding screenshot.`,
              motion: "dolly-in + CTA wiggle",
              voice: "warm, direct CTA",
              coaching:
                "Smile on 'no gatekeeping' — that's your 2am call vulnerability tone. It converts.",
              durationSec: 3,
              bRollLabel: "B-ROLL + PAPER CUT",
            },
          ],
        };
      });

    // Combine curated signature logs + live brain memories so Prem sees the exact 5 compact cards + any new memories
    const combined = [...CURATED_MEMORY_LOGS];
    dynamicFromBrain.forEach((dyn) => {
      if (!combined.some((c) => c.title.toLowerCase() === dyn.title.toLowerCase())) {
        combined.push(dyn);
      }
    });
    return combined.slice(0, 7);
  }, [brain.memories, brain.gallery, userName]);

  const [selectedMemoryId, setSelectedMemoryId] = useState<string>(
    () => memoryBankList[0]?.id || "curated-pitch"
  );
  const [activeBeatId, setActiveBeatId] = useState<number>(1);
  const [editingBeatId, setEditingBeatId] = useState<number | null>(null);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [angleIndex, setAngleIndex] = useState(0);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const [selectedAudioName, setSelectedAudioName] = useState("sped up phonk");
  const [selectedNichePill, setSelectedNichePill] = useState("UGC ads with paper cut");
  const [targetLengthLabel, setTargetLengthLabel] = useState<"10s" | "30s" | "45s">("10s");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable Beats State for the active memory
  const [beatsByMemoryId, setBeatsByMemoryId] = useState<
    Record<string, ScriptBeatCard[]>
  >(() => {
    const initial: Record<string, ScriptBeatCard[]> = {};
    memoryBankList.forEach((m) => {
      initial[m.id] = m.beats;
    });
    return initial;
  });

  // Sync when memoryBankList updates
  useEffect(() => {
    setBeatsByMemoryId((prev) => {
      const next = { ...prev };
      memoryBankList.forEach((m) => {
        if (!next[m.id]) next[m.id] = m.beats;
      });
      return next;
    });
  }, [memoryBankList]);

  const activeMemory = useMemo(
    () =>
      memoryBankList.find((m) => m.id === selectedMemoryId) ||
      memoryBankList[0] ||
      CURATED_MEMORY_LOGS[0],
    [memoryBankList, selectedMemoryId]
  );

  const activeBeats = useMemo(
    () =>
      (activeMemory ? beatsByMemoryId[activeMemory.id] : null) ||
      activeMemory?.beats ||
      DEFAULT_BEATS,
    [beatsByMemoryId, activeMemory]
  );

  // 3 Script Angle Choices state
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [scriptDisplayMode, setScriptDisplayMode] = useState<"fullScript" | "beats">("fullScript");
  const [isEditingFullScript, setIsEditingFullScript] = useState(false);
  const [fullScriptCustomText, setFullScriptCustomText] = useState("");
  const [isScriptLocked, setIsScriptLocked] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const scriptAngles = useMemo(
    () => buildScriptAnglesForMemory(activeMemory, userName),
    [activeMemory, userName]
  );

  const currentOption = scriptAngles[selectedOptionIndex] || scriptAngles[0];

  // Full continuous script derived from active beats
  const fullScriptGenerated = useMemo(() => {
    return activeBeats.map((b) => b.text).join(" ");
  }, [activeBeats]);

  const activeFullScript = isEditingFullScript
    ? fullScriptCustomText
    : fullScriptCustomText || fullScriptGenerated;

  // Two-way interactive Zee brainstorming conversation
  const [zeeConversation, setZeeConversation] = useState<
    Array<{ sender: "zee" | "prem"; text: string; time: string }>
  >([
    {
      sender: "zee",
      text: `Hey ${userName}! I took your story "${activeMemory.title}" and shaped 3 complete script angles. Pick an option above, or brainstorm with me below to tune anything!`,
      time: "Just now",
    },
  ]);

  // Sync when active memory changes
  useEffect(() => {
    setSelectedOptionIndex(0);
    setIsEditingFullScript(false);
    setIsScriptLocked(false);
    setFullScriptCustomText("");
    setZeeConversation([
      {
        sender: "zee",
        text: `Hey ${userName}! Loaded your "${activeMemory.title}" story (${activeMemory.time}). I prepared 3 distinct script angles for today's reel. Which vibe fits your mood, or tell me what to rewrite!`,
        time: "Just now",
      },
    ]);
  }, [activeMemory.id, userName]);

  // Handle selecting one of the 3 script options
  const handleSelectOption = (idx: number) => {
    setSelectedOptionIndex(idx);
    const opt = scriptAngles[idx];
    if (opt) {
      setBeatsByMemoryId((prev) => ({
        ...prev,
        [activeMemory.id]: opt.beats,
      }));
      setFullScriptCustomText(opt.fullScriptText);
      setIsScriptLocked(false);
      setToastMessage(`Selected: "${opt.title}"`);
    }
  };

  // Save full script edits back to beats
  const handleSaveFullScriptEdits = () => {
    setIsEditingFullScript(false);
    const textToSave = fullScriptCustomText.trim();
    if (!textToSave) return;
    
    // Split sentences into the 4 beats
    const sentences = textToSave
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length > 0) {
      setBeatsByMemoryId((prev) => ({
        ...prev,
        [activeMemory.id]: (prev[activeMemory.id] || activeMemory.beats).map(
          (b, idx) => ({
            ...b,
            text: sentences[idx] || (idx === 0 ? textToSave : b.text),
          })
        ),
      }));
    }
    setToastMessage("Full script saved & synchronized ✓");
  };

  // Copy full script
  const handleCopyScript = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(activeFullScript);
      setCopiedScript(true);
      setToastMessage("Complete script copied to clipboard 📋");
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  // Lock script and proceed to studio
  const handleLockAndProceed = () => {
    setIsScriptLocked(true);
    setToastMessage("Script locked! Heading to Studio to generate video 🎬");
    if (onSwitchToStudio) {
      setTimeout(() => {
        onSwitchToStudio(activeFullScript, activeMemory.title);
      }, 500);
    }
  };

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Co-Writer Voice / Text Input State
  const [coWriteInput, setCoWriteInput] = useState(initialTopicFromYou || "");
  const [isListeningCoWrite, setIsListeningCoWrite] = useState(false);
  const [isRefiningWithMeta, setIsRefiningWithMeta] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Teleprompter & Mobile QR Recording Stage State
  const [isRecordStageOpen, setIsRecordStageOpen] = useState(false);
  const [sessionId] = useState(
    () => `prem-script-${Math.random().toString(36).slice(2, 8)}`
  );
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [teleprompterBeatIndex, setTeleprompterBeatIndex] = useState(0);
  const [isTeleprompterPlaying, setIsTeleprompterPlaying] = useState(false);
  const [mobileStatus, setMobileStatus] = useState<
    "waiting_for_mobile" | "mobile_connected" | "recording" | "completed"
  >("waiting_for_mobile");

  // Laptop Direct Webcam Recording fallback inside Teleprompter modal
  const [isLaptopCamActive, setIsLaptopCamActive] = useState(false);
  const [isLaptopRecording, setIsLaptopRecording] = useState(false);
  const [laptopRecSec, setLaptopRecSec] = useState(0);
  const laptopVideoRef = useRef<HTMLVideoElement | null>(null);
  const laptopStreamRef = useRef<MediaStream | null>(null);
  const laptopRecorderRef = useRef<MediaRecorder | null>(null);
  const laptopChunksRef = useRef<Blob[]>([]);
  const laptopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update a beat's text inline
  const handleUpdateBeatText = (beatId: number, newText: string) => {
    setBeatsByMemoryId((prev) => ({
      ...prev,
      [activeMemory.id]: (prev[activeMemory.id] || activeMemory.beats).map((b) =>
        b.id === beatId ? { ...b, text: newText } : b
      ),
    }));
  };

  // Switch Memory in Left Sidebar
  const handleSelectMemory = (mem: CompactMemoryLog) => {
    setSelectedMemoryId(mem.id);
    setActiveBeatId(1);
    setSuggestionApplied(false);
    setToastMessage(`Loaded "${mem.title}" (${mem.time}) into AI Director`);
  };

  // Regenerate Angle (Button in bottom bar + optional Meta API refinement)
  const handleRegenerateAngle = async () => {
    const nextIdx = (angleIndex + 1) % ANGLES.length;
    const nextAngle = ANGLES[nextIdx];
    setAngleIndex(nextIdx);

    const angleHooks: Record<string, string> = {
      "POV burnout": "Still editing reels manually for 3 hours at midnight?",
      "Client savage":
        "POV: Your client asks for 'one tiny revision' at 11:48 PM.",
      "Founder flex":
        "How we automated a 3-hour agency edit into an 11-minute AI workflow.",
      "Gokarna horizon":
        "I left my studio for Gokarna for 72 hours — and came back with this 11-minute workflow.",
    };

    setBeatsByMemoryId((prev) => ({
      ...prev,
      [activeMemory.id]: (prev[activeMemory.id] || activeMemory.beats).map(
        (b, idx) =>
          idx === 0
            ? {
                ...b,
                text: angleHooks[nextAngle] || b.text,
              }
            : b
      ),
    }));
    setToastMessage(`Angle switched to ${nextAngle} → script updated`);
  };

  // Apply Suggestion Engine from Right Sidebar
  const handleApplySuggestionEngine = () => {
    setSuggestionApplied(true);
    setActiveBeatId(1);
    const newHook = activeMemory.suggestionTitle.replace(/^Make reel:\s*/i, "");
    setBeatsByMemoryId((prev) => ({
      ...prev,
      [activeMemory.id]: (prev[activeMemory.id] || activeMemory.beats).map(
        (b, idx) =>
          idx === 0
            ? {
                ...b,
                text: `${newHook} — and here is the 11-minute fix.`,
              }
            : b
      ),
    }));
    setToastMessage(`POV angle injected — Hook updated to '${newHook}'`);
  };

  // Apply Top Format from Right Sidebar
  const handleApplyPoppingFormat = (fmt: (typeof POPPING_IG_FORMATS)[number]) => {
    setActiveBeatId(1);
    setBeatsByMemoryId((prev) => ({
      ...prev,
      [activeMemory.id]: (prev[activeMemory.id] || activeMemory.beats).map(
        (b, idx) =>
          idx === 0
            ? {
                ...b,
                text: `${fmt.hookPrefix}${activeMemory.title.toLowerCase()}.`,
              }
            : b
      ),
    }));
    setToastMessage(`Applied IG Format: "${fmt.title}" (${fmt.views})`);
  };

  // Toggle Duration Length (10s -> 30s -> 45s, always <= 60s)
  const handleCycleLength = () => {
    const order: Array<"10s" | "30s" | "45s"> = ["10s", "30s", "45s"];
    const next = order[(order.indexOf(targetLengthLabel) + 1) % order.length];
    setTargetLengthLabel(next);
    const rangesByLen: Record<"10s" | "30s" | "45s", string[]> = {
      "10s": ["0–2s", "2–5s", "5–8s", "8–10s"],
      "30s": ["0–4s", "4–13s", "13–23s", "23–30s"],
      "45s": ["0–5s", "5–18s", "18–34s", "34–45s"],
    };
    setBeatsByMemoryId((prev) => ({
      ...prev,
      [activeMemory.id]: (prev[activeMemory.id] || activeMemory.beats).map(
        (b, i) => ({
          ...b,
          range: rangesByLen[next][i] || b.range,
        })
      ),
    }));
    setToastMessage(`Script pacing calibrated to ${next} (strictly ≤60s)`);
  };

  // Voice Mic Co-Writer
  const handleToggleCoWriteMic = () => {
    if (isListeningCoWrite) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListeningCoWrite(false);
      return;
    }

    setIsListeningCoWrite(true);
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = true;
        rec.onresult = (ev: any) => {
          let t = "";
          for (let i = 0; i < ev.results.length; i++) {
            t += ev.results[i][0].transcript;
          }
          if (t.trim()) setCoWriteInput(t);
        };
        rec.onend = () => setIsListeningCoWrite(false);
        recognitionRef.current = rec;
        rec.start();
        return;
      } catch {}
    }

    setCoWriteInput(
      "Weave my Gokarna dawn walk into the Transform beat and make the Hook punchier"
    );
    setTimeout(() => setIsListeningCoWrite(false), 900);
  };

  // Two-way Zee Script Brainstorming
  const handleSendMessageToZee = async (instructionOverride?: string) => {
    const instruction = (instructionOverride || coWriteInput).trim();
    if (!instruction || isRefiningWithMeta) return;

    // Add Prem's message to conversation
    setZeeConversation((prev) => [
      ...prev,
      { sender: "prem", text: instruction, time: "Just now" },
    ]);
    setCoWriteInput("");
    setIsRefiningWithMeta(true);

    try {
      const res = await fetch("/api/script-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          storyIdea: `${activeMemory.title} — ${activeFullScript}`,
          userInstruction: instruction,
          memoriesSummary: memoryBankList
            .map((m) => `- ${m.title}: ${m.story}`)
            .join("\n"),
          instagramTaste: "AI UGC ADS • Paper Cut • Fast + Vulnerable",
          currentScript: {
            title: activeMemory.title,
            beats: activeBeats.map((b) => ({
              id: b.id,
              phase: `${b.label} (${b.range})`,
              spokenLine: b.text,
              deliveryCue: b.voice,
              visualCutaway: b.visual,
              durationSec: b.durationSec,
            })),
          },
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && Array.isArray(json?.data?.beats)) {
        const apiBeats = json.data.beats;
        const newBeats = activeBeats.map((b, i) => ({
          ...b,
          text: apiBeats[i]?.spokenLine || b.text,
          visual: apiBeats[i]?.visualCutaway || b.visual,
          coaching: apiBeats[i]?.deliveryCue || b.coaching,
        }));

        setBeatsByMemoryId((prev) => ({
          ...prev,
          [activeMemory.id]: newBeats,
        }));
        setFullScriptCustomText(newBeats.map((b) => b.text).join(" "));

        const zeeReply =
          json.data.zeeDirectorNote ||
          `I tweaked the script with "${instruction}". The hook and narrative are updated above!`;

        setZeeConversation((prev) => [
          ...prev,
          { sender: "zee", text: zeeReply, time: "Just now" },
        ]);
        setToastMessage("Zee updated the script ✓");
      } else {
        // Smart heuristic fallbacks
        const low = instruction.toLowerCase();
        let reply = "";
        let updated = [...activeBeats];

        if (low.includes("punch") || low.includes("hook")) {
          updated[0] = {
            ...updated[0],
            text: `Stop scrolling. ${activeMemory.title} taught me the one thing nobody admits out loud.`,
          };
          reply = `Punched up the hook to hit with raw curiosity in 2 seconds flat!`;
        } else if (low.includes("casual") || low.includes("raw")) {
          updated[0] = {
            ...updated[0],
            text: `So I was sitting with my chai at 6:45 AM, thinking about ${activeMemory.title.toLowerCase()}...`,
          };
          reply = `Softened the opening into an intimate, conversational creator confession.`;
        } else if (low.includes("15s") || low.includes("trim") || low.includes("short")) {
          updated = updated.map((b) => ({
            ...b,
            text: b.text.split(" — ")[0],
          }));
          reply = `Trimmed the excess words — now tightly paced for high-velocity 15s retention.`;
        } else if (low.includes("cta") || low.includes("comment")) {
          updated[3] = {
            ...updated[3],
            text: `Don't overcomplicate this. Comment SCRIPT below and I'll send you our exact setup for free.`,
          };
          reply = `Boosted the payoff with a direct, high-converting keyword CTA!`;
        } else {
          updated[0] = {
            ...updated[0],
            text: `${instruction}: ${activeMemory.title}.`,
          };
          reply = `Got it! Modified the script with your direction: "${instruction}".`;
        }

        setBeatsByMemoryId((prev) => ({
          ...prev,
          [activeMemory.id]: updated,
        }));
        setFullScriptCustomText(updated.map((b) => b.text).join(" "));
        setZeeConversation((prev) => [
          ...prev,
          { sender: "zee", text: reply, time: "Just now" },
        ]);
        setToastMessage("Zee modified your script ✓");
      }
    } catch {
      setZeeConversation((prev) => [
        ...prev,
        {
          sender: "zee",
          text: `Updated beat with "${instruction}". Review your complete script above!`,
          time: "Just now",
        },
      ]);
      setToastMessage("Zee adjusted the line ✓");
    } finally {
      setIsRefiningWithMeta(false);
    }
  };

  const handleRefineWithMeta = () => handleSendMessageToZee();

  // Sync Teleprompter Session with `/api/script-session`
  const pushSessionUpdate = useCallback(
    async (beatIdx: number, playing: boolean) => {
      try {
        const res = await fetch("/api/script-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            userName,
            title: activeMemory.title,
            beats: activeBeats.map((b) => ({
              id: b.id,
              phase: `${b.label} (${b.range})`,
              spokenLine: b.text,
              deliveryCue: b.coaching,
              visualCutaway: b.visual,
              durationSec: b.durationSec,
            })),
            activeBeatIndex: beatIdx,
            isPlaying: playing,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.lanIp) setLanIp(data.lanIp);
      } catch {}
    },
    [sessionId, userName, activeMemory.title, activeBeats]
  );

  const handleOpenRecordStage = () => {
    setTeleprompterBeatIndex(0);
    setIsTeleprompterPlaying(true);
    setIsRecordStageOpen(true);
    pushSessionUpdate(0, true);
  };

  useEffect(() => {
    if (!isRecordStageOpen || !isTeleprompterPlaying) return;
    const curBeat = activeBeats[teleprompterBeatIndex];
    const durMs = Math.max(3500, (curBeat?.durationSec || 4) * 1000);
    const timer = setTimeout(() => {
      setTeleprompterBeatIndex((prev) => {
        const next = prev + 1 < activeBeats.length ? prev + 1 : 0;
        pushSessionUpdate(next, true);
        return next;
      });
    }, durMs);
    return () => clearTimeout(timer);
  }, [
    isRecordStageOpen,
    isTeleprompterPlaying,
    teleprompterBeatIndex,
    activeBeats,
    pushSessionUpdate,
  ]);

  useEffect(() => {
    if (!isRecordStageOpen) return;
    let active = true;
    const poll = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(
          `/api/script-session?sessionId=${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.lanIp) setLanIp(data.lanIp);
        const sess = data?.session;
        if (!sess) return;
        setMobileStatus(sess.status);
        if (
          typeof sess.activeBeatIndex === "number" &&
          sess.activeBeatIndex !== teleprompterBeatIndex
        ) {
          setTeleprompterBeatIndex(sess.activeBeatIndex);
        }
        if (sess.status === "completed" && sess.hasVideo) {
          active = false;
          clearInterval(poll);
          const mediaRes = await fetch(
            `/api/script-session?sessionId=${encodeURIComponent(
              sessionId
            )}&media=1`
          );
          if (mediaRes.ok) {
            const blob = await mediaRes.blob();
            const file = new File(
              [blob],
              sess.videoFileName || `prem-mobile-take-${Date.now()}.webm`,
              { type: blob.type || "video/webm" }
            );
            const fullScript = activeBeats.map((b) => b.text).join("\n\n");
            setIsRecordStageOpen(false);
            if (onCompleteRecordingToStudio) {
              onCompleteRecordingToStudio(file, fullScript, activeMemory.title);
            } else if (onSwitchToStudio) {
              onSwitchToStudio();
            }
          }
        }
      } catch {}
    }, 1000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [
    isRecordStageOpen,
    sessionId,
    teleprompterBeatIndex,
    activeBeats,
    activeMemory.title,
    onCompleteRecordingToStudio,
    onSwitchToStudio,
  ]);

  const handleStartLaptopCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      laptopStreamRef.current = stream;
      setIsLaptopCamActive(true);
      setTimeout(() => {
        if (laptopVideoRef.current) {
          laptopVideoRef.current.srcObject = stream;
        }
      }, 100);

      laptopChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      laptopRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) laptopChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsLaptopCamActive(false);
        const blob = new Blob(laptopChunksRef.current, {
          type: rec.mimeType || "video/webm",
        });
        const file = new File([blob], `prem-studio-take-${Date.now()}.webm`, {
          type: blob.type || "video/webm",
        });
        const fullScript = activeBeats.map((b) => b.text).join("\n\n");
        setIsRecordStageOpen(false);
        if (onCompleteRecordingToStudio) {
          onCompleteRecordingToStudio(file, fullScript, activeMemory.title);
        } else if (onSwitchToStudio) {
          onSwitchToStudio();
        }
      };

      rec.start();
      setIsLaptopRecording(true);
      setIsTeleprompterPlaying(true);
      setTeleprompterBeatIndex(0);
      setLaptopRecSec(0);
      laptopTimerRef.current = setInterval(() => {
        setLaptopRecSec((s) => s + 1);
      }, 1000);
    } catch {
      alert(
        "Please allow camera & microphone permissions, or scan the QR code with your phone."
      );
    }
  };

  const handleStopLaptopCamera = () => {
    if (laptopTimerRef.current) clearInterval(laptopTimerRef.current);
    setIsLaptopRecording(false);
    try {
      laptopRecorderRef.current?.stop();
    } catch {}
  };

  const mobileRecordUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const port = window.location.port ? `:${window.location.port}` : "";
    const host = lanIp || window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}${port}/mobile-record?session=${encodeURIComponent(
      sessionId
    )}`;
  }, [lanIp, sessionId]);

  return (
    <div
      className="bg-[#FFFEFB] text-[#111111] relative overflow-x-clip px-1 sm:px-2 py-0.5"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(17,17,17,0.06) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Soft Ambient Radial Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[30%] left-[20%] w-[70%] h-[60%] rounded-full blur-[120px] opacity-[0.10]"
          style={{
            background: "radial-gradient(circle, #FF6B35 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[10%] right-[5%] w-[45%] h-[50%] rounded-full blur-[120px] opacity-[0.08]"
          style={{
            background: "radial-gradient(circle, #0066FF 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[50%] h-[40%] rounded-full blur-[120px] opacity-[0.06]"
          style={{
            background: "radial-gradient(circle, #FFB5A7 0%, transparent 70%)",
          }}
        />
      </div>

      {/* =====================================================================
          STICKY STUDIO SUB-HEADER BAR (Rendered ONLY when !hideHeader)
         ===================================================================== */}
      {!hideHeader && (
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[#EDE8E3]">
          <div className="mx-auto max-w-[1600px] px-3 md:px-5 h-[56px] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
                className="lg:hidden p-1.5 rounded-full border border-[#EDE8E3] bg-white cursor-pointer"
              >
                {leftDrawerOpen ? <X size={15} /> : <Menu size={15} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#111111] text-[#FFFEFB] grid place-items-center font-bold text-[11px]">
                  P
                </div>
                <span className="font-semibold tracking-tight lowercase text-sm">
                  {userName}&apos;s studio
                </span>
                <span className="hidden md:inline-flex ml-1.5 px-2 py-0.5 rounded-full bg-[#111111] text-[#FFFEFB] text-[9px] mono">
                  AI DIRECTOR v2
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 text-[11px] mono px-2.5 py-1 rounded-full bg-white border border-[#EDE8E3] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>analyzing {memoryBankList.length} memories • live</span>
              </div>

              <button
                type="button"
                onClick={handleOpenRecordStage}
                className="hidden sm:inline-flex items-center gap-1.5 text-[10px] mono font-semibold px-2.5 py-1 rounded-full bg-[#111111] text-white hover:bg-[#FF6B35] transition cursor-pointer"
              >
                <QrCode size={12} />
                <span>Teleprompter + QR</span>
              </button>

              <button
                type="button"
                onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
                className="lg:hidden p-1.5 rounded-full border border-[#EDE8E3] bg-white cursor-pointer"
              >
                <TrendingUp size={15} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* =====================================================================
          3-COLUMN STUDIO GRID:
          LEFT (280px): MEMORY BANK (COMPACT VOICE LOGS + PERSONALIZATION SIGNAL)
          CENTER (1fr): AI DIRECTOR'S PICK + TORN-PAPER BEAT CARDS + ACTION BAR
          RIGHT (360px): WHAT'S POPPING ON IG + SUGGESTION ENGINE + HASHTAGS
         ===================================================================== */}
      <div className="mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-[230px_1fr_290px] gap-2.5 sm:gap-3 items-start relative z-10">
        {/* ===================================================================
            LEFT SIDEBAR: MEMORY BANK
           =================================================================== */}
        <aside
          className={`lg:sticky lg:top-[60px] lg:h-[calc(100vh-80px)] bg-white lg:rounded-[20px] border-y lg:border border-[#EDE8E3] shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col fixed inset-y-0 left-0 z-40 w-[280px] lg:w-auto transition-transform duration-300 ${
            leftDrawerOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-3.5 border-b border-[#EDE8E3]">
            <div className="flex items-center justify-between">
              <h3 className="serif text-[18px] tracking-tight font-normal">
                Memory Bank
              </h3>
              <span className="text-[10px] mono px-2 py-0.5 rounded-full bg-[#111] text-white">
                {memoryBankList.length} compact
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#8A8784]">
              Voice logs compressed for reel scripts
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {memoryBankList.map((mem, idx) => {
              const isSelected = mem.id === activeMemory.id;
              return (
                <div
                  key={mem.id}
                  onClick={() => handleSelectMemory(mem)}
                  className={`group relative rounded-[16px] border p-3 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#111111] bg-[#FFFEFB] shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                      : "border-[#EDE8E3] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0"
                        style={{ background: mem.color }}
                      >
                        <Mic size={14} className="text-[#111111]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold leading-tight truncate">
                          {mem.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] mono px-1.5 py-0.5 rounded-full bg-[#EDE8E3]">
                            {mem.emotion}
                          </span>
                          <span className="text-[10px] mono text-[#8A8784] flex items-center gap-1">
                            <Clock3 size={10} />
                            {mem.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${
                        isSelected
                          ? "bg-[#FF6B35] text-white"
                          : "bg-[#111111] text-[#FFFEFB]"
                      }`}
                    >
                      <Play size={10} fill="currentColor" />
                    </span>
                  </div>

                  {/* 22-bar Waveform */}
                  <div className="mt-3 flex items-end gap-[2px] h-[18px]">
                    {Array.from({ length: 22 }).map((_, d) => {
                      const barHeight =
                        30 +
                        Math.abs(Math.sin(d * 1.2 + (idx + 1)) * 50) +
                        ((d * 7) % 18);
                      return (
                        <div
                          key={d}
                          className={`flex-1 rounded-full transition-colors ${
                            isSelected
                              ? "bg-[#111111]"
                              : "bg-[#EDE8E3] group-hover:bg-[#111111]"
                          }`}
                          style={{ height: `${Math.min(100, barHeight)}%` }}
                        />
                      );
                    })}
                  </div>

                  <p className="mt-2 text-[11px] text-[#8A8784] mono">
                    {mem.note}
                  </p>
                </div>
              );
            })}

            {/* Bottom Dark Personalization Signal Box */}
            <div className="rounded-[16px] bg-[#111] text-white p-4 mt-2">
              <p className="text-[12px] mono opacity-60">
                PERSONALIZATION SIGNAL
              </p>
              <p className="mt-2 text-[13px] leading-snug">
                Analyzed @premspawar — your followers love AI tutorials (78%
                saves), you post 8pm best. Voice = fast + vulnerable.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/10">
                  Business: AI automation
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/10">
                  Niche: AI UGC ADS
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#EDE8E3] lg:hidden">
            <button
              type="button"
              onClick={() => setLeftDrawerOpen(false)}
              className="w-full h-10 rounded-full bg-[#111111] text-[#FFFEFB] text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </aside>

        {/* ===================================================================
            CENTER MAIN COLUMN: AI DIRECTOR'S GREETING + COMPLETE SCRIPT + ZEE BRAINSTORMING
           =================================================================== */}
        <main className="min-w-0 space-y-2.5">
          {/* Top Greeting Card — Zero wasted padding */}
          <div className="relative overflow-hidden rounded-[20px] border border-[#EDE8E3] bg-white p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#111] text-white text-[10px] mono">
                  <Sparkles size={11} /> AI DIRECTOR
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF5FF] text-[#0066FF] text-[10px] mono">
                  <Eye size={11} /> High save potential
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#FF6B35] text-[10px] mono">
                  <Flame size={11} /> Ready to shoot
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] mono text-[#666]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>story: <strong className="text-[#111]">{activeMemory.title}</strong> ({activeMemory.time})</span>
              </div>
            </div>

            <h1 className="serif text-[24px] sm:text-[30px] leading-[1.05] tracking-tight font-normal text-[#111]">
              Hey {userName}, here&apos;s what we&apos;re creating today ⚡
            </h1>

            <p className="mt-1 text-[12px] sm:text-[13px] text-[#777] max-w-[70ch]">
              I transformed your <strong className="text-[#111] font-medium">&apos;{activeMemory.title.toLowerCase()}&apos;</strong> story into 3 high-retention script angles. Pick an angle below, review the complete script, brainstorm with Zee to adjust it, then lock it before shooting.
            </p>

            {/* Horizontal Story Quick-Switcher Chips */}
            <div className="mt-2.5 pt-2 border-t border-[#F0EBE5] flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[10px] mono uppercase text-[#888] shrink-0 mr-1">Switch Story:</span>
              {memoryBankList.slice(0, 5).map((mem) => {
                const isSelected = mem.id === activeMemory.id;
                return (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => handleSelectMemory(mem)}
                    className={`h-6 px-2.5 rounded-full text-[11px] mono font-medium shrink-0 transition flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-[#111] text-white shadow-xs"
                        : "bg-[#F3EFEA] hover:bg-[#EBE5DE] text-[#444]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: mem.color }} />
                    <span>{mem.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================================
              2-3 SCRIPT CHOICES / ANGLES (FIRST VISUAL ATTENTION)
             ================================================================= */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] mono uppercase tracking-wider font-semibold text-[#555]">
                  Select Script Angle (3 Choices):
                </span>
                <span className="text-[10px] mono text-[#888]">click to preview complete script</span>
              </div>
              <button
                type="button"
                onClick={handleRegenerateAngle}
                className="text-[10px] mono text-[#666] hover:text-[#111] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={11} /> Regenerate hooks
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {scriptAngles.map((opt, idx) => {
                const isSelected = selectedOptionIndex === idx;
                return (
                  <div
                    key={opt.id}
                    data-angle-option={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-3 rounded-[16px] border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-white border-[#111] shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-2 ring-[#111]"
                        : "bg-white/80 border-[#EDE8E3] hover:border-[#111]/40 hover:bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] mono font-semibold ${
                            isSelected
                              ? "bg-[#111] text-white"
                              : "bg-[#EDE8E3] text-[#555]"
                          }`}
                        >
                          {opt.badge}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-[#111] text-white grid place-items-center">
                            <Check size={10} />
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-bold text-[#111] tracking-tight">
                        {opt.title}
                      </p>
                      <p className="mt-1 text-[11px] text-[#555] line-clamp-2 italic leading-snug">
                        &ldquo;{opt.hook}&rdquo;
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#F0EBE5] flex items-center justify-between text-[10px] mono text-[#888]">
                      <span>{opt.targetLength} · ~45 words</span>
                      <span className="font-semibold text-[#111]">
                        {opt.metrics.hookRate} hook rate
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =================================================================
              THE COMPLETE SCRIPT (HERO VISUAL VIEW)
             ================================================================= */}
          <div className="rounded-[20px] border-2 border-[#111] bg-white p-3.5 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EDE8E3]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#111] text-white grid place-items-center">
                  <FileText size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[15px] font-bold text-[#111] tracking-tight">
                      Complete Script
                    </h2>
                    <span className="px-2 py-0.2 rounded-full bg-[#FFF0EB] text-[#FF6B35] text-[10px] mono font-semibold">
                      {currentOption.title}
                    </span>
                  </div>
                  <p className="text-[11px] mono text-[#888]">
                    ~{currentOption.targetLength} spoken pace • {activeFullScript.trim().split(/\s+/).filter(Boolean).length} words • {currentOption.tone}
                  </p>
                </div>
              </div>

              {/* View & Action Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="p-0.5 rounded-full bg-[#EDE8E3] flex items-center gap-0.5 text-[10px] mono font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setScriptDisplayMode("fullScript");
                      setIsEditingFullScript(false);
                    }}
                    className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                      scriptDisplayMode === "fullScript" && !isEditingFullScript
                        ? "bg-[#111] text-white shadow-xs"
                        : "text-[#555] hover:text-[#111]"
                    }`}
                  >
                    Full Script
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScriptDisplayMode("beats");
                      setIsEditingFullScript(false);
                    }}
                    className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                      scriptDisplayMode === "beats"
                        ? "bg-[#111] text-white shadow-xs"
                        : "text-[#555] hover:text-[#111]"
                    }`}
                  >
                    Beat Breakdown
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditingFullScript) {
                      handleSaveFullScriptEdits();
                    } else {
                      setFullScriptCustomText(activeFullScript);
                      setIsEditingFullScript(true);
                    }
                  }}
                  className={`h-7 px-2.5 rounded-full border text-[11px] mono font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                    isEditingFullScript
                      ? "bg-[#111] text-white border-[#111]"
                      : "bg-white border-[#EDE8E3] hover:border-[#111] text-[#111]"
                  }`}
                >
                  <Edit3 size={11} />
                  <span>{isEditingFullScript ? "Save Script" : "Edit Full Script"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="h-7 px-2.5 rounded-full border border-[#EDE8E3] bg-white hover:border-[#111] text-[#111] text-[11px] mono font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedScript ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copiedScript ? "Copied" : "Copy"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenRecordStage}
                  className="h-7 px-2.5 rounded-full bg-[#111] text-white text-[11px] mono font-semibold inline-flex items-center gap-1 hover:bg-[#FF6B35] transition cursor-pointer"
                >
                  <QrCode size={11} />
                  <span>Teleprompter</span>
                </button>
              </div>
            </div>

            {/* Script Display Body */}
            <div className="pt-3.5">
              {isEditingFullScript ? (
                <div>
                  <p className="text-[11px] mono text-[#888] mb-1.5 flex items-center justify-between">
                    <span>Inline Script Editor — edit the complete spoken flow:</span>
                    <span className="text-[#FF6B35]">Edits sync across studio beats</span>
                  </p>
                  <textarea
                    rows={5}
                    value={fullScriptCustomText}
                    onChange={(e) => setFullScriptCustomText(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-[#111] bg-[#FFFEFB] p-3 serif text-[18px] sm:text-[21px] leading-relaxed text-[#111] focus:outline-none"
                    placeholder="Type or paste your complete continuous script here..."
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingFullScript(false)}
                      className="px-3 py-1.5 rounded-full border border-[#EDE8E3] text-[11px] mono font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFullScriptEdits}
                      className="px-4 py-1.5 rounded-full bg-[#111] text-white text-[11px] mono font-semibold cursor-pointer"
                    >
                      Save & Apply Script ✓
                    </button>
                  </div>
                </div>
              ) : scriptDisplayMode === "fullScript" ? (
                <div className="space-y-3">
                  {/* The Complete Spoken Narrative as a continuous, unified script */}
                  <div className="rounded-[16px] bg-[#FAF8F5] border border-[#E8E4DD] p-4 sm:p-5">
                    <div className="serif text-[18px] sm:text-[22px] leading-[1.5] text-[#141414] tracking-tight space-y-2.5">
                      {activeBeats.map((beat) => (
                        <div key={beat.id} className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded-[6px] bg-[#111] text-white text-[9px] mono font-bold shrink-0 mt-1 uppercase tracking-wider">
                            {beat.label}
                          </span>
                          <span className="flex-1">
                            &ldquo;{beat.text}&rdquo;
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Guidance Strip for Prem */}
                  <div className="rounded-[14px] bg-[#FFF0EB] border border-[#FFD8C8] p-3 flex items-center justify-between gap-3 text-[12px] text-[#7A2A12]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FF6B35] text-white grid place-items-center shrink-0 text-[10px] font-bold">
                        P
                      </span>
                      <span>
                        <strong>Delivery note for {userName}:</strong> Speak softly on the hook so viewers lean in, pause 0.5s before the transform, and nod warmly on the payoff.
                      </span>
                    </div>
                    <span className="text-[10px] mono text-[#FF6B35] shrink-0 font-semibold uppercase">
                      100% human ear rhythm
                    </span>
                  </div>
                </div>
              ) : (
                /* Beat Breakdown Mode (Visual ideas & individual cards) */
                <div className="space-y-2.5">
                  {activeBeats.map((beat) => {
                    const isSelected = activeBeatId === beat.id;
                    const isEditingThis = editingBeatId === beat.id;

                    return (
                      <div
                        key={beat.id}
                        onClick={() => setActiveBeatId(beat.id)}
                        className={`p-3 rounded-[16px] border transition cursor-pointer ${
                          isSelected
                            ? "bg-white border-[#111] shadow-sm ring-1 ring-[#111]"
                            : "bg-[#FFFEFB] border-[#EDE8E3] hover:border-[#111]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#111] text-white mono text-[9px] font-bold">
                              {beat.id} {beat.label}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full border border-[#EDE8E3] mono text-[9px]">
                              {beat.range}
                            </span>
                            <span className="text-[10px] mono text-[#0066FF] flex items-center gap-1">
                              <Video size={10} /> {beat.motion}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBeatId(isEditingThis ? null : beat.id);
                            }}
                            className="text-[10px] mono text-[#888] hover:text-[#111] flex items-center gap-1"
                          >
                            <Edit3 size={10} />
                            <span>{isEditingThis ? "Done" : "Edit"}</span>
                          </button>
                        </div>

                        {isEditingThis ? (
                          <textarea
                            rows={2}
                            value={beat.text}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateBeatText(beat.id, e.target.value)
                            }
                            className="w-full rounded-[10px] border border-[#111] p-2 serif text-[16px] focus:outline-none"
                          />
                        ) : (
                          <p className="serif text-[16px] sm:text-[18px] text-[#111] leading-snug">
                            &ldquo;{beat.text}&rdquo;
                          </p>
                        )}

                        <div className="mt-2 pt-2 border-t border-[#F2ECE5] flex items-center justify-between gap-2 text-[10px] mono text-[#666]">
                          <span className="flex items-center gap-1">
                            <Mic size={10} /> {beat.voice}
                          </span>
                          <span className="text-[#FF6B35]">
                            Visual: {beat.visual.slice(0, 48)}...
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* =================================================================
              BRAINSTORM WITH ZEE (TWO-WAY INTERACTIVE CREATIVE CO-DIRECTOR)
             ================================================================= */}
          <div className="rounded-[20px] border border-[#E0DCD3] bg-[#FAF8F5] p-3.5 sm:p-4 shadow-sm">
            {/* Zee Header */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E8E3DA]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#111] text-white grid place-items-center relative">
                  <Bot size={16} />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px] text-[#111]">
                      Zee • Creative Co-Director
                    </span>
                    <span className="px-2 py-0.2 rounded-full bg-[#111] text-white text-[9px] mono">
                      LIVE BRAINSTORM
                    </span>
                  </div>
                  <p className="text-[11px] text-[#777]">
                    Two-way creative collaboration — tell Zee what to change and watch the script update
                  </p>
                </div>
              </div>

              <span className="text-[10px] mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ● Listening & ready
              </span>
            </div>

            {/* Conversation Thread */}
            <div className="py-2.5 space-y-2 max-h-[180px] overflow-y-auto">
              {zeeConversation.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 items-start ${
                    msg.sender === "prem" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender === "zee" && (
                    <div className="w-6 h-6 rounded-full bg-[#111] text-white grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">
                      Z
                    </div>
                  )}
                  <div
                    className={`rounded-[14px] px-3 py-2 text-[12px] leading-snug max-w-[85%] ${
                      msg.sender === "prem"
                        ? "bg-[#111] text-white rounded-tr-none"
                        : "bg-white border border-[#E5E0D7] text-[#111] rounded-tl-none shadow-xs"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`text-[9px] mono block mt-1 ${
                        msg.sender === "prem" ? "text-white/60" : "text-[#999]"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                  {msg.sender === "prem" && (
                    <div className="w-6 h-6 rounded-full bg-[#FF6B35] text-white grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">
                      P
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick One-Tap Brainstorming Pills */}
            <div className="pt-2 border-t border-[#E8E3DA]">
              <p className="text-[10px] mono text-[#777] mb-1.5 uppercase tracking-wider">
                Quick Brainstorm Tuning (1-Tap):
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: "Make Hook Punchier ⚡", prompt: "Make the hook punchier and scroll-stopping" },
                  { label: "More Casual & Raw ☕", prompt: "Make it more casual, authentic and raw" },
                  { label: "Trim Down to 15s ⏱️", prompt: "Trim down beats strictly for a 15-second reel" },
                  { label: "Stronger CTA 🎯", prompt: "Add a high-conversion comment keyword CTA" },
                  { label: "Contrarian Shock 🤯", prompt: "Inject a contrarian perspective shift in the opening" },
                  { label: "Gokarna Horizon 🏖️", prompt: "Weave in my Gokarna dawn walk travel reset" },
                ].map((pill) => (
                  <button
                    key={pill.label}
                    type="button"
                    disabled={isRefiningWithMeta}
                    onClick={() => handleSendMessageToZee(pill.prompt)}
                    className="px-2.5 py-1 rounded-full bg-white border border-[#DDD7CD] hover:border-[#111] text-[11px] mono text-[#222] transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-Way Input Bar (Mic + Text + Send) */}
            <div className="mt-2.5 flex items-center gap-1.5 bg-white rounded-full border border-[#D5D0C5] p-1 shadow-xs">
              <button
                type="button"
                onClick={handleToggleCoWriteMic}
                title="Dictate changes to Zee"
                className={`w-8 h-8 rounded-full grid place-items-center shrink-0 transition cursor-pointer ${
                  isListeningCoWrite
                    ? "bg-[#FF6B35] text-white animate-pulse"
                    : "bg-[#F3EFEA] text-[#111] hover:bg-[#FF6B35] hover:text-white"
                }`}
              >
                {isListeningCoWrite ? <MicOff size={13} /> : <Mic size={13} />}
              </button>

              <input
                type="text"
                value={coWriteInput}
                onChange={(e) => setCoWriteInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessageToZee()}
                placeholder={`Ask Zee to change anything (e.g. "make the opening hit harder", "sound like my 2am voice note")...`}
                className="flex-1 bg-transparent px-2 text-[12px] text-[#111] placeholder:text-[#888] focus:outline-none"
              />

              <button
                type="button"
                disabled={isRefiningWithMeta || !coWriteInput.trim()}
                onClick={() => handleSendMessageToZee()}
                className="h-8 px-3.5 rounded-full bg-[#111] text-white text-[11px] mono font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-30 transition"
              >
                <span>{isRefiningWithMeta ? "Tuning..." : "Send to Zee"}</span>
                <Send size={11} />
              </button>
            </div>
          </div>

          {/* =================================================================
              LOCK SCRIPT & CONTINUE TO STUDIO (BOTTOM ACTION BAR)
             ================================================================= */}
          <div className="rounded-[18px] border border-[#EDE8E3] bg-white p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                  isScriptLocked
                    ? "bg-emerald-600 text-white"
                    : "bg-[#111] text-white"
                }`}
              >
                {isScriptLocked ? <Lock size={15} /> : <Wand2 size={15} />}
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#111]">
                  {isScriptLocked ? "Script Locked & Ready ✓" : "Lock this Script & Go to Studio"}
                </p>
                <p className="text-[11px] text-[#777]">
                  Angle: <span className="font-semibold text-[#111]">{currentOption.title}</span> • Ready to generate video in Studio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRegenerateAngle}
                className="h-9 px-3.5 rounded-full border border-[#EDE8E3] bg-white text-[11px] mono font-semibold inline-flex items-center gap-1.5 hover:border-[#111] transition cursor-pointer"
              >
                <RefreshCw size={12} /> Regenerate
              </button>

              <button
                type="button"
                onClick={handleLockAndProceed}
                className="h-9 px-5 rounded-full bg-[#111] text-white text-[12px] font-bold inline-flex items-center gap-2 hover:bg-[#FF6B35] transition cursor-pointer shadow-md"
              >
                <Lock size={13} />
                <span>Lock Script & Go to Studio</span>
                <ArrowUpRight size={13} className="opacity-70" />
              </button>
            </div>
          </div>

          <div className="h-6 lg:hidden" />
        </main>

        {/* ===================================================================
            RIGHT SIDEBAR: WHAT'S POPPING ON IG + SUGGESTION ENGINE
           =================================================================== */}
        <aside
          className={`lg:sticky lg:top-[60px] lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-white lg:rounded-[20px] border-t lg:border border-[#EDE8E3] shadow-[0_8px_30px_rgba(0,0,0,0.03)] fixed inset-x-0 bottom-0 z-40 lg:z-0 rounded-t-[24px] transition-transform duration-300 ${
            rightDrawerOpen
              ? "translate-y-0"
              : "translate-y-[calc(100%-48px)] lg:translate-y-0"
          }`}
        >
          <div
            className="lg:hidden flex justify-center pt-2.5 pb-1 cursor-pointer"
            onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
          >
            <div className="w-10 h-1 rounded-full bg-[#EDE8E3]" />
          </div>

          <div className="p-3.5 border-b border-[#EDE8E3] flex items-center justify-between">
            <div>
              <h3 className="serif text-[17px] flex items-center gap-1.5 font-normal">
                <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white grid place-items-center">
                  <TrendingUp size={11} />
                </span>{" "}
                What&apos;s popping on IG
              </h3>
              <p className="text-[11px] text-[#8A8784]">
                High-attention formats today
              </p>
            </div>
            <span className="text-[9px] mono px-2 py-0.5 rounded-full bg-[#EFF5FF] text-[#0066FF]">
              live 2h ago
            </span>
          </div>

          <div className="p-3 space-y-3.5">
            {/* 1. Top Formats Today */}
            <div>
              <p className="text-[11px] mono uppercase tracking-widest text-[#8A8784] flex items-center gap-1">
                <Layers size={12} /> Top Formats Today
              </p>
              <div className="mt-3 space-y-2">
                {POPPING_IG_FORMATS.map((fmt) => (
                  <div
                    key={fmt.title}
                    onClick={() => handleApplyPoppingFormat(fmt)}
                    className="group rounded-[16px] border border-[#EDE8E3] bg-white p-3 hover:border-[#0066FF]/40 hover:shadow-[0_8px_20px_rgba(0,102,255,0.08)] transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium leading-tight">
                        &ldquo;{fmt.title}&rdquo;
                      </p>
                      <ChevronRight
                        size={14}
                        className="opacity-40 group-hover:opacity-100 transition shrink-0"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] mono px-1.5 py-0.5 rounded bg-[#EDE8E3]">
                        {fmt.views}
                      </span>
                      <span className="text-[11px] mono text-emerald-600">
                        {fmt.growth}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Trending Audio */}
            <div>
              <p className="text-[11px] mono uppercase tracking-widest text-[#8A8784] flex items-center gap-1">
                <Music2 size={12} /> Trending Audio
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TRENDING_AUDIOS.map((aud) => {
                  const isPicked = selectedAudioName === aud.name;
                  return (
                    <div
                      key={aud.name}
                      onClick={() => {
                        setSelectedAudioName(aud.name);
                        setToastMessage(`Audio locked: ${aud.name} (${aud.use})`);
                      }}
                      className={`rounded-[14px] bg-[#111] text-white p-3 cursor-pointer transition border ${
                        isPicked ? "border-[#FF6B35]" : "border-transparent"
                      }`}
                    >
                      <div className="flex gap-[2px] h-6 items-end">
                        {aud.bars.map((h, d) => (
                          <div
                            key={d}
                            className="w-[3px] bg-white/80 rounded-full"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] font-medium leading-tight">
                        {aud.name}
                      </p>
                      <p className="text-[10px] mono opacity-60">{aud.use}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Your Niche • AI UGC */}
            <div>
              <p className="text-[11px] mono uppercase tracking-widest text-[#8A8784]">
                Your Niche • AI UGC
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {NICHE_PILLS.map((pill) => {
                  const isSel = selectedNichePill === pill;
                  return (
                    <span
                      key={pill}
                      onClick={() => {
                        setSelectedNichePill(pill);
                        setToastMessage(`Niche focus updated: ${pill}`);
                      }}
                      className={`px-2.5 py-1 rounded-full border text-[12px] cursor-pointer transition ${
                        isSel
                          ? "bg-[#EFF5FF] border-[#0066FF] text-[#0066FF] font-medium"
                          : "border-[#EDE8E3] bg-white hover:bg-[#EFF5FF]"
                      }`}
                    >
                      {pill}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 4. Blue Suggestion Engine Card */}
            <div className="rounded-[20px] bg-[#0066FF] text-white p-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white text-[#0066FF] grid place-items-center">
                  <Lightbulb size={14} />
                </div>
                <p className="text-[11px] mono uppercase tracking-widest opacity-80">
                  Suggestion Engine
                </p>
              </div>

              <p className="mt-3 text-[14px] leading-snug font-medium">
                Based on your memory{" "}
                <span className="px-1.5 py-0.5 rounded bg-white text-[#0066FF] text-[11px]">
                  &apos;{activeMemory.title}&apos;
                </span>{" "}
                + trending{" "}
                <span className="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[11px]">
                  &apos;POV&apos; format
                </span>{" "}
                →
              </p>

              <div className="mt-3 rounded-[12px] bg-white text-[#111111] p-3">
                <p className="text-[13px] font-semibold">
                  {suggestionApplied
                    ? "✓ Angle applied to script — check HOOK beat"
                    : activeMemory.suggestionTitle}
                </p>
                <p className="mt-1 text-[11px] text-[#8A8784]">
                  {activeMemory.suggestionSub}
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplySuggestionEngine}
                className="mt-3 w-full h-9 rounded-full bg-white text-[#0066FF] text-[12px] font-semibold hover:bg-[#F5F8FF] transition cursor-pointer"
              >
                {suggestionApplied ? "Angle in use" : "Use this angle"}
              </button>
            </div>

            {/* 5. Hashtags for this reel */}
            <div>
              <p className="text-[11px] mono uppercase tracking-widest text-[#8A8784] flex items-center gap-1">
                <Hash size={12} /> Hashtags for this reel
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {HASHTAGS.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => {
                      navigator.clipboard?.writeText(tag);
                      setToastMessage(`Copied ${tag}`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#F3F0EB] text-[11px] mono cursor-pointer hover:bg-[#111] hover:text-white transition"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {(leftDrawerOpen || rightDrawerOpen) && (
          <div
            className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            onClick={() => {
              setLeftDrawerOpen(false);
              setRightDrawerOpen(false);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="mx-auto max-w-[1600px] px-3 py-1.5 text-center text-[10px] mono text-[#8A8784]">
        crafted for {userName} • AI Director v2 • Zero Slop
      </footer>

      {/* Floating Bottom Toast Pill */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full bg-[#111] text-white text-[13px] shadow-[0_12px_32px_rgba(0,0,0,0.22)] flex items-center gap-2 max-w-[90vw]"
          >
            <span className="w-5 h-5 rounded-full bg-white/15 grid place-items-center">
              <Check size={12} />
            </span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          FULL-LOOP TELEPROMPTER & MOBILE QR CAMERA RECORDING MODAL
         ===================================================================== */}
      <AnimatePresence>
        {isRecordStageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-[1180px] rounded-[28px] border border-[#EDE8E3] bg-[#FFFEFB] shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-[#111111] text-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B35] animate-ping" />
                  <div>
                    <div className="mono text-[10px] uppercase text-[#FF6B35]">
                      Laptop Teleprompter + Mobile QR Camera Loop
                    </div>
                    <h3 className="serif text-xl text-white">
                      {activeMemory.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-white/10 mono text-xs text-white">
                    {mobileStatus === "waiting_for_mobile"
                      ? "📱 Scan QR with Phone or Record on Laptop"
                      : mobileStatus === "mobile_connected"
                      ? "🟢 Phone Connected!"
                      : mobileStatus === "recording"
                      ? "🔴 Recording Live on Phone..."
                      : "✅ Video Received!"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isLaptopRecording) handleStopLaptopCamera();
                      setIsRecordStageOpen(false);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white mono text-xs cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7 rounded-[24px] bg-[#111111] text-white p-6 flex flex-col justify-between min-h-[420px] relative overflow-hidden">
                  {isLaptopCamActive && (
                    <video
                      ref={laptopVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                    />
                  )}

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="mono text-xs text-[#FF6B35] uppercase">
                        Beat {teleprompterBeatIndex + 1} of {activeBeats.length}{" "}
                        • {activeBeats[teleprompterBeatIndex]?.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nextPlay = !isTeleprompterPlaying;
                            setIsTeleprompterPlaying(nextPlay);
                            pushSessionUpdate(teleprompterBeatIndex, nextPlay);
                          }}
                          className="px-3 py-1 rounded-full bg-white/15 text-white mono text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {isTeleprompterPlaying ? (
                            <>
                              <Pause size={12} /> Pause
                            </>
                          ) : (
                            <>
                              <Play size={12} /> Play
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTeleprompterBeatIndex(0);
                            setIsTeleprompterPlaying(true);
                            pushSessionUpdate(0, true);
                          }}
                          className="px-2.5 py-1 rounded-full bg-white/10 text-white mono text-xs cursor-pointer"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full">
                      {activeBeats.map((b, i) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setTeleprompterBeatIndex(i);
                            pushSessionUpdate(i, isTeleprompterPlaying);
                          }}
                          className={`h-1.5 flex-1 rounded-full transition cursor-pointer ${
                            i === teleprompterBeatIndex
                              ? "bg-[#FF6B35]"
                              : i < teleprompterBeatIndex
                              ? "bg-white/70"
                              : "bg-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 my-auto py-6 text-center px-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#FF6B35] text-white mono text-xs mb-4">
                      {activeBeats[teleprompterBeatIndex]?.label} (
                      {activeBeats[teleprompterBeatIndex]?.range})
                    </span>
                    <p className="serif text-3xl sm:text-4xl text-white leading-tight mb-4">
                      &ldquo;{activeBeats[teleprompterBeatIndex]?.text}&rdquo;
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-xs">
                      <Sparkles size={13} className="text-[#FF6B35]" />
                      <span>
                        Coach: {userName},{" "}
                        {activeBeats[teleprompterBeatIndex]?.coaching}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/60 mono">
                    <span>
                      Voice: {activeBeats[teleprompterBeatIndex]?.voice}
                    </span>
                    <span>{targetLengthLabel} optimal</span>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                  <div className="rounded-[24px] border border-[#EDE8E3] bg-white p-5 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0EB] text-[#FF6B35] mono text-[10px] font-bold uppercase mb-2">
                      <Smartphone size={12} />
                      <span>Scan With Phone Camera</span>
                    </div>
                    <h4 className="serif text-xl text-[#111111] mb-1">
                      Read on Laptop • Record on Mobile
                    </h4>
                    <p className="text-xs text-[#8A8784] mb-3 max-w-sm">
                      Scan this QR code on your phone to record and send
                      directly to the studio.
                    </p>

                    {mobileRecordUrl && (
                      <div className="p-3 rounded-[16px] border border-[#EDE8E3] bg-white mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            mobileRecordUrl
                          )}`}
                          alt="Mobile QR Code"
                          className="w-40 h-40 rounded-lg"
                        />
                      </div>
                    )}

                    <a
                      href={mobileRecordUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mono text-[11px] font-semibold text-[#0066FF] hover:underline flex items-center gap-1"
                    >
                      <span>Open Mobile Companion Preview</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  <div className="rounded-[24px] border border-[#EDE8E3] bg-white p-5">
                    <div className="mono text-[10px] uppercase text-[#8A8784] mb-1">
                      Or Record Right Here on Laptop
                    </div>
                    <h4 className="serif text-lg text-[#111111] mb-3">
                      One-Click Laptop Camera + Studio Handoff
                    </h4>

                    {!isLaptopRecording ? (
                      <button
                        type="button"
                        onClick={handleStartLaptopCamera}
                        className="w-full h-11 rounded-full bg-[#111111] hover:bg-[#FF6B35] text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>Start Laptop Camera Recording</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopLaptopCamera}
                        className="w-full h-11 rounded-full bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-2 animate-pulse cursor-pointer"
                      >
                        <Square size={14} />
                        <span>
                          Finish Recording ({laptopRecSec}s) &amp; Send to
                          Studio →
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
