/**
 * Meta Muse — Pipeline B Tool: Image Generator
 * Generates story-specific 9:16 visuals and product imagery using Meta muse-image-1.0.
 */

import fs from "fs";
import path from "path";

export interface GenerateImageParams {
  prompt: string;
  runId: string;
  assetId?: string;
  reasoningStrength?: "low" | "medium" | "high";
}

export interface GeneratedImageResult {
  assetId: string;
  prompt: string;
  filePath: string;
  publicUrl: string;
  fileSizeBytes: number;
}

export async function generateMuseImage(params: GenerateImageParams): Promise<GeneratedImageResult> {
  const { prompt, runId, assetId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, reasoningStrength = "high" } = params;

  const apiKey =
    process.env.MODEL_API_KEY ||
    process.env.MUSE_API_KEY ||
    process.env.META_API_KEY ||
    "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

  const baseUrl = process.env.MODEL_API_BASE_URL || "https://api.meta.ai/v1";

  // Ensure output directories exist in run directory and public folder for immediate Remotion serving
  const runAssetsDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId, "assets");
  if (!fs.existsSync(runAssetsDir)) {
    fs.mkdirSync(runAssetsDir, { recursive: true });
  }

  const publicAssetsDir = path.join(process.cwd(), "public", "assets", runId);
  if (!fs.existsSync(publicAssetsDir)) {
    fs.mkdirSync(publicAssetsDir, { recursive: true });
  }

  const enhancedPrompt = `${prompt}, 9:16 vertical orientation, portrait format, crisp details, cinematic lighting, ultra-high resolution`;

  console.log(`[muse-image-1.0] Generating visual for runId=${runId} assetId=${assetId}...`);

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: enhancedPrompt,
            },
          ],
        },
      ],
      max_output_tokens: 2048,
      model: "muse-image-1.0",
      store: true,
      stream: false,
      temperature: 0.6,
      top_p: 0.9,
      tools: [
        {
          type: "image_generation",
          output_format: "png",
          reasoning_strength: reasoningStrength,
          enable_image_search: true,
          enable_shell: true,
          enable_web_search: true,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Meta muse-image-1.0 request failed with status ${response.status}: ${errorText}`);
  }

  const json = await response.json();
  const imageCall = json.output?.find(
    (item: any) => item.type === "image_generation_call" && item.result
  );

  if (!imageCall || !imageCall.result) {
    throw new Error(`muse-image-1.0 did not return image_generation_call.result. Output types: ${json.output?.map((o: any) => o.type).join(", ")}`);
  }

  const imageBuffer = Buffer.from(imageCall.result, "base64");
  const fileName = `${assetId}.png`;
  const filePath = path.join(runAssetsDir, fileName);
  const publicPath = path.join(publicAssetsDir, fileName);

  fs.writeFileSync(filePath, imageBuffer);
  fs.writeFileSync(publicPath, imageBuffer);

  const publicUrl = `/assets/${runId}/${fileName}`;
  console.log(`[muse-image-1.0] Successfully generated and saved asset: ${publicUrl} (${imageBuffer.length} bytes)`);

  return {
    assetId,
    prompt,
    filePath,
    publicUrl,
    fileSizeBytes: imageBuffer.length,
  };
}
