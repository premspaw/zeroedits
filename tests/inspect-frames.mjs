import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const pDir = path.join(process.cwd(), ".render-temp", "parity-verify");

for (const t of [0, 1, 5, 15]) {
  const pPrev = path.join(pDir, `preview_t${t}.png`);
  const pExp = path.join(pDir, `export_t${t}.png`);
  
  // Extract mean color from speaker face area (crop 400x400 center)
  const getMean = (imgPath) => {
    const raw = execFileSync("ffmpeg", [
      "-i", imgPath,
      "-vf", "crop=400:400:340:500,format=gray",
      "-f", "rawvideo",
      "-"
    ]);
    let sum = 0;
    for (let i = 0; i < raw.length; i++) sum += raw[i];
    return (sum / raw.length).toFixed(1);
  };

  const mPrev = getMean(pPrev);
  const mExp = getMean(pExp);
  console.log(`t=${t}s: Preview face mean = ${mPrev}, Export face mean = ${mExp}`);
}

