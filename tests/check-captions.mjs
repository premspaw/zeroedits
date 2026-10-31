import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const pDir = path.join(process.cwd(), ".render-temp", "parity-verify");

// Let's crop the exact caption pill region (x=100..980, y=1600..1750)
const pPrev = path.join(pDir, "preview_t0.png");
const pExp = path.join(pDir, "export_t0.png");

execFileSync("ffmpeg", ["-y", "-i", pPrev, "-vf", "crop=880:150:100:1600", path.join(pDir, "cap_prev_t0.png")]);
execFileSync("ffmpeg", ["-y", "-i", pExp, "-vf", "crop=880:150:100:1600", path.join(pDir, "cap_exp_t0.png")]);

console.log("Caption regions saved. Checking SSIM of caption box...");
try {
  const out = execFileSync("ffmpeg", [
    "-i", path.join(pDir, "cap_prev_t0.png"),
    "-i", path.join(pDir, "cap_exp_t0.png"),
    "-filter_complex", "ssim",
    "-f", "null",
    "-"
  ], { encoding: "utf8" });
} catch (e) {
  const stderr = e.stderr || "";
  const match = stderr.match(/All:([0-9.]+)/);
  console.log("Caption SSIM:", match ? match[1] : "N/A");
}

