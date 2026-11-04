import fs from "fs";
import path from "path";

function findOnPath(command: "ffmpeg" | "ffprobe"): string | null {
  const names = process.platform === "win32" ? [`${command}.exe`, command] : [command];
  const pathEntries = (process.env.PATH || "")
    .split(path.delimiter)
    .map((entry) => entry.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);

  for (const directory of pathEntries) {
    for (const name of names) {
      const candidate = path.join(directory, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

function findBundledRemotionBinary(command: "ffmpeg" | "ffprobe"): string | null {
  if (process.platform !== "win32") return null;

  const executable = path.join(
    process.cwd(),
    "node_modules",
    "@remotion",
    "compositor-win32-x64-msvc",
    `${command}.exe`
  );

  return fs.existsSync(executable) ? executable : null;
}

export function getFfmpegPath(): string {
  return findOnPath("ffmpeg") || findBundledRemotionBinary("ffmpeg") || "ffmpeg";
}

export function getFfprobePath(): string {
  return findOnPath("ffprobe") || findBundledRemotionBinary("ffprobe") || "ffprobe";
}
