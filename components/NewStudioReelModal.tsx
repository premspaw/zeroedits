"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Sparkles,
  Lock,
  Unlock,
  Clapperboard,
  Film,
  Scissors,
  Check,
  Layers,
  Volume2,
  Mic,
  Database,
  FileJson,
  Tv,
  Presentation,
  Flame,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  FolderOpen,
  Trash2,
} from "lucide-react";
import type {
  StudioProject,
  ProjectFormatType,
  AspectRatioType,
  LockedMemorySettings,
} from "@/lib/studio-projects";

interface NewStudioReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: StudioProject, launchPrompt?: string) => void;
  activeProject?: StudioProject | null;
}

interface FormatCardOption {
  id: ProjectFormatType;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  defaultTemplate: string;
  defaultTone: string;
}

const FORMAT_OPTIONS: FormatCardOption[] = [
  {
    id: "series",
    title: "Episodic Series",
    badge: "TONE & VOICE LOCKED",
    description:
      "Multi-part series with locked identity. Retains the exact same tone, voiceover, and animation styling across all episodes.",
    icon: <Tv size={20} className="text-[#E4491B]" />,
    accent: "#E4491B",
    defaultTemplate: "cutout",
    defaultTone: "punchy",
  },
  {
    id: "documentary",
    title: "Documentary & Deep Dive",
    badge: "CINEMATIC NARRATIVE",
    description:
      "Story-driven journalism and deep dives with cinematic pacing, archival cutaways, and thought-provoking insights.",
    icon: <Clapperboard size={20} className="text-[#3B82F6]" />,
    accent: "#3B82F6",
    defaultTemplate: "paperCut",
    defaultTone: "cinematic",
  },
  {
    id: "explainer",
    title: "Explainer & Talking-Head",
    badge: "HIGH RETENTION",
    description:
      "Punchy hook, kinetic typography, dynamic pop-ups, and speaker cutout for viral retention reels.",
    icon: <Flame size={20} className="text-[#F59E0B]" />,
    accent: "#F59E0B",
    defaultTemplate: "cutout",
    defaultTone: "punchy",
  },
  {
    id: "procedural",
    title: "Procedural & Tactile World",
    badge: "TACTILE 3D / PAPER",
    description:
      "Tactile paper cut scenery or Clay 3D stop-motion worlds driven by generative math and audio tracks.",
    icon: <Layers size={20} className="text-[#10B981]" />,
    accent: "#10B981",
    defaultTemplate: "clay3d",
    defaultTone: "calm",
  },
  {
    id: "brand",
    title: "Brand & Product Showcase",
    badge: "HIGH CONVERTING",
    description:
      "Polished launch videos, software feature demos, and founder stories with sleek Swiss typography.",
    icon: <Presentation size={20} className="text-[#8B5CF6]" />,
    accent: "#8B5CF6",
    defaultTemplate: "minimal",
    defaultTone: "hormozi",
  },
  {
    id: "personalized",
    title: "Personalized Template Recipe",
    badge: "REUSABLE SIGNATURE",
    description:
      "Save your personal animation recipe, signature colors, font, and pace as a locked reusable template.",
    icon: <Sparkles size={20} className="text-[#EC4899]" />,
    accent: "#EC4899",
    defaultTemplate: "cutout",
    defaultTone: "punchy",
  },
];

const ASPECT_RATIOS: Array<{
  id: AspectRatioType;
  label: string;
  sublabel: string;
  isAvailable: boolean;
}> = [
  { id: "9:16", label: "9:16 Vertical", sublabel: "Reels / TikTok / Shorts", isAvailable: true },
  { id: "1:1", label: "1:1 Square", sublabel: "Feed & LinkedIn", isAvailable: true },
  { id: "16:9", label: "16:9 Widescreen", sublabel: "YouTube / Docs", isAvailable: false },
  { id: "4:5", label: "4:5 Portrait", sublabel: "Instagram Feed", isAvailable: false },
];

const TEMPLATES: Array<{
  id: string;
  name: string;
  category: string;
  isAvailable: boolean;
}> = [
  { id: "cutout", name: "ZAI Cutout (Talking Head + Cutouts)", category: "High Energy", isAvailable: true },
  { id: "paperCut", name: "Paper Cut (Tactile Handmade Scenery)", category: "Narrative", isAvailable: true },
  { id: "clay3d", name: "Clay 3D (Plasticine Stop-Motion)", category: "Artistic", isAvailable: true },
  { id: "procedural", name: "Procedural (Math & Generative Tracks)", category: "Dynamic", isAvailable: true },
  { id: "blackNeon", name: "Black Neon (Cyberpunk Glitch)", category: "Bold", isAvailable: true },
  { id: "minimal", name: "Minimalist Bold (Clean Typography)", category: "Editorial", isAvailable: true },
  { id: "anime", name: "Anime Cel-Shading (Impact Frames)", category: "Anime", isAvailable: false },
  { id: "unreal3d", name: "Unreal Photoreal 3D Cinematic", category: "Hyper-Real", isAvailable: false },
];

const TONES: Array<{ id: string; label: string; desc: string }> = [
  { id: "punchy", label: "💥 Energetic & Punchy", desc: "Fast-paced, bold hook, snappy retention rhythm" },
  { id: "calm", label: "🧘 Calm & Thoughtful", desc: "Reflective, philosophical, atmospheric cadence" },
  { id: "cinematic", label: "🌟 Inspiring & Cinematic", desc: "Hero's journey, sweeping storytelling, inspiring" },
  { id: "hormozi", label: "🦁 Hormozi Raw & Direct", desc: "No fluff, high authority, high actionable value" },
  { id: "humorous", label: "😄 Witty & Humorous", desc: "Playful irony, relatable humor, light comedic timing" },
  { id: "dramatic", label: "🎭 Dramatic & Suspenseful", desc: "Curiosity hooks, tension build-up, mystery payoff" },
];

const VOICES: Array<{ id: string; name: string; lang: string; isAvailable: boolean }> = [
  { id: "EN-IN", name: "Vihaan", lang: "English (India)", isAvailable: true },
  { id: "EN-US", name: "Studio Pro", lang: "English (US)", isAvailable: true },
  { id: "HI-VIHAAN", name: "Vihaan (Hindi)", lang: "Hindi (Conversational)", isAvailable: true },
  { id: "HI-ANANYA", name: "Ananya", lang: "Hindi (Expressive)", isAvailable: true },
  { id: "KN-DIVYA", name: "Divya", lang: "Kannada (Melodic)", isAvailable: true },
  { id: "KN-KIRAN", name: "Kiran", lang: "Kannada (Dynamic)", isAvailable: true },
  { id: "AI-TWIN", name: "Personal AI Voice Clone", lang: "Trained on your mic", isAvailable: false },
];

export default function NewStudioReelModal({
  isOpen,
  onClose,
  onProjectCreated,
  activeProject,
}: NewStudioReelModalProps) {
  const [activeTab, setActiveTab] = useState<"create" | "saved">("create");
  const [selectedFormat, setSelectedFormat] = useState<ProjectFormatType>("series");
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioType>("9:16");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("cutout");
  const [selectedTone, setSelectedTone] = useState<string>("punchy");
  const [selectedVoice, setSelectedVoice] = useState<string>("EN-IN");

  // Lock toggles
  const [isToneLocked, setIsToneLocked] = useState<boolean>(true);
  const [isVoiceLocked, setIsVoiceLocked] = useState<boolean>(true);
  const [isTemplateLocked, setIsTemplateLocked] = useState<boolean>(true);

  // Form details
  const [title, setTitle] = useState<string>("");
  const [storyPrompt, setStoryPrompt] = useState<string>("");
  const [episodeCount, setEpisodeCount] = useState<number>(5);

  // Saved projects list
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Auto-generate a title placeholder when format changes
  useEffect(() => {
    if (selectedFormat === "series") {
      setTitle((prev) => (prev ? prev : "Startup Lessons & Stories"));
    } else if (selectedFormat === "documentary") {
      setTitle((prev) => (prev ? prev : "The History of Digital Gold"));
    } else if (selectedFormat === "explainer") {
      setTitle((prev) => (prev ? prev : "Why Focus Is Your Superpower"));
    } else if (selectedFormat === "procedural") {
      setTitle((prev) => (prev ? prev : "Origins of the Honeybee"));
    } else if (selectedFormat === "brand") {
      setTitle((prev) => (prev ? prev : "ZeroEdits Studio Launch"));
    } else if (selectedFormat === "personalized") {
      setTitle((prev) => (prev ? prev : "My Signature Minimal Recipe"));
    }
  }, [selectedFormat]);

  // Load saved projects when "saved" tab opens
  const fetchSavedProjects = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/studio/project");
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        setSavedProjects(data.projects);
      }
    } catch (e) {
      console.error("Failed to load saved projects", e);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedProjects();
    }
  }, [activeTab]);

  if (!isOpen) return null;

  const handleLaunchProject = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);

    const slug = (title.trim() || "studio-reel")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const projectId = `${selectedFormat}-${slug}-${Date.now().toString(36)}`;

    const lockedMemory: LockedMemorySettings = {
      isToneLocked,
      tonality: selectedTone,
      toneBible: `Tone locked to ${selectedTone}. Maintain consistent emotional cadence and delivery across all reels.`,
      isVoiceLocked,
      voice: selectedVoice,
      voiceSpeed: 1.0,
      voicePitch: 1.0,
      isTemplateLocked,
      template: selectedTemplate,
      templateStyleName: TEMPLATES.find((t) => t.id === selectedTemplate)?.name || selectedTemplate,
      aspectRatio: selectedRatio,
    };

    const newProject: Partial<StudioProject> = {
      id: projectId,
      title: title.trim() || `${selectedFormat.toUpperCase()} Project`,
      formatType: selectedFormat,
      description: `${selectedFormat === "series" ? "Episodic series" : selectedFormat} with locked memory.`,
      storyPrompt: storyPrompt.trim(),
      goal: "personal-brand",
      lockedMemory,
      seriesMeta:
        selectedFormat === "series"
          ? {
              seriesName: title.trim() || "My Series",
              currentEpisode: 1,
              totalPlannedEpisodes: episodeCount,
              episodes: [
                {
                  id: `ep-1-${Date.now()}`,
                  episodeNumber: 1,
                  title: `${title.trim() || "My Series"} - Episode 1`,
                  hook: storyPrompt.trim() || "Episode 1 Hook",
                  status: "in_progress",
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : undefined,
    };

    try {
      const res = await fetch("/api/studio/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setSaveSuccessMsg(`Database file "${data.databaseFileName}" locked & saved!`);
        setTimeout(() => {
          onProjectCreated(data.project, storyPrompt.trim() || title.trim());
          onClose();
        }, 600);
      } else {
        alert("Failed to initialize project: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      alert("Error creating project database: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectExistingProject = (proj: StudioProject) => {
    onProjectCreated(proj);
    onClose();
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project database file?")) return;
    try {
      await fetch(`/api/studio/project?id=${id}`, { method: "DELETE" });
      setSavedProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-[960px] max-h-[92vh] flex flex-col rounded-[26px] border-2 border-[#141414] bg-[#F7F5EF] text-[#141414] shadow-[8px_8px_0px_#141414] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b-2 border-[#141414] bg-[#ECEAE3] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E4491B] border-2 border-[#141414] text-white grid place-items-center shadow-[2px_2px_0px_#141414]">
              <Plus size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-black uppercase tracking-tight text-[#141414]">
                  New Studio Reel & Series Launch
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#141414] text-white mono text-[9.5px] font-bold">
                  DATABASE MEMORY
                </span>
              </div>
              <p className="text-[12px] text-[#6B6A64] font-medium">
                Lock tone, voiceover, and animation styling into a persistent project database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex p-0.5 rounded-xl border border-[#D5D2C8] bg-[#FAF8F3]">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  activeTab === "create"
                    ? "bg-[#141414] text-white shadow-xs"
                    : "text-[#6B6A64] hover:text-[#141414]"
                }`}
              >
                + Create New
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                  activeTab === "saved"
                    ? "bg-[#141414] text-white shadow-xs"
                    : "text-[#6B6A64] hover:text-[#141414]"
                }`}
              >
                <Database size={11} />
                <span>Saved Projects</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#141414]/30 hover:border-[#141414] bg-white grid place-items-center text-[#141414] hover:bg-rose-50 hover:text-rose-600 transition"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === "create" ? (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 max-h-[calc(92vh-140px)]">
            {/* Step 1: Format Selection (6 Options) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#141414] text-white mono text-[10px] font-black grid place-items-center">
                    1
                  </span>
                  <label className="text-[13px] font-extrabold uppercase tracking-wide text-[#141414]">
                    Choose Story Format & Identity
                  </label>
                </div>
                <span className="mono text-[10.5px] text-[#6B6A64]">
                  6 Format Engines
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {FORMAT_OPTIONS.map((f) => {
                  const isSelected = selectedFormat === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedFormat(f.id);
                        setSelectedTemplate(f.defaultTemplate);
                        setSelectedTone(f.defaultTone);
                      }}
                      className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#FFFDF9] border-[#141414] shadow-[4px_4px_0px_#141414] -translate-y-0.5"
                          : "bg-white/80 border-[#D5D2C8] hover:border-[#141414] hover:bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#ECEAE3] border border-[#141414]/20 grid place-items-center">
                              {f.icon}
                            </div>
                            <span className="text-[13px] font-black text-[#141414] leading-tight">
                              {f.title}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#E4491B] text-white grid place-items-center shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-[#F6D9CC] text-[#E4491B] mono text-[9px] font-extrabold mb-1.5">
                          {f.badge}
                        </span>
                        <p className="text-[11px] text-[#6B6A64] leading-relaxed">
                          {f.description}
                        </p>
                      </div>

                      {f.id === "series" && (
                        <div className="mt-2.5 pt-2 border-t border-[#D5D2C8]/60 flex items-center gap-1.5 mono text-[10px] text-[#E4491B] font-bold">
                          <Lock size={10} />
                          <span>Locks Voice, Tone & Arc</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Aspect Ratio & Animation Template Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#D5D2C8]">
              {/* Aspect Ratio */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#141414] text-white mono text-[10px] font-black grid place-items-center">
                    2
                  </span>
                  <label className="text-[12.5px] font-extrabold uppercase tracking-wide text-[#141414]">
                    Aspect Ratio
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ASPECT_RATIOS.map((ratio) => {
                    const isSelected = selectedRatio === ratio.id;
                    return (
                      <button
                        key={ratio.id}
                        type="button"
                        disabled={!ratio.isAvailable}
                        onClick={() => ratio.isAvailable && setSelectedRatio(ratio.id)}
                        className={`p-2.5 rounded-xl border-2 text-left transition ${
                          !ratio.isAvailable
                            ? "opacity-55 cursor-not-allowed bg-[#ECEAE3] border-[#D5D2C8]"
                            : isSelected
                            ? "bg-[#FFFDF9] border-[#141414] shadow-[2px_2px_0px_#141414]"
                            : "bg-white border-[#D5D2C8] hover:border-[#141414]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-extrabold text-[#141414]">
                            {ratio.label}
                          </span>
                          {!ratio.isAvailable ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 mono text-[8.5px] font-bold">
                              Coming Soon
                            </span>
                          ) : isSelected ? (
                            <Check size={13} className="text-[#E4491B]" />
                          ) : null}
                        </div>
                        <span className="block mono text-[9.5px] text-[#6B6A64] mt-0.5">
                          {ratio.sublabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Animation Template Style */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#141414] text-white mono text-[10px] font-black grid place-items-center">
                      3
                    </span>
                    <label className="text-[12.5px] font-extrabold uppercase tracking-wide text-[#141414]">
                      Animation Template & Visual Style
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTemplateLocked(!isTemplateLocked)}
                    className="flex items-center gap-1 mono text-[10px] font-bold text-[#E4491B] hover:underline"
                  >
                    {isTemplateLocked ? <Lock size={10} /> : <Unlock size={10} />}
                    <span>{isTemplateLocked ? "Template Locked" : "Unlocked"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-[145px] overflow-y-auto pr-1">
                  {TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => tmpl.isAvailable && setSelectedTemplate(tmpl.id)}
                        className={`p-2 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          !tmpl.isAvailable
                            ? "opacity-55 cursor-not-allowed bg-[#ECEAE3] border-[#D5D2C8]"
                            : isSelected
                            ? "bg-[#FFFDF9] border-[#141414] shadow-[2px_2px_0px_#141414]"
                            : "bg-white border-[#D5D2C8] hover:border-[#141414]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11.5px] font-bold text-[#141414]">
                            {tmpl.name}
                          </span>
                        </div>
                        {!tmpl.isAvailable ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 mono text-[8.5px] font-bold">
                            Coming Soon
                          </span>
                        ) : isSelected ? (
                          <Check size={13} className="text-[#E4491B]" />
                        ) : (
                          <span className="mono text-[9px] text-[#6B6A64]">
                            {tmpl.category}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 3: Tonality & Voiceover Locking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#D5D2C8]">
              {/* Tonality Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#141414] text-white mono text-[10px] font-black grid place-items-center">
                      4
                    </span>
                    <label className="text-[12.5px] font-extrabold uppercase tracking-wide text-[#141414]">
                      Tonality & Emotional Cadence
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsToneLocked(!isToneLocked)}
                    className="flex items-center gap-1 mono text-[10px] font-bold text-[#E4491B] hover:underline"
                  >
                    {isToneLocked ? <Lock size={10} /> : <Unlock size={10} />}
                    <span>{isToneLocked ? "Tone Locked" : "Unlocked"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-[145px] overflow-y-auto pr-1">
                  {TONES.map((tone) => {
                    const isSelected = selectedTone === tone.id;
                    return (
                      <div
                        key={tone.id}
                        onClick={() => setSelectedTone(tone.id)}
                        className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#FFFDF9] border-[#141414] shadow-[2px_2px_0px_#141414]"
                            : "bg-white border-[#D5D2C8] hover:border-[#141414]"
                        }`}
                      >
                        <div>
                          <span className="text-[11.5px] font-bold text-[#141414] block">
                            {tone.label}
                          </span>
                          <span className="text-[9.5px] text-[#6B6A64]">
                            {tone.desc}
                          </span>
                        </div>
                        {isSelected && <Check size={13} className="text-[#E4491B] shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Voiceover Voice Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#141414] text-white mono text-[10px] font-black grid place-items-center">
                      5
                    </span>
                    <label className="text-[12.5px] font-extrabold uppercase tracking-wide text-[#141414]">
                      Voiceover Audio & Language
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVoiceLocked(!isVoiceLocked)}
                    className="flex items-center gap-1 mono text-[10px] font-bold text-[#E4491B] hover:underline"
                  >
                    {isVoiceLocked ? <Lock size={10} /> : <Unlock size={10} />}
                    <span>{isVoiceLocked ? "Voice Locked" : "Unlocked"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-[145px] overflow-y-auto pr-1">
                  {VOICES.map((v) => {
                    const isSelected = selectedVoice === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => v.isAvailable && setSelectedVoice(v.id)}
                        className={`p-2 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          !v.isAvailable
                            ? "opacity-55 cursor-not-allowed bg-[#ECEAE3] border-[#D5D2C8]"
                            : isSelected
                            ? "bg-[#FFFDF9] border-[#141414] shadow-[2px_2px_0px_#141414]"
                            : "bg-white border-[#D5D2C8] hover:border-[#141414]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Volume2 size={13} className="text-[#E4491B]" />
                          <div>
                            <span className="text-[11.5px] font-bold text-[#141414] block">
                              {v.name}
                            </span>
                            <span className="mono text-[9px] text-[#6B6A64]">
                              {v.lang}
                            </span>
                          </div>
                        </div>

                        {!v.isAvailable ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 mono text-[8.5px] font-bold">
                            Coming Soon
                          </span>
                        ) : isSelected ? (
                          <Check size={13} className="text-[#E4491B]" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 4: Series Project Details & Title */}
            <div className="pt-2 border-t border-[#D5D2C8] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                    {selectedFormat === "series" ? "Series Title / Theme Name" : "Reel Project Title"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Daily Founder Lessons, AI Decoded..."
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-[#141414] bg-white text-[13px] font-semibold text-[#141414] outline-none focus:ring-2 focus:ring-[#E4491B]"
                  />
                </div>

                {selectedFormat === "series" && (
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                      Planned Episodes
                    </label>
                    <select
                      value={episodeCount}
                      onChange={(e) => setEpisodeCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#141414] bg-white text-[13px] font-bold text-[#141414] outline-none"
                    >
                      <option value={3}>3 Episodes (Mini-Series)</option>
                      <option value={5}>5 Episodes (Standard)</option>
                      <option value={10}>10 Episodes (Masterclass)</option>
                      <option value={30}>30 Episodes (Daily Show)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Story Idea, Hook or Starting Topic
                </label>
                <textarea
                  rows={2}
                  value={storyPrompt}
                  onChange={(e) => setStoryPrompt(e.target.value)}
                  placeholder="Paste your script, write an opening hook, or describe what happens in Episode 1..."
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#141414] bg-white text-[12.5px] text-[#141414] outline-none focus:ring-2 focus:ring-[#E4491B] resize-none"
                />
              </div>

              {/* Live Database File Preview Banner */}
              <div className="p-3 rounded-2xl border-2 border-[#141414] bg-[#FFFDF9] shadow-[2px_2px_0px_#141414] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#141414] text-white grid place-items-center shrink-0">
                    <Database size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="mono text-[10.5px] font-bold text-[#141414]">
                        Database File:
                      </span>
                      <code className="mono text-[10px] px-1.5 py-0.5 rounded bg-[#ECEAE3] text-[#E4491B] font-bold">
                        data/storybank/projects/{selectedFormat}-
                        {(title || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 16)}.json
                      </code>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 mono text-[9px] text-[#6B6A64]">
                      <span>🔒 Tone: {selectedTone}</span>
                      <span>•</span>
                      <span>🔒 Voice: {selectedVoice}</span>
                      <span>•</span>
                      <span>🔒 Template: {selectedTemplate}</span>
                      <span>•</span>
                      <span>Ratio: {selectedRatio}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mono text-[10px] text-emerald-700 font-bold shrink-0">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Memory SD Auto-Lock</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Saved Projects Tab */
          <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1 max-h-[calc(92vh-140px)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-black uppercase text-[#141414]">
                Saved Project Databases
              </h3>
              <button
                type="button"
                onClick={fetchSavedProjects}
                className="mono text-[10.5px] text-[#E4491B] font-bold hover:underline"
              >
                Refresh List
              </button>
            </div>

            {isLoadingSaved ? (
              <div className="p-8 text-center text-[#6B6A64] mono text-[12px]">
                Loading projects...
              </div>
            ) : savedProjects.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-[#D5D2C8] bg-white">
                <FileJson size={28} className="mx-auto text-[#6B6A64] mb-2" />
                <p className="text-[13px] font-bold text-[#141414]">No project database files yet</p>
                <p className="text-[11px] text-[#6B6A64] mt-1">
                  Create your first Series or Custom Template to lock consistent tones.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#E4491B] text-white mono text-[11px] font-bold"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedProjects.map((p) => {
                  const isActive = activeProject?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectExistingProject(p)}
                      className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-[#FFFDF9] border-[#141414] shadow-[3px_3px_0px_#10B981]"
                          : "bg-white border-[#D5D2C8] hover:border-[#141414]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#ECEAE3] border border-[#141414]/20 grid place-items-center shrink-0">
                          {p.formatType === "series" ? (
                            <Tv size={16} className="text-[#E4491B]" />
                          ) : (
                            <Film size={16} className="text-[#3B82F6]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-extrabold text-[#141414]">
                              {p.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[#F6D9CC] text-[#E4491B] mono text-[9px] font-bold uppercase">
                              {p.formatType}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 mono text-[8.5px] font-bold">
                                ACTIVE IN STUDIO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mono text-[10px] text-[#6B6A64] mt-0.5">
                            <span>🔒 Tone: {p.lockedMemory?.tonality || "punchy"}</span>
                            <span>•</span>
                            <span>🔒 Voice: {p.lockedMemory?.voice || "EN-IN"}</span>
                            <span>•</span>
                            <span>Template: {p.lockedMemory?.template || "cutout"}</span>
                            {p.seriesMeta && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-[#E4491B]">
                                  Ep {p.seriesMeta.currentEpisode} of {p.seriesMeta.totalPlannedEpisodes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectExistingProject(p)}
                          className="px-3 py-1 rounded-xl bg-[#141414] hover:bg-[#E4491B] text-white mono text-[10px] font-bold transition"
                        >
                          Load Into Studio
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          className="p-1 text-[#6B6A64] hover:text-rose-600 rounded-md transition"
                          title="Delete Project File"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t-2 border-[#141414] bg-[#ECEAE3] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccessMsg ? (
              <span className="text-emerald-700 mono text-[11px] font-bold flex items-center gap-1">
                <Check size={14} /> {saveSuccessMsg}
              </span>
            ) : (
              <span className="mono text-[10.5px] text-[#6B6A64]">
                {selectedFormat === "series"
                  ? "Every episode will match this exact tone & voiceover."
                  : "Database will lock all selections for consistent generation."}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D5D2C8] bg-white text-[#141414] text-[12px] font-bold hover:bg-[#FAF8F3] transition"
            >
              Cancel
            </button>

            {activeTab === "create" && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleLaunchProject}
                className="px-5 py-2 rounded-xl border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white text-[12.5px] font-black flex items-center gap-2 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                {isSaving ? (
                  <span>Locking Database...</span>
                ) : (
                  <>
                    <Lock size={13} />
                    <span>Lock Memory & Launch Studio Reel</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

