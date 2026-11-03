import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";
import { BANK_DIR, ensureBankDir } from "@/lib/story-bank";
import {
  analyzeUserStoryWithZee,
  buildScriptBeatsForStory,
  inferSubSegment,
  type LifeCategory,
  type MemoryBankItem,
  type WhatsAppChatTurn,
  type WhatsAppScriptBeat,
} from "@/lib/zee-brain";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const WHATSAPP_STORE_FILE = path.join(BANK_DIR, "whatsapp-sessions.json");

const META_API_KEY =
  process.env.MODEL_API_KEY ||
  process.env.MUSE_API_KEY ||
  process.env.META_API_KEY ||
  "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "muse_whatsapp_verify_2026";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

export interface WhatsAppUserSession {
  userPhone: string;
  userName?: string;
  activeThread: WhatsAppChatTurn[];
  segregatedStories: MemoryBankItem[];
  lastUpdated: string;
  status: "collecting" | "ready_to_segregate" | "segregated";
  lastBotReply?: string;
}

interface WhatsAppStoreData {
  sessions: Record<string, WhatsAppUserSession>;
  allSegregatedMemories: MemoryBankItem[];
}

function loadWhatsAppStore(): WhatsAppStoreData {
  try {
    ensureBankDir();
    if (fs.existsSync(WHATSAPP_STORE_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        sessions: parsed.sessions || {},
        allSegregatedMemories: Array.isArray(parsed.allSegregatedMemories)
          ? parsed.allSegregatedMemories
          : [],
      };
    }
  } catch (err) {
    console.warn("Could not read whatsapp-sessions.json:", err);
  }
  return { sessions: {}, allSegregatedMemories: [] };
}

function saveWhatsAppStore(data: WhatsAppStoreData): void {
  try {
    ensureBankDir();
    fs.writeFileSync(WHATSAPP_STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write whatsapp-sessions.json:", err);
  }
}

async function sendWhatsAppCloudReply(toPhone: string, textBody: string) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return false;
  }
  try {
    const cleanPhone = toPhone.replace(/[^0-9]/g, "");
    await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: textBody },
        }),
      }
    );
    return true;
  } catch (err) {
    console.warn("WhatsApp Cloud API reply failed:", err);
    return false;
  }
}

const WHATSAPP_DECODER_PROMPT = `# SYSTEM — ZEE WHATSAPP VOICE & CHATBOT STORY INTERVIEWER + SEGMENTER (META MUSE ENGINE)

You are Zee, an empathetic, sharp WhatsApp AI Story Director & Digital Brain on Meta AI.
A user sends you voice notes (up to 2 minutes / 120s) or text messages on WhatsApp.
Your job works in TWO stages:
1. BACK-AND-FORTH INTERVIEW: If the conversation only has 1 short message or lacks the emotional turning point / punchline, ask 1 warm, specific follow-up question on WhatsApp so the user shares the rest of the story.
2. DECODE, SEGREGATE & SCRIPT: When the user has shared enough of their story (or explicitly asks to finalize/segregate, or has 2+ rich turns), decode the entire back-and-forth thread, classify it into the exact LifeCategory ("work" for Business/Startup, "family" for Family, "relationships" for Breakup/Love/Bonds, "travel" for Travel, "personal" for Personal Life, "insight" for Core Philosophy), assign a specific subSegment (e.g. "Breakup & Healing", "Business & Client Pitch", "Family & Roots", "Founder Build", "2AM Bonds & Love"), and convert the story into a 4-beat vertical Reel Script (HOOK, TRANSFORM, MAGIC, PAYOFF).

Return ONLY valid JSON (no markdown fences):
{
  "needsFollowUp": boolean,
  "whatsappBotReply": "The message Zee sends back to the user on WhatsApp (either a curious follow-up question OR a warm confirmation that their story was decoded & segregated into their [Segment] Memory Bank!)",
  "category": "work" | "family" | "relationships" | "personal" | "travel" | "insight",
  "subSegment": "Breakup & Healing" | "Business & Client Pitch" | "Founder & Startup Build" | "Family & Roots" | "2AM Bonds & Love" | "Travel & Horizons" | "Personal Life & Habits",
  "title": "A vivid, scroll-stopping 4-8 word story title",
  "story": "Unified first-person narrative woven from the user's WhatsApp voice notes & back-and-forth answers",
  "emotionTone": "2-3 word emotional pulse (e.g. 'Raw & Vulnerable', 'High-Voltage Craft', 'Soulful & Grounded')",
  "zeeAnalysis": "1-2 sentences explaining why Zee placed this story into this segment and how it connects to their You Page",
  "reelHookIdea": "1-sentence viral opening hook",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "scriptBeats": [
    {
      "id": 1,
      "label": "HOOK",
      "range": "0–3s",
      "text": "Spoken hook line",
      "visual": "Paper-cut / B-roll visual direction",
      "motion": "Camera & motion cue",
      "voice": "Voice delivery tone",
      "coaching": "1-line performance note",
      "durationSec": 3
    },
    {
      "id": 2,
      "label": "TRANSFORM",
      "range": "3–7s",
      "text": "Spoken turning point",
      "visual": "Visual direction",
      "motion": "Motion cue",
      "voice": "Voice delivery tone",
      "coaching": "1-line performance note",
      "durationSec": 4
    },
    {
      "id": 3,
      "label": "MAGIC",
      "range": "7–11s",
      "text": "Core realization or breakthrough",
      "visual": "Visual direction",
      "motion": "Motion cue",
      "voice": "Voice delivery tone",
      "coaching": "1-line performance note",
      "durationSec": 4
    },
    {
      "id": 4,
      "label": "PAYOFF",
      "range": "11–15s",
      "text": "Closing truth or CTA",
      "visual": "Visual direction",
      "motion": "Motion cue",
      "voice": "Voice delivery tone",
      "coaching": "1-line performance note",
      "durationSec": 4
    }
  ]
}`;

async function analyzeWhatsAppConversationWithMetaAI(
  userPhone: string,
  thread: WhatsAppChatTurn[],
  forceSegregate = false
): Promise<{
  needsFollowUp: boolean;
  whatsappBotReply: string;
  category: LifeCategory;
  subSegment: string;
  title: string;
  story: string;
  emotionTone: string;
  zeeAnalysis: string;
  reelHookIdea: string;
  tags: string[];
  scriptBeats: WhatsAppScriptBeat[];
}> {
  const userTurns = thread.filter((t) => t.role === "user");
  const combinedUserText = userTurns.map((t) => t.text).join(" ");
  const wordCount = combinedUserText.split(/\s+/).filter(Boolean).length;

  const shouldAskFollowUp =
    !forceSegregate && userTurns.length === 1 && wordCount < 28;

  try {
    const transcriptLog = thread
      .map(
        (t) =>
          `[${t.role === "user" ? `User (${userPhone})` : "Zee Bot"} - ${t.type.toUpperCase()}]: ${t.text}`
      )
      .join("\n");

    const response = await withModelRetry(
      () =>
        fetch("https://api.avalai.ir/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${META_API_KEY}`,
          },
          body: JSON.stringify({
            model: "muse-wonder-1.0",
            instructions: WHATSAPP_DECODER_PROMPT,
            input: [
              {
                role: "user",
                content: `WhatsApp Phone: ${userPhone}\nForce Segregate Now: ${
                  forceSegregate ? "YES (Finalize & Segregate immediately)" : "AUTO"
                }\nUser Turns Count: ${userTurns.length}\n\nConversation Thread:\n${transcriptLog}`,
              },
            ],
          }),
        }),
      { attempts: 2 }
    );

    if (response.ok) {
      const rawText = await readModelResponse(response);
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.story) {
        const finalNeedsFollowUp = forceSegregate
          ? false
          : Boolean(parsed.needsFollowUp && userTurns.length < 2);
        const cat: LifeCategory = parsed.category || "insight";
        const subSeg = inferSubSegment(
          parsed.story,
          cat,
          parsed.subSegment
        );
        return {
          needsFollowUp: finalNeedsFollowUp,
          whatsappBotReply:
            parsed.whatsappBotReply ||
            (finalNeedsFollowUp
              ? "Wait, I can feel the tension in this! What happened right after that moment? Send me a quick 30-sec voice note or reply."
              : `✅ Locked in! I decoded your story "${parsed.title}" and segregated it into [${subSeg}] in your You Page Memory Bank with a 4-beat Reel Script.`),
          category: cat,
          subSegment: subSeg,
          title: parsed.title || "Midnight WhatsApp Voice Story",
          story: parsed.story,
          emotionTone: parsed.emotionTone || "Raw & Unfiltered",
          zeeAnalysis:
            parsed.zeeAnalysis ||
            `Decoded from WhatsApp (${userPhone}) and segregated into [${subSeg}].`,
          reelHookIdea:
            parsed.reelHookIdea || parsed.story.split(/[.!?]/)[0] || parsed.title,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [subSeg, "WhatsApp"],
          scriptBeats:
            Array.isArray(parsed.scriptBeats) && parsed.scriptBeats.length > 0
              ? parsed.scriptBeats
              : buildScriptBeatsForStory(
                  parsed.title || "WhatsApp Story",
                  parsed.story,
                  cat,
                  parsed.reelHookIdea
                ),
        };
      }
    }
  } catch (err) {
    console.warn("WhatsApp Meta AI fallback:", err);
  }

  // Deterministic, rich local fallback so the demo & webhook ALWAYS work instantaneously
  const fallbackResult = analyzeUserStoryWithZee(
    combinedUserText,
    undefined,
    "whatsapp_voice",
    { userPhone }
  );
  const mem = fallbackResult.memory;
  const subSeg = mem.subSegment || inferSubSegment(mem.story, mem.category);

  const followUpByCat: Record<LifeCategory, string> = {
    work: "That's a real founder moment! What was the exact turning point when you realized the old workflow was broken? Reply or drop a quick voice note!",
    relationships:
      "I felt that 2AM honesty. What was the one sentence that stayed with you after that conversation ended?",
    family:
      "Family moments like that hit deep. What did your parents or family say right after that?",
    travel:
      "Stepping away changes your whole lens. What did you notice there that you were blind to at your desk?",
    personal:
      "I love this daily rhythm. How did your energy feel before vs after making that shift?",
    insight:
      "That's a sharp realization! Give me one concrete real-life example of when this hit you today.",
  };

  return {
    needsFollowUp: shouldAskFollowUp,
    whatsappBotReply: shouldAskFollowUp
      ? followUpByCat[mem.category]
      : `✅ Decoded & Segregated! Placed "${mem.title}" into [${subSeg}] (${mem.category.toUpperCase()}) in your You Page Memory Bank with your 4-beat script ready.`,
    category: mem.category,
    subSegment: subSeg,
    title: mem.title,
    story: mem.story,
    emotionTone: mem.emotionTone,
    zeeAnalysis: mem.zeeAnalysis,
    reelHookIdea: mem.reelHookIdea,
    tags: mem.tags,
    scriptBeats:
      mem.scriptBeats ||
      buildScriptBeatsForStory(mem.title, mem.story, mem.category, mem.reelHookIdea),
  };
}

/**
 * GET /api/whatsapp/webhook
 * 1) Handles Meta WhatsApp Cloud API Webhook Verification (`hub.mode=subscribe` & `hub.challenge`)
 * 2) When called from the browser UI (`?mode=sync`), returns all WhatsApp sessions & segregated stories
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hubMode = searchParams.get("hub.mode");
  const hubVerifyToken = searchParams.get("hub.verify_token");
  const hubChallenge = searchParams.get("hub.challenge");

  // 1. Official Meta Developer Dashboard Webhook Verification
  if (hubMode === "subscribe" && hubChallenge) {
    if (hubVerifyToken === WHATSAPP_VERIFY_TOKEN) {
      return new NextResponse(hubChallenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return NextResponse.json(
      { error: "Invalid WhatsApp verify token" },
      { status: 403 }
    );
  }

  // 2. Browser UI Live Sync (`GET /api/whatsapp/webhook?mode=sync`)
  const store = loadWhatsAppStore();
  return NextResponse.json({
    success: true,
    verifyTokenConfigured: WHATSAPP_VERIFY_TOKEN,
    cloudApiConnected: Boolean(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID),
    sessions: store.sessions,
    allSegregatedMemories: store.allSegregatedMemories,
  });
}

/**
 * POST /api/whatsapp/webhook
 * Handles:
 * A) Official Meta WhatsApp Cloud API webhook payloads (`object === "whatsapp_business_account"`)
 * B) Interactive WhatsApp Studio Simulator & Direct Bridge from the You Page (`mode === "simulate" | "finalize" | "reset"`)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = loadWhatsAppStore();

    // =========================================================================
    // CASE A: DIRECT STUDIO SIMULATOR / BRIDGE FROM THE "YOU" PAGE
    // =========================================================================
    if (body.mode === "simulate" || body.mode === "finalize" || body.mode === "reset") {
      const userPhone = (body.userPhone || "+91 98450 24110").trim();
      const existingSession: WhatsAppUserSession = store.sessions[userPhone] || {
        userPhone,
        userName: body.userName || "Prem",
        activeThread: [],
        segregatedStories: [],
        lastUpdated: new Date().toISOString(),
        status: "collecting",
      };

      if (body.mode === "reset") {
        existingSession.activeThread = [];
        existingSession.status = "collecting";
        existingSession.lastUpdated = new Date().toISOString();
        store.sessions[userPhone] = existingSession;
        saveWhatsAppStore(store);
        return NextResponse.json({
          success: true,
          session: existingSession,
          allSegregatedMemories: store.allSegregatedMemories,
        });
      }

      const incomingDurationSec = Number(body.durationSec || 0);
      const messageType: "voice" | "text" =
        body.messageType === "voice" ? "voice" : "text";

      // 2-MINUTE (120s) VOICE NOTE GUARD — exact rule requested by user!
      if (messageType === "voice" && incomingDurationSec > 120) {
        const overLimitTurn: WhatsAppChatTurn = {
          id: `wa-user-${Date.now()}`,
          role: "user",
          type: "voice",
          text: `[Voice Note • ${Math.floor(incomingDurationSec / 60)}:${String(
            incomingDurationSec % 60
          ).padStart(2, "0")}] ${body.text || "Long voice note"}`,
          durationSec: incomingDurationSec,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        const botGuardTurn: WhatsAppChatTurn = {
          id: `wa-bot-${Date.now() + 1}`,
          role: "zee_bot",
          type: "text",
          text: `⚠️ Please send only a 2-minute talk (max 120s)! Your voice note was ${incomingDurationSec}s. Give me the punchy 2-min version so we can turn it into a tight Reel script!`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        existingSession.activeThread.push(overLimitTurn, botGuardTurn);
        existingSession.lastBotReply = botGuardTurn.text;
        existingSession.lastUpdated = new Date().toISOString();
        store.sessions[userPhone] = existingSession;
        saveWhatsAppStore(store);

        return NextResponse.json({
          success: true,
          rejectedOver2Min: true,
          botReply: botGuardTurn.text,
          session: existingSession,
          allSegregatedMemories: store.allSegregatedMemories,
        });
      }

      // Add user's new message turn if provided
      if (body.text && String(body.text).trim()) {
        const userTurn: WhatsAppChatTurn = {
          id: `wa-user-${Date.now()}`,
          role: "user",
          type: messageType,
          text: String(body.text).trim(),
          durationSec:
            messageType === "voice" ? incomingDurationSec || 94 : undefined,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        existingSession.activeThread.push(userTurn);
      }

      const forceSegregate =
        body.mode === "finalize" || Boolean(body.forceSegregate);

      const decoded = await analyzeWhatsAppConversationWithMetaAI(
        userPhone,
        existingSession.activeThread,
        forceSegregate
      );

      const botTurn: WhatsAppChatTurn = {
        id: `wa-bot-${Date.now() + 2}`,
        role: "zee_bot",
        type: "text",
        text: decoded.whatsappBotReply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      existingSession.activeThread.push(botTurn);
      existingSession.lastBotReply = decoded.whatsappBotReply;
      existingSession.lastUpdated = new Date().toISOString();

      let newlySegregatedMemory: MemoryBankItem | null = null;

      if (!decoded.needsFollowUp || forceSegregate) {
        const totalVoiceSec = existingSession.activeThread
          .filter((t) => t.role === "user")
          .reduce((acc, t) => acc + (t.durationSec || 45), 0);
        const clampedSec = Math.min(120, Math.max(32, totalVoiceSec));
        const durationLabel = `${Math.floor(clampedSec / 60)}:${String(
          clampedSec % 60
        ).padStart(2, "0")}`;

        const built = analyzeUserStoryWithZee(
          decoded.story,
          decoded.category,
          messageType === "voice" ? "whatsapp_voice" : "whatsapp_chat",
          {
            category: decoded.category,
            subSegment: decoded.subSegment,
            userPhone,
            scriptBeats: decoded.scriptBeats,
            whatsappThread: [...existingSession.activeThread],
            title: decoded.title,
            story: decoded.story,
            zeeAnalysis: decoded.zeeAnalysis,
            emotionTone: decoded.emotionTone,
            tags: Array.from(
              new Set([
                decoded.subSegment,
                `From ${userPhone}`,
                ...(decoded.tags || []),
              ])
            ).slice(0, 5),
            reelHookIdea: decoded.reelHookIdea,
            durationLabel,
          }
        );

        newlySegregatedMemory = built.memory;
        existingSession.segregatedStories = [
          newlySegregatedMemory,
          ...existingSession.segregatedStories,
        ];
        store.allSegregatedMemories = [
          newlySegregatedMemory,
          ...store.allSegregatedMemories,
        ].slice(0, 50);
        existingSession.status = "segregated";
        // Reset active thread for the next story while preserving history in segregatedStories
        existingSession.activeThread = [];
      } else {
        existingSession.status = "collecting";
      }

      store.sessions[userPhone] = existingSession;
      saveWhatsAppStore(store);

      return NextResponse.json({
        success: true,
        needsFollowUp: decoded.needsFollowUp && !forceSegregate,
        botReply: decoded.whatsappBotReply,
        segregatedMemory: newlySegregatedMemory,
        decodedPreview: decoded,
        session: existingSession,
        allSegregatedMemories: store.allSegregatedMemories,
      });
    }

    // =========================================================================
    // CASE B: OFFICIAL META WHATSAPP CLOUD API WEBHOOK PAYLOAD
    // =========================================================================
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      // Status delivery update or ping from Meta
      return NextResponse.json({ status: "acknowledged" }, { status: 200 });
    }

    const fromRaw = String(message.from || "919845024110");
    const userPhone = fromRaw.startsWith("+") ? fromRaw : `+${fromRaw}`;
    const profileName =
      value?.contacts?.[0]?.profile?.name || "WhatsApp Creator";

    const existingSession: WhatsAppUserSession = store.sessions[userPhone] || {
      userPhone,
      userName: profileName,
      activeThread: [],
      segregatedStories: [],
      lastUpdated: new Date().toISOString(),
      status: "collecting",
    };

    // Check 2-minute limit on incoming WhatsApp voice notes
    if (message.type === "audio" && message.audio) {
      const durationSec = Number(message.audio.duration || 88);
      if (durationSec > 120) {
        const replyText =
          "Please send only a 2-minute talk (max 120 seconds) so Zee can craft your tight Reel script!";
        await sendWhatsAppCloudReply(userPhone, replyText);
        return NextResponse.json({
          status: "rejected_over_120s",
          reply: replyText,
        });
      }

      const transcriptText =
        message.audio.transcript ||
        "Shared a voice note via WhatsApp Cloud API.";

      existingSession.activeThread.push({
        id: message.id || `wa-audio-${Date.now()}`,
        role: "user",
        type: "voice",
        text: transcriptText,
        durationSec,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } else if (message.type === "text" && message.text?.body) {
      existingSession.activeThread.push({
        id: message.id || `wa-txt-${Date.now()}`,
        role: "user",
        type: "text",
        text: String(message.text.body).trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    const decoded = await analyzeWhatsAppConversationWithMetaAI(
      userPhone,
      existingSession.activeThread,
      false
    );

    existingSession.activeThread.push({
      id: `wa-bot-${Date.now()}`,
      role: "zee_bot",
      type: "text",
      text: decoded.whatsappBotReply,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    await sendWhatsAppCloudReply(userPhone, decoded.whatsappBotReply);

    if (!decoded.needsFollowUp) {
      const built = analyzeUserStoryWithZee(
        decoded.story,
        decoded.category,
        message.type === "audio" ? "whatsapp_voice" : "whatsapp_chat",
        {
          category: decoded.category,
          subSegment: decoded.subSegment,
          userPhone,
          scriptBeats: decoded.scriptBeats,
          whatsappThread: [...existingSession.activeThread],
          title: decoded.title,
          story: decoded.story,
          zeeAnalysis: decoded.zeeAnalysis,
          emotionTone: decoded.emotionTone,
          tags: [decoded.subSegment, `From ${userPhone}`, ...(decoded.tags || [])],
          reelHookIdea: decoded.reelHookIdea,
          durationLabel: "1:52",
        }
      );

      existingSession.segregatedStories = [
        built.memory,
        ...existingSession.segregatedStories,
      ];
      store.allSegregatedMemories = [
        built.memory,
        ...store.allSegregatedMemories,
      ].slice(0, 50);
      existingSession.status = "segregated";
      existingSession.activeThread = [];
    }

    store.sessions[userPhone] = existingSession;
    saveWhatsAppStore(store);

    return NextResponse.json({ status: "processed", userPhone });
  } catch (err: any) {
    console.error("WhatsApp Webhook Error:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

