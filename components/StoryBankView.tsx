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
  onSwitchToStudio?: (scriptText?: string, title?: string) => void;
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

export default function StoryBankView({
  onSwitchToStudio,
  onCompleteRecordingToStudio,
  initialTopicFromYou,
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
      memoryBankList[0],
    [memoryBankList, selectedMemoryId]
  );

  const activeBeats = useMemo(
    () => beatsByMemoryId[activeMemory.id] || activeMemory.beats || DEFAULT_BEATS,
    [beatsByMemoryId, activeMemory]
  );

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

  useEffect(() => {
    if (initialTopicFromYou) {
      setCoWriteInput(initialTopicFromYou);
    }
  }, [initialTopicFromYou]);

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

  // Refine script via Meta Muse `/api/script-brain`
  const handleRefineWithMeta = async () => {
    const instruction = coWriteInput.trim();
    if (!instruction || isRefiningWithMeta) return;
    setIsRefiningWithMeta(true);
    try {
      const res = await fetch("/api/script-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          storyIdea: `${activeMemory.title} — ${activeBeats
            .map((b) => b.text)
            .join(" ")}`,
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
        setBeatsByMemoryId((prev) => ({
          ...prev,
          [activeMemory.id]: activeBeats.map((b, i) => ({
            ...b,
            text: apiBeats[i]?.spokenLine || b.text,
            visual: apiBeats[i]?.visualCutaway || b.visual,
            coaching: apiBeats[i]?.deliveryCue || b.coaching,
          })),
        }));
        setCoWriteInput("");
        setToastMessage("Zee updated your script with Meta Muse ✓");
      } else {
        handleUpdateBeatText(activeBeatId, instruction);
        setCoWriteInput("");
        setToastMessage(`Updated Beat ${activeBeatId} ✓`);
      }
    } catch {
      handleUpdateBeatText(activeBeatId, instruction);
      setCoWriteInput("");
      setToastMessage(`Updated Beat ${activeBeatId} ✓`);
    } finally {
      setIsRefiningWithMeta(false);
    }
  };

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
      className="min-h-screen bg-[#FFFEFB] text-[#111111] relative overflow-x-clip"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(17,17,17,0.08) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Soft Ambient Radial Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[30%] left-[20%] w-[70%] h-[60%] rounded-full blur-[120px] opacity-[0.12]"
          style={{
            background: "radial-gradient(circle, #FF6B35 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[10%] right-[5%] w-[45%] h-[50%] rounded-full blur-[120px] opacity-[0.10]"
          style={{
            background: "radial-gradient(circle, #0066FF 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[50%] h-[40%] rounded-full blur-[120px] opacity-[0.08]"
          style={{
            background: "radial-gradient(circle, #FFB5A7 0%, transparent 70%)",
          }}
        />
      </div>

      {/* =====================================================================
          STICKY STUDIO SUB-HEADER BAR
         ===================================================================== */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[#EDE8E3]">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
              className="lg:hidden p-2 rounded-full border border-[#EDE8E3] bg-white cursor-pointer"
            >
              {leftDrawerOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#111111] text-[#FFFEFB] grid place-items-center font-bold text-[12px]">
                P
              </div>
              <span className="font-semibold tracking-tight lowercase">
                {userName}&apos;s studio
              </span>
              <span className="hidden md:inline-flex ml-2 px-2 py-0.5 rounded-full bg-[#111111] text-[#FFFEFB] text-[10px] mono">
                AI DIRECTOR v2
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-[12px] mono px-3 py-1.5 rounded-full bg-white border border-[#EDE8E3] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>analyzing {memoryBankList.length} memories • live</span>
            </div>

            <button
              type="button"
              onClick={handleOpenRecordStage}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] mono font-semibold px-3 py-1.5 rounded-full bg-[#111111] text-white hover:bg-[#FF6B35] transition cursor-pointer"
            >
              <QrCode size={13} />
              <span>Teleprompter + QR</span>
            </button>

            <button
              type="button"
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
              className="lg:hidden p-2 rounded-full border border-[#EDE8E3] bg-white cursor-pointer"
            >
              <TrendingUp size={16} />
            </button>

            <div className="w-8 h-8 rounded-full bg-[#111] text-white grid place-items-center font-semibold text-[12px] border border-[#EDE8E3]">
              P
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          3-COLUMN STUDIO GRID:
          LEFT (280px): MEMORY BANK (COMPACT VOICE LOGS + PERSONALIZATION SIGNAL)
          CENTER (1fr): AI DIRECTOR'S PICK + TORN-PAPER BEAT CARDS + ACTION BAR
          RIGHT (360px): WHAT'S POPPING ON IG + SUGGESTION ENGINE + HASHTAGS
         ===================================================================== */}
      <div className="mx-auto max-w-[1600px] px-0 lg:px-6 py-0 lg:py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-0 lg:gap-6 items-start relative z-10">
        {/* ===================================================================
            LEFT SIDEBAR: MEMORY BANK
           =================================================================== */}
        <aside
          className={`lg:sticky lg:top-[76px] lg:h-[calc(100vh-96px)] bg-white lg:rounded-[24px] border-y lg:border border-[#EDE8E3] shadow-[0_12px_40px_rgba(0,0,0,0.04)] flex flex-col fixed inset-y-0 left-0 z-40 w-[300px] lg:w-auto transition-transform duration-300 ${
            leftDrawerOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-5 border-b border-[#EDE8E3]">
            <div className="flex items-center justify-between">
              <h3 className="serif text-[20px] tracking-tight font-normal">
                Memory Bank
              </h3>
              <span className="text-[10px] mono px-2 py-1 rounded-full bg-[#111] text-white">
                {memoryBankList.length} compact
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#8A8784]">
              Your voice logs — compressed for scripting
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
            CENTER MAIN COLUMN: AI DIRECTOR'S PICK + TORN-PAPER BEAT CARDS
           =================================================================== */}
        <main className="min-w-0 px-4 lg:px-0 py-4 lg:py-0">
          {/* Top Hero Card */}
          <div className="relative overflow-hidden rounded-[28px] border border-[#EDE8E3] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect filter='url(%23noise)' width='100%25' height='100%25'/%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111] text-white text-[11px] mono">
                  <Sparkles size={12} /> AI DIRECTOR&apos;S PICK
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF5FF] text-[#0066FF] text-[11px] mono">
                  <Eye size={12} /> High save potential
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0EB] text-[#FF6B35] text-[11px] mono">
                  <Flame size={12} /> For tonight 8PM
                </span>
              </div>

              <h1 className="serif text-[32px] md:text-[40px] leading-[0.95] tracking-tight font-normal">
                Hey {userName}, I analyzed all your stories{" "}
                <span className="italic opacity-60">→</span> you should make
                this reel
              </h1>

              <p className="mt-3 text-[14px] md:text-[15px] text-[#8A8784] max-w-[60ch]">
                Based on your last {memoryBankList.length} memories + your
                content style{" "}
                <span className="inline-flex px-2 py-0.5 rounded-full bg-[#111] text-white text-[12px] ml-1">
                  {selectedNichePill.toUpperCase()}
                </span>{" "}
                — your audience saves tutorials 3.2x more. This script uses your{" "}
                <strong className="text-[#111111] font-medium">
                  {activeMemory.title.toLowerCase()}
                </strong>{" "}
                story + trending POV format.
              </p>

              {/* 3 Metric Boxes */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-[16px] border border-[#EDE8E3] bg-white px-4 py-3">
                  <p className="text-[10px] mono text-[#8A8784] uppercase">
                    Hook rate
                  </p>
                  <p className="text-[20px] font-semibold tracking-tight">
                    92%
                  </p>
                  <p className="text-[11px] text-[#8A8784]">predicted</p>
                </div>

                <div className="rounded-[16px] border border-[#EDE8E3] bg-white px-4 py-3">
                  <p className="text-[10px] mono text-[#8A8784] uppercase">
                    Save rate
                  </p>
                  <p className="text-[20px] font-semibold tracking-tight">
                    78%
                  </p>
                  <p className="text-[11px] text-[#8A8784]">your avg +12%</p>
                </div>

                <div
                  onClick={handleCycleLength}
                  title="Click to switch target length (10s / 30s / 45s — strictly ≤60s)"
                  className="rounded-[16px] border border-[#EDE8E3] bg-white px-4 py-3 cursor-pointer hover:border-[#111111] transition"
                >
                  <p className="text-[10px] mono text-[#8A8784] uppercase flex items-center justify-between">
                    <span>Length</span>
                    <span className="text-[9px] text-[#FF6B35]">tap to change</span>
                  </p>
                  <p className="text-[20px] font-semibold tracking-tight">
                    {targetLengthLabel}
                  </p>
                  <p className="text-[11px] text-[#8A8784]">optimal (&le;60s)</p>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================
              BEAT CARDS (HOOK, TRANSFORM, MAGIC, PAYOFF)
             ================================================================= */}
          <div className="mt-6 space-y-4">
            {activeBeats.map((beat) => {
              const isSelected = activeBeatId === beat.id;
              const isEditingThis = editingBeatId === beat.id;

              return (
                <div
                  key={beat.id}
                  onClick={() => setActiveBeatId(beat.id)}
                  className={`group relative rounded-[24px] border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-white border-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.12)] scale-[1.01]"
                      : "bg-white/80 backdrop-blur border-[#EDE8E3] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]"
                  }`}
                >
                  {/* Floating Numbered Badge */}
                  <div className="absolute -top-3 -left-2 md:-left-3 w-10 h-10 rounded-full bg-[#111111] text-white grid place-items-center mono text-[12px] font-bold shadow-lg z-20">
                    {beat.id}
                  </div>

                  <div className="p-5 md:p-6 flex flex-col md:flex-row gap-5">
                    {/* Left Content of Beat */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-[#111] text-white mono text-[10px] tracking-widest">
                            {beat.label}
                          </span>
                          <span className="px-2 py-1 rounded-full border border-[#EDE8E3] mono text-[10px]">
                            {beat.range}
                          </span>
                          <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#EFF5FF] text-[#0066FF] text-[10px] mono">
                            <Video size={10} /> {beat.motion}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBeatId(isEditingThis ? null : beat.id);
                          }}
                          className="text-[10px] mono text-[#8A8784] hover:text-[#111111] flex items-center gap-1 px-2 py-0.5 rounded-full border border-transparent hover:border-[#EDE8E3] cursor-pointer"
                        >
                          <Edit3 size={10} />
                          <span>{isEditingThis ? "Done" : "Edit line"}</span>
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
                          className="mt-4 w-full rounded-[14px] border border-[#111111] bg-[#FFFEFB] p-3 serif text-[22px] md:text-[26px] leading-[1.1] tracking-tight focus:outline-none"
                        />
                      ) : (
                        <p className="mt-4 serif text-[22px] md:text-[26px] leading-[1.1] tracking-tight">
                          &ldquo;{beat.text}&rdquo;
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE8E3] text-[11px] mono">
                          <Mic size={12} /> voice: {beat.voice}
                        </span>
                        <span className="inline-flex md:hidden items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF5FF] text-[#0066FF] text-[11px] mono">
                          {beat.motion}
                        </span>
                      </div>

                      {/* Coach Note for Prem */}
                      <div className="mt-4 relative rounded-[16px] bg-[#FFF0EB] border border-[#FFD8C8] p-3.5">
                        <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-[#FF6B35] text-white text-[9px] mono font-bold">
                          COACH NOTE FOR {userName.toUpperCase()}
                        </div>
                        <p className="text-[13px] leading-snug text-[#7A2A12]">
                          <span className="font-semibold">{userName},</span>{" "}
                          {beat.coaching}
                        </p>
                      </div>
                    </div>

                    {/* Right Torn-Paper Visual Idea Card */}
                    <div className="md:w-[240px] shrink-0">
                      <div
                        className="relative bg-[#FFFEF5] border border-[#EDE3C8] shadow-[0_8px_20px_rgba(0,0,0,0.08)] p-4 rotate-[0.8deg] group-hover:rotate-[0deg] transition-transform"
                        style={{
                          clipPath:
                            "polygon(0% 2%, 3% 0%, 12% 1.5%, 22% 0%, 35% 1.8%, 48% 0.5%, 62% 2%, 75% 0.8%, 88% 1.6%, 100% 0%, 98.5% 18%, 100% 35%, 98% 52%, 100% 68%, 98.2% 85%, 100% 100%, 88% 98.2%, 74% 100%, 60% 98.5%, 45% 100%, 30% 98%, 15% 100%, 0% 98.5%, 1.5% 82%, 0% 65%, 2% 48%, 0.5% 30%)",
                        }}
                      >
                        <div className="absolute top-2 right-3 w-6 h-6 rounded-full bg-[#111] grid place-items-center">
                          <Layers size={12} color="white" />
                        </div>
                        <p className="text-[10px] mono uppercase tracking-widest text-[#8A8784]">
                          visual idea
                        </p>
                        <p className="mt-2 text-[12.5px] leading-[1.4] text-[#3A352E]">
                          {beat.visual}
                        </p>
                        <div className="mt-3 h-[56px] rounded-[10px] bg-[repeating-linear-gradient(45deg,#F5EEDD,#F5EEDD_6px,#FFF9EB_6px,#FFF9EB_12px)] border border-dashed border-[#E2D6B5] grid place-items-center overflow-hidden relative">
                          <span className="text-[10px] mono text-[#8A7D65] z-10 px-2 py-0.5 rounded bg-[#FFFEF5]/90">
                            {beat.bRollLabel || "B-ROLL + PAPER CUT"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="px-6 pb-4 flex gap-2">
                      <div className="h-1 flex-1 rounded-full bg-[#111111]" />
                      <div className="h-1 w-6 rounded-full bg-[#EDE8E3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Voice/Text Co-Writer Strip */}
          <div className="mt-5 rounded-[20px] border border-[#EDE8E3] bg-white px-4 py-3 flex items-center gap-2.5 shadow-sm">
            <button
              type="button"
              onClick={handleToggleCoWriteMic}
              className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition cursor-pointer ${
                isListeningCoWrite
                  ? "bg-[#FF6B35] text-white animate-pulse"
                  : "bg-[#FFF0EB] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white"
              }`}
              title="Speak changes to Zee"
            >
              {isListeningCoWrite ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <input
              type="text"
              value={coWriteInput}
              onChange={(e) => setCoWriteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRefineWithMeta()}
              placeholder={`Tell Zee to tweak Beat ${activeBeatId} or blend another memory (e.g. "Add my Gokarna sunset note")...`}
              className="flex-1 bg-transparent text-[13px] text-[#111111] placeholder:text-[#8A8784] focus:outline-none"
            />
            {coWriteInput.trim() && (
              <button
                type="button"
                disabled={isRefiningWithMeta}
                onClick={handleRefineWithMeta}
                className="px-3.5 py-1.5 rounded-full bg-[#111111] text-white text-[11px] mono font-medium cursor-pointer"
              >
                {isRefiningWithMeta ? "Updating..." : "Update Script"}
              </button>
            )}
          </div>

          {/* =================================================================
              BOTTOM CTA BAR: READY TO SHOOT THIS?
             ================================================================= */}
          <div className="mt-6 rounded-[24px] border border-[#EDE8E3] bg-white p-4 md:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#111111] text-white grid place-items-center shrink-0">
                <Wand2 size={16} />
              </div>
              <div>
                <p className="text-[14px] font-semibold">
                  Ready to shoot this?
                </p>
                <p className="text-[12px] text-[#8A8784]">
                  Angle:{" "}
                  <span className="font-medium text-[#111111]">
                    {ANGLES[angleIndex]}
                  </span>{" "}
                  • Takes ~11 min to edit
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRegenerateAngle}
                className="h-11 px-4 rounded-full border border-[#EDE8E3] bg-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-[#F7F5F2] transition cursor-pointer"
              >
                <RefreshCw size={14} /> Regenerate angle
              </button>

              <button
                type="button"
                onClick={() => {
                  const fullScriptText = activeBeats.map((b) => b.text).join(" ");
                  const scriptTitle = activeMemory?.title || initialTopicFromYou || "Story Script";
                  setIsGeneratingVideo(true);
                  setVideoReady(false);
                  setTimeout(() => {
                    setIsGeneratingVideo(false);
                    setVideoReady(true);
                    setToastMessage(
                      "Script loaded into Studio — switching to Video Creation!"
                    );
                    if (onSwitchToStudio) {
                      setTimeout(() => onSwitchToStudio(fullScriptText, scriptTitle), 600);
                    }
                  }, 600);
                }}
                className="h-11 px-6 rounded-full bg-[#111111] text-white text-[13px] font-semibold inline-flex items-center gap-2 shadow-[0_8px_20px_rgba(0,0,0,0.18)] hover:translate-y-[-1px] transition cursor-pointer"
              >
                <Video size={14} />{" "}
                {isGeneratingVideo
                  ? "Generating..."
                  : videoReady
                  ? "Video ready ✓"
                  : "Generate Video with this script"}{" "}
                <ArrowUpRight size={14} className="opacity-60" />
              </button>
            </div>
          </div>

          <div className="h-24 lg:hidden" />
        </main>

        {/* ===================================================================
            RIGHT SIDEBAR: WHAT'S POPPING ON IG + SUGGESTION ENGINE
           =================================================================== */}
        <aside
          className={`lg:sticky lg:top-[76px] lg:h-[calc(100vh-96px)] lg:overflow-y-auto bg-white lg:rounded-[24px] border-t lg:border border-[#EDE8E3] shadow-[0_12px_40px_rgba(0,0,0,0.04)] fixed inset-x-0 bottom-0 z-40 lg:z-0 rounded-t-[28px] transition-transform duration-300 ${
            rightDrawerOpen
              ? "translate-y-0"
              : "translate-y-[calc(100%-48px)] lg:translate-y-0"
          }`}
        >
          <div
            className="lg:hidden flex justify-center pt-3 pb-1 cursor-pointer"
            onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
          >
            <div className="w-10 h-1.5 rounded-full bg-[#EDE8E3]" />
          </div>

          <div className="p-5 border-b border-[#EDE8E3] flex items-center justify-between">
            <div>
              <h3 className="serif text-[20px] flex items-center gap-2 font-normal">
                <span className="w-6 h-6 rounded-full bg-[#0066FF] text-white grid place-items-center">
                  <TrendingUp size={12} />
                </span>{" "}
                What&apos;s popping on IG
              </h3>
              <p className="text-[12px] text-[#8A8784] mt-1">
                → Make reel about this
              </p>
            </div>
            <span className="text-[10px] mono px-2 py-1 rounded-full bg-[#EFF5FF] text-[#0066FF]">
              live 2h ago
            </span>
          </div>

          <div className="p-4 space-y-6">
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
      <footer className="mx-auto max-w-[1600px] px-6 py-8 text-center text-[11px] mono text-[#8A8784]">
        crafted for {userName} — Business: AI automation • Content: AI VIDEO /
        UGC ADS • best post 8pm IST
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
