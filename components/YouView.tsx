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
  Bot,
  Plus,
  Smartphone,
  MessageSquare,
  Send,
  Phone,
  AlertTriangle,
  Clapperboard,
  Zap,
} from "lucide-react";
import Pip, { type PipMood } from "./Pip";
import BrandIdentityPanel from "./BrandIdentityPanel";
import type { HeaderTab } from "./AppleDockNav";
import {
  useZeeBrain,
  CATEGORY_META,
  buildScriptBeatsForStory,
  inferSubSegment,
  getDynamicZeeMemoryPrompt,
  type LifeCategory,
  type GalleryMediaItem,
  type ZeeMatchedVariables,
  type WhatsAppChatTurn,
  type WhatsAppScriptBeat,
  type MemoryBankItem,
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
    importWhatsAppMemories,
    toggleSourceConnection,
    scanLikedReel,
  } = useZeeBrain();

  // Sub-Tab: Personalize Mind vs Creative Gallery (ONLY 2 existing pages — no separate page!)
  const [activeSubTab, setActiveSubTab] = useState<"personalize" | "gallery">(
    "personalize"
  );

  // Input Channel Switcher inside the existing Digital Brain & Voice page ("studio_mic" vs "whatsapp_channel")
  const [inputChannel, setInputChannel] = useState<
    "studio_mic" | "whatsapp_channel"
  >("studio_mic");

  // WhatsApp Input Channel state (connected directly to the same Digital Brain & Bottom Connection Dock)
  const [waUserPhone, setWaUserPhone] = useState("");
  const [waSimDurationSec, setWaSimDurationSec] = useState<number>(84);
  const [waIsProcessing, setWaIsProcessing] = useState(false);
  const [waGuardAlert, setWaGuardAlert] = useState<string | null>(null);
  const [waLastBotReply, setWaLastBotReply] = useState<string | null>(null);
  const [waSetup, setWaSetup] = useState<{ configured: boolean; memorySyncEnabled: boolean; webhookUrl: string; missing: string[] }>({
    configured: false,
    memorySyncEnabled: false,
    webhookUrl: "/api/whatsapp/webhook",
    missing: [],
  });
  const [waSyncMessage, setWaSyncMessage] = useState("");

  // Admin Mode toggle — ONLY shows {{user.*}} variables & Variable Matrix when Admin is enabled
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Interactive Digital Brain Prompt & Meta Voice STT state
  const [selectedPromptCategory, setSelectedPromptCategory] =
    useState<LifeCategory>("insight");
  const [spokenOrTypedInput, setSpokenOrTypedInput] = useState("");
  const [replyingToMemoryId, setReplyingToMemoryId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
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
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [radialTicks, setRadialTicks] = useState<number[]>(() =>
    Array.from({ length: 48 }, (_, i) => 10 + ((i * 7) % 14))
  );
  const [leftSidebarMode, setLeftSidebarMode] = useState<"stream" | "taste">(
    "stream"
  );
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordingFinishedRef = useRef<Promise<void> | null>(null);
  const resolveRecordingFinishedRef = useRef<(() => void) | null>(null);
  const autoStopTriggeredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/whatsapp/webhook?mode=status")
      .then((response) => response.json())
      .then((status) => { if (!cancelled) setWaSetup((previous) => ({ ...previous, ...status })); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const syncWhatsAppStories = async () => {
    if (!waSetup.memorySyncEnabled) {
      setWaSyncMessage("Private WhatsApp memory sync is available in the local owner workspace.");
      return;
    }
    const phone = waUserPhone.replace(/[^0-9]/g, "");
    if (!phone) {
      setWaSyncMessage("Add the WhatsApp number you used, then sync again.");
      return;
    }
    try {
      const response = await fetch(`/api/whatsapp/webhook?mode=sync&phone=${encodeURIComponent(`+${phone}`)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "WhatsApp memories could not be synced.");
      const imported = importWhatsAppMemories(Array.isArray(payload.memories) ? payload.memories : []);
      setWaSyncMessage(imported ? `Added ${imported} ${imported === 1 ? "story" : "stories"} to your memory gallery.` : "Your WhatsApp stories are already up to date.");
      if (imported) {
        setActiveSubTab("personalize");
        setMemoryFilter("all");
      }
    } catch (error: any) {
      setWaSyncMessage(error?.message || "WhatsApp memories could not be synced.");
    }
  };

  const finishMicrophoneCapture = async () => {
    if (recognitionRef.current) {
      try {
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
      await finishMicrophoneCapture();
      setIsListeningMic(false);
      setPipMood("thinking");
      setMetaVoiceStatus("Voice captured • Ready to sync with Meta Digital Brain");
      return;
    }

    // Start recording
    recordedBlobRef.current = null;
    setHasRecordedAudio(false);
    autoStopTriggeredRef.current = false;
    audioChunksRef.current = [];
    setRecordingSec(0);
    setIsListeningMic(true);
    setPipMood("listening");
    setMetaVoiceStatus("Listening to your voice...");

    recordTimerRef.current = setInterval(() => {
      setRecordingSec((seconds) => {
        const next = Math.min(120, seconds + 1);
        if (next >= 120 && !autoStopTriggeredRef.current) {
          autoStopTriggeredRef.current = true;
          window.setTimeout(async () => {
            await finishMicrophoneCapture();
            setIsListeningMic(false);
            setMetaVoiceStatus("Two-minute recording ready. Save it to your memory gallery.");
            setPipMood("thinking");
          }, 0);
        }
        return next;
      });
    }, 1000);

    // 1. Start MediaRecorder for backend Whisper + Meta API pipeline
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
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
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            recordedBlobRef.current = blob;
            setHasRecordedAudio(true);
          }
          resolveRecordingFinishedRef.current?.();
          resolveRecordingFinishedRef.current = null;
          recordingFinishedRef.current = null;
        };
        recorder.start();
      } catch {
        // Fallback if mic permission denied in browser
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
        recognition.lang = "en-IN";
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setSpokenOrTypedInput(transcript);
          }
        };

        recognition.onerror = () => {
          // Keep MediaRecorder or fallback running smoothly
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Continue to interactive voice stream fallback if needed
      }
    }
  };

  // Send voice or text to the story listener and save its response into memory
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
    const replyToId = replyingToMemoryId || selectedStreamItemId || brain.memories[0]?.id;
    const parentMemory = replyToId
      ? brain.memories.find((memory) => memory.id === replyToId)
      : undefined;
    const conversationId = parentMemory?.conversationId || parentMemory?.id;
    const identityContext = JSON.stringify({
      name: brain.virtualYou.userName || "",
      voice: {
        cadence: brain.virtualYou.voiceCadence,
        thinkingStyle: brain.virtualYou.thinkingStyle,
        signaturePhrases: brain.virtualYou.signaturePhrases,
      },
      brand: brain.brandProfile,
    });

    setIsAnalyzingBrain(true);
    setPipMood("reading");
    setAnalysisStepText(
      hasAudioBlob
        ? "Transcribing your voice note..."
        : "Connecting to Meta Muse (muse-wonder-1.0) Digital Brain..."
    );
    setMetaVoiceStatus("Zee is listening to your story...");

    try {
      let res: Response;
      if (hasAudioBlob && recordedBlobRef.current) {
        const form = new FormData();
        form.append("audio", recordedBlobRef.current, "prem-voice.webm");
        form.append("category", selectedPromptCategory);
        form.append("identityContext", identityContext);
        if (trimmed) {
          form.append("fallbackTranscript", trimmed);
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
            identityContext,
          }),
        });
      }

      setPipMood("thinking");
      setAnalysisStepText(
        "Understanding the moment and preparing a follow-up..."
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
          audioUrl,
          conversationId
        );

        setIsAnalyzingBrain(false);
        setAnalysisStepText("");
        setSpokenOrTypedInput("");
        setHasRecordedAudio(false);
        setReplyingToMemoryId(null);
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

    // Never replace an untranscribed recording with placeholder text.
    if (hasAudioBlob && !trimmed) {
      setIsAnalyzingBrain(false);
      setAnalysisStepText("");
      setPipMood("thinking");
      setMetaVoiceStatus("I saved the recording, but couldn’t transcribe it. Add a few words or retry when speech recognition is available.");
      return;
    }

    // Resilient local fallback if offline
    const created = addSpokenOrTypedMemory(
      trimmed,
      selectedPromptCategory,
      "voice_mic",
      undefined,
      conversationId
    );
    setIsAnalyzingBrain(false);
    setAnalysisStepText("");
    setSpokenOrTypedInput("");
    setHasRecordedAudio(false);
    setReplyingToMemoryId(null);
    setPipMood("excited");
    setMetaVoiceStatus("Saved to your memory");
    setJustSavedMemoryId(created.id);
    setSelectedStreamItemId(created.id);
    setMemoryFilter("all");
    setTimeout(() => setJustSavedMemoryId(null), 5000);
  };

  // Send / Simulate / Finalize WhatsApp Voice Note or Text via `/api/whatsapp/webhook` directly into the same Digital Brain page
  const handleSendWhatsAppChannel = async (opts?: {
    overrideText?: string;
    overrideDurationSec?: number;
    forceSegregate?: boolean;
  }) => {
    const textToSend = (opts?.overrideText ?? spokenOrTypedInput).trim();
    const durationSec = opts?.overrideDurationSec ?? waSimDurationSec;

    if (!waUserPhone.trim()) {
      setWaGuardAlert("Enter the WhatsApp number that sent the story before syncing it.");
      return;
    }
    if (!textToSend && !opts?.forceSegregate) return;
    if (waIsProcessing || isAnalyzingBrain) return;

    setWaIsProcessing(true);
    setIsAnalyzingBrain(true);
    setWaGuardAlert(null);
    setPipMood("reading");

    try {
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: opts?.forceSegregate ? "finalize" : "simulate",
          userPhone: waUserPhone,
          userName: brain.virtualYou.userName,
          messageType: "voice",
          durationSec,
          text: textToSend,
          forceSegregate: Boolean(opts?.forceSegregate ?? true),
        }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        if (json.rejectedOver2Min) {
          setWaGuardAlert(json.botReply);
          setWaLastBotReply(json.botReply);
          setPipMood("thinking");
          return;
        }

        if (json.botReply) {
          setWaLastBotReply(json.botReply);
        }

        if (json.segregatedMemory) {
          const seg: MemoryBankItem = json.segregatedMemory;
          const created = addSpokenOrTypedMemory(
            seg.story,
            seg.category,
            seg.source,
            {
              category: seg.category,
              subSegment: seg.subSegment,
              userPhone: seg.userPhone || waUserPhone,
              scriptBeats: seg.scriptBeats,
              whatsappThread: seg.whatsappThread,
              title: seg.title,
              story: seg.story,
              zeeAnalysis: seg.zeeAnalysis,
              emotionTone: seg.emotionTone,
              tags: seg.tags,
              reelHookIdea: seg.reelHookIdea,
              durationLabel: seg.durationLabel,
            }
          );
          setSelectedStreamItemId(created.id);
          setSelectedPromptCategory(created.category);
          setJustSavedMemoryId(created.id);
          setMemoryFilter("all");
          setSpokenOrTypedInput("");
          setPipMood("excited");
          setTimeout(() => setJustSavedMemoryId(null), 5000);
        }
      }
    } catch (err) {
      console.warn("WhatsApp channel sync error:", err);
    } finally {
      setWaIsProcessing(false);
      setIsAnalyzingBrain(false);
    }
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
      apple_photos: "Apple Photos (iCloud Vault)",
      google_drive: "Google Drive Vault",
      local_computer: "Laptop Folder",
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
      "Linking your Google Drive in Web App — streaming directly from Google CDN with Meta Muse..."
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

  const activeConversationItems = useMemo(() => {
    if (!activeStreamItem) return [];
    const threadId = activeStreamItem.conversationId || activeStreamItem.id;
    return brain.memories
      .filter((memory) => (memory.conversationId || memory.id) === threadId)
      .filter((memory) => memory.id !== activeStreamItem.id)
      .slice(0, 3)
      .reverse();
  }, [brain.memories, activeStreamItem]);

  useEffect(() => {
    const chat = chatScrollRef.current;
    if (!chat) return;
    chat.scrollTop = chat.scrollHeight;
  }, [activeStreamItem?.id, activeConversationItems.length, isAnalyzingBrain]);

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
    <div className="mx-auto w-full max-w-[1500px] min-h-[calc(100vh-60px)] px-3 pb-16 pt-[5px] sm:px-6 sm:pb-20 sm:pt-[5px] animate-fade-in">
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

      {/* =====================================================================
          SUB-TAB 1: ZEE INTERACTIVE VOICE BRAIN & COLORFUL MEMORY STUDIO
          Top 3-Column Studio:
            - Left: Personal story and visual archive
            - Center: One compact voice, text, and WhatsApp capture surface
            - Right: Zee's story reflection, follow-up, and conversation history
          Lower section:
            - Saved influence patterns and original story formats
         ===================================================================== */}
      {activeSubTab === "personalize" ? (
        <div className="space-y-7">
          {/* 3-COLUMN INTERACTIVE STUDIO CONTAINER */}
          <div className="overflow-hidden rounded-[28px] border border-[#e5ddd1] bg-[#fffdfa] shadow-[0_18px_55px_rgba(54,42,28,0.06)]">
            <div className="grid min-h-[620px] grid-cols-1 divide-y divide-[#eee7dd] lg:grid-cols-[300px_minmax(340px,1fr)_340px] lg:divide-x lg:divide-y-0">
              {/* ===============================================================
                  LEFT COLUMN: COLORFUL DIFFERENTIATED LIFE & BUSINESS MEMORY STREAM
                 =============================================================== */}
              <aside className="flex h-full max-h-[760px] flex-col bg-gradient-to-b from-[#fbf8f2] via-[#f8f4ed] to-[#f6e7dc]/60">
                <div className="px-4 pb-4 pt-1.5 border-b border-[#1E1E1C]/10">
                  <div className="mb-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#a6573d]">{brain.memories.length} stories / {brain.gallery.length} visuals</p>
                    <h1 className="mt-1 font-serif text-[25px] leading-none tracking-tight text-[#25231f]">Living memory</h1>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#746b60]">
                      {editingName ? <input autoFocus aria-label="Your name" value={tempNameInput} onChange={(event) => setTempNameInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleSaveUserName(); }} onBlur={handleSaveUserName} placeholder="Add your name" className="w-28 border-b border-[#a6573d]/40 bg-transparent outline-none" /> : <span>{brain.virtualYou.userName ? `of ${brain.virtualYou.userName}` : "Stories, voice and point of view"}</span>}
                      {!editingName && <button type="button" onClick={() => { setTempNameInput(brain.virtualYou.userName); setEditingName(true); }} className="rounded-full border border-[#ded5c9] bg-white px-2 py-0.5 text-[9px] hover:border-[#b58d71]">{brain.virtualYou.userName ? "Edit" : "Add name"}</button>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="mono text-[10px] font-bold uppercase tracking-widest text-[#E4491B] block">
                        Personal Life • Business • Horizons
                      </span>
                      <h2 className="serif text-xl font-bold text-[#141414] tracking-tight">Living Stories</h2>
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
                  {filteredMemories.length === 0 && <div className="rounded-2xl border border-dashed border-[#d9c9b9] bg-white/65 p-4"><p className="font-serif text-lg text-[#332d27]">Your stories start here.</p><p className="mt-1 text-[10px] leading-4 text-[#786e64]">Share a turning point, a person who shaped you, what you are building, or what you want people to understand.</p></div>}
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
                            ? "bg-white border-[#b88268] shadow-[0_10px_26px_rgba(71,48,34,0.11)] -translate-y-0.5"
                            : "bg-white/75 border-[#e7dfd5] hover:-translate-y-0.5 hover:bg-white hover:border-[#cdb6a5] hover:shadow-[0_8px_22px_rgba(71,48,34,0.07)]"
                        }`}
                      >
                        {/* Top Color Bar Differentiator */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1.5"
                          style={{ backgroundColor: meta.color }}
                        />

                        <div className="flex items-center justify-between gap-2 mt-1 mb-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] mono font-bold uppercase border"
                              style={{
                                backgroundColor: meta.bg,
                                color: meta.color,
                                borderColor: meta.color,
                              }}
                            >
                              {CATEGORY_ICONS[mem.category]}
                              <span>{mem.subSegment || pillarBadge}</span>
                            </span>
                            {(mem.userPhone ||
                              mem.source === "whatsapp_voice" ||
                              mem.source === "whatsapp_chat") && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCF8C6] text-[#075E54] border border-[#25D366] mono text-[9px] font-bold">
                                <Smartphone size={9} />
                                <span>From {mem.userPhone || "+91..."}</span>
                              </span>
                            )}
                          </div>
                          <span className="mono text-[10px] font-bold text-[#6E6A63] bg-[#FAF8F3] px-2 py-0.5 rounded-md border border-[#D5D2C8] shrink-0">
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
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* ===============================================================
                  CENTER COLUMN: ZEE'S SINGLE VOICE AND STORY CAPTURE SURFACE
                  (With Integrated Input Channel Switcher: Studio Mic vs WhatsApp Channel)
                 =============================================================== */}
              <section
                className="relative flex min-h-[620px] flex-col overflow-hidden p-0 transition-colors duration-500 lg:h-[calc(100vh-60px)] lg:min-h-[620px] lg:max-h-[calc(100vh-52px)]"
                style={{
                  background:
                    inputChannel === "whatsapp_channel"
                      ? "linear-gradient(180deg, #F0FDF4 0%, #FAF8F3 55%, #DCF8C6 100%)"
                      : `linear-gradient(180deg, #FFFEFB 0%, #FAF8F3 55%, ${CATEGORY_META[selectedPromptCategory].bg} 100%)`,
                }}
              >
                {/* INPUT CHANNEL SWITCHER PILL BAR (Studio Voice Mic vs WhatsApp Cloud Channel) */}
                <div className="order-1 relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[#141414]/10 px-3 py-2">
                  <div className="inline-flex p-1 rounded-full border-2 border-[#141414] bg-white shadow-[2px_2px_0px_#141414]">
                    <button
                      type="button"
                      onClick={() => {
                        setInputChannel("studio_mic");
                        setWaGuardAlert(null);
                      }}
                      className={`px-3 py-1 rounded-full mono text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        inputChannel === "studio_mic"
                          ? "bg-[#141414] text-[#FFE17D]"
                          : "text-[#4A4842] hover:text-[#141414]"
                      }`}
                    >
                      <Mic size={11} />
                      <span>Studio Voice Mic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputChannel("whatsapp_channel")}
                      className={`px-3 py-1 rounded-full mono text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        inputChannel === "whatsapp_channel"
                          ? "bg-[#075E54] text-white"
                          : "text-[#075E54] hover:bg-[#DCF8C6]/60"
                      }`}
                    >
                      <Smartphone size={11} className="text-[#25D366]" />
                      <span>WhatsApp inbox · 2m limit</span>
                    </button>
                  </div>

                  {inputChannel === "whatsapp_channel" ? (
                    <div className="flex items-center gap-1.5 bg-[#DCF8C6] border border-[#25D366] px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-[#075E54] animate-pulse" />
                      <span className="mono text-[9.5px] font-bold text-[#075E54]">
                        From:
                      </span>
                      <input
                        type="text"
                        value={waUserPhone}
                        onChange={(e) => setWaUserPhone(e.target.value)}
                        className="w-28 bg-transparent mono text-[10px] font-black text-[#141414] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <span
                      className="px-2.5 py-1 rounded-full mono text-[9.5px] font-bold border"
                      style={{
                        backgroundColor:
                          CATEGORY_META[selectedPromptCategory].bg,
                        color: CATEGORY_META[selectedPromptCategory].color,
                        borderColor:
                          CATEGORY_META[selectedPromptCategory].color,
                      }}
                    >
                      ● {CATEGORY_META[selectedPromptCategory].label}
                    </span>
                  )}
                </div>

                {/* One capture surface for voice, typing, and WhatsApp notes. */}
                <div className="order-3 relative z-10 mx-0 rounded-none border-x-0 border-b-0 border-t border-[#e5ddd1] bg-white/95 px-3 pb-3 pt-2 shadow-none">
                  <div className="flex items-center gap-3">
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        aria-label={isListeningMic ? "Stop recording" : "Tap to talk"}
                        aria-pressed={isListeningMic}
                        className="relative grid h-[76px] w-[76px] place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a6573d]"
                      >
                        {radialTicks.slice(0, 32).map((tick, index) => (
                          <span
                            key={index}
                            aria-hidden="true"
                            className={`absolute left-1/2 top-1/2 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isListeningMic ? "bg-[#a6573d]" : "bg-[#d9c6b8]"}`}
                            style={{
                              height: `${Math.max(7, Math.round(tick * 0.55))}px`,
                              transform: `rotate(${index * 11.25}deg) translateY(-31px)`,
                            }}
                          />
                        ))}
                        <span className={`relative z-10 grid h-11 w-11 place-items-center rounded-full text-white shadow-md transition ${isListeningMic ? "scale-110 bg-[#292722]" : "bg-[#a6573d] hover:bg-[#87462f]"}`}>
                          <Mic size={19} />
                        </span>
                      </button>
                      <span className="text-[9px] font-semibold text-[#796d62]">{isListeningMic ? "Listening" : "Tap to talk"}</span>
                    </div>
                    <textarea
                      rows={3}
                      value={spokenOrTypedInput}
                      onChange={(event) => setSpokenOrTypedInput(event.target.value)}
                      placeholder={inputChannel === "whatsapp_channel" ? "Add the moment or reply you want saved..." : brain.virtualYou.userName ? `Tell Zee what happened, ${brain.virtualYou.userName}...` : "Tell Zee what happened..."}
                      className="min-h-[76px] w-full resize-y bg-transparent px-1 py-2 text-sm leading-5 text-[#292722] outline-none placeholder:text-[#a39a8e]"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#eee7dd] pt-2">
                    <span className="flex items-center gap-2 text-[10px] text-[#81786c]">
                      {isListeningMic ? <><span className="h-2 w-2 animate-pulse rounded-full bg-[#a6573d]" />Listening {Math.floor(recordingSec / 60)}:{String(recordingSec % 60).padStart(2, "0")}</> : hasRecordedAudio ? "Voice note ready" : isAnalyzingBrain ? analysisStepText || "Zee is listening..." : "Speak, type, or answer Zee"}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" disabled={(!spokenOrTypedInput.trim() && !hasRecordedAudio && !isListeningMic) || isAnalyzingBrain || waIsProcessing || (inputChannel === "whatsapp_channel" && !waUserPhone.trim())} onClick={() => inputChannel === "whatsapp_channel" ? void handleSendWhatsAppChannel({ forceSegregate: true }) : void handleAnalyzeAndSaveToMemory()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#20211d] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#3d3b34] disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={13} />{isAnalyzingBrain || waIsProcessing ? "Saving..." : inputChannel === "whatsapp_channel" ? "Save inbox story" : "Save & ask Zee"}</button>
                    </div>
                  </div>
                </div>

                {/* Conversation surface: the user's memories and Zee's replies live in one chat thread. */}
                <div className="order-2 relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-white/45">
                  <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#e5ddd1] px-3 py-2">
                    {LIFE_CATEGORIES.map((cat) => {
                      const meta = CATEGORY_META[cat];
                      const selected = selectedPromptCategory === cat;
                      return (
                        <button key={cat} type="button" onClick={() => setSelectedPromptCategory(cat)} className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition" style={{ backgroundColor: selected ? meta.color : "white", color: selected ? "white" : meta.color, borderColor: meta.color }}>
                          {CATEGORY_ICONS[cat]} {cat === "work" ? "Work" : meta.shortLabel}
                        </button>
                      );
                    })}
                  </div>

                  <div ref={chatScrollRef} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    {activeConversationItems.map((turn) => (
                      <div key={turn.id} className="space-y-2.5">
                        <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-sm bg-[#a6573d] px-3.5 py-2.5 text-xs leading-5 text-white shadow-sm">
                          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-white/70">You</span>{turn.story}
                        </div>
                        <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-[#e9e0d7] bg-white px-3.5 py-2.5 text-xs leading-5 text-[#37312b] shadow-sm">
                          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-[#a6573d]">Zee</span>{turn.zeeAnalysis}
                        </div>
                      </div>
                    ))}

                    {activeStreamItem ? (
                      <div className="space-y-2.5">
                        <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-sm bg-[#a6573d] px-3.5 py-2.5 text-xs leading-5 text-white shadow-sm">
                          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-white/70">You</span>{activeStreamItem.story}
                        </div>
                        <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-[#e9e0d7] bg-white px-3.5 py-2.5 text-xs leading-5 text-[#37312b] shadow-sm">
                          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-[#a6573d]">Zee</span>
                          <p>{activeStreamItem.zeeAnalysis}</p>
                          <p className="mt-2 border-t border-[#eee7dd] pt-2 font-semibold text-[#554338]">{activeStreamItem.followUpQuestion || activeItemPrompt.followUpQuestion}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-[#e9e0d7] bg-white px-3.5 py-2.5 text-xs leading-5 text-[#37312b] shadow-sm">
                        <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-[#a6573d]">Zee</span>{dynamicZeePrompt.memoryAwareQuestion}
                      </div>
                    )}
                    {isAnalyzingBrain && <div className="flex items-center gap-2 text-[10px] text-[#81786c]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#a6573d]" />{analysisStepText || "Zee is listening..."}</div>}
                  </div>
                </div>
                {/* 2-Min WhatsApp Guard Alert if > 120s */}
                {waGuardAlert && (
                  <div className="order-2 mx-3 mt-2 flex items-center justify-between gap-2 rounded-xl border-2 border-rose-600 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                      <span>{waGuardAlert}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setWaSimDurationSec(90);
                        setWaGuardAlert(null);
                      }}
                      className="px-2 py-0.5 rounded bg-rose-600 text-white mono text-[9.5px] font-bold shrink-0 cursor-pointer"
                    >
                      Set 1:30
                    </button>
                  </div>
                )}

              </section>

              {/* ===============================================================
                  RIGHT COLUMN: ZEE'S LIVE REPLIES, CONVERSATION & STORY ANALYSIS
                  (Zee responds like a friend, asks follow-ups & breaks down the story)
                 =============================================================== */}
              <aside className="flex flex-col bg-gradient-to-b from-[#FAF8F3] to-[#F5F1E8]/60 h-full max-h-[820px]">
                <div className="px-4 pb-4 pt-1.5 border-b border-[#1E1E1C]/10 flex items-center justify-between">
                  <div>
                    <span className="mono text-[10px] font-bold uppercase tracking-widest text-[#E4491B] block">
                      Human-to-Human Analysis
                    </span>
                    <h2 className="serif text-xl font-bold text-[#141414] tracking-tight">
                      Zee&apos;s Reply & Story Breakdown
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#f6e6dc] text-[#925339] mono text-[10px] font-bold">Story partner</span>
                </div>

                {isAnalyzingBrain && <div aria-live="polite" className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-[#e5ddd1] bg-white/80 px-3 py-2 text-[10px] text-[#776d62]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#a6573d]" />Zee is listening to this story and preparing a thoughtful follow-up...</div>}

                {activeStreamItem ? (
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
                            {brain.virtualYou.userName ? `Zee’s reply to ${brain.virtualYou.userName}` : "Zee’s reply to your story"}
                          </div>
                          <div className="serif text-base font-bold text-[#141414]">
                            Here is what I understood
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#1E1E1C] leading-relaxed bg-[#FAF8F3] p-3 rounded-xl border border-[#D5D2C8]">
                        {activeStreamItem.zeeAnalysis}
                      </p>

                      {/* Zee's Memory-Aware Follow-Up Question to Keep the Conversation Flowing */}
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#F6D9CC]/60 to-[#FEF3C7]/60 border border-[#E4491B]/35">
                        <div className="mono text-[9px] font-bold uppercase text-[#E4491B] mb-1">
                          A useful next question
                        </div>
                        <p className="serif text-sm font-bold text-[#141414] leading-snug">
                          &ldquo;{activeStreamItem.followUpQuestion || activeItemPrompt.followUpQuestion}&rdquo;
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPromptCategory(activeStreamItem.category);
                              setInputChannel("studio_mic");
                              setReplyingToMemoryId(activeStreamItem.id);
                              setSpokenOrTypedInput("");
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

                    {activeConversationItems.length > 0 && (
                      <div className="rounded-2xl border border-[#e7dfd5] bg-white/75 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8a7e70]">Earlier in this conversation</p>
                        <div className="mt-2 space-y-2">
                          {activeConversationItems.map((turn) => (
                            <div key={turn.id} className="border-l-2 border-[#d9a485] pl-2.5">
                              <p className="text-[10px] font-semibold text-[#554b41]">{turn.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[#766d63]">{turn.story}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. STORYTELLING HOOK & NARRATIVE SEED (From your lived experience) */}
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

                      {/* 4-BEAT REEL SCRIPT CARD PREVIEW (Decoded from Voice/WhatsApp) */}
                      <div className="pt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="mono text-[10px] font-bold uppercase text-[#141414] flex items-center gap-1">
                            <Clapperboard size={11} className="text-[#E4491B]" />
                            <span>Decoded 4-Beat Reel Script</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectTopicForScript) {
                                onSelectTopicForScript(activeStreamItem.story);
                              } else if (onSwitchToTab) {
                                onSwitchToTab("script");
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#E4491B] hover:bg-[#141414] text-white mono text-[9.5px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <span>Open in Scripting</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-1.5">
                          {(
                            activeStreamItem.scriptBeats ||
                            buildScriptBeatsForStory(
                              activeStreamItem.title,
                              activeStreamItem.story,
                              activeStreamItem.category,
                              activeStreamItem.reelHookIdea
                            )
                          ).map((beat) => (
                            <div
                              key={beat.id}
                              className="p-2.5 rounded-xl bg-[#FAF8F3] border border-[#141414]/15 flex items-start gap-2"
                            >
                              <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#FFE17D] mono text-[9px] font-bold shrink-0 mt-0.5">
                                {beat.label} • {beat.range}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-[#141414] leading-snug">
                                  &ldquo;{beat.text}&rdquo;
                                </p>
                                <p className="mono text-[9.5px] text-[#6E6A63] truncate mt-0.5">
                                  🎬 {beat.visual}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="m-4 rounded-2xl border border-[#e5ddd1] bg-white/80 p-4">
                    <p className="font-serif text-lg text-[#292722]">Zee is ready to learn from you.</p>
                    <p className="mt-2 text-xs leading-5 text-[#766d63]">Share a real moment. Zee will reflect what happened, ask one useful follow-up, and connect your answer to the same conversation.</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">{["Turning points", "People and relationships", "Work and craft", "Goals and ideas", "Voice and boundaries", "Visual taste"].map((topic) => <span key={topic} className="rounded-full border border-[#e8e1d7] bg-[#fbf9f5] px-2.5 py-1 text-[9px] text-[#73685d]">{topic}</span>)}</div>
                  </div>
                )}
              </aside>
            </div>
          </div>

          <section className="overflow-hidden rounded-[26px] border border-[#e5ddd1] bg-[#fffdfa] shadow-[0_16px_48px_rgba(54,42,28,0.06)]">
            <div className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="bg-[#20211d] p-5 text-white sm:p-7">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#e6ad82]">Influence, then make it yours</p>
                <h2 className="mt-2 max-w-sm font-serif text-3xl leading-tight">Borrow the shape. Tell your story.</h2>
                <p className="mt-2 max-w-md text-xs leading-5 text-white/65">Describe what you like about a format, or add a reference link with your notes. Muse saves broad patterns in hooks, pacing and visual rhythm, then builds a fresh version from your own memories and point of view.</p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                  <input type="text" value={reelScanInput} onChange={(event) => setReelScanInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleScanLikedReel(); }} placeholder="Describe the hook, pace or visual rhythm you like" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#e6ad82]" />
                  <button type="button" onClick={() => void handleScanLikedReel()} disabled={!reelScanInput.trim() || isScanningReel} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#e6ad82] px-4 py-2.5 text-xs font-semibold text-[#20211d] transition hover:bg-[#f0bf9a] disabled:cursor-not-allowed disabled:opacity-45"><Sparkles size={13} />{isScanningReel ? "Reading patterns..." : "Save style notes"}</button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-white/45">Reference notes are private to this workspace. The generated work keeps your voice and does not name or copy the source creator.</p>
              </div>
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#a6573d]">From memory to making</p><h3 className="mt-1 font-serif text-2xl text-[#25231f]">What are we shaping next?</h3></div>
                  <span className="text-[10px] text-[#8c8378]">{brain.memories.length} lived stories available</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    { title: "One short story", kind: "reel", note: "A complete, spoken Instagram reel from one real moment." },
                    { title: "A story series", kind: "series", note: "A premise, connected episode angles and a first episode draft." },
                    { title: "A documentary", kind: "documentary", note: "A narrated treatment that connects moments, people and change." },
                  ].map((output) => (
                    <button key={output.kind} type="button" disabled={!activeStreamItem} onClick={() => {
                      if (!activeStreamItem) return;
                      const direction = output.kind === "series"
                        ? "Develop this into an original short-form storytelling series. Give me a series premise, three distinct episode angles, and a complete spoken script for episode one."
                        : output.kind === "documentary"
                        ? "Shape this into an original short documentary narration with a clear point of view, scene progression and an emotionally earned ending."
                        : "Write one complete, natural spoken short-form story from this real memory, with a strong opening, a clear turning point and an honest ending.";
                      onSelectTopicForScript?.(`${direction}\n\nUse this lived memory as the factual source. Keep first-person details accurate, preserve the meaning, and adapt broad structural patterns from my saved style references without mentioning or imitating any creator.\n\nMemory: ${activeStreamItem.story}`);
                    }} className="group rounded-2xl border border-[#e8e1d7] bg-[#fbf9f5] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#c8a08a] hover:bg-white hover:shadow-[0_10px_24px_rgba(71,48,34,0.08)] disabled:cursor-not-allowed disabled:opacity-50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1e2d6] text-[#9c563c] transition group-hover:bg-[#20211d] group-hover:text-white">{output.kind === "series" ? <Layers size={16} /> : output.kind === "documentary" ? <Film size={16} /> : <Clapperboard size={16} />}</div>
                      <h4 className="mt-3 font-serif text-lg text-[#25231f]">{output.title}</h4><p className="mt-1 text-[10px] leading-4 text-[#756d63]">{output.note}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#a6573d]">Take to Script <ArrowRight size={12} /></span>
                    </button>
                  ))}
                </div>
                {brain.likedReels.length > 0 && <div className="mt-4 border-t border-[#eee7dd] pt-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8a7e70]">Saved structure references</p><div className="mt-2 flex flex-wrap gap-2">{brain.likedReels.slice(0, 4).map((reference) => <span key={reference.id} title={`${reference.hookPattern} / ${reference.pacingBpm}`} className="rounded-full border border-[#e8e1d7] bg-white px-3 py-1.5 text-[10px] text-[#675d52]">{reference.detectedFormat} / reusable structure</span>)}</div></div>}
              </div>
            </div>
          </section>

          <BrandIdentityPanel />

          <section className="rounded-[26px] border border-[#e5ddd1] bg-white p-5 shadow-[0_12px_40px_rgba(54,42,28,0.05)] sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71695f]">
                  <Smartphone size={13} className="text-[#55775b]" /> WhatsApp memory route
                  <span className={`rounded-full px-2.5 py-1 text-[9px] tracking-normal ${waSetup.configured ? "bg-[#eef7ee] text-[#55775b]" : "bg-[#f7f1e8] text-[#96744f]"}`}>
                    {waSetup.configured ? "Webhook configured" : "Setup pending"}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-2xl text-[#25231f]">A voice note can become a saved story.</h3>
                <p className="mt-1 text-xs leading-5 text-[#746b60]">
                  Incoming WhatsApp messages enter the story organizer at <code className="rounded bg-[#f6f2eb] px-1.5 py-0.5 text-[10px]">{waSetup.webhookUrl}</code>. Once the owner connection is set up, sync the sorted stories into this same memory gallery.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => { setActiveSubTab("personalize"); setInputChannel("whatsapp_channel"); }} className="rounded-xl border border-[#ded5c9] bg-[#faf8f4] px-4 py-2.5 text-xs font-semibold text-[#51483e] transition hover:border-[#b58d71] hover:bg-white">
                  Open inbox
                </button>
                <button type="button" onClick={() => void syncWhatsAppStories()} disabled={!waSetup.memorySyncEnabled} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#315f4d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#274d3e] disabled:cursor-not-allowed disabled:opacity-45">
                  <RefreshCw size={13} /> Sync stories
                </button>
              </div>
            </div>
            {waSyncMessage && <p aria-live="polite" className="mt-3 text-xs text-[#746b60]">{waSyncMessage}</p>}
            {!waSetup.configured && <p className="mt-3 text-[10px] leading-4 text-[#978e82]">The route is in place. Add the WhatsApp Cloud API credentials to enable real incoming messages; the editor’s inbox preview does not claim a live WhatsApp connection.</p>}
          </section>
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
                      Visible only in Admin Mode. These variables bind your saved context across Scripting, Editing, and Publishing.
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
           4) BOTTOM VAULT DOCK (Google Drive, Complete Folder Linker, Partner Photos, WhatsApp Channel)
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          `Linked Partner Sharing (${val}) into your Creative Gallery Wallet!`
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

              {/* 4. WHATSAPP CLOUD API INPUT CHANNEL (Connected directly inside the existing Connection Dock!) */}
              <div className="p-4 rounded-2xl border-2 border-[#141414] bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCF8C6]/65 flex flex-col justify-between gap-3 shadow-[2px_2px_0px_#075E54]">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-[#141414] flex items-center gap-1.5">
                      <Smartphone size={14} className="text-[#075E54]" />
                      <span>4. WhatsApp Channel</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#DCF8C6] border border-[#25D366] text-[#075E54] mono text-[10px] font-bold">
                      {waSetup.configured ? "Webhook connected" : "Setup pending"}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={waUserPhone}
                    onChange={(e) => setWaUserPhone(e.target.value)}
                    placeholder="+91 98450 24110"
                    className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[#075E54]/35 bg-white text-xs font-bold text-[#141414] placeholder:text-[#9A978E] focus:outline-none focus:border-[#075E54]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInputChannel("whatsapp_channel");
                    setActiveSubTab("personalize");
                    setSyncSuccessMessage(
                      `WhatsApp inbox selected. Incoming stories are routed through ${waSetup.webhookUrl}.`
                    );
                  }}
                  className="w-full py-2 px-3 rounded-xl border-2 border-[#141414] bg-[#075E54] hover:bg-[#25D366] hover:text-[#141414] text-white mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Smartphone size={12} />
                  <span>Use WhatsApp Channel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
