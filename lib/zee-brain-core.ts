
import type { HeaderTab } from "@/components/AppleDockNav";
export type { HeaderTab };

export type LifeCategory =
  | "insight"
  | "personal"
  | "work"
  | "travel"
  | "family"
  | "relationships";

export interface QuoteDigitalAsset {
  quote: string;
  subtext: string;
  styleTag: string;
}

export interface BookDigitalAsset {
  title: string;
  subtitle: string;
  chapters: string[];
  wordCount: number;
}

export interface BusinessIdeaItem {
  name: string;
  pitch: string;
  firstStep: string;
}

export interface BusinessDigitalAsset {
  headline: string;
  marketAngle: string;
  ideas: BusinessIdeaItem[];
}

export interface AssistantDigitalAsset {
  friendReply: string;
  nextMoves: string[];
  tasteConnection: string;
}

export interface WhatsAppScriptBeat {
  id: number;
  label: "HOOK" | "TRANSFORM" | "MAGIC" | "PAYOFF" | string;
  range: string;
  text: string;
  visual: string;
  motion: string;
  voice: string;
  coaching: string;
  durationSec: number;
  memoryTag?: string;
  bRollWindow?: string;
  isLoopBack?: boolean;
}

export interface WhatsAppChatTurn {
  id: string;
  role: "user" | "zee_bot";
  type: "voice" | "text";
  text: string;
  durationSec?: number;
  timestamp: string;
}

export interface MemoryBankItem {
  id: string;
  conversationId?: string;
  finalizedScriptId?: string;
  category: LifeCategory;
  title: string;
  story: string;
  zeeAnalysis: string;
  followUpQuestion?: string;
  date: string;
  emotionTone: string;
  tags: string[];
  variableKey: string;
  reelHookIdea: string;
  source:
    | "voice_mic"
    | "text_mic"
    | "text_chat"
    | "account_sync"
    | "gallery_vision"
    | "whatsapp_voice"
    | "whatsapp_chat";
  audioUrl?: string;
  metaPowered?: boolean;
  userPhone?: string;
  subSegment?: string; // e.g. "Breakup & Healing", "Startup Pitch", "Family Dinner", "Founder Burnout"
  scriptBeats?: WhatsAppScriptBeat[];
  whatsappThread?: WhatsAppChatTurn[];
  // Editorial Studio & Digital Assets (Quote, Book, Business Ideas, Zee Personal Assistant)
  durationLabel?: string;
  waveform?: number[];
  quoteAsset?: QuoteDigitalAsset;
  bookAsset?: BookDigitalAsset;
  businessAsset?: BusinessDigitalAsset;
  assistantAsset?: AssistantDigitalAsset;
}

export interface GalleryMediaItem {
  id: string;
  title: string;
  url: string;
  category: Exclude<LifeCategory, "insight">;
  date: string; // YYYY-MM-DD
  displayDate: string;
  location: string;
  source: "local" | "apple_photos" | "google_drive" | "instagram";
  mediaType: "photo" | "video";
  aiTags: string[];
  aspectSummary: string;
  matchedVariable: string;
  reelReady: boolean;
  supplyDeck: string;
  creativeInsight: string;
  tiltDeg?: number;
  // Smart Folder Wallet & EXIF Metadata fields
  folderId?: string;
  folderTitle?: string;
  folderSubtitle?: string;
  folderType?:
    | "travel_place"
    | "portraits"
    | "family"
    | "workplace"
    | "ai_images"
    | "ai_videos"
    | "personal";
  isAiGenerated?: boolean;
  cameraOrAiBadge?: string;
}

export interface ConnectedSource {
  id:
    | "apple_photos"
    | "google_drive"
    | "local_computer"
    | "instagram"
    | "youtube"
    | "reading_feed";
  name: string;
  type: "gallery" | "social" | "reading";
  connected: boolean;
  handleOrPath: string;
  syncedCount: number;
  lastSynced: string;
  statusText: string;
}

export interface LikedReelDNA {
  id: string;
  inputUrlOrNote: string;
  creatorStyle: string;
  detectedFormat: string;
  hookPattern: string;
  pacingBpm: string;
  captionStyle: string;
  readingPatternMatch: string;
  scannedAt: string;
}

export interface BrandIdentityProfile {
  websiteUrl: string;
  name: string;
  description: string;
  voiceNotes: string;
  audience: string;
  brandPromise: string;
  differentiator: string;
  contentPillars: string;
  creativeGoals: string;
  boundaries: string;
  colors: string[];
  fonts: string[];
  keywords: string[];
  pageTitle?: string;
  pageHeadings?: string[];
  analyzedAt?: string;
}

export interface VirtualYouDNA {
  userName: string;
  personaTitle: string;
  warmthLevel: number; // 0-100
  twinSyncScore: number; // 0-100
  voiceCadence: string;
  thinkingStyle: string;
  readingPattern: string;
  preferredFormat: string;
  signatureHookStyle: string;
  visualTaste: string;
  coreValues: string[];
  signaturePhrases: string[];
}

export interface CrossPageActivityLog {
  id: string;
  page: HeaderTab;
  pageLabel: string;
  action: string;
  timestamp: string;
}

/**
 * Shared variables that connect YouView -> Scripting -> Editing -> Posting -> ZeeView
 * (Displayed only when Admin Mode is enabled)
 */
export interface ZeeMatchedVariables {
  "user.name": string;
  "user.persona": string;
  "user.voiceTone": string;
  "user.readingPattern": string;
  "user.preferredFormat": string;
  "user.hookPattern": string;
  "user.visualTaste": string;
  "user.todayInsight": string;
  "user.personalLife": string;
  "user.workplaceStory": string;
  "user.travelMemory": string;
  "user.familyMoment": string;
  "user.relationshipView": string;
  "user.topGalleryAsset": string;
  "user.likedReelReference": string;
  "app.activeStage": string;
  "app.lastTopic": string;
}

export interface ZeeBrainState {
  virtualYou: VirtualYouDNA;
  brandProfile: BrandIdentityProfile;
  memories: MemoryBankItem[];
  gallery: GalleryMediaItem[];
  sources: ConnectedSource[];
  likedReels: LikedReelDNA[];
  variables: ZeeMatchedVariables;
  activityLogs: CrossPageActivityLog[];
  activeTab: HeaderTab;
  lastUpdated: string;
}

const STORAGE_KEY = "muse_zee_overall_brain_prem_v4";
export const BRAIN_EVENT = "zee-overall-brain-sync";

export const CATEGORY_META: Record<
  LifeCategory,
  {
    label: string;
    shortLabel: string;
    supplyName: string;
    variableKey: keyof ZeeMatchedVariables;
    color: string;
    bg: string;
    border: string;
    promptQuestion: string;
  }
> = {
  insight: {
    label: "Today's Spark",
    shortLabel: "Spark",
    supplyName: "Mindset & Sparks",
    variableKey: "user.todayInsight",
    color: "#E4491B",
    bg: "#F6D9CC",
    border: "#E4491B",
    promptQuestion: "What happened that you want to make sense of, remember, or share?",
  },
  personal: {
    label: "Personal Rhythm",
    shortLabel: "Personal",
    supplyName: "Personal Rituals Supply",
    variableKey: "user.personalLife",
    color: "#059669",
    bg: "#D1FAE5",
    border: "#059669",
    promptQuestion: "What part of your day or routine has been on your mind?",
  },
  work: {
    label: "Workplace & Craft",
    shortLabel: "Workplace",
    supplyName: "Workplace & Builder Supply",
    variableKey: "user.workplaceStory",
    color: "#2563EB",
    bg: "#DBEAFE",
    border: "#2563EB",
    promptQuestion: "What is happening in your work or craft that you want to talk through?",
  },
  travel: {
    label: "Horizons & Travel",
    shortLabel: "Travel",
    supplyName: "Horizons & Travel Supply",
    variableKey: "user.travelMemory",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#D97706",
    promptQuestion: "What place or moment from a recent trip has stayed with you?",
  },
  family: {
    label: "Roots & Family",
    shortLabel: "Family",
    supplyName: "Roots & Family Supply",
    variableKey: "user.familyMoment",
    color: "#7C3AED",
    bg: "#EDE9FE",
    border: "#7C3AED",
    promptQuestion: "What has been happening with the people closest to you?",
  },
  relationships: {
    label: "Bonds & People",
    shortLabel: "Bonds",
    supplyName: "Human Bonds Supply",
    variableKey: "user.relationshipView",
    color: "#DB2777",
    bg: "#FCE7F3",
    border: "#DB2777",
    promptQuestion: "What conversation or relationship has been on your mind?",
  },
};

export const INITIAL_ZEE_BRAIN: ZeeBrainState = {
  brandProfile: {
    websiteUrl: "",
    name: "",
    description: "",
    voiceNotes: "",
    audience: "",
    brandPromise: "",
    differentiator: "",
    contentPillars: "",
    creativeGoals: "",
    boundaries: "",
    colors: ["#E4491B", "#141414", "#F5F1E8"],
    fonts: ["Inter", "Instrument Serif"],
    keywords: [],
  },
  virtualYou: {
    userName: "",
    personaTitle: "Creator",
    warmthLevel: 0,
    twinSyncScore: 0,
    voiceCadence: "",
    thinkingStyle: "",
    readingPattern: "",
    preferredFormat: "auto",
    signatureHookStyle: "",
    visualTaste: "",
    coreValues: [],
    signaturePhrases: [],
  },
  memories: [],
  gallery: [],
  sources: [],
  likedReels: [],
  variables: {
    "user.name": "",
    "user.persona": "",
    "user.voiceTone": "",
    "user.readingPattern": "",
    "user.preferredFormat": "",
    "user.hookPattern": "",
    "user.visualTaste": "",
    "user.todayInsight": "",
    "user.personalLife": "",
    "user.workplaceStory": "",
    "user.travelMemory": "",
    "user.familyMoment": "",
    "user.relationshipView": "",
    "user.topGalleryAsset": "",
    "user.likedReelReference": "",
    "app.activeStage": "",
    "app.lastTopic": "",
  },
  activityLogs: [],
  activeTab: "u",
  lastUpdated: new Date().toISOString(),
};

export function computeMatchedVariables(state: ZeeBrainState): ZeeMatchedVariables {
  const latestByCat = (cat: LifeCategory, fallback: string) => {
    const found = state.memories.find((m) => m.category === cat);
    return found ? `${found.title} — ${found.story}` : fallback;
  };

  const topGallery = state.gallery[0]
    ? `${state.gallery[0].title} (${state.gallery[0].displayDate}, ${state.gallery[0].location})`
    : state.variables["user.topGalleryAsset"];

  const topReel = state.likedReels[0]
    ? `${state.likedReels[0].creatorStyle} (${state.likedReels[0].detectedFormat}) — ${state.likedReels[0].hookPattern}`
    : state.variables["user.likedReelReference"];

  return {
    "user.name": state.virtualYou.userName,
    "user.persona": state.virtualYou.personaTitle,
    "user.voiceTone": state.virtualYou.voiceCadence,
    "user.readingPattern": state.virtualYou.readingPattern,
    "user.preferredFormat": state.virtualYou.preferredFormat,
    "user.hookPattern": state.virtualYou.signatureHookStyle,
    "user.visualTaste": state.virtualYou.visualTaste,
    "user.todayInsight": latestByCat("insight", state.variables["user.todayInsight"]),
    "user.personalLife": latestByCat("personal", state.variables["user.personalLife"]),
    "user.workplaceStory": latestByCat("work", state.variables["user.workplaceStory"]),
    "user.travelMemory": latestByCat("travel", state.variables["user.travelMemory"]),
    "user.familyMoment": latestByCat("family", state.variables["user.familyMoment"]),
    "user.relationshipView": latestByCat("relationships", state.variables["user.relationshipView"]),
    "user.topGalleryAsset": topGallery,
    "user.likedReelReference": topReel,
    "app.activeStage": state.variables["app.activeStage"],
    "app.lastTopic": state.variables["app.lastTopic"],
  };
}

/**
 * Dynamically adapts Zee's questions, prompts, follow-ups, and variable context
 * directly around the current creator's saved memories & gallery folders.
 */
export function getDynamicZeeMemoryPrompt(
  brain: ZeeBrainState,
  category: LifeCategory,
  focusedItem?: MemoryBankItem
): {
  memoryAwareQuestion: string;
  followUpQuestion: string;
  memoryContextBadge: string;
  quickSpokenStarter: string;
  variableKey: keyof ZeeMatchedVariables;
  variableLiveValue: string;
  matchedGalleryPlaceOrFolder: string;
} {
  const userName = brain.virtualYou.userName || "there";
  const catMeta = CATEGORY_META[category] || CATEGORY_META.insight;
  const catMemories = brain.memories.filter((m) => m.category === category);
  const latestCatMemory =
    (focusedItem && focusedItem.category === category ? focusedItem : null) ||
    catMemories[0] ||
    brain.memories[0];

  const catGallery = brain.gallery.filter(
    (g) => g.category === category && !g.isAiGenerated
  );
  const gokarnaGallery = brain.gallery.filter((g) =>
    /gokarna/i.test(`${g.location} ${g.folderTitle || ""} ${g.title}`)
  );

  const shortTitle = latestCatMemory
    ? latestCatMemory.title.length > 48
      ? `${latestCatMemory.title.slice(0, 45).trim()}...`
      : latestCatMemory.title
    : "your latest reflection";

  const matchedGalleryPlaceOrFolder =
    category === "travel" && gokarnaGallery.length > 0
      ? `Travel • Gokarna (${gokarnaGallery.length} GPS frames)`
      : catGallery[0]?.folderTitle ||
        catGallery[0]?.location ||
        catMeta.supplyName;

  const variableKey = catMeta.variableKey;
  const variableLiveValue =
    brain.variables[variableKey] ||
    (latestCatMemory ? `${latestCatMemory.title} — ${latestCatMemory.story}` : "");

  if (!latestCatMemory && catGallery.length === 0) {
    const followUpByCategory: Record<LifeCategory, string> = {
      insight: "What happened next, and why does this moment matter to you now?",
      personal: "What changed for you after that, even in a small way?",
      work: "What choice did you have to make, and what was at stake for you?",
      travel: "What detail from that place or moment has stayed with you?",
      family: "What small detail from that moment has stayed with you since?",
      relationships: "What did you understand about yourself after that conversation?",
    };
    return {
      memoryAwareQuestion: catMeta.promptQuestion,
      followUpQuestion: followUpByCategory[category],
      memoryContextBadge: catMeta.supplyName,
      quickSpokenStarter: "",
      variableKey,
      variableLiveValue: "",
      matchedGalleryPlaceOrFolder: catMeta.supplyName,
    };
  }

  if (category === "travel") {
    const placeName =
      gokarnaGallery[0]?.location ||
      catGallery[0]?.location ||
      "Gokarna";
    const photoTitle =
      gokarnaGallery[0]?.title ||
      catGallery[0]?.title ||
      "Om Beach Golden Cliff";
    return {
      memoryAwareQuestion: `Hey ${userName}, I already hold your "${shortTitle}" memory and your ${placeName} photos ("${photoTitle}"). Tell me what else happened in ${placeName}—what moment from that trip is still vivid for you?`,
      followUpQuestion: `When you were in ${placeName} capturing "${photoTitle}" during "${shortTitle}", what detail from that place has stayed with you since?`,
      memoryContextBadge: `Adopted from ${placeName} Gallery + {{${variableKey}}}`,
      quickSpokenStarter: `When I was in ${placeName} walking along the cliff at sunrise, I realized our best business and creative breakthroughs happen when we step away from routine noise.`,
      variableKey,
      variableLiveValue,
      matchedGalleryPlaceOrFolder,
    };
  }

  if (category === "work") {
    const studioPhoto = catGallery[0]?.title || "Dual-Canvas Studio Desk";
    return {
      memoryAwareQuestion: `Hey ${userName}, building on your saved business memory "${shortTitle}" and your "${studioPhoto}" setup—what shifted in your business today, or what's the next move on this build?`,
      followUpQuestion: `In "${shortTitle}", you connected ${latestCatMemory?.tags.slice(0, 2).join(" & ") || "craft & clarity"}. What happened next, and what choice did you have to make in that moment?`,
      memoryContextBadge: `Adopted from Business Memory + {{${variableKey}}}`,
      quickSpokenStarter: `Building on "${shortTitle}", today in our business we focused on making the entire workflow adapt around real human memory instead of static templates.`,
      variableKey,
      variableLiveValue,
      matchedGalleryPlaceOrFolder,
    };
  }

  if (category === "personal") {
    return {
      memoryAwareQuestion: `Hey ${userName}, I remember your personal ritual "${shortTitle}". How did that rhythm play out in your life today—did a new page or feeling surface?`,
      followUpQuestion: `Looking at "${shortTitle}" (${latestCatMemory?.emotionTone || "Intentional & Calm"}), what small detail from today would help me understand this better?`,
      memoryContextBadge: `Adopted from Personal Life + {{${variableKey}}}`,
      quickSpokenStarter: `Following my "${shortTitle}" rhythm today, I wrote down three honest lines over morning coffee before touching a single screen.`,
      variableKey,
      variableLiveValue,
      matchedGalleryPlaceOrFolder,
    };
  }

  if (category === "family") {
    return {
      memoryAwareQuestion: `Hey ${userName}, holding your "${shortTitle}" memory close—what happened with family or at home lately that grounded your perspective?`,
      followUpQuestion: `Your "${shortTitle}" memory carries "${latestCatMemory?.emotionTone || "Soulful Warmth"}". What did someone at home say or do that reminded you why you build?`,
      memoryContextBadge: `Adopted from Family Memory + {{${variableKey}}}`,
      quickSpokenStarter: `Sitting with family tonight echoed "${shortTitle}"—one simple conversation at the table grounded everything I'm building this week.`,
      variableKey,
      variableLiveValue,
      matchedGalleryPlaceOrFolder,
    };
  }

  if (category === "relationships") {
    return {
      memoryAwareQuestion: `Hey ${userName}, since your reflection on "${shortTitle}", which real conversation with a friend or partner pushed your thinking forward?`,
      followUpQuestion: `Building on "${shortTitle}", what did you understand about yourself after that conversation?`,
      memoryContextBadge: `Adopted from Bonds Memory + {{${variableKey}}}`,
      quickSpokenStarter: `Just like in "${shortTitle}", a late-night talk with a close friend today reminded me that real trust skips all the small talk.`,
      variableKey,
      variableLiveValue,
      matchedGalleryPlaceOrFolder,
    };
  }

  return {
    memoryAwareQuestion: `Hey ${userName}, your last spark in my memory was "${shortTitle}". What new truth or observation connected to that hit you today?`,
    followUpQuestion: `When "${shortTitle}" clicked for you, what makes this moment important to you now?`,
    memoryContextBadge: `Adopted from Spark Memory + {{${variableKey}}}`,
    quickSpokenStarter: `Expanding on "${shortTitle}", today it hit me that when your digital brain actually remembers your lived stories, everything you create feels unmistakably human.`,
    variableKey,
    variableLiveValue,
    matchedGalleryPlaceOrFolder,
  };
}

export function buildScriptBeatsForStory(
  title: string,
  story: string,
  category: LifeCategory,
  reelHookIdea?: string
): WhatsAppScriptBeat[] {
  const cleanSentences = story
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const s1 =
    reelHookIdea ||
    cleanSentences[0] ||
    `Why did nobody warn me about ${title.toLowerCase()}?`;
  const s2 =
    cleanSentences[1] ||
    `I thought I had it under control, until that exact moment forced me to look at the truth.`;
  const s3 =
    cleanSentences[2] ||
    `Instead of hiding it or running on autopilot, I leaned into what was actually real.`;

  const categoryLoopPayoff =
    category === "work"
      ? "And that is why you never build on borrowed motivation alone."
      : category === "relationships"
      ? "And that is the exact reason why 2 AM realizations hit hardest."
      : category === "family"
      ? "And that is why you call home before you open another tab."
      : category === "travel"
      ? "And that is why stepping away is the fastest way back to yourself."
      : "And that is the one truth you have to protect:";

  return [
    {
      id: 1,
      label: "HOOK",
      range: "0–3s",
      text: s1.endsWith(".") || s1.endsWith("?") ? s1 : `${s1}.`,
      visual: `A-Roll close-up with ZeroLensAI memory-tag overlay (MG: WhatsApp Voice Note • 11:42 PM). Safe-zone centered.`,
      motion: "whip-pan + memory tag pop",
      voice: "unfiltered, immediate — authentic A-Roll confession",
      coaching: "A-Roll: Direct eye contact, zero artificial hype — speak like confiding in a close friend.",
      durationSec: 3,
      memoryTag: "WhatsApp Voice Note • 11:42 PM",
      bRollWindow: "A-Roll Primary Eye Contact (0s - 3s)",
    },
    {
      id: 2,
      label: "TRANSFORM",
      range: "3–7s",
      text: s2.endsWith(".") ? s2 : `${s2}.`,
      visual: `Cleanest Gallery B-Roll Window [01.2s -> 04.5s] — steady visual proof in ${category.toUpperCase()} (shaky frames discarded).`,
      motion: "paper slide left + ink bleed",
      voice: "honest, confiding realization",
      coaching: "A-Roll: Natural breath pause on the shift — let the gallery slice carry visual proof.",
      durationSec: 4,
      memoryTag: "Personal Archive • Lived Evidence",
      bRollWindow: "[01.2s -> 04.5s] Cleanest stable slice",
    },
    {
      id: 3,
      label: "MAGIC",
      range: "7–11s",
      text: s3.endsWith(".") ? s3 : `${s3}.`,
      visual: "Tactile ZeroLensAI memory card + kinetic typography in 9:16 central safe zone.",
      motion: "snap zoom + highlight burst",
      voice: "clear, grounded conviction",
      coaching: "A-Roll: Grounded conviction, drop pitch slightly on key realization.",
      durationSec: 4,
      memoryTag: "Founder Log • Breakthrough",
      bRollWindow: "Gallery B-Roll Window [02.0s -> 05.5s]",
    },
    {
      id: 4,
      label: "PAYOFF",
      range: "11–15s",
      text: categoryLoopPayoff,
      visual: "A-Roll natural return + subtle taped CTA in 9:16 safe zone, looping seamlessly to frame 1.",
      motion: "dolly-in + subtle card tilt",
      voice: "warm, direct sign-off resolving to opening hook",
      coaching: "A-Roll: Warm nod, hold eye contact — the closing sentence flows seamlessly back into the opening frame.",
      durationSec: 4,
      memoryTag: "ZeroLensAI • Infinite Loop Payoff",
      bRollWindow: "A-Roll Loop Return (11s - 15s)",
      isLoopBack: true,
    },
  ];
}

export function inferSubSegment(
  story: string,
  category: LifeCategory,
  explicitSubSegment?: string
): string {
  if (explicitSubSegment) return explicitSubSegment;
  const lower = story.toLowerCase();
  if (/(breakup|ex\b|heartbreak|walked away|goodbye|healing|let go|broke up)/i.test(lower)) {
    return "Breakup & Healing";
  }
  if (/(2am|midnight|love|partner|trust|date|vulnerable|call)/i.test(lower) && category === "relationships") {
    return "2AM Bonds & Love";
  }
  if (/(client|pitch|revenue|investor|pricing|deal|b2b|sales)/i.test(lower)) {
    return "Business & Client Pitch";
  }
  if (/(startup|founder|product|ai\b|ship|code|launch|sprint)/i.test(lower)) {
    return "Founder & Startup Build";
  }
  if (/(mom|dad|parents|dinner|home|sister|brother|childhood)/i.test(lower)) {
    return "Family & Roots";
  }
  if (/(gokarna|kyoto|beach|mountain|flight|trip|solo travel)/i.test(lower)) {
    return "Travel & Horizons";
  }
  if (category === "work") return "Business & Strategy";
  if (category === "family") return "Family & Home";
  if (category === "relationships") return "Relationships & Bonds";
  if (category === "travel") return "Travel & Horizons";
  if (category === "personal") return "Personal Life & Habits";
  return "Core Spark & Insight";
}

export function analyzeUserStoryWithZee(
  rawText: string,
  preferredCategory?: LifeCategory,
  source: MemoryBankItem["source"] = "voice_mic",
  metaAnalysis?: {
    category?: LifeCategory;
    subSegment?: string;
    userPhone?: string;
    scriptBeats?: WhatsAppScriptBeat[];
    whatsappThread?: WhatsAppChatTurn[];
    title?: string;
    story?: string;
    zeeAnalysis?: string;
    followUpQuestion?: string;
    conversationId?: string;
    emotionTone?: string;
    tags?: string[];
    reelHookIdea?: string;
    voiceCadenceNote?: string;
    quoteAsset?: QuoteDigitalAsset;
    bookAsset?: BookDigitalAsset;
    businessAsset?: BusinessDigitalAsset;
    assistantAsset?: AssistantDigitalAsset;
    durationLabel?: string;
    finalizedScriptId?: string;
  },
  audioUrl?: string
): {
  memory: MemoryBankItem;
  extractedTrait?: string;
  voiceCadenceNote?: string;
} {
  const clean = (metaAnalysis?.story || rawText).trim();
  const lower = clean.toLowerCase();

  let category: LifeCategory =
    metaAnalysis?.category && CATEGORY_META[metaAnalysis.category]
      ? metaAnalysis.category
      : preferredCategory || "insight";

  if (!preferredCategory && !metaAnalysis?.category) {
    if (/(breakup|heartbreak|ex\b|partner|relationship|love|trust|people|conversation|bond|connection|2am|dating)/i.test(lower)) {
      category = "relationships";
    } else if (/(mom|dad|parent|family|home|brother|sister|dinner|childhood|roots)/i.test(lower)) {
      category = "family";
    } else if (/(work|business|office|code|project|client|startup|founder|revenue|pitch|team|build|ship|desk|meeting|career|workplace|studio)/i.test(lower)) {
      category = "work";
    } else if (/(trip|travel|flight|mountain|beach|city|kyoto|gokarna|hotel|vacation|road|explore|horizon)/i.test(lower)) {
      category = "travel";
    } else if (/(morning|coffee|chai|gym|habit|routine|book|read|sleep|peace|personal|weekend)/i.test(lower)) {
      category = "personal";
    } else {
      category = "insight";
    }
  }

  const meta = CATEGORY_META[category];
  const firstSentence = clean.split(/[.!?]/)[0]?.trim() || clean;
  const title =
    metaAnalysis?.title ||
    (firstSentence.length > 62
      ? `${firstSentence.slice(0, 59).trim()}...`
      : firstSentence);

  let emotionTone = metaAnalysis?.emotionTone || "Warm & Electric";
  if (!metaAnalysis?.emotionTone) {
    if (/(breakup|heartbreak|hurt|walked away|2am|vulnerable)/i.test(lower)) {
      emotionTone = "Raw & Vulnerable";
    } else if (/(excited|built|shipped|win|love|amazing|breakthrough|fast)/i.test(lower)) {
      emotionTone = "High-Voltage Craft";
    } else if (/(grateful|family|home|peace|quiet|calm|thankful)/i.test(lower)) {
      emotionTone = "Soulful & Grounded";
    } else if (/(hard|lesson|mistake|realized|truth|struggle|honest)/i.test(lower)) {
      emotionTone = "Raw & Unfiltered";
    }
  }

  const subSegment = inferSubSegment(clean, category, metaAnalysis?.subSegment);

  const stopWords = new Set([
    "the", "and", "for", "that", "this", "with", "from", "have", "was", "were",
    "are", "but", "not", "you", "your", "about", "today", "like", "just", "really",
  ]);
  const words = clean
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase()));
  const uniqueTags =
    Array.isArray(metaAnalysis?.tags) && metaAnalysis.tags.length > 0
      ? metaAnalysis.tags.slice(0, 4)
      : Array.from(
          new Set([
            subSegment.split(" ")[0],
            meta.shortLabel,
            ...words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
          ])
        ).slice(0, 4);

  const zeeAnalysis =
    metaAnalysis?.zeeAnalysis ||
    `I hear that ${firstSentence}. The part that stands out is how this connects to ${meta.label.toLowerCase()}; I will keep your details intact as we shape it into something you can share.`;

  const followUpQuestion = metaAnalysis?.followUpQuestion ||
    (category === "work"
      ? "What happened next, and what choice did you have to make in that moment?"
      : category === "family"
      ? "What small detail from that moment has stayed with you since?"
      : category === "relationships"
      ? "What did you understand about yourself after that conversation?"
      : category === "travel"
      ? "What did you notice there that you would not have noticed at home?"
      : category === "personal"
      ? "What changed for you after that, even in a small way?"
      : "What happened next, and why does this moment matter to you now?");

  const reelHookIdea =
    metaAnalysis?.reelHookIdea ||
    (category === "insight"
      ? `Here is the raw truth that hit me today: ${firstSentence}`
      : category === "work"
      ? `Inside the business today, one shift changed everything: ${firstSentence}`
      : category === "travel"
      ? `Stepping into a new horizon taught me this: ${firstSentence}`
      : category === "family"
      ? `One moment at home reminded me what actually matters: ${firstSentence}`
      : category === "relationships"
      ? `The most honest lesson about love & letting go I've lived lately: ${firstSentence}`
      : `A small personal rhythm that rewired my day: ${firstSentence}`);

  const generatedWaveform = Array.from({ length: 30 }, (_, idx) => {
    const seed = (clean.charCodeAt(idx % Math.max(1, clean.length)) || 42) + idx * 17;
    return 30 + (seed % 62);
  });

  const scriptBeats =
    Array.isArray(metaAnalysis?.scriptBeats) && metaAnalysis.scriptBeats.length > 0
      ? metaAnalysis.scriptBeats
      : buildScriptBeatsForStory(title, clean, category, reelHookIdea);

  const memoryId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const memory: MemoryBankItem = {
    id: memoryId,
    conversationId: metaAnalysis?.conversationId || memoryId,
    finalizedScriptId: metaAnalysis?.finalizedScriptId,
    category,
    title,
    story: clean,
    zeeAnalysis,
    followUpQuestion,
    date: new Date().toISOString().slice(0, 10),
    emotionTone,
    tags: uniqueTags,
    variableKey: meta.variableKey,
    reelHookIdea,
    source,
    audioUrl,
    metaPowered: Boolean(metaAnalysis),
    userPhone: metaAnalysis?.userPhone,
    subSegment,
    scriptBeats,
    whatsappThread: metaAnalysis?.whatsappThread,
    durationLabel: metaAnalysis?.durationLabel || "1:48",
    waveform: generatedWaveform,
  };

  return {
    memory,
    extractedTrait: `Lives & builds through ${subSegment.toLowerCase()} (${emotionTone})`,
    voiceCadenceNote: metaAnalysis?.voiceCadenceNote,
  };
}

export function loadZeeBrain(): ZeeBrainState {
  if (typeof window === "undefined") return INITIAL_ZEE_BRAIN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ZEE_BRAIN;
    const parsed = JSON.parse(raw) as Partial<ZeeBrainState>;
    const isSampleMemoryId = (id: string) => /^mem-(insight|work|travel|personal|family|rel)-1$/.test(id);
    const isSampleGalleryId = (id: string) => /^gal-(gokarna|portrait|family|rel|work|travel|ai-img|ai-vid)-\d+$/.test(id);
    const hasSampleRecords = Boolean(
      parsed.memories?.some((memory) => isSampleMemoryId(memory.id)) ||
      parsed.gallery?.some((item) => isSampleGalleryId(item.id))
    );
    const savedVirtualYou = { ...INITIAL_ZEE_BRAIN.virtualYou, ...(parsed.virtualYou || {}) };
    if (hasSampleRecords && savedVirtualYou.userName === "Prem" && savedVirtualYou.personaTitle === "Creative Architect & Story Alchemist") {
      Object.assign(savedVirtualYou, INITIAL_ZEE_BRAIN.virtualYou);
    }
    const merged: ZeeBrainState = {
      ...INITIAL_ZEE_BRAIN,
      ...parsed,
      virtualYou: savedVirtualYou,
      brandProfile: {
        ...INITIAL_ZEE_BRAIN.brandProfile,
        ...(parsed.brandProfile || {}),
      },
      memories: Array.isArray(parsed.memories)
        ? parsed.memories.filter((memory) => !isSampleMemoryId(memory.id))
        : INITIAL_ZEE_BRAIN.memories,
      gallery: Array.isArray(parsed.gallery)
        ? parsed.gallery.filter((item) => !isSampleGalleryId(item.id))
        : INITIAL_ZEE_BRAIN.gallery,
      sources:
        !hasSampleRecords && Array.isArray(parsed.sources) && parsed.sources.length > 0
          ? parsed.sources
          : INITIAL_ZEE_BRAIN.sources,
      likedReels:
        !hasSampleRecords && Array.isArray(parsed.likedReels) && parsed.likedReels.length > 0
          ? parsed.likedReels
          : INITIAL_ZEE_BRAIN.likedReels,
      activityLogs:
        Array.isArray(parsed.activityLogs) && parsed.activityLogs.length > 0
          ? parsed.activityLogs.filter((log) => !(hasSampleRecords && log.id === "act-1"))
          : INITIAL_ZEE_BRAIN.activityLogs,
      variables: {
        ...INITIAL_ZEE_BRAIN.variables,
        ...(!hasSampleRecords ? parsed.variables || {} : {}),
      },
    };
    merged.variables = computeMatchedVariables(merged);
    return merged;
  } catch {
    return INITIAL_ZEE_BRAIN;
  }
}

export function saveZeeBrain(nextState: ZeeBrainState): ZeeBrainState {
  const withVars: ZeeBrainState = {
    ...nextState,
    variables: computeMatchedVariables(nextState),
    lastUpdated: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withVars));
      window.dispatchEvent(new CustomEvent(BRAIN_EVENT, { detail: withVars }));
    } catch {
      // Ignore storage quota issues
    }
  }
  return withVars;
}
