import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FullReel15s - Complete 15-Second Video Reel Component
 * 
 * Sequences all 6 beats seamlessly across the full 15-second timeline (0:00 - 0:15):
 * - Beat 1 (0.0s - 2.5s): HOOK — "Most people lose 2 seconds. Here's why."
 * - Beat 2 (2.5s - 5.0s): SETUP — "A tiny seed wakes up in warm soil."
 * - Beat 3 (5.0s - 7.5s): MAGIC — "Sunlight feeds leaves, stem stretches in 4 days."
 * - Beat 4 (7.5s - 10.0s): TRANSFORM — "Roots anchor deep, drinking pure water."
 * - Beat 5 (10.0s - 12.5s): BLOOM — "Buds swell with morning amber glow."
 * - Beat 6 (12.5s - 15.0s): PAYOFF / CTA — "Sip slowly, breathe deeply, enjoy pure warmth."
 */
export default function FullReel15s() {
  const TOTAL_DURATION = 15; // 15 seconds
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeBeatIndex, setActiveBeatIndex] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);

  const theme = {
    bg: "#F5F1E8",
    paper: "#FFFEFB",
    accent: "#FF6B35",
    secondary: "#6B8E5A",
    ink: "#111111",
    font: "'Instrument Serif', Georgia, serif",
  };

  const beats = [
    {
      id: 1,
      role: "HOOK",
      start: 0.0,
      end: 2.5,
      headline: "Most people fail in 2 seconds.",
      sub: "Watch how a seed completely rewires itself.",
      badge: "BEAT 01 • HOOK",
      emoji: "🌱",
      color: "#FF6B35",
    },
    {
      id: 2,
      role: "SETUP",
      start: 2.5,
      end: 5.0,
      headline: "Roots drink first drops of morning dew.",
      sub: "Capillary pressure builds beneath the soil.",
      badge: "BEAT 02 • SETUP",
      emoji: "💧",
      color: "#3B82F6",
    },
    {
      id: 3,
      role: "MAGIC",
      start: 5.0,
      end: 7.5,
      headline: "Sunlight feeds leaves, stem stretches in 4 days.",
      sub: "Continuous photosynthesis anchors energy.",
      badge: "BEAT 03 • MAGIC",
      emoji: "☀️",
      color: "#D97706",
    },
    {
      id: 4,
      role: "TRANSFORM",
      start: 7.5,
      end: 10.0,
      headline: "Green chlorophyll rushes upward.",
      sub: "Cell walls double in tensile strength.",
      badge: "BEAT 04 • TRANSFORM",
      emoji: "🌿",
      color: "#6B8E5A",
    },
    {
      id: 5,
      role: "BLOOM",
      start: 10.0,
      end: 12.5,
      headline: "First amber bud unfurls into golden light.",
      sub: "Fragrance releases into warm kitchen air.",
      badge: "BEAT 05 • BLOOM",
      emoji: "🌸",
      color: "#EC4899",
    },
    {
      id: 6,
      role: "PAYOFF",
      start: 12.5,
      end: 15.0,
      headline: "Sip slowly, breathe deeply, enjoy pure warmth.",
      sub: "Full organic cycle complete • Ready to enjoy.",
      badge: "BEAT 06 • PAYOFF",
      emoji: "☕",
      color: "#FF6B35",
    },
  ];

  const currentBeat = beats[activeBeatIndex];

  // Global 15-second timeline clock
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 50;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + intervalMs / 1000;
        if (next >= TOTAL_DURATION) {
          // Loop seamlessly
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Sync active beat to elapsed time
  useEffect(() => {
    const matchingIdx = beats.findIndex(
      (b) => elapsed >= b.start && elapsed < b.end
    );
    if (matchingIdx !== -1 && matchingIdx !== activeBeatIndex) {
      setActiveBeatIndex(matchingIdx);
    }
  }, [elapsed, beats, activeBeatIndex]);

  const tornClip =
    "polygon(0% 2%, 4% 0.8%, 9% 2.2%, 14% 0.9%, 19% 2%, 24% 1%, 29% 2.1%, 34% 0.9%, 39% 2.2%, 44% 0.8%, 49% 2%, 54% 1%, 59% 2.2%, 64% 0.8%, 69% 2%, 74% 1%, 79% 2.3%, 84% 1%, 89% 2%, 94% 0.8%, 100% 2%, 100% 98%, 95% 99.2%, 90% 97.8%, 85% 99.1%, 80% 97.6%, 75% 99%, 70% 97.8%, 65% 99.2%, 60% 97.6%, 55% 99%, 50% 97.8%, 45% 99.2%, 40% 97.6%, 35% 98.9%, 30% 97.8%, 25% 99.2%, 20% 97.9%, 15% 99%, 10% 97.7%, 5% 99.1%, 0% 97.9%)";

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: theme.bg,
        color: theme.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: theme.font,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 9:16 Video Reel Canvas */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          aspectRatio: "9 / 16",
          background: theme.paper,
          borderRadius: "26px",
          border: "2px solid #111111",
          boxShadow: "0 28px 60px rgba(0,0,0,0.22)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "20px 18px",
        }}
      >
        {/* Top Header: Total 15s Reel Timecode & Controls */}
        <div style={{ zIndex: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#7A7568",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: isPlaying ? "#FF6B35" : "#7A7568",
                  display: "inline-block",
                  boxShadow: isPlaying ? "0 0 8px #FF6B35" : "none",
                }}
              />
              <span style={{ fontWeight: 700, color: "#111" }}>
                0:{elapsed.toFixed(1).padStart(4, "0")} / 0:15.0s REEL
              </span>
            </div>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              style={{
                background: "#111",
                color: "#FFFEFB",
                border: "none",
                borderRadius: "100px",
                padding: "3px 10px",
                fontSize: "10px",
                fontFamily: "monospace",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>
          </div>

          {/* 6-Segment Full Video Timeline Scrubber */}
          <div style={{ display: "flex", gap: "4px", width: "100%" }}>
            {beats.map((b, idx) => {
              const isActive = idx === activeBeatIndex;
              const isPast = idx < activeBeatIndex;
              const beatProgress =
                isActive
                  ? Math.min(1, Math.max(0, (elapsed - b.start) / (b.end - b.start)))
                  : isPast
                  ? 1
                  : 0;

              return (
                <div
                  key={b.id}
                  onClick={() => setElapsed(b.start)}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "100px",
                    background: isPast
                      ? "#6B8E5A"
                      : "rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  title={`Beat ${b.id}: ${b.start}s - ${b.end}s`}
                >
                  {isActive && (
                    <div
                      style={{
                        height: "100%",
                        width: `${beatProgress * 100}%`,
                        background: theme.accent,
                        borderRadius: "100px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Paper Card transitioning between all 6 beats */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBeat.id}
            initial={{ y: -240, opacity: 0, rotate: activeBeatIndex % 2 === 0 ? -3 : 3, scale: 0.92 }}
            animate={{
              y: [0, -6, 0],
              opacity: 1,
              rotate: activeBeatIndex % 2 === 0 ? [-0.6, 0.6, -0.6] : [0.6, -0.6, 0.6],
              scale: 1,
            }}
            exit={{ y: 220, opacity: 0, scale: 0.9, rotate: 2 }}
            transition={{
              opacity: { duration: 0.3 },
              scale: { type: "spring", damping: 20, stiffness: 220 },
              y: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
              rotate: { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
            }}
            style={{
              width: "100%",
              height: "78%",
              background: "#FFFEFB",
              clipPath: tornClip,
              boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 20px",
              textAlign: "center",
              position: "relative",
              border: "1px solid rgba(234,226,204,0.6)",
            }}
          >
            {/* Top Beat Role Tag */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 18, delay: 0.15 }}
              style={{
                background: currentBeat.color,
                color: "#FFFEFB",
                fontSize: "10px",
                letterSpacing: "0.22em",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 800,
                padding: "6px 14px",
                borderRadius: "100px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
              }}
            >
              {currentBeat.badge}
            </motion.div>

            {/* Central Animated Hero Graphic */}
            <div
              style={{
                position: "relative",
                width: "120px",
                height: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `2px dashed ${currentBeat.color}66`,
                }}
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, #FFE9DC 0%, ${currentBeat.color} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "40px",
                  boxShadow: `0 10px 24px ${currentBeat.color}44`,
                }}
              >
                <motion.span
                  animate={{ y: [-2, 2, -2], rotate: [-4, 4, -4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {currentBeat.emoji}
                </motion.span>
              </motion.div>
            </div>

            {/* Beat Headline & Script */}
            <div>
              <h2
                style={{
                  fontSize: "26px",
                  lineHeight: 1.08,
                  margin: "0 0 8px",
                  fontWeight: 400,
                  color: "#111",
                }}
              >
                {currentBeat.headline}
              </h2>
              <p
                style={{
                  fontSize: "12.5px",
                  fontFamily: "system-ui, sans-serif",
                  color: "#7A7568",
                  margin: 0,
                }}
              >
                {currentBeat.sub}
              </p>
            </div>

            {/* Micro Tag: Beat Duration Slice */}
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                color: "#7A7568",
                background: "rgba(245,241,232,0.8)",
                padding: "4px 10px",
                borderRadius: "100px",
                border: "1px solid #EAE2CC",
              }}
            >
              TIMEFRAME: {currentBeat.start.toFixed(1)}s - {currentBeat.end.toFixed(1)}s (2.5s duration)
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom Full Reel Master Footer */}
        <div
          style={{
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: "10.5px",
            color: "#7A7568",
            borderTop: "1px solid #EAE2CC",
            paddingTop: "10px",
          }}
        >
          <span>15s FULL VIDEO REEL</span>
          <span style={{ color: theme.accent, fontWeight: 700 }}>
            BEAT {activeBeatIndex + 1} OF 6
          </span>
        </div>
      </div>
    </div>
  );
}
