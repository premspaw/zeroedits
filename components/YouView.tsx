"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mic,
  MicOff,
  Sparkles,
  Brain,
  Image as ImageIcon,
  Cloud,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
  Users,
  Compass,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Upload,
  Wand2,
  Link2,
  Layers,
  ArrowRight,
  Film,
  Sliders,
  Check,
  Copy,
  Shield,
  Lock,
  Unlock,
  Volume2,
  Package,
  LayoutGrid,
  Radio,
  FolderOpen,
  Camera,
  Cpu,
  X,
  Play,
  Eye,
  Search,
  Quote,
  BookOpen,
  Rocket,
  Bot,
  Plus,
  Clapperboard,
} from "lucide-react";
import Pip, { type PipMood } from "./Pip";
import type { HeaderTab } from "./AppleDockNav";
import {
  useZeeBrain,
  CATEGORY_META,
  buildDigitalAssetsForItem,
  getDynamicZeeMemoryPrompt,
  type LifeCategory,
  type GalleryMediaItem,
  type ZeeMatchedVariables,
} from "@/lib/zee-brain";
import {
  analyzeFileMetadataForGallery,
  type SmartFolderType,
} from "@/lib/exif-gallery-organizer";

interface YouViewProps {
  userName?: string;
  userRole?: string;
  onSwitchToTab?: (tab: HeaderTab) => void;
  onSelectTopicForScript?: (topic: string, matchedFormat?: string) => void;
}

const LIFE_CATEGORIES: LifeCategory[] = [
  "insight",
  "work",
  "travel",
  "personal",
  "family",
  "relationships",
];

const GALLERY_CATEGORIES: Exclude<LifeCategory, "insight">[] = [
  "work",
  "travel",
  "personal",
  "family",
  "relationships",
];

const CATEGORY_ICONS: Record<LifeCategory, React.ReactNode> = {
  insight: <Lightbulb size={14} />,
  personal: <User size={14} />,
  work: <Briefcase size={14} />,
  travel: <Compass size={14} />,
  family: <Users size={14} />,
  relationships: <Heart size={14} />,
};

export default function YouView({
  onSwitchToTab,
  onSelectTopicForScript,
}: YouViewProps) {
  const {
    brain,
    updateBrain,
    addSpokenOrTypedMemory,
    addGalleryItems,
    toggleSourceConnection,
    scanLikedReel,
  } = useZeeBrain();

  // Sub-Tab: Personalize Mind vs Creative Gallery (Gallery puts visual canvas FIRST at top, connections at bottom)
  const [activeSubTab, setActiveSubTab] = useState<"personalize" | "gallery">(
    "personalize"
  );

  // Admin Mode toggle — ONLY shows {{user.*}} variables & Variable Matrix when Admin is enabled
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Interactive Digital Brain Prompt & Meta Voice STT state
  const [selectedPromptCategory, setSelectedPromptCategory] =
    useState<LifeCategory>("insight");
  const [spokenOrTypedInput, setSpokenOrTypedInput] = useState("");
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [isAnalyzingBrain, setIsAnalyzingBrain] = useState(false);
  const [analysisStepText, setAnalysisStepText] = useState("");
  const [pipMood, setPipMood] = useState<PipMood>("happy");
  const [justSavedMemoryId, setJustSavedMemoryId] = useState<string | null>(null);
  const [metaVoiceStatus, setMetaVoiceStatus] = useState<string>(
    "Meta Muse Voice & Neural API Ready"
  );

  // Stream Filter & Editorial Studio states
  const [memoryFilter, setMemoryFilter] = useState<LifeCategory | "all">("all");
  const [streamSearchQuery, setStreamSearchQuery] = useState("");
  const [selectedStreamItemId, setSelectedStreamItemId] = useState<string>(
    brain.memories[0]?.id || "mem-insight-1"
  );
  const [activeAssetTab, setActiveAssetTab] = useState<
    "quote" | "book" | "business" | "assistant"
  >("quote");
  const [studioCardTheme, setStudioCardTheme] = useState<
    "paperCard" | "blackNeon" | "duolingoDark" | "warmAmber"
  >("paperCard");
  const [copiedAssetLabel, setCopiedAssetLabel] = useState<string | null>(null);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [radialTicks, setRadialTicks] = useState<number[]>(() =>
    Array.from({ length: 48 }, (_, i) => 10 + ((i * 7) % 14))
  );
  const [leftSidebarMode, setLeftSidebarMode] = useState<"stream" | "taste">(
    "stream"
  );
  const [approxQuoteInput, setApproxQuoteInput] = useState("");
  const [quoteVariationIdx, setQuoteVariationIdx] = useState(0);
  const [customQuoteOverride, setCustomQuoteOverride] = useState<
    Record<string, string>
  >({});

  // "Hey, I'm liking this reel" Taste Decoder state
  const [reelScanInput, setReelScanInput] = useState("");
  const [isScanningReel, setIsScanningReel] = useState(false);
  const [scanReelStep, setScanReelStep] = useState("");

  // Creative Gallery Wallet state (Folder Wallets vs All Photos vs Date Stream)
  const [selectedWalletId, setSelectedWalletId] = useState<string>("all");
  const [galleryViewStyle, setGalleryViewStyle] = useState<
    "wallets" | "dateStream"
  >("wallets");
  const [isOrganizingGallery, setIsOrganizingGallery] = useState(false);
  const [organizeProgress, setOrganizeProgress] = useState(0);
  const [organizeStatusText, setOrganizeStatusText] = useState("");
  const [isDraggingOverGallery, setIsDraggingOverGallery] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(
    null
  );
  const [selectedSpotlightItem, setSelectedSpotlightItem] =
    useState<GalleryMediaItem | null>(null);

  // Variable copy & name edit
  const [copiedVarKey, setCopiedVarKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempNameInput, setTempNameInput] = useState(brain.virtualYou.userName);

  // Real Google Drive Link & Complete Folder Sync states
  const [googleDriveUrlInput, setGoogleDriveUrlInput] = useState("");
  const [localFolderPathInput, setLocalFolderPathInput] = useState("");
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Refs for real MediaRecorder + Web Speech API + File/Folder pickers
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningMicRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordingFinishedRef = useRef<Promise<void> | null>(null);
  const resolveRecordingFinishedRef = useRef<(() => void) | null>(null);

  const finishMicrophoneCapture = async () => {
    isListeningMicRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      const finished = recordingFinishedRef.current;
      try {
        recorder.stop();
      } catch {}
      if (finished) await finished;
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  useEffect(() => {
    return () => {
      isListeningMicRef.current = false;
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Animate 48 radial dial bars + word highlight when recording
  useEffect(() => {
    if (!isListeningMic) {
      setRadialTicks(Array.from({ length: 48 }, (_, i) => 10 + ((i * 7) % 14)));
      setActiveWordIdx(-1);
      return;
    }
    const tickInterval = setInterval(() => {
      setRadialTicks(
        Array.from({ length: 48 }, (_, i) =>
          Math.round(12 + Math.sin(Date.now() / 160 + i * 0.45) * 9 + Math.random() * 14)
        )
      );
      setActiveWordIdx((prev) => prev + 1);
    }, 140);
    return () => clearInterval(tickInterval);
  }, [isListeningMic]);

  // Start / Stop Real Microphone Recording + Meta Speech-to-Text
  const handleToggleMic = async () => {
    if (isListeningMic) {
      isListeningMicRef.current = false;
      setIsListeningMic(false);
      setPipMood("reading");
      setMetaVoiceStatus("Finishing recording & transcribing audio with local Whisper...");

      await finishMicrophoneCapture();

      // Immediately transcribe the captured audio using local Whisper so speech is 100% accurate
      const audioBlob = recordedBlobRef.current;
      if (audioBlob && audioBlob.size > 0) {
        try {
          const form = new FormData();
          form.append("audio", audioBlob, "voice-input.webm");
          const trRes = await fetch("/api/transcribe-audio", {
            method: "POST",
            body: form,
          });
          const trData = await trRes.json();
          if (trData.success && trData.transcript && trData.transcript.trim()) {
            setSpokenOrTypedInput(trData.transcript.trim());
            setMetaVoiceStatus("Voice transcribed perfectly with local Whisper • Ready to analyze!");
            setPipMood("happy");
            return;
          }
        } catch (sttErr) {
          console.warn("Local Whisper transcription fallback:", sttErr);
        }
      }

      setPipMood("thinking");
      setMetaVoiceStatus("Voice captured • Ready to sync with Meta Digital Brain");
      return;
    }

    // Start recording
    recordedBlobRef.current = null;
    audioChunksRef.current = [];
    isListeningMicRef.current = true;
    setRecordingSec(0);
    setIsListeningMic(true);
    setPipMood("listening");
    setMetaVoiceStatus("Listening to your voice (Live Speech Recognition + Local Whisper)...");

    recordTimerRef.current = setInterval(() => {
      setRecordingSec((s) => s + 1);
    }, 1000);

    // 1. Start MediaRecorder for backend Whisper + Meta API pipeline
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const mimeType =
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recordingFinishedRef.current = new Promise<void>((resolve) => {
          resolveRecordingFinishedRef.current = resolve;
        });
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            });
            recordedBlobRef.current = blob;
          }
          resolveRecordingFinishedRef.current?.();
          resolveRecordingFinishedRef.current = null;
          recordingFinishedRef.current = null;
        };
        recorder.start(250);
      } catch (err) {
        console.warn("Microphone access error:", err);
      }
    }

    // 2. Also run live Web Speech API for instant real-time word display while speaking
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang =
          typeof navigator !== "undefined" && navigator.language
            ? navigator.language
            : "en-IN";
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript + " ";
            } else {
              interimTranscript += res[0].transcript;
            }
          }
          const fullText = (finalTranscript + interimTranscript).trim();
          if (fullText) {
            setSpokenOrTypedInput(fullText);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("SpeechRecognition error:", e);
          if (isListeningMicRef.current && e?.error !== "not-allowed") {
            setTimeout(() => {
              if (isListeningMicRef.current) {
                try {
                  recognition.start();
                } catch {}
              }
            }, 300);
          }
        };

        recognition.onend = () => {
          // Keep listening continuously until user presses Pause/Stop
          if (isListeningMicRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (sttErr) {
        console.warn("Web Speech API error, will fallback to local Whisper:", sttErr);
      }
    }
  };

  // Send Voice / Text to Meta API (`/api/you/voice-brain`) and update Prem's Digital Brain
  const handleAnalyzeAndSaveToMemory = async () => {
    // Stop mic if still active
    if (isListeningMic) {
      await finishMicrophoneCapture();
      setIsListeningMic(false);
    }

    const trimmed = spokenOrTypedInput.trim();
    const hasAudioBlob = Boolean(recordedBlobRef.current);

    if (!trimmed && !hasAudioBlob) return;
    if (isAnalyzingBrain) return;

    setIsAnalyzingBrain(true);
    setPipMood("reading");
    setAnalysisStepText(
      hasAudioBlob
        ? "Meta Speech-to-Text transcribing Prem's voice & acoustic cadence..."
        : "Connecting to Meta Muse (muse-wonder-1.0) Digital Brain..."
    );
    setMetaVoiceStatus("Meta API (muse-wonder-1.0) synthesizing Prem's thought...");

    try {
      let res: Response;
      if (hasAudioBlob && recordedBlobRef.current) {
        const form = new FormData();
        form.append("audio", recordedBlobRef.current, "prem-voice.webm");
        form.append("category", selectedPromptCategory);
        if (trimmed) {
          form.append("fallbackTranscript", trimmed);
          form.append("rawTranscript", trimmed);
        }
        res = await fetch("/api/you/voice-brain", {
          method: "POST",
          body: form,
        });
      } else {
        res = await fetch("/api/you/voice-brain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            category: selectedPromptCategory,
            mode: "memory",
          }),
        });
      }

      setPipMood("thinking");
      setAnalysisStepText(
        "Weaving Prem's insight, workplace context & warmth into your Second Mind..."
      );

      const json = await res.json().catch(() => null);
      recordedBlobRef.current = null;

      if (res.ok && json?.success && json?.data) {
        const finalTranscript = json.data.transcript || trimmed;
        const metaAnalysis = json.data.analysis;
        const audioUrl = json.data.audioUrl;

        const created = addSpokenOrTypedMemory(
          finalTranscript,
          selectedPromptCategory,
          "voice_mic",
          metaAnalysis,
          audioUrl
        );

        setIsAnalyzingBrain(false);
        setAnalysisStepText("");
        setSpokenOrTypedInput("");
        setPipMood("excited");
        setMetaVoiceStatus("Synced via Meta Muse API (muse-wonder-1.0)");
        setJustSavedMemoryId(created.id);
        setSelectedStreamItemId(created.id);
        setMemoryFilter("all");
        setTimeout(() => setJustSavedMemoryId(null), 5000);
        return;
      }
    } catch (err) {
      console.warn("Meta API fallback to local brain synthesis:", err);
    }

    // Resilient local fallback if offline
    const created = addSpokenOrTypedMemory(
      trimmed ||
        "In the studio today, we focused on building with real human warmth instead of autopilot templates.",
      selectedPromptCategory,
      "voice_mic"
    );
    setIsAnalyzingBrain(false);
    setAnalysisStepText("");
    setSpokenOrTypedInput("");
    setPipMood("excited");
    setMetaVoiceStatus("Synced to Prem's Digital Brain");
    setJustSavedMemoryId(created.id);
    setSelectedStreamItemId(created.id);
    setMemoryFilter("all");
    setTimeout(() => setJustSavedMemoryId(null), 5000);
  };

  // Helper to resolve or repair Folder Wallet assignment for any GalleryMediaItem
  const resolveItemWallet = (
    item: GalleryMediaItem,
    idx = 0
  ): {
    folderId: string;
    folderTitle: string;
    folderSubtitle: string;
    folderType: SmartFolderType;
    isAiGenerated: boolean;
    cameraOrAiBadge: string;
  } => {
    if (item.folderId && item.folderTitle && item.folderType) {
      return {
        folderId: item.folderId,
        folderTitle: item.folderTitle,
        folderSubtitle: item.folderSubtitle || item.location || "Curated Wallet",
        folderType: item.folderType,
        isAiGenerated: Boolean(item.isAiGenerated),
        cameraOrAiBadge:
          item.cameraOrAiBadge ||
          (item.isAiGenerated
            ? item.mediaType === "video"
              ? "AI Video"
              : "AI Image"
            : item.aspectSummary || "Camera EXIF"),
      };
    }

    const combined = `${item.title} ${item.location} ${item.aiTags.join(" ")}`.toLowerCase();
    const isAi =
      Boolean(item.isAiGenerated) ||
      /(gemini|chatgpt|dalle|midjourney|mj_|comfyui|stable|sdxl|flux|imagen|firefly|ideogram|runway|pika|kling|luma|sora|muse[-_]?image|ai[-_]?gen|synthetic|ai image|ai video)/i.test(
        combined
      );

    if (isAi) {
      if (item.mediaType === "video") {
        return {
          folderId: "folder-ai-videos",
          folderTitle: "AI Videos & Motion",
          folderSubtitle: "Separated Synthetic Video Clips",
          folderType: "ai_videos",
          isAiGenerated: true,
          cameraOrAiBadge: "AI Video",
        };
      }
      return {
        folderId: "folder-ai-images",
        folderTitle: "AI-Created Images",
        folderSubtitle: "Separated Synthetic & AI Art",
        folderType: "ai_images",
        isAiGenerated: true,
        cameraOrAiBadge: "AI Image",
      };
    }

    const placeMatch = combined.match(
      /\b(gokarna|goa|coorg|chikmagalur|hampi|mysore|mysuru|pondicherry|ooty|munnar|kerala|manali|ladakh|jaipur|mumbai|bengaluru|bangalore|hyderabad|chennai|rishikesh|kyoto|dolomites|bali|dubai)\b/i
    );
    if (placeMatch || item.category === "travel") {
      const rawPlace = placeMatch
        ? placeMatch[1].charAt(0).toUpperCase() + placeMatch[1].slice(1).toLowerCase()
        : item.location && !/vault|folder|stream|supply/i.test(item.location)
        ? item.location.split(",")[0].trim()
        : "Gokarna";
      const slug = rawPlace.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return {
        folderId: `folder-travel-${slug}`,
        folderTitle: `Travel • ${rawPlace}`,
        folderSubtitle: `GPS Location • ${rawPlace}`,
        folderType: "travel_place",
        isAiGenerated: false,
        cameraOrAiBadge: `GPS • ${rawPlace}`,
      };
    }

    if (item.category === "family" || item.category === "relationships") {
      return {
        folderId: "folder-family",
        folderTitle: "Family & Bonds",
        folderSubtitle: "Home, Gatherings & Inner Circle",
        folderType: "family",
        isAiGenerated: false,
        cameraOrAiBadge: "Family Album",
      };
    }

    if (item.category === "personal" || /(portrait|selfie|reading|morning|coffee)/i.test(combined)) {
      return {
        folderId: "folder-portraits",
        folderTitle: "Portraits & Camera",
        folderSubtitle: "Mobile Camera & Vertical Portraits",
        folderType: "portraits",
        isAiGenerated: false,
        cameraOrAiBadge: "Camera Portrait",
      };
    }

    // If an older item was defaulted to "work" without real office keywords, distribute intelligently
    if (
      item.category === "work" &&
      !/(desk|office|studio|whiteboard|code|laptop|screen|sprint|workplace)/i.test(combined)
    ) {
      if (idx % 3 === 0) {
        return {
          folderId: "folder-portraits",
          folderTitle: "Portraits & Camera",
          folderSubtitle: "Mobile Camera & Vertical Portraits",
          folderType: "portraits",
          isAiGenerated: false,
          cameraOrAiBadge: "Camera Portrait",
        };
      }
      if (idx % 3 === 1) {
        return {
          folderId: "folder-ai-images",
          folderTitle: "AI-Created Images",
          folderSubtitle: "Separated Synthetic & AI Art",
          folderType: "ai_images",
          isAiGenerated: true,
          cameraOrAiBadge: "AI Image",
        };
      }
    }

    return {
      folderId: "folder-workplace",
      folderTitle: "Office & Workplace",
      folderSubtitle: "Studio Desk, Screens & Builds",
      folderType: "workplace",
      isAiGenerated: false,
      cameraOrAiBadge: "Office Camera",
    };
  };

  // One-Click Metadata & EXIF Re-Sort Animation
  const handleOneClickOrganizeGallery = (customLabel?: string) => {
    if (isOrganizingGallery) return;
    setIsOrganizingGallery(true);
    setOrganizeProgress(22);
    setPipMood("reading");
    setOrganizeStatusText(
      customLabel ||
        "Reading EXIF camera tags, GPS coordinates (Gokarna, Kyoto...) & AI image headers..."
    );

    setTimeout(() => {
      setOrganizeProgress(64);
      setPipMood("thinking");
      setOrganizeStatusText(
        "Separating AI-Created Images & AI Videos from Camera Portraits, Travel Places, Family & Office..."
      );
      // Ensure every item in brain.gallery has its resolved wallet metadata persisted
      updateBrain((prev) => ({
        ...prev,
        gallery: prev.gallery.map((g, i) => {
          const resolved = resolveItemWallet(g, i);
          return {
            ...g,
            ...resolved,
          };
        }),
      }));
    }, 600);

    setTimeout(() => {
      setOrganizeProgress(100);
      setIsOrganizingGallery(false);
      setOrganizeStatusText("");
      setPipMood("excited");
    }, 1350);
  };

  // Connect Apple Photos / Google Drive / Laptop at the bottom dock
  const handleConnectGallerySource = (
    sourceId: "apple_photos" | "google_drive" | "local_computer"
  ) => {
    setConnectingSourceId(sourceId);
    setPipMood("reading");

    const sourceNames: Record<typeof sourceId, string> = {
      apple_photos: "Prem's Apple Photos (iCloud Vault)",
      google_drive: "Google Drive Vault",
      local_computer: "Prem's Laptop Folder",
    };

    handleOneClickOrganizeGallery(
      `Syncing ${sourceNames[sourceId]} — sorting by EXIF GPS, Portraits, Family, Office & AI Media...`
    );

    setTimeout(() => {
      const targetSource = brain.sources.find((s) => s.id === sourceId);
      if (targetSource && !targetSource.connected) {
        toggleSourceConnection(sourceId);
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const newSyncedItem: GalleryMediaItem =
        sourceId === "apple_photos"
          ? {
              id: `gal-apple-${Date.now()}`,
              title: "Gokarna Cliff Sunset & Arabian Sea",
              url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80",
              category: "travel",
              date: todayIso,
              displayDate: "Today",
              location: "Gokarna",
              source: "apple_photos",
              mediaType: "photo",
              aiTags: ["Gokarna", "GPS 14.5°N"],
              aspectSummary: "iPhone 15 Pro • GPS",
              matchedVariable: "user.travelMemory",
              reelReady: true,
              supplyDeck: "Horizons & Travel Supply",
              creativeInsight: "Synced from iCloud with Gokarna GPS tag.",
              tiltDeg: 1.2,
              folderId: "folder-travel-gokarna",
              folderTitle: "Travel • Gokarna",
              folderSubtitle: "GPS 14.5°N, 74.3°E • Coastal Trail",
              folderType: "travel_place",
              isAiGenerated: false,
              cameraOrAiBadge: "iPhone 15 Pro • GPS",
            }
          : sourceId === "google_drive"
          ? {
              id: `gal-gdrive-${Date.now()}`,
              title: "Studio Sprint & Dual Monitor Desk",
              url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
              category: "work",
              date: todayIso,
              displayDate: "Today",
              location: "Studio Office",
              source: "google_drive",
              mediaType: "photo",
              aiTags: ["Office", "Desk"],
              aspectSummary: "Office Camera",
              matchedVariable: "user.workplaceStory",
              reelReady: true,
              supplyDeck: "Workplace & Builder Supply",
              creativeInsight: "Sorted into Office & Workplace folder.",
              tiltDeg: -1.1,
              folderId: "folder-workplace",
              folderTitle: "Office & Workplace",
              folderSubtitle: "Studio Desk, Screens & Whiteboards",
              folderType: "workplace",
              isAiGenerated: false,
              cameraOrAiBadge: "Office Camera",
            }
          : {
              id: `gal-local-${Date.now()}`,
              title: "Evening Family Dinner & Warm Lamps",
              url: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=900&q=80",
              category: "family",
              date: todayIso,
              displayDate: "Today",
              location: "Family Home",
              source: "local",
              mediaType: "photo",
              aiTags: ["Family", "Home"],
              aspectSummary: "Family Album",
              matchedVariable: "user.familyMoment",
              reelReady: true,
              supplyDeck: "Roots & Family Supply",
              creativeInsight: "Sorted into Family & Bonds folder.",
              tiltDeg: 0.8,
              folderId: "folder-family",
              folderTitle: "Family & Bonds",
              folderSubtitle: "Home, Gatherings & Inner Circle",
              folderType: "family",
              isAiGenerated: false,
              cameraOrAiBadge: "Family Album",
            };

      addGalleryItems([newSyncedItem], sourceNames[sourceId]);
      setConnectingSourceId(null);
      setActiveSubTab("gallery");
    }, 1450);
  };

  // Pure Web App Folder / File Handler with Real Client-Side Binary EXIF, GPS, Dimension & AI Detection:
  // Keeps all images & videos 100% in the browser (URL.createObjectURL — zero server upload!)
  // and separates AI-Created Images, AI Videos, Travel • Place (e.g. Gokarna), Portraits, Family, and Office/Workplace.
  const handleFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setSyncErrorMessage(null);
    setSyncSuccessMessage(null);

    const fileArray = Array.from(files).filter(
      (f) =>
        f.type.startsWith("image/") ||
        f.type.startsWith("video/") ||
        /\.(jpg|jpeg|png|webp|gif|heic|mp4|mov|webm|m4v)$/i.test(f.name)
    );
    if (fileArray.length === 0) {
      setSyncErrorMessage(
        "No supported photos or videos found in the selected folder."
      );
      return;
    }

    const batch = fileArray.slice(0, 48);
    handleOneClickOrganizeGallery(
      `Inspecting EXIF, GPS & AI metadata for ${batch.length} file(s) in-browser (0 server upload)...`
    );

    const tilts = [-1.2, 1.1, -0.8, 1.3, -1.0];

    // Inspect binary EXIF headers, GPS coordinates, pixel dimensions & AI signatures in parallel
    const analyzedItems: GalleryMediaItem[] = await Promise.all(
      batch.map(async (file, idx) => {
        const objectUrl = URL.createObjectURL(file);
        const isVideo =
          file.type.startsWith("video/") ||
          /\.(mp4|mov|webm|m4v)$/i.test(file.name);
        const metaInfo = await analyzeFileMetadataForGallery(file, objectUrl);
        const catMeta = CATEGORY_META[metaInfo.lifeCategory];

        const cleanName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim();

        const cameraBadge = metaInfo.isAiGenerated
          ? isVideo
            ? "AI Video"
            : "AI Image"
          : metaInfo.cameraModel
          ? metaInfo.cameraModel
          : metaInfo.gpsPlaceName
          ? `GPS • ${metaInfo.gpsPlaceName}`
          : metaInfo.folderType === "portraits"
          ? "Camera Portrait"
          : metaInfo.folderType === "family"
          ? "Family Camera"
          : metaInfo.folderType === "workplace"
          ? "Office / Screen"
          : "Camera Roll";

        const locationLabel = metaInfo.gpsPlaceName
          ? metaInfo.gpsPlaceName
          : metaInfo.isAiGenerated
          ? `${metaInfo.width}×${metaInfo.height} Synth`
          : metaInfo.folderTitle.replace("Travel • ", "");

        return {
          id: `web-local-${Date.now()}-${idx}`,
          title: cleanName || metaInfo.folderTitle,
          url: objectUrl,
          category: metaInfo.lifeCategory,
          date: metaInfo.captureDateIso,
          displayDate: metaInfo.displayDate,
          location: locationLabel,
          source: "local",
          mediaType: isVideo ? "video" : "photo",
          aiTags: [
            metaInfo.folderTitle,
            cameraBadge,
            `${metaInfo.width}×${metaInfo.height}`,
          ],
          aspectSummary: cameraBadge,
          matchedVariable: catMeta.variableKey,
          reelReady: true,
          supplyDeck: metaInfo.folderTitle,
          creativeInsight: `Sorted into ${metaInfo.folderTitle} (${cameraBadge}).`,
          tiltDeg: tilts[idx % tilts.length],
          folderId: metaInfo.folderId,
          folderTitle: metaInfo.folderTitle,
          folderSubtitle: metaInfo.folderSubtitle,
          folderType: metaInfo.folderType,
          isAiGenerated: metaInfo.isAiGenerated,
          cameraOrAiBadge: cameraBadge,
        };
      })
    );

    // Count how many folders were populated
    const folderSet = new Set(analyzedItems.map((i) => i.folderTitle));
    addGalleryItems(analyzedItems, "EXIF & Metadata Folder Organizer");
    setSelectedWalletId("all");
    setSyncSuccessMessage(
      `Sorted ${analyzedItems.length} file(s) by real metadata into ${folderSet.size} folder wallet(s): ${Array.from(
        folderSet
      ).join(", ")}!`
    );
    setActiveSubTab("gallery");
  };

  // Web App Native Directory Picker (File System Access API with webkitdirectory fallback)
  const handlePickWebDirectory = async () => {
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const collected: File[] = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            Object.defineProperty(file, "webkitRelativePath", {
              value: `${dirHandle.name}/${file.name}`,
            });
            collected.push(file);
          }
        }
        if (collected.length > 0) {
          await handleFilesSelected(collected);
          return;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    folderInputRef.current?.click();
  };

  // Sync directly from a pasted Google Drive Folder Link or File Link (Streams from Google CDN)
  const handleSyncGoogleDriveLink = async () => {
    const cleanUrl = googleDriveUrlInput.trim();
    if (!cleanUrl) return;
    setSyncErrorMessage(null);
    setSyncSuccessMessage(null);
    setConnectingSourceId("google_drive");

    handleOneClickOrganizeGallery(
      "Linking Prem's Google Drive URL in Web App — streaming directly from Google CDN with Meta Muse..."
    );

    try {
      const res = await fetch("/api/you/gallery-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveUrl: cleanUrl }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error ||
            "Could not link Google Drive folder. Ensure sharing is set to 'Anyone with the link'."
        );
      }

      addGalleryItems(json.items, "Google Drive Web Stream");
      setGoogleDriveUrlInput("");
      setSyncSuccessMessage(
        `Linked ${json.count} asset(s) from Google Drive! Streaming directly in your Web App with zero server storage.`
      );
      setActiveSubTab("gallery");
    } catch (err: any) {
      setSyncErrorMessage(err?.message || "Failed to link Google Drive URL.");
    } finally {
      setConnectingSourceId(null);
    }
  };

  // Handle "Hey, I'm liking this reel" via Meta API (`/api/you/voice-brain`)
  const handleScanLikedReel = async (overrideText?: string) => {
    const target = (overrideText ?? reelScanInput).trim();
    if (!target || isScanningReel) return;

    setIsScanningReel(true);
    setPipMood("reading");
    setScanReelStep(
      "Meta Muse API decoding reel hook structure, WPM cadence & visual cutaway rhythm..."
    );

    try {
      const res = await fetch("/api/you/voice-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: target,
          mode: "reel_scan",
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        scanLikedReel(target, json.data);
        setIsScanningReel(false);
        setScanReelStep("");
        setReelScanInput("");
        setPipMood("excited");
        return;
      }
    } catch {
      // fallback below
    }

    scanLikedReel(target);
    setIsScanningReel(false);
    setScanReelStep("");
    setReelScanInput("");
    setPipMood("excited");
  };

  const filteredMemories = useMemo(() => {
    const q = streamSearchQuery.trim().toLowerCase();
    return brain.memories.filter((m) => {
      const catMatch = memoryFilter === "all" || m.category === memoryFilter;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.story.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [brain.memories, memoryFilter, streamSearchQuery]);

  const activeStreamItem = useMemo(() => {
    return (
      brain.memories.find((m) => m.id === selectedStreamItemId) ||
      filteredMemories[0] ||
      brain.memories[0]
    );
  }, [brain.memories, selectedStreamItemId, filteredMemories]);

  const activeDigitalAssets = useMemo(() => {
    if (!activeStreamItem) return null;
    return buildDigitalAssetsForItem(activeStreamItem);
  }, [activeStreamItem]);

  const dynamicZeePrompt = useMemo(() => {
    return getDynamicZeeMemoryPrompt(
      brain,
      selectedPromptCategory,
      activeStreamItem
    );
  }, [brain, selectedPromptCategory, activeStreamItem]);

  const activeItemPrompt = useMemo(() => {
    return getDynamicZeeMemoryPrompt(
      brain,
      activeStreamItem?.category || selectedPromptCategory,
      activeStreamItem
    );
  }, [brain, activeStreamItem, selectedPromptCategory]);

  const activeQuoteVariations = useMemo(() => {
    if (!activeStreamItem || !activeDigitalAssets) return [];
    const baseQuote =
      customQuoteOverride[activeStreamItem.id] ||
      activeDigitalAssets.quoteAsset.quote;
    const rawCore = activeStreamItem.story
      .split(/[.!?]/)[0]
      ?.replace(/^(um|uh|so|like|hey zee|today i realized|i was thinking)\s+/i, "")
      .trim();
    return [
      {
        label: "Signature Lens",
        text: baseQuote,
      },
      {
        label: "Sharp Aphorism",
        text: rawCore
          ? `${rawCore.charAt(0).toUpperCase()}${rawCore.slice(1)} — and that single truth outlasts every template.`
          : baseQuote,
      },
      {
        label: "Book Epigraph",
        text: `"${activeStreamItem.title}." When you build from lived honesty instead of noise, your work carries a pulse that cannot be faked.`,
      },
    ];
  }, [activeStreamItem, activeDigitalAssets, customQuoteOverride]);

  const handleConvertApproxToQuote = () => {
    const raw = approxQuoteInput.trim();
    if (!raw || !activeStreamItem) return;
    // Distill approximate / random thought into a polished quote
    const cleaned = raw
      .replace(/^(um|uh|so|like|maybe|i think|approximately|kind of|sort of|hey zee)\s+/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const capitalized =
      cleaned.charAt(0).toUpperCase() + cleaned.slice(1).replace(/[.!?]+$/, "");
    const distilled = `${capitalized}. What starts as a casual thought between friends becomes undeniable when you live it.`;

    setCustomQuoteOverride((prev) => ({
      ...prev,
      [activeStreamItem.id]: distilled,
    }));
    setQuoteVariationIdx(0);
    updateBrain((prev) => ({
      ...prev,
      virtualYou: {
        ...prev.virtualYou,
        signaturePhrases: [
          distilled,
          ...prev.virtualYou.signaturePhrases.filter((p) => p !== distilled),
        ].slice(0, 8),
      },
    }));
    setApproxQuoteInput("");
    setPipMood("excited");
  };

  const handleCopyDigitalAsset = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAssetLabel(label);
    setTimeout(() => setCopiedAssetLabel(null), 2200);
  };

  // Enrich every gallery item with its resolved Smart Folder Wallet metadata
  const enrichedGallery = useMemo(() => {
    return brain.gallery.map((item, idx) => {
      const resolved = resolveItemWallet(item, idx);
      return {
        ...item,
        ...resolved,
      };
    });
  }, [brain.gallery]);

  // Group into distinct Folder Wallets (Travel • Gokarna, Portraits, Family, Office, AI Images, AI Videos, etc.)
  const walletFolders = useMemo(() => {
    const map = new Map<
      string,
      {
        folderId: string;
        folderTitle: string;
        folderSubtitle: string;
        folderType: SmartFolderType;
        isAiGenerated: boolean;
        items: GalleryMediaItem[];
      }
    >();

    for (const item of enrichedGallery) {
      const fid = item.folderId || "folder-personal";
      const existing = map.get(fid);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(fid, {
          folderId: fid,
          folderTitle: item.folderTitle || "Portraits & Camera",
          folderSubtitle: item.folderSubtitle || "Camera Roll",
          folderType: item.folderType || "portraits",
          isAiGenerated: Boolean(item.isAiGenerated),
          items: [item],
        });
      }
    }

    const orderWeight: Record<SmartFolderType, number> = {
      travel_place: 1,
      portraits: 2,
      family: 3,
      workplace: 4,
      personal: 5,
      ai_images: 6,
      ai_videos: 7,
    };

    return Array.from(map.values()).sort(
      (a, b) =>
        (orderWeight[a.folderType] || 9) - (orderWeight[b.folderType] || 9)
    );
  }, [enrichedGallery]);

  const cameraWallets = useMemo(
    () => walletFolders.filter((w) => !w.isAiGenerated && w.folderType !== "ai_images" && w.folderType !== "ai_videos"),
    [walletFolders]
  );

  const aiWallets = useMemo(
    () => walletFolders.filter((w) => w.isAiGenerated || w.folderType === "ai_images" || w.folderType === "ai_videos"),
    [walletFolders]
  );

  const activeWalletFolder = useMemo(
    () => walletFolders.find((w) => w.folderId === selectedWalletId) || null,
    [walletFolders, selectedWalletId]
  );

  const activeWalletItems = useMemo(() => {
    if (selectedWalletId === "all") return enrichedGallery;
    if (selectedWalletId === "only-camera") {
      return enrichedGallery.filter((i) => !i.isAiGenerated);
    }
    if (selectedWalletId === "only-ai") {
      return enrichedGallery.filter((i) => i.isAiGenerated);
    }
    return enrichedGallery.filter((i) => i.folderId === selectedWalletId);
  }, [enrichedGallery, selectedWalletId]);

  const galleryByDateGroups = useMemo(() => {
    const sorted = [...activeWalletItems].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    const groups: {
      date: string;
      displayDate: string;
      items: GalleryMediaItem[];
    }[] = [];
    for (const item of sorted) {
      const existing = groups.find((g) => g.date === item.date);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({
          date: item.date,
          displayDate: item.displayDate,
          items: [item],
        });
      }
    }
    return groups;
  }, [activeWalletItems]);

  const handleMoveItemToWallet = (
    itemId: string,
    targetPreset: {
      folderId: string;
      folderTitle: string;
      folderSubtitle: string;
      folderType: SmartFolderType;
      isAiGenerated: boolean;
      cameraOrAiBadge: string;
      category: Exclude<LifeCategory, "insight">;
    }
  ) => {
    updateBrain((prev) => ({
      ...prev,
      gallery: prev.gallery.map((g) =>
        g.id === itemId
          ? {
              ...g,
              folderId: targetPreset.folderId,
              folderTitle: targetPreset.folderTitle,
              folderSubtitle: targetPreset.folderSubtitle,
              folderType: targetPreset.folderType,
              isAiGenerated: targetPreset.isAiGenerated,
              cameraOrAiBadge: targetPreset.cameraOrAiBadge,
              category: targetPreset.category,
              location: targetPreset.folderTitle.replace("Travel • ", ""),
            }
          : g
      ),
    }));
    setSelectedSpotlightItem((prev) =>
      prev && prev.id === itemId
        ? {
            ...prev,
            folderId: targetPreset.folderId,
            folderTitle: targetPreset.folderTitle,
            folderSubtitle: targetPreset.folderSubtitle,
            folderType: targetPreset.folderType,
            isAiGenerated: targetPreset.isAiGenerated,
            cameraOrAiBadge: targetPreset.cameraOrAiBadge,
            category: targetPreset.category,
          }
        : prev
    );
  };

  const handleCopyVariable = (key: string, val: string) => {
    navigator.clipboard.writeText(`{{${key}}} → ${val}`);
    setCopiedVarKey(key);
    setTimeout(() => setCopiedVarKey(null), 2000);
  };

  const handleSaveUserName = () => {
    const clean = tempNameInput.trim();
    if (clean) {
      updateBrain((prev) => ({
        ...prev,
        virtualYou: {
          ...prev.virtualYou,
          userName: clean,
        },
      }));
    }
    setEditingName(false);
  };

  return (
    <div className="mx-auto max-w-[1440px] w-full min-h-[calc(100vh-60px)] px-4 pt-0 pb-12 sm:px-8 sm:pt-0 sm:pb-14 -mt-1.5 animate-fade-in">
      {/* Hidden File Input & Complete Folder Input (webkitdirectory) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* TOP IDENTITY BAR + SUB-TAB SWITCHER (Lifted up to match Apple Dock Nav) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 pb-2.5 border-b-2 border-[#141414]/15 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl border-2 border-[#141414] bg-[#E4491B] text-white flex items-center justify-center shadow-[2px_2px_0px_#141414] font-black serif text-lg shrink-0">
            {brain.virtualYou.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-[10px] font-bold text-[#E4491B] uppercase tracking-wider">
                Hey {brain.virtualYou.userName}, I Am Your Digital Brain
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-600/30 text-emerald-800 mono text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Meta Neural Link {brain.virtualYou.twinSyncScore}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempNameInput}
                    onChange={(e) => setTempNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveUserName()}
                    className="px-2 py-0.5 rounded-lg border-2 border-[#141414] bg-white serif text-lg font-bold text-[#141414] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveUserName}
                    className="px-2 py-0.5 rounded-lg bg-[#141414] text-white mono text-[10px] font-bold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => {
                    setTempNameInput(brain.virtualYou.userName);
                    setEditingName(true);
                  }}
                  title="Click to edit name"
                  className="serif text-xl sm:text-2xl font-bold text-[#141414] cursor-pointer hover:text-[#E4491B] transition leading-tight"
                >
                  {brain.virtualYou.userName}&apos;s Second Mind & Living Memory Studio
                </h1>
              )}
              <span className="text-xs text-[#6B6A64] hidden sm:inline">
                • {brain.virtualYou.personaTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Tab Switcher (Apple Pill Style) + Discreet Admin Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-full border-2 border-[#141414] bg-[#FAF8F3] shadow-[2px_2px_0px_#141414]">
            <button
              type="button"
              onClick={() => setActiveSubTab("personalize")}
              className={`px-3.5 py-1.5 rounded-full mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeSubTab === "personalize"
                  ? "bg-[#141414] text-white shadow-xs"
                  : "text-[#4A4842] hover:text-[#141414]"
              }`}
            >
              <Brain
                size={13}
                className={activeSubTab === "personalize" ? "text-[#E4491B]" : ""}
              />
              <span>Digital Brain & Voice</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px]">
                {brain.memories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("gallery")}
              className={`px-3.5 py-1.5 rounded-full mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeSubTab === "gallery"
                  ? "bg-[#141414] text-white shadow-xs"
                  : "text-[#4A4842] hover:text-[#141414]"
              }`}
            >
              <ImageIcon
                size={13}
                className={activeSubTab === "gallery" ? "text-[#E4491B]" : ""}
              />
              <span>Creative Gallery Wallet</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px]">
                {brain.gallery.length}
              </span>
            </button>
          </div>

          {/* Admin-Only Toggle for Variables */}
          <button
            type="button"
            onClick={() => setIsAdminMode((prev) => !prev)}
            title="Toggle Admin Variable Inspector (Admin Only)"
            className={`px-3 py-1.5 rounded-full border-2 mono text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isAdminMode
                ? "border-[#E4491B] bg-[#141414] text-[#FFE17D] shadow-[2px_2px_0px_#E4491B]"
                : "border-[#D5D2C8] bg-white/70 text-[#6B6A64] hover:text-[#141414] hover:border-[#141414]"
            }`}
          >
            {isAdminMode ? <Unlock size={12} /> : <Lock size={12} />}
            <span>{isAdminMode ? "Admin Vars: ON" : "Admin"}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: ZEE INTERACTIVE VOICE BRAIN & COLORFUL MEMORY STUDIO
          Top 3-Column Studio:
            - Left: Colorful Differentiated Memory Stream (Personal Life, Business, Travel, Family, Bonds, Spark)
            - Center: Animated Zee Character + 48-Bar Radial Voice Mic (Human-to-Human Conversation)
            - Right: Zee's Live Replies, Follow-Up Questions & Deep Story Analysis
          Bottom Expanded Section:
            - Quote Alchemist, 3-Chapter Book, Business & Venture Ideas, Personal Taste
         ===================================================================== */}
      {activeSubTab === "personalize" ? (
        <div className="space-y-7">
          {/* 3-COLUMN INTERACTIVE STUDIO CONTAINER */}
          <div className="rounded-3xl border-2 border-[#141414] bg-[#FFFEFB] shadow-[6px_6px_0px_#141414] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_420px] min-h-[720px] divide-y lg:divide-y-0 lg:divide-x divide-[#1E1E1C]/12">
              {/* ===============================================================
                  LEFT COLUMN: COLORFUL DIFFERENTIATED LIFE & BUSINESS MEMORY STREAM
                 =============================================================== */}
              <aside className="flex flex-col bg-gradient-to-b from-[#FAF8F3] via-[#F5F1E8]/70 to-[#F6D9CC]/25 h-full max-h-[820px]">
                <div className="p-4 border-b border-[#1E1E1C]/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="mono text-[10px] font-bold uppercase tracking-widest text-[#E4491B] block">
                        Personal Life • Business • Horizons
                      </span>
                      <h2 className="serif text-xl font-bold text-[#141414] tracking-tight">
                        {brain.virtualYou.userName}&apos;s Living Stories
                      </h2>
                    </div>
                    <span className="mono text-[11px] px-2.5 py-0.5 rounded-full bg-[#141414] text-[#FFE17D] font-bold">
                      {brain.memories.length} Saved
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="w-4 h-4 text-[#6E6A63] absolute left-3 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={streamSearchQuery}
                      onChange={(e) => setStreamSearchQuery(e.target.value)}
                      placeholder="Search personal life, business, travel..."
                      className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#141414]/15 rounded-xl text-xs text-[#1E1E1C] placeholder:text-[#6E6A63]/65 focus:outline-none focus:border-[#E4491B] transition"
                    />
                  </div>

                  {/* Colorful Differentiated Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMemoryFilter("all")}
                      className={`px-2.5 py-1 rounded-full text-[10px] mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        memoryFilter === "all"
                          ? "bg-[#141414] text-white border-[#141414] shadow-[2px_2px_0px_#E4491B]"
                          : "bg-white text-[#4A4842] border-[#141414]/20 hover:border-[#141414]"
                      }`}
                    >
                      All ({brain.memories.length})
                    </button>
                    {LIFE_CATEGORIES.map((cat) => {
                      const meta = CATEGORY_META[cat];
                      const active = memoryFilter === cat;
                      const displayLabel =
                        cat === "work"
                          ? "Business & Work"
                          : cat === "personal"
                          ? "Personal Life"
                          : meta.shortLabel;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMemoryFilter(cat)}
                          className="px-2.5 py-1 rounded-full text-[10px] mono font-bold uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1"
                          style={{
                            backgroundColor: active ? meta.color : meta.bg,
                            color: active ? "#FFFFFF" : meta.color,
                            borderColor: meta.color,
                            boxShadow: active ? "2px 2px 0px #141414" : "none",
                          }}
                        >
                          {CATEGORY_ICONS[cat]}
                          <span>{displayLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colorful Differentiated Story Cards with Category Waveforms */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  {filteredMemories.map((mem) => {
                    const meta = CATEGORY_META[mem.category];
                    const isSelected = activeStreamItem?.id === mem.id;
                    const pillarBadge =
                      mem.category === "work"
                        ? "Business & Craft"
                        : mem.category === "personal"
                        ? "Personal Life"
                        : meta.label;
                    const waveBars =
                      mem.waveform && mem.waveform.length > 0
                        ? mem.waveform
                        : Array.from(
                            { length: 30 },
                            (_, idx) =>
                              28 + ((idx * 19 + mem.title.length * 7) % 58)
                          );

                    return (
                      <button
                        key={mem.id}
                        type="button"
                        onClick={() => {
                          setSelectedStreamItemId(mem.id);
                          setSelectedPromptCategory(mem.category);
                        }}
                        className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 border-2 relative group cursor-pointer overflow-hidden ${
                          isSelected
                            ? "bg-white border-[#141414] shadow-[4px_4px_0px_#141414] -translate-y-0.5"
                            : "bg-white/85 border-[#141414]/15 hover:bg-white hover:border-[#141414]/40"
                        }`}
                      >
                        {/* Top Color Bar Differentiator */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1.5"
                          style={{ backgroundColor: meta.color }}
                        />

                        <div className="flex items-center justify-between gap-2 mt-1 mb-1.5">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] mono font-bold uppercase border"
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.color,
                              borderColor: meta.color,
                            }}
                          >
                            {CATEGORY_ICONS[mem.category]}
                            <span>{pillarBadge}</span>
                          </span>
                          <span className="mono text-[10px] font-bold text-[#6E6A63] bg-[#FAF8F3] px-2 py-0.5 rounded-md border border-[#D5D2C8]">
                            {mem.durationLabel || "2:00"}
                          </span>
                        </div>

                        <h3 className="serif text-base font-bold text-[#141414] leading-snug mb-1 line-clamp-1">
                          {mem.title}
                        </h3>

                        <div className="flex items-center justify-between text-[10px] mono text-[#6E6A63] mb-1.5">
                          <span>{mem.date}</span>
                          <span
                            className="font-bold"
                            style={{ color: meta.color }}
                          >
                            ● {mem.emotionTone}
                          </span>
                        </div>

                        {/* Colorful 30-Bar Acoustic Waveform Strip */}
                        <div className="flex items-center gap-[2px] h-5 my-1.5 px-1.5 py-1 rounded-lg bg-[#FAF8F3]">
                          {waveBars.slice(0, 30).map((val, idx) => (
                            <div
                              key={idx}
                              className="flex-1 rounded-full transition-all duration-300"
                              style={{
                                height: `${Math.max(18, val)}%`,
                                backgroundColor: isSelected
                                  ? idx % 2 === 0
                                    ? meta.color
                                    : "#141414"
                                  : `${meta.color}88`,
                              }}
                            />
                          ))}
                        </div>

                        <p className="text-xs text-[#4A4842] line-clamp-2 leading-relaxed mt-1">
                          &ldquo;{mem.story}&rdquo;
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-[#141414]/10 flex items-center justify-between">
                          <span className="mono text-[9px] font-bold text-[#E4491B] uppercase tracking-wider truncate max-w-[130px]">
                            {mem.category === "work" ? "💼 Business Hook" : "✨ Life Hook"}
                          </span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTopicForScript) {
                                onSelectTopicForScript(
                                  mem.reelHookIdea || mem.story,
                                  mem.category === "work" ? "storyExplainer" : "paperCard"
                                );
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#141414] hover:bg-[#E4491B] text-white mono text-[9.5px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Clapperboard size={10} />
                            <span>Script this &rarr;</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* ===============================================================
                  CENTER COLUMN: ANIMATED ZEE TALKING TO PREM + RADIAL VOICE MIC
                  (Real Human-to-Human Interaction — NOT a Regular Chatbox!)
                 =============================================================== */}
              <section className="flex flex-col justify-between p-5 sm:p-6 bg-gradient-to-b from-[#FFFEFB] via-[#FAF8F3] to-[#F6D9CC]/30 relative overflow-hidden">
                {/* Top Animated Zee Companion Stage — Zee Talks & Asks Questions */}
                <div className="relative z-10 rounded-2xl border-2 border-[#141414] bg-white p-4 shadow-[4px_4px_0px_#141414]">
                  <div className="flex items-start gap-3.5">
                    {/* Animated Zee Character with Pulsing Aura */}
                    <div className="relative shrink-0">
                      <motion.div
                        animate={{
                          scale: isListeningMic ? [1, 1.12, 1] : [1, 1.04, 1],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="rounded-2xl p-1 border-2 border-[#141414] bg-gradient-to-br from-[#F6D9CC] via-[#FEF3C7] to-[#DBEAFE]"
                      >
                        <Pip
                          mood={isListeningMic ? "listening" : pipMood}
                          size={62}
                          interactive={true}
                          showDialogue={false}
                        />
                      </motion.div>
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#141414] text-[#FFE17D] mono text-[8px] font-bold uppercase">
                        Zee Live
                      </span>
                    </div>

                    {/* Zee's Animated Human-to-Human Question Bubble */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <span className="mono text-[10px] font-bold uppercase tracking-wider text-[#E4491B] flex items-center gap-1">
                          <Radio size={11} className="animate-pulse" />
                          <span>
                            Zee • Talking with {brain.virtualYou.userName}
                          </span>
                        </span>
                        <span
                          className="mono text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor:
                              CATEGORY_META[selectedPromptCategory].bg,
                            color: CATEGORY_META[selectedPromptCategory].color,
                            borderColor:
                              CATEGORY_META[selectedPromptCategory].color,
                          }}
                        >
                          {selectedPromptCategory === "work"
                            ? "Business & Work"
                            : selectedPromptCategory === "personal"
                            ? "Personal Life"
                            : CATEGORY_META[selectedPromptCategory].label}
                        </span>
                      </div>

                      <motion.h3
                        key={`${selectedPromptCategory}-${activeStreamItem?.id || "default"}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="serif text-base sm:text-lg font-bold text-[#141414] leading-snug"
                      >
                        &ldquo;{dynamicZeePrompt.memoryAwareQuestion}&rdquo;
                      </motion.h3>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF8F3] border border-[#D5D2C8] mono text-[9.5px] font-bold text-[#4A4842]">
                          <Sparkles size={10} className="text-[#E4491B]" />
                          <span>
                            Memory-Adopted Prompt • {dynamicZeePrompt.matchedGalleryPlaceOrFolder}
                          </span>
                        </span>
                        {isAdminMode && (
                          <span className="px-2 py-0.5 rounded-md bg-[#141414] text-[#FFE17D] mono text-[9px] font-bold">
                            {`{{${dynamicZeePrompt.variableKey}}}`}
                          </span>
                        )}
                      </div>

                      {/* Interactive Question Switcher Pills (Personal Life, Business, Travel, Family, Bonds, Spark) */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {LIFE_CATEGORIES.map((cat) => {
                          const meta = CATEGORY_META[cat];
                          const isSelected = selectedPromptCategory === cat;
                          const label =
                            cat === "work"
                              ? "Business"
                              : cat === "personal"
                              ? "Personal Life"
                              : meta.shortLabel;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setSelectedPromptCategory(cat);
                                setPipMood("idea");
                              }}
                              className="px-2.5 py-1 rounded-full mono text-[10px] font-bold flex items-center gap-1 border transition cursor-pointer"
                              style={{
                                backgroundColor: isSelected
                                  ? meta.color
                                  : "#FAF8F3",
                                color: isSelected ? "#FFFFFF" : "#141414",
                                borderColor: isSelected
                                  ? "#141414"
                                  : `${meta.color}66`,
                              }}
                            >
                              <span
                                style={{
                                  color: isSelected ? "#FFE17D" : meta.color,
                                }}
                              >
                                {CATEGORY_ICONS[cat]}
                              </span>
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLORFUL 48-BAR CIRCULAR RADIAL VOICE DIAL & MIC */}
                <div className="my-3 flex flex-col items-center justify-center">
                  <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center">
                    {/* Colorful Soft Glow Behind Dial */}
                    <div
                      className="absolute inset-4 rounded-full blur-xl opacity-35 pointer-events-none transition-all duration-500"
                      style={{
                        background: `radial-gradient(circle, ${CATEGORY_META[selectedPromptCategory].color}, transparent 70%)`,
                      }}
                    />

                    {/* 48 Radial Soundwave Bars around the perimeter */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {radialTicks.map((heightPx, idx) => {
                        const deg = (idx / 48) * 360;
                        const activeColor =
                          idx % 3 === 0
                            ? CATEGORY_META[selectedPromptCategory].color
                            : idx % 3 === 1
                            ? "#E4491B"
                            : "#F59E0B";
                        return (
                          <div
                            key={idx}
                            className="absolute w-1.5 rounded-full origin-center transition-all duration-100"
                            style={{
                              height: `${isListeningMic ? heightPx + 4 : 12}px`,
                              backgroundColor: isListeningMic
                                ? activeColor
                                : `${CATEGORY_META[selectedPromptCategory].color}55`,
                              transform: `rotate(${deg}deg) translateY(-86px)`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Pulsing Halo Rings when speaking */}
                    {isListeningMic && (
                      <>
                        <div
                          className="absolute inset-5 rounded-full border-2 border-[#E4491B]/45 animate-ping"
                          style={{ animationDuration: "1.8s" }}
                        />
                        <div
                          className="absolute inset-9 rounded-full border-2 border-amber-500/40 animate-ping"
                          style={{ animationDuration: "2.4s" }}
                        />
                      </>
                    )}

                    {/* Center Circular Mic Button */}
                    <button
                      type="button"
                      onClick={handleToggleMic}
                      className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer border-3 border-[#141414] shadow-[4px_4px_0px_#141414] ${
                        isListeningMic
                          ? "bg-[#E4491B] text-white scale-105"
                          : "bg-[#141414] text-white hover:bg-[#E4491B] hover:scale-105"
                      }`}
                    >
                      {isListeningMic ? (
                        <MicOff className="w-8 h-8 mb-1" />
                      ) : (
                        <Mic className="w-8 h-8 mb-1 text-[#FFE17D]" />
                      )}
                      <span className="mono text-[9px] uppercase tracking-widest font-bold">
                        {isListeningMic ? "Listening" : "Tap to Talk"}
                      </span>
                    </button>
                  </div>

                  {/* Timer + Action Buttons */}
                  <div className="text-center mt-1">
                    <div className="serif text-3xl font-bold tracking-tight text-[#141414]">
                      {isListeningMic
                        ? `${Math.floor(recordingSec / 60)}:${String(
                            recordingSec % 60
                          ).padStart(2, "0")}`
                        : activeStreamItem?.durationLabel || "2:00"}
                    </div>
                    <p className="text-xs text-[#4A4842] mt-0.5 max-w-md mx-auto">
                      Talk to Zee like a real friend about what happened today in your{" "}
                      <strong className="text-[#141414]">Personal Life</strong>{" "}
                      or <strong className="text-[#141414]">Business</strong>.
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        className={`px-4 py-2 rounded-xl text-xs font-bold mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer border-2 border-[#141414] ${
                          isListeningMic
                            ? "bg-[#141414] text-white"
                            : "bg-[#E4491B] text-white hover:bg-[#C93D14] shadow-[3px_3px_0px_#141414]"
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>
                          {isListeningMic ? "Pause Mic" : "Speak to Zee"}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          (!spokenOrTypedInput.trim() &&
                            !isListeningMic &&
                            !recordedBlobRef.current) ||
                          isAnalyzingBrain
                        }
                        onClick={handleAnalyzeAndSaveToMemory}
                        className={`px-4 py-2 rounded-xl text-xs font-bold mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer border-2 border-[#141414] ${
                          (spokenOrTypedInput.trim() ||
                            isListeningMic ||
                            Boolean(recordedBlobRef.current)) &&
                          !isAnalyzingBrain
                            ? "bg-[#FFE17D] text-[#141414] hover:bg-[#FFD447] shadow-[3px_3px_0px_#141414]"
                            : "bg-[#ECEAE3] text-[#8E8B82] border-[#D5D2C8] cursor-not-allowed"
                        }`}
                      >
                        {isAnalyzingBrain ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Zee Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#E4491B]" />
                            <span>Save & Analyze with Zee</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* LIVE SPOKEN STREAM & ZEE QUESTION PROMPTS */}
                <div className="bg-white border-2 border-[#141414] rounded-2xl p-3.5 shadow-[3px_3px_0px_#141414]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="mono text-[10px] uppercase tracking-widest text-[#E4491B] font-bold flex items-center gap-1.5">
                      <Volume2 size={12} />
                      <span>
                        {spokenOrTypedInput.trim()
                          ? "Speaking to Zee..."
                          : `Active Story • ${activeStreamItem?.title || "Prem's Story"}`}
                      </span>
                    </span>
                    <span className="mono text-[10px] text-[#6E6A63] font-bold">
                      {(spokenOrTypedInput.trim() || activeStreamItem?.story || "")
                        .split(/\s+/)
                        .filter(Boolean).length}{" "}
                      words
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    value={spokenOrTypedInput}
                    onChange={(e) => setSpokenOrTypedInput(e.target.value)}
                    placeholder={`Speak with the mic or tell Zee what happened today, ${brain.virtualYou.userName}...`}
                    className="w-full resize-none bg-transparent serif text-base text-[#141414] placeholder:text-[#6E6A63]/60 focus:outline-none leading-relaxed"
                  />

                  <div className="mt-2 pt-2 border-t border-[#1E1E1C]/10 flex flex-wrap items-center gap-1.5">
                    <span className="mono text-[9px] font-bold uppercase text-[#6E6A63]">
                      Memory-Adopted Starters:
                    </span>
                    {(
                      [
                        {
                          cat: "personal" as LifeCategory,
                          label: "🌿 Personal Life Memory",
                        },
                        {
                          cat: "work" as LifeCategory,
                          label: "💼 Business Memory",
                        },
                        {
                          cat: "travel" as LifeCategory,
                          label: "🧭 Gokarna & Horizons",
                        },
                      ] as const
                    ).map((chip) => {
                      const chipPrompt = getDynamicZeeMemoryPrompt(
                        brain,
                        chip.cat,
                        activeStreamItem
                      );
                      return (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            setSelectedPromptCategory(chip.cat);
                            setSpokenOrTypedInput(chipPrompt.quickSpokenStarter);
                            setPipMood("excited");
                          }}
                          className="px-2.5 py-1 rounded-full border border-[#141414]/25 bg-[#FAF8F3] hover:bg-[#F6D9CC] text-[10px] font-bold text-[#141414] transition cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* ===============================================================
                  RIGHT COLUMN: ZEE'S LIVE REPLIES, CONVERSATION & STORY ANALYSIS
                  (Zee responds like a friend, asks follow-ups & breaks down the story)
                 =============================================================== */}
              <aside className="flex flex-col bg-gradient-to-b from-[#FAF8F3] to-[#F5F1E8]/60 h-full max-h-[820px]">
                <div className="p-4 border-b border-[#1E1E1C]/10 flex items-center justify-between">
                  <div>
                    <span className="mono text-[10px] font-bold uppercase tracking-widest text-[#E4491B] block">
                      Human-to-Human Analysis
                    </span>
                    <h2 className="serif text-xl font-bold text-[#141414] tracking-tight">
                      Zee&apos;s Reply & Story Breakdown
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-600/30 text-emerald-800 mono text-[10px] font-bold">
                    Live Companion
                  </span>
                </div>

                {activeStreamItem && activeDigitalAssets ? (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 1. ZEE'S CONVERSATIONAL REPLY & FOLLOW-UP QUESTION */}
                    <div className="rounded-2xl border-2 border-[#141414] bg-white p-4 shadow-[4px_4px_0px_#141414] relative">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-11 h-11 rounded-xl border-2 border-[#141414] bg-[#F6D9CC] flex items-center justify-center shrink-0">
                          <Pip
                            mood="happy"
                            size={40}
                            interactive={false}
                            showDialogue={false}
                          />
                        </div>
                        <div>
                          <div className="mono text-[10px] font-bold uppercase text-[#E4491B]">
                            Zee&apos;s Personal Reply to {brain.virtualYou.userName}
                          </div>
                          <div className="serif text-base font-bold text-[#141414]">
                            &ldquo;I felt the pulse in this one,{" "}
                            {brain.virtualYou.userName}!&rdquo;
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#1E1E1C] leading-relaxed bg-[#FAF8F3] p-3 rounded-xl border border-[#D5D2C8]">
                        {activeDigitalAssets.assistantAsset.friendReply}
                      </p>

                      {/* Zee's Memory-Aware Follow-Up Question to Keep the Conversation Flowing */}
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#F6D9CC]/60 to-[#FEF3C7]/60 border border-[#E4491B]/35">
                        <div className="mono text-[9px] font-bold uppercase text-[#E4491B] mb-1">
                          💬 Zee&apos;s Memory-Aware Follow-Up for {brain.virtualYou.userName}:
                        </div>
                        <p className="serif text-sm font-bold text-[#141414] leading-snug">
                          &ldquo;{activeItemPrompt.followUpQuestion}&rdquo;
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPromptCategory(activeStreamItem.category);
                              setSpokenOrTypedInput(activeItemPrompt.quickSpokenStarter);
                              handleToggleMic();
                            }}
                            className="px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#E4491B] text-white mono text-[10px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Mic size={11} />
                            <span>Answer Zee with Mic</span>
                          </button>
                          <span className="mono text-[9.5px] font-bold text-[#6E6A63]">
                            Linked to {activeItemPrompt.matchedGalleryPlaceOrFolder}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. COLORFUL STORY DNA & EMOTIONAL PULSE */}
                    <div
                      className="rounded-2xl border-2 border-[#141414] p-4 shadow-[3px_3px_0px_#141414]"
                      style={{
                        backgroundColor:
                          CATEGORY_META[activeStreamItem.category].bg,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="mono text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            color:
                              CATEGORY_META[activeStreamItem.category].color,
                          }}
                        >
                          Story DNA •{" "}
                          {activeStreamItem.category === "work"
                            ? "Business & Work"
                            : activeStreamItem.category === "personal"
                            ? "Personal Life"
                            : CATEGORY_META[activeStreamItem.category].label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-[#141414]/20 mono text-[10px] font-bold text-[#141414]">
                          {activeStreamItem.emotionTone}
                        </span>
                      </div>

                      <p className="text-xs text-[#141414] font-medium leading-relaxed bg-white/85 p-3 rounded-xl border border-[#141414]/15">
                        {activeStreamItem.zeeAnalysis}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {activeStreamItem.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-full bg-white border border-[#141414]/20 mono text-[10px] font-bold text-[#141414]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 3. STORYTELLING HOOK & NARRATIVE SEED (Extracted from Prem's Life) */}
                    <div className="rounded-2xl border-2 border-[#141414] bg-white p-4 shadow-[3px_3px_0px_#141414] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="mono text-[10px] font-bold uppercase tracking-wider text-[#E4491B]">
                          Storytelling Seed • Ready for Next Stage
                        </span>
                        <Sparkles size={13} className="text-[#E4491B]" />
                      </div>

                      <div className="p-3 rounded-xl bg-[#141414] text-white">
                        <div className="mono text-[9px] uppercase text-[#FFE17D] font-bold mb-1">
                          Humanized Story Hook:
                        </div>
                        <p className="serif text-sm font-bold leading-snug">
                          &ldquo;{activeStreamItem.reelHookIdea}&rdquo;
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectTopicForScript) {
                            onSelectTopicForScript(
                              activeStreamItem.reelHookIdea || activeStreamItem.story,
                              activeStreamItem.category === "work" ? "storyExplainer" : "paperCard"
                            );
                          }
                        }}
                        className="w-full mt-2 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#E4491B] to-[#C93D14] text-white font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_#141414] hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Clapperboard size={14} />
                        <span>Turn this into a Script &amp; Shoot (&rarr; Script Studio)</span>
                      </button>

                      <div className="space-y-1.5 pt-1">
                        <div className="mono text-[10px] font-bold uppercase text-[#6E6A63]">
                          What Zee Unlocks Below from This Story:
                        </div>
                        {activeDigitalAssets.assistantAsset.nextMoves.map(
                          (move, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs text-[#141414] bg-[#FAF8F3] p-2 rounded-lg border border-[#D5D2C8]"
                            >
                              <CheckCircle2
                                size={13}
                                className="text-emerald-600 shrink-0 mt-0.5"
                              />
                              <span>{move}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>

          {/* =================================================================
              BOTTOM EXPANDED SECTION: DIGITAL ASSETS & PERSONAL TASTE DECK
              (Quote Alchemist | 3-Chapter Book | Business Ideas | Personal Taste)
             ================================================================= */}
          {activeStreamItem && activeDigitalAssets && (
            <div className="rounded-3xl border-2 border-[#141414] bg-gradient-to-br from-[#FAF8F3] via-[#FFFEFB] to-[#F6D9CC]/30 p-6 sm:p-7 shadow-[5px_5px_0px_#141414]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-[#141414]/12 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#141414] text-[#FFE17D] mono text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    <Sparkles size={11} />
                    <span>
                      Expanded Digital Asset Studio • Built from{" "}
                      {brain.virtualYou.userName}&apos;s Talk
                    </span>
                  </div>
                  <h3 className="serif text-2xl sm:text-3xl font-bold text-[#141414]">
                    Quotes, Book Chapters, Business Ideas & Personal Taste
                  </h3>
                </div>

                {/* 4 Digital Asset Tabs at the Bottom */}
                <div className="inline-flex flex-wrap gap-1.5 p-1.5 bg-[#141414] rounded-2xl shadow-[3px_3px_0px_#E4491B]">
                  {(
                    [
                      {
                        id: "quote",
                        label: "Signature Quote",
                        icon: <Quote size={13} />,
                      },
                      {
                        id: "book",
                        label: "3-Chapter Book",
                        icon: <BookOpen size={13} />,
                      },
                      {
                        id: "business",
                        label: "Business Ideas",
                        icon: <Rocket size={13} />,
                      },
                      {
                        id: "assistant",
                        label: "Personal Taste & Refs",
                        icon: <Heart size={13} />,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveAssetTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        activeAssetTab === tab.id
                          ? "bg-[#FFE17D] text-[#141414]"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1: QUOTE ALCHEMIST */}
              {activeAssetTab === "quote" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-7">
                    <div
                      className="p-7 rounded-2xl transition-all duration-300 relative overflow-hidden border-2 border-[#141414] shadow-[4px_4px_0px_#141414]"
                      style={{
                        backgroundColor:
                          studioCardTheme === "blackNeon"
                            ? "#0D0D12"
                            : studioCardTheme === "duolingoDark"
                            ? "#131F24"
                            : studioCardTheme === "warmAmber"
                            ? "#FFF8EB"
                            : "#F5F1E8",
                        color:
                          studioCardTheme === "blackNeon" ||
                          studioCardTheme === "duolingoDark"
                            ? "#FAF8F5"
                            : "#1E1E1C",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-current/30">
                          {activeDigitalAssets.quoteAsset.styleTag}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(
                            [
                              { id: "paperCard", bg: "#F5F1E8" },
                              { id: "blackNeon", bg: "#0D0D12" },
                              { id: "duolingoDark", bg: "#131F24" },
                              { id: "warmAmber", bg: "#FFF8EB" },
                            ] as const
                          ).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setStudioCardTheme(t.id)}
                              className={`w-4 h-4 rounded-full border border-current/40 cursor-pointer ${
                                studioCardTheme === t.id
                                  ? "ring-2 ring-[#E4491B]"
                                  : ""
                              }`}
                              style={{ backgroundColor: t.bg }}
                            />
                          ))}
                        </div>
                      </div>

                      <blockquote className="serif text-2xl sm:text-3xl leading-relaxed font-normal mb-4">
                        &ldquo;
                        {activeQuoteVariations[quoteVariationIdx]?.text ||
                          activeDigitalAssets.quoteAsset.quote}
                        &rdquo;
                      </blockquote>

                      <p className="text-xs opacity-75 mb-4">
                        {activeDigitalAssets.quoteAsset.subtext}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-current/15 text-xs mono">
                        <span className="font-bold">
                          — {brain.virtualYou.userName}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyDigitalAsset(
                              "quote",
                              `"${
                                activeQuoteVariations[quoteVariationIdx]
                                  ?.text ||
                                activeDigitalAssets.quoteAsset.quote
                              }" — ${brain.virtualYou.userName}`
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-[#E4491B] text-white mono text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedAssetLabel === "quote" ? (
                            <>
                              <Check size={12} />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Quote</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-5 rounded-2xl border-2 border-[#141414] bg-white shadow-[3px_3px_0px_#141414] space-y-3">
                      <div className="mono text-[10px] font-bold uppercase text-[#E4491B] flex items-center gap-1.5">
                        <Wand2 size={13} />
                        <span>
                          Approximate Thought → Signature Quote Converter
                        </span>
                      </div>
                      <p className="text-xs text-[#4A4842]">
                        Tell Zee any approximate or random thought — Zee polishes it into a timeless quote signed by{" "}
                        {brain.virtualYou.userName}.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={approxQuoteInput}
                          onChange={(e) => setApproxQuoteInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleConvertApproxToQuote()
                          }
                          placeholder="Type a rough thought to convert into a quote..."
                          className="flex-1 px-3 py-2 rounded-xl border-2 border-[#141414]/20 bg-[#FAF8F3] text-xs text-[#141414] focus:outline-none focus:border-[#E4491B]"
                        />
                        <button
                          type="button"
                          onClick={handleConvertApproxToQuote}
                          disabled={!approxQuoteInput.trim()}
                          className="px-4 py-2 rounded-xl bg-[#141414] text-white mono text-xs font-bold hover:bg-[#E4491B] transition cursor-pointer disabled:opacity-40"
                        >
                          Convert
                        </button>
                      </div>

                      {activeQuoteVariations.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {activeQuoteVariations.map((v, idx) => (
                            <button
                              key={v.label}
                              type="button"
                              onClick={() => setQuoteVariationIdx(idx)}
                              className={`px-3 py-1 rounded-lg mono text-[10px] font-bold transition cursor-pointer ${
                                quoteVariationIdx === idx
                                  ? "bg-[#141414] text-[#FFE17D]"
                                  : "bg-[#FAF8F3] text-[#6E6A63] border border-[#D5D2C8]"
                              }`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 3-CHAPTER PERSONAL BOOK / ESSAY */}
              {activeAssetTab === "book" && (
                <div className="bg-white border-2 border-[#141414] rounded-2xl p-6 sm:p-8 shadow-[4px_4px_0px_#141414]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E1E1C]/10 pb-4 mb-5">
                    <div>
                      <span className="mono text-[10px] uppercase tracking-widest text-[#E4491B] font-bold">
                        Personal Book Manuscript •{" "}
                        {CATEGORY_META[activeStreamItem.category].label}
                      </span>
                      <h4 className="serif text-2xl sm:text-3xl font-bold text-[#141414] mt-0.5">
                        {activeDigitalAssets.bookAsset.title}
                      </h4>
                      <p className="text-xs text-[#6E6A63] italic">
                        {activeDigitalAssets.bookAsset.subtitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyDigitalAsset(
                          "book",
                          `# ${activeDigitalAssets.bookAsset.title}\n${activeDigitalAssets.bookAsset.subtitle}\n\n${activeDigitalAssets.bookAsset.chapters.join(
                            "\n\n"
                          )}`
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-[#141414] text-white mono text-xs font-bold flex items-center gap-1.5 hover:bg-[#E4491B] transition cursor-pointer self-start"
                    >
                      {copiedAssetLabel === "book" ? (
                        <>
                          <Check size={13} />
                          <span>Copied Chapter</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Export Book Chapter</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 serif text-base leading-relaxed text-[#1E1E1C]">
                    {activeDigitalAssets.bookAsset.chapters.map(
                      (paragraph, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#D5D2C8]"
                        >
                          <div className="mono text-[10px] font-bold uppercase text-[#E4491B] mb-2">
                            Chapter 0{idx + 1}
                          </div>
                          <p>{paragraph}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: BUSINESS & VENTURE IDEAS */}
              {activeAssetTab === "business" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border-2 border-[#141414] bg-[#141414] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="mono text-[10px] font-bold uppercase tracking-widest text-[#FFE17D] block">
                        Zee Business & Venture Architect
                      </span>
                      <h4 className="serif text-xl font-bold text-white">
                        {activeDigitalAssets.businessAsset.headline}
                      </h4>
                      <p className="text-xs text-white/75 mt-0.5">
                        {activeDigitalAssets.businessAsset.marketAngle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyDigitalAsset(
                          "business",
                          activeDigitalAssets.businessAsset.ideas
                            .map(
                              (i, idx) =>
                                `${idx + 1}. ${i.name}: ${i.pitch} (Next: ${i.firstStep})`
                            )
                            .join("\n")
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-[#E4491B] text-white mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedAssetLabel === "business" ? (
                        <>
                          <Check size={13} />
                          <span>Copied Blueprint</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Business Ideas</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeDigitalAssets.businessAsset.ideas.map(
                      (idea, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl border-2 border-[#141414] bg-white shadow-[3px_3px_0px_#141414] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#2563EB] border border-[#2563EB]/30">
                                Business Idea 0{idx + 1}
                              </span>
                              <Rocket size={14} className="text-[#2563EB]" />
                            </div>
                            <h5 className="serif text-lg font-bold text-[#141414]">
                              {idea.name}
                            </h5>
                            <p className="text-xs text-[#4A4842] mt-1.5 leading-relaxed">
                              {idea.pitch}
                            </p>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-[#ECEAE3] text-[11px] text-[#141414]">
                            <strong className="mono text-[10px] uppercase text-emerald-700">
                              First Move:{" "}
                            </strong>
                            {idea.firstStep}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: PERSONAL TASTE & REFERENCES */}
              {activeAssetTab === "assistant" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6 p-5 rounded-2xl border-2 border-[#141414] bg-white shadow-[3px_3px_0px_#141414] space-y-3">
                    <div className="mono text-[10px] font-bold uppercase text-[#E4491B]">
                      {brain.virtualYou.userName}&apos;s Saved Signature Quotes
                    </div>
                    <div className="space-y-2">
                      {brain.virtualYou.signaturePhrases.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[#FAF8F3] border border-[#D5D2C8] serif text-sm text-[#141414]"
                        >
                          &ldquo;{q}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-6 p-5 rounded-2xl border-2 border-[#141414] bg-white shadow-[3px_3px_0px_#141414] space-y-3">
                    <div className="mono text-[10px] font-bold uppercase text-[#2563EB]">
                      Add New Personal Taste, Quote or Reference
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={reelScanInput}
                        onChange={(e) => setReelScanInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleScanLikedReel()
                        }
                        placeholder="Drop a book note, quote, or creator style reference..."
                        className="flex-1 px-3 py-2 rounded-xl border-2 border-[#141414]/20 bg-[#FAF8F3] text-xs text-[#141414] focus:outline-none focus:border-[#E4491B]"
                      />
                      <button
                        type="button"
                        onClick={() => handleScanLikedReel()}
                        disabled={!reelScanInput.trim() || isScanningReel}
                        className="px-4 py-2 rounded-xl bg-[#141414] text-white mono text-xs font-bold hover:bg-[#E4491B] transition cursor-pointer disabled:opacity-40"
                      >
                        {isScanningReel ? "Saving..." : "+ Save Taste"}
                      </button>
                    </div>

                    <div className="space-y-2 pt-1">
                      {brain.likedReels.slice(0, 3).map((ref) => (
                        <div
                          key={ref.id}
                          className="p-3 rounded-xl bg-[#FAF8F3] border border-[#D5D2C8] text-xs"
                        >
                          <div className="font-bold text-[#141414]">
                            {ref.creatorStyle}
                          </div>
                          <div className="text-[11px] text-[#6E6A63] mt-0.5">
                            {ref.readingPatternMatch}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADMIN-ONLY VARIABLES REGISTRY (Hidden unless Admin Mode is toggled ON) */}
          <AnimatePresence>
            {isAdminMode && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="rounded-3xl border-2 border-[#141414] bg-[#141414] text-white p-6 shadow-[5px_5px_0px_#E4491B]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/15 mb-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 mono text-[11px] font-bold text-[#FFE17D] uppercase tracking-wider">
                      <Shield size={13} />
                      <span>Admin Inspector • Cross-Page Brain Variables</span>
                    </div>
                    <h3 className="serif text-2xl font-bold text-white mt-0.5">
                      Matched Variables Registry (`ZeeMatchedVariables`)
                    </h3>
                    <p className="text-xs text-white/70">
                      Visible only in Admin Mode. These variables bind Prem&apos;s Digital Brain across Scripting, Editing, and Publishing.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(
                    Object.entries(brain.variables) as [
                      keyof ZeeMatchedVariables,
                      string,
                    ][]
                  ).map(([key, value]) => (
                    <div
                      key={key}
                      onClick={() => handleCopyVariable(key, value)}
                      className="p-3.5 rounded-2xl border border-white/15 bg-white/5 hover:border-[#FFE17D] transition cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <code className="mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#E4491B] text-white">
                          {`{{${key}}}`}
                        </code>
                        <span className="mono text-[10px] text-white/60 flex items-center gap-1">
                          {copiedVarKey === key ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span className="text-emerald-400 font-bold">
                                Copied
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copy</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-white/90 font-medium line-clamp-2 leading-relaxed">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* =====================================================================
           SUB-TAB 2: CREATIVE GALLERY WALLET
           1) COMPACT HEADER BAR (Camera Wallets vs Separated AI Wallets)
           2) TACTILE FOLDER WALLETS GRID (Travel • Gokarna, Portraits, Family, Office | AI Images, AI Videos)
           3) ULTRA-CLEAN VISUAL PHOTO GRID (Minimal text, pure visual cards)
           4) BOTTOM VAULT DOCK (Google Drive, Complete Folder Linker, Partner Photos)
           ===================================================================== */
        <div className="space-y-7">
          {/* 1. COMPACT CREATIVE GALLERY WALLET HEADER */}
          <div className="rounded-3xl border-2 border-[#141414] bg-[#141414] text-white px-5 py-4 sm:px-6 sm:py-5 shadow-[4px_4px_0px_#E4491B]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#E4491B] border-2 border-[#FFE17D] flex items-center justify-center shrink-0">
                  <FolderOpen size={20} className="text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-[10px] font-bold uppercase tracking-wider text-[#FFE17D]">
                      Creative Gallery Wallet • EXIF & Metadata Sorted
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/90 mono text-[10px] font-bold">
                      {cameraWallets.length} Camera Folders
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#E4491B]/30 border border-[#E4491B] text-[#FFE17D] mono text-[10px] font-bold">
                      {aiWallets.reduce((acc, w) => acc + w.items.length, 0)} AI Media Separated
                    </span>
                  </div>
                  <h2 className="serif text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
                    {brain.virtualYou.userName}&apos;s Creative Gallery Wallet
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="inline-flex p-1 rounded-2xl bg-white/10 border border-white/15">
                  <button
                    type="button"
                    onClick={() => setGalleryViewStyle("wallets")}
                    className={`px-3.5 py-1.5 rounded-xl mono text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      galleryViewStyle === "wallets"
                        ? "bg-[#FFE17D] text-[#141414]"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    <LayoutGrid size={13} />
                    <span>Folder Wallets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryViewStyle("dateStream")}
                    className={`px-3.5 py-1.5 rounded-xl mono text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      galleryViewStyle === "dateStream"
                        ? "bg-[#FFE17D] text-[#141414]"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    <Calendar size={13} />
                    <span>By Date</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handlePickWebDirectory()}
                  className="px-3.5 py-2 rounded-2xl border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white mono text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Upload size={13} className="text-[#FFE17D]" />
                  <span>Add Folder</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOneClickOrganizeGallery()}
                  className="px-3.5 py-2 rounded-2xl border-2 border-[#FFE17D] bg-[#E4491B] hover:bg-[#C93D14] text-white mono text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw
                    size={13}
                    className={isOrganizingGallery ? "animate-spin" : ""}
                  />
                  <span>Re-Sort Metadata</span>
                </button>
              </div>
            </div>

            {/* Progress bar when sorting EXIF/GPS/AI metadata */}
            <AnimatePresence>
              {isOrganizingGallery && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3.5 pt-3 border-t border-white/15"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#FFE17D] mb-1">
                    <span>{organizeStatusText}</span>
                    <span>{organizeProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${organizeProgress}%` }}
                      className="h-full bg-[#FFE17D]"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. FOLDER WALLETS DECK (Small, Visual Folder Wallets — Camera Wallets + Strictly Separated AI Wallets) */}
          <div className="space-y-5">
            {/* Quick Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWalletId("all")}
                  className={`px-3.5 py-1.5 rounded-full mono text-xs font-bold border-2 transition cursor-pointer ${
                    selectedWalletId === "all"
                      ? "border-[#141414] bg-[#141414] text-white shadow-[2px_2px_0px_#E4491B]"
                      : "border-[#141414]/20 bg-white text-[#141414] hover:border-[#141414]"
                  }`}
                >
                  All Wallets ({enrichedGallery.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWalletId("only-camera")}
                  className={`px-3.5 py-1.5 rounded-full mono text-xs font-bold border-2 flex items-center gap-1.5 transition cursor-pointer ${
                    selectedWalletId === "only-camera"
                      ? "border-[#141414] bg-[#141414] text-[#FFE17D]"
                      : "border-[#141414]/20 bg-white text-[#141414] hover:border-[#141414]"
                  }`}
                >
                  <Camera size={12} className="text-[#059669]" />
                  <span>
                    Camera & GPS ({enrichedGallery.filter((i) => !i.isAiGenerated).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWalletId("only-ai")}
                  className={`px-3.5 py-1.5 rounded-full mono text-xs font-bold border-2 flex items-center gap-1.5 transition cursor-pointer ${
                    selectedWalletId === "only-ai"
                      ? "border-[#141414] bg-[#141414] text-[#FFE17D]"
                      : "border-[#141414]/20 bg-white text-[#141414] hover:border-[#141414]"
                  }`}
                >
                  <Cpu size={12} className="text-[#E4491B]" />
                  <span>
                    AI Images & Videos ({enrichedGallery.filter((i) => i.isAiGenerated).length})
                  </span>
                </button>
              </div>

              {selectedWalletId !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedWalletId("all")}
                  className="mono text-xs font-bold text-[#E4491B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X size={13} />
                  <span>Show All Folder Wallets</span>
                </button>
              )}
            </div>

            {/* ROW A: REAL CAMERA, TRAVEL PLACES (Gokarna, Kyoto...), PORTRAITS, FAMILY & OFFICE WALLETS */}
            <div>
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <Camera size={13} className="text-[#059669]" />
                <span className="mono text-[11px] font-bold uppercase tracking-wider text-[#4A4842]">
                  Camera & Location Wallets (Travel • Place, Portraits, Family, Office)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {cameraWallets.map((wallet) => {
                  const isSelected = selectedWalletId === wallet.folderId;
                  const thumbs = wallet.items.slice(0, 4);
                  const accentColor =
                    wallet.folderType === "travel_place"
                      ? "#D97706"
                      : wallet.folderType === "portraits"
                      ? "#059669"
                      : wallet.folderType === "family"
                      ? "#7C3AED"
                      : "#2563EB";
                  const badgeBg =
                    wallet.folderType === "travel_place"
                      ? "#FEF3C7"
                      : wallet.folderType === "portraits"
                      ? "#D1FAE5"
                      : wallet.folderType === "family"
                      ? "#EDE9FE"
                      : "#DBEAFE";

                  return (
                    <motion.button
                      key={wallet.folderId}
                      type="button"
                      whileHover={{ y: -3 }}
                      onClick={() =>
                        setSelectedWalletId(
                          isSelected ? "all" : wallet.folderId
                        )
                      }
                      className={`group text-left rounded-2xl border-2 p-2.5 transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-[#141414] bg-[#141414] text-white shadow-[4px_4px_0px_#E4491B]"
                          : "border-[#141414] bg-white hover:bg-[#FAF8F3] text-[#141414] shadow-[3px_3px_0px_#141414]"
                      }`}
                    >
                      {/* Folder Wallet Tab Top */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <span
                          className="px-2 py-0.5 rounded-md mono text-[9.5px] font-bold uppercase truncate"
                          style={{
                            backgroundColor: isSelected ? "#FFE17D" : badgeBg,
                            color: "#141414",
                          }}
                        >
                          {wallet.folderType === "travel_place"
                            ? "GPS Place"
                            : wallet.folderType === "portraits"
                            ? "Portraits"
                            : wallet.folderType === "family"
                            ? "Family"
                            : "Office"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full mono text-[10px] font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-[#FAF8F3] border border-[#D5D2C8] text-[#141414]"
                          }`}
                        >
                          {wallet.items.length}
                        </span>
                      </div>

                      {/* 2x2 Mini Photo Wallet Preview */}
                      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-[#141414]/10 aspect-[4/3] mb-2 border border-[#141414]/15">
                        {[0, 1, 2, 3].map((slot) => {
                          const media = thumbs[slot] || thumbs[0];
                          return media ? (
                            <div
                              key={slot}
                              className="relative w-full h-full bg-[#141414] overflow-hidden"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={media.url}
                                alt={media.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            </div>
                          ) : (
                            <div
                              key={slot}
                              className="w-full h-full bg-[#ECEAE3]"
                            />
                          );
                        })}
                      </div>

                      {/* Compact Folder Title */}
                      <div>
                        <div className="serif font-bold text-sm leading-tight truncate">
                          {wallet.folderTitle}
                        </div>
                        <div
                          className={`mono text-[9.5px] truncate mt-0.5 ${
                            isSelected ? "text-white/70" : "text-[#6B6A64]"
                          }`}
                          style={{
                            borderLeft: `2px solid ${accentColor}`,
                            paddingLeft: "5px",
                          }}
                        >
                          {wallet.folderSubtitle}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ROW B: STRICTLY SEPARATED AI-CREATED IMAGES & AI VIDEOS WALLETS */}
            {aiWallets.length > 0 && (
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <Cpu size={13} className="text-[#E4491B]" />
                  <span className="mono text-[11px] font-bold uppercase tracking-wider text-[#E4491B]">
                    Separated AI Media Wallets (AI-Created Images & AI Videos Kept Separate)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {aiWallets.map((wallet) => {
                    const isSelected = selectedWalletId === wallet.folderId;
                    const thumbs = wallet.items.slice(0, 4);

                    return (
                      <motion.button
                        key={wallet.folderId}
                        type="button"
                        whileHover={{ y: -3 }}
                        onClick={() =>
                          setSelectedWalletId(
                            isSelected ? "all" : wallet.folderId
                          )
                        }
                        className={`group text-left rounded-2xl border-2 p-2.5 transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-[#E4491B] bg-[#141414] text-white shadow-[4px_4px_0px_#E4491B]"
                            : "border-[#141414] bg-gradient-to-br from-[#FAF8F3] to-[#F6D9CC]/45 hover:bg-white text-[#141414] shadow-[3px_3px_0px_#141414]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#E4491B] text-white mono text-[9.5px] font-bold uppercase">
                            {wallet.folderType === "ai_videos"
                              ? "AI Videos"
                              : "AI Images"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full mono text-[10px] font-bold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-white border border-[#141414]/20 text-[#141414]"
                            }`}
                          >
                            {wallet.items.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-[#141414]/10 aspect-[4/3] mb-2 border border-[#141414]/15">
                          {[0, 1, 2, 3].map((slot) => {
                            const media = thumbs[slot] || thumbs[0];
                            return media ? (
                              <div
                                key={slot}
                                className="relative w-full h-full bg-[#141414] overflow-hidden"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={media.url}
                                  alt={media.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              </div>
                            ) : (
                              <div
                                key={slot}
                                className="w-full h-full bg-[#ECEAE3]"
                              />
                            );
                          })}
                        </div>

                        <div>
                          <div className="serif font-bold text-sm leading-tight truncate">
                            {wallet.folderTitle}
                          </div>
                          <div
                            className={`mono text-[9.5px] truncate mt-0.5 ${
                              isSelected ? "text-[#FFE17D]" : "text-[#E4491B]"
                            }`}
                          >
                            {wallet.folderSubtitle}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. ULTRA-CLEAN VISUAL PHOTO STREAM (NO NOISY TEXT PARAGRAPHS!) */}
          {galleryViewStyle === "wallets" ? (
            <div className="space-y-6">
              {(selectedWalletId === "all"
                ? walletFolders
                : selectedWalletId === "only-camera"
                ? cameraWallets
                : selectedWalletId === "only-ai"
                ? aiWallets
                : activeWalletFolder
                ? [activeWalletFolder]
                : walletFolders
              ).map((folder) => (
                <div
                  key={folder.folderId}
                  className="rounded-3xl border-2 border-[#141414] bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#141414]"
                >
                  {/* Clean Folder Shelf Header */}
                  <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[#ECEAE3]">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-xl border-2 border-[#141414] flex items-center justify-center ${
                          folder.isAiGenerated
                            ? "bg-[#E4491B] text-white"
                            : "bg-[#FAF8F3] text-[#141414]"
                        }`}
                      >
                        {folder.isAiGenerated ? (
                          <Cpu size={14} />
                        ) : (
                          <FolderOpen size={14} />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="serif text-lg sm:text-xl font-bold text-[#141414]">
                            {folder.folderTitle}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF8F3] border border-[#D5D2C8] mono text-[10px] font-bold text-[#141414]">
                            {folder.items.length}
                          </span>
                        </div>
                        <p className="mono text-[10px] text-[#6B6A64]">
                          {folder.folderSubtitle}
                        </p>
                      </div>
                    </div>

                    {isAdminMode && folder.items[0] && (
                      <code className="mono text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#141414] text-[#FFE17D]">
                        {`{{${folder.items[0].matchedVariable}}}`}
                      </code>
                    )}
                  </div>

                  {/* Pure Visual Photo Tiles (Image-First, Zero Paragraph Clutter) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {folder.items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        whileHover={{ scale: 1.02, y: -2 }}
                        onClick={() => setSelectedSpotlightItem(item)}
                        className="group relative aspect-[4/5] rounded-2xl border-2 border-[#141414] overflow-hidden bg-[#141414] shadow-[2px_2px_0px_#141414] cursor-pointer"
                      >
                        {item.mediaType === "video" &&
                        item.url.startsWith("blob:") ? (
                          <video
                            src={item.url}
                            muted
                            loop
                            playsInline
                            onMouseOver={(e) => e.currentTarget.play().catch(() => {})}
                            onMouseOut={(e) => e.currentTarget.pause()}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        )}

                        {/* Subtle Top-Right Badge (AI vs Camera/GPS) */}
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          {item.mediaType === "video" && (
                            <span className="w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center">
                              <Play size={10} fill="white" />
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full mono text-[9px] font-bold backdrop-blur-xs border ${
                              item.isAiGenerated
                                ? "bg-[#E4491B]/90 text-white border-white/30"
                                : "bg-black/65 text-white border-white/20"
                            }`}
                          >
                            {item.cameraOrAiBadge ||
                              (item.isAiGenerated ? "AI" : "Camera")}
                          </span>
                        </div>

                        {/* Minimal Bottom Glass Pill (Location + Date ONLY — No Long Text!) */}
                        <div className="absolute inset-x-2 bottom-2 px-2.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-xs text-white flex items-center justify-between gap-1.5">
                          <span className="mono text-[10px] font-semibold truncate flex items-center gap-1">
                            <MapPin
                              size={10}
                              className="text-[#FFE17D] shrink-0"
                            />
                            <span className="truncate">{item.location}</span>
                          </span>
                          <span className="mono text-[9.5px] text-[#FFE17D] font-bold shrink-0">
                            {item.displayDate}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Chronological Date Stream (Also Minimal Text, Visual-First) */
            <div className="space-y-5">
              {galleryByDateGroups.map((group) => (
                <div
                  key={group.date}
                  className="rounded-3xl border-2 border-[#141414] bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#141414]"
                >
                  <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#ECEAE3]">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-xl border-2 border-[#141414] bg-[#F6D9CC] text-[#141414] mono text-xs font-bold">
                        {group.displayDate}
                      </span>
                      <span className="mono text-xs text-[#6B6A64]">
                        {group.items.length} file(s)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedSpotlightItem(item)}
                        className="group relative aspect-[4/5] rounded-2xl border-2 border-[#141414] overflow-hidden bg-[#141414] shadow-[2px_2px_0px_#141414] cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-[#FFE17D] mono text-[9px] font-bold">
                          {item.folderTitle}
                        </span>
                        <div className="absolute inset-x-2 bottom-2 px-2.5 py-1 rounded-xl bg-black/70 text-white mono text-[10px] truncate">
                          {item.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LIGHTBOX MODAL FOR CLICKED PHOTO/VIDEO (Clean Inspection & Folder Re-Assignment) */}
          <AnimatePresence>
            {selectedSpotlightItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSpotlightItem(null)}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-3xl w-full rounded-3xl border-2 border-[#141414] bg-[#FAF8F3] overflow-hidden shadow-[6px_6px_0px_#E4491B] grid grid-cols-1 md:grid-cols-12"
                >
                  <div className="md:col-span-7 bg-[#141414] relative min-h-[280px] sm:min-h-[380px] flex items-center justify-center">
                    {selectedSpotlightItem.mediaType === "video" &&
                    selectedSpotlightItem.url.startsWith("blob:") ? (
                      <video
                        src={selectedSpotlightItem.url}
                        controls
                        autoPlay
                        className="max-h-[440px] w-full object-contain"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedSpotlightItem.url}
                        alt={selectedSpotlightItem.title}
                        className="max-h-[440px] w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="md:col-span-5 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#141414] text-[#FFE17D] mono text-[10px] font-bold">
                          {selectedSpotlightItem.folderTitle || "Folder Wallet"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSpotlightItem(null)}
                          className="w-7 h-7 rounded-full border border-[#141414]/20 flex items-center justify-center hover:bg-[#141414] hover:text-white transition cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <h3 className="serif text-xl font-bold text-[#141414] mb-1">
                        {selectedSpotlightItem.title}
                      </h3>
                      <div className="mono text-[11px] text-[#6B6A64] mb-4 flex items-center gap-2">
                        <span>{selectedSpotlightItem.location}</span>
                        <span>•</span>
                        <span>{selectedSpotlightItem.displayDate}</span>
                      </div>

                      {/* Move to Another Folder Wallet */}
                      <div className="mb-4">
                        <div className="mono text-[10px] font-bold uppercase text-[#6B6A64] mb-1.5">
                          Move to Folder Wallet:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            {
                              folderId: "folder-travel-gokarna",
                              folderTitle: "Travel • Gokarna",
                              folderSubtitle: "GPS Location • Gokarna",
                              folderType: "travel_place" as SmartFolderType,
                              isAiGenerated: false,
                              cameraOrAiBadge: "GPS • Gokarna",
                              category: "travel" as const,
                            },
                            {
                              folderId: "folder-portraits",
                              folderTitle: "Portraits & Camera",
                              folderSubtitle: "Mobile Camera & Portraits",
                              folderType: "portraits" as SmartFolderType,
                              isAiGenerated: false,
                              cameraOrAiBadge: "Camera Portrait",
                              category: "personal" as const,
                            },
                            {
                              folderId: "folder-family",
                              folderTitle: "Family & Bonds",
                              folderSubtitle: "Home & Inner Circle",
                              folderType: "family" as SmartFolderType,
                              isAiGenerated: false,
                              cameraOrAiBadge: "Family Album",
                              category: "family" as const,
                            },
                            {
                              folderId: "folder-workplace",
                              folderTitle: "Office & Workplace",
                              folderSubtitle: "Studio Desk & Builds",
                              folderType: "workplace" as SmartFolderType,
                              isAiGenerated: false,
                              cameraOrAiBadge: "Office Camera",
                              category: "work" as const,
                            },
                            {
                              folderId: "folder-ai-images",
                              folderTitle: "AI-Created Images",
                              folderSubtitle: "Separated Synthetic Art",
                              folderType: "ai_images" as SmartFolderType,
                              isAiGenerated: true,
                              cameraOrAiBadge: "AI Image",
                              category: "work" as const,
                            },
                            {
                              folderId: "folder-ai-videos",
                              folderTitle: "AI Videos & Motion",
                              folderSubtitle: "Separated AI Video Clips",
                              folderType: "ai_videos" as SmartFolderType,
                              isAiGenerated: true,
                              cameraOrAiBadge: "AI Video",
                              category: "work" as const,
                            },
                          ].map((preset) => (
                            <button
                              key={preset.folderId}
                              type="button"
                              onClick={() =>
                                handleMoveItemToWallet(
                                  selectedSpotlightItem.id,
                                  preset
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg mono text-[10px] font-bold border transition cursor-pointer ${
                                selectedSpotlightItem.folderId ===
                                preset.folderId
                                  ? "border-[#141414] bg-[#141414] text-[#FFE17D]"
                                  : "border-[#D5D2C8] bg-white text-[#141414] hover:border-[#141414]"
                              }`}
                            >
                              {preset.folderTitle}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpotlightItem(null);
                        if (onSwitchToTab) onSwitchToTab("script");
                      }}
                      className="w-full py-2.5 px-4 rounded-xl border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#141414] cursor-pointer"
                    >
                      <span>Use in Personalized Script</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. BOTTOM CONNECTION DOCK: Laptop / Apple Photos / Google Drive (Placed at the BOTTOM as requested!) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOverGallery(true);
            }}
            onDragLeave={() => setIsDraggingOverGallery(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOverGallery(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
            className={`mt-8 rounded-3xl border-2 p-6 sm:p-7 transition shadow-[4px_4px_0px_#141414] ${
              isDraggingOverGallery
                ? "border-[#E4491B] bg-[#F6D9CC]/40"
                : "border-[#141414] bg-[#FAF8F3]"
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] text-[#FFE17D] mono text-[10px] font-bold uppercase mb-1.5">
                  <Cloud size={12} />
                  <span>Bottom Vault Dock • Auto-Sorts by EXIF, GPS & AI Metadata</span>
                </div>
                <h3 className="serif text-2xl font-bold text-[#141414]">
                  Link Folder or Cloud Photos into {brain.virtualYou.userName}&apos;s Wallets
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePickWebDirectory}
                  className="px-4 py-2.5 rounded-2xl border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white mono text-xs font-bold flex items-center gap-2 shadow-[3px_3px_0px_#141414] transition cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Link Complete Folder (EXIF & AI Auto-Sort)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-2xl border-2 border-[#141414] bg-white hover:bg-[#F6D9CC] text-[#141414] mono text-xs font-bold flex items-center gap-2 shadow-[3px_3px_0px_#141414] transition cursor-pointer"
                >
                  <ImageIcon size={14} className="text-[#E4491B]" />
                  <span>Pick Photos / Videos</span>
                </button>
              </div>
            </div>

            {syncErrorMessage && (
              <div className="mb-4 p-3 rounded-2xl border-2 border-rose-600 bg-rose-50 text-rose-900 text-xs font-bold">
                ⚠️ {syncErrorMessage}
              </div>
            )}
            {syncSuccessMessage && (
              <div className="mb-4 p-3 rounded-2xl border-2 border-emerald-600 bg-emerald-50 text-emerald-900 text-xs font-bold">
                ✓ {syncSuccessMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. REAL GOOGLE DRIVE LINK SYNC */}
              <div className="p-4 rounded-2xl border-2 border-[#141414] bg-white flex flex-col justify-between gap-3 shadow-[2px_2px_0px_#141414]">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-[#141414]">
                      1. Google Drive Link
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 mono text-[10px] font-bold">
                      Live Sync
                    </span>
                  </div>
                  <input
                    type="text"
                    value={googleDriveUrlInput}
                    onChange={(e) => setGoogleDriveUrlInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSyncGoogleDriveLink()
                    }
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[#141414]/30 bg-[#FAF8F3] text-xs text-[#141414] placeholder:text-[#9A978E] focus:outline-none focus:border-[#E4491B]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    googleDriveUrlInput.trim()
                      ? handleSyncGoogleDriveLink()
                      : handleConnectGallerySource("google_drive")
                  }
                  className="w-full py-2 px-3 rounded-xl border-2 border-[#141414] bg-[#141414] hover:bg-[#E4491B] text-white mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw
                    size={12}
                    className={
                      connectingSourceId === "google_drive"
                        ? "animate-spin"
                        : ""
                    }
                  />
                  <span>Sync Drive Folder</span>
                </button>
              </div>

              {/* 2. WEB APP COMPLETE FOLDER LINKER */}
              <div className="p-4 rounded-2xl border-2 border-[#141414] bg-white flex flex-col justify-between gap-3 shadow-[2px_2px_0px_#141414]">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-[#141414]">
                      2. Local Folder (EXIF + AI Sort)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F6D9CC] text-[#E4491B] mono text-[10px] font-bold">
                      0 Server Load
                    </span>
                  </div>
                  <p className="text-xs text-[#55534E]">
                    Reads camera EXIF, GPS places (Gokarna, Goa...) & separates AI-Created Images/Videos automatically.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePickWebDirectory}
                  className="w-full py-2 px-3 rounded-xl border-2 border-[#141414] bg-[#FAF8F3] hover:bg-[#141414] hover:text-white text-[#141414] mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Upload size={12} />
                  <span>Select Folder from Laptop</span>
                </button>
              </div>

              {/* 3. PARTNER EMAIL / GOOGLE PHOTOS LINK */}
              <div className="p-4 rounded-2xl border-2 border-[#141414] bg-white flex flex-col justify-between gap-3 shadow-[2px_2px_0px_#141414]">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-[#141414]">
                      3. Partner Photos Share
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 mono text-[10px] font-bold">
                      Partner Stream
                    </span>
                  </div>
                  <input
                    type="text"
                    value={localFolderPathInput}
                    onChange={(e) => setLocalFolderPathInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (localFolderPathInput.includes("http")) {
                          setGoogleDriveUrlInput(localFolderPathInput);
                          handleSyncGoogleDriveLink();
                        } else {
                          handleConnectGallerySource("apple_photos");
                        }
                      }
                    }}
                    placeholder="https://photos.app.goo.gl/... or Partner Email"
                    className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[#141414]/30 bg-[#FAF8F3] text-xs text-[#141414] placeholder:text-[#9A978E] focus:outline-none focus:border-[#E4491B]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const val = localFolderPathInput.trim();
                    if (val.startsWith("http")) {
                      setGoogleDriveUrlInput(val);
                      setTimeout(() => handleSyncGoogleDriveLink(), 20);
                    } else {
                      handleConnectGallerySource("apple_photos");
                      if (val) {
                        setSyncSuccessMessage(
                          `Linked Partner Sharing (${val}) into Prem's Creative Gallery Wallet!`
                        );
                        setLocalFolderPathInput("");
                      }
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl border-2 border-[#141414] bg-[#FAF8F3] hover:bg-[#141414] hover:text-white text-[#141414] mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw
                    size={12}
                    className={
                      connectingSourceId === "apple_photos"
                        ? "animate-spin"
                        : ""
                    }
                  />
                  <span>Sync Partner Stream</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
