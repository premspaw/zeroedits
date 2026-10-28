import React, { useState, useEffect } from "react";
import { motion, useSpring } from "framer-motion";

/**
 * Beat2 - Full Timeline Choreography
 * 
 * Timeline breakdown across full beat duration (3.0s):
 * - 0.0s - 0.6s: Phase 1 — Paper card drop-in with organic paper spring physics & torn edges
 * - 0.6s - 1.4s: Phase 2 — Sunlight core blooms, rays start rotating, plant sprout emerges
 * - 1.4s - 2.2s: Phase 3 — Days counter rolls dynamically (0 -> 4), headline emphasis pops
 * - 2.2s - 3.0s: Phase 4 — Timeline pill advances (Water -> Sunlight active -> Bloom preview)
 * - Throughout: Continuous floating paper drift, shimmering sunlight rays, and live timeline scrubber
 */
export default function Beat2() {
  const [phase, setPhase] = useState<number>(1);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  // Progressive timeline counter synced to timeline
  const springCount = useSpring(0, { damping: 18, stiffness: 120 });

  useEffect(() => {
    // Stage 1: Card drops in (0s)
    // Stage 2: Core illustration activates at 0.6s
    const t1 = setTimeout(() => setPhase(2), 600);

    // Stage 3: Dynamic counter begins rolling at 1.2s
    const t2 = setTimeout(() => {
      setPhase(3);
      springCount.set(4);
    }, 1200);

    // Stage 4: Timeline step advances at 2.0s
    const t3 = setTimeout(() => {
      setPhase(4);
      setActiveStepIndex(1); // Sunlight active
    }, 2000);

    const unsub = springCount.on("change", (latest: number) => {
      setCount(Math.round(latest));
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      unsub();
    };
  }, [springCount]);

  const tornClip =
    "polygon(0% 2.5%, 4% 1.2%, 8% 2.8%, 13% 1.1%, 18% 2.6%, 23% 1.2%, 28% 2.7%, 33% 1.3%, 38% 2.9%, 43% 1%, 48% 2.6%, 53% 1.2%, 58% 2.8%, 63% 1%, 68% 2.5%, 73% 1.2%, 78% 2.9%, 83% 1.3%, 88% 2.6%, 93% 1%, 100% 2.5%, 100% 97.5%, 95% 99%, 90% 97.2%, 85% 98.8%, 80% 97%, 75% 98.7%, 70% 97.2%, 65% 99%, 60% 97.1%, 55% 98.6%, 50% 97.2%, 45% 98.9%, 40% 97%, 35% 98.5%, 30% 97.3%, 25% 99%, 20% 97.4%, 15% 98.7%, 10% 97.1%, 5% 98.8%, 0% 97.3%)";

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#F5F1E8",
        color: "#111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Instrument Serif', Georgia, serif",
      }}
    >
      {/* Background Ambience & Soft Sunlight Glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.18, 0.28, 0.18],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "680px",
            height: "400px",
            background:
              "radial-gradient(ellipse at center, rgba(255,107,53,0.3) 0%, rgba(255,107,53,0.08) 50%, transparent 70%)",
            filter: "blur(24px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-40px",
            width: "320px",
            height: "320px",
            background:
              "radial-gradient(circle, rgba(107,142,90,0.18) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Main 9:16 Responsive Card Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          aspectRatio: "9 / 16",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {/* Whole-Timeline Motion: Smooth Floating Drift + Spring Entry */}
        <motion.div
          initial={{ y: -480, opacity: 0, rotate: -4, scale: 0.92 }}
          animate={{
            y: [0, -8, 0],
            rotate: [-0.6, 0.6, -0.6],
            opacity: 1,
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.4 },
            scale: { type: "spring", damping: 20, stiffness: 200 },
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
            rotate: { duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
          }}
          style={{
            width: "100%",
            height: "94%",
            background: "#FFFEFB",
            clipPath: tornClip,
            filter: "drop-shadow(0 26px 42px rgba(17,17,17,0.18))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "36px 28px",
            position: "relative",
            textAlign: "center",
            border: "1px solid rgba(234,226,204,0.6)",
          }}
        >
          {/* Timeline Phase Tag & Step Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{
                type: "spring",
                damping: 18,
                stiffness: 220,
                delay: 0.2,
              }}
              style={{
                background: "#FF6B35",
                color: "#FFFEFB",
                fontSize: "10px",
                letterSpacing: "0.22em",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 800,
                padding: "6px 14px",
                borderRadius: "100px",
                boxShadow: "0 6px 16px rgba(255,107,53,0.3)",
              }}
            >
              MAGIC • BEAT 02
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                fontSize: "10.5px",
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "1.2px",
                fontWeight: 700,
                color: "#6B8E5A",
                background: "rgba(107,142,90,0.12)",
                border: "1.5px solid #6B8E5A",
                padding: "4px 10px",
                borderRadius: "100px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: "#6B8E5A",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                }}
              >
                ✓
              </motion.span>{" "}
              SUNLIGHT ACTIVE
            </motion.div>
          </div>

          {/* Central Animated Illustration — Timeline Choreographed */}
          <div
            style={{
              position: "relative",
              width: "150px",
              height: "150px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "10px 0",
            }}
          >
            {/* Rotating Sun Rays (Continuous Timeline Animation) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                border: "2px dashed rgba(255,107,53,0.45)",
              }}
            />

            {/* Pulsing Warm Amber Sun Core with Timeline Phase Expansion */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{
                scale: phase >= 2 ? [1, 1.09, 1] : 0.9,
                opacity: 1,
              }}
              transition={{
                scale: {
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                opacity: { duration: 0.5, delay: 0.3 },
              }}
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                background: "radial-gradient(circle, #FFE9DC 0%, #FF6B35 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 14px 32px rgba(255,107,53,0.36)",
                position: "relative",
              }}
            >
              {/* Sprouting Plant Sways Across Timeline */}
              <motion.span
                initial={{ y: 15, scale: 0.5 }}
                animate={{
                  y: [0, -3, 0],
                  scale: phase >= 2 ? 1 : 0.8,
                  rotate: [-3, 3, -3],
                }}
                transition={{
                  y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
                  scale: { type: "spring", damping: 15 },
                }}
                style={{ fontSize: "44px", userSelect: "none" }}
              >
                🌱
              </motion.span>
            </motion.div>

            {/* Rising Sunlight Sparkles (Staggered continuous timeline loops) */}
            {[0, 1, 2].map((s) => (
              <motion.div
                key={s}
                animate={{
                  y: [-8, -32],
                  opacity: [0, 1, 0],
                  scale: [0.7, 1.25],
                }}
                transition={{
                  duration: 2.0,
                  repeat: Infinity,
                  delay: s * 0.6,
                  ease: "easeOut",
                }}
                style={{
                  position: "absolute",
                  top: "6px",
                  left: `${32 + s * 24}%`,
                  fontSize: "15px",
                }}
              >
                ✨
              </motion.div>
            ))}
          </div>

          {/* Editorial Headline with Dynamic Spring Number Rolling */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 200,
              delay: 0.35,
            }}
          >
            <h1
              style={{
                fontSize: "33px",
                lineHeight: 1.06,
                margin: "0 0 10px",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                color: "#111111",
              }}
            >
              Sunlight feeds leaves, stem stretches in{" "}
              <motion.span
                animate={{
                  scale: phase >= 3 ? [1, 1.12, 1] : 1,
                  boxShadow:
                    phase >= 3
                      ? [
                          "0 4px 12px rgba(255,107,53,0.3)",
                          "0 8px 24px rgba(255,107,53,0.5)",
                          "0 4px 12px rgba(255,107,53,0.3)",
                        ]
                      : "0 4px 12px rgba(255,107,53,0.3)",
                }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{
                  color: "#FFFEFB",
                  background: "#FF6B35",
                  padding: "2px 14px",
                  borderRadius: "8px",
                  display: "inline-block",
                  transform: "rotate(-2deg)",
                  fontWeight: 700,
                }}
              >
                {count}
              </motion.span>{" "}
              days
            </h1>
            <p
              style={{
                fontSize: "13.5px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#7A7568",
                margin: 0,
              }}
            >
              Continuous photosynthesis • roots anchor deep
            </p>
          </motion.div>

          {/* Progressive 3-Stage Timeline Pill — Choreographed across seconds */}
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              margin: "12px 0 6px",
            }}
          >
            {[
              { label: "Water", emoji: "💧", phaseAt: 1 },
              { label: "Sunlight", emoji: "☀️", phaseAt: 2 },
              { label: "Bloom", emoji: "🌸", phaseAt: 4 },
            ].map((step, idx) => {
              const isActive = idx === activeStepIndex;
              const isPast = idx < activeStepIndex;

              return (
                <motion.div
                  key={step.label}
                  animate={{
                    scale: isActive ? [1, 1.04, 1] : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  style={{
                    padding: "9px 6px",
                    borderRadius: "14px",
                    background: isActive
                      ? "#FFE9DC"
                      : isPast
                      ? "rgba(107,142,90,0.12)"
                      : "rgba(245,241,232,0.8)",
                    border: isActive
                      ? "2px solid #FF6B35"
                      : isPast
                      ? "1.5px solid #6B8E5A"
                      : "1px solid #EAE2CC",
                    textAlign: "center",
                    boxShadow: isActive
                      ? "0 8px 18px rgba(255,107,53,0.22)"
                      : "none",
                    transition: "background 0.3s, border 0.3s",
                  }}
                >
                  <div style={{ fontSize: "17px" }}>{step.emoji}</div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      fontFamily: "system-ui, sans-serif",
                      color: isActive
                        ? "#FF6B35"
                        : isPast
                        ? "#6B8E5A"
                        : "#7A7568",
                      marginTop: "3px",
                    }}
                  >
                    {step.label}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Full 15-Second Reel Timeline Scrubber (Beat 2 of 6) */}
          <div style={{ width: "100%" }}>
            {/* 6-Segment Full 15s Video Tracker */}
            <div
              style={{
                display: "flex",
                gap: "5px",
                width: "100%",
                marginBottom: "8px",
              }}
            >
              {[
                { label: "B1", time: "0:00 - 0:02.5", state: "done" },
                { label: "B2", time: "0:02.5 - 0:05.0", state: "done" },
                { label: "B3", time: "0:05.0 - 0:07.5", state: "active" }, // Beat 2 Active
                { label: "B4", time: "0:07.5 - 0:10.0", state: "upcoming" },
                { label: "B5", time: "0:10.0 - 0:12.5", state: "upcoming" },
                { label: "B6", time: "0:12.5 - 0:15.0", state: "upcoming" },
              ].map((seg, sIdx) => (
                <div
                  key={seg.label}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "100px",
                    background:
                      seg.state === "active"
                        ? "rgba(255,107,53,0.2)"
                        : seg.state === "done"
                        ? "#6B8E5A"
                        : "rgba(234,226,204,0.8)",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {seg.state === "active" && (
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{
                        height: "100%",
                        background: "#FF6B35",
                        borderRadius: "100px",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "10px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#7A7568",
              }}
            >
              <span>BEAT 02 • 0:05.0 - 0:07.5 / 0:15.0s REEL</span>
              <span
                style={{
                  color: "#FF6B35",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#FF6B35",
                    display: "inline-block",
                  }}
                />
                15s TOTAL REEL
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}