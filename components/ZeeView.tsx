"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Scissors,
  Layers,
  Video,
  ArrowRight,
  Brain,
  Zap,
  CheckCircle2,
  User,
  BookOpen,
  Sliders,
} from "lucide-react";
import Pip, { PipMood } from "./Pip";
import type { HeaderTab } from "./AppleDockNav";
import { useZeeBrain } from "@/lib/zee-brain";

interface ZeeViewProps {
  onSwitchToTab: (tab: HeaderTab) => void;
  onNewReel?: () => void;
  recentTopic?: string;
  totalReelsCount?: number;
}

export default function ZeeView({
  onSwitchToTab,
  recentTopic = "Photosynthesis: How Plants Make Food",
}: ZeeViewProps) {
  const { brain } = useZeeBrain();
  const [pipMood, setPipMood] = useState<PipMood>("happy");

  return (
    <div className="mx-auto max-w-[1400px] w-full min-h-[calc(100vh-60px)] px-4 pt-1.5 pb-8 sm:px-8 sm:pt-2 sm:pb-10 animate-fade-in">
      {/* Top Hero Banner */}
      <div className="relative rounded-3xl border-2 border-[#141414] bg-gradient-to-br from-[#FAF8F3] via-[#F7F5EF] to-[#EFECE4] p-6 sm:p-10 shadow-[4px_4px_0px_#141414] overflow-hidden mb-8">
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#141414 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E4491B]/10 border border-[#E4491B]/30 text-[#E4491B] mono text-[11px] font-bold uppercase tracking-wider mb-3">
              <Sparkles size={12} />
              <span>
                Hey {brain.virtualYou.userName}, I Am Your Digital Brain ({brain.virtualYou.twinSyncScore}% Neural Sync)
              </span>
            </div>

            <h1 className="serif text-3xl sm:text-5xl font-bold text-[#141414] tracking-tight leading-[1.1] mb-3">
              Meet Zee. {brain.virtualYou.userName}&apos;s Living Second Mind & Reel Director.
            </h1>

            <p className="text-[15px] sm:text-[17px] text-[#55534E] leading-relaxed mb-6 font-normal">
              I connect your{" "}
              <strong className="text-[#141414]">
                Personal Story Vault & Creative Gallery (You)
              </strong>
              ,{" "}
              <strong className="text-[#141414]">Scripting</strong>,{" "}
              <strong className="text-[#141414]">Video Studio</strong>, and{" "}
              <strong className="text-[#141414]">Publishing</strong> into one continuous digital brain.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onSwitchToTab("u")}
                className="px-5 py-2.5 rounded-full border-2 border-[#141414] bg-[#E4491B] hover:bg-[#C93D14] text-white mono text-[13px] font-bold flex items-center gap-2 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer"
              >
                <User size={15} />
                <span>Open {brain.virtualYou.userName}&apos;s Digital Brain</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => onSwitchToTab("script")}
                className="px-5 py-2.5 rounded-full border-2 border-[#141414] bg-[#FFFFFF] hover:bg-[#FAF8F3] text-[#141414] mono text-[13px] font-bold flex items-center gap-2 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer"
              >
                <BookOpen size={14} className="text-[#E4491B]" />
                <span>Scripting Stage</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchToTab("edit")}
                className="px-5 py-2.5 rounded-full border-2 border-[#141414] bg-[#FFFFFF] hover:bg-[#FAF8F3] text-[#141414] mono text-[13px] font-bold flex items-center gap-2 shadow-[2px_2px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer"
              >
                <Scissors size={14} className="text-[#2563EB]" />
                <span>Video Studio</span>
              </button>
            </div>
          </div>

          {/* Interactive Pip Companion */}
          <div className="flex flex-col items-center p-6 rounded-2xl bg-[#FFFFFF]/90 border-2 border-[#141414] shadow-[3px_3px_0px_#141414] w-full sm:w-[320px] shrink-0 text-center">
            <div className="mb-2">
              <Pip
                mood={pipMood}
                size={76}
                interactive={true}
                showDialogue={false}
              />
            </div>

            <div className="mono text-xs font-bold text-[#141414] uppercase tracking-wider mb-1">
              Hey {brain.virtualYou.userName}, I Am Your Digital Brain
            </div>
            <div className="text-[12px] text-[#6B6A64] mb-3">
              &ldquo;{brain.memories.length} memories & {brain.gallery.length} visual supply assets synced across every stage.&rdquo;
            </div>

            {/* Mood toggles */}
            <div className="flex items-center justify-center gap-1.5 p-1 rounded-full bg-[#ECEAE3] border border-[#D5D2C8] w-full">
              {(["happy", "thinking", "idea", "reading"] as PipMood[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPipMood(m)}
                  className={`px-2.5 py-1 rounded-full mono text-[10px] font-bold uppercase transition ${
                    pipMood === m
                      ? "bg-[#141414] text-white shadow-xs"
                      : "text-[#6B6A64] hover:text-[#141414]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Page Memory Pipeline (You -> Script -> Edit -> Post) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            id: "u" as HeaderTab,
            title: `1. ${brain.virtualYou.userName}'s Digital Brain`,
            desc: `${brain.memories.length} stories + ${brain.gallery.length} curated workplace & travel visuals.`,
            pill: "Voice + Visual Vault",
            color: "#E4491B",
          },
          {
            id: "script" as HeaderTab,
            title: "2. Scripting Stage",
            desc: `Weaves your reading rhythm & lived stories into scroll-stopping scripts.`,
            pill: "Story Alchemy",
            color: "#D97706",
          },
          {
            id: "edit" as HeaderTab,
            title: "3. Edit & Motion Stage",
            desc: `Applies ${brain.virtualYou.preferredFormat} cutaways, dialogue cleanup & 60fps choreography.`,
            pill: "Stage A + B Studio",
            color: "#2563EB",
          },
          {
            id: "post" as HeaderTab,
            title: "4. Post & Distribute",
            desc: `Exports verified 1080×1920 MP4 with captions crafted in ${brain.virtualYou.userName}'s voice.`,
            pill: "1080×1920 MP4",
            color: "#059669",
          },
        ].map((stage) => (
          <div
            key={stage.id}
            onClick={() => onSwitchToTab(stage.id)}
            className="p-5 rounded-2xl border-2 border-[#141414] bg-white hover:bg-[#FAF8F3] shadow-[3px_3px_0px_#141414] flex flex-col justify-between cursor-pointer transition"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F3] border"
                  style={{ color: stage.color, borderColor: stage.color }}
                >
                  {stage.pill}
                </span>
                <ArrowRight size={13} className="text-[#141414]" />
              </div>
              <h3 className="serif text-lg font-bold text-[#141414] mb-1">
                {stage.title}
              </h3>
              <p className="text-xs text-[#55534E] leading-relaxed">
                {stage.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl border-2 border-[#141414] bg-[#FFFFFF] shadow-[3px_3px_0px_#141414]">
          <div className="w-10 h-10 rounded-xl bg-[#E4491B]/10 border border-[#E4491B]/30 text-[#E4491B] flex items-center justify-center mb-4">
            <Brain size={20} />
          </div>
          <h3 className="serif text-xl font-bold text-[#141414] mb-2">
            Stage A: Editorial Cleanup
          </h3>
          <p className="text-[13px] text-[#55534E] leading-relaxed mb-4">
            Spots false starts, stammers, and filler sounds. Protects rhetorical delivery while cutting dead air to hook viewers instantly.
          </p>
          <div className="mono text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>Deterministic cut verification</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border-2 border-[#141414] bg-[#FFFFFF] shadow-[3px_3px_0px_#141414]">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center mb-4">
            <Layers size={20} />
          </div>
          <h3 className="serif text-xl font-bold text-[#141414] mb-2">
            Stage B: Minimalist Motion
          </h3>
          <p className="text-[13px] text-[#55534E] leading-relaxed mb-4">
            Alternates smoothly between full-screen face value and 100% full-screen visual cutaways with zero clashing or overlapping graphics.
          </p>
          <div className="mono text-[11px] font-bold text-[#2563EB] flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>Dialogue-grounded cards</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border-2 border-[#141414] bg-[#FFFFFF] shadow-[3px_3px_0px_#141414]">
          <div className="w-10 h-10 rounded-xl bg-[#059669]/10 border border-[#059669]/30 text-[#059669] flex items-center justify-center mb-4">
            <Zap size={20} />
          </div>
          <h3 className="serif text-xl font-bold text-[#141414] mb-2">
            Deterministic Export
          </h3>
          <p className="text-[13px] text-[#55534E] leading-relaxed mb-4">
            Frame-by-frame seek and decode at exact timestamps. Shared 2D canvas compositor ensures preview and download match 1:1 with lossless stereo audio.
          </p>
          <div className="mono text-[11px] font-bold text-[#059669] flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>Verified 1080×1920 MP4</span>
          </div>
        </div>
      </div>

      {/* Live Cross-Page Brain Activity Log & Quick Launchpad */}
      <div className="p-6 rounded-2xl border-2 border-[#141414] bg-[#FAF8F3] shadow-[3px_3px_0px_#141414] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#141414] text-white flex items-center justify-center font-black text-sm shrink-0">
            Z
          </div>
          <div>
            <div className="mono text-xs font-bold text-[#141414] uppercase flex items-center gap-2">
              <span>Digital Brain Pulse</span>
              <span className="text-[#E4491B]">
                • {brain.activityLogs[0]?.action || recentTopic}
              </span>
            </div>
            <div className="text-sm font-semibold text-[#55534E]">
              Latest Spark: &ldquo;{brain.variables["user.todayInsight"]}&rdquo;
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSwitchToTab("u")}
            className="px-4 py-2 rounded-full border border-[#D5D2C8] bg-white hover:bg-[#F7F5EF] text-[#141414] mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders size={13} className="text-[#E4491B]" />
            <span>Open {brain.virtualYou.userName}&apos;s Brain</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchToTab("post")}
            className="px-4 py-2 rounded-full border border-[#D5D2C8] bg-white hover:bg-[#F7F5EF] text-[#141414] mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Video size={13} className="text-[#059669]" />
            <span>Publish Hub</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchToTab("edit")}
            className="px-4 py-2 rounded-full border-2 border-[#141414] bg-[#141414] hover:bg-[#2B2B2B] text-white mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Jump to Editor</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
