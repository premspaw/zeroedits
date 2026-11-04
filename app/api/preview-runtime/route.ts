import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const runtimeFiles: Record<string, string> = {
  react: "node_modules/react/umd/react.production.min.js",
  "react-dom": "node_modules/react-dom/umd/react-dom.production.min.js",
  "framer-motion": "node_modules/framer-motion/dist/framer-motion.js",
  "lucide-react": "node_modules/lucide-react/dist/umd/lucide-react.min.js",
  babel: "public/vendor/babel.min.js",
};

const runtimeCdn: Record<string, string> = {
  react: "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "react-dom": "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
  "framer-motion": "https://unpkg.com/framer-motion@11.11.17/dist/framer-motion.js",
  "lucide-react": "https://unpkg.com/lucide-react@0.468.0/dist/umd/lucide-react.min.js",
  babel: "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.0/babel.min.js",
};

const memoryCache = new Map<string, string>();

export async function GET(request: NextRequest) {
  const moduleName = request.nextUrl.searchParams.get("module") || "";
  const relativeFile = Object.hasOwn(runtimeFiles, moduleName) ? runtimeFiles[moduleName] : null;
  if (!relativeFile) return new NextResponse("Unknown preview dependency", { status: 404 });

  if (memoryCache.has(moduleName)) {
    return new NextResponse(memoryCache.get(moduleName)!, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  // 1. Try reading from local filesystem (works in local dev & Docker)
  try {
    const fullPath = path.join(process.cwd(), relativeFile);
    const source = await readFile(fullPath, "utf8");
    memoryCache.set(moduleName, source);
    return new NextResponse(source, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // 2. On serverless platforms (Vercel) where node_modules files are not packaged, fallback to CDN
    const cdnUrl = runtimeCdn[moduleName];
    if (cdnUrl) {
      try {
        const cdnRes = await fetch(cdnUrl, { next: { revalidate: 86400 } });
        if (cdnRes.ok) {
          const source = await cdnRes.text();
          memoryCache.set(moduleName, source);
          return new NextResponse(source, {
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
              "Cache-Control": "public, max-age=86400, immutable",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
      } catch (cdnErr) {
        console.warn(`[preview-runtime] Failed CDN fetch for ${moduleName}:`, cdnErr);
      }
    }

    return new NextResponse("Preview dependency is unavailable", { status: 503 });
  }
}
