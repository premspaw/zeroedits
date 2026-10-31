"use client";

import React, { useState, useEffect, useRef } from "react";

export type PipMood =
  | "idle"
  | "listening"
  | "thinking"
  | "writing"
  | "reading"
  | "happy"
  | "idea"
  | "sleeping"
  | "concerned"
  | "excited";

export type PipActionType =
  | "idle"
  | "spin-up"
  | "spin-right"
  | "bounce"
  | "tilt-right"
  | "wave"
  | "float";

export const PIP_MOOD_META: Record<
  PipMood,
  { label: string; badgeBg: string; badgeText: string }
> = {
  idle: { label: "Ready", badgeBg: "rgba(242,84,45,0.18)", badgeText: "#F2542D" },
  listening: { label: "Listening", badgeBg: "rgba(14,165,233,0.22)", badgeText: "#38BDF8" },
  thinking: { label: "Thinking", badgeBg: "rgba(245,158,11,0.22)", badgeText: "#FBBF24" },
  writing: { label: "Writing", badgeBg: "rgba(168,85,247,0.22)", badgeText: "#C084FC" },
  reading: { label: "Analyzing", badgeBg: "rgba(59,130,246,0.22)", badgeText: "#60A5FA" },
  happy: { label: "Happy", badgeBg: "rgba(16,185,129,0.22)", badgeText: "#34D399" },
  idea: { label: "Inspired", badgeBg: "rgba(250,204,21,0.22)", badgeText: "#FDE047" },
  sleeping: { label: "Sleeping", badgeBg: "rgba(148,163,184,0.22)", badgeText: "#94A3B8" },
  concerned: { label: "Alert", badgeBg: "rgba(244,63,94,0.24)", badgeText: "#FB7185" },
  excited: { label: "Hyped", badgeBg: "rgba(249,115,22,0.25)", badgeText: "#FB923C" },
};

/**
 * Normalizes stage descriptions and complex system outputs into clean, natural,
 * friendly 1-2 line speech lines for Zee, matching what's happening in the pipeline.
 */
export function cleanZeeDialogue(
  rawText?: string,
  mood?: PipMood,
  isAutoEdit?: boolean
): string {
  if (!rawText || rawText.trim().length === 0) {
    if (mood && DEFAULT_DIALOGUE[mood]) return DEFAULT_DIALOGUE[mood];
    return "Tell me your idea. Let’s make something good.";
  }

  const t = rawText.trim().toLowerCase();

  // Voiceover / audio listening
  if (/(transcrib|listen|voiceover|audio|mic|recording|spoken)/i.test(t)) {
    return "Listening to your voiceover...";
  }

  // Story planning / script thinking
  if (
    /(thinking|writing story script|character model sheet|storyboard|planning your scene|finding a story angle|directing your image|hook structure|brain)/i.test(t)
  ) {
    return "Thinking a story for you...";
  }

  // Image / artwork generation
  if (
    /(image|artwork|character-consistent|scene.*artwork|meta image|creating your images|getting the images)/i.test(t)
  ) {
    return "Getting the images for you...";
  }

  // Making video / Spark / motion / synthesis
  if (
    /(making.*video|adding motion|synthesiz|spark|compositor|60fps|stitching all beats|full video|render)/i.test(t)
  ) {
    return "Making the video for you...";
  }

  // Cutting / trimming / auto-edit
  if (
    /(clean.*video|trimming|cutting|ffmpeg|retake|silence|putting your edit|shaping the cut|checking your video|finding the best take)/i.test(t)
  ) {
    return isAutoEdit ? "Putting your edits together..." : "Putting your video together...";
  }

  // Recreating a scene
  if (/recreating/i.test(t)) {
    return "Recreating this scene for you...";
  }

  // Ready / finished
  if (/(ready|complete|all done|finished)/i.test(t)) {
    return "Your video is ready!";
  }

  // If already a short clean sentence (<= 52 chars) without tech jargon
  if (
    rawText.length <= 52 &&
    !/(wonder|spark|pipeline|ffmpeg|model sheet|api|0s|1s|2s|1.0|1.3)/i.test(rawText)
  ) {
    return rawText;
  }

  if (mood && DEFAULT_DIALOGUE[mood]) {
    return DEFAULT_DIALOGUE[mood];
  }

  return "Making your video...";
}

/**
 * Infers the best contextual Pip emotion from beat role, text content, or stage description.
 */
export function inferPipMoodFromContext(
  text?: string,
  fallback: PipMood = "idle"
): PipMood {
  if (!text) return fallback;
  const t = text.toLowerCase();
  if (/(error|fail|issue|broken|problem|warn|risk|trap|mistake|myth|pain|struggle|dead air|stutter)/i.test(t)) {
    return "concerned";
  }
  if (/(ready|done|success|solution|payoff|action|cta|watch|play|complete|export|download)/i.test(t)) {
    return "happy";
  }
  if (/(creating your images|getting the images|artwork|character)/i.test(t)) {
    return "idea";
  }
  if (/(adding motion|making your video|putting your edit together|finishing your video)/i.test(t)) {
    return "writing";
  }
  if (/(transcrib|read|scan|search|validat|shield|protect|audit|proof|data|fact|inspect|upload)/i.test(t)) {
    return "reading";
  }
  if (/(writ|cod|spark|compos|synthesiz|render|stitch|caption|subtitl|rebuild|voic)/i.test(t)) {
    return "writing";
  }
  if (/(storyboard|planning your scenes|creating your images|finding a story angle|idea)/i.test(t)) {
    return "idea";
  }
  if (/(plan|think|analyz|wonder|structur|question|why|how|wait|strategy)/i.test(t)) {
    return "thinking";
  }
  if (/(record|mic|listen|speak|talk|audio|hear)/i.test(t)) {
    return "listening";
  }
  if (/(celebrat|export|download|boom|launch|win|complete|100%|perfect|hyped)/i.test(t)) {
    return "excited";
  }
  return fallback;
}

export interface PipAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "subtle";
  icon?: React.ReactNode;
}

export function buildZeeThinkingTips(_userInstruction?: string, isAutoEdit?: boolean): string[] {
  return isAutoEdit
    ? ["Putting your edits together...", "Adding motion & captions...", "Your video is ready!"]
    : ["Thinking a story for you...", "Getting the images for you...", "Making the video for you..."];
}

interface PipProps {
  mood?: PipMood;
  action?: PipActionType;
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  showDialogue?: boolean;
  dialogue?: string;
  question?: string;
  userInstruction?: string;
  isAutoEdit?: boolean;
  actions?: PipAction[];
  orientation?: "vertical" | "horizontal";
  interactive?: boolean;
  className?: string;
  stageBg?: string;
  onClick?: () => void;
  spin?: boolean;
}

const DEFAULT_DIALOGUE: Record<PipMood, string> = {
  idle: "Tell me your idea. Let’s make something good.",
  listening: "Listening to you...",
  thinking: "Thinking a story for you...",
  writing: "Making the video for you...",
  reading: "Checking the details...",
  happy: "Your video is ready!",
  idea: "Got a great idea for you!",
  sleeping: "Taking a quick nap. Tap me to wake up!",
  concerned: "Let’s take a look at this.",
  excited: "Your video is ready!",
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
  action = "idle",
  size = "md",
  showDialogue = false,
  dialogue,
  question,
  userInstruction,
  isAutoEdit = false,
  actions = [],
  orientation = "vertical",
  interactive = true,
  className = "",
  stageBg,
  onClick,
  spin = false,
}: PipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<SVGGElement>(null);
  const [currentMood, setCurrentMood] = useState<PipMood>(mood);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [activeAction, setActiveAction] = useState<PipActionType>(
    action !== "idle" ? action : spin ? "spin-up" : "idle"
  );
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const microActionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hasDialogue = showDialogue || !!question || !!dialogue || actions.length > 0;

  useEffect(() => {
    setCurrentMood(mood);
  }, [mood]);

  useEffect(() => {
    if (action && action !== "idle") {
      setActiveAction(action);
    } else if (spin) {
      setActiveAction("spin-up");
    } else {
      setActiveAction("idle");
    }
  }, [action, spin]);

  // Living character autonomous micro-actions:
  // When idle or thinking, Zee periodically does a playful micro-action
  // (a quick spin-up, spin-right, curious tilt, or bounce) so it feels like a real living character!
  useEffect(() => {
    if (!interactive || action !== "idle" || spin || currentMood === "sleeping") {
      if (microActionTimerRef.current) clearInterval(microActionTimerRef.current);
      return;
    }

    const microActions: PipActionType[] = ["spin-up", "spin-right", "tilt-right", "bounce", "wave"];
    
    const triggerMicroAction = () => {
      const chosen = microActions[Math.floor(Math.random() * microActions.length)];
      setActiveAction(chosen);
      setTimeout(() => {
        setActiveAction("idle");
      }, 1300);
    };

    const interval = setInterval(() => {
      triggerMicroAction();
    }, 5500);

    return () => clearInterval(interval);
  }, [interactive, action, spin, currentMood]);

  // Inactivity sleeping detection: when idle for 45s without mouse movement, Pip falls asleep
  useEffect(() => {
    if (!interactive || mood !== "idle") {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (currentMood === "sleeping") {
        setIsWakingUp(true);
        setCurrentMood("happy");
        setActiveAction("spin-up");
        setTimeout(() => {
          setCurrentMood("idle");
          setIsWakingUp(false);
          setActiveAction("idle");
        }, 1800);
      }
      idleTimerRef.current = setTimeout(() => {
        if (mood === "idle") {
          setCurrentMood("sleeping");
        }
      }, 45000);
    };

    window.addEventListener("pointermove", resetIdleTimer, { passive: true });
    window.addEventListener("keydown", resetIdleTimer, { passive: true });
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointermove", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
    };
  }, [interactive, mood, currentMood]);

  // Pointer eye-tracking for idle, listening, happy, and idea moods
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

  const handlePipClick = () => {
    if (currentMood === "sleeping") {
      setIsWakingUp(true);
      setCurrentMood("happy");
      setActiveAction("spin-up");
      setTimeout(() => {
        setCurrentMood(mood || "idle");
        setIsWakingUp(false);
        setActiveAction("idle");
      }, 1600);
      return;
    }

    // Playful click response: character pirouette hop!
    setActiveAction("spin-up");
    setTimeout(() => {
      setActiveAction("idle");
    }, 1200);

    if (onClick) onClick();
  };

  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 80;
  const isMinimal = pixelSize <= 36;
  const rawText = question || dialogue;
  const displayDialogue = isWakingUp
    ? "Hey! I’m awake — what are we making?"
    : cleanZeeDialogue(rawText, currentMood, isAutoEdit);

  // SVG Palette from Zee character sheet
  const I = "#1A1A1D"; // Ink
  const B = "#F2542D"; // Zee Orange
  const P = "#E4E1DB"; // Paper

  const svgContent = (
    <div
      className={stageBg ? "p-3 rounded-[24px] flex flex-col items-center shrink-0" : "flex flex-col items-center shrink-0"}
      style={{ backgroundColor: stageBg }}
    >
      <svg
        className={`pip-svg pip-${currentMood} ${activeAction !== "idle" ? `pip-action-${activeAction}` : ""}`}
        viewBox="0 0 240 220"
        style={{ width: pixelSize, height: (pixelSize * 220) / 240 }}
        role="img"
        aria-label={`Zee, ${currentMood}`}
      >
        {/* Ground Shadow */}
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

        {/* Mood Props */}
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

        {currentMood === "reading" && (
          <>
            <rect x="168" y="98" width="58" height="74" rx="6" fill={P} />
            <line x1="176" y1="112" x2="218" y2="112" stroke={I} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <line x1="176" y1="124" x2="214" y2="124" stroke={I} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <line x1="176" y1="136" x2="210" y2="136" stroke={I} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <line x1="176" y1="148" x2="202" y2="148" stroke={B} strokeWidth="3.5" strokeLinecap="round" />
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

        {currentMood === "concerned" && (
          <>
            <path
              className="pip-sweat"
              d="M174 52C174 52 166 64 166 69C166 73.5 169.6 77 174 77C178.4 77 182 73.5 182 69C182 64 174 52 174 52Z"
              fill="#38BDF8"
            />
            <text className="pip-alert" x="192" y="54">!</text>
          </>
        )}

        {currentMood === "excited" && (
          <>
            <path className="pip-star" d="M26 36l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" />
            <path className="pip-star t2" d="M188 30l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" />
            <circle className="pip-confetti c1" cx="46" cy="20" r="4" />
            <circle className="pip-confetti c2" cx="166" cy="18" r="4.5" />
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

          {/* Cute Little Paws / Hands */}
          <ellipse className="pip-paw pip-paw-left" cx="38" cy="122" rx="10" ry="7" fill={B} stroke={I} strokeWidth="2.5" />
          <ellipse className="pip-paw pip-paw-right" cx="172" cy="122" rx="10" ry="7" fill={B} stroke={I} strokeWidth="2.5" />

          {/* Soft Cheeks */}
          <ellipse cx="64" cy="116" rx="9" ry="5" fill="#FB7185" opacity="0.32" />
          <ellipse cx="146" cy="116" rx="9" ry="5" fill="#FB7185" opacity="0.32" />

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
            ) : currentMood === "concerned" ? (
              <>
                <line x1="72" y1="82" x2="92" y2="76" stroke={I} strokeWidth="4" strokeLinecap="round" />
                <line x1="118" y1="76" x2="138" y2="82" stroke={I} strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="84" cy="96" rx="7.5" ry="10" fill={I} />
                <ellipse cx="126" cy="96" rx="7.5" ry="10" fill={I} />
                <circle cx="82" cy="93" r="2.5" fill={P} />
                <circle cx="124" cy="93" r="2.5" fill={P} />
              </>
            ) : currentMood === "excited" ? (
              <>
                <ellipse cx="84" cy="92" rx="10" ry="14" fill={I} />
                <ellipse cx="126" cy="92" rx="10" ry="14" fill={I} />
                <circle cx="87" cy="86" r="4" fill={P} />
                <circle cx="129" cy="86" r="4" fill={P} />
                <circle cx="81" cy="97" r="2" fill={P} />
                <circle cx="123" cy="97" r="2" fill={P} />
              </>
            ) : (
              <>
                <ellipse cx="84" cy="94" rx={currentMood === "listening" ? 9 : 8} ry={currentMood === "listening" ? 14 : currentMood === "writing" || currentMood === "reading" ? 9 : 12} fill={I} />
                <ellipse cx="126" cy="94" rx={currentMood === "listening" ? 9 : 8} ry={currentMood === "listening" ? 14 : currentMood === "writing" || currentMood === "reading" ? 9 : 12} fill={I} />
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
          {currentMood === "reading" && (
            <path d="M95 122Q105 127 115 122" fill="none" stroke={I} strokeWidth="4" strokeLinecap="round" />
          )}
          {currentMood === "happy" && (
            <>
              <path d="M89 116Q105 144 121 116Z" fill={I} />
              <ellipse cx="66" cy="114" rx="9" ry="5" fill={P} opacity="0.4" />
              <ellipse cx="144" cy="114" rx="9" ry="5" fill={P} opacity="0.4" />
            </>
          )}
          {currentMood === "excited" && (
            <>
              <path d="M85 114Q105 148 125 114Z" fill={I} />
              <path d="M95 128Q105 138 115 128Z" fill="#FB7185" />
              <ellipse cx="64" cy="112" rx="10" ry="5.5" fill={P} opacity="0.48" />
              <ellipse cx="146" cy="112" rx="10" ry="5.5" fill={P} opacity="0.48" />
            </>
          )}
          {currentMood === "concerned" && (
            <path d="M92 130Q105 119 118 130" fill="none" stroke={I} strokeWidth="4.5" strokeLinecap="round" />
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
  );

  return (
    <div
      ref={containerRef}
      onClick={handlePipClick}
      className={`select-none ${onClick || currentMood === "sleeping" || interactive ? "cursor-pointer active:scale-95 transition-transform" : ""} ${className}`}
      style={{
        display: orientation === "horizontal" && hasDialogue ? "flex" : "inline-flex",
        flexDirection: orientation === "horizontal" ? "row" : "column",
        alignItems: orientation === "horizontal" ? "flex-start" : "center",
        gap: orientation === "horizontal" ? "12px" : "4px",
        width: hasDialogue && orientation === "vertical" ? "auto" : undefined,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .pip-svg { overflow: visible; }
        .pip-svg .pip-bod { transform-origin: 105px 172px; }
        .pip-svg .pip-look { transition: transform 0.25s ease-out; }
        .pip-svg ellipse, .pip-svg circle, .pip-svg path, .pip-svg rect, .pip-svg text { transform-box: fill-box; }
        .pip-sh { transform-origin: center; transition: all 0.3s ease; }

        @keyframes pip-bob { 50% { transform: translateY(-6px); } }
        @keyframes pip-shadow { 50% { transform: scale(0.88); } }
        @keyframes pip-breathe { 50% { transform: scale(1.035, 1.02); } }
        @keyframes pip-hop { 0%, 100% { transform: translateY(0) scale(1.05, 0.94); } 45% { transform: translateY(-16px) scale(0.96, 1.05); } }
        @keyframes pip-blink { 0%, 91%, 100% { transform: scaleY(1); } 94% { transform: scaleY(0.08); } }
        @keyframes pip-ring { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.45); opacity: 0; } }
        @keyframes pip-dot { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes pip-type { 0% { transform: scaleX(0); } 55%, 100% { transform: scaleX(1); } }
        @keyframes pip-scan { 0%, 100% { transform: translate(-5px, 6px); } 50% { transform: translate(5px, 6px); } }
        @keyframes pip-cur { 50% { opacity: 0; } }
        @keyframes pip-pop { 0%, 100% { transform: scale(0.3); opacity: 0; } 30%, 70% { transform: scale(1); opacity: 1; } }
        @keyframes pip-zz { 0% { opacity: 0; transform: translate(0, 10px); } 50% { opacity: 1; } 100% { opacity: 0; transform: translate(10px, -14px); } }
        @keyframes pip-lean { 50% { transform: rotate(-5deg); } }
        @keyframes pip-wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
        @keyframes pip-wave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 65% { transform: rotate(9deg); } }
        @keyframes pip-stretch { 0%, 100% { transform: scale(1, 1); } 35% { transform: scale(1.08, 0.92); } 65% { transform: scale(0.94, 1.06); } }
        @keyframes pip-drip { 0%, 100% { transform: translateY(0); opacity: 0.85; } 50% { transform: translateY(5px); opacity: 1; } }

        /* Real Character Actions: Spin-up, Spin-right, Tilt-right, Bounce, Wave, Float */
        @keyframes pip-spin-up {
          0% { transform: translateY(0) rotate(0deg) scale(1); }
          15% { transform: translateY(6px) scale(1.12, 0.88); }
          50% { transform: translateY(-26px) rotate(360deg) scale(0.92, 1.08); }
          75% { transform: translateY(3px) scale(1.06, 0.94); }
          90% { transform: translateY(-3px) scale(0.98, 1.02); }
          100% { transform: translateY(0) rotate(360deg) scale(1); }
        }

        @keyframes pip-spin-right {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(12px, -16px) rotate(120deg) scale(0.94); }
          60% { transform: translate(18px, -6px) rotate(280deg) scale(1.04); }
          85% { transform: translate(2px, 2px) rotate(365deg); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }

        @keyframes pip-tilt-right {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(16deg) translateY(-4px); }
          65% { transform: rotate(14deg) translateY(-2px); }
          85% { transform: rotate(-3deg) translateY(0); }
        }

        @keyframes pip-bounce-action {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          20% { transform: translateY(5px) scale(1.1, 0.9); }
          45% { transform: translateY(-18px) scale(0.92, 1.08); }
          70% { transform: translateY(2px) scale(1.04, 0.96); }
          85% { transform: translateY(-6px) scale(0.98, 1.02); }
        }

        @keyframes pip-wave-paw {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-35deg) translateY(-4px); }
          50% { transform: rotate(15deg); }
          75% { transform: rotate(-30deg) translateY(-3px); }
        }

        @keyframes pip-float-hover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes pip-shadow-hop {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(0.48); opacity: 0.1; }
        }

        .pip-action-spin-up .pip-bod { animation: pip-spin-up 1.15s cubic-bezier(0.34, 1.56, 0.64, 1) !important; transform-origin: 105px 100px; }
        .pip-action-spin-up .pip-sh { animation: pip-shadow-hop 1.15s ease-in-out !important; }

        .pip-action-spin-right .pip-bod { animation: pip-spin-right 1.25s cubic-bezier(0.34, 1.2, 0.64, 1) !important; transform-origin: 105px 100px; }
        .pip-action-spin-right .pip-sh { animation: pip-shadow-hop 1.25s ease-in-out !important; }

        .pip-action-tilt-right .pip-bod { animation: pip-tilt-right 1.2s ease-in-out !important; transform-origin: 105px 160px; }

        .pip-action-bounce .pip-bod { animation: pip-bounce-action 0.95s cubic-bezier(0.34, 1.56, 0.64, 1) !important; transform-origin: 105px 172px; }
        .pip-action-bounce .pip-sh { animation: pip-shadow-hop 0.95s ease-in-out !important; }

        .pip-action-wave .pip-paw-right { animation: pip-wave-paw 0.6s ease-in-out infinite !important; transform-origin: 168px 122px; }

        .pip-action-float .pip-bod { animation: pip-float-hover 2.2s ease-in-out infinite !important; transform-origin: 105px 100px; }
        .pip-action-float .pip-sh { animation: pip-shadow 2.2s ease-in-out infinite !important; }

        .pip-idle .pip-bod, .pip-thinking .pip-bod, .pip-writing .pip-bod { animation: pip-bob 3.2s ease-in-out infinite; }
        .pip-idle .pip-sh, .pip-thinking .pip-sh, .pip-writing .pip-sh { animation: pip-shadow 3.2s ease-in-out infinite; }
        .pip-listening .pip-bod { animation: pip-lean 2.4s ease-in-out infinite; }
        .pip-happy .pip-bod, .pip-excited .pip-bod { animation: pip-hop 0.9s ease-in-out infinite; }
        .pip-happy .pip-sh, .pip-excited .pip-sh { animation: pip-shadow 0.9s ease-in-out infinite; }
        .pip-idea .pip-bod { animation: pip-bob 1.6s ease-in-out infinite; }
        .pip-idea .pip-look { transform-origin: 105px 100px; }
        .pip-listening .pip-look { transform-origin: 105px 100px; animation: pip-wave 2.8s ease-in-out infinite; }
        .pip-writing .pip-bod { animation: pip-stretch 3.4s ease-in-out infinite; }
        .pip-sleeping .pip-bod { animation: pip-breathe 4s ease-in-out infinite; }
        .pip-reading .pip-bod { animation: pip-bob 2.8s ease-in-out infinite; }
        .pip-reading .pip-look { animation: pip-scan 2.6s ease-in-out infinite; }
        .pip-concerned .pip-bod { animation: pip-wobble 2.2s ease-in-out infinite; }
        .pip-sweat { animation: pip-drip 1.6s ease-in-out infinite; }
        .pip-alert { fill: #FB7185; font: 900 26px 'Bricolage Grotesque', system-ui, sans-serif; animation: pip-pop 1.4s ease-in-out infinite; }
        .pip-confetti { fill: #FDE047; animation: pip-pop 1.1s ease-in-out infinite; }
        .pip-confetti.c2 { fill: #34D399; animation-delay: 0.35s; }

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
        .pip-z { fill: ${P}; font: 800 26px 'Bricolage Grotesque', system-ui, sans-serif; animation: pip-zz 3s infinite; }
        .pip-z.z2 { animation-delay: 1.4s; font-size: 20px; }
      `,
        }}
      />

      {svgContent}

      {/* Dialogue and Decision Actions: Clean, Punchy 1-2 Line UI */}
      {hasDialogue && (
        <div className={orientation === "horizontal" ? "flex-1 min-w-0" : "mt-2 text-center"}>
          <div className="relative inline-block text-left max-w-full">
            <div className="rounded-[16px] bg-[#1A1A1D] text-[#E4E1DB] px-3.5 py-2.5 text-[12.5px] leading-snug font-medium shadow-md border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 mono text-[9.5px] font-bold text-[#F2542D] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F2542D] animate-ping" />
                  <span>Zee</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: PIP_MOOD_META[currentMood]?.badgeBg,
                    color: PIP_MOOD_META[currentMood]?.badgeText,
                  }}
                >
                  {PIP_MOOD_META[currentMood]?.label || currentMood}
                </span>
              </div>
              <p className="text-[13px] text-[#F7F5EF] leading-snug break-words">
                {displayDialogue}
              </p>

              {/* Action / Decision buttons */}
              {actions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {actions.map((act, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        act.onClick();
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition active:scale-95 ${
                        act.variant === "primary"
                          ? "bg-[#F2542D] text-white hover:bg-[#D94520] shadow-sm"
                          : act.variant === "subtle"
                          ? "bg-white/10 text-white/80 hover:bg-white/20"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                    >
                      {act.icon}
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
