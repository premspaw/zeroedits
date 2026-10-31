import { NextRequest, NextResponse } from "next/server";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";

export const maxDuration = 90;
export const dynamic = "force-dynamic";

const META_API_KEY =
  process.env.MODEL_API_KEY ||
  process.env.MUSE_API_KEY ||
  process.env.META_API_KEY ||
  "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

const HUMANIZED_SCRIPT_SYSTEM_PROMPT = `# SYSTEM — ZEE: PREM'S HUMANIZED REEL SCRIPT ALCHEMIST (ZERO AI SLOP)

You are Zee, Prem's Digital Brain ("Hey Prem, I am your digital brain").
You write deeply human, emotionally resonant, spoken-word short-form scripts (25-35 seconds) grounded in Prem's real memories, workplace stories, travel horizons, family roots, and Instagram reel taste.

CRITICAL ANTI-AI-SLOP RULES:
1. NEVER use generic AI slop words: "delve", "unlock", "game-changer", "in today's fast-paced world", "skyrocket", "secret hack", "viral".
2. Instead of saying "this will go viral", speak warmly: "Hey Prem, telling your story through this lens will capture real human attention."
3. Write 100% for the human voice and ear: short natural sentences, real conversational pauses, honest vulnerability, and lived specifics from Prem's memory bank.
4. Every beat must include a subtle human delivery cue (e.g., "Lean in slightly, warm half-smile", "Pause 0.5s — speak like talking to a friend over coffee") and a matched visual cutaway from Prem's gallery.

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "zeeDirectorNote": "Warm, personal note to Prem explaining how his memory was fused with last week's high-attention Instagram hook pattern",
  "title": "Human, intriguing story title",
  "attentionReason": "Why this specific combination of Prem's real story + hook structure holds deep viewer attention",
  "hooks": [
    {
      "id": "hook-trending",
      "badge": "Last Week's High-Attention IG Hook + Your Story",
      "hookText": "First 3 seconds opening line spoken naturally by Prem",
      "whyItWorks": "How this adapts a proven high-retention Instagram opening to Prem's lived truth"
    },
    {
      "id": "hook-intimate",
      "badge": "Raw & Unscripted Confession",
      "hookText": "Alternative intimate opening line",
      "whyItWorks": "Builds immediate human trust in 2.5 seconds"
    },
    {
      "id": "hook-contrarian",
      "badge": "Perspective Shift",
      "hookText": "Alternative thought-provoking opening line",
      "whyItWorks": "Stops the scroll with an earned observation"
    }
  ],
  "beats": [
    {
      "id": 1,
      "phase": "THE HOOK (0s - 4s)",
      "spokenLine": "Exact natural words Prem speaks on camera",
      "deliveryCue": "Warm, unhurried — look straight into the lens like a close friend",
      "visualCutaway": "Matched B-roll or cutaway suggestion from Prem's gallery",
      "durationSec": 4
    },
    {
      "id": 2,
      "phase": "THE LIVED MOMENT (4s - 12s)",
      "spokenLine": "The real story moment from Prem's memory bank",
      "deliveryCue": "Slight pause before the key detail, conversational rhythm",
      "visualCutaway": "Workplace / Travel / Personal gallery cutaway",
      "durationSec": 8
    },
    {
      "id": 3,
      "phase": "THE HUMAN SHIFT (12s - 21s)",
      "spokenLine": "The emotional realization or shift that happened",
      "deliveryCue": "Drop the pitch slightly — honest and grounded",
      "visualCutaway": "Full-screen speaker face value + subtle kinetic emphasis",
      "durationSec": 9
    },
    {
      "id": 4,
      "phase": "THE TAKEAWAY (21s - 28s)",
      "spokenLine": "One lingering human thought for the viewer to carry with them",
      "deliveryCue": "Warm nod at the end, let the last word breathe",
      "visualCutaway": "Warm Paper Card takeaway + natural sign-off",
      "durationSec": 7
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userName = String(body.userName || "Prem");
    const storyIdea = String(body.storyIdea || "").trim();
    const userInstruction = String(body.userInstruction || "").trim();
    const memoriesSummary = String(body.memoriesSummary || "").trim();
    const instagramTaste = String(body.instagramTaste || "").trim();
    const currentScript = body.currentScript ? JSON.stringify(body.currentScript) : "";

    const promptInput = [
      `Creator Name: ${userName}`,
      `Selected Story / Memory from You Folder:\n${storyIdea}`,
      memoriesSummary ? `Other Personal Memories in ${userName}'s Digital Brain:\n${memoriesSummary}` : "",
      instagramTaste ? `Instagram & Liked Reel DNA:\n${instagramTaste}` : "",
      currentScript && userInstruction
        ? `Current Script JSON:\n${currentScript}\n\n${userName}'s Spoken/Typed Revision Request ("Shall we change this?"):\n"${userInstruction}"\nRewrite and refine the script and hooks to honor ${userName}'s exact feedback while keeping it 100% human and emotional.`
        : `Create a deeply humanized, emotional, non-AI-slop reel script for ${userName} that fuses his real memory with last week's high-attention Instagram storytelling rhythm.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const parsed = await withModelRetry(
      async () => {
        const res = await fetch("https://api.meta.ai/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: "muse-wonder-1.0",
            input: [{ role: "user", content: promptInput }],
            stream: true,
            temperature: 0.72,
            max_output_tokens: 2400,
            reasoning: { effort: "low" },
            instructions: HUMANIZED_SCRIPT_SYSTEM_PROMPT,
          }),
        });
        const text = await readModelResponse(res);
        const clean = text
          .replace(/^```[a-zA-Z]*\s*/, "")
          .replace(/```\s*$/, "")
          .trim();
        const out = JSON.parse(clean);
        if (!Array.isArray(out?.beats) || out.beats.length === 0) {
          throw new Error("Invalid script beats structure");
        }
        return out;
      },
      { attempts: 2, delayMs: 900 }
    );

    return NextResponse.json({
      success: true,
      metaEngine: "muse-wonder-1.0",
      data: parsed,
    });
  } catch (err: any) {
    console.error("[api/script-brain] Error:", err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Could not synthesize humanized script.",
      },
      { status: 500 }
    );
  }
}

