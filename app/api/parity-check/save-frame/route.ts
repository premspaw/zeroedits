import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "preview";
    const t = searchParams.get("t") || "0";

    const dir = path.join(process.cwd(), ".render-temp", "parity-verify");
    fs.mkdirSync(dir, { recursive: true });

    const arrayBuffer = await req.arrayBuffer();
    const outPath = path.join(dir, `${type}_t${t}.png`);
    fs.writeFileSync(outPath, Buffer.from(arrayBuffer));

    return NextResponse.json({ success: true, saved: outPath, bytes: arrayBuffer.byteLength });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

