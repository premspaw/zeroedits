"use client";

import React from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Mic,
  Scissors,
  Sliders,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import Pip from "./Pip";
import type { HeaderTab } from "./AppleDockNav";
import { useZeeBrain } from "@/lib/zee-brain";

interface ZeeViewProps {
  onSwitchToTab: (tab: HeaderTab) => void;
  onNewReel?: () => void;
  recentTopic?: string;
  totalReelsCount?: number;
}

const FORMAT_OPTIONS = [
  ["auto", "Let Z choose"],
  ["cutout", "Talking head + cutouts"],
  ["storyExplainer", "Story explainer"],
  ["paperCut", "Paper cut"],
  ["clay3d", "Clay 3D"],
  ["imageStory", "Image storyteller"],
  ["paperCard", "Paper card"],
  ["blackNeon", "Black neon"],
  ["minimal", "Minimal"],
] as const;

export default function ZeeView({
  onSwitchToTab,
  recentTopic,
  totalReelsCount = 0,
}: ZeeViewProps) {
  const { brain, updateBrain } = useZeeBrain();
  const userName = brain.virtualYou.userName.trim();

  const updatePreference = (
    key: "voiceCadence" | "thinkingStyle" | "preferredFormat" | "signatureHookStyle" | "visualTaste",
    value: string,
  ) => {
    updateBrain((prev) => ({
      ...prev,
      virtualYou: { ...prev.virtualYou, [key]: value },
    }));
  };

  const stages: {
    id: HeaderTab;
    step: string;
    title: string;
    description: string;
    action: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: "u",
      step: "01 · UNDERSTAND",
      title: "Give Z the story",
      description: "Talk or type. Z saves the moment, reflects it back, and asks what it needs to understand better.",
      action: "Open living memory",
      icon: <Mic size={18} />,
      color: "#A6573D",
    },
    {
      id: "script",
      step: "02 · WRITE",
      title: "Shape it into a script",
      description: "Turn a real memory or fresh idea into a spoken script, a series, or a documentary outline.",
      action: "Open Script",
      icon: <BookOpen size={18} />,
      color: "#B7791F",
    },
    {
      id: "edit",
      step: "03 · MAKE",
      title: "Build the video",
      description: "Bring in your footage, review the transcript, and shape the edit, captions, visuals, and sound.",
      action: "Open Video Studio",
      icon: <Scissors size={18} />,
      color: "#3467A8",
    },
    {
      id: "post",
      step: "04 · SHARE",
      title: "Prepare to publish",
      description: "Review the finished video and its export details before you share it.",
      action: "Open publishing",
      icon: <Video size={18} />,
      color: "#39816A",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 pb-10 pt-2 sm:px-6 animate-fade-in">
      <section className="grid gap-5 rounded-[28px] border border-[#e5ddd1] bg-gradient-to-br from-[#fffdfa] via-[#faf6ef] to-[#f4e9df] p-5 shadow-[0_18px_55px_rgba(54,42,28,0.07)] sm:p-8 lg:grid-cols-[1fr_300px] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#a6573d]/20 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a6573d]">
            <Sparkles size={12} /> Your creative partner
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight text-[#25231f] sm:text-5xl">
            Z helps you turn what matters into something you can share.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#665d53] sm:text-base">
            Start with your own story or an idea. Z helps you understand it, write it in your voice, shape the video, and prepare the finished piece. You can review and adjust each step.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => onSwitchToTab("u")} className="inline-flex items-center gap-2 rounded-xl bg-[#a6573d] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#87462f]">
              <Mic size={16} /> Talk to Z <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => onSwitchToTab("script")} className="inline-flex items-center gap-2 rounded-xl border border-[#d9cfc3] bg-white px-4 py-3 text-sm font-semibold text-[#37312b] transition hover:border-[#a6573d]">
              <BookOpen size={16} /> Start a script
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4">
          <Pip mood="happy" size={68} interactive showDialogue={false} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a6573d]">Z is ready</p>
            <p className="mt-1 font-serif text-xl text-[#292722]">{userName ? `Welcome, ${userName}` : "Your workspace"}</p>
            <p className="mt-1 text-xs leading-5 text-[#776d62]">
              {brain.memories.length} saved {brain.memories.length === 1 ? "story" : "stories"} · {brain.gallery.length} visuals · {totalReelsCount} {totalReelsCount === 1 ? "script" : "scripts"} made
            </p>
            {recentTopic && <p className="mt-2 truncate text-[10px] text-[#8a7e70]" title={recentTopic}>Last activity: {recentTopic}</p>}
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a6573d]">How it works</p>
            <h2 className="mt-1 font-serif text-2xl text-[#292722]">From your first thought to a finished video</h2>
          </div>
          <p className="text-xs text-[#82796f]">You stay in control at every step.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <button key={stage.id} type="button" onClick={() => onSwitchToTab(stage.id)} className="group flex min-h-[210px] flex-col rounded-2xl border border-[#e8e1d7] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c4aa97] hover:shadow-md">
              <div className="flex w-full items-center justify-between">
                <span className="text-[9px] font-semibold tracking-[0.12em]" style={{ color: stage.color }}>{stage.step}</span>
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ color: stage.color, backgroundColor: `${stage.color}14` }}>{stage.icon}</span>
              </div>
              <h3 className="mt-4 font-serif text-xl text-[#292722]">{stage.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-5 text-[#746b60]">{stage.description}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#51483e] group-hover:text-[#a6573d]">{stage.action}<ArrowRight size={13} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-[24px] border border-[#e5ddd1] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a6573d]"><Sliders size={13} /> Your controls</p>
            <h2 className="mt-1 font-serif text-2xl text-[#292722]">Adjust how Z works with you</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#746b60]">These saved preferences follow your work into Script and Video Studio. Change them whenever your direction changes.</p>
          </div>
          <button type="button" onClick={() => onSwitchToTab("u")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e1d7] px-3 py-2 text-xs font-semibold text-[#51483e] transition hover:border-[#a6573d]"><User size={14} /> Personal and brand profile</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-xs font-semibold text-[#4a4138]">Writing voice
            <input value={brain.virtualYou.voiceCadence} onChange={(event) => updatePreference("voiceCadence", event.target.value)} placeholder="Warm, direct, thoughtful, natural..." className="mt-1.5 h-10 w-full rounded-xl border border-[#e8e1d7] bg-[#fffdfa] px-3 text-sm font-normal outline-none focus:border-[#a6573d]" />
          </label>
          <label className="text-xs font-semibold text-[#4a4138]">How Z should shape a story
            <input value={brain.virtualYou.thinkingStyle} onChange={(event) => updatePreference("thinkingStyle", event.target.value)} placeholder="Keep it grounded; ask when context is missing..." className="mt-1.5 h-10 w-full rounded-xl border border-[#e8e1d7] bg-[#fffdfa] px-3 text-sm font-normal outline-none focus:border-[#a6573d]" />
          </label>
          <label className="text-xs font-semibold text-[#4a4138]">Default visual direction
            <input value={brain.virtualYou.visualTaste} onChange={(event) => updatePreference("visualTaste", event.target.value)} placeholder="Clean captions, warm colors, real footage..." className="mt-1.5 h-10 w-full rounded-xl border border-[#e8e1d7] bg-[#fffdfa] px-3 text-sm font-normal outline-none focus:border-[#a6573d]" />
          </label>
          <label className="text-xs font-semibold text-[#4a4138]">Hook preference
            <input value={brain.virtualYou.signatureHookStyle} onChange={(event) => updatePreference("signatureHookStyle", event.target.value)} placeholder="Start with a real detail or honest question..." className="mt-1.5 h-10 w-full rounded-xl border border-[#e8e1d7] bg-[#fffdfa] px-3 text-sm font-normal outline-none focus:border-[#a6573d]" />
          </label>
          <label className="text-xs font-semibold text-[#4a4138]">Default video style
            <select value={brain.virtualYou.preferredFormat || "auto"} onChange={(event) => updatePreference("preferredFormat", event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#e8e1d7] bg-[#fffdfa] px-3 text-sm font-normal outline-none focus:border-[#a6573d]">
              {FORMAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <p className="flex items-start gap-2 rounded-xl bg-[#faf7f1] px-3 py-2.5 text-[10px] leading-4 text-[#796f64]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#39816a]" />Z uses your saved stories as evidence and asks before filling gaps.</p>
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#292722] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-[#e6ad82]" />
          <div>
            <p className="text-sm font-semibold">Z works across one connected workspace</p>
            <p className="mt-0.5 text-[10px] text-white/60">Your memories, scripts, edits, and publishing steps stay connected.</p>
          </div>
        </div>
        <button type="button" onClick={() => onSwitchToTab("edit")} className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-[#292722] transition hover:bg-[#f4e9df]">Open Video Studio <ArrowRight size={14} /></button>
      </section>
    </div>
  );
}
