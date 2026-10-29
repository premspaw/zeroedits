"use client";

import React, { useState, useEffect, useRef } from "react";

export type PipMood =
  | "idle"
  | "listening"
  | "thinking"
  | "writing"
  | "happy"
  | "idea"
  | "sleeping";

interface PipProps {
  mood?: PipMood;
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  showDialogue?: boolean;
  dialogue?: string;
  interactive?: boolean;
  className?: string;
  stageBg?: string;
  onClick?: () => void;
}

const DEFAULT_DIALOGUE: Record<PipMood, string> = {
  idle: "What are we making today?",
  listening: "I’m listening.",
  thinking: "Let me work on that…",
  writing: "Writing your script.",
  happy: "Done. Want a punchier hook?",
  idea: "Got an idea.",
  sleeping: "Resting. Tap to wake me.",
};

const SIZE_MAP: Record<string, number> = {
  xs: 32,
  sm: 48,
  md: 80,
  lg: 140,
  xl: 220,
};

export default function Pip({
  mood = "idle",
  size = "md",
  showDialogue = false,
  dialogue,
  interactive = true,
  className = "",
  stageBg,
  onClick,
}: PipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<SVGGElement>(null);
  const [currentMood, setCurrentMood] = useState<PipMood>(mood);

  useEffect(() => {
    setCurrentMood(mood);
  }, [mood]);

  // Pointer eye-tracking for idle, listening, and happy moods
  useEffect(() => {
    if (!interactive) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (
        currentMood !== "idle" &&
        currentMood !== "listening" &&
        currentMood !== "idea"
      ) {
        if (lookRef.current) {
          lookRef.current.style.transform = "";
        }
        return;
      }

      if (!containerRef.current || !lookRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = (e.clientX - centerX) / (rect.width || 1);
      const dy = (e.clientY - centerY) / (rect.height || 1);

      const clamp = (v: number) => Math.max(-1, Math.min(1, v * 2.2));
      const tx = (clamp(dx) * 7).toFixed(1);
      const ty = (clamp(dy) * 6).toFixed(1);

      lookRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [currentMood, interactive]);

  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 80;
  const isMinimal = pixelSize <= 36;
  const activeDialogue = dialogue || DEFAULT_DIALOGUE[currentMood];

  // SVG Definitions matching character sheet
  const I = "#1A1A1D"; // Ink
  const B = "#F2542D"; // Pip Orange
  const P = "#E4E1DB"; // Paper

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`inline-flex flex-col items-center select-none ${onClick ? "cursor-pointer active:scale-95 transition-transform" : ""} ${className}`}
      style={{
        width: showDialogue ? "auto" : pixelSize,
      }}
    >
      <style>{`
        .pip-svg { overflow: visible; }
        .pip-svg .pip-bod { transform-origin: 105px 172px; }
        .pip-svg .pip-look { transition: transform 0.25s ease-out; }
        .pip-svg ellipse, .pip-svg circle, .pip-svg path, .pip-svg rect, .pip-svg text { transform-box: fill-box; }
        .pip-sh { transform-origin: center; }

        @keyframes pip-bob { 50% { transform: translateY(-6px); } }
        @keyframes pip-shadow { 50% { transform: scale(0.88); } }
        @keyframes pip-breathe { 50% { transform: scale(1.035, 1.02); } }
        @keyframes pip-hop { 0%, 100% { transform: translateY(0) scale(1.05, 0.94); } 45% { transform: translateY(-16px) scale(0.96, 1.05); } }
        @keyframes pip-blink { 0%, 91%, 100% { transform: scaleY(1); } 94% { transform: scaleY(0.08); } }
        @keyframes pip-ring { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.45); opacity: 0; } }
        @keyframes pip-dot { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes pip-type { 0% { transform: scaleX(0); } 55%, 100% { transform: scaleX(1); } }
        @keyframes pip-cur { 50% { opacity: 0; } }
        @keyframes pip-pop { 0%, 100% { transform: scale(0.3); opacity: 0; } 30%, 70% { transform: scale(1); opacity: 1; } }
        @keyframes pip-zz { 0% { opacity: 0; transform: translate(0, 10px); } 50% { opacity: 1; } 100% { opacity: 0; transform: translate(10px, -14px); } }
        @keyframes pip-lean { 50% { transform: rotate(-5deg); } }

        .pip-idle .pip-bod, .pip-thinking .pip-bod, .pip-writing .pip-bod { animation: pip-bob 3.2s ease-in-out infinite; }
        .pip-idle .pip-sh, .pip-thinking .pip-sh, .pip-writing .pip-sh { animation: pip-shadow 3.2s ease-in-out infinite; }
        .pip-listening .pip-bod { animation: pip-lean 2.4s ease-in-out infinite; }
        .pip-happy .pip-bod { animation: pip-hop 1s ease-in-out infinite; }
        .pip-happy .pip-sh { animation: pip-shadow 1s ease-in-out infinite; }
        .pip-idea .pip-bod { animation: pip-bob 1.6s ease-in-out infinite; }
        .pip-sleeping .pip-bod { animation: pip-breathe 4s ease-in-out infinite; }
        .pip-idle .pip-look ellipse, .pip-listening .pip-look ellipse { animation: pip-blink 4.6s infinite; }
        .pip-thinking .pip-look { transform: translate(7px, -9px); }
        .pip-writing .pip-look { transform: translate(6px, 10px); }

        .pip-ring { transform-origin: 105px 100px; fill: none; stroke: ${P}; stroke-width: 3; animation: pip-ring 1.9s ease-out infinite; }
        .pip-ring.r2 { animation-delay: 0.95s; }
        .pip-dot { fill: ${P}; animation: pip-dot 1.3s infinite; }
        .pip-dot.d2 { animation-delay: 0.22s; }
        .pip-dot.d3 { animation-delay: 0.44s; }
        .pip-ln { fill: ${P}; opacity: 0.7; transform-origin: left center; animation: pip-type 3s infinite; }
        .pip-ln.l2 { animation-delay: 0.5s; }
        .pip-ln.l3 { animation-delay: 1s; }
        .pip-cur { fill: ${B}; animation: pip-cur 0.8s steps(1) infinite; }
        .pip-spark { stroke: ${P}; stroke-width: 4; stroke-linecap: round; transform-origin: 105px 40px; animation: pip-pop 1.6s ease-out infinite; }
        .pip-spark.s2 { animation-delay: 0.15s; }
        .pip-spark.s3 { animation-delay: 0.3s; }
        .pip-star { fill: ${P}; animation: pip-pop 1.2s ease-in-out infinite; }
        .pip-star.t2 { animation-delay: 0.5s; }
        .pip-z { fill: ${P}; font: 800 26px "Bricolage Grotesque", system-ui, sans-serif; animation: pip-zz 3s infinite; }
        .pip-z.z2 { animation-delay: 1.4s; font-size: 20px; }
      `}</style>

      {/* Optional stage background for showcase */}
      <div
        className={stageBg ? "p-3 rounded-[24px] flex flex-col items-center" : "flex flex-col items-center"}
        style={{ backgroundColor: stageBg }}
      >
        <svg
          className={`pip-svg pip-${currentMood}`}
          viewBox="0 0 240 220"
          style={{ width: pixelSize, height: (pixelSize * 220) / 240 }}
          role="img"
          aria-label={`Pip, ${currentMood}`}
        >
          {/* Shadow */}
          {!isMinimal && (
            <ellipse
              className="pip-sh"
              cx="105"
              cy="204"
              rx="50"
              ry="6"
              fill="#000"
              opacity="0.25"
            />
          )}

          {/* Mood Props (Behind or around body) */}
          {currentMood === "listening" && (
            <>
              <circle className="pip-ring" cx="105" cy="100" r="72" />
              <circle className="pip-ring r2" cx="105" cy="100" r="72" />
            </>
          )}

          {currentMood === "thinking" && (
            <>
              <circle className="pip-dot" cx="186" cy="62" r="5" />
              <circle className="pip-dot d2" cx="202" cy="46" r="6.5" />
              <circle className="pip-dot d3" cx="222" cy="34" r="8" />
            </>
          )}

          {currentMood === "writing" && (
            <>
              <rect x="172" y="92" width="62" height="82" rx="8" fill={P} />
              <rect className="pip-ln" x="182" y="108" width="42" height="5" rx="2.5" fill={I} />
              <rect className="pip-ln l2" x="182" y="124" width="34" height="5" rx="2.5" fill={I} />
              <rect className="pip-ln l3" x="182" y="140" width="40" height="5" rx="2.5" fill={I} />
              <rect className="pip-cur" x="182" y="154" width="5" height="10" rx="1" />
            </>
          )}

          {currentMood === "happy" && (
            <>
              <path className="pip-star" d="M30 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
              <path className="pip-star t2" d="M188 36l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
            </>
          )}

          {currentMood === "idea" && (
            <>
              <line className="pip-spark" x1="105" y1="14" x2="105" y2="0" />
              <line className="pip-spark s2" x1="78" y1="24" x2="68" y2="12" />
              <line className="pip-spark s3" x1="132" y1="24" x2="142" y2="12" />
            </>
          )}

          {currentMood === "sleeping" && (
            <>
              <text className="pip-z" x="176" y="70">z</text>
              <text className="pip-z z2" x="198" y="46">z</text>
            </>
          )}

          {/* Main Body & Tail */}
          <g className="pip-bod">
            {/* Speech bubble tail */}
            <path
              d="M64 150Q58 182 36 192Q76 192 96 168Z"
              fill={B}
            />
            {/* Round silhouette body */}
            <circle cx="105" cy="100" r="72" fill={B} />
            {/* Soft highlight */}
            <ellipse
              cx="70"
              cy="60"
              rx="16"
              ry="9"
              transform="rotate(-35 70 60)"
              fill={P}
              opacity="0.22"
            />

            {/* Eyes */}
            <g ref={lookRef} className="pip-look">
              {currentMood === "happy" ? (
                <>
                  <path d="M74 98Q84 83 94 98" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M116 98Q126 83 136 98" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
                </>
              ) : currentMood === "sleeping" ? (
                <>
                  <path d="M74 96Q84 105 94 96" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M116 96Q126 105 136 96" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <ellipse cx="84" cy="94" rx={currentMood === "listening" ? 9 : 8} ry={currentMood === "listening" ? 14 : currentMood === "writing" ? 9 : 12} fill={I} />
                  <ellipse cx="126" cy="94" rx={currentMood === "listening" ? 9 : 8} ry={currentMood === "listening" ? 14 : currentMood === "writing" ? 9 : 12} fill={I} />
                  {currentMood === "idea" && (
                    <>
                      <circle cx="87" cy="88" r="3" fill={P} />
                      <circle cx="129" cy="88" r="3" fill={P} />
                    </>
                  )}
                </>
              )}
            </g>

            {/* Mouth */}
            {currentMood === "idle" && (
              <path d="M92 120Q105 131 118 120" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
            )}
            {currentMood === "listening" && (
              <ellipse cx="105" cy="125" rx="4.5" ry="3.5" fill={I} />
            )}
            {currentMood === "thinking" && (
              <path d="M92 124Q99 118 106 124T120 124" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
            )}
            {currentMood === "writing" && (
              <path d="M94 121Q105 128 116 121" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
            )}
            {currentMood === "happy" && (
              <>
                <path d="M89 116Q105 144 121 116Z" fill={I} />
                <ellipse cx="66" cy="114" rx="9" ry="5" fill={P} opacity="0.4" />
                <ellipse cx="144" cy="114" rx="9" ry="5" fill={P} opacity="0.4" />
              </>
            )}
            {currentMood === "idea" && (
              <ellipse cx="105" cy="127" rx="5.5" ry="7.5" fill={I} />
            )}
            {currentMood === "sleeping" && (
              <path d="M98 124Q105 128 112 124" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
            )}
          </g>
        </svg>
      </div>

      {/* Dialogue Bubble */}
      {showDialogue && (
        <div className="mt-2 text-center animate-fade-in">
          <span className="inline-block px-3 py-1 rounded-full bg-[#1A1A1D] text-[#E4E1DB] text-[12px] font-semibold tracking-tight shadow-md border border-white/10">
            {activeDialogue}
          </span>
        </div>
      )}
    </div>
  );
}
