"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Copy,
  Mic,
  LockKeyhole,
  LoaderCircle,
  MicOff,
  Play,
  Send,
  Sparkles,
  UnlockKeyhole,
  Video,
  Smartphone,
  ExternalLink,
  X,
} from "lucide-react";
import { useZeeBrain, type MemoryBankItem } from "@/lib/zee-brain";
import Pip from "@/components/Pip";

type ScriptBeat = {
  phase?: string;
  spokenLine: string;
  deliveryCue?: string;
  visualCutaway?: string;
  bRollWindow?: string;
  durationSec?: number;
};

type ScriptHook = { hookText: string; badge?: string; whyItWorks?: string };
type ScriptQualityReview = { status?: string; reviewer?: string; summary?: string; concerns?: string[] };
type ScriptFormatInfluence = { creatorStyle?: string; detectedFormat?: string; hookPattern?: string; pacingBpm?: string; source?: string };
type StoryQuestionOption = { label: string; direction: string };
type StoryQuestion = { question: string; context?: string; options: StoryQuestionOption[] };

type ScriptDraft = {
  title: string;
  directorNote?: string;
  treatment?: string;
  loopPayoff?: string;
  targetDurationSec?: number;
  hooks?: ScriptHook[];
  storyQuestions?: StoryQuestion[];
  qualityReview?: ScriptQualityReview;
  whyThisWorks?: string;
  formatInfluence?: ScriptFormatInfluence;
  agentFlow?: { memory?: string; writer?: string };
  beats: ScriptBeat[];
};

type ChatLine = { role: "z" | "you"; text: string };

interface ScriptRoomProps {
  onSwitchToStudio?: (fullScriptText?: string, title?: string) => void;
  onCompleteRecordingToStudio?: (videoFile: File, fullScriptText: string, title: string) => void;
  initialTopicFromYou?: string;
}

const memoryPalette = ["#f3d6b7", "#f8c9c0", "#d8d0ff", "#c8eadb", "#f3e5a9"];
const scriptLengthOptions = [30, 45, 60, 90, 120] as const;
type ScriptLength = (typeof scriptLengthOptions)[number];
const durationLabel = (seconds: number) => seconds === 90 ? "1:30" : seconds === 120 ? "2:00" : `${seconds}s`;
const memoryMarks: Record<string, string> = { insight: "I", work: "W", travel: "T", personal: "P", family: "F", relationships: "R" };
const memoryBrainNodes: [number, number][] = [[182, 26], [193, 20], [207, 26], [180, 37], [195, 34], [211, 38], [185, 49], [201, 48], [217, 49], [192, 59], [207, 59]];

function finalizedScriptKey(scope: string, title: string, text: string) {
  const input = `${scope}\u0000${title}\u0000${text}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `final-script-${(hash >>> 0).toString(36)}`;
}

function MemoryDoodle({ category }: { category: string }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 2.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 48 48" className="h-8 w-8 -rotate-6 text-[#785f4c]" aria-hidden="true">
    {category === "work" ? <><path {...shared} d="M9 9c7-3 14-2 19 1v29c-5-4-12-4-19-1zM28 10c4-3 8-3 12-1v29c-4-2-8-2-12 1"/><path {...shared} d="M13 16c4-1 8-1 11 1M13 22c4-1 8-1 11 1M32 17l5-2M32 23l5-2"/></>
      : category === "travel" ? <><circle {...shared} cx="35" cy="12" r="5"/><path {...shared} d="M5 37l12-15 8 9 6-7 12 13zM7 41c10-3 24 4 35-1"/><path {...shared} d="M9 12c4-3 8-3 11 0"/></>
      : category === "personal" ? <><circle {...shared} cx="23" cy="16" r="7"/><path {...shared} d="M10 39c1-8 6-12 13-12s12 4 14 12"/><path {...shared} d="M35 13c3-4 9-1 7 4l-7 7-6-7c-2-4 3-7 6-4z"/></>
      : category === "family" ? <><path {...shared} d="M6 23L24 8l18 15M11 21v19h26V21"/><circle {...shared} cx="20" cy="27" r="3"/><circle {...shared} cx="29" cy="27" r="3"/><path {...shared} d="M15 37c1-4 3-6 5-6s4 2 5 6M25 37c1-4 2-6 4-6s4 2 5 6"/></>
      : category === "relationships" ? <><path {...shared} d="M24 39S7 29 9 18c1-8 11-9 15-2 4-7 14-6 15 2 2 11-15 21-15 21z"/><path {...shared} d="M5 12c2-3 5-4 8-3M35 7c3 0 6 2 8 5"/></>
      : <><path {...shared} d="M24 7l4 11 12 1-9 8 3 12-10-7-10 7 3-12-9-8 12-1z"/><path {...shared} d="M7 6l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></>}
  </svg>;
}
const hookAngles: Record<string, string[]> = {
  insight: ["A small truth I learned", "I used to believeâ€¦", "The moment it clicked"],
  work: ["The part nobody sees", "One decision changed it", "A lesson from the hard day"],
  travel: ["I almost missed this", "A place that stayed with me", "The quiet moment before"],
  personal: ["A note I needed then", "I didn't expect this", "One honest thing"],
  family: ["A moment at our table", "What they taught me", "The little thing I remember"],
  relationships: ["A conversation I kept", "What changed between us", "The truth we don't say"],
};
const ctaAngles: Record<string, string[]> = {
  insight: ["What changed your mind?", "Tell me what you noticed."],
  work: ["What did you learn the hard way?", "Share the moment it clicked."],
  travel: ["Where would you go next?", "What place stayed with you?"],
  personal: ["What would you tell your past self?", "Have you felt this too?"],
  family: ["What small moment do you keep?", "Who came to mind?"],
  relationships: ["What would you say now?", "What conversation mattered?"],
};

function draftText(draft: ScriptDraft | null) {
  return draft?.beats.map((beat) => beat.spokenLine).filter(Boolean).join("\n\n") || "";
}

function readDraft(value: any, fallbackTitle: string, fallbackTargetSeconds = 45): ScriptDraft | null {
  const beats = Array.isArray(value?.beats)
    ? value.beats
        .map((beat: any) => ({
          phase: String(beat.phase || beat.label || ""),
          spokenLine: String(beat.spokenLine || beat.text || "").trim(),
          deliveryCue: String(beat.deliveryCue || beat.coaching || "").trim(),
          visualCutaway: String(beat.visualCutaway || "").trim(),
          bRollWindow: String(beat.bRollWindow || "").trim(),
          durationSec: Number(beat.durationSec) || undefined,
        }))
        .filter((beat: ScriptBeat) => beat.spokenLine)
    : [];
  if (!beats.length) return null;
  return {
    title: String(value.title || fallbackTitle),
    directorNote: String(value.zDirectorNote || value.zeeDirectorNote || ""),
    treatment: String(value.treatment || "").trim(),
    loopPayoff: String(value.loopPayoff || "").trim(),
    targetDurationSec: Number(value.targetDurationSec) || fallbackTargetSeconds,
    qualityReview: value.qualityReview && typeof value.qualityReview === "object" ? value.qualityReview : undefined,
    whyThisWorks: String(value.whyThisWorks || "").trim(),
    formatInfluence: value.formatInfluence && typeof value.formatInfluence === "object" ? value.formatInfluence : undefined,
    agentFlow: value.agentFlow && typeof value.agentFlow === "object" ? value.agentFlow : undefined,
    hooks: Array.isArray(value.hooks)
      ? value.hooks.map((hook: any) => ({
          hookText: String(hook.hookText || hook.text || "").trim(),
          badge: String(hook.badge || "").trim(),
          whyItWorks: String(hook.whyItWorks || "").trim(),
        })).filter((hook: ScriptHook) => hook.hookText).slice(0, 3)
      : [],
    storyQuestions: Array.isArray(value.storyQuestions)
      ? value.storyQuestions.map((item: any) => ({
          question: String(item.question || "").trim(),
          context: String(item.context || "").trim(),
          options: Array.isArray(item.options)
            ? item.options.map((option: any) => ({ label: String(option.label || "").trim(), direction: String(option.direction || "").trim() })).filter((option: StoryQuestionOption) => option.label && option.direction).slice(0, 3)
            : [],
        })).filter((item: StoryQuestion) => item.question && item.options.length > 0).slice(0, 2)
      : [],
    beats,
  };
}

export default function ScriptRoom({
  onSwitchToStudio,
  onCompleteRecordingToStudio,
  initialTopicFromYou = "",
}: ScriptRoomProps) {
  const { brain, hydrated, addSpokenOrTypedMemory } = useZeeBrain();
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ScriptDraft>>({});
  const [storyMode, setStoryMode] = useState<"memory" | "direct">("memory");
  const [standaloneDraft, setStandaloneDraft] = useState<ScriptDraft | null>(null);
  const [standaloneStory, setStandaloneStory] = useState("");
  const [standaloneLocked, setStandaloneLocked] = useState(false);
  const [lockedDrafts, setLockedDrafts] = useState<Record<string, boolean>>({});
  const [locksReady, setLocksReady] = useState(false);
  const [draftsReady, setDraftsReady] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState("");
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [message, setMessage] = useState("");
  const [scriptLength, setScriptLength] = useState<ScriptLength>(45);
  const [draftView, setDraftView] = useState<"storyboard" | "complete">("storyboard");
  const [memoryRailOpen, setMemoryRailOpen] = useState(true);
  const [inspirationRailOpen, setInspirationRailOpen] = useState(true);
  const [voiceCapturing, setVoiceCapturing] = useState(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastDictation, setLastDictation] = useState("");
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [livePreviewSupported, setLivePreviewSupported] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [workingSeconds, setWorkingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [mobileSessionId, setMobileSessionId] = useState("");
  const [mobileLanIp, setMobileLanIp] = useState("");
  const [mobileStatus, setMobileStatus] = useState<"waiting_for_mobile" | "mobile_connected" | "recording" | "completed">("waiting_for_mobile");
  const [instagramPlanOpen, setInstagramPlanOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [toast, setToast] = useState("");
  const [brainFeedCount, setBrainFeedCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef("");
  const voiceTakeIdRef = useRef(0);
  const transcribeAbortRef = useRef<AbortController | null>(null);
  const scriptAbortRef = useRef<AbortController | null>(null);
  const pendingMemoryDraftsRef = useRef(new Map<string, Promise<ScriptDraft>>());
  const mobileUploadHandledRef = useRef(false);

  const memories = brain.memories;
  const defaultMemory = memories.find((item) => item.category === "insight") || memories.find((item) => item.category === "travel") || memories.find((item) => item.category === "personal") || memories[0] || null;
  const activeMemory = memories.find((item) => item.id === selectedId) || defaultMemory;
  const activeDraft = storyMode === "direct" ? standaloneDraft : activeMemory ? drafts[activeMemory.id] || null : null;
  const mobileRecordUrl = useMemo(() => {
    if (!mobileSessionId || typeof window === "undefined") return "";
    const hostname = window.location.hostname;
    const host = (hostname === "localhost" || hostname === "127.0.0.1") && mobileLanIp ? mobileLanIp : hostname;
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//${host}${port}/mobile-record?session=${encodeURIComponent(mobileSessionId)}`;
  }, [mobileLanIp, mobileSessionId]);
  const scriptWordCount = draftText(activeDraft).trim().split(/\s+/).filter(Boolean).length;
  const estimateText = activeDraft ? draftText(activeDraft) : lastDictation || message || (storyMode === "direct" ? standaloneStory : activeMemory?.story || "");
  const estimateWords = estimateText.trim().split(/\s+/).filter(Boolean).length;
  const estimateSeconds = estimateWords ? Math.max(1, Math.ceil((estimateWords / 145) * 60 * 1.12)) : 0;
  const suggestedScriptLength = estimateSeconds > 0 && estimateSeconds <= 120 ? scriptLengthOptions.find((seconds) => seconds >= estimateSeconds) || 120 : null;
  const savedReels = brain.likedReels;
  const scriptLocked = storyMode === "direct" ? standaloneLocked : Boolean(activeMemory && lockedDrafts[activeMemory.id]);
  const zIsWorking = loadingScript || chatLoading;
  const dictationActive = voiceCapturing || voiceTranscribing || Boolean(pendingTranscript);
  const topPicks = useMemo(() => {
    const preferredOrder = ["insight", "travel", "personal", "work", "family", "relationships"];
    return [...memories]
      .sort((a, b) => {
        const aRank = preferredOrder.indexOf(a.category);
        const bRank = preferredOrder.indexOf(b.category);
        return (aRank < 0 ? preferredOrder.length : aRank) - (bRank < 0 ? preferredOrder.length : bRank);
      })
      .slice(0, 3);
  }, [memories]);
  const activeHooks = activeMemory ? hookAngles[activeMemory.category] || hookAngles.personal : hookAngles.personal;
  const hookOptions: ScriptHook[] = activeDraft?.hooks?.length ? activeDraft.hooks : activeHooks.map((hook) => ({ hookText: hook }));
  const activeCtas = activeMemory ? ctaAngles[activeMemory.category] || ctaAngles.personal : ctaAngles.personal;
  const railLayoutClass = memoryRailOpen
    ? (inspirationRailOpen ? "md:grid-cols-[150px_minmax(0,1fr)_205px] xl:grid-cols-[205px_minmax(0,1fr)_258px]" : "md:grid-cols-[150px_minmax(0,1fr)_38px] xl:grid-cols-[205px_minmax(0,1fr)_38px]")
    : (inspirationRailOpen ? "md:grid-cols-[38px_minmax(0,1fr)_205px] xl:grid-cols-[38px_minmax(0,1fr)_258px]" : "md:grid-cols-[38px_minmax(0,1fr)_38px]");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("paper-studio-script-drafts-v2");
      if (saved) setDrafts(JSON.parse(saved));
      const directSaved = window.localStorage.getItem("paper-studio-direct-story-v1");
      if (directSaved) {
        const parsed = JSON.parse(directSaved);
        if (parsed?.draft) setStandaloneDraft(readDraft(parsed.draft, "A story from today"));
        if (typeof parsed?.source === "string") setStandaloneStory(parsed.source);
      }
      const savedLocks = window.localStorage.getItem("paper-studio-script-locks-v1");
      if (savedLocks) setLockedDrafts(JSON.parse(savedLocks));
    } catch {
      // A malformed local draft should not prevent the scripting page from opening.
    } finally {
      setLocksReady(true);
      setDraftsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftsReady) return;
    try {
      window.localStorage.setItem("paper-studio-direct-story-v1", JSON.stringify({ draft: standaloneDraft, source: standaloneStory }));
    } catch {
      setToast("This browser could not save the standalone story locally.");
    }
  }, [draftsReady, standaloneDraft, standaloneStory]);

  useEffect(() => {
    if (!locksReady) return;
    try {
      window.localStorage.setItem("paper-studio-script-locks-v1", JSON.stringify(lockedDrafts));
    } catch {
      // Lock state is a convenience; a storage error should not block scripting.
    }
  }, [lockedDrafts, locksReady]);

  useEffect(() => {
    if (!draftsReady) return;
    try {
      window.localStorage.setItem("paper-studio-script-drafts-v2", JSON.stringify(drafts));
    } catch {
      setToast("This browser could not save the script draft locally.");
    }
  }, [drafts, draftsReady]);

  useEffect(() => {
    if (!zIsWorking) {
      setWorkingSeconds(0);
      return;
    }
    setWorkingSeconds(0);
    const timer = setInterval(() => setWorkingSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [zIsWorking]);

  useEffect(() => {
    if (!hydrated || !memories.length) return;
    if (!selectedId || !memories.some((memory) => memory.id === selectedId)) {
      const firstPick = memories.find((memory) => memory.category === "insight") || memories.find((memory) => memory.category === "travel") || memories.find((memory) => memory.category === "personal") || memories[0];
      setSelectedId(firstPick.id);
    }
  }, [hydrated, memories, selectedId]);

  const requestScript = useCallback(
    async (memory: MemoryBankItem | null, instruction = "", existing?: ScriptDraft | null, directStory = "") => {
      setScriptError("");
      const controller = new AbortController();
      scriptAbortRef.current = controller;
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 140_000);
      let response: Response;
      try {
        response = await fetch("/api/script-brain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
          userName: brain.virtualYou.userName,
          targetSeconds: scriptLength,
          storyMode: memory ? "memory" : "direct",
          storyIdea: memory ? [memory.title, memory.story, memory.reelHookIdea].filter(Boolean).join("\n\n") : directStory,
          memoriesSummary: memory ? memories
            .map((item) => `${item.title}: ${item.story}`)
            .join("\n\n") : "",
          instagramTaste: savedReels
            .map((reel) => [reel.detectedFormat, reel.hookPattern, reel.inputUrlOrNote].filter(Boolean).join(" â€” "))
            .join("\n"),
          creatorVoice: {
            voiceCadence: brain.virtualYou.voiceCadence,
            thinkingStyle: brain.virtualYou.thinkingStyle,
            signaturePhrases: brain.virtualYou.signaturePhrases,
            preferredFormat: brain.virtualYou.preferredFormat,
            brandIdentity: brain.brandProfile,
            emotion: memory?.emotionTone,
          },
          userInstruction: instruction,
          currentScript: existing
            ? { title: existing.title, beats: existing.beats, targetDurationSec: existing.targetDurationSec, formatInfluence: existing.formatInfluence }
            : undefined,
          }),
        });
      } catch (error: any) {
        if (controller.signal.aborted) throw new Error(timedOut ? "Z took too long to finish this draft. Your story is still saved; please retry." : "Script writing was cancelled.");
        throw error;
      } finally {
        clearTimeout(timeout);
        if (scriptAbortRef.current === controller) scriptAbortRef.current = null;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Z could not create the script. Check the model API setup and retry.");
      }
      const next = readDraft(payload.data, memory?.title || "A story from today", scriptLength);
      if (!next) throw new Error("Z returned an empty script. Try generating again.");
      if (memory) {
        setDrafts((previous) => ({ ...previous, [memory.id]: next }));
        setLockedDrafts((previous) => ({ ...previous, [memory.id]: false }));
      } else {
        setStandaloneDraft(next);
        setStandaloneLocked(false);
      }
      return next;
    },
    [brain.virtualYou, brain.brandProfile, memories, savedReels, scriptLength]
  );

  const requestMemoryDraftOnce = useCallback((memory: MemoryBankItem, instruction = "") => {
    const pending = pendingMemoryDraftsRef.current.get(memory.id);
    if (pending) return pending;
    const draftRequest = requestScript(memory, instruction).finally(() => {
      pendingMemoryDraftsRef.current.delete(memory.id);
    });
    pendingMemoryDraftsRef.current.set(memory.id, draftRequest);
    return draftRequest;
  }, [requestScript]);

  const generateScript = useCallback(async () => {
    if (loadingScript || (storyMode === "memory" && !activeMemory) || (storyMode === "direct" && !standaloneStory.trim())) return;
    setLoadingScript(true);
    try {
      const next = await requestScript(storyMode === "memory" ? activeMemory : null, `Write a fresh complete spoken storytelling script near ${scriptLength} seconds. Keep every personal detail grounded in the supplied source.`, storyMode === "direct" ? standaloneDraft : undefined, storyMode === "direct" ? standaloneStory : "");
      setChat([
        {
          role: "z",
          text: next.directorNote || (storyMode === "memory" ? `I shaped “${activeMemory?.title}” into a spoken script from your saved memory. Tell me what to change, and I’ll revise it here.` : "I shaped your spoken account into a story. Tell me what still needs to sound more like you."),
        },
      ]);
    } catch (error: any) {
      setScriptError(error?.message || "Could not create the script.");
    } finally {
      setLoadingScript(false);
    }
  }, [activeMemory, loadingScript, requestScript, scriptLength, storyMode, standaloneStory, standaloneDraft]);

  useEffect(() => {
    if (!draftsReady || storyMode !== "memory" || !activeMemory) return;
    if (drafts[activeMemory.id]) {
      setLoadingScript(false);
      setChat([{ role: "z", text: `Your saved draft for â€œ${activeMemory.title}â€ is ready. Tell me what you want to reshape.` }]);
      return;
    }
    let cancelled = false;
    setLoadingScript(true);
    requestMemoryDraftOnce(activeMemory, initialTopicFromYou ? `Use this as the creative focus: ${initialTopicFromYou}` : "")
      .then((next) => {
        if (!cancelled) {
          setChat([
            {
              role: "z",
              text: next.directorNote || `Iâ€™ve started with â€œ${activeMemory.title}â€. This draft stays grounded in the memory you saved.`,
            },
          ]);
        }
      })
      .catch((error: any) => {
        if (!cancelled) setScriptError(error?.message || "Could not create the script.");
      })
      .finally(() => {
        if (!cancelled) setLoadingScript(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMemory?.id, activeMemory?.title, draftsReady, initialTopicFromYou, requestMemoryDraftOnce, storyMode]);

  const selectMemory = (memory: MemoryBankItem) => {
    setStoryMode("memory");
    setSelectedId(memory.id);
    if (drafts[memory.id]?.targetDurationSec && scriptLengthOptions.includes(drafts[memory.id].targetDurationSec as ScriptLength)) setScriptLength(drafts[memory.id].targetDurationSec as ScriptLength);
    setDraftView("storyboard");
    setScriptError("");
    setChat([]);
    if (drafts[memory.id]) {
      setChat([{ role: "z", text: `Weâ€™re back with â€œ${memory.title}â€. The saved draft is ready; tell me what you want to reshape.` }]);
    } else if (pendingMemoryDraftsRef.current.has(memory.id)) {
      setChat([{ role: "z", text: `Z is already shaping “${memory.title}”. This first draft will be saved to that memory so you can reopen it without another model call.` }]);
    }
  };

  const sendToZ = async (instruction = message, formatInfluence?: ScriptFormatInfluence) => {
    const clean = instruction.trim();
    if (!clean || chatLoading || (storyMode === "memory" && (!activeMemory || loadingScript || !activeDraft))) return;
    setMessage("");
    if (storyMode === "memory" && activeMemory) setLockedDrafts((previous) => ({ ...previous, [activeMemory.id]: false }));
    else setStandaloneLocked(false);
    setChat((items) => [...items, { role: "you", text: clean }]);
    setChatLoading(true);
    try {
      if (storyMode === "direct") {
        const current = standaloneDraft;
        const source = current ? (standaloneStory || clean) : clean;
        if (!current) setStandaloneStory(clean);
        const instruction = current ? clean : `Turn this rough spoken account into a complete, emotionally honest storytelling script. Keep the creator's real details and natural voice. Spoken account: ${clean}`;
        const next = await requestScript(null, instruction, current, source);
        setChat((items) => [...items, { role: "z", text: next.directorNote || (current ? "I reshaped the story with your direction. Tell me what still feels unlike you." : "I turned what you just told me into a story-led script. Read it and tell me what to adjust.") }]);
      } else if (activeMemory) {
        const current = activeDraft;
        if (!current) throw new Error("Z is still preparing this memory’s first draft. Try again once it appears.");
        const drafted = await requestScript(activeMemory, clean, current);
        const next = { ...drafted, formatInfluence: formatInfluence || drafted.formatInfluence || current.formatInfluence };
        setDrafts((previous) => ({ ...previous, [activeMemory.id]: next }));
        setChat((items) => [...items, { role: "z", text: next.directorNote || "I revised the script using your direction. Read it through and tell me if a line still doesn’t sound like you." }]);
      }
    } catch (error: any) {
      setChat((items) => [...items, { role: "z", text: error?.message || "I couldnâ€™t update the script just now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleVoiceInput = async () => {
    const recorder = voiceRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      try { speechRecognitionRef.current?.stop(); } catch { /* The browser may already have stopped recognition. */ }
      setVoiceCapturing(false);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setToast("Voice input needs a browser with microphone recording support.");
      setTimeout(() => setToast(""), 3200);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const voiceTakeId = ++voiceTakeIdRef.current;
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      setLiveTranscript("");
      liveTranscriptRef.current = "";
      setLastDictation("");
      setPendingTranscript("");
      setTranscriptExpanded(true);
      const speechWindow = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
      const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      setLivePreviewSupported(Boolean(SpeechRecognition));
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = "en-IN";
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            const words = Array.from(event.results as ArrayLike<any>).map((result: any) => result?.[0]?.transcript || "").filter(Boolean).join(" ").trim();
            if (words) {
              liveTranscriptRef.current = words;
              setLiveTranscript(words);
            }
          };
          recognition.onerror = () => { /* Final transcription still comes from the app's Whisper endpoint. */ };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          speechRecognitionRef.current = null;
          setLivePreviewSupported(false);
        }
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const voiceRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voiceRecorderRef.current = voiceRecorder;
      voiceRecorder.ondataavailable = (event) => {
        if (event.data.size) voiceChunksRef.current.push(event.data);
      };
      voiceRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
        if (voiceRecorderRef.current === voiceRecorder) voiceRecorderRef.current = null;
        setVoiceCapturing(false);
        if (voiceTakeIdRef.current !== voiceTakeId) return;
        const audioBlob = new Blob(voiceChunksRef.current, { type: voiceRecorder.mimeType || "audio/webm" });
        if (!audioBlob.size) return;
        setVoiceTranscribing(true);
        const abortController = new AbortController();
        transcribeAbortRef.current = abortController;
        try {
          const form = new FormData();
          const audioExtension = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
          form.append("audio", new File([audioBlob], `script-voice.${audioExtension}`, { type: audioBlob.type }));
          const response = await fetch("/api/script-brain/transcribe", { method: "POST", body: form, signal: abortController.signal });
          if (voiceTakeIdRef.current !== voiceTakeId) return;
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.success || !result.transcript) throw new Error(result?.error || "Voice transcription failed.");
          const transcript = String(result.transcript).trim();
          liveTranscriptRef.current = transcript;
          setLastDictation(transcript);
          setPendingTranscript(transcript);
          setLiveTranscript(transcript);
          setTranscriptExpanded(false);
        } catch (error: any) {
          if (abortController.signal.aborted || voiceTakeIdRef.current !== voiceTakeId) return;
          const browserTranscript = liveTranscriptRef.current.trim();
          if (browserTranscript) {
            setLastDictation(browserTranscript);
            setPendingTranscript(browserTranscript);
            setLiveTranscript(browserTranscript);
            setTranscriptExpanded(false);
            setToast("Final voice check failed. Review the live transcript before using it.");
          } else {
            setToast(error?.message || "Voice transcription failed. You can type your direction instead.");
          }
        } finally {
          if (transcribeAbortRef.current === abortController) transcribeAbortRef.current = null;
          if (voiceTakeIdRef.current === voiceTakeId) setVoiceTranscribing(false);
          setTimeout(() => setToast(""), 3600);
        }
      };
      voiceRecorder.start();
      setVoiceCapturing(true);
    } catch {
      setToast("Allow microphone access to speak a story or script change.");
      setTimeout(() => setToast(""), 3200);
    }
  };

  const cancelVoiceInput = () => {
    voiceTakeIdRef.current += 1;
    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = null;
    if (voiceRecorderRef.current?.state === "recording") voiceRecorderRef.current.stop();
    try { speechRecognitionRef.current?.stop(); } catch { /* Recognition may already have stopped. */ }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    voiceRecorderRef.current = null;
    voiceChunksRef.current = [];
    liveTranscriptRef.current = "";
    setVoiceCapturing(false);
    setVoiceTranscribing(false);
    setLiveTranscript("");
    setLastDictation("");
    setPendingTranscript("");
    setTranscriptExpanded(false);
    setToast("Voice note discarded.");
    setTimeout(() => setToast(""), 2400);
  };

  const useVoiceTranscript = () => {
    const transcript = pendingTranscript.trim();
    if (!transcript || chatLoading) return;
    setPendingTranscript("");
    setToast("");
    void sendToZ(transcript);
  };

  const cancelScriptRequest = () => {
    scriptAbortRef.current?.abort();
    scriptAbortRef.current = null;
    setLoadingScript(false);
    setChatLoading(false);
  };

  const completeRewrite = () => {
    void sendToZ(`Completely rewrite the whole script from beginning to end. Keep the selected target length of ${scriptLength} seconds. Use my selected memory, voice, and any saved format structure. Replace the wording and arc rather than making small edits. Sound like a person speaking naturally; do not repeat generic slogans.`);
  };

  const reuseReelFormat = (reel: (typeof savedReels)[number]) => {
    if (!activeMemory) return;
    if (storyMode !== "memory") {
      setStoryMode("memory");
      setToast("Select a memory to adapt this saved format to.");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    void sendToZ(`Use the structure of this saved Reel reference for my selected memory, ${activeMemory.title}: creator style ${reel.creatorStyle}; format ${reel.detectedFormat}; hook pattern ${reel.hookPattern}; pacing ${reel.pacingBpm}. Write a fresh version grounded only in my memory and voice. Borrow the structure, never the creator's wording or personal details. Do not say this reference is viral unless its performance evidence is supplied.`, {
      creatorStyle: reel.creatorStyle,
      detectedFormat: reel.detectedFormat,
      hookPattern: reel.hookPattern,
      pacingBpm: reel.pacingBpm,
      source: reel.inputUrlOrNote,
    });
  };

  const copyScript = async () => {
    if (!activeDraft) return;
    await navigator.clipboard?.writeText(draftText(activeDraft));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const toggleScriptLock = () => {
    if (!activeDraft) return;
    const nextLocked = !scriptLocked;
    if (nextLocked) {
      const fullScript = draftText(activeDraft);
      const scope = storyMode === "direct" ? "direct" : activeMemory?.id || "memory";
      const finalizedScriptId = finalizedScriptKey(scope, activeDraft.title, fullScript);
      const alreadySaved = brain.memories.some((memory) => memory.finalizedScriptId === finalizedScriptId);
      if (!alreadySaved) {
        let elapsed = 0;
        const fallbackBeatLength = Math.max(1, Math.round((activeDraft.targetDurationSec || scriptLength) / activeDraft.beats.length));
        const scriptBeats = activeDraft.beats.map((beat, index) => {
          const durationSec = beat.durationSec || fallbackBeatLength;
          const start = elapsed;
          elapsed += durationSec;
          return {
            id: index + 1,
            label: index === 0 ? "HOOK" : index === activeDraft.beats.length - 1 ? "PAYOFF" : "TRANSFORM",
            range: `${start}-${elapsed}s`,
            text: beat.spokenLine,
            visual: beat.visualCutaway || "",
            motion: "",
            voice: beat.deliveryCue || "",
            coaching: beat.deliveryCue || "",
            durationSec,
          };
        });
        const category = storyMode === "memory" ? activeMemory?.category : undefined;
        addSpokenOrTypedMemory(fullScript, category, "text_chat", {
          finalizedScriptId,
          category,
          title: activeDraft.title,
          story: fullScript,
          zeeAnalysis: "Finalized in Script Room and saved to your story brain as the approved spoken version.",
          emotionTone: storyMode === "memory" ? activeMemory?.emotionTone : undefined,
          tags: ["final script", category || "personal"],
          reelHookIdea: activeDraft.hooks?.[0]?.hookText || activeDraft.beats[0]?.spokenLine || activeDraft.title,
          scriptBeats,
          durationLabel: `${activeDraft.targetDurationSec || scriptLength}s spoken script`,
        });
        setBrainFeedCount((count) => count + 1);
        setToast("Locked and saved to your story brain.");
        setTimeout(() => setToast(""), 2800);
      } else {
        setToast("This finalized script is already in your story brain.");
        setTimeout(() => setToast(""), 2400);
      }
    }
    if (storyMode === "direct") setStandaloneLocked(nextLocked);
    else if (activeMemory) setLockedDrafts((previous) => ({ ...previous, [activeMemory.id]: nextLocked }));
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const openRecording = async () => {
    if (!activeDraft) return;
    const sessionId = `script-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    mobileUploadHandledRef.current = false;
    setMobileSessionId(sessionId);
    setMobileLanIp("");
    setMobileStatus("waiting_for_mobile");
    setRecordingOpen(true);
    try {
      const response = await fetch("/api/script-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userName: brain.virtualYou.userName,
          title: activeDraft.title,
          beats: activeDraft.beats.map((beat, index) => ({
            id: index + 1,
            phase: beat.phase || `Beat ${index + 1}`,
            spokenLine: beat.spokenLine,
            deliveryCue: beat.deliveryCue || "",
            visualCutaway: beat.visualCutaway || "",
            durationSec: beat.durationSec || 4,
          })),
          status: "waiting_for_mobile",
          activeBeatIndex: 0,
          isPlaying: false,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Could not start the phone recording session.");
      if (payload.lanIp) setMobileLanIp(payload.lanIp);
    } catch (error: any) {
      setToast(error?.message || "Could not connect to the phone recording session.");
      setTimeout(() => setToast(""), 3500);
    }
  };

  useEffect(() => {
    if (!recordingOpen || !mobileSessionId) return;
    let active = true;
    let polling = false;
    const syncPhoneTake = async () => {
      if (!active || polling || mobileUploadHandledRef.current) return;
      polling = true;
      try {
        const response = await fetch(`/api/script-session?sessionId=${encodeURIComponent(mobileSessionId)}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.lanIp) setMobileLanIp(payload.lanIp);
        const session = payload.session;
        if (!session) return;
        setMobileStatus(session.status);
        if (session.status === "completed" && session.hasVideo) {
          mobileUploadHandledRef.current = true;
          const mediaResponse = await fetch(`/api/script-session?sessionId=${encodeURIComponent(mobileSessionId)}&media=1`, { cache: "no-store" });
          if (!mediaResponse.ok) throw new Error("The phone take was sent, but could not be downloaded to this device.");
          const blob = await mediaResponse.blob();
          const file = new File([blob], session.videoFileName || `phone-take-${Date.now()}.webm`, { type: blob.type || "video/webm" });
          const fullScript = draftText(activeDraft);
          stopCamera();
          setRecordingOpen(false);
          setMobileStatus("completed");
          if (onCompleteRecordingToStudio) onCompleteRecordingToStudio(file, fullScript, activeDraft?.title || activeMemory?.title || "Script take");
          else setToast("Phone take received. It is ready to send to Edit.");
        }
      } catch (error: any) {
        if (active) {
          setToast(error?.message || "Could not receive the phone recording.");
          setTimeout(() => setToast(""), 3500);
        }
      } finally {
        polling = false;
      }
    };
    void syncPhoneTake();
    const timer = setInterval(syncPhoneTake, 900);
    return () => { active = false; clearInterval(timer); };
  }, [activeDraft, activeMemory?.title, mobileSessionId, onCompleteRecordingToStudio, recordingOpen]);

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
    } catch {
      setToast("Allow camera and microphone access to record a take.");
      setTimeout(() => setToast(""), 2800);
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return;
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      const file = new File([blob], `script-take-${Date.now()}.webm`, { type: blob.type });
      const fullScript = draftText(activeDraft);
      stopCamera();
      setRecordingOpen(false);
      onCompleteRecordingToStudio?.(file, fullScript, activeDraft?.title || activeMemory?.title || "Script take");
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setRecordingSeconds(0);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    stopCamera();
    voiceTakeIdRef.current += 1;
    transcribeAbortRef.current?.abort();
    if (voiceRecorderRef.current?.state === "recording") voiceRecorderRef.current.stop();
    try { speechRecognitionRef.current?.stop(); } catch { /* Recognition may already be stopped. */ }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const formatDuration = useMemo(() => {
    return scriptWordCount ? `~${Math.max(1, Math.ceil((scriptWordCount / 145) * 60 * 1.12))} sec spoken at a natural pace` : "Natural speaking pace";
  }, [scriptWordCount]);

  return (
    <div className="relative h-dvh min-h-[620px] overflow-hidden rounded-b-[24px] bg-[#f5f2eb] text-[#171815]">
      <motion.div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#e9d9ca]/70 blur-3xl" animate={{ x: [0, 18, 0], y: [0, 12, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="pointer-events-none absolute -right-20 top-28 h-80 w-80 rounded-full bg-[#d9e5dc]/70 blur-3xl" animate={{ x: [0, -16, 0], y: [0, -10, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} />
      <div className="relative mx-auto flex h-full max-w-[1560px] flex-col px-2 pb-0 pt-[5px] sm:px-3 lg:px-4">
        <header className="relative mb-0 flex min-h-[38px] shrink-0 items-center justify-between gap-3 border-b border-[#e4ded4] px-1 pb-0">
          <div><div className="mb-0.5 inline-flex items-center gap-2 text-[8px] font-bold uppercase tracking-[.18em] text-[#9c5e45]"><span className="h-1.5 w-1.5 rounded-full bg-[#7c9a78]" /> Script room <span className="text-[#c2bcb2]">/</span> Z creative studio</div><h1 className="font-serif text-[22px] leading-none tracking-tight sm:text-[25px]">Your life, in your voice. <span className="text-[#9b563b]">Tell your story.</span></h1></div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/80 bg-white/60 py-0.5 pl-0.5 pr-2.5 shadow-sm backdrop-blur-sm"><Pip mood={loadingScript || chatLoading ? "thinking" : "happy"} size={38} interactive={false} className="!m-0" /><div><p className="text-[11px] font-semibold">Z is here.</p><p className="text-[9px] text-[#777267]">Your story partner</p></div></div>
        </header>

        <div className={`grid min-h-0 flex-1 grid-cols-1 items-stretch gap-2.5 pb-1 ${railLayoutClass}`}>
          <aside aria-label="Memory gallery" className={`hidden min-h-0 flex-col overflow-hidden rounded-[21px] border border-[#e4ded4] bg-[#fffefa]/80 p-2 shadow-[0_10px_28px_rgba(48,39,28,.04)] md:flex xl:p-2.5 ${memoryRailOpen ? "" : "items-center"}`}>
            {memoryRailOpen ? <>
            <div className="mb-2 flex items-start justify-between gap-1 px-1"><div><p className="font-serif text-[16px] leading-tight">Memory gallery</p><p className="mt-0.5 text-[8px] leading-relaxed text-[#878277]">Real moments, in your words. Pick one to see what Z can build a story around.</p></div><div className="flex shrink-0 items-center gap-1"><span className="rounded-full bg-[#f3e8db] px-1.5 py-0.5 text-[8px] font-semibold text-[#8b6048]">{memories.length}</span><button onClick={() => setMemoryRailOpen(false)} className="rounded-full px-1.5 py-0.5 text-[8px] text-[#8c7769] hover:bg-[#f1ebe2]">Hide</button></div></div>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
              {memories.map((memory, index) => (
                <motion.button
                  key={memory.id}
                  onClick={() => selectMemory(memory)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: .985 }}
                  aria-pressed={activeMemory?.id === memory.id}
                  className={`relative flex min-h-[58px] flex-1 w-full items-center gap-2 overflow-hidden rounded-[14px] border px-2 py-1.5 text-left transition ${activeMemory?.id === memory.id ? "border-[#bb795e] bg-[#f3e4d4] shadow-sm" : "border-transparent hover:border-[#e5ddd1] hover:bg-white/80"}`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-white/80 shadow-sm" style={{ backgroundColor: memoryPalette[index % memoryPalette.length] }}><MemoryDoodle category={memory.category} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold leading-tight">{memory.title}</span><span className="mt-0.5 block truncate text-[7px] capitalize text-[#9b674e]">{memory.category} Â· {memory.date}</span><span className="mt-1 line-clamp-2 text-[8px] leading-snug text-[#756f65]">{memory.story || "A real moment, saved in your own words."}</span></span>
                </motion.button>
              ))}
              {!memories.length && hydrated && <p className="rounded-2xl bg-[#f4f0e9] p-4 text-xs leading-relaxed text-[#716c62]">Your memory bank is empty. Add a real moment in You first; Z will build the script from that.</p>}
            </div>
            <div className="mt-auto rounded-[16px] border border-[#e8d8c4] bg-gradient-to-br from-[#f8eee1] to-[#f1e4d3] p-2.5 shadow-inner">
              <div className="flex items-center justify-between gap-2"><p className="font-serif text-[13px] italic leading-tight text-[#604b3b]">Your story brain</p><span className="rounded-full bg-white/75 px-2 py-0.5 text-[8px] font-semibold text-[#8a6850]">{memories.length} moments</span></div>
              <p className="mt-1 text-[8px] leading-snug text-[#756456]">Your saved moments and locked scripts feed Z’s memory, so future stories can sound more like your life.</p>
              <div className="mt-1.5 flex flex-wrap gap-1">{[...new Set(memories.map((memory) => memory.category))].slice(0, 3).map((category) => <span key={category} className="rounded-full border border-[#ddcdb9] bg-white/55 px-1.5 py-0.5 text-[7px] capitalize text-[#766451]">{category}</span>)}</div>
              <div className="mt-2 overflow-hidden rounded-[12px] border border-white/80 bg-[#fffaf3]/80 px-1.5 py-1">
                <svg viewBox="0 0 240 76" className="h-[62px] w-full" role="img" aria-label={`${memories.length} saved moments connected to the story brain`}>
                  <path d="M8 38H170" fill="none" stroke="#d8bea4" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 38H170" fill="none" stroke="#df8058" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 9" className="memory-brain-wire" />
                  <circle cx="34" cy="38" r="2.5" fill="#c6a888" /><circle cx="83" cy="38" r="2.5" fill="#c6a888" /><circle cx="132" cy="38" r="2.5" fill="#c6a888" />
                  <motion.circle key={`brain-feed-${brainFeedCount}`} cx="8" cy="38" r="4" fill="#e86c45" animate={{ cx: [8, 170], opacity: [0, 1, 1, 0], scale: [0.7, 1.15, 0.9] }} transition={{ duration: brainFeedCount ? 1.45 : 3.1, repeat: brainFeedCount ? 1 : Infinity, repeatDelay: brainFeedCount ? 0 : 0.8, ease: "easeInOut" }} />
                  <path d="M190 11c-6-5-14-2-15 5-8 1-11 10-6 16-6 7-2 16 6 16 3 8 12 9 18 3 6 5 15 1 15-7 8-3 9-13 3-18 2-8-5-14-13-11-2-7-9-9-15-4z" fill={memories.length ? "#f2d7bc" : "#fffaf1"} stroke="#9c7559" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M192 13c-3 5-2 10 1 14-4 4-4 9 0 12-3 5-2 8 1 11M178 18c4 2 5 6 3 10M171 33c5 0 8 2 10 5M177 47c5-1 8-3 10-7M211 18c-4 2-5 6-3 10M219 33c-5 0-8 2-10 5M214 47c-5-1-8-3-10-7" fill="none" stroke="#b38c70" strokeWidth="1.15" strokeLinecap="round" strokeDasharray="2 2" />
                  <path d="M170 38l10-7m-10 7l10 8" fill="none" stroke="#df8058" strokeWidth="1.5" strokeLinecap="round" />
                  {memoryBrainNodes.map(([x, y], index) => <motion.circle key={`${x}-${y}`} cx={x} cy={y} r={index < memories.length ? 2.6 : 1.7} fill={index < memories.length ? memoryPalette[index % memoryPalette.length] : "#fffdf8"} stroke={index < memories.length ? "#9c7559" : "#cbb9a4"} strokeWidth="1" animate={{ opacity: index < memories.length ? [0.65, 1, 0.65] : [0.35, 0.65, 0.35], scale: index < memories.length ? [0.9, 1.2, 0.9] : [0.9, 1, 0.9] }} transition={{ duration: 1.9 + (index % 4) * 0.3, repeat: Infinity, delay: index * 0.09, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
                </svg>
              </div>
            </div>
            </> : <button onClick={() => setMemoryRailOpen(true)} aria-label="Show memory gallery" className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f3e4d4] font-serif text-sm text-[#a85f43]">M</button>}
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col gap-2.5 pb-[88px]">
            <section aria-label="Choose a moment" className="shrink-0 rounded-[20px] border border-[#e4ded4] bg-[#fffefa]/75 px-3 py-2 shadow-[0_10px_28px_rgba(48,39,28,.04)]">
              <div className="mb-2 flex items-center justify-between gap-2"><div><p className="font-serif text-[16px] leading-tight">Choose a moment</p><p className="text-[9px] text-[#878277]">Pick the memory you want to turn into a story</p></div><div className="flex items-center gap-1.5"><span className="text-[9px] text-[#9b9489]">{topPicks.length} story picks</span>{!memoryRailOpen && <button onClick={() => setMemoryRailOpen(true)} className="rounded-full border border-[#e4ded4] px-2 py-1 text-[8px] text-[#71685c]">+ Memories</button>}{!inspirationRailOpen && <button onClick={() => setInspirationRailOpen(true)} className="rounded-full border border-[#e4ded4] px-2 py-1 text-[8px] text-[#71685c]">+ Formats</button>}</div></div>
              <div className="grid grid-cols-3 gap-2.5">
                {topPicks.map((memory, index) => <motion.button key={memory.id} onClick={() => selectMemory(memory)} whileHover={{ y: -3, rotate: 0, scale: 1.015 }} whileTap={{ scale: .98 }} aria-pressed={activeMemory?.id === memory.id} style={{ backgroundColor: memoryPalette[index % memoryPalette.length], rotate: activeMemory?.id === memory.id ? 0 : (index - 1) * 1.1 }} className={`group relative grid h-[68px] min-w-0 grid-cols-[minmax(0,1fr)_42px] items-center gap-1 overflow-hidden rounded-[18px] border px-2.5 py-1.5 text-left shadow-[0_5px_12px_rgba(51,43,31,.09)] transition ${activeMemory?.id === memory.id ? "border-[#bb795e] ring-2 ring-white shadow-[0_9px_18px_rgba(155,86,59,.16)]" : "border-white/90 hover:shadow-[0_9px_18px_rgba(51,43,31,.13)]"}`}>
                  <span className="pointer-events-none absolute -right-4 -top-5 font-serif text-[68px] leading-none text-[#25241e]/[.045]">{memoryMarks[memory.category] || memory.category.slice(0, 1).toUpperCase()}</span>
                  <span className="relative z-10 flex min-w-0 flex-col gap-0.5"><span className="flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[.13em] text-[#6d6256]"><span className="h-1 w-1 rounded-full bg-current" />{memory.category}<span className="font-normal tracking-normal opacity-70">{memory.date}</span></span><span className="line-clamp-2 font-serif text-[11px] leading-tight text-[#292923]">{memory.title}</span><span className="truncate text-[7px] capitalize text-[#6f6a60]">{memory.emotionTone || "A moment from your life"}</span></span>
                  <span className="relative grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/50 shadow-inner"><MemoryDoodle category={memory.category} /><Sparkles size={8} className="absolute -right-0.5 -top-0.5 text-[#a85e43]" /></span>
                </motion.button>)}
                {!topPicks.length && <p className="col-span-3 py-2 text-[10px] text-[#827a6e]">Save a story in Memory Gallery to get your first script pick.</p>}
              </div>
            </section>
            <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[#e3ddd2] bg-[#fffefa] p-2.5 shadow-[0_14px_45px_rgba(48,39,28,.05)] sm:p-3">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#f2e5d8]/70 blur-3xl" />
              <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#ece7df] pb-2">
                <div className="min-w-0"><div className="mb-0.5 flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[.13em] text-[#a25e42]"><span className="h-1.5 w-1.5 rounded-full bg-[#a25e42]" /> {storyMode === "direct" ? "Your spoken story · shaped by Z" : `${activeMemory?.category || "Story"} · built from your memory`}</div><h2 className="truncate font-serif text-[21px] leading-tight sm:text-[24px]">{activeDraft?.title || (storyMode === "direct" ? "Your story, in your words" : activeMemory?.title || "Choose a memory to begin")}</h2></div>
                <div className="flex shrink-0 items-center gap-1.5"><button onClick={generateScript} disabled={loadingScript || chatLoading || (storyMode === "memory" && !activeMemory) || (storyMode === "direct" && !standaloneStory.trim())} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#20211d] px-3 text-[10px] font-semibold text-white transition hover:bg-[#9b563b] disabled:cursor-not-allowed disabled:opacity-50">{loadingScript ? <LoaderCircle size={12} className="animate-spin" /> : <Sparkles size={12} />}{loadingScript ? "Writing..." : activeDraft ? "Rewrite" : "Write script"}</button></div>
              </div>
              <div className="relative mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-full border border-[#e7e1d8] bg-[#f6f3ed] p-0.5" role="tablist" aria-label="Script view">
                  <button role="tab" aria-selected={draftView === "storyboard"} onClick={() => setDraftView("storyboard")} className={`rounded-full px-3 py-1.5 text-[9px] font-semibold transition ${draftView === "storyboard" ? "bg-white text-[#252620] shadow-sm" : "text-[#81796e]"}`}>Storyboard</button>
                  <button role="tab" aria-selected={draftView === "complete"} onClick={() => setDraftView("complete")} className={`rounded-full px-3 py-1.5 text-[9px] font-semibold transition ${draftView === "complete" ? "bg-white text-[#252620] shadow-sm" : "text-[#81796e]"}`}>Complete script</button>
                </div>
                <div className="flex flex-col gap-1.5"><div className="flex flex-wrap items-center gap-1"><span className="mr-1 text-[8px] uppercase tracking-wider text-[#8a8277]">Draft length</span>{scriptLengthOptions.map((seconds) => <button key={seconds} onClick={() => setScriptLength(seconds)} aria-pressed={scriptLength === seconds} title={`Use ${durationLabel(seconds)} for the next draft`} className={`rounded-full border px-2 py-1 text-[8px] font-semibold transition ${scriptLength === seconds ? "border-[#a86a50] bg-[#f3e4d4] text-[#874d37]" : "border-[#e5ddd1] bg-white/70 text-[#7a7369] hover:border-[#b98a73]"}`}>{durationLabel(seconds)}</button>)}{suggestedScriptLength && <button onClick={() => setScriptLength(suggestedScriptLength)} className="ml-1 rounded-full bg-[#e8eee3] px-2 py-1 text-[8px] font-semibold text-[#53634d] hover:bg-[#dce6d5]">{suggestedScriptLength === scriptLength ? "Suggested fit ✓" : `Use suggested ${durationLabel(suggestedScriptLength)}`}</button>}</div>{estimateWords > 0 && <p className="pl-1 text-[7px] text-[#8a8277]">{estimateWords} words ≈ {estimateSeconds}s including natural pauses{estimateSeconds > 120 ? " · shorten this source to fit the 2:00 maximum" : ""}</p>}</div>
                <button onClick={completeRewrite} disabled={!activeDraft || chatLoading || loadingScript} className="rounded-full border border-[#e3d8ca] bg-white/70 px-2.5 py-1.5 text-[8px] font-semibold text-[#765e4d] transition hover:border-[#b7795b] disabled:opacity-40">Complete rewrite</button>
              </div>
              <div className="relative mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[17px] bg-[#f8f6f1] px-3 py-2.5 sm:px-4">
                {dictationActive && <div className="mb-2 shrink-0 rounded-[14px] border border-[#eadfd0] bg-white/85 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f8e5d9] text-[#b65b3d]">{voiceCapturing ? <motion.span className="flex h-3 items-center gap-[2px]" aria-hidden="true">{[0, 1, 2, 3].map((bar) => <motion.i key={bar} className="block w-[2px] rounded-full bg-current" animate={{ scaleY: [.35, 1, .45] }} transition={{ duration: .65, repeat: Infinity, delay: bar * .11, ease: "easeInOut" }} style={{ height: 12 }} />)}</motion.span> : voiceTranscribing ? <LoaderCircle size={14} className="animate-spin" /> : <Mic size={13} />}</span><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#9b563b]">{voiceCapturing ? "Z is listening" : voiceTranscribing ? "Checking your words" : "Your dictated story"}</p><p className="text-[8px] text-[#82796e]">{voiceCapturing ? "Speak naturally. Your words will appear here." : voiceTranscribing ? "Finishing the transcript…" : "Press Enter to send · Shift+Enter for a new line."}</p></div></div>
                    <div className="flex shrink-0 items-center gap-1.5">{voiceCapturing && <button onClick={() => void toggleVoiceInput()} className="rounded-full border border-[#ddd5c9] px-2.5 py-1 text-[8px] font-semibold text-[#675f54]">Stop & review</button>}{(voiceCapturing || voiceTranscribing) && <button onClick={cancelVoiceInput} className="rounded-full border border-[#e7d1c7] px-2.5 py-1 text-[8px] font-semibold text-[#a64f39]">Cancel</button>}{pendingTranscript && <><button onClick={cancelVoiceInput} className="rounded-full border border-[#e7d1c7] px-2.5 py-1 text-[8px] font-semibold text-[#a64f39]">Discard</button><button onClick={useVoiceTranscript} disabled={chatLoading} className="rounded-full bg-[#24251f] px-3 py-1 text-[8px] font-semibold text-white hover:bg-[#9b563b] disabled:opacity-50">Go →</button></>}</div></div>
                  {pendingTranscript ? <textarea aria-label="Review and send your dictated story" value={pendingTranscript} onChange={(event) => { setPendingTranscript(event.target.value); setLastDictation(event.target.value); liveTranscriptRef.current = event.target.value; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!chatLoading && pendingTranscript.trim()) useVoiceTranscript(); } }} rows={3} className="max-h-[140px] min-h-[70px] w-full resize-y overflow-y-auto whitespace-pre-wrap rounded-[11px] border border-[#e7ded1] bg-[#f7f4ee] px-2.5 py-2 text-[10px] leading-relaxed text-[#38362f] outline-none focus:border-[#b7795b]" /> : <div aria-live="polite" className="max-h-[120px] overflow-y-auto whitespace-pre-wrap rounded-[11px] bg-[#f7f4ee] px-2.5 py-2 text-[10px] leading-relaxed text-[#38362f]">{voiceCapturing ? liveTranscript || "I’m here. Start wherever the story begins…" : lastDictation || liveTranscript || "Listening for the final words…"}</div>}
                </div>}
                {zIsWorking && <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-[14px] border border-[#eadfd0] bg-white/85 p-3" aria-live="polite"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f3e4d4] text-[#9b563b]"><Pip mood="thinking" size={30} interactive={false} className="!m-0" /></span><div className="min-w-0"><p className="text-[10px] font-semibold text-[#38342e]">{storyMode === "direct" ? "Z is shaping your story" : "Z is building from this memory"}</p><p className="mt-0.5 truncate text-[8px] text-[#81796e]">{workingSeconds}s · {storyMode === "direct" ? standaloneStory || lastDictation || message : activeMemory?.title}</p></div></div><button type="button" onClick={cancelScriptRequest} className="shrink-0 rounded-full border border-[#dfc7b9] bg-white px-2.5 py-1 text-[8px] font-semibold text-[#9b563b] hover:bg-[#fff6f0]">Cancel</button></div>}
                {!activeDraft && !zIsWorking && !dictationActive && <div className="py-4 text-sm leading-relaxed text-[#777268]">{scriptError ? <span className="text-[#a34632]">{scriptError}</span> : storyMode === "direct" ? "Tell Z what happened today, or use the mic to dictate your story." : "Z will use this memory and your voice notes to write the first draft."}</div>}
                {!activeDraft ? null : draftView === "complete" ? <div className="min-h-0 flex-1 overflow-y-auto pr-1"><div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#e9e4da] pb-2"><div><p className="text-[8px] font-bold uppercase tracking-[.14em] text-[#a16a50]">Word-for-word - spoken only</p><p className="mt-0.5 text-[9px] text-[#81796e]">{scriptWordCount} words - target {activeDraft.targetDurationSec || scriptLength} seconds - {formatDuration}</p></div><span className="rounded-full bg-white px-2 py-1 text-[8px] text-[#777267]">Reviewed by Z - full draft</span></div><p className="whitespace-pre-wrap font-serif text-[16px] leading-[1.55] text-[#262720] sm:text-[18px]">{draftText(activeDraft)}</p></div> : <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="mb-2 rounded-[13px] border border-[#e9e2d8] bg-[#fffefa]/70 p-2"><div className="mb-1.5 flex flex-wrap items-center gap-1.5"><span className="text-[7px] font-bold uppercase tracking-wider text-[#9b6b53]">{activeDraft.hooks?.length ? "Try a hook" : "Hook style"}</span>{hookOptions.map((hook, index) => <button key={`${hook.hookText}-${index}`} title={hook.whyItWorks || hook.badge || hook.hookText} onClick={() => void sendToZ(activeDraft.hooks?.length ? `Use this spoken hook as the opening: ${hook.hookText}. Keep the remaining script faithful to my memory and voice.` : `Rewrite the opening using this hook direction: ${hook.hookText}. Keep the actual wording natural and faithful to my memory and voice.`)} disabled={chatLoading} className="max-w-[38%] truncate rounded-full border border-[#e5d8c9] bg-white px-2 py-1 text-[8px] text-[#665d52] transition hover:border-[#bd795c] disabled:opacity-40">{hook.hookText}</button>)}</div><div className="flex flex-wrap items-center gap-1.5"><span className="text-[7px] font-bold uppercase tracking-wider text-[#75846f]">Ending</span>{activeCtas.map((cta) => <button key={cta} onClick={() => void sendToZ(`Revise the ending to invite this response naturally: ${cta}`)} disabled={chatLoading} className="rounded-full border border-[#d8e0d3] bg-white px-2 py-1 text-[8px] text-[#5c6a57] transition hover:border-[#91a48a] disabled:opacity-40">{cta}</button>)}</div></div>
                  <div className="mb-1 flex items-center justify-between"><p className="text-[8px] font-bold uppercase tracking-[.14em] text-[#968a7c]">Beat by beat</p><p className="text-[8px] text-[#8b8378]">A spoken story, shaped for {activeDraft.targetDurationSec || scriptLength} seconds</p></div>
                  {activeDraft.storyQuestions?.length ? <section aria-label="Z's story questions" className="mb-2 rounded-[13px] border border-[#e7ded1] bg-[#fffaf3] p-2"><div className="mb-1.5 flex items-center justify-between gap-2"><p className="text-[8px] font-bold uppercase tracking-[.13em] text-[#9b563b]">Z wants to understand this story</p><span className="text-[7px] text-[#918578]">Choose a direction for the next pass</span></div><div className="space-y-1.5">{activeDraft.storyQuestions.map((item, questionIndex) => <div key={`${questionIndex}-${item.question}`} className="rounded-[10px] bg-white/80 px-2 py-1.5"><p className="text-[9px] font-semibold leading-snug text-[#3c3932]">{item.question}</p>{item.context && <p className="mt-0.5 text-[7px] leading-snug text-[#81776b]">{item.context}</p>}<div className="mt-1 flex flex-wrap gap-1">{item.options.map((option, optionIndex) => <button key={`${optionIndex}-${option.label}`} type="button" onClick={() => void sendToZ(`For this revision, answer Z's story question “${item.question}” with this direction: ${option.direction}. Keep the rest grounded in my original story and voice.`)} disabled={chatLoading} title={option.direction} className="rounded-full border border-[#e6d6c7] bg-[#fffefa] px-2 py-1 text-[7px] font-medium text-[#705541] transition hover:border-[#bb795e] hover:bg-[#f8eee1] disabled:opacity-45">{option.label}</button>)}</div></div>)}</div></section> : null}
                  <div className="space-y-1.5">{activeDraft.beats.map((beat, index) => <article key={`${activeMemory?.id}-${index}`} className="relative overflow-hidden rounded-[15px] border border-[#e9e3d9] bg-white/75 p-2"><div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#d99a7c]"/><div className="mb-1 flex items-center justify-between gap-2 pl-1"><p className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.12em] text-[#9d6248]"><span className="grid h-4 w-4 place-items-center rounded-full bg-[#f3e4d4] text-[7px]">{index + 1}</span>{beat.phase?.replace(/\s*\([^)]*\)/, "") || `Beat ${index + 1}`}</p><span className="shrink-0 rounded-full bg-[#f6f3ed] px-1.5 py-0.5 text-[7px] text-[#777267]">{beat.durationSec || "?"} sec</span></div><p className="pl-1 font-serif text-[13px] leading-[1.35] text-[#262720]">{beat.spokenLine}</p>{beat.deliveryCue && <p className="mt-1 pl-1 text-[8px] italic text-[#888277]">{beat.deliveryCue}</p>}{beat.visualCutaway && <p className="mt-1 pl-1 text-[8px] leading-snug text-[#777267]"><span className="font-semibold text-[#a16a50]">Visual note - </span>{beat.visualCutaway}</p>}</article>)}</div>
                  <details className="mt-2 rounded-[12px] border border-[#e8e1d7] bg-white/55 px-2.5 py-2"><summary className="cursor-pointer text-[8px] font-semibold text-[#786c5e]">Memory details and story direction</summary><div className="mt-2 grid grid-cols-3 gap-1.5"><div className="rounded-[10px] bg-[#f8f5ef] px-2 py-1.5"><p className="text-[7px] font-bold uppercase tracking-wider text-[#a16a50]">Memory date</p><p className="mt-0.5 truncate text-[8px] text-[#4c4a43]">{activeMemory?.date || "Not set"}</p></div><div className="rounded-[10px] bg-[#f8f5ef] px-2 py-1.5"><p className="text-[7px] font-bold uppercase tracking-wider text-[#a16a50]">Story feeling</p><p className="mt-0.5 truncate text-[8px] capitalize text-[#4c4a43]">{activeMemory?.emotionTone || "From your memory"}</p></div><div className="rounded-[10px] bg-[#f8f5ef] px-2 py-1.5"><p className="text-[7px] font-bold uppercase tracking-wider text-[#a16a50]">Spoken length</p><p className="mt-0.5 truncate text-[8px] text-[#4c4a43]">{activeDraft.targetDurationSec || scriptLength}s target - {scriptWordCount} words - {formatDuration}</p></div></div>{activeDraft.treatment && <div className="mt-2 rounded-[10px] bg-[#f8f5ef] px-2 py-1.5"><p className="text-[7px] font-bold uppercase tracking-wider text-[#a16a50]">Story direction</p><p className="mt-0.5 text-[8px] leading-relaxed text-[#666056]">{activeDraft.treatment}</p></div>}{activeDraft.qualityReview?.summary && <p className="mt-2 text-[8px] leading-relaxed text-[#66705e]">Z review: {activeDraft.qualityReview.summary}</p>}</details>
                  {activeDraft.loopPayoff && <p className="mt-2 rounded-[12px] bg-[#ecefe8] px-2.5 py-2 text-[8px] leading-relaxed text-[#606b59]"><span className="font-bold uppercase tracking-wider">Ending thought - </span>{activeDraft.loopPayoff}</p>}
                </div>}
                {scriptError && activeDraft && <p className="mt-1 rounded-xl bg-[#fff0ea] p-2 text-[9px] text-[#9e462f]">{scriptError}</p>}
                {activeDraft && <div className="mt-1.5 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#e9e4da] pt-1.5"><div className="flex items-center gap-2"><button onClick={copyScript} className="inline-flex items-center gap-1 rounded-full border border-[#ddd7cd] px-2.5 py-1.5 text-[9px] text-[#5f5c53] transition hover:bg-white">{copied ? <Check size={11} /> : <Copy size={11} />}{copied ? "Copied" : "Copy"}</button><details className="group relative"><summary className="cursor-pointer list-none rounded-full border border-[#e4ddd2] bg-white/70 px-2.5 py-1.5 text-[9px] font-semibold text-[#765e4d] hover:border-[#b7795b]">Why this works</summary><div className="absolute bottom-9 left-0 z-30 w-[min(400px,calc(100vw-48px))] rounded-[14px] border border-[#ddd3c5] bg-[#fffefa] p-3 text-[9px] leading-relaxed text-[#625b50] shadow-xl"><p>{activeDraft.whyThisWorks || activeDraft.qualityReview?.summary || `Z shaped the opening, turning point, and ending around ${storyMode === "direct" ? "the story you told" : "the memory you selected"}, then reviewed the words for natural speech.`}</p>{activeDraft.formatInfluence && <p className="mt-2 border-t border-[#eee8de] pt-2"><span className="font-semibold">Saved structure: </span>{activeDraft.formatInfluence.detectedFormat || "Reel format"}{activeDraft.formatInfluence.creatorStyle ? ` by ${activeDraft.formatInfluence.creatorStyle}` : ""}. {activeDraft.formatInfluence.hookPattern ? `The hook pattern is ${activeDraft.formatInfluence.hookPattern}. ` : ""}The structure was adapted to your story; this saved example has no performance figures here, so viral reach is unverified.</p>}</div></details></div><div className="flex flex-wrap gap-2"><button onClick={toggleScriptLock} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold transition ${scriptLocked ? "border-[#9bb09a] bg-[#e8f0e6] text-[#344d38]" : "border-[#d9d1c6] bg-white hover:border-[#9b563b]"}`}>{scriptLocked ? <UnlockKeyhole size={11} /> : <LockKeyhole size={11} />}{scriptLocked ? "Unlock" : "Lock script"}</button><button onClick={openRecording} disabled={!scriptLocked} className="inline-flex items-center gap-1.5 rounded-full bg-[#e97150] px-3 py-1.5 text-[9px] font-semibold text-white transition hover:bg-[#cf593b] disabled:cursor-not-allowed disabled:opacity-40"><Video size={11} /> Teleprompter</button>{scriptLocked && <button onClick={() => onSwitchToStudio?.(draftText(activeDraft), activeDraft.title)} className="inline-flex items-center gap-1 rounded-full bg-[#20211d] px-2.5 py-1.5 text-[9px] font-semibold text-white transition hover:bg-[#9b563b]">Edit <ArrowRight size={11} /></button>}</div></div>}
                {activeDraft && !scriptLocked && <p className="mt-1 shrink-0 text-right text-[8px] text-[#948a7e]">Chat with Z anytime. Lock your words when you are ready to record.</p>}
              </div>
            </section>
            <section aria-label="Chat with Z about this script" className="absolute bottom-2 left-1/2 z-[70] w-[min(760px,calc(100vw-24px))] -translate-x-1/2">
              <div className="overflow-hidden rounded-[20px] border-2 border-[#141414] bg-[#ECEAE3] shadow-[2px_2px_0px_#141414]">
                <div className="flex items-center justify-between gap-2 border-b border-[#D5D2C8] px-3 py-1.5"><div className="inline-flex items-center rounded-full bg-[#dedbd3] p-0.5" role="group" aria-label="Choose story source"><button type="button" onClick={() => setStoryMode("memory")} disabled={!memories.length} aria-pressed={storyMode === "memory"} className={`rounded-full px-2.5 py-1 text-[8px] font-semibold transition ${storyMode === "memory" ? "bg-white text-[#302f29] shadow-sm" : "text-[#777267]"}`}>Use a memory</button><button type="button" onClick={() => setStoryMode("direct")} aria-pressed={storyMode === "direct"} className={`rounded-full px-2.5 py-1 text-[8px] font-semibold transition ${storyMode === "direct" ? "bg-white text-[#302f29] shadow-sm" : "text-[#777267]"}`}>Start with my story</button></div><span className="hidden text-[8px] text-[#777267] sm:block">{storyMode === "direct" ? "Tell Z what happened; it will shape a story." : "Z will ground this in your selected memory."}</span></div>
                {chat.length > 0 && <div className="truncate border-b border-[#D5D2C8] px-4 py-1 font-mono text-[9px] text-[#6B6A64]">{chat[chat.length - 1].role === "z" ? "Z Â· " : "YOU Â· "}{chat[chat.length - 1].text}</div>}
                <form onSubmit={(event) => { event.preventDefault(); void sendToZ(); }} className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#D9D4C9]"><Pip mood={chatLoading ? "thinking" : "listening"} size={34} interactive={false} className="!m-0" /></span>
                  <input value={message} onChange={(event) => setMessage(event.target.value)} disabled={chatLoading || voiceTranscribing || (storyMode === "memory" && (!activeDraft || loadingScript))} placeholder={storyMode === "direct" ? (activeDraft ? "Tell Z what to change, or share another story..." : "Tell Z what happened today; it will become a story...") : (activeDraft ? "Tell Z what to change in this script..." : "Z saves one first draft per memory; choose Rewrite to generate again...")} className="min-h-[34px] min-w-0 flex-1 bg-transparent px-1 py-1 text-[13px] text-[#141414] outline-none placeholder:text-[#6B6A64]/65 disabled:opacity-50" />
                  <button type="button" onClick={toggleVoiceInput} disabled={voiceTranscribing || chatLoading} title="Speak your story or a script change" aria-label={voiceCapturing ? "Stop recording your story" : "Speak to Z"} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition disabled:opacity-40 ${voiceCapturing ? "border-[#c8684c] bg-[#fff0e8] text-[#a84f36]" : "border-[#c6bfb3] bg-white/70 text-[#62594d] hover:border-[#bd795c]"}`}>{voiceCapturing ? <MicOff size={14} /> : voiceTranscribing ? <LoaderCircle size={14} className="animate-spin" /> : <Mic size={14} />}</button>
                  <button disabled={!message.trim() || chatLoading || (storyMode === "memory" && (!activeMemory || !activeDraft || loadingScript))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[#141414] bg-[#E4491B] text-white transition hover:bg-[#C93D14] active:scale-95 disabled:opacity-35" aria-label="Send a revision to Z for the selected script">{chatLoading ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}</button>
                </form>
              </div>
            </section>
          </main>

          <aside aria-label="Instagram inspiration" className={`hidden min-h-0 flex-col overflow-hidden rounded-[21px] border border-[#e4ded4] bg-[#fffefa]/85 p-2 shadow-[0_10px_28px_rgba(48,39,28,.05)] md:flex xl:p-2.5 ${inspirationRailOpen ? "" : "items-center"}`}>
            {inspirationRailOpen ? <>
            <div className="flex items-start justify-between gap-2 border-b border-[#eee9e1] px-1 pb-2">
              <div><p className="font-serif text-[16px] leading-tight">Whatâ€™s trending in your niche?</p><p className="mt-0.5 text-[9px] text-[#827a6e]">Formats to remake in your voice</p></div>
              <div className="flex shrink-0 flex-col items-end gap-1"><span className="rounded-full border border-[#ead9c9] bg-[#fbf1e7] px-1.5 py-1 text-[7px] font-semibold uppercase tracking-wide text-[#9a6248]">Saved refs</span><button onClick={() => setInspirationRailOpen(false)} className="rounded-full px-1.5 py-0.5 text-[8px] text-[#8c7769] hover:bg-[#f1ebe2]">Hide</button></div>
            </div>
            <div className="relative mt-2 overflow-hidden rounded-[15px] border border-[#edd8c8] bg-gradient-to-br from-[#fff3e9] via-[#fffaf3] to-[#f5e9ff] p-2.5">
              <div className="pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full bg-[#f4b99a]/30 blur-xl" />
              <div className="relative flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[7px] font-bold uppercase tracking-[.12em] text-[#9b563b]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e97150]" />Coming soon</span><span className="text-[7px] font-medium text-[#827a6e]">Official Meta connection</span></div>
              <h3 className="relative mt-2 font-serif text-[13px] leading-tight text-[#292821]">Find the story patterns people are responding to.</h3>
              <p className="relative mt-1 text-[8px] leading-relaxed text-[#71695f]">Z will analyze eligible Instagram niche results for hooks, formats, and available performance signals, then reshape the structure around your own memories and voice.</p>
              <div className="relative mt-2 flex flex-wrap gap-1"><span className="rounded-full border border-white/90 bg-white/70 px-1.5 py-1 text-[7px] text-[#75695e]">Reel story formats</span><span className="rounded-full border border-white/90 bg-white/70 px-1.5 py-1 text-[7px] text-[#75695e]">Carousel ideas</span><span className="rounded-full border border-white/90 bg-white/70 px-1.5 py-1 text-[7px] text-[#75695e]">Your voice, always</span></div>
              <p className="relative mt-2 border-t border-[#e7d8ca] pt-1.5 text-[7px] leading-relaxed text-[#82776a]">Live data will appear after Meta access and the Instagram connection are approved. No live trends are shown yet.</p>
              <button onClick={() => setInstagramPlanOpen(true)} className="relative mt-1.5 inline-flex items-center gap-1 text-[8px] font-semibold text-[#9b563b] hover:underline">See what setup is needed <ArrowRight size={9} /></button>
            </div>
              <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                {savedReels.slice(0, 3).map((reel, index) => <article key={reel.id} className="flex flex-1 flex-col justify-between rounded-[15px] border border-[#e9e2d8] bg-white/80 p-2.5 shadow-[0_4px_12px_rgba(44,38,29,.04)]">
                <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[#f5e3de] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-[#a74b37]">{reel.detectedFormat || "Saved format"}</span><span className="text-[7px] text-[#948a7e]">REF {String(index + 1).padStart(2, "0")}</span></div>
                <h3 className="mt-1 line-clamp-1 text-[9px] font-semibold text-[#33332d]">{reel.creatorStyle || "Creator format"}</h3>
                <p className="mt-1 line-clamp-2 text-[8px] leading-relaxed text-[#797267]">Hook: {reel.hookPattern}</p>
                <button onClick={() => reuseReelFormat(reel)} disabled={!activeMemory || chatLoading} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#292a24] px-2 py-1.5 text-[8px] font-semibold text-white transition hover:bg-[#a85e43] disabled:cursor-not-allowed disabled:opacity-40">Adapt this format <ArrowRight size={9} /></button>
              </article>)}
              {!savedReels.length && <div className="rounded-[14px] border border-dashed border-[#ded8ce] p-3 text-[9px] leading-relaxed text-[#898478]">Save Reel examples in You to build your inspiration shelf. Live trend data will appear here after the Instagram integration is connected.</div>}
            </div>
            <div className="mt-auto rounded-[16px] bg-[#272821] p-3 text-[#f6f0e5]"><p className="text-[7px] font-bold uppercase tracking-[.16em] text-[#e9a27d]">Your voice, your version</p><p className="mt-1 font-serif text-[13px] leading-snug">Keep the format. Make the moment yours.</p><p className="mt-1 text-[8px] leading-relaxed text-white/60">Z adapts saved structures to the memory you choose.</p></div>
            </> : <button onClick={() => setInspirationRailOpen(true)} aria-label="Show saved Reel formats" className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f6e3dc] text-[10px] font-bold text-[#a74b37]">R</button>}
          </aside>

        </div>
      </div>

      <AnimatePresence>
        {instagramPlanOpen && <motion.div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#171815]/55 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setInstagramPlanOpen(false); }}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="instagram-api-plan-title" initial={{ y: 14, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: .98 }} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[22px] border border-[#e7ded0] bg-[#fffefa] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#a25e42]">Official connection plan</p><h2 id="instagram-api-plan-title" className="mt-1 font-serif text-xl">What Meta lets Z see</h2></div><button onClick={() => setInstagramPlanOpen(false)} aria-label="Close Instagram API plan" className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#f2eee7]"><X size={15} /></button></div>
            <p className="mt-3 text-[11px] leading-relaxed text-[#625b50]">Meta’s Instagram API is designed for authorized Professional accounts (Business or Creator). It can provide your connected account’s media and insights, plus certain public hashtag results and basic metadata/metrics for other Professional accounts. Z can analyze the data the API returns.</p>
            <div className="mt-4 rounded-[14px] border border-[#eadfd0] bg-[#f8f5ef] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-[#895d46]">What this means for “trending”</p><p className="mt-1 text-[10px] leading-relaxed text-[#6f665a]">Meta’s documented API offers scoped hashtag/media discovery, not a global feed of every trending or viral Reel. We can rank the results we are allowed to fetch for selected niche hashtags and compare them with your own Reel insights. We must call them “top results in this sample,” not “viral across Instagram.”</p></div>
            <div className="mt-4"><p className="text-[9px] font-bold uppercase tracking-wider text-[#895d46]">To connect it officially</p><ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[10px] leading-relaxed text-[#6f665a]"><li>Use an Instagram Business or Creator account and create a Meta developer app.</li><li>Configure Meta Login/OAuth and request only the Instagram permissions this feature needs; complete Meta App Review/required access approvals.</li><li>Store the Instagram token on the server, never in browser code. Fetch permitted media/insights, then let Z summarize hooks, formats, and available performance signals.</li></ol></div>
            <p className="mt-3 rounded-[12px] bg-[#f7efe6] p-2.5 text-[9px] leading-relaxed text-[#786655]">Z’s model API key is separate from Instagram authorization. A Meta AI agent cannot use that key to sign in to Instagram or scrape pages; the supported path is the user-approved Instagram API connection.</p>
            <div className="mt-4 flex flex-wrap gap-2"><a href="https://www.postman.com/meta/instagram/collection/6yqw8pt/instagram-api" target="_blank" rel="noreferrer" className="rounded-full bg-[#252620] px-3 py-2 text-[9px] font-semibold text-white hover:bg-[#9b563b]">Meta’s official API collection <ArrowRight size={10} className="ml-1 inline" /></a><a href="https://developers.facebook.com/docs/instagram-platform/" target="_blank" rel="noreferrer" className="rounded-full border border-[#ddd4c8] px-3 py-2 text-[9px] font-semibold text-[#695d50] hover:bg-[#f7f4ee]">Instagram Platform docs <ArrowRight size={10} className="ml-1 inline" /></a><button onClick={() => setInstagramPlanOpen(false)} className="ml-auto rounded-full border border-[#ddd4c8] px-3 py-2 text-[9px] font-semibold text-[#695d50]">Got it</button></div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {recordingOpen && activeDraft && <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171815]/65 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ y: 16, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: .98 }} className="grid max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[26px] bg-[#faf8f2] shadow-2xl lg:grid-cols-[1.1fr_.9fr]">
            <div className="relative grid min-h-[260px] place-items-center bg-[#252620] p-4 text-white sm:min-h-[440px]">
              <video ref={videoRef} autoPlay muted playsInline className={`absolute inset-0 h-full w-full object-cover ${cameraReady ? "" : "hidden"}`} />
              {!cameraReady && <div className="relative z-10 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10"><Video size={26} /></span><p className="mt-4 text-sm">Camera preview</p><p className="mt-1 text-xs text-white/55">Allow camera and microphone when prompted</p><button onClick={enableCamera} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#252620]">Enable camera</button></div>}
              {cameraReady && <div className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-xs">{recording ? <span className="inline-flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}</span> : "Camera ready"}</div>}
            </div>
            <div className="flex min-h-0 flex-col p-5 sm:p-6">
              <div className="flex shrink-0 items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#9b563b]">Read & record</p><h3 className="mt-1 font-serif text-2xl">{activeDraft.title}</h3></div><button onClick={() => { if (recording) stopRecording(); else { stopCamera(); setRecordingOpen(false); setMobileSessionId(""); } }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#eee9df]" aria-label="Close recorder"><X size={16} /></button></div>
              <div className="my-3 flex shrink-0 items-center gap-3 rounded-[16px] border border-[#eadfd0] bg-[#f7f1e8] p-2.5">
                {mobileRecordUrl ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=116x116&data=${encodeURIComponent(mobileRecordUrl)}`} alt="Scan to open this script on your phone" className="h-[76px] w-[76px] shrink-0 rounded-[10px] border border-white bg-white p-1" /> : <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[10px] bg-white text-[#a85f43]"><Smartphone size={24} /></div>}
                <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-[10px] font-bold text-[#332f29]"><Smartphone size={13} className="text-[#a85f43]" /> Record on your phone</p><p className="mt-1 text-[8px] leading-relaxed text-[#71695f]">Scan to read this script, record with your phone camera, then send the take straight to Edit.</p><p className="mt-1.5 flex items-center gap-1 text-[8px] font-semibold text-[#80614c]"><span className={`h-1.5 w-1.5 rounded-full ${mobileStatus === "mobile_connected" || mobileStatus === "recording" ? "animate-pulse bg-[#6a9a6b]" : mobileStatus === "completed" ? "bg-[#6a9a6b]" : "bg-[#c39466]"}`} />{mobileStatus === "mobile_connected" ? "Phone connected" : mobileStatus === "recording" ? "Recording on phone" : mobileStatus === "completed" ? "Take received" : "Waiting for phone scan"}</p>{mobileRecordUrl && <a href={mobileRecordUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[8px] font-semibold text-[#9b563b] hover:underline">Open phone companion <ExternalLink size={9} /></a>}</div>
              </div>
              <p className="mb-1 shrink-0 text-[7px] leading-relaxed text-[#8a8277]">Phone and computer should share Wi-Fi. The phone opens the companion on your local network; camera access may require HTTPS.</p>
              <div className="my-4 flex-1 space-y-4 overflow-y-auto rounded-[18px] bg-white p-4">{activeDraft.beats.map((beat, index) => <div key={index}><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#a16a50]">{beat.phase || `Beat ${index + 1}`}</p><p className="mt-1 font-serif text-lg leading-relaxed">{beat.spokenLine}</p></div>)}</div>
              <div className="flex items-center justify-between gap-2"><button onClick={copyScript} className="inline-flex items-center gap-1.5 rounded-full border border-[#ded8ce] px-3 py-2 text-xs"><Copy size={13} /> Copy</button>{!cameraReady ? <span className="text-[11px] text-[#898478]">Camera access needed to record</span> : recording ? <button onClick={stopRecording} className="inline-flex items-center gap-2 rounded-full bg-[#a7382b] px-5 py-2.5 text-xs font-semibold text-white"><MicOff size={14} /> Stop & send to edit</button> : <button onClick={startRecording} className="inline-flex items-center gap-2 rounded-full bg-[#252620] px-5 py-2.5 text-xs font-semibold text-white"><Play size={14} fill="currentColor" /> Record take</button>}</div>
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="fixed bottom-5 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-[#252620] px-4 py-2.5 text-xs text-white shadow-xl">{toast}</motion.div>}</AnimatePresence>
    </div>
  );
}

