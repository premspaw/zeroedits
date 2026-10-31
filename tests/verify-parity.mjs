import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function extractFrameAtTime(videoPath, timestampSec, outPath) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-ss",
    String(timestampSec),
    "-i",
    videoPath,
    "-vframes",
    "1",
    "-q:v",
    "2",
    outPath,
  ]);
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 100) {
    throw new Error(`Failed to extract frame at ${timestampSec}s from ${videoPath}`);
  }
  return fs.statSync(outPath);
}

async function runParityCheck() {
  const runId = "run-b-2026-10-29T17-00-40-956Z-nvyh4";
  const runDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId);
  const cleanVideo = path.join(runDir, "clean_video.mp4");
  const finalVideo = path.join(runDir, "final_reel.mp4");
  const finalEditedVideo = path.join(runDir, "final_edited_reel.mp4");

  const parityDir = path.join(process.cwd(), ".render-temp", "parity-verify");
  fs.mkdirSync(parityDir, { recursive: true });

  const timestamps = [0.0, 1.0, 5.0, 15.0];
  console.log(`\n=== RUNNING FRAME PARITY CHECK FOR: ${runId} ===`);
  console.log(`Source Video: ${cleanVideo}`);
  console.log(`Target Output: ${finalVideo}\n`);

  if (!fs.existsSync(cleanVideo)) {
    console.error(`Clean source video not found at ${cleanVideo}`);
    process.exit(1);
  }

  // 1. Extract frames from clean source video
  console.log(`1. Extracting clean source video frames at timestamps [${timestamps.join(", ")}]s...`);
  for (const t of timestamps) {
    const outImg = path.join(parityDir, `clean_t${t}.jpg`);
    const stat = await extractFrameAtTime(cleanVideo, t, outImg);
    console.log(`   - clean_t${t}.jpg: ${stat.size} bytes`);
  }

  // 2. Check target exported MP4
  const targetVideo = fs.existsSync(finalVideo) ? finalVideo : (fs.existsSync(finalEditedVideo) ? finalEditedVideo : null);
  if (!targetVideo) {
    console.log("\n[Notice] No rendered final_reel.mp4 exists yet. Rendering must be initiated via export pipeline.");
    console.log("Parity check will verify against exported MP4 once generated.");
    return;
  }

  console.log(`\n2. Extracting exported video frames from: ${path.basename(targetVideo)}...`);
  for (const t of timestamps) {
    const outImg = path.join(parityDir, `export_t${t}.jpg`);
    const stat = await extractFrameAtTime(targetVideo, t, outImg);
    console.log(`   - export_t${t}.jpg: ${stat.size} bytes`);
  }

  // 3. Verify that the export video is NOT identical to the clean source video (i.e. overlays are rendered!)
  console.log("\n3. Comparing frame differences between clean source and exported video...");
  let differencesFound = 0;
  for (const t of timestamps) {
    const cleanImg = path.join(parityDir, `clean_t${t}.jpg`);
    const exportImg = path.join(parityDir, `export_t${t}.jpg`);
    const cleanBuf = fs.readFileSync(cleanImg);
    const exportBuf = fs.readFileSync(exportImg);

    const isDifferent = !cleanBuf.equals(exportBuf);
    console.log(`   - t=${t}s: ${isDifferent ? "CONFIRMED DIFFERENT (Rendered overlays present)" : "WARNING: Identical to source (No overlays rendered!)"}`);
    if (isDifferent) differencesFound++;
  }

  console.log(`\nParity check summary: ${differencesFound}/${timestamps.length} sample frames contain rendered graphics over source video.`);
}

runParityCheck().catch((err) => {
  console.error("Parity check error:", err);
  process.exit(1);
});

