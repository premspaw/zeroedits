"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  User,
  BookOpen,
  Scissors,
  Share2,
} from "lucide-react";

export type HeaderTab = "z" | "u" | "script" | "edit" | "post";

export interface DockTabItem {
  id: HeaderTab;
  label: string;
  sublabel: string;
  badge?: string;
  icon: (isActive: boolean) => React.ReactNode;
  accent: string;
}

interface AppleDockNavProps {
  activeTab: HeaderTab;
  onTabChange: (tab: HeaderTab) => void;
  className?: string;
}

export const DOCK_TABS: DockTabItem[] = [
  {
    id: "z",
    label: "Zee",
    sublabel: "AI Creative Director",
    icon: (isActive) => (
      <span
        className={`serif font-bold text-[13px] tracking-tight leading-none select-none transition-colors ${
          isActive ? "text-[#141414]" : "text-[#4A4842]"
        }`}
      >
        Z
      </span>
    ),
    accent: "#141414",
  },
  {
    id: "u",
    label: "You",
    sublabel: "Personal Studio Space",
    icon: (isActive) => (
      <User
        size={15}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={`shrink-0 transition-colors ${
          isActive ? "text-[#141414]" : "text-[#4A4842]"
        }`}
      />
    ),
    accent: "#141414",
  },
  {
    id: "script",
    label: "Script",
    sublabel: "Story Bank & Beats",
    icon: (isActive) => (
      <BookOpen
        size={15}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={`shrink-0 transition-colors ${
          isActive ? "text-[#141414]" : "text-[#4A4842]"
        }`}
      />
    ),
    accent: "#141414",
  },
  {
    id: "edit",
    label: "Edit",
    sublabel: "Video Studio & Stage",
    icon: (isActive) => (
      <Scissors
        size={15}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={`shrink-0 transition-colors ${
          isActive ? "text-[#141414]" : "text-[#4A4842]"
        }`}
      />
    ),
    accent: "#141414",
  },
  {
    id: "post",
    label: "Post",
    sublabel: "Publish & Export Hub",
    icon: (isActive) => (
      <Share2
        size={15}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={`shrink-0 transition-colors ${
          isActive ? "text-[#141414]" : "text-[#4A4842]"
        }`}
      />
    ),
    accent: "#141414",
  },
];

interface DockItemProps {
  item: DockTabItem;
  isActive: boolean;
  onClick: () => void;
  mouseX: any;
}

function DockItem({ item, isActive, onClick, mouseX }: DockItemProps) {
  const itemRef = useRef<HTMLButtonElement | null>(null);

  // Smooth Apple macOS parabolic wave distance transform
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = itemRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Compact height & width with subtle fluid magnification
  const sizeSync = useTransform(distance, [-100, -50, 0, 50, 100], [30, 34, 39, 34, 30]);
  const size = useSpring(sizeSync, { mass: 0.08, stiffness: 260, damping: 18 });

  const iconScaleSync = useTransform(distance, [-100, -50, 0, 50, 100], [1.0, 1.08, 1.18, 1.08, 1.0]);
  const iconScale = useSpring(iconScaleSync, { mass: 0.08, stiffness: 260, damping: 18 });

  return (
    <motion.button
      ref={itemRef}
      type="button"
      onClick={onClick}
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.92 }}
      aria-label={item.label}
      className={`relative rounded-[11px] flex items-center justify-center cursor-pointer select-none transition-colors duration-200 ${
        isActive
          ? "text-[#141414]"
          : "text-[#4A4842] hover:text-[#141414] hover:bg-white/30"
      }`}
    >
      {/* Classic Translucent Glass Selection Capsule (No dots) */}
      {isActive && (
        <motion.div
          layoutId="activeDockGlassCapsule"
          className="absolute inset-0 rounded-[11px] bg-gradient-to-b from-white/80 via-white/55 to-white/35 backdrop-blur-xl border border-white/85 shadow-[0_2px_10px_rgba(20,20,20,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] pointer-events-none"
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        />
      )}

      {/* Scaled Icon */}
      <motion.div
        style={{ scale: iconScale }}
        className="relative z-10 flex items-center justify-center shrink-0"
      >
        {item.icon(isActive)}
      </motion.div>
    </motion.button>
  );
}

export default function AppleDockNav({
  activeTab,
  onTabChange,
  className = "",
}: AppleDockNavProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <nav
      aria-label="Apple Dynamic Dock Navigation"
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`relative inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-[16px] bg-gradient-to-b from-white/45 via-white/25 to-white/15 backdrop-blur-2xl backdrop-saturate-150 border border-white/65 shadow-[0_8px_24px_-4px_rgba(20,20,20,0.08),inset_0_1px_0.5px_rgba(255,255,255,0.85)] select-none transition-all ${className}`}
    >
      {DOCK_TABS.map((tab) => (
        <DockItem
          key={tab.id}
          item={tab}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          mouseX={mouseX}
        />
      ))}
    </nav>
  );
}
