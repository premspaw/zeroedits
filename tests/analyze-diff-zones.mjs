import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const pDir = path.join(process.cwd(), ".render-temp", "parity-verify");

// Let's divide the 1080x1920 image into 4 vertical zones:
// Zone 1: Top header & progress bar (y=0 to 200)
// Zone 2: Speaker face / upper chest (y=200 to 900)
// Zone 3: Lower-face floating callouts (y=900 to 1550)
// Zone 4: Bottom captions & control area (y=1550 to 1920)

for (const t of [0]) {
  const pPrev = path.join(pDir, `preview_t${t}.png`);
  const pExp = path.join(pDir, `export_t${t}.png`);

  const zones = [
    { name: "Top Header/Bar (y=0..200)", y: 0, h: 200 },
    { name: "Speaker Face (y=200..900)", y: 200, h: 700 },
    { name: "Floating Callout (y=900..1550)", y: 900, h: 650 },
    { name: "Bottom Captions (y=1550..1920)", y: 1550, h: 370 },
  ];

  console.log(`\nZone-by-Zone SSIM Analysis at t=${t}s:`);
  for (const z of zones) {
    try {
      const ssimProc = execFileSync("ffmpeg", [
        "-i", pPrev,
        "-i", pExp,
        "-filter_complex",
        `[0:v]crop=1080:${z.h}:0:${z.y}[c0];[1:v]crop=1080:${z.h}:0:${z.y}[c1];[c0][c1]ssim`,
        "-f", "null",
        "-"
      ], { encoding: "utf8" });
    } catch (e) {
      const stderr = e.stderr || "";
      const match = stderr.match(/All:([0-9.]+)/);
      console.log(`  - ${z.name}: SSIM = ${match ? match[1] : "N/A"}`);
    }
  }
}

