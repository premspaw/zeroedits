"use client";

import React, { useState } from "react";
import {
  Share2,
  Download,
  Copy,
  Check,
  Calendar,
  Instagram,
  Video,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import type { HeaderTab } from "./AppleDockNav";

interface PostViewProps {
  onSwitchToTab: (tab: HeaderTab) => void;
  activeTopic?: string;
  activeVideoUrl?: string;
  onDownloadMp4?: () => void;
  duration?: number;
}

export default function PostView({
  onSwitchToTab,
  activeTopic = "Photosynthesis: How Plants Make Food",
  activeVideoUrl,
  onDownloadMp4,
  duration = 33.5,
}: PostViewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<"ig" | "tiktok" | "yt" | "linkedin">("ig");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const cleanTitle = activeTopic || "Autonomous Short-Form Reel";

  const platforms = [
    { id: "ig" as const, name: "Instagram Reels", ratio: "9:16 Vertical", color: "#E1306C" },
    { id: "tiktok" as const, name: "TikTok", ratio: "9:16 Vertical", color: "#000000" },
    { id: "yt" as const, name: "YouTube Shorts", ratio: "9:16 Vertical", color: "#FF0000" },
    { id: "linkedin" as const, name: "LinkedIn Video", ratio: "9:16 / 1:1", color: "#0A66C2" },
  ];

  const captionText = `🌱 ${cleanTitle}\n\nDid you know plants act like tiny solar-powered kitchens? ☀️ Here's how sunlight, water, and carbon dioxide transform into sugar and clean oxygen in under 35 seconds!\n\n👇 Drop your thoughts below and follow for daily bite-sized science.\n\n#Photosynthesis #ScienceReels #Shorts #ReelsViral #LearnEveryday #BiologyFacts #MetaMuse`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2400);
  };

  return (
    <div className="mx-auto max-w-[1400px] w-full min-h-[calc(100vh-60px)] px-4 pt-1.5 pb-8 sm:px-8 sm:pt-2 sm:pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#D5D2C8]/70 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#059669]/10 border border-[#059669]/30 text-[#059669] mono text-[11px] font-bold uppercase tracking-wider mb-2">
            <Share2 size={12} />
            <span>Publish & Distribution Hub</span>
          </div>
          <h1 className="serif text-2xl sm:text-4xl font-bold text-[#141414]">
            Ready to Post & Share
          </h1>
          <p className="text-sm text-[#6B6A64] mt-1 font-normal">
            Export verified 1080×1920 MP4 files, generate high-retention captions, and schedule cross-platform reels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSwitchToTab("edit")}
            className="px-4 py-2 rounded-full border border-[#D5D2C8] bg-white hover:bg-[#F7F5EF] text-[#141414] mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Back to Editor</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Reel Preview Card */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[360px] rounded-3xl border-2 border-[#141414] bg-[#0B0C10] p-4 text-white shadow-[4px_4px_0px_#141414] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="mono text-[10px] font-bold uppercase tracking-widest text-[#FFE600]">
                1080×1920 • 60 FPS
              </span>
              <span className="mono text-[10px] font-bold text-white/70">
                {duration.toFixed(1)}s
              </span>
            </div>

            {/* Simulated 9:16 Video Stage */}
            <div className="aspect-[9/16] w-full rounded-2xl overflow-hidden bg-[#141414] border border-white/10 relative flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-full bg-[#E4491B] flex items-center justify-center text-white mb-3 shadow-lg">
                <Video size={24} />
              </div>

              <div className="mono text-[11px] font-bold text-[#FFE600] uppercase tracking-wider mb-1">
                Final Reel Ready
              </div>
              <div className="serif text-lg font-bold text-white max-w-[220px] mb-2">
                {cleanTitle}
              </div>
              <div className="mono text-[10px] text-white/60">
                Continuous Lower-Third Subtitles • Clean Cuts
              </div>
            </div>

            {/* Download Button */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onDownloadMp4) {
                    onDownloadMp4();
                  } else {
                    window.dispatchEvent(new CustomEvent("export-pipeline-b-mp4"));
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-[#FFFFFF]/20 bg-[#E4491B] hover:bg-[#C93D14] text-white mono text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition cursor-pointer"
              >
                <Download size={14} />
                <span>Download Verified MP4</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Setup & Captions */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Target Platforms */}
          <div className="p-6 rounded-3xl border-2 border-[#141414] bg-[#FFFFFF] shadow-[3px_3px_0px_#141414]">
            <h3 className="serif text-xl font-bold text-[#141414] mb-3">
              1. Select Distribution Platform
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-start gap-1 transition text-left cursor-pointer ${
                    selectedPlatform === p.id
                      ? "border-[#141414] bg-[#F7F5EF] shadow-[2px_2px_0px_#141414]"
                      : "border-[#D5D2C8] bg-white hover:bg-[#FAF8F3]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {selectedPlatform === p.id && (
                      <CheckCircle2 size={13} className="text-[#141414]" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#141414]">{p.name}</span>
                  <span className="mono text-[10px] text-[#7B776E]">{p.ratio}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Generated Viral Caption */}
          <div className="p-6 rounded-3xl border-2 border-[#141414] bg-[#FFFFFF] shadow-[3px_3px_0px_#141414]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#E4491B]" />
                <h3 className="serif text-xl font-bold text-[#141414]">
                  2. Hook & Caption Generator
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="px-3 py-1.5 rounded-full border border-[#D5D2C8] bg-[#FAF8F3] hover:bg-[#ECEAE3] text-[#141414] mono text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedCaption ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedCaption ? "Copied to Clipboard" : "Copy Caption"}</span>
              </button>
            </div>

            <textarea
              readOnly
              value={captionText}
              rows={6}
              className="w-full p-4 rounded-2xl border border-[#D5D2C8] bg-[#F7F5EF] text-[#141414] text-xs font-mono leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Publishing Checklist */}
          <div className="p-6 rounded-3xl border-2 border-[#141414] bg-[#FAF8F3] shadow-[3px_3px_0px_#141414] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="mono text-xs font-bold text-[#141414] uppercase mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Format Audit: Ready for Reels & Shorts</span>
              </div>
              <div className="text-xs text-[#6B6A64]">
                1080×1920 Vertical • 60 FPS • Stereo AAC Lossless Audio • Word Captions
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScheduled(!scheduled)}
              className={`px-4 py-2 rounded-full border-2 border-[#141414] mono text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                scheduled
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-[#141414] shadow-[2px_2px_0px_#141414]"
              }`}
            >
              <Calendar size={13} />
              <span>{scheduled ? "Scheduled for Today, 6:00 PM" : "Schedule Reel"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

