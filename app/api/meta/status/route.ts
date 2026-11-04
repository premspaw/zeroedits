import { NextResponse } from "next/server";
import { getMetaApiKey, getMetaModelId } from "@/lib/meta-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    provider: "Meta Models",
    configured: Boolean(getMetaApiKey()),
    models: {
      wonder: getMetaModelId("wonder", "muse-wonder-1.0"),
      spark: getMetaModelId("spark", "muse-spark-1.3"),
      image: getMetaModelId("image", "muse-image-1.0"),
      sam: getMetaModelId("sam", "sam-3.1"),
    },
  });
}
