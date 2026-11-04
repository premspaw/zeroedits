import { NextRequest, NextResponse } from "next/server";
import { readCreatorContextSnapshot, writeCreatorContextSnapshot } from "@/lib/creator-context-server";
import { sanitizeCreatorContextSnapshot } from "@/lib/creator-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024 * 1024;

export async function GET() {
  const snapshot = await readCreatorContextSnapshot();
  return NextResponse.json({ success: true, snapshot });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: "Context snapshot is too large." }, { status: 413 });
    }

    const body = JSON.parse(rawBody);
    const snapshot = sanitizeCreatorContextSnapshot(body?.snapshot);
    if (!snapshot) {
      return NextResponse.json({ success: false, error: "A valid creator context snapshot is required." }, { status: 400 });
    }

    await writeCreatorContextSnapshot(snapshot);
    return NextResponse.json({ success: true, updatedAt: snapshot.updatedAt });
  } catch (error) {
    console.error("[context-memory] Could not save creator context:", error);
    return NextResponse.json({ success: false, error: "Could not save creator context." }, { status: 500 });
  }
}
