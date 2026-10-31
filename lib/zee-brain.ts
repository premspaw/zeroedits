"use client";

import { useState, useEffect, useCallback } from "react";
import type { HeaderTab } from "@/components/AppleDockNav";

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

export interface MemoryBankItem {
  id: string;
  category: LifeCategory;
  title: string;
  story: string;
  zeeAnalysis: string;
  date: string;
  emotionTone: string;
  tags: string[];
  variableKey: string;
  reelHookIdea: string;
  source: "voice_mic" | "text_mic" | "text_chat" | "account_sync" | "gallery_vision";
  audioUrl?: string;
  metaPowered?: boolean;
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
const BRAIN_EVENT = "zee-overall-brain-sync";

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
    promptQuestion:
      "Hey Prem — I am your Digital Brain. What spark, realization, or raw truth hit you today?",
  },
  personal: {
    label: "Personal Rhythm",
    shortLabel: "Personal",
    supplyName: "Personal Rituals Supply",
    variableKey: "user.personalLife",
    color: "#059669",
    bg: "#D1FAE5",
    border: "#059669",
    promptQuestion:
      "Hey Prem, what quiet ritual, habit, or personal moment shaped your energy today?",
  },
  work: {
    label: "Workplace & Craft",
    shortLabel: "Workplace",
    supplyName: "Workplace & Builder Supply",
    variableKey: "user.workplaceStory",
    color: "#2563EB",
    bg: "#DBEAFE",
    border: "#2563EB",
    promptQuestion:
      "Prem, what happened inside your workplace or studio build today that deserves a story?",
  },
  travel: {
    label: "Horizons & Travel",
    shortLabel: "Travel",
    supplyName: "Horizons & Travel Supply",
    variableKey: "user.travelMemory",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#D97706",
    promptQuestion:
      "Which road, skyline, or travel memory is still echoing in your head, Prem?",
  },
  family: {
    label: "Roots & Family",
    shortLabel: "Family",
    supplyName: "Roots & Family Supply",
    variableKey: "user.familyMoment",
    color: "#7C3AED",
    bg: "#EDE9FE",
    border: "#7C3AED",
    promptQuestion:
      "Tell me a warm moment from home or family that keeps you anchored, Prem.",
  },
  relationships: {
    label: "Bonds & People",
    shortLabel: "Bonds",
    supplyName: "Human Bonds Supply",
    variableKey: "user.relationshipView",
    color: "#DB2777",
    bg: "#FCE7F3",
    border: "#DB2777",
    promptQuestion:
      "What did a real conversation, friendship, or bond teach you recently, Prem?",
  },
};

export const INITIAL_ZEE_BRAIN: ZeeBrainState = {
  virtualYou: {
    userName: "Prem",
    personaTitle: "Creative Architect & Story Alchemist",
    warmthLevel: 97,
    twinSyncScore: 95,
    voiceCadence: "Warm, magnetic, unscripted honesty → sharp philosophical punch (148 WPM)",
    thinkingStyle: "Connects workplace craft, human warmth, and visual poetry into effortless stories",
    readingPattern: "Deep thinker — absorbs visual essays, architecture notes & high-signal builder logs",
    preferredFormat: "storyExplainer",
    signatureHookStyle: "Lived human moment → Unexpected creative truth in 2.5 seconds",
    visualTaste: "Tactile Paper Studio (#FAF8F3), expressive typography, authentic workplace & travel cutaways",
    coreValues: [
      "Soulful originality over autopilot templates",
      "Deep workplace mastery & creative flow",
      "Unshakable gratitude for family & roots",
      "Collecting horizons through travel & lens",
    ],
    signaturePhrases: [
      "Here is the part nobody sees...",
      "Look at it through this lens:",
      "That single moment rewired how I build...",
    ],
  },
  memories: [
    {
      id: "mem-insight-1",
      category: "insight",
      title: "Originality has a pulse — autopilot never does",
      story:
        "Today I realized that audiences don't fall in love with polished perfection; they feel the pulse of someone speaking from lived truth. Even when a thought starts rough, the honesty inside it is what people remember.",
      zeeAnalysis:
        "I wove this into your Digital Brain's core instinct: every digital asset now distills Prem's raw, unscripted conviction.",
      date: "2026-10-31",
      emotionTone: "Electric & Grounded",
      tags: ["Originality", "Digital Brain", "Prem's Lens"],
      variableKey: "user.todayInsight",
      reelHookIdea:
        "People can spot autopilot from a mile away — here is how to build with a real pulse.",
      source: "voice_mic",
      metaPowered: true,
      durationLabel: "2:00",
      waveform: [32, 68, 84, 42, 91, 56, 73, 38, 89, 64, 47, 94, 61, 35, 82, 77, 49, 88, 53, 71, 39, 85, 62, 44, 79, 58, 90, 46, 67, 52],
      quoteAsset: {
        quote: "Perfection is easy to manufacture. What the world is starving for is the pulse of someone who actually lived the sentence they are speaking.",
        subtext: "Distilled from Prem's spoken reflection on originality vs. autopilot",
        styleTag: "Philosophy & Craft",
      },
      bookAsset: {
        title: "The Pulse Beneath the Polish",
        subtitle: "Notes on Building & Speaking Without Autopilot",
        wordCount: 165,
        chapters: [
          "There is a quiet moment right before you speak or build where you have to choose between sounding safe and sounding alive. Most of the modern world chooses the template because templates never risk being misunderstood. Yet the very friction we try to sand away is the only proof that a human being was in the room.",
          "When I stopped trying to polish every rough edge out of my ideas, something unexpected shifted. Conversations got deeper. The work started carrying a distinct signature—like ink pressed into warm cotton paper rather than pixels flickering on a cold feed.",
          "Originality is not about inventing something nobody has ever seen; it is about refusing to mute the lived truth of how you saw it. Keep the pulse in the work, and the right people will feel it before you even finish the first sentence.",
        ],
      },
      businessAsset: {
        headline: "Voice-to-Asset Personal Studio for Founders & Thinkers",
        marketAngle: "Turn 2 minutes of casual friend-talk into signature essays, quotes, and product blueprints.",
        ideas: [
          {
            name: "Unscripted Founder Monograph",
            pitch: "A weekly tactile digital/print dispatch built entirely from 2-minute voice walks—zero ghostwriter slop.",
            firstStep: "Publish 5 daily voice-distilled Quote Cards from your stream to test audience saves.",
          },
          {
            name: "Personal Taste API & Chief-of-Staff",
            pitch: "An assistant that learns a creator's reading notes, quotes, and visual taste to co-architect products and books.",
            firstStep: "Feed 10 favorite quotes and 3 studio references into your Personal Taste drawer.",
          },
          {
            name: "Tactile Paper Edition Deck",
            pitch: "Collect your top 30 spoken quotes of the quarter into a physical #FAF8F3 desk deck for builders.",
            firstStep: "Tag your highest-signal spoken insights under 'Spark' and 'Workplace'.",
          },
        ],
      },
      assistantAsset: {
        friendReply: "Prem, talking to you on this one felt electric. You didn't just share a random thought—you named your entire creative moat. I turned your raw words into a signature Quote Card, a 3-chapter essay, and 3 venture angles.",
        nextMoves: [
          "Pin the Quote Card 'Perfection is easy to manufacture...' as your week's anchor.",
          "Expand Chapter 2 of 'The Pulse Beneath the Polish' with one example from today's studio build.",
          "When you're ready to shoot a reel from this, hop over to the Scripting tab where I've queued the hook.",
        ],
        tasteConnection: "Matches your warm editorial paper taste (#FAF8F3) and high-signal philosophical cadence (148 WPM).",
      },
    },
    {
      id: "mem-work-1",
      category: "work",
      title: "Midnight Studio Blueprint & Workplace Flow",
      story:
        "In the workplace today, we stripped away clunky menus and turned the entire creative workflow into a single living brain that remembers everything you care about.",
      zeeAnalysis:
        "Your Digital Brain indexed your workplace builder ethos — pairing high-focus studio architecture with zero-friction tools.",
      date: "2026-10-30",
      emotionTone: "Laser-Focused Craft",
      tags: ["Workplace", "Studio Craft", "Builder Flow"],
      variableKey: "user.workplaceStory",
      reelHookIdea:
        "What 4 hours of deep workplace flow taught me about designing things that feel alive.",
      source: "voice_mic",
      metaPowered: true,
      durationLabel: "1:52",
      waveform: [45, 78, 62, 88, 51, 93, 40, 74, 66, 85, 49, 71, 58, 90, 43, 76, 61, 84, 37, 69, 79, 54, 87, 48, 65, 92, 41, 73, 59, 68],
      quoteAsset: {
        quote: "Simplicity is not the absence of depth—it is what happens when a tool finally remembers who you are.",
        subtext: "Distilled from Prem's studio workplace session",
        styleTag: "Builder Ethos",
      },
      bookAsset: {
        title: "Architecture of the Quiet Studio",
        subtitle: "Why Great Tools Feel Like a Trusted Friend",
        wordCount: 154,
        chapters: [
          "Walk into any great craftsperson's studio at midnight and you will notice how little stands between their hand and the material. In software, we spent a decade building dashboards instead of companions—forcing creators to manage menus when they just wanted to think out loud.",
          "Today in the workplace, we tore down the walls between memory, taste, and creation. Instead of starting from a blank cursor every morning, the studio remembers your rhythm, your favorite sentences, and the exact projects you are shaping.",
          "When your tools think alongside you like a close friend, work stops feeling like administration and returns to what it was always meant to be: pure creative alchemy.",
        ],
      },
      businessAsset: {
        headline: "Context-First Creative OS & Workplace Companion",
        marketAngle: "Replace fragmented note apps and prompt boxes with a persistent personal assistant that compounds taste over time.",
        ideas: [
          {
            name: "Living Studio Blueprint Kit",
            pitch: "A modular personal brain template for solo founders and design engineers to turn daily voice logs into specs.",
            firstStep: "Document the 3 core variables that connect your voice stream to daily execution.",
          },
          {
            name: "Zero-Menu Voice Workspace",
            pitch: "A voice-first product workflow where speaking for 90 seconds updates your product roadmap, docs, and investor memo.",
            firstStep: "Use Zee's voice dial after every sprint review to auto-capture architecture insights.",
          },
        ],
      },
      assistantAsset: {
        friendReply: "Prem, I love how your workplace instinct always comes back to removing friction. I distilled that midnight session into a clean Builder Quote and a 3-part chapter on studio architecture.",
        nextMoves: [
          "Save the 'Simplicity is not the absence of depth' quote for your product launch deck.",
          "Pair this workplace insight with your Studio Desk photo from the Creative Gallery Wallet.",
        ],
        tasteConnection: "Aligned with your Builder Logs reading pattern and tactile studio aesthetic.",
      },
    },
    {
      id: "mem-travel-1",
      category: "travel",
      title: "6 AM Mountain Mist & Coastal Horizons in Gokarna & Kyoto",
      story:
        "Walking quiet lanes and coastal cliffs at dawn with a camera and espresso — stepping into new horizons always unlocks the sharpest ideas I couldn't see from my desk.",
      zeeAnalysis:
        "Stored in your Horizons vault. Connects travel clarity to your personal philosophy and book chapters.",
      date: "2026-10-24",
      emotionTone: "Cinematic Wonder",
      tags: ["Horizons", "Gokarna & Kyoto", "Visual Reset"],
      variableKey: "user.travelMemory",
      reelHookIdea:
        "I left my workspace for 72 hours — and found the exact clarity I was chasing for months.",
      source: "gallery_vision",
      metaPowered: true,
      durationLabel: "1:45",
      waveform: [28, 54, 72, 61, 83, 47, 69, 39, 77, 88, 52, 64, 41, 79, 58, 86, 45, 71, 63, 36, 74, 82, 49, 67, 53, 81, 44, 62, 57, 48],
      quoteAsset: {
        quote: "You rarely solve a stalled problem by staring harder at the same desk. Change the horizon, and the answer walks up to you at dawn.",
        subtext: "Distilled from Prem's dawn travel notes",
        styleTag: "Horizons & Perspective",
      },
      bookAsset: {
        title: "6 AM on an Unfamiliar Road",
        subtitle: "On Distance, Espresso, and Creative Clarity",
        wordCount: 148,
        chapters: [
          "At 6 AM in an unfamiliar town, before the shutters lift and the streets fill with noise, your mind operates on a completely different frequency. With a warm espresso in one hand and a camera in the other, the problems that felt heavy back home suddenly shrink to their true proportions.",
          "Whether standing on the golden cliffs of Gokarna or walking quiet lantern alleys in Kyoto, movement across physical space creates room inside mental space. We are not built to think inside four static walls forever.",
          "Every trip is really an edit on your own life—showing you what is essential, what was just noise, and which idea deserves your full fire when you return.",
        ],
      },
      businessAsset: {
        headline: "Horizon Retreats & Field-Note Essay Series",
        marketAngle: "Blend travel photography, location metadata, and founder philosophy into high-value creative assets.",
        ideas: [
          {
            name: "Field Notes from the Coast (Photo-Essay Book)",
            pitch: "Pair your GPS-tagged Gokarna & Kyoto frames from the Gallery Wallet with 2-minute spoken dawn essays.",
            firstStep: "Link your Travel • Gokarna folder directly to Chapter 2 of this mini-book.",
          },
          {
            name: "72-Hour Builder Reset Sprint",
            pitch: "A curated off-grid micro-retreat format for creative engineers to ship one breakthrough idea by the sea.",
            firstStep: "Outline the 3 morning prompts you ask yourself when traveling.",
          },
        ],
      },
      assistantAsset: {
        friendReply: "Whenever you talk about travel, Prem, your metaphors get super visual. I linked this directly with your Gokarna & Kyoto folders in the Gallery Wallet and turned your dawn walk into a quote + travel chapter.",
        nextMoves: [
          "Export the '6 AM on an Unfamiliar Road' chapter to your personal book manuscript.",
          "Check your Travel • Gokarna folder in the Gallery Wallet for matching golden-hour frames.",
        ],
        tasteConnection: "Connects with your Cinematic Horizon Storyteller reference and X100V/iPhone GPS photography.",
      },
    },
    {
      id: "mem-personal-1",
      category: "personal",
      title: "First 45 Minutes: Analog Ink Before Digital Noise",
      story:
        "Every morning starts with pour-over coffee and three raw lines in a physical notebook before touching a single notification.",
      zeeAnalysis:
        "Defines Prem's signature calm-to-punchy pacing and anchors the warm paper texture across your studio.",
      date: "2026-10-28",
      emotionTone: "Intentional & Calm",
      tags: ["Morning Ritual", "Analog Ink", "Clarity"],
      variableKey: "user.personalLife",
      reelHookIdea:
        "The 45-minute analog ritual that protects my creative brain every morning.",
      source: "voice_mic",
      durationLabel: "1:34",
      waveform: [34, 52, 68, 45, 76, 59, 41, 82, 63, 48, 71, 55, 38, 79, 64, 51, 73, 46, 62, 84, 49, 67, 53, 75, 42, 69, 58, 44, 61, 50],
    },
    {
      id: "mem-family-1",
      category: "family",
      title: "Evening Laughter Around the Family Table",
      story:
        "No matter how ambitious the workplace vision gets, sitting with family at the end of the day reminds me why we build in the first place.",
      zeeAnalysis:
        "Your emotional north star. Infuses genuine warmth into every story conclusion.",
      date: "2026-10-25",
      emotionTone: "Soulful Warmth",
      tags: ["Roots", "Family Table", "Gratitude"],
      variableKey: "user.familyMoment",
      reelHookIdea:
        "One quiet truth from my family table that no business book could ever teach.",
      source: "voice_mic",
      durationLabel: "1:48",
      waveform: [42, 65, 79, 53, 86, 61, 47, 74, 68, 55, 81, 49, 63, 77, 52, 84, 59, 71, 46, 78, 64, 51, 83, 57, 69, 48, 75, 62, 54, 66],
    },
    {
      id: "mem-rel-1",
      category: "relationships",
      title: "High-Trust Circles & Unfiltered Late-Night Talks",
      story:
        "The best bonds in life don't need small talk — you sit down, pick up the thread, and push each other to grow.",
      zeeAnalysis:
        "Shapes your voice: you never lecture, you talk like a trusted friend.",
      date: "2026-10-22",
      emotionTone: "Magnetic & Real",
      tags: ["Human Bonds", "Trust", "Real Talk"],
      variableKey: "user.relationshipView",
      reelHookIdea:
        "How your inner circle quietly shapes the ceiling of everything you create.",
      source: "text_chat",
      durationLabel: "1:28",
      waveform: [38, 61, 74, 49, 85, 57, 66, 43, 79, 62, 51, 88, 54, 72, 46, 81, 65, 58, 76, 44, 69, 83, 52, 71, 60, 47, 78, 63, 55, 67],
    },
  ],
  gallery: [
    {
      id: "gal-gokarna-1",
      title: "Om Beach Golden Cliff & Arabian Sea Sunset",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
      category: "travel",
      date: "2026-10-28",
      displayDate: "Oct 28",
      location: "Gokarna",
      source: "apple_photos",
      mediaType: "photo",
      aiTags: ["Gokarna", "GPS 14.5°N", "Golden Hour"],
      aspectSummary: "iPhone 15 Pro • GPS",
      matchedVariable: "user.travelMemory",
      reelReady: true,
      supplyDeck: "Horizons & Travel Supply",
      creativeInsight: "Captured in Gokarna via mobile GPS metadata.",
      tiltDeg: -1.1,
      folderId: "folder-travel-gokarna",
      folderTitle: "Travel • Gokarna",
      folderSubtitle: "GPS 14.5°N, 74.3°E • Coastal Trail",
      folderType: "travel_place",
      isAiGenerated: false,
      cameraOrAiBadge: "iPhone 15 Pro • GPS",
    },
    {
      id: "gal-gokarna-2",
      title: "Kudle Headland Morning Trek & Palm Horizon",
      url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80",
      category: "travel",
      date: "2026-10-27",
      displayDate: "Oct 27",
      location: "Gokarna",
      source: "apple_photos",
      mediaType: "photo",
      aiTags: ["Gokarna", "Kudle Cliff", "Coastal"],
      aspectSummary: "iPhone 15 Pro • GPS",
      matchedVariable: "user.travelMemory",
      reelReady: true,
      supplyDeck: "Horizons & Travel Supply",
      creativeInsight: "Coastal morning frame in Gokarna.",
      tiltDeg: 1.2,
      folderId: "folder-travel-gokarna",
      folderTitle: "Travel • Gokarna",
      folderSubtitle: "GPS 14.5°N, 74.3°E • Coastal Trail",
      folderType: "travel_place",
      isAiGenerated: false,
      cameraOrAiBadge: "iPhone 15 Pro • GPS",
    },
    {
      id: "gal-portrait-1",
      title: "Warm Window Light Studio Portrait",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
      category: "personal",
      date: "2026-10-29",
      displayDate: "Oct 29",
      location: "Portrait • 50mm",
      source: "apple_photos",
      mediaType: "photo",
      aiTags: ["Portrait", "Camera Roll", "85mm"],
      aspectSummary: "Portrait Mode • f/1.8",
      matchedVariable: "user.personalLife",
      reelReady: true,
      supplyDeck: "Personal Rituals Supply",
      creativeInsight: "Vertical camera portrait with natural depth of field.",
      tiltDeg: -0.9,
      folderId: "folder-portraits",
      folderTitle: "Portraits & Camera",
      folderSubtitle: "Mobile Camera & Vertical Portraits",
      folderType: "portraits",
      isAiGenerated: false,
      cameraOrAiBadge: "Camera Portrait",
    },
    {
      id: "gal-portrait-2",
      title: "Analog Coffee & Notebook Morning Frame",
      url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80",
      category: "personal",
      date: "2026-10-26",
      displayDate: "Oct 26",
      location: "Reading Corner",
      source: "apple_photos",
      mediaType: "photo",
      aiTags: ["Morning", "Camera Roll"],
      aspectSummary: "iPhone Camera • 24mm",
      matchedVariable: "user.personalLife",
      reelReady: true,
      supplyDeck: "Personal Rituals Supply",
      creativeInsight: "Personal morning ritual shot.",
      tiltDeg: 1.1,
      folderId: "folder-portraits",
      folderTitle: "Portraits & Camera",
      folderSubtitle: "Mobile Camera & Vertical Portraits",
      folderType: "portraits",
      isAiGenerated: false,
      cameraOrAiBadge: "iPhone Camera",
    },
    {
      id: "gal-family-1",
      title: "Warm Courtyard Lights & Sunday Family Table",
      url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80",
      category: "family",
      date: "2026-10-25",
      displayDate: "Oct 25",
      location: "Family Home",
      source: "apple_photos",
      mediaType: "photo",
      aiTags: ["Family", "Home", "Warmth"],
      aspectSummary: "iPhone Camera • HEIC",
      matchedVariable: "user.familyMoment",
      reelReady: true,
      supplyDeck: "Roots & Family Supply",
      creativeInsight: "Family gathering captured at home.",
      tiltDeg: 0.9,
      folderId: "folder-family",
      folderTitle: "Family & Bonds",
      folderSubtitle: "Home, Gatherings & Inner Circle",
      folderType: "family",
      isAiGenerated: false,
      cameraOrAiBadge: "Family Album",
    },
    {
      id: "gal-rel-1",
      title: "Late-Night Espresso Walk & Inner Circle",
      url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
      category: "relationships",
      date: "2026-10-22",
      displayDate: "Oct 22",
      location: "Indiranagar Cafe",
      source: "instagram",
      mediaType: "photo",
      aiTags: ["Friends", "Candid"],
      aspectSummary: "Mobile Camera • Live",
      matchedVariable: "user.relationshipView",
      reelReady: true,
      supplyDeck: "Human Bonds Supply",
      creativeInsight: "Candid moment with close circle.",
      tiltDeg: -1.1,
      folderId: "folder-family",
      folderTitle: "Family & Bonds",
      folderSubtitle: "Home, Gatherings & Inner Circle",
      folderType: "family",
      isAiGenerated: false,
      cameraOrAiBadge: "Candid Camera",
    },
    {
      id: "gal-work-1",
      title: "Dual-Canvas Studio Desk & Build Setup",
      url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
      category: "work",
      date: "2026-10-30",
      displayDate: "Oct 30",
      location: "Studio Office",
      source: "google_drive",
      mediaType: "photo",
      aiTags: ["Office", "Desk Setup"],
      aspectSummary: "Sony A7IV • 35mm",
      matchedVariable: "user.workplaceStory",
      reelReady: true,
      supplyDeck: "Workplace & Builder Supply",
      creativeInsight: "Studio workplace setup.",
      tiltDeg: -1.2,
      folderId: "folder-workplace",
      folderTitle: "Office & Workplace",
      folderSubtitle: "Studio Desk, Screens & Whiteboards",
      folderType: "workplace",
      isAiGenerated: false,
      cameraOrAiBadge: "Office Camera",
    },
    {
      id: "gal-work-2",
      title: "Architecture Whiteboard & Sprint Session",
      url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=900&q=80",
      category: "work",
      date: "2026-10-27",
      displayDate: "Oct 27",
      location: "Strategy Room",
      source: "google_drive",
      mediaType: "photo",
      aiTags: ["Whiteboard", "Office"],
      aspectSummary: "iPhone 15 Pro • Wide",
      matchedVariable: "user.workplaceStory",
      reelReady: true,
      supplyDeck: "Workplace & Builder Supply",
      creativeInsight: "Whiteboard strategy session.",
      tiltDeg: -0.8,
      folderId: "folder-workplace",
      folderTitle: "Office & Workplace",
      folderSubtitle: "Studio Desk, Screens & Whiteboards",
      folderType: "workplace",
      isAiGenerated: false,
      cameraOrAiBadge: "Office Camera",
    },
    {
      id: "gal-travel-1",
      title: "Kyoto Lantern Alley at Blue Hour",
      url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80",
      category: "travel",
      date: "2026-10-24",
      displayDate: "Oct 24",
      location: "Kyoto",
      source: "apple_photos",
      mediaType: "photo",
      aiTags: ["Kyoto", "GPS 35.0°N"],
      aspectSummary: "Fujifilm X100V • GPS",
      matchedVariable: "user.travelMemory",
      reelReady: true,
      supplyDeck: "Horizons & Travel Supply",
      creativeInsight: "Kyoto blue hour alley.",
      tiltDeg: 1.4,
      folderId: "folder-travel-kyoto",
      folderTitle: "Travel • Kyoto",
      folderSubtitle: "GPS 35.0°N, 135.7°E • Japan",
      folderType: "travel_place",
      isAiGenerated: false,
      cameraOrAiBadge: "X100V • GPS",
    },
    {
      id: "gal-ai-img-1",
      title: "Surreal Paper-Cut Architecture Concept Render",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80",
      category: "work",
      date: "2026-10-30",
      displayDate: "Oct 30",
      location: "AI Synth • 1024×1024",
      source: "local",
      mediaType: "photo",
      aiTags: ["AI Generated", "Muse Image", "No EXIF"],
      aspectSummary: "AI Image • 1024×1024",
      matchedVariable: "user.visualTaste",
      reelReady: true,
      supplyDeck: "AI-Created Images",
      creativeInsight: "Separated automatically via non-camera PNG/AI metadata.",
      tiltDeg: 1.1,
      folderId: "folder-ai-images",
      folderTitle: "AI-Created Images",
      folderSubtitle: "Separated Synthetic & AI Art",
      folderType: "ai_images",
      isAiGenerated: true,
      cameraOrAiBadge: "AI Image",
    },
    {
      id: "gal-ai-img-2",
      title: "Minimalist Warm Editorial Texture Synth",
      url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=900&q=80",
      category: "work",
      date: "2026-10-29",
      displayDate: "Oct 29",
      location: "AI Synth • 1024×1024",
      source: "local",
      mediaType: "photo",
      aiTags: ["AI Generated", "Concept Art"],
      aspectSummary: "AI Image • 1024×1024",
      matchedVariable: "user.visualTaste",
      reelReady: true,
      supplyDeck: "AI-Created Images",
      creativeInsight: "Separated into AI-Created Images folder.",
      tiltDeg: -1.2,
      folderId: "folder-ai-images",
      folderTitle: "AI-Created Images",
      folderSubtitle: "Separated Synthetic & AI Art",
      folderType: "ai_images",
      isAiGenerated: true,
      cameraOrAiBadge: "AI Image",
    },
    {
      id: "gal-ai-vid-1",
      title: "Generative Kinetic Clouds & Light Loop",
      url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
      category: "work",
      date: "2026-10-28",
      displayDate: "Oct 28",
      location: "AI Motion • MP4",
      source: "local",
      mediaType: "video",
      aiTags: ["AI Video", "Synthetic Motion"],
      aspectSummary: "AI Video • 1080×1920",
      matchedVariable: "user.visualTaste",
      reelReady: true,
      supplyDeck: "AI Videos & Motion",
      creativeInsight: "Separated into AI Videos & Motion folder.",
      tiltDeg: 0.8,
      folderId: "folder-ai-videos",
      folderTitle: "AI Videos & Motion",
      folderSubtitle: "Separated Synthetic Video Clips",
      folderType: "ai_videos",
      isAiGenerated: true,
      cameraOrAiBadge: "AI Video",
    },
  ],
  sources: [
    {
      id: "apple_photos",
      name: "Apple Photos (iCloud Vault)",
      type: "gallery",
      connected: true,
      handleOrPath: "Prem's iCloud • Smart Horizon & Family Albums",
      syncedCount: 164,
      lastSynced: "Live Neural Link",
      statusText: "Curated by Scene, Workplace & Date",
    },
    {
      id: "google_drive",
      name: "Google Drive Workplace Vault",
      type: "gallery",
      connected: true,
      handleOrPath: "Drive • /Prem_Studio_Workplace & /Raw_Takes",
      syncedCount: 92,
      lastSynced: "Synced 1m ago",
      statusText: "Workplace setups & whiteboards analyzed",
    },
    {
      id: "local_computer",
      name: "Laptop Creative Dropzone",
      type: "gallery",
      connected: true,
      handleOrPath: "Local Machine • Instant Supply Separator",
      syncedCount: 38,
      lastSynced: "Active Watch",
      statusText: "Separates Workplace, Travel & Personal in 1 click",
    },
    {
      id: "instagram",
      name: "Instagram (@prem.studio)",
      type: "social",
      connected: true,
      handleOrPath: "@prem.studio",
      syncedCount: 74,
      lastSynced: "Synced today",
      statusText: "Visual taste, saved reels & cadence mapped",
    },
    {
      id: "youtube",
      name: "YouTube Shorts & Creator Lab",
      type: "social",
      connected: true,
      handleOrPath: "Prem Studio Lab",
      syncedCount: 48,
      lastSynced: "Synced today",
      statusText: "Retention pacing & cutaway timing absorbed",
    },
    {
      id: "reading_feed",
      name: "Prem's Reading & Essay Stream",
      type: "reading",
      connected: true,
      handleOrPath: "Substack, Architecture, AI & Philosophy Notes",
      syncedCount: 128,
      lastSynced: "Active",
      statusText: "Metaphors, mental models & reading rhythm synced",
    },
  ],
  likedReels: [
    {
      id: "reel-dna-1",
      inputUrlOrNote:
        "https://instagram.com/reel/Cx9PaperExplainer • Crisp speaker + full-screen tactile paper cutaways",
      creatorStyle: "Warm Editorial Explainer (Prem's Signature Cut)",
      detectedFormat: "storyExplainer",
      hookPattern: "0.0s–2.2s Lived workplace observation + full-screen visual proof at 2.3s",
      pacingBpm: "148 WPM • Clean jump-cut every 3.2s with 1.12x eye-line punch",
      captionStyle: "Montserrat 900 Pop Capsule + Warm Paper Card (#FAF8F3)",
      readingPatternMatch: "Mirrors Prem's taste for high-signal, zero-fluff visual essays",
      scannedAt: "Today",
    },
    {
      id: "reel-dna-2",
      inputUrlOrNote:
        "https://instagram.com/reel/CyHorizonStory • Golden hour travel B-roll + philosophical voiceover",
      creatorStyle: "Cinematic Horizon Storyteller",
      detectedFormat: "paperCard",
      hookPattern: "Atmospheric travel frame + quiet contrarian question in first 2.5s",
      pacingBpm: "134 WPM • Breathing room between insights",
      captionStyle: "Instrument Serif Headline + Minimalist Subtitle",
      readingPatternMatch: "Matches Prem's reflective notebook reading pattern",
      scannedAt: "Yesterday",
    },
  ],
  variables: {
    "user.name": "Prem",
    "user.persona": "Creative Architect & Story Alchemist",
    "user.voiceTone": "Warm, magnetic, unscripted honesty → sharp philosophical punch (148 WPM)",
    "user.readingPattern": "Deep thinker — absorbs visual essays, architecture notes & builder logs",
    "user.preferredFormat": "storyExplainer",
    "user.hookPattern": "Lived human moment → Unexpected creative truth in 2.5 seconds",
    "user.visualTaste": "Tactile Paper Studio (#FAF8F3), expressive typography, workplace & travel cutaways",
    "user.todayInsight": "Originality has a pulse — audiences feel the warmth of someone speaking from lived truth.",
    "user.personalLife": "Every morning starts with pour-over coffee and three raw lines in a physical notebook.",
    "user.workplaceStory": "In the workplace today, we turned the entire creative workflow into a single living digital brain.",
    "user.travelMemory": "Walking quiet cobblestone lanes in Kyoto at dawn with a camera and espresso.",
    "user.familyMoment": "Sitting with family at the end of the day reminds me why we build in the first place.",
    "user.relationshipView": "The best bonds in life don't need small talk — you pick up the thread and push each other to grow.",
    "user.topGalleryAsset": "Prem's Dual-Canvas Workplace Desk + Kyoto Lantern Alley",
    "user.likedReelReference": "Warm Editorial Explainer (storyExplainer) with 2.3s visual cutaways",
    "app.activeStage": "You (Prem's Digital Brain)",
    "app.lastTopic": "Originality vs Autopilot in Creative Work",
  },
  activityLogs: [
    {
      id: "act-1",
      page: "u",
      pageLabel: "You • Prem's Digital Brain",
      action: "Digital Brain online (95% neural sync with Prem) • Meta Muse Voice API ready",
      timestamp: "Just now",
    },
  ],
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
 * directly around Prem's actual saved memories & gallery folders (zero static default questions).
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
  const userName = brain.virtualYou.userName || "Prem";
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
      followUpQuestion: `When you were in ${placeName} capturing "${photoTitle}" during "${shortTitle}", what was the exact realization that hit you that you couldn't see from your desk?`,
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
      followUpQuestion: `In "${shortTitle}", you connected ${latestCatMemory?.tags.slice(0, 2).join(" & ") || "craft & clarity"}. How can we turn that exact studio breakthrough into your next signature business asset or story?`,
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
      followUpQuestion: `Looking at "${shortTitle}" (${latestCatMemory?.emotionTone || "Intentional & Calm"}), what small personal detail from today should I weave into your ongoing book and story bank?`,
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
      followUpQuestion: `Building on "${shortTitle}", how did that high-trust bond shape the way you look at your work and personal life today?`,
      memoryContextBadge: `Adopted from Bonds Memory + {{${variableKey}}}`,
      quickSpokenStarter: `Just like in "${shortTitle}", a late-night talk with a close friend today reminded me that real trust skips all the small talk.`,
      variableKey,
      variableLiveValue,
      matchedGalleryPlaceOrFolder,
    };
  }

  return {
    memoryAwareQuestion: `Hey ${userName}, your last spark in my memory was "${shortTitle}". What new truth or observation connected to that hit you today?`,
    followUpQuestion: `When "${shortTitle}" clicked for you, how did it change what you want to say next in your stories or business?`,
    memoryContextBadge: `Adopted from Spark Memory + {{${variableKey}}}`,
    quickSpokenStarter: `Expanding on "${shortTitle}", today it hit me that when your digital brain actually remembers your lived stories, everything you create feels unmistakably human.`,
    variableKey,
    variableLiveValue,
    matchedGalleryPlaceOrFolder,
  };
}

export function buildDigitalAssetsForItem(item: {
  title: string;
  story: string;
  category: LifeCategory;
  emotionTone?: string;
  quoteAsset?: QuoteDigitalAsset;
  bookAsset?: BookDigitalAsset;
  businessAsset?: BusinessDigitalAsset;
  assistantAsset?: AssistantDigitalAsset;
}): {
  quoteAsset: QuoteDigitalAsset;
  bookAsset: BookDigitalAsset;
  businessAsset: BusinessDigitalAsset;
  assistantAsset: AssistantDigitalAsset;
} {
  const cleanStory = (item.story || item.title || "").trim();
  const sentences = cleanStory
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const coreSentence =
    sentences[0]?.replace(/^(um|uh|so|like|hey zee|today i was thinking|i think)\s+/i, "") ||
    cleanStory;
  const polishedQuote =
    item.quoteAsset?.quote ||
    (coreSentence.length > 18
      ? `${coreSentence.charAt(0).toUpperCase()}${coreSentence.slice(1).replace(/[.!?]+$/, "")}. What feels approximate in conversation becomes undeniable when you build from lived truth.`
      : `"${item.title}" — the quiet truth hiding in plain sight.`);

  const meta = CATEGORY_META[item.category] || CATEGORY_META.insight;

  const quoteAsset: QuoteDigitalAsset = {
    quote: polishedQuote,
    subtext:
      item.quoteAsset?.subtext ||
      `Distilled by Zee from Prem's casual reflection • ${meta.label}`,
    styleTag: item.quoteAsset?.styleTag || `${meta.shortLabel} • Signature Quote`,
  };

  const ch1 =
    item.bookAsset?.chapters?.[0] ||
    `${cleanStory} When you say a thought out loud to a friend without trying to sound impressive, the real architecture of what you believe finally surfaces. Most great work begins exactly like this—not as a formal thesis, but as an observation you couldn't shake.`;
  const ch2 =
    item.bookAsset?.chapters?.[1] ||
    `Looking closer through the lens of ${meta.label.toLowerCase()}, a deeper pattern emerges. We often underestimate our casual remarks because they come naturally to us, forgetting that our specific intersection of workplace craft, personal taste, and lived experience is impossible to replicate on autopilot.`;
  const ch3 =
    item.bookAsset?.chapters?.[2] ||
    `The move now is to treat this spoken spark as a permanent brick in your body of work. Turn the conversation into a page, the page into a blueprint, and let the honesty of the original moment carry the weight.`;

  const chapters = [ch1, ch2, ch3];
  const wordCount =
    item.bookAsset?.wordCount ||
    chapters.join(" ").split(/\s+/).filter(Boolean).length;

  const bookAsset: BookDigitalAsset = {
    title: item.bookAsset?.title || item.title,
    subtitle:
      item.bookAsset?.subtitle ||
      `A Personal Chapter from Prem's ${meta.label} Stream`,
    chapters,
    wordCount,
  };

  const businessAsset: BusinessDigitalAsset = item.businessAsset || {
    headline: `${meta.shortLabel} Venture & Digital Asset Blueprint`,
    marketAngle: `Convert Prem's spoken perspective on "${item.title}" into high-leverage products, writing, and business systems.`,
    ideas: [
      {
        name: `The "${item.title.slice(0, 28)}" Micro-Product / Essay`,
        pitch: `Package this exact insight into a signature visual essay or founder playbook for people who resonate with ${meta.label.toLowerCase()}.`,
        firstStep: `Share the distilled Quote Card above with your inner circle and track which phrase gets quoted back.`,
      },
      {
        name: `Personal Taste & Advisory Workflow`,
        pitch: `Turn the way you naturally solve ${meta.shortLabel.toLowerCase()} problems into a repeatable framework or studio product.`,
        firstStep: `Record two more 90-second voice notes on this theme so Zee can link them into a 3-part series.`,
      },
      {
        name: `Physical / Digital Monograph Edition`,
        pitch: `Compile your spoken chapters and Gallery Wallet frames into a curated quarterly book edition.`,
        firstStep: `Pair this chapter with a matching frame from your Creative Gallery Wallet.`,
      },
    ],
  };

  const assistantAsset: AssistantDigitalAsset = item.assistantAsset || {
    friendReply: `Prem, I heard what you were getting at right away—even from a casual thought, there's a super clear philosophy here. I polished your words into a signature Quote Card, wrote a 3-chapter book draft around it, and mapped out 3 business angles.`,
    nextMoves: [
      `Save or copy the distilled Quote Card for your personal archive.`,
      `Review Chapter 1–3 in the Book tab—you already have ${wordCount} words drafted from just talking out loud.`,
      `Whenever you want to turn this into a video story, jump to the Scripting tab next door where I've synced this variable.`,
    ],
    tasteConnection: `Calibrated to Prem's ${item.emotionTone || "Warm & Electric"} tone and warm editorial paper taste (#FAF8F3).`,
  };

  return { quoteAsset, bookAsset, businessAsset, assistantAsset };
}

export function analyzeUserStoryWithZee(
  rawText: string,
  preferredCategory?: LifeCategory,
  source: MemoryBankItem["source"] = "voice_mic",
  metaAnalysis?: {
    category?: LifeCategory;
    title?: string;
    story?: string;
    zeeAnalysis?: string;
    emotionTone?: string;
    tags?: string[];
    reelHookIdea?: string;
    voiceCadenceNote?: string;
    quoteAsset?: QuoteDigitalAsset;
    bookAsset?: BookDigitalAsset;
    businessAsset?: BusinessDigitalAsset;
    assistantAsset?: AssistantDigitalAsset;
    durationLabel?: string;
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
    if (/(trip|travel|flight|mountain|beach|city|kyoto|hotel|vacation|road|explore|horizon)/i.test(lower)) {
      category = "travel";
    } else if (/(work|office|code|project|client|startup|team|build|ship|desk|meeting|career|workplace|studio)/i.test(lower)) {
      category = "work";
    } else if (/(mom|dad|parent|family|home|brother|sister|dinner|childhood|roots)/i.test(lower)) {
      category = "family";
    } else if (/(friend|partner|relationship|love|trust|people|conversation|bond|connection)/i.test(lower)) {
      category = "relationships";
    } else if (/(morning|coffee|gym|habit|routine|book|read|sleep|peace|personal|weekend)/i.test(lower)) {
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
    if (/(excited|built|shipped|win|love|amazing|breakthrough|fast)/i.test(lower)) {
      emotionTone = "High-Voltage Craft";
    } else if (/(grateful|family|home|peace|quiet|calm|thankful)/i.test(lower)) {
      emotionTone = "Soulful & Grounded";
    } else if (/(hard|lesson|mistake|realized|truth|struggle|honest)/i.test(lower)) {
      emotionTone = "Raw & Unfiltered";
    }
  }

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
            meta.shortLabel,
            ...words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
          ])
        ).slice(0, 4);

  const zeeAnalysis =
    metaAnalysis?.zeeAnalysis ||
    `I locked this ${meta.label.toLowerCase()} into your Digital Brain, Prem (${emotionTone.toLowerCase()}). Your upcoming scripts and B-roll cuts will automatically echo this exact perspective.`;

  const reelHookIdea =
    metaAnalysis?.reelHookIdea ||
    (category === "insight"
      ? `Here is the raw truth that hit me today: ${firstSentence}`
      : category === "work"
      ? `Inside the workplace today, one shift changed everything: ${firstSentence}`
      : category === "travel"
      ? `Stepping into a new horizon taught me this: ${firstSentence}`
      : category === "family"
      ? `One moment at home reminded me what actually matters: ${firstSentence}`
      : category === "relationships"
      ? `The most honest lesson about human bonds I've lived lately: ${firstSentence}`
      : `A small personal rhythm that rewired my day: ${firstSentence}`);

  const generatedAssets = buildDigitalAssetsForItem({
    title,
    story: clean,
    category,
    emotionTone,
    quoteAsset: metaAnalysis?.quoteAsset,
    bookAsset: metaAnalysis?.bookAsset,
    businessAsset: metaAnalysis?.businessAsset,
    assistantAsset: metaAnalysis?.assistantAsset,
  });

  const generatedWaveform = Array.from({ length: 30 }, (_, idx) => {
    const seed = (clean.charCodeAt(idx % Math.max(1, clean.length)) || 42) + idx * 17;
    return 30 + (seed % 62);
  });

  const memory: MemoryBankItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    title,
    story: clean,
    zeeAnalysis,
    date: new Date().toISOString().slice(0, 10),
    emotionTone,
    tags: uniqueTags,
    variableKey: meta.variableKey,
    reelHookIdea,
    source,
    audioUrl,
    metaPowered: Boolean(metaAnalysis),
    durationLabel: metaAnalysis?.durationLabel || "2:00",
    waveform: generatedWaveform,
    quoteAsset: generatedAssets.quoteAsset,
    bookAsset: generatedAssets.bookAsset,
    businessAsset: generatedAssets.businessAsset,
    assistantAsset: generatedAssets.assistantAsset,
  };

  return {
    memory,
    extractedTrait: `Lives & builds through ${meta.label.toLowerCase()} (${emotionTone})`,
    voiceCadenceNote: metaAnalysis?.voiceCadenceNote,
  };
}

export function loadZeeBrain(): ZeeBrainState {
  if (typeof window === "undefined") return INITIAL_ZEE_BRAIN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ZEE_BRAIN;
    const parsed = JSON.parse(raw) as Partial<ZeeBrainState>;
    const merged: ZeeBrainState = {
      ...INITIAL_ZEE_BRAIN,
      ...parsed,
      virtualYou: {
        ...INITIAL_ZEE_BRAIN.virtualYou,
        ...(parsed.virtualYou || {}),
      },
      memories:
        Array.isArray(parsed.memories) && parsed.memories.length > 0
          ? parsed.memories
          : INITIAL_ZEE_BRAIN.memories,
      gallery:
        Array.isArray(parsed.gallery) && parsed.gallery.length > 0
          ? parsed.gallery
          : INITIAL_ZEE_BRAIN.gallery,
      sources:
        Array.isArray(parsed.sources) && parsed.sources.length > 0
          ? parsed.sources
          : INITIAL_ZEE_BRAIN.sources,
      likedReels:
        Array.isArray(parsed.likedReels) && parsed.likedReels.length > 0
          ? parsed.likedReels
          : INITIAL_ZEE_BRAIN.likedReels,
      activityLogs:
        Array.isArray(parsed.activityLogs) && parsed.activityLogs.length > 0
          ? parsed.activityLogs
          : INITIAL_ZEE_BRAIN.activityLogs,
      variables: {
        ...INITIAL_ZEE_BRAIN.variables,
        ...(parsed.variables || {}),
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

export function useZeeBrain() {
  const [brain, setBrain] = useState<ZeeBrainState>(INITIAL_ZEE_BRAIN);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = loadZeeBrain();
    setBrain(initial);
    setHydrated(true);

    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<ZeeBrainState>;
      if (custom.detail) {
        setBrain(custom.detail);
      } else {
        setBrain(loadZeeBrain());
      }
    };

    window.addEventListener(BRAIN_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(BRAIN_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateBrain = useCallback(
    (updater: (prev: ZeeBrainState) => ZeeBrainState) => {
      setBrain((prev) => {
        const current = loadZeeBrain() || prev;
        const updated = updater(current);
        return saveZeeBrain(updated);
      });
    },
    []
  );

  const addSpokenOrTypedMemory = useCallback(
    (
      text: string,
      category?: LifeCategory,
      source: MemoryBankItem["source"] = "voice_mic",
      metaAnalysis?: any,
      audioUrl?: string
    ) => {
      const analysis = analyzeUserStoryWithZee(
        text,
        category,
        source,
        metaAnalysis,
        audioUrl
      );
      updateBrain((prev) => {
        const nextMemories = [analysis.memory, ...prev.memories];
        const nextSyncScore = Math.min(99, prev.virtualYou.twinSyncScore + 1);
        const nextWarmth = Math.min(100, prev.virtualYou.warmthLevel + 1);
        const nextValues = analysis.extractedTrait
          ? Array.from(
              new Set([analysis.extractedTrait, ...prev.virtualYou.coreValues])
            ).slice(0, 6)
          : prev.virtualYou.coreValues;

        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Prem's Digital Brain",
          action: `Absorbed ${CATEGORY_META[analysis.memory.category].label}: "${analysis.memory.title}"`,
          timestamp: "Just now",
        };

        return {
          ...prev,
          virtualYou: {
            ...prev.virtualYou,
            twinSyncScore: nextSyncScore,
            warmthLevel: nextWarmth,
            voiceCadence: analysis.voiceCadenceNote || prev.virtualYou.voiceCadence,
            coreValues: nextValues,
          },
          memories: nextMemories,
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });
      return analysis.memory;
    },
    [updateBrain]
  );

  const addGalleryItems = useCallback(
    (items: GalleryMediaItem[], sourceLabel = "Creative Vault Sync") => {
      updateBrain((prev) => {
        const nextGallery = [...items, ...prev.gallery];
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Visual Vault",
          action: `${sourceLabel}: Curated ${items.length} visual supply file(s)`,
          timestamp: "Just now",
        };
        return {
          ...prev,
          gallery: nextGallery,
          virtualYou: {
            ...prev.virtualYou,
            twinSyncScore: Math.min(99, prev.virtualYou.twinSyncScore + 1),
          },
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });
    },
    [updateBrain]
  );

  const toggleSourceConnection = useCallback(
    (sourceId: ConnectedSource["id"], customHandle?: string) => {
      updateBrain((prev) => {
        const nextSources = prev.sources.map((s) => {
          if (s.id !== sourceId) return s;
          const nextConnected = !s.connected;
          return {
            ...s,
            connected: nextConnected,
            handleOrPath: customHandle || s.handleOrPath,
            lastSynced: nextConnected ? "Live Neural Link" : "Paused",
            syncedCount: nextConnected ? Math.max(24, s.syncedCount + 12) : s.syncedCount,
          };
        });
        const target = nextSources.find((s) => s.id === sourceId);
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Neural Feeds",
          action: `${target?.connected ? "Linked" : "Paused"} ${target?.name || sourceId}`,
          timestamp: "Just now",
        };
        return {
          ...prev,
          sources: nextSources,
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });
    },
    [updateBrain]
  );

  const scanLikedReel = useCallback(
    (inputUrlOrNote: string, metaScan?: Partial<LikedReelDNA>) => {
      const clean = inputUrlOrNote.trim();
      if (!clean) return null;
      const lower = clean.toLowerCase();

      let detectedFormat = metaScan?.detectedFormat || "storyExplainer";
      let creatorStyle =
        metaScan?.creatorStyle || "High-Retention Speaker + Tactile Cutaways";
      let hookPattern =
        metaScan?.hookPattern ||
        "0.0s Unscripted truth + 2.0s full-screen visual proof";
      let pacingBpm =
        metaScan?.pacingBpm || "150 WPM • Crisp jump-cuts with 1.14x punch-in";
      let captionStyle =
        metaScan?.captionStyle || "Kinetic Pop Capsule + Warm Paper Highlight";

      if (!metaScan) {
        if (/(travel|cinematic|aesthetic|vlog|mountain|sunset|film|story)/i.test(lower)) {
          detectedFormat = "imageStory";
          creatorStyle = "Cinematic Horizon Storyteller";
          hookPattern = "Atmospheric golden-hour establisher + reflective hook";
          pacingBpm = "134 WPM • Smooth 2.5D motion transitions";
          captionStyle = "Editorial Serif Center Subtitle";
        } else if (/(neon|tech|code|ai|dark|cyber|fast|chart)/i.test(lower)) {
          detectedFormat = "blackNeon";
          creatorStyle = "High-Contrast Builder Breakdown";
          hookPattern = "Contrarian builder insight + animated diagram at 1.8s";
          pacingBpm = "158 WPM • Rapid visual beats";
          captionStyle = "JetBrains Mono Neon Glow";
        } else if (/(paper|minimal|note|sketch|warm|beige|book)/i.test(lower)) {
          detectedFormat = "paperCard";
          creatorStyle = "Warm Paper Studio Essayist";
          hookPattern = "Torn paper card reveal + calm conversational truth";
          pacingBpm = "142 WPM • Thoughtful editorial rhythm";
          captionStyle = "Instrument Serif + Torn Paper Card (#FAF8F3)";
        }
      }

      const scanned: LikedReelDNA = {
        id: `reel-${Date.now()}`,
        inputUrlOrNote: clean,
        creatorStyle,
        detectedFormat,
        hookPattern,
        pacingBpm,
        captionStyle,
        readingPatternMatch:
          metaScan?.readingPatternMatch ||
          "Woven into Prem's Digital Brain & Format Taste",
        scannedAt: "Just now",
      };

      updateBrain((prev) => {
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Taste Decoder",
          action: `Decoded liked reel → Locked "${detectedFormat}" (${creatorStyle})`,
          timestamp: "Just now",
        };
        return {
          ...prev,
          likedReels: [scanned, ...prev.likedReels],
          virtualYou: {
            ...prev.virtualYou,
            preferredFormat: detectedFormat,
            signatureHookStyle: hookPattern,
            twinSyncScore: Math.min(99, prev.virtualYou.twinSyncScore + 2),
          },
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });

      return scanned;
    },
    [updateBrain]
  );

  const recordPageActivity = useCallback(
    (page: HeaderTab, pageLabel: string, action: string, topic?: string) => {
      updateBrain((prev) => {
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page,
          pageLabel,
          action,
          timestamp: "Just now",
        };
        return {
          ...prev,
          activeTab: page,
          variables: {
            ...prev.variables,
            "app.activeStage": pageLabel,
            "app.lastTopic": topic || prev.variables["app.lastTopic"],
          },
          activityLogs: [
            nextLog,
            ...prev.activityLogs.filter((l) => l.action !== action),
          ].slice(0, 20),
        };
      });
    },
    [updateBrain]
  );

  return {
    brain,
    hydrated,
    updateBrain,
    addSpokenOrTypedMemory,
    addGalleryItems,
    toggleSourceConnection,
    scanLikedReel,
    recordPageActivity,
  };
}
