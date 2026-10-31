import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const pDir = path.join(process.cwd(), ".render-temp", "parity-verify");
const diffImg = path.join(pDir, "diff_t0.png");

// Let's find where the brightest pixels in diff_t0.png are located!
// We can use ffmpeg bbox or blackdetect / crop
let out = "";
try {
  out = execFileSync("ffmpeg", [
    "-i", diffImg,
    "-vf", "bbox",
    "-f", "null",
    "-"
  ], { encoding: "utf8" });
} catch (e) {
  out = e.stderr || e.stdout || "";
}

const match = out.match(/bbox:([^\r\n]+)/);
console.log("Diff bbox output:", match ? match[0] : out);
