/** Shared server-side Meta model API configuration. Never import this from client components. */

const DEFAULT_META_API_BASE_URL = "https://api.meta.ai/v1";

export function getMetaApiKey(): string {
  return (
    process.env.MODEL_API_KEY ||
    process.env.META_API_KEY ||
    process.env.MUSE_API_KEY ||
    ""
  ).trim();
}

export function getMetaApiBaseUrl(): string {
  const configured = process.env.MODEL_API_BASE_URL || DEFAULT_META_API_BASE_URL;
  return configured.trim().replace(/\/+$/, "");
}

export function getMetaEndpoint(path: "responses" | "files" = "responses"): string {
  return `${getMetaApiBaseUrl()}/${path}`;
}

export function getMetaModelId(
  family: "wonder" | "spark" | "image" | "sam",
  fallback: string
): string {
  const envName = {
    wonder: "META_WONDER_MODEL_ID",
    spark: "META_SPARK_MODEL_ID",
    image: "META_IMAGE_MODEL_ID",
    sam: "META_SAM_MODEL_ID",
  }[family];
  return (process.env[envName] || fallback).trim();
}

export function requireMetaApiKey(): string {
  const key = getMetaApiKey();
  if (!key) {
    throw new Error("Meta models are not configured. Set MODEL_API_KEY in the server environment.");
  }
  return key;
}
