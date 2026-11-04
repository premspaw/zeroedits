/**
 * Meta Muse — Hugging Face Bucket Client
 * Integrates with the official `hf` CLI and Hugging Face Buckets (Xet storage)
 * for rapid video asset sync, storage, and persistence.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

const HF_CLI_PATH = process.platform === "win32"
  ? path.join(process.env.USERPROFILE || "C:\\Users\\Hemanth", ".local", "bin", "hf.exe")
  : "hf";

export const DEFAULT_BUCKET_ID = process.env.HF_BUCKET_ID || "premspaw/zeroedits1";

/**
 * Returns the resolved hf:// URI for an asset inside the bucket.
 */
export function getBucketUri(remotePath: string = "", bucketId = DEFAULT_BUCKET_ID): string {
  const cleanPath = remotePath.replace(/^\/+/, "");
  return cleanPath ? `hf://buckets/${bucketId}/${cleanPath}` : `hf://buckets/${bucketId}`;
}

/**
 * Uploads a local file to the Hugging Face bucket.
 */
export async function uploadFileToBucket(
  localFilePath: string,
  remotePath: string,
  bucketId = DEFAULT_BUCKET_ID
): Promise<{ success: boolean; uri: string; error?: string }> {
  try {
    if (!fs.existsSync(localFilePath)) {
      return { success: false, uri: "", error: `Local file not found: ${localFilePath}` };
    }

    const dstUri = getBucketUri(remotePath, bucketId);
    await execFileAsync(HF_CLI_PATH, ["cp", localFilePath, dstUri], {
      env: { ...process.env, HF_TOKEN: process.env.HF_TOKEN },
    });

    return { success: true, uri: dstUri };
  } catch (err: any) {
    return { success: false, uri: "", error: err.message || String(err) };
  }
}

/**
 * Syncs a whole local directory to the Hugging Face bucket.
 */
export async function syncFolderToBucket(
  localDir: string,
  remotePrefix: string = "",
  bucketId = DEFAULT_BUCKET_ID
): Promise<{ success: boolean; uri: string; error?: string }> {
  try {
    if (!fs.existsSync(localDir)) {
      return { success: false, uri: "", error: `Local directory not found: ${localDir}` };
    }

    const dstUri = getBucketUri(remotePrefix, bucketId);
    await execFileAsync(HF_CLI_PATH, ["sync", localDir, dstUri], {
      env: { ...process.env, HF_TOKEN: process.env.HF_TOKEN },
    });

    return { success: true, uri: dstUri };
  } catch (err: any) {
    return { success: false, uri: "", error: err.message || String(err) };
  }
}

/**
 * Syncs a Hugging Face bucket directory down to a local directory.
 */
export async function syncBucketToFolder(
  localDir: string,
  remotePrefix: string = "",
  bucketId = DEFAULT_BUCKET_ID
): Promise<{ success: boolean; error?: string }> {
  try {
    fs.mkdirSync(localDir, { recursive: true });
    const srcUri = getBucketUri(remotePrefix, bucketId);

    await execFileAsync(HF_CLI_PATH, ["sync", srcUri, localDir], {
      env: { ...process.env, HF_TOKEN: process.env.HF_TOKEN },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Lists all files inside the bucket.
 */
export async function listBucketFiles(bucketId = DEFAULT_BUCKET_ID): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(HF_CLI_PATH, ["buckets", "list", bucketId], {
      env: { ...process.env, HF_TOKEN: process.env.HF_TOKEN },
    });

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

