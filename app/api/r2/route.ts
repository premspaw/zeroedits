import { NextResponse } from "next/server";
import { testR2Connection, getPresignedUploadUrl, isR2Configured } from "@/lib/r2-storage";

export async function GET() {
  if (!isR2Configured()) {
    return NextResponse.json({
      configured: false,
      message: "Cloudflare R2 is not configured in environment variables.",
    });
  }

  const { getR2Endpoint } = await import("@/lib/r2-storage");
  const result = await testR2Connection();
  return NextResponse.json({
    configured: true,
    endpoint: getR2Endpoint(),
    ...result,
  });
}

/**
 * Generate a pre-signed direct upload URL for client-side uploads.
 * Usage: POST { filename: "my-video.mp4", contentType: "video/mp4" }
 */
export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const ext = filename.split(".").pop() || "mp4";
    const timestamp = Date.now();
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${timestamp}-${cleanName}`;

    const presigned = await getPresignedUploadUrl(key, contentType || "video/mp4", 3600);

    return NextResponse.json({
      success: true,
      uploadUrl: presigned.uploadUrl,
      key: presigned.key,
      publicUrl: presigned.publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

