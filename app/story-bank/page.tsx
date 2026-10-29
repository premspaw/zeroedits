"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  Square,
  Upload,
  Send,
  Save,
  Check,
  Loader2,
  Sparkles,
  BookOpen,
  Target,
} from "lucide-react";

type Goal = "personal-brand" | "business" | "startup";

interface BankMoment {
  title: string;
  summary: string;
  hook: string;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  audioUrl?: string;
  moments?: BankMoment[];
  pending?: boolean;
}

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: "personal-brand", label: "Personal brand", desc: "You are the product" },
  { id: "business", label: "Business", desc: "Clients & sales" },
  { id: "startup", label: "Startup", desc: "Build in public" },
];

const GOAL_LABEL: Record<Goal, string> = {
  "personal-brand": "Personal brand",
  business: "Business",
  startup: "Startup",
};

async function readJson(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Request failed (HTTP ${res.status}). Please retry.`);
  }
  return data.data;
}

export default function StoryBankPage() {
  const [goal, setGoal] = useState<Goal>("personal-brand");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "This is your Story Bank. Tap the mic and talk for a minute about your day — a win, a failure, something you noticed. I will transcribe it, pull out the bankable moments, and grow your personal memory. Real life in, reel ideas out.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [personalMd, setPersonalMd] = useState("");
  const [mdSaved, setMdSaved] = useState(false);
  const [rawCount, setRawCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const refreshMemory = useCallback(async () => {
    try {
      const data = await readJson(await fetch("/api/story/memory"));
      setPersonalMd(data.personalMd || "");
      setRawCount((data.rawBank || "").split(/^## /m).length - 1);
      if (data.goal === "personal-brand" || data.goal === "business" || data.goal === "startup") {
        setGoal(data.goal);
      }
    } catch (e) {
      console.warn("Memory load failed:", e);
    }
  }, []);

  useEffect(() => {
    refreshMemory();
  }, [refreshMemory]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const pushMessage = (msg: ChatMsg) =>
    setMessages((prev) => [...prev, msg]);

  async function runDistill(transcript: string, audioUrl?: string) {
    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: transcript,
      audioUrl,
    };
    pushMessage(userMsg);
    const thinkingId = `a-${Date.now() + 1}`;
    pushMessage({ id: thinkingId, role: "assistant", text: "", pending: true });
    try {
      const data = await readJson(
        await fetch("/api/story/distill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, goal }),
        })
      );
      const moments: BankMoment[] = (data.moments || []).map((m: any) => ({
        title: String(m.title || "Moment"),
        summary: String(m.summary || ""),
        hook: String(m.hook || ""),
      }));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                pending: false,
                text:
                  moments.length > 0
                    ? `Banked ${moments.length} moment${moments.length > 1 ? "s" : ""} from this check-in. Pick a hook when you are ready for scripts.`
                    : "Nothing bankable in this one — daily habit still counts. Talk tomorrow.",
                moments,
              }
            : m
        )
      );
      refreshMemory();
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { ...m, pending: false, text: `Distill failed: ${err.message || "retry"}. Your raw words are safe in the bank.` }
            : m
        )
      );
    }
  }

  async function uploadCheckin(blob: Blob, filename: string) {
    setBusy("Transcribing your check-in...");
    try {
      const form = new FormData();
      form.append("audio", blob, filename);
      form.append("goal", goal);
      const data = await readJson(await fetch("/api/story/checkin", { method: "POST", body: form }));
      setBusy(null);
      await runDistill(data.text, data.audioUrl);
    } catch (err: any) {
      setBusy(null);
      pushMessage({
        id: `e-${Date.now()}`,
        role: "assistant",
        text: `Check-in failed: ${err.message || "retry"}. Your recording was not saved — please try again.`,
      });
    }
  }

  const startRecording = async () => {
    if (recording || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) uploadCheckin(blob, `checkin-${Date.now()}.webm`);
      };
      rec.start();
      setRecording(true);
      setRecSec(0);
      timerRef.current = setInterval(() => {
        setRecSec((s) => {
          if (s + 1 >= 180) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      pushMessage({
        id: `e-${Date.now()}`,
        role: "assistant",
        text: "Microphone blocked. Allow mic access, or upload an audio file instead.",
      });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
  };

  const sendTypedCheckin = async () => {
    const text = input.trim();
    if (!text || busy || recording) return;
    setInput("");
    await runDistill(text);
  };

  const changeGoal = async (g: Goal) => {
    setGoal(g);
    try {
      await fetch("/api/story/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: g }),
      });
      refreshMemory();
    } catch (e) {
      console.warn("Goal save failed:", e);
    }
  };

  const savePersonalMd = async () => {
    try {
      await readJson(
        await fetch("/api/story/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personalMd }),
        })
      );
      setMdSaved(true);
      setTimeout(() => setMdSaved(false), 1800);
    } catch (err: any) {
      pushMessage({
        id: `e-${Date.now()}`,
        role: "assistant",
        text: `Memory save failed: ${err.message || "retry"}.`,
      });
    }
  };

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#ECEAE3] text-[#141414]">
      {/* Header */}
      <header className="border-b-2 border-[#141414] bg-[#F7F5EF]">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="h-8 px-3 rounded-full border-2 border-[#141414] bg-white flex items-center gap-1.5 mono text-[12px] font-bold hover:bg-[#ECEAE3] transition"
          >
            <ArrowLeft size={13} /> Studio
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#E4491B] text-white grid place-items-center font-bold">S</span>
            <div>
              <div className="serif text-[18px] leading-none font-medium">Story Bank</div>
              <div className="mono text-[10px] text-[#6B6A64]">Raw life in · reel ideas out</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Target size={13} className="text-[#6B6A64]" />
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                title={g.desc}
                onClick={() => changeGoal(g.id)}
                className={`h-8 px-3 rounded-full border-2 mono text-[11px] font-bold transition active:scale-95 ${
                  goal === g.id
                    ? "bg-[#141414] text-white border-[#141414]"
                    : "bg-white border-[#141414]/30 text-[#141414] hover:border-[#141414]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Chat column */}
        <section className="rounded-[20px] bg-[#FFFFFF] border-2 border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden flex flex-col min-h-[70vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[62vh]">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#141414] text-white"
                      : "bg-[#F6F4EE] border border-[#D5D2C8] text-[#141414]"
                  }`}
                >
                  {m.pending ? (
                    <span className="flex items-center gap-2 mono text-[12px] text-[#6B6A64]">
                      <Loader2 size={14} className="animate-spin text-[#E4491B]" /> Banking your story...
                    </span>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap">{m.text}</div>
                      {m.audioUrl && (
                        <audio controls src={m.audioUrl} className="mt-2 w-full h-8" preload="metadata" />
                      )}
                      {m.moments && m.moments.length > 0 && (
                        <div className="mt-2.5 space-y-2">
                          {m.moments.map((mo, i) => (
                            <div key={i} className="rounded-[12px] bg-white border border-[#D5D2C8] p-2.5">
                              <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase tracking-wider text-[#E4491B]">
                                <Sparkles size={11} /> {mo.title}
                              </div>
                              <div className="text-[12.5px] mt-1 text-[#333]">{mo.summary}</div>
                              <div className="mono text-[11.5px] mt-1.5 px-2 py-1 rounded-lg bg-[#141414] text-white">
                                “{mo.hook}”
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>

          {/* Check-in controls */}
          <div className="border-t-2 border-[#141414] bg-[#ECEAE3] p-3">
            {busy && (
              <div className="mono text-[11px] text-[#6B6A64] pb-2 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-[#E4491B]" /> {busy}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={!!busy}
                title={recording ? "Stop and bank it" : "Talk your check-in"}
                className={`h-11 w-11 rounded-full grid place-items-center border-2 border-[#141414] transition active:scale-95 disabled:opacity-40 shrink-0 ${
                  recording ? "bg-[#E4491B] text-white" : "bg-white text-[#E4491B] hover:bg-[#F6D9CC]"
                }`}
              >
                {recording ? <Square size={16} /> : <Mic size={18} />}
              </button>
              {recording && (
                <span className="mono text-[12px] font-bold text-[#E4491B] tabular-nums flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E4491B] animate-pulse" /> {fmtSec(recSec)}
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!busy || recording}
                title="Upload an audio check-in"
                className="h-11 w-11 rounded-full grid place-items-center border-2 border-[#141414]/30 bg-white text-[#141414] hover:border-[#141414] transition active:scale-95 disabled:opacity-40 shrink-0"
              >
                <Upload size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadCheckin(f, f.name);
                }}
              />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendTypedCheckin();
                  }
                }}
                placeholder="Or type today's moment..."
                disabled={!!busy || recording}
                className="flex-1 h-11 px-4 rounded-full border-2 border-[#141414]/30 bg-white outline-none text-[13.5px] placeholder:text-[#6B6A64]/60 focus:border-[#E4491B] disabled:opacity-40"
              />
              <button
                type="button"
                onClick={sendTypedCheckin}
                disabled={!input.trim() || !!busy || recording}
                className="h-11 w-11 rounded-full grid place-items-center bg-[#141414] text-white transition active:scale-95 disabled:opacity-40 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="mono text-[10px] text-[#6B6A64] pt-1.5">
              Mic = voice check-in (auto-transcribed) · {GOAL_LABEL[goal]} lens applied
            </div>
          </div>
        </section>

        {/* Memory column */}
        <aside className="space-y-4">
          <div className="rounded-[20px] bg-[#FFFFFF] border-2 border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D5D2C8] flex items-center gap-2 bg-[#F6F4EE]">
              <BookOpen size={14} className="text-[#E4491B]" />
              <span className="mono text-[11px] font-bold uppercase tracking-widest">personal.md</span>
              <span className="mono text-[10px] text-[#6B6A64] ml-auto">{rawCount} check-ins banked</span>
            </div>
            <textarea
              value={personalMd}
              onChange={(e) => {
                setPersonalMd(e.target.value);
                setMdSaved(false);
              }}
              rows={18}
              spellCheck={false}
              className="w-full p-3.5 mono text-[11.5px] leading-relaxed bg-transparent outline-none resize-y min-h-[280px] whitespace-pre-wrap"
            />
            <div className="px-3.5 pb-3.5">
              <button
                type="button"
                onClick={savePersonalMd}
                className="w-full py-2.5 rounded-full bg-[#141414] text-white mono text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-[#E4491B] transition active:scale-[0.98]"
              >
                {mdSaved ? <Check size={14} /> : <Save size={14} />}
                {mdSaved ? "Saved" : "Save memory"}
              </button>
            </div>
          </div>
          <div className="rounded-[20px] border-2 border-dashed border-[#141414]/30 p-3.5 mono text-[11px] text-[#6B6A64] leading-relaxed">
            Phase 2 plugs in here: Hook Board (pick 1 of 3 hooks per moment) → Script Lab (full script in your voice) → handoff to Auto-edit.
          </div>
        </aside>
      </main>
    </div>
  );
}
