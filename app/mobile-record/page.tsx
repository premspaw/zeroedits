"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Video,
  Square,
  CheckCircle2,
  Sparkles,
  Send,
  Upload,
  ChevronRight,
  ChevronLeft,
  Radio,
  Smartphone,
} from "lucide-react";

interface ScriptBeat {
  id: number;
  phase: string;
  spokenLine: string;
  deliveryCue: string;
  visualCutaway: string;
  durationSec: number;
}

function MobileRecordInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "prem-live-session";

  const [title, setTitle] = useState("Prem's Humanized Story");
  const [beats, setBeats] = useState<ScriptBeat[]>([]);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Linked with Laptop Teleprompter");

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Connect to Laptop session & poll live beat transitions
  useEffect(() => {
    let active = true;

    // Announce mobile connected
    fetch("/api/script-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        status: "mobile_connected",
      }),
    }).catch(() => {});

    const poll = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(
          `/api/script-session?sessionId=${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data.session) {
          if (data.session.title) setTitle(data.session.title);
          if (
            Array.isArray(data.session.beats) &&
            data.session.beats.length > 0
          ) {
            setBeats(data.session.beats);
          }
          if (typeof data.session.activeBeatIndex === "number") {
            setActiveBeatIndex(data.session.activeBeatIndex);
          }
        }
      } catch {}
    }, 900);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [sessionId]);

  // Initialize front camera preview if available
  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch {
      setStatusMsg("Tap 'Use Phone Camera' below to record your take");
    }
  };

  useEffect(() => {
    startCameraPreview();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleStartRecording = async () => {
    setSentSuccess(false);
    setRecordedBlob(null);

    if (!streamRef.current) {
      await startCameraPreview();
    }

    if (!streamRef.current) {
      nativeCameraInputRef.current?.click();
      return;
    }

    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: rec.mimeType || "video/webm",
      });
      setRecordedBlob(blob);
    };

    rec.start();
    setIsRecording(true);
    setRecSeconds(0);

    // Notify laptop that mobile recording started + start teleprompter transition
    fetch("/api/script-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        status: "recording",
        isPlaying: true,
        activeBeatIndex: 0,
      }),
    }).catch(() => {});

    timerRef.current = setInterval(() => {
      setRecSeconds((s) => s + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    fetch("/api/script-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        isPlaying: false,
      }),
    }).catch(() => {});
  };

  const handleSendToLaptopStudio = async (overrideFile?: File | Blob) => {
    const targetBlob = overrideFile || recordedBlob;
    if (!targetBlob || isSending) return;

    setIsSending(true);
    setStatusMsg("Sending your video take to Laptop AI Video Studio...");
    try {
      const form = new FormData();
      form.append("sessionId", sessionId);
      form.append(
        "video",
        targetBlob,
        (targetBlob as File).name || `prem-mobile-take-${Date.now()}.webm`
      );

      const res = await fetch("/api/script-session", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        setSentSuccess(true);
        setStatusMsg("Sent! Check your Laptop Screen — Zee is opening Video Studio.");
      }
    } catch {
      setStatusMsg("Upload failed — please tap Send again.");
    } finally {
      setIsSending(false);
    }
  };

  const changeBeat = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(beats.length - 1, nextIdx));
    setActiveBeatIndex(clamped);
    fetch("/api/script-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        activeBeatIndex: clamped,
      }),
    }).catch(() => {});
  };

  const currentBeat = beats[activeBeatIndex];

  return (
    <div className="min-h-screen w-full bg-[#141414] text-white flex flex-col justify-between p-4 select-none">
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="video/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setRecordedBlob(f);
            handleSendToLaptopStudio(f);
          }
        }}
      />

      {/* Top Mobile Companion Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/15">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E4491B] flex items-center justify-center font-black serif text-sm">
            P
          </div>
          <div>
            <div className="mono text-[10px] font-bold text-[#FFE17D] uppercase flex items-center gap-1">
              <Radio size={11} className="animate-pulse text-[#E4491B]" />
              <span>{statusMsg}</span>
            </div>
            <h1 className="serif text-base font-bold text-white truncate max-w-[230px]">
              {title}
            </h1>
          </div>
        </div>

        {isRecording && (
          <div className="px-3 py-1 rounded-full bg-[#E4491B] text-white mono text-xs font-bold animate-pulse">
            REC {recSeconds}s
          </div>
        )}
      </div>

      {/* Center Camera + Synchronized Teleprompter Overlay */}
      <div className="relative my-3 flex-1 rounded-3xl border-2 border-white/20 bg-[#1E1E1C] overflow-hidden flex flex-col justify-between p-4">
        <video
          ref={videoPreviewRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            cameraReady ? "opacity-55" : "opacity-0"
          }`}
        />

        {/* Top Beat Progress Pills */}
        <div className="relative z-10 flex items-center gap-1.5">
          {beats.map((b, i) => (
            <button
              key={b.id || i}
              type="button"
              onClick={() => changeBeat(i)}
              className={`h-2 flex-1 rounded-full transition ${
                i === activeBeatIndex
                  ? "bg-[#E4491B]"
                  : i < activeBeatIndex
                  ? "bg-[#FFE17D]/60"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Live Script Transition Card */}
        <div className="relative z-10 my-auto rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 p-5 text-center shadow-2xl">
          <div className="mono text-[10px] font-bold uppercase tracking-widest text-[#FFE17D] mb-2">
            {currentBeat?.phase || `BEAT ${activeBeatIndex + 1} OF ${beats.length || 4}`}
          </div>

          <p className="serif text-2xl sm:text-3xl font-bold text-white leading-snug mb-3">
            &ldquo;
            {currentBeat?.spokenLine ||
              "Look into the lens and speak like you're talking to a close friend..."}
            &rdquo;
          </p>

          {currentBeat?.deliveryCue && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4491B]/25 border border-[#E4491B]/50 text-[#FFE17D] mono text-[11px]">
              <Sparkles size={11} />
              <span>{currentBeat.deliveryCue}</span>
            </div>
          )}

          {/* Manual Beat Switchers */}
          {beats.length > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => changeBeat(activeBeatIndex - 1)}
                disabled={activeBeatIndex === 0}
                className="px-3 py-1 rounded-lg bg-white/10 text-xs mono font-bold disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="mono text-[10px] text-white/60">
                Synced with Laptop Screen
              </span>
              <button
                type="button"
                onClick={() => changeBeat(activeBeatIndex + 1)}
                disabled={activeBeatIndex >= beats.length - 1}
                className="px-3 py-1 rounded-lg bg-white/10 text-xs mono font-bold disabled:opacity-30 flex items-center gap-1"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        <div className="relative z-10 text-center mono text-[10px] text-white/70">
          Laptop displays full teleprompter transitions • Phone captures your take
        </div>
      </div>

      {/* Bottom Record & Send to Laptop AI Studio Controls */}
      <div className="space-y-2.5">
        {sentSuccess ? (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white text-center font-bold text-sm flex items-center justify-center gap-2">
            <CheckCircle2 size={18} />
            <span>Sent to Laptop Video Studio! Check your Laptop Screen.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex-1 py-4 rounded-2xl bg-[#E4491B] text-white font-bold mono text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Video size={18} />
                <span>{recordedBlob ? "Record Again" : "Start Recording"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-bold mono text-sm flex items-center justify-center gap-2 animate-pulse"
              >
                <Square size={18} />
                <span>Stop Recording ({recSeconds}s)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="py-4 px-4 rounded-2xl border border-white/25 bg-white/10 text-white mono text-xs font-bold flex items-center gap-1.5"
              title="Open Native Phone Camera or Upload Video"
            >
              <Smartphone size={16} />
              <span>Phone Cam</span>
            </button>
          </div>
        )}

        {recordedBlob && !sentSuccess && (
          <button
            type="button"
            disabled={isSending}
            onClick={() => handleSendToLaptopStudio()}
            className="w-full py-4 rounded-2xl bg-[#FFE17D] text-[#141414] font-black mono text-sm flex items-center justify-center gap-2 shadow-xl"
          >
            <Send size={16} />
            <span>
              {isSending
                ? "Sending to Laptop AI Studio..."
                : "Send Video to Laptop AI Studio →"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function MobileRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#141414] text-white grid place-items-center mono text-sm">
          Connecting to Prem&apos;s Laptop Teleprompter...
        </div>
      }
    >
      <MobileRecordInner />
    </Suspense>
  );
}

