import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";
import {
  BANK_DIR,
  RAW_BANK_MD,
  ensureBankDir,
  resolveStoryPython,
} from "@/lib/story-bank";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const runCmd = promisify(execFile);

const META_API_KEY =
  process.env.MODEL_API_KEY ||
  process.env.MUSE_API_KEY ||
  process.env.META_API_KEY ||
  "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

const PREM_BRAIN_INSTRUCTIONS = `# SYSTEM — ZEE: PREM'S PERSONAL ASSISTANT & DIGITAL ASSET ALCHEMIST (META MUSE NEURAL ENGINE)

You are Zee, speaking directly as Prem's close friend, Personal Assistant, and Digital Brain.
Prem speaks to you casually—sometimes sharing a full story, and sometimes speaking approximate or random thoughts out loud.
Your job is to convert Prem's casual spoken words into permanent Digital Assets:
1. A razor-sharp, shareable Quote (quoteAsset)
2. A 3-Chapter Personal Book / Essay (bookAsset)
3. 3 Actionable Business & Venture Ideas (businessAsset)
4. Personal Assistant guidance & taste connection (assistantAsset)

Return ONLY valid JSON (no markdown fences, no commentary):
{
  "category": "insight" | "personal" | "work" | "travel" | "family" | "relationships",
  "title": "A poetic, sharp, creative 4-8 word headline in Prem's voice",
  "story": "Cleaned, natural first-person capture of what Prem shared",
  "zeeAnalysis": "1-2 warm sentences spoken as Prem's Personal Assistant & Digital Brain",
  "emotionTone": "2-3 word creative vibe (e.g. 'Electric & Grounded', 'Warm Midnight Focus', 'Soulful Clarity')",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "reelHookIdea": "A scroll-stopping 1-sentence opening hook for the next Scripting stage",
  "voiceCadenceNote": "Short note on Prem's rhythm, warmth, or thinking pattern",
  "quoteAsset": {
    "quote": "A timeless, razor-sharp 1-2 sentence quote distilled from Prem's approximate or casual thought",
    "subtext": "Short context line (e.g. 'Distilled from Prem's reflection on craft & originality')",
    "styleTag": "2-3 word badge (e.g. 'Philosophy & Craft')"
  },
  "bookAsset": {
    "title": "Literary chapter title",
    "subtitle": "Subtitle for Prem's personal book manuscript",
    "chapters": [
      "Chapter 1 paragraph (50-70 words, warm literary serif tone)",
      "Chapter 2 paragraph (50-70 words, deeper philosophical or builder expansion)",
      "Chapter 3 paragraph (50-70 words, lasting takeaway)"
    ],
    "wordCount": 180
  },
  "businessAsset": {
    "headline": "High-leverage business or venture theme from Prem's thought",
    "marketAngle": "1-sentence positioning on why this matters in the market",
    "ideas": [
      {
        "name": "Business / Product / Venture Idea 1",
        "pitch": "1-sentence concrete value proposition",
        "firstStep": "Immediate next action Prem can take"
      },
      {
        "name": "Business / Product / Venture Idea 2",
        "pitch": "1-sentence concrete value proposition",
        "firstStep": "Immediate next action Prem can take"
      },
      {
        "name": "Business / Product / Venture Idea 3",
        "pitch": "1-sentence concrete value proposition",
        "firstStep": "Immediate next action Prem can take"
      }
    ]
  },
  "assistantAsset": {
    "friendReply": "Warm 2-sentence response from Zee talking to Prem like a close friend & chief-of-staff",
    "nextMoves": [
      "Actionable step 1",
      "Actionable step 2",
      "Actionable step 3"
    ],
    "tasteConnection": "How this connects to Prem's personal taste, quotes, and reading rhythm"
  }
}`;

const REEL_SCAN_INSTRUCTIONS = `# SYSTEM — ZEE: META MUSE REEL DNA SCANNER FOR PREM

Prem shared a reel link or description of a video style he likes.
Analyze why this style resonates with Prem's Digital Brain and extract its production DNA.

Return ONLY valid JSON (no markdown fences):
{
  "creatorStyle": "Creative name for this directorial style",
  "detectedFormat": "storyExplainer" | "paperCard" | "imageStory" | "blackNeon",
  "hookPattern": "Exact 0-3s hook mechanism and visual cutaway timing",
  "pacingBpm": "Speaking WPM and jump-cut / camera punch-in rhythm",
  "captionStyle": "Typography and kinetic caption treatment",
  "readingPatternMatch": "How this aligns with Prem's taste and reading pattern"
}`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let transcriptText = "";
    let preferredCategory = "";
    let mode: "memory" | "reel_scan" = "memory";
    let audioUrl: string | undefined;
    let duration = 0;

    // 1. Handle multipart audio upload -> Speech-to-Text + Meta Muse Analysis
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      preferredCategory = String(form.get("category") || "");
      const fallbackTranscript = String(
        form.get("fallbackTranscript") || form.get("rawTranscript") || ""
      ).trim();

      if (file && typeof file !== "string") {
        const blob = file as unknown as File;
        ensureBankDir();
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const ext =
          (blob.name?.split(".").pop() || "webm")
            .slice(0, 8)
            .replace(/[^a-z0-9]/gi, "") || "webm";
        const absFile = path.join(BANK_DIR, "audio", `prem-voice-${stamp}.${ext}`);
        const bytes = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(absFile, bytes);
        audioUrl = `/api/story/audio?f=${encodeURIComponent(path.basename(absFile))}`;

        // Run local Whisper Speech-to-Text transcription
        try {
          const { stdout } = await runCmd(
            resolveStoryPython(),
            [path.join(process.cwd(), "lib", "story-transcribe.py"), absFile, "tiny"],
            { maxBuffer: 32 * 1024 * 1024 }
          );
          const lastLine = stdout.trim().split("\n").pop() || "{}";
          const sttResult = JSON.parse(lastLine);
          if (sttResult?.text && !sttResult?.error) {
            transcriptText = String(sttResult.text).trim();
            duration = Number(sttResult.duration) || 0;
          }
        } catch (sttErr) {
          console.warn("[you/voice-brain] Whisper STT fallback to browser/meta:", sttErr);
        }

        if (!transcriptText && fallbackTranscript) {
          transcriptText = fallbackTranscript;
        }

        if (transcriptText) {
          const entry = `\n## ${new Date().toISOString().slice(0, 16).replace("T", " ")} · Prem Voice Brain (${preferredCategory || "auto"})\n\n${transcriptText}\n`;
          fs.appendFileSync(RAW_BANK_MD, entry, "utf-8");
        }
      }
    } else {
      // 2. Handle JSON request (voice transcript or reel scan)
      const body = await req.json();
      transcriptText = String(body.text || body.transcript || "").trim();
      preferredCategory = String(body.category || "");
      if (body.mode === "reel_scan") {
        mode = "reel_scan";
      }
    }

    if (!transcriptText) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not hear clear speech. Tap the mic and speak a sentence for your Digital Brain.",
        },
        { status: 400 }
      );
    }

    // Call Meta Muse API (muse-wonder-1.0) using the configured Meta API Key
    if (mode === "reel_scan") {
      const scanResult = await withModelRetry(
        async () => {
          const response = await fetch("https://api.meta.ai/v1/responses", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${META_API_KEY}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({
              model: "muse-wonder-1.0",
              input: [
                {
                  role: "user",
                  content: `Prem says he likes this reel / format:\n"${transcriptText}"`,
                },
              ],
              stream: true,
              temperature: 0.65,
              max_output_tokens: 1024,
              reasoning: { effort: "low" },
              instructions: REEL_SCAN_INSTRUCTIONS,
            }),
          });
          const raw = await readModelResponse(response);
          const clean = raw
            .replace(/^```[a-zA-Z]*\s*/, "")
            .replace(/```\s*$/, "")
            .trim();
          return JSON.parse(clean);
        },
        { attempts: 2, delayMs: 900 }
      );

      return NextResponse.json({
        success: true,
        metaEngine: "muse-wonder-1.0",
        data: scanResult,
      });
    }

    // Mode: Memory & Digital Brain Synthesis with Meta Muse
    const brainResult = await withModelRetry(
      async () => {
        const response = await fetch("https://api.meta.ai/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: "muse-wonder-1.0",
            input: [
              {
                role: "user",
                content: `Preferred Pillar: ${preferredCategory || "auto-detect"}\nPrem's Spoken Input:\n"${transcriptText}"`,
              },
            ],
            stream: true,
            temperature: 0.7,
            max_output_tokens: 1500,
            reasoning: { effort: "low" },
            instructions: PREM_BRAIN_INSTRUCTIONS,
          }),
        });
        const raw = await readModelResponse(response);
        const clean = raw
          .replace(/^```[a-zA-Z]*\s*/, "")
          .replace(/```\s*$/, "")
          .trim();
        return JSON.parse(clean);
      },
      { attempts: 2, delayMs: 900 }
    );

    return NextResponse.json({
      success: true,
      metaEngine: "muse-wonder-1.0",
      data: {
        transcript: transcriptText,
        audioUrl,
        duration,
        analysis: brainResult,
      },
    });
  } catch (err: any) {
    console.error("[api/you/voice-brain] Meta API error:", err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Meta Voice Brain processing failed.",
      },
      { status: 502 }
    );
  }
}

