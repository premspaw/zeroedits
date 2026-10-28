import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const runtimeFiles: Record<string, string> = {
  react: "react/umd/react.production.min.js",
  "react-dom": "react-dom/umd/react-dom.production.min.js",
  "framer-motion": "framer-motion/dist/framer-motion.js",
  "lucide-react": "lucide-react/dist/umd/lucide-react.min.js",
};

export async function GET(request: NextRequest) {
  const moduleName = request.nextUrl.searchParams.get("module") || "";
  const runtimeFile = Object.hasOwn(runtimeFiles, moduleName) ? runtimeFiles[moduleName] : null;
  if (!runtimeFile) return new NextResponse("Unknown preview dependency", { status: 404 });

  try {
    const source = await readFile(path.join(process.cwd(), "node_modules", runtimeFile), "utf8");
    return new NextResponse(source, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Preview dependency is unavailable", { status: 503 });
  }
}
