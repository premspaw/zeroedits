import { execFileSync } from "child_process";
import path from "path";

const pDir = path.join(process.cwd(), ".render-temp", "parity-verify");
const pPrev = path.join(pDir, "preview_t0.png");
const pExp = path.join(pDir, "export_t0.png");

// Crop zone 4 (1080x370 at y=1550) to two images
execFileSync("ffmpeg", ["-y", "-i", pPrev, "-vf", "crop=1080:370:0:1550", path.join(pDir, "zone4_preview.png")]);
execFileSync("ffmpeg", ["-y", "-i", pExp, "-vf", "crop=1080:370:0:1550", path.join(pDir, "zone4_export.png")]);

console.log("Zone 4 cropped successfully. Inspecting raw pixels...");

const getMeanColor = (imgPath) => {
  const raw = execFileSync("ffmpeg", ["-i", imgPath, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 15 * 1024 * 1024 });
  let r = 0, g = 0, b = 0;
  const pixels = raw.length / 3;
  for (let i = 0; i < raw.length; i += 3) {
    r += raw[i];
    g += raw[i+1];
    b += raw[i+2];
  }
  return {
    r: (r / pixels).toFixed(1),
    g: (g / pixels).toFixed(1),
    b: (b / pixels).toFixed(1),
  };
};

console.log("Zone 4 Preview mean RGB:", getMeanColor(path.join(pDir, "zone4_preview.png")));
console.log("Zone 4 Export mean RGB:", getMeanColor(path.join(pDir, "zone4_export.png")));
