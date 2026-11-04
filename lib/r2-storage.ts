import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || "zerolensbucket-cdn";
const customDomain = process.env.R2_PUBLIC_DOMAIN; // e.g. "https://cdn.zerolens.ai" or "https://pub-xxx.r2.dev"

export const isR2Configured = (): boolean => {
  return Boolean(accountId && accessKeyId && secretAccessKey);
};

export const getR2Client = (): S3Client => {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured. Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.");
  }

  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
};

/**
 * Upload a local file from disk directly to Cloudflare R2
 */
export async function uploadLocalFileToR2(
  localFilePath: string,
  destinationKey: string,
  contentType?: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  try {
    if (!fs.existsSync(localFilePath)) {
      return { success: false, url: "", key: destinationKey, error: `Local file not found: ${localFilePath}` };
    }

    const client = getR2Client();
    const fileStream = fs.createReadStream(localFilePath);
    const resolvedContentType = contentType || getMimeType(localFilePath);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: destinationKey,
      Body: fileStream,
      ContentType: resolvedContentType,
    });

    await client.send(command);

    const url = getPublicOrPresignedUrl(destinationKey);
    return { success: true, url, key: destinationKey };
  } catch (err: any) {
    return { success: false, url: "", key: destinationKey, error: err?.message || String(err) };
  }
}

/**
 * Upload a buffer or Uint8Array directly to Cloudflare R2
 */
export async function uploadBufferToR2(
  buffer: Buffer | Uint8Array,
  destinationKey: string,
  contentType: string = "application/octet-stream"
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  try {
    const client = getR2Client();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: destinationKey,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    const url = getPublicOrPresignedUrl(destinationKey);
    return { success: true, url, key: destinationKey };
  } catch (err: any) {
    return { success: false, url: "", key: destinationKey, error: err?.message || String(err) };
  }
}

/**
 * Generate a pre-signed PUT URL for direct client-to-R2 upload.
 * This completely bypasses any server payload limits (solves Vercel 413 / huge video upload issues).
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = "video/mp4",
  expiresInSeconds: number = 3600
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const publicUrl = getPublicOrPresignedUrl(key);

  return { uploadUrl, key, publicUrl };
}

/**
 * Generate a pre-signed GET URL to stream or view private R2 objects
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Check if the R2 bucket is accessible with the provided credentials
 */
export async function testR2Connection(): Promise<{ ok: boolean; message: string }> {
  try {
    if (!isR2Configured()) {
      return { ok: false, message: "Missing R2 configuration environment variables" };
    }
    const client = getR2Client();
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return { ok: true, message: `Successfully connected to Cloudflare R2 bucket: ${bucketName}` };
  } catch (err: any) {
    return { ok: false, message: `R2 connection failed: ${err?.message || String(err)}` };
  }
}

function getPublicOrPresignedUrl(key: string): string {
  if (customDomain) {
    const cleanDomain = customDomain.replace(/\/+$/, "");
    const cleanKey = key.replace(/^\/+/, "");
    return `${cleanDomain}/${cleanKey}`;
  }
  // Default R2 endpoint access or presigned view
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

