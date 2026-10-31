import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { ensureBankDir, STORY_GOALS, resetAllBankData } from "@/lib/story-bank";

export const dynamic = "force-dynamic";

const BANK_DIR = path.join(process.cwd(), "data", "storybank");

function readMd(name: string): string {
  try {
    return fs.readFileSync(path.join(BANK_DIR, name), "utf-8");
  } catch {
    return "";
  }
}

function readGoal(): string {
  const personal = readMd("personal.md");
  const m = personal.match(/^-\s*Goal:\s*(.+)\s*$/m);
  const goal = (m?.[1] || "personal-brand").trim();
  return (STORY_GOALS as readonly string[]).includes(goal) ? goal : "personal-brand";
}

/** Read the memory files. */
export async function GET() {
  ensureBankDir();
  return NextResponse.json({
    success: true,
    data: {
      personalMd: readMd("personal.md"),
      rawBank: readMd("raw-bank.md"),
      goal: readGoal(),
    },
  });
}

/** Save the memory files (personal.md is user-editable; goal line syncs). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    ensureBankDir();
    if (typeof body.personalMd === "string" && body.personalMd.length < 200000) {
      fs.writeFileSync(path.join(BANK_DIR, "personal.md"), body.personalMd, "utf-8");
    }
    if (typeof body.goal === "string" && (STORY_GOALS as readonly string[]).includes(body.goal)) {
      const current = readMd("personal.md");
      const updated = current.match(/^-\s*Goal:/m)
        ? current.replace(/^-\s*Goal:.*$/m, `- Goal: ${body.goal}`)
        : current.replace("## Profile", `## Profile\n- Goal: ${body.goal}`);
      fs.writeFileSync(path.join(BANK_DIR, "personal.md"), updated, "utf-8");
    }
    return NextResponse.json({ success: true, data: { saved: true } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "Could not save memory." }, { status: 500 });
  }
}

/** Erase all memories and reset the story bank. */
export async function DELETE() {
  try {
    resetAllBankData();
    return NextResponse.json({
      success: true,
      message: "All memory files erased cleanly. Ready for live testing.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Could not reset memory." },
      { status: 500 }
    );
  }
}
