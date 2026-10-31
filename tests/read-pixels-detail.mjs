import { execFileSync } from "child_process";
import path from "path";

const pDir = path.join(process.cwd(), ".render-temp", "parity-verify");

// Let's render both to ascii or check non-black pixels
for (const f of ["cap_prev_t0.png", "cap_exp_t0.png"]) {
  const p = path.join(pDir, f);
  const out = execFileSync("ffmpeg", [
    "-i", p,
    "-vf", "format=gray,scale=88:15",
    "-f", "rawvideo",
    "-"
  ]);
  console.log(`\n--- ASCIIMAP FOR ${f} ---`);
  let str = "";
  for (let y = 0; y < 15; y++) {
    let row = "";
    for (let x = 0; x < 88; x++) {
      const val = out[y * 88 + x];
      row += val > 120 ? "#" : val > 40 ? "." : " ";
    }
    str += row + "\n";
  }
  console.log(str);
}

