/**
 * Meta Muse — Pipeline B & Image Storyteller Tool: Image Generator
 * Generates story-specific 9:16 visuals with Character & Style Consistency using Meta muse-image-1.0.
 */

import fs from "fs";
import path from "path";

export interface GenerateImageParams {
  prompt: string;
  runId: string;
  assetId?: string;
  reasoningStrength?: "low" | "medium" | "high";
  referenceImageDataUri?: string | null;
}

export interface GeneratedImageResult {
  assetId: string;
  prompt: string;
  filePath: string;
  publicUrl: string;
  fileSizeBytes: number;
  base64DataUri: string;
}

export async function generateMuseImage(params: GenerateImageParams): Promise<GeneratedImageResult> {
  const {
    prompt,
    runId,
    assetId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    reasoningStrength = "high",
    referenceImageDataUri = null,
  } = params;

  const apiKey =
    process.env.MODEL_API_KEY ||
    process.env.MUSE_API_KEY ||
    process.env.META_API_KEY ||
    "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

  const baseUrl = process.env.MODEL_API_BASE_URL || "https://api.meta.ai/v1";

  // Ensure output directories exist in run directory and public folder for immediate serving
  const runAssetsDir = path.join(process.cwd(), "workspace", "pipeline-b", "runs", runId, "assets");
  if (!fs.existsSync(runAssetsDir)) {
    fs.mkdirSync(runAssetsDir, { recursive: true });
  }

  const publicAssetsDir = path.join(process.cwd(), "public", "assets", runId);
  if (!fs.existsSync(publicAssetsDir)) {
    fs.mkdirSync(publicAssetsDir, { recursive: true });
  }

  const enhancedPrompt = `${prompt}, 9:16 vertical portrait format, consistent character identity and proportions, cinematic lighting, masterpiece quality, ultra-high resolution, no text, no watermarks`;

  console.log(`[muse-image-1.0] Generating visual for runId=${runId} assetId=${assetId} (refImage=${Boolean(referenceImageDataUri)})...`);

  async function callImageApi(includeRefImage: boolean): Promise<any> {
    const contentBlocks: any[] = [
      {
        type: "input_text",
        text: includeRefImage
          ? `Maintain exact visual character consistency, facial features, outfit, color palette, and art style with the attached reference image. ${enhancedPrompt}`
          : enhancedPrompt,
      },
    ];

    if (includeRefImage && referenceImageDataUri) {
      contentBlocks.push({
        type: "input_image",
        image_url: referenceImageDataUri,
      });
    }

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
            content: contentBlocks,
          },
        ],
        max_output_tokens: 2048,
        model: "muse-image-1.0",
        store: true,
        stream: false,
        temperature: 0.45,
        top_p: 0.88,
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
      throw new Error(
        `muse-image-1.0 did not return image_generation_call.result. Output types: ${json.output?.map((o: any) => o.type).join(", ")}`
      );
    }

    return imageCall.result as string;
  }

  let base64Result: string;
  if (referenceImageDataUri) {
    try {
      base64Result = await callImageApi(true);
    } catch (refErr) {
      console.warn(`[muse-image-1.0] Reference image conditioning fallback to locked text sheet for ${assetId}:`, refErr);
      base64Result = await callImageApi(false);
    }
  } else {
    base64Result = await callImageApi(false);
  }

  const imageBuffer = Buffer.from(base64Result, "base64");
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
    base64DataUri: `data:image/png;base64,${base64Result}`,
  };
}
