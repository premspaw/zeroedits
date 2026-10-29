import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

async function testRender() {
  const tsxPath = path.resolve("./workspace/pipeline-b/runs/acceptance-eval/TalkingHeadReel.tsx");
  const renderDir = path.resolve("./.render-temp/test-b");
  if (!fs.existsSync(renderDir)) {
    fs.mkdirSync(renderDir, { recursive: true });
  }

  // Copy clean video to public folder or serve it so Remotion can read it
  const publicDir = path.resolve("./public/temp-render");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const cleanVideoSrc = path.resolve("./workspace/pipeline-b/runs/acceptance-eval/clean_cut_video.mp4");
  const cleanVideoDest = path.join(publicDir, "clean_cut_video.mp4");
  fs.copyFileSync(cleanVideoSrc, cleanVideoDest);

  // Read TalkingHeadReel.tsx and adjust Video src to staticFile
  let tsxContent = fs.readFileSync(tsxPath, "utf-8");
  tsxContent = tsxContent.replace(
    /import { AbsoluteFill, Video/g,
    'import { AbsoluteFill, Video, staticFile'
  );
  tsxContent = tsxContent.replace(
    /src="[^"]*clean_cut_video\.mp4"/g,
    'src={staticFile("clean_cut_video.mp4")}'
  );

  const componentFile = path.join(renderDir, "SparkComponent.tsx");
  fs.writeFileSync(componentFile, tsxContent, "utf-8");

  const entryFile = path.join(renderDir, "index.tsx");
  const entryContent = `
import React from "react";
import { registerRoot, Composition } from "remotion";
import { TalkingHeadReel } from "./SparkComponent";

export const Root: React.FC = () => (
  <Composition
    id="TalkingHeadReel"
    component={TalkingHeadReel}
    durationInFrames={1076}
    fps={30}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
`;
  fs.writeFileSync(entryFile, entryContent, "utf-8");

  console.log("Bundling Remotion entry point...");
  const bundleLocation = await bundle({
    entryPoint: entryFile,
    publicDir: path.resolve("./public"),
  });
  console.log("Bundle ready:", bundleLocation);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "TalkingHeadReel",
  });
  console.log("Selected composition:", composition.id, "durationInFrames:", composition.durationInFrames);

  const finalReelPath = path.resolve("./workspace/pipeline-b/runs/acceptance-eval/final_edited_reel.mp4");
  console.log(`Rendering full ${composition.durationInFrames} frames to ${finalReelPath}...`);
  const startTime = Date.now();
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: finalReelPath,
    chromiumOptions: {
      disableWebSecurity: true,
    },
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Full Remotion render completed in ${elapsed}s! Output: ${finalReelPath}`);
}

testRender().catch(err => {
  console.error("Render test failed:", err);
  process.exit(1);
});
