"use client";

import React from "react";
import { motion } from "framer-motion";

interface DoodleProps {
  isSelected?: boolean;
  isHovered?: boolean;
  className?: string;
}

/**
 * Card 1: Creator Sitting Cross-Legged with Hovering Laptop
 * Matches Card 1 in the user's reference:
 * - Subtitle: "YOU ONLY NEED ONE SCRIPT"
 * - Title: "Access anywhere, any device" / "The Raw Founder Story"
 * - Minimalist doodle line-art of a person with floating laptop and radiating energy arcs.
 */
export function CreatorLaptopDoodle({
  isSelected = false,
  isHovered = false,
  className = "",
}: DoodleProps) {
  return (
    <div
      className={`relative w-full h-[140px] sm:h-[150px] flex items-center justify-center select-none overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 240 160"
        className="w-full h-full max-w-[220px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft Background Radial Glow on Select/Hover */}
        <motion.circle
          cx="120"
          cy="95"
          r="45"
          fill={isSelected ? "#E0F2FE" : "#F4F4F1"}
          animate={{
            scale: isSelected || isHovered ? [1, 1.15, 1] : 1,
            opacity: isSelected ? 0.9 : 0.5,
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Radiating Energy Doodle Arcs (Left and Right of Laptop) */}
        {/* Left Arcs */}
        <motion.path
          d="M 72 82 C 67 87 67 97 72 102"
          stroke="#141414"
          strokeWidth="2.2"
          strokeLinecap="round"
          animate={{
            x: isSelected || isHovered ? [-2, -6, -2] : [0, -3, 0],
            opacity: [0.35, 0.9, 0.35],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M 64 77 C 56 86 56 100 64 109"
          stroke="#141414"
          strokeWidth="2.2"
          strokeLinecap="round"
          animate={{
            x: isSelected || isHovered ? [-3, -9, -3] : [0, -5, 0],
            opacity: [0.2, 0.75, 0.2],
          }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.15, ease: "easeInOut" }}
        />

        {/* Right Arcs */}
        <motion.path
          d="M 168 82 C 173 87 173 97 168 102"
          stroke="#141414"
          strokeWidth="2.2"
          strokeLinecap="round"
          animate={{
            x: isSelected || isHovered ? [2, 6, 2] : [0, 3, 0],
            opacity: [0.35, 0.9, 0.35],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M 176 77 C 184 86 184 100 176 109"
          stroke="#141414"
          strokeWidth="2.2"
          strokeLinecap="round"
          animate={{
            x: isSelected || isHovered ? [3, 9, 3] : [0, 5, 0],
            opacity: [0.2, 0.75, 0.2],
          }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.15, ease: "easeInOut" }}
        />

        {/* Floating Sparkle Stars around Head */}
        <motion.g
          animate={{
            rotate: [0, 180, 360],
            scale: [0.85, 1.2, 0.85],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "66px 42px" }}
        >
          <path
            d="M 66 38 L 67.5 41.5 L 71 43 L 67.5 44.5 L 66 48 L 64.5 44.5 L 61 43 L 64.5 41.5 Z"
            fill="#141414"
          />
        </motion.g>

        <motion.g
          animate={{
            rotate: [360, 180, 0],
            scale: [1, 1.25, 1],
          }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
          style={{ transformOrigin: "174px 46px" }}
        >
          <path
            d="M 174 42 L 175.5 45.5 L 179 47 L 175.5 48.5 L 174 52 L 172.5 48.5 L 169 47 L 172.5 45.5 Z"
            fill="#141414"
          />
        </motion.g>

        {/* CREATOR FIGURE (Cross-legged sitting meditation/focus posture) */}
        <g id="creator-body">
          {/* Head & Hair */}
          <circle cx="120" cy="46" r="14" fill="#FFFFFF" stroke="#141414" strokeWidth="2.5" />
          {/* Hair swoosh */}
          <path
            d="M 110 40 C 113 34 126 33 131 38 C 131 43 128 42 125 41 C 122 41 118 43 113 45"
            fill="#141414"
          />
          {/* Simple expressive face eyes + smile */}
          <circle cx="116" cy="47" r="1.4" fill="#141414" />
          <circle cx="124" cy="47" r="1.4" fill="#141414" />
          <path
            d="M 118 52 Q 120 54.5 122 52"
            stroke="#141414"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Neck & Torso */}
          <path d="M 120 60 L 120 66" stroke="#141414" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M 112 66 L 128 66 L 132 94 L 108 94 Z"
            fill="#FFFFFF"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Cross-legged Pants / Lap */}
          <path
            d="M 94 124 C 94 110 102 102 120 102 C 138 102 146 110 146 124 C 146 130 138 132 120 132 C 102 132 94 130 94 124 Z"
            fill="#141414"
          />
          {/* Shoes / Soles tuck */}
          <ellipse cx="100" cy="128" rx="8" ry="4.5" fill="#FFFFFF" stroke="#141414" strokeWidth="2" />
          <ellipse cx="140" cy="128" rx="8" ry="4.5" fill="#FFFFFF" stroke="#141414" strokeWidth="2" />

          {/* Arms reaching outward towards hovering laptop */}
          <path
            d="M 110 70 Q 98 84 105 92"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 130 70 Q 142 84 135 92"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* HOVERING LAPTOP (Float Animation) */}
        <motion.g
          animate={{
            y: isHovered || isSelected ? [-7, 3, -7] : [-4, 2, -4],
            rotate: isHovered || isSelected ? [-2, 2, -2] : [-1, 1, -1],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Laptop Screen (Upper Lid) */}
          <path
            d="M 96 74 L 144 74 L 142 92 L 98 92 Z"
            fill="#141414"
            stroke="#141414"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Glowing Display Inside Screen */}
          <path
            d="M 99 76 L 141 76 L 139 90 L 101 90 Z"
            fill={isSelected ? "#38BDF8" : "#E2E8F0"}
          />
          {/* Little code / script lines on screen */}
          <line x1="105" y1="80" x2="122" y2="80" stroke="#141414" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="105" y1="84" x2="135" y2="84" stroke="#141414" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="105" y1="87" x2="128" y2="87" stroke="#141414" strokeWidth="1.4" strokeLinecap="round" />

          {/* Laptop Keyboard Base (Lower chassis angled perspective) */}
          <path
            d="M 88 94 L 152 94 L 146 102 L 94 102 Z"
            fill="#FFFFFF"
            stroke="#141414"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Trackpad */}
          <rect x="114" y="96" width="12" height="4" rx="1" fill="#141414" />
        </motion.g>

        {/* Small Shadow under floating person */}
        <ellipse cx="120" cy="144" rx="42" ry="5" fill="#141414" opacity="0.12" />
      </svg>
    </div>
  );
}

/**
 * Card 2: Person Ascending Steps Carrying Giant Pencil
 * Matches Card 2 in the user's reference:
 * - Subtitle: "YOU ONLY NEED ONE SCRIPT"
 * - Title: "Quick snap-and-save process" / "Contrarian Scroll-Stopper"
 * - Minimalist doodle line-art of a person climbing steps with a giant pencil.
 */
export function PencilAscendingStepsDoodle({
  isSelected = false,
  isHovered = false,
  className = "",
}: DoodleProps) {
  return (
    <div
      className={`relative w-full h-[140px] sm:h-[150px] flex items-center justify-center select-none overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 240 160"
        className="w-full h-full max-w-[220px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft Background Radial Glow */}
        <motion.circle
          cx="120"
          cy="85"
          r="48"
          fill={isSelected ? "#DCFCE7" : "#F4F4F1"}
          animate={{
            scale: isSelected || isHovered ? [1, 1.15, 1] : 1,
            opacity: isSelected ? 0.9 : 0.5,
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ASCENDING STAIRCASE STEPS */}
        <g id="staircase">
          {/* Step 1 */}
          <path
            d="M 52 142 L 86 142 L 86 118"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Step 2 */}
          <path
            d="M 86 118 L 122 118 L 122 92"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Step 3 */}
          <path
            d="M 122 92 L 158 92 L 158 66"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Step 4 (Top Landing Platform) */}
          <path
            d="M 158 66 L 196 66"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Decorative vertical hatching under steps */}
          <line x1="68" y1="142" x2="68" y2="150" stroke="#141414" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="104" y1="118" x2="104" y2="150" stroke="#141414" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="140" y1="92" x2="140" y2="150" stroke="#141414" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="176" y1="66" x2="176" y2="150" stroke="#141414" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Spark trail from top of staircase */}
        <motion.g
          animate={{
            y: [-3, 3, -3],
            scale: [0.9, 1.2, 0.9],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M 186 50 L 187.5 53.5 L 191 55 L 187.5 56.5 L 186 60 L 184.5 56.5 L 181 55 L 184.5 53.5 Z"
            fill="#16A34A"
          />
          <circle cx="198" cy="48" r="2" fill="#141414" />
        </motion.g>

        {/* CHARACTER CLIMBING & CARRYING GIANT PENCIL */}
        <motion.g
          animate={{
            y: isHovered || isSelected ? [-4, 2, -4] : [-2, 2, -2],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Head */}
          <circle cx="132" cy="48" r="12" fill="#FFFFFF" stroke="#141414" strokeWidth="2.5" />
          {/* Hair cap */}
          <path
            d="M 122 45 C 124 38 136 38 142 42 C 142 46 138 46 134 45 C 130 45 126 47 122 49"
            fill="#141414"
          />
          {/* Side profile eye + smile looking up toward top */}
          <circle cx="136" cy="49" r="1.3" fill="#141414" />
          <path
            d="M 137 53 Q 140 55 142 53"
            stroke="#141414"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Torso leaning forward slightly */}
          <path
            d="M 126 62 L 138 62 L 136 88 L 124 88 Z"
            fill="#FFFFFF"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Stepping Legs (Walking up stairs pose) */}
          {/* Left leg bent on lower step */}
          <path
            d="M 126 88 L 118 104 L 114 118"
            stroke="#141414"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right leg forward and lifted onto next step */}
          <path
            d="M 134 88 L 140 100 L 148 92"
            stroke="#141414"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Shoes */}
          <ellipse cx="112" cy="118" rx="6" ry="3" fill="#141414" />
          <ellipse cx="150" cy="92" rx="6" ry="3" fill="#141414" />

          {/* GIANT PENCIL CARRIED OVER SHOULDER (Diagonal) */}
          <motion.g
            animate={{
              rotate: isHovered || isSelected ? [-2, 3, -2] : [0, 2, 0],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "128px 72px" }}
          >
            {/* Pencil Graphite Cone Tip (pointing forward/up) */}
            <path
              d="M 174 54 L 186 48 L 178 62 Z"
              fill="#141414"
            />
            {/* Wood sharpening collar */}
            <path
              d="M 166 58 L 174 54 L 178 62 L 170 66 Z"
              fill="#FEF08A"
              stroke="#141414"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Main Pencil Shaft (Hexagonal yellow/orange body) */}
            <path
              d="M 98 94 L 166 58 L 170 66 L 102 102 Z"
              fill="#F59E0B"
              stroke="#141414"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            {/* Pencil body striping lines */}
            <line x1="100" y1="98" x2="168" y2="62" stroke="#D97706" strokeWidth="1.5" />

            {/* Silver Metal Ferrule */}
            <path
              d="M 92 97 L 98 94 L 102 102 L 96 105 Z"
              fill="#E2E8F0"
              stroke="#141414"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Pink Eraser Top */}
            <path
              d="M 84 101 C 82 102 82 107 86 109 L 92 106 L 90 98 Z"
              fill="#FB7185"
              stroke="#141414"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </motion.g>

          {/* Arms holding the giant pencil tightly */}
          <path
            d="M 128 66 Q 134 74 140 70"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 124 70 Q 118 78 126 80"
            stroke="#141414"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </motion.g>
      </svg>
    </div>
  );
}

/**
 * Card 3: Two Figures Jumping and High-Fiving (Celebration & Retention)
 * Matches Card 3 in the user's reference:
 * - Subtitle: "YOU ONLY NEED ONE SCRIPT"
 * - Title: "Secure digital backup always" / "3-Step Rapid Breakdown"
 * - Minimalist doodle line-art of two people high-fiving with impact celebration burst.
 */
export function HighFiveCelebrationDoodle({
  isSelected = false,
  isHovered = false,
  className = "",
}: DoodleProps) {
  return (
    <div
      className={`relative w-full h-[140px] sm:h-[150px] flex items-center justify-center select-none overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 240 160"
        className="w-full h-full max-w-[220px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft Background Radial Glow */}
        <motion.circle
          cx="120"
          cy="85"
          r="48"
          fill={isSelected ? "#FEE2E2" : "#F4F4F1"}
          animate={{
            scale: isSelected || isHovered ? [1, 1.15, 1] : 1,
            opacity: isSelected ? 0.9 : 0.5,
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* HIGH-FIVE IMPACT BURST (Center top above hands) */}
        <motion.g
          animate={{
            scale: isSelected || isHovered ? [0.9, 1.35, 0.9] : [0.95, 1.15, 0.95],
            rotate: [0, 15, -15, 0],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "120px 48px" }}
        >
          {/* Star Burst Lines */}
          <line x1="120" y1="36" x2="120" y2="28" stroke="#E11D48" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="128" y1="40" x2="135" y2="34" stroke="#E11D48" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="112" y1="40" x2="105" y2="34" stroke="#E11D48" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="130" y1="48" x2="138" y2="48" stroke="#E11D48" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="110" y1="48" x2="102" y2="48" stroke="#E11D48" strokeWidth="2.4" strokeLinecap="round" />

          {/* Central Impact Dot */}
          <circle cx="120" cy="46" r="3.2" fill="#E11D48" />
        </motion.g>

        {/* LEFT CREATOR (Jumping pose from left towards center) */}
        <motion.g
          animate={{
            y: isHovered || isSelected ? [-5, 3, -5] : [-3, 2, -3],
            x: isHovered || isSelected ? [0, 2, 0] : [0, 1, 0],
          }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Head & Ponytail/Hair */}
          <circle cx="94" cy="56" r="11" fill="#FFFFFF" stroke="#141414" strokeWidth="2.4" />
          <path
            d="M 85 53 C 86 46 95 47 101 50 C 99 53 96 53 92 53 Z"
            fill="#141414"
          />
          {/* Ponytail swinging backward */}
          <path
            d="M 85 52 C 78 50 74 58 72 63"
            stroke="#141414"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Eye & happy smile */}
          <circle cx="97" cy="57" r="1.3" fill="#141414" />
          <path
            d="M 96 61 Q 99 63 101 61"
            stroke="#141414"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Torso tilted right */}
          <path
            d="M 90 68 L 100 70 L 98 94 L 88 92 Z"
            fill="#FFFFFF"
            stroke="#141414"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Right Arm raised high to the center high-five */}
          <path
            d="M 98 70 L 112 56 L 118 48"
            stroke="#141414"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Left Hand open palm high-fiving */}
          <path
            d="M 116 46 L 120 46 L 120 50 L 116 50 Z"
            fill="#141414"
          />

          {/* Left Arm trailing down/back */}
          <path
            d="M 90 72 Q 80 82 82 90"
            stroke="#141414"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Jumping Legs (bent in celebration) */}
          {/* Front leg kicking forward */}
          <path
            d="M 92 92 L 98 106 L 108 114"
            stroke="#141414"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Back leg tucked back */}
          <path
            d="M 88 92 L 78 104 L 70 102"
            stroke="#141414"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Shoes */}
          <ellipse cx="110" cy="115" rx="5" ry="3" fill="#141414" />
          <ellipse cx="68" cy="102" rx="5" ry="3" fill="#141414" />
        </motion.g>

        {/* RIGHT CREATOR (Jumping pose from right towards center) */}
        <motion.g
          animate={{
            y: isHovered || isSelected ? [-5, 3, -5] : [-3, 2, -3],
            x: isHovered || isSelected ? [0, -2, 0] : [0, -1, 0],
          }}
          transition={{ duration: 1.9, repeat: Infinity, delay: 0.1, ease: "easeInOut" }}
        >
          {/* Head & Short Hair */}
          <circle cx="146" cy="56" r="11" fill="#FFFFFF" stroke="#141414" strokeWidth="2.4" />
          <path
            d="M 139 50 C 143 45 153 46 156 50 C 153 53 150 52 146 52 Z"
            fill="#141414"
          />
          {/* Eye & happy smile */}
          <circle cx="143" cy="57" r="1.3" fill="#141414" />
          <path
            d="M 139 61 Q 142 63 144 61"
            stroke="#141414"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Torso tilted left */}
          <path
            d="M 140 70 L 150 68 L 152 92 L 142 94 Z"
            fill="#FFFFFF"
            stroke="#141414"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Left Arm raised high to the center high-five */}
          <path
            d="M 142 70 L 128 56 L 122 48"
            stroke="#141414"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Right Hand open palm high-fiving meeting Left Hand */}
          <path
            d="M 120 46 L 124 46 L 124 50 L 120 50 Z"
            fill="#141414"
          />

          {/* Right Arm trailing down/back */}
          <path
            d="M 150 72 Q 160 82 158 90"
            stroke="#141414"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Jumping Legs (bent in mid-air high jump) */}
          {/* Front leg kicking down/center */}
          <path
            d="M 144 94 L 138 108 L 132 116"
            stroke="#141414"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Back leg tucked back */}
          <path
            d="M 148 94 L 160 106 L 168 104"
            stroke="#141414"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Shoes */}
          <ellipse cx="130" cy="117" rx="5" ry="3" fill="#141414" />
          <ellipse cx="170" cy="104" rx="5" ry="3" fill="#141414" />
        </motion.g>

        {/* Small jumping shadow indicators below feet */}
        <ellipse cx="94" cy="138" rx="20" ry="3.5" fill="#141414" opacity="0.1" />
        <ellipse cx="146" cy="138" rx="20" ry="3.5" fill="#141414" opacity="0.1" />
      </svg>
    </div>
  );
}

/**
 * Little playful flourish doodle curl (bottom right accent like in reference image)
 */
export function DoodleFlourishCurl({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`w-6 h-6 select-none opacity-40 pointer-events-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 6 32 C 16 34 24 30 26 22 C 28 14 20 12 16 18 C 12 24 22 28 32 20"
        stroke="#141414"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

