import { NextRequest, NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

export interface ScriptBeatSync {
  id: number;
  phase: string;
  spokenLine: string;
  deliveryCue: string;
  visualCutaway: string;
  durationSec: number;
}

export interface LiveScriptSession {
  sessionId: string;
  userName: string;
  title: string;
  beats: ScriptBeatSync[];
  activeBeatIndex: number;
  isPlaying: boolean;
  status: "waiting_for_mobile" | "mobile_connected" | "recording" | "completed";
  videoBuffer?: Buffer;
  videoMimeType?: string;
  videoFileName?: string;
  updatedAt: number;
}

// Global in-memory store for Web App zero-disk-clutter live session handoff
const globalStore = globalThis as unknown as {
  __premScriptSessions?: Map<string, LiveScriptSession>;
};
if (!globalStore.__premScriptSessions) {
  globalStore.__premScriptSessions = new Map<string, LiveScriptSession>();
}
const sessions = globalStore.__premScriptSessions;

function getLocalLanIp(): string | null {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") || "";
  const media = url.searchParams.get("media") === "1";

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "Missing sessionId" },
      { status: 400 }
    );
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 }
    );
  }

  // Stream the recorded video buffer directly to the Laptop browser memory
  if (media && session.videoBuffer) {
    return new NextResponse(new Uint8Array(session.videoBuffer), {
      headers: {
        "Content-Type": session.videoMimeType || "video/webm",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({
    success: true,
    lanIp: getLocalLanIp(),
    session: {
      sessionId: session.sessionId,
      userName: session.userName,
      title: session.title,
      beats: session.beats,
      activeBeatIndex: session.activeBeatIndex,
      isPlaying: session.isPlaying,
      status: session.status,
      hasVideo: Boolean(session.videoBuffer),
      videoFileName: session.videoFileName || "prem-mobile-take.webm",
      updatedAt: session.updatedAt,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Mobile uploads recorded video take to hand off to Laptop Studio
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const sessionId = String(form.get("sessionId") || "");
      const video = form.get("video");

      if (!sessionId || !video || typeof video === "string") {
        return NextResponse.json(
          { success: false, error: "Missing sessionId or video file" },
          { status: 400 }
        );
      }

      const fileObj = video as unknown as File;
      const bytes = Buffer.from(await fileObj.arrayBuffer());
      const existing = sessions.get(sessionId);

      const updated: LiveScriptSession = existing
        ? {
            ...existing,
            status: "completed",
            isPlaying: false,
            videoBuffer: bytes,
            videoMimeType: fileObj.type || "video/webm",
            videoFileName: fileObj.name || `prem-take-${Date.now()}.webm`,
            updatedAt: Date.now(),
          }
        : {
            sessionId,
            userName: "Prem",
            title: "Prem's Humanized Story",
            beats: [],
            activeBeatIndex: 0,
            isPlaying: false,
            status: "completed",
            videoBuffer: bytes,
            videoMimeType: fileObj.type || "video/webm",
            videoFileName: fileObj.name || `prem-take-${Date.now()}.webm`,
            updatedAt: Date.now(),
          };

      sessions.set(sessionId, updated);
      return NextResponse.json({
        success: true,
        status: "completed",
      });
    }

    // JSON state creation / teleprompter beat transition update
    const body = await req.json();
    const sessionId = String(body.sessionId || "").trim();
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const existing = sessions.get(sessionId);
    const nextSession: LiveScriptSession = {
      sessionId,
      userName: body.userName ?? existing?.userName ?? "Prem",
      title: body.title ?? existing?.title ?? "Prem's Humanized Reel",
      beats: Array.isArray(body.beats) ? body.beats : existing?.beats || [],
      activeBeatIndex:
        typeof body.activeBeatIndex === "number"
          ? body.activeBeatIndex
          : existing?.activeBeatIndex ?? 0,
      isPlaying:
        typeof body.isPlaying === "boolean"
          ? body.isPlaying
          : existing?.isPlaying ?? false,
      status: body.status ?? existing?.status ?? "waiting_for_mobile",
      videoBuffer: existing?.videoBuffer,
      videoMimeType: existing?.videoMimeType,
      videoFileName: existing?.videoFileName,
      updatedAt: Date.now(),
    };

    sessions.set(sessionId, nextSession);

    return NextResponse.json({
      success: true,
      lanIp: getLocalLanIp(),
      session: {
        sessionId: nextSession.sessionId,
        status: nextSession.status,
        activeBeatIndex: nextSession.activeBeatIndex,
        isPlaying: nextSession.isPlaying,
        hasVideo: Boolean(nextSession.videoBuffer),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Session sync error" },
      { status: 500 }
    );
  }
}

