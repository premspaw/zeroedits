import { spawn } from "child_process";
import fs from "fs";
import path from "path";

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runBrowserParity() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`Using browser: ${browserBin}`);
  const parityDir = path.join(process.cwd(), ".render-temp", "parity-verify");
  fs.mkdirSync(parityDir, { recursive: true });

  // Clean old run files
  const existingFiles = fs.readdirSync(parityDir);
  for (const f of existingFiles) {
    try {
      fs.unlinkSync(path.join(parityDir, f));
    } catch {}
  }

  const targetUrl = "http://localhost:3000/parity-check?autorun=1";
  console.log(`Launching headless browser at ${targetUrl}...`);

  const browserProc = spawn(browserBin, [
    "--headless=new",
    "--no-sandbox",
    "--disable-web-security",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies",
    "--window-size=1280,1080",
    targetUrl,
  ], {
    stdio: "inherit",
  });

  console.log("Waiting for parity runner to complete frame capture, MP4 export, and SSIM analysis...");

  const startTime = Date.now();
  const timeoutMs = 240000; // 240s max for full 654 frame render in software headless
  let completed = false;

  while (Date.now() - startTime < timeoutMs) {
    await sleep(2000);
    const files = fs.readdirSync(parityDir);
    const hasDiff = files.some((f) => f.startsWith("diff_t15"));
    const hasExport = files.some((f) => f.startsWith("export_t15"));

    const progressSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`  [${progressSec}s elapsed] Files in parity directory: ${files.length} (${files.slice(0, 4).join(", ")}...)`);

    if (hasDiff && hasExport) {
      console.log("\nParity check completed! Reading comparison results...");
      completed = true;
      break;
    }
  }

  try {
    browserProc.kill("SIGKILL");
  } catch {}

  if (!completed) {
    console.error("Parity test timed out before all frames were processed.");
    process.exit(1);
  }

  console.log("All frame comparisons generated. Files in output:");
  for (const f of fs.readdirSync(parityDir)) {
    const stat = fs.statSync(path.join(parityDir, f));
    console.log(` - ${f}: ${stat.size} bytes`);
  }
}

runBrowserParity().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
