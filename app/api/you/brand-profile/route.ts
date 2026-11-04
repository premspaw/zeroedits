import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_HTML_BYTES = 1_500_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestedUrl = String(body.url || "").trim();
    let target = normalizePublicUrl(requestedUrl);
    let html = "";

    for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
      await assertPublicHost(target.hostname);
      const response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "MuseBrandReader/1.0", Accept: "text/html,application/xhtml+xml" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirectCount === 3) throw new Error("The site redirected too many times.");
        target = normalizePublicUrl(new URL(location, target).toString());
        continue;
      }
      if (!response.ok) throw new Error(`The website returned ${response.status}.`);
      if (!(response.headers.get("content-type") || "").toLowerCase().includes("html")) {
        throw new Error("That link did not return a readable web page.");
      }
      html = await readLimitedText(response, MAX_HTML_BYTES);
      break;
    }

    if (!html) throw new Error("The website returned an empty page.");
    const extracted = extractBrandSignals(html);
    return NextResponse.json({
      success: true,
      data: {
        websiteUrl: target.toString(),
        ...extracted,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    const message = error?.message || "Could not read that website.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

function normalizePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter a valid public website address.");
  }
  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password) {
    throw new Error("Use a public http or https website link.");
  }
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error("Custom website ports are not supported.");
  }
  if (isBlockedAddress(url.hostname)) throw new Error("Local and private network addresses cannot be read.");
  url.hash = "";
  return url;
}

async function assertPublicHost(hostname: string) {
  if (isBlockedAddress(hostname)) throw new Error("Local and private network addresses cannot be read.");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("That website does not resolve to a public address.");
  }
}

function isBlockedAddress(host: string): boolean {
  const value = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (value === "localhost" || value.endsWith(".localhost") || value.endsWith(".local")) return true;
  if (isIP(value) === 4) {
    const [a, b] = value.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (isIP(value) === 6) {
    return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.");
  }
  return false;
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("The website page is too large to analyze.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

function extractBrandSignals(html: string) {
  const meta = (name: string) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tag = html.match(new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`, "i"))?.[0] || "";
    return decodeHtml(tag.match(/content=["']([^"']*)["']/i)?.[1] || "").trim();
  };
  const pageTitle = decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const name = meta("og:site_name") || meta("application-name") || pageTitle.split(/[|–—-]/)[0].trim();
  const description = meta("og:description") || meta("description");
  const pageHeadings = Array.from(html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi))
    .map((match) => stripTags(decodeHtml(match[1])))
    .filter((text) => text.length > 2)
    .slice(0, 10);
  const text = stripTags(decodeHtml(html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " "))).slice(0, 7000);
  const keywords = unique([ ...meta("keywords").split(/[,|]/), ...pageHeadings ]).filter(Boolean).slice(0, 12);
  const colors = extractColors(html);
  const fonts = unique(Array.from(html.matchAll(/font-family\s*:\s*([^;}{]+)/gi)).map((match) => match[1].split(",")[0].replace(/["']/g, "").trim())).filter((font) => font && !/^(serif|sans-serif|monospace|inherit|initial|system-ui)$/i.test(font)).slice(0, 5);
  const cleanDescription = description || text.slice(0, 260).trim();
  return { name, pageTitle, description: cleanDescription, pageHeadings, keywords, colors, fonts };
}

function extractColors(html: string): string[] {
  const candidates: string[] = [];
  const themeColor = html.match(/<meta\b(?=[^>]*name=["']theme-color["'])[^>]*content=["']([^"']+)/i)?.[1];
  if (themeColor) candidates.push(normalizeColor(themeColor));
  for (const match of html.matchAll(/#[0-9a-f]{3,8}\b|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*[\d.]+)?\s*\)/gi)) candidates.push(normalizeColor(match[0]));
  const counts = new Map<string, number>();
  for (const color of candidates) if (color) counts.set(color, (counts.get(color) || 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([color]) => color).slice(0, 5);
}

function normalizeColor(value: string): string {
  const hex = value.toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(hex)) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  if (/^#[0-9A-F]{6}$/.test(hex)) return hex;
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i);
  if (rgb) {
    const channels = rgb.slice(1, 4).map(Number);
    if (channels.some((channel) => channel > 255)) return "";
    return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }
  return "";
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);|&#x([\da-f]+);/gi, (entity, decimal, hexadecimal) => {
      const codePoint = Number(decimal || `0x${hexadecimal}`);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    });
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
