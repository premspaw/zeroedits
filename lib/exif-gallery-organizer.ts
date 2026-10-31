"use client";

import type { GalleryMediaItem, LifeCategory } from "@/lib/zee-brain";

export type SmartFolderType =
  | "travel_place"
  | "portraits"
  | "family"
  | "workplace"
  | "ai_images"
  | "ai_videos"
  | "personal";

export interface ExtractedMediaMeta {
  isAiGenerated: boolean;
  aiGeneratorName?: string;
  cameraMake?: string;
  cameraModel?: string;
  captureDateIso: string;
  displayDate: string;
  gpsPlaceName?: string;
  gpsCoords?: { lat: number; lon: number };
  width: number;
  height: number;
  isScreenshot: boolean;
  isPortraitOrientation: boolean;
  folderType: SmartFolderType;
  folderId: string;
  folderTitle: string;
  folderSubtitle: string;
  lifeCategory: Exclude<LifeCategory, "insight">;
}

// Known Indian & International Travel Destinations for offline GPS & filename place matching
const KNOWN_PLACES: {
  name: string;
  keywords: RegExp;
  lat: number;
  lon: number;
  radiusKm: number;
}[] = [
  { name: "Gokarna", keywords: /\bgokarna|om\s*beach|kudle|half\s*moon|paradise\s*beach\b/i, lat: 14.5479, lon: 74.3188, radiusKm: 35 },
  { name: "Goa", keywords: /\bgoa|anjuna|baga|palolem|panjim|vagator|morjim\b/i, lat: 15.2993, lon: 74.124, radiusKm: 65 },
  { name: "Coorg", keywords: /\bcoorg|madikeri|kodagu|kushalnagar\b/i, lat: 12.4244, lon: 75.7382, radiusKm: 45 },
  { name: "Chikmagalur", keywords: /\bchikmagalur|chikkamagaluru|mullayanagiri|baba\s*budangiri\b/i, lat: 13.3161, lon: 75.772, radiusKm: 45 },
  { name: "Hampi", keywords: /\bhampi|hospet|virupaksha|tungabhadra\b/i, lat: 15.335, lon: 76.46, radiusKm: 35 },
  { name: "Mysuru", keywords: /\bmysore|mysuru|chamundi\b/i, lat: 12.2958, lon: 76.6394, radiusKm: 35 },
  { name: "Pondicherry", keywords: /\bpondicherry|puducherry|auroville|white\s*town\b/i, lat: 11.9416, lon: 79.8083, radiusKm: 35 },
  { name: "Ooty & Nilgiris", keywords: /\booty|coonoor|nilgiri|kotagiri\b/i, lat: 11.4102, lon: 76.695, radiusKm: 40 },
  { name: "Munnar & Kerala", keywords: /\bmunnar|alleppey|kochi|wayanad|varkala|kerala\b/i, lat: 10.0889, lon: 77.0595, radiusKm: 85 },
  { name: "Manali & Himachal", keywords: /\bmanali|shimla|kasol|spiti|himachal|rohtang\b/i, lat: 32.2432, lon: 77.1892, radiusKm: 85 },
  { name: "Ladakh", keywords: /\bladakh|leh|pangong|nubra\b/i, lat: 34.1526, lon: 77.5771, radiusKm: 120 },
  { name: "Jaipur & Rajasthan", keywords: /\bjaipur|udaipur|jodhpur|jaisalmer|rajasthan\b/i, lat: 26.9124, lon: 75.7873, radiusKm: 120 },
  { name: "Mumbai", keywords: /\bmumbai|bandra|colaba|marine\s*drive\b/i, lat: 19.076, lon: 72.8777, radiusKm: 45 },
  { name: "Bengaluru", keywords: /\bbangalore|bengaluru|indiranagar|koramangala|cubbon\b/i, lat: 12.9716, lon: 77.5946, radiusKm: 45 },
  { name: "Hyderabad", keywords: /\bhyderabad|charminar|gachibowli|jubilee\b/i, lat: 17.385, lon: 78.4867, radiusKm: 45 },
  { name: "Chennai", keywords: /\bchennai|marina|mahabalipuram\b/i, lat: 13.0827, lon: 80.2707, radiusKm: 45 },
  { name: "Rishikesh", keywords: /\brishikesh|haridwar|dehradun|mussoorie\b/i, lat: 30.0869, lon: 78.2676, radiusKm: 55 },
  { name: "Kyoto", keywords: /\bkyoto|arashiyama|fushimi|gion\b/i, lat: 35.0116, lon: 135.7681, radiusKm: 45 },
  { name: "Dolomites", keywords: /\bdolomites|alpine|alps\b/i, lat: 46.4102, lon: 11.844, radiusKm: 75 },
  { name: "Bali", keywords: /\bbali|ubud|canggu|uluwatu\b/i, lat: -8.4095, lon: 115.1889, radiusKm: 65 },
  { name: "Dubai", keywords: /\bdubai|burj|marina\b/i, lat: 25.2048, lon: 55.2708, radiusKm: 50 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchPlaceFromGps(lat: number, lon: number): string {
  for (const place of KNOWN_PLACES) {
    if (haversineKm(lat, lon, place.lat, place.lon) <= place.radiusKm) {
      return place.name;
    }
  }
  return `GPS ${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`;
}

function matchPlaceFromText(text: string): string | null {
  for (const place of KNOWN_PLACES) {
    if (place.keywords.test(text)) {
      return place.name;
    }
  }
  return null;
}

// Standard AI generator pixel resolutions
const AI_EXACT_DIMENSIONS = new Set([
  "1024x1024",
  "1024x1792",
  "1792x1024",
  "1024x1536",
  "1536x1024",
  "512x512",
  "768x768",
  "768x1344",
  "1344x768",
  "896x1152",
  "1152x896",
  "832x1216",
  "1216x832",
  "1408x768",
  "768x1408",
  "2048x2048",
]);

const AI_FILENAME_REGEX =
  /(gemini|chatgpt|dalle|dall-e|midjourney|mj_|comfyui|stable[\s_-]?diffusion|sdxl|flux|imagen|firefly|ideogram|leonardo|runway|pika|kling|luma|sora|hailuo|muse[-_]?image|ai[-_]?gen|generated|synthetic|copilot|bing[-_]?image|leonardo_|dreamstudio)/i;

const SCREENSHOT_FILENAME_REGEX =
  /(screenshot|screen[\s_-]?shot|capture|snip|scrn|whatsapp\s*image)/i;

/**
 * Reads binary JPEG EXIF & PNG text chunks directly in the browser (0 server load)
 */
async function readBinaryExifInBrowser(file: File): Promise<{
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  gps?: { lat: number; lon: number };
  hasAiChunk?: boolean;
}> {
  try {
    const slice = file.slice(0, 128 * 1024);
    const buf = await slice.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const view = new DataView(buf);

    // Quick ASCII scan in header for AI metadata chunks (PNG tEXt / XMP / EXIF Software)
    const rawAscii = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 32768)));
    const hasAiChunk =
      /(Midjourney|Stable Diffusion|ComfyUI|DALL-E|OpenAI|Imagen|Google AI|Adobe Firefly|parameters\x00|prompt\x00|DreamStudio|Flux\.1|muse-image)/i.test(
        rawAscii
      );

    // Extract Camera Make if visible in ASCII
    let make: string | undefined;
    let model: string | undefined;
    const makeMatch = rawAscii.match(
      /\b(Apple|Samsung|Google|Canon|NIKON|Sony|OnePlus|Xiaomi|vivo|OPPO|Nothing|Realme|Motorola|Leica|Fujifilm)\b/i
    );
    if (makeMatch) {
      make = makeMatch[1];
    }
    const iphoneMatch = rawAscii.match(/iPhone\s+[0-9A-Za-z\sProMaxMiniPlus]{1,14}/);
    if (iphoneMatch) {
      model = iphoneMatch[0].trim();
    }

    // Extract EXIF DateTime (YYYY:MM:DD HH:MM:SS)
    let dateTime: string | undefined;
    const dtMatch = rawAscii.match(/(20[12]\d):([01]\d):([0-3]\d)\s([0-2]\d):([0-5]\d):([0-5]\d)/);
    if (dtMatch) {
      dateTime = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
    }

    // Parse JPEG EXIF GPS if present
    let gps: { lat: number; lon: number } | undefined;
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset + 4 < bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        const len = view.getUint16(offset + 2, false);
        if (marker === 0xe1 && offset + 10 < bytes.length) {
          // Check "Exif\0\0"
          if (
            bytes[offset + 4] === 0x45 &&
            bytes[offset + 5] === 0x78 &&
            bytes[offset + 6] === 0x69 &&
            bytes[offset + 7] === 0x66
          ) {
            const tiffStart = offset + 10;
            const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
            const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
            const ifd0 = tiffStart + firstIfdOffset;
            if (ifd0 + 2 < bytes.length) {
              const entries = view.getUint16(ifd0, littleEndian);
              for (let i = 0; i < entries; i++) {
                const entryOffset = ifd0 + 2 + i * 12;
                if (entryOffset + 12 > bytes.length) break;
                const tag = view.getUint16(entryOffset, littleEndian);
                // GPSInfoIFDPointer = 0x8825
                if (tag === 0x8825) {
                  const gpsOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
                  if (gpsOffset + 2 < bytes.length) {
                    const gpsEntries = view.getUint16(gpsOffset, littleEndian);
                    let latRef = "N";
                    let lonRef = "E";
                    let latVal: number | null = null;
                    let lonVal: number | null = null;

                    const readRational3 = (valOffset: number): number | null => {
                      if (valOffset + 24 > bytes.length) return null;
                      const d0 =
                        view.getUint32(valOffset, littleEndian) /
                        Math.max(1, view.getUint32(valOffset + 4, littleEndian));
                      const m0 =
                        view.getUint32(valOffset + 8, littleEndian) /
                        Math.max(1, view.getUint32(valOffset + 12, littleEndian));
                      const s0 =
                        view.getUint32(valOffset + 16, littleEndian) /
                        Math.max(1, view.getUint32(valOffset + 20, littleEndian));
                      return d0 + m0 / 60 + s0 / 3600;
                    };

                    for (let g = 0; g < gpsEntries; g++) {
                      const gEntry = gpsOffset + 2 + g * 12;
                      if (gEntry + 12 > bytes.length) break;
                      const gTag = view.getUint16(gEntry, littleEndian);
                      if (gTag === 1) {
                        latRef = String.fromCharCode(bytes[gEntry + 8]);
                      } else if (gTag === 2) {
                        const ptr = tiffStart + view.getUint32(gEntry + 8, littleEndian);
                        latVal = readRational3(ptr);
                      } else if (gTag === 3) {
                        lonRef = String.fromCharCode(bytes[gEntry + 8]);
                      } else if (gTag === 4) {
                        const ptr = tiffStart + view.getUint32(gEntry + 8, littleEndian);
                        lonVal = readRational3(ptr);
                      }
                    }

                    if (
                      latVal !== null &&
                      lonVal !== null &&
                      Number.isFinite(latVal) &&
                      Number.isFinite(lonVal) &&
                      (latVal !== 0 || lonVal !== 0)
                    ) {
                      gps = {
                        lat: latRef === "S" ? -latVal : latVal,
                        lon: lonRef === "W" ? -lonVal : lonVal,
                      };
                    }
                  }
                }
              }
            }
          }
          break;
        }
        offset += 2 + len;
      }
    }

    return { make, model, dateTime, gps, hasAiChunk };
  } catch {
    return {};
  }
}

/**
 * Reads image or video dimensions in the browser
 */
function readMediaDimensions(
  objectUrl: string,
  isVideo: boolean
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ width: 1080, height: 1350 }), 1200);
    if (isVideo) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve({
          width: v.videoWidth || 1080,
          height: v.videoHeight || 1920,
        });
      };
      v.onerror = () => {
        clearTimeout(timeout);
        resolve({ width: 1080, height: 1920 });
      };
      v.src = objectUrl;
    } else {
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        resolve({
          width: img.naturalWidth || 1080,
          height: img.naturalHeight || 1350,
        });
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve({ width: 1080, height: 1350 });
      };
      img.src = objectUrl;
    }
  });
}

/**
 * Inspects a File's binary EXIF, GPS, pixel dimensions, subfolder path, and filename
 * to sort it into the exact right Folder Wallet (AI Images, AI Videos, Travel • Place, Portraits, Family, Office/Workplace).
 */
export async function analyzeFileMetadataForGallery(
  file: File,
  objectUrl: string
): Promise<ExtractedMediaMeta> {
  const relPath = (file as any).webkitRelativePath || file.name;
  const parts = relPath.split(/[\\/]/);
  const subfolderName = parts.length > 1 ? parts[parts.length - 2] : "";
  const fullContext = `${subfolderName} ${file.name}`;
  const isVideo =
    file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
  const isPngOrWebp = /\.(png|webp)$/i.test(file.name);

  const [exif, dims] = await Promise.all([
    readBinaryExifInBrowser(file),
    readMediaDimensions(objectUrl, isVideo),
  ]);

  const dimKey = `${dims.width}x${dims.height}`;
  const hasCameraHardware = Boolean(exif.make || exif.model || exif.gps);
  const isScreenshot = SCREENSHOT_FILENAME_REGEX.test(fullContext);

  // 1. Detect AI-Generated Image or AI Video
  const isAiMatch =
    Boolean(exif.hasAiChunk) ||
    AI_FILENAME_REGEX.test(fullContext) ||
    (!hasCameraHardware &&
      !isScreenshot &&
      (AI_EXACT_DIMENSIONS.has(dimKey) ||
        (isPngOrWebp && dims.width === dims.height && dims.width >= 512)));

  // Capture Date
  const fileDate = exif.dateTime
    ? new Date(exif.dateTime)
    : file.lastModified
    ? new Date(file.lastModified)
    : new Date();
  const captureDateIso = Number.isNaN(fileDate.getTime())
    ? new Date().toISOString().slice(0, 10)
    : fileDate.toISOString().slice(0, 10);
  const displayDate = Number.isNaN(fileDate.getTime())
    ? "Recent"
    : fileDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const aspect = dims.width / Math.max(1, dims.height);
  const isPortraitOrientation = aspect >= 0.45 && aspect <= 0.86;

  // Check if AI Video or AI Image first (Keep 100% separate!)
  if (isAiMatch) {
    if (isVideo) {
      return {
        isAiGenerated: true,
        aiGeneratorName: "AI Video Synth",
        captureDateIso,
        displayDate,
        width: dims.width,
        height: dims.height,
        isScreenshot: false,
        isPortraitOrientation,
        folderType: "ai_videos",
        folderId: "folder-ai-videos",
        folderTitle: "AI Videos & Motion",
        folderSubtitle: "Synthetic Clips & Generated Motion",
        lifeCategory: "work",
      };
    }
    return {
      isAiGenerated: true,
      aiGeneratorName: "AI Image Synth",
      captureDateIso,
      displayDate,
      width: dims.width,
      height: dims.height,
      isScreenshot: false,
      isPortraitOrientation,
      folderType: "ai_images",
      folderId: "folder-ai-images",
      folderTitle: "AI-Created Images",
      folderSubtitle: "Generated Art & Synthetic Visuals",
      lifeCategory: "work",
    };
  }

  // 2. Check GPS or Place Name (e.g. Gokarna, Goa, Kyoto, Coorg, etc.)
  const textPlace = matchPlaceFromText(fullContext);
  const gpsPlace = exif.gps
    ? matchPlaceFromGps(exif.gps.lat, exif.gps.lon)
    : undefined;
  const resolvedPlace = textPlace || gpsPlace;

  if (
    resolvedPlace ||
    /\b(travel|trip|vacation|beach|mountain|trek|hills|flight|resort|roadtrip|sunset|nature)\b/i.test(
      fullContext
    )
  ) {
    const placeLabel = resolvedPlace || (subfolderName && subfolderName !== "Web Folder" ? subfolderName : "Trips & Horizons");
    const slug = placeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return {
      isAiGenerated: false,
      cameraMake: exif.make,
      cameraModel: exif.model,
      captureDateIso,
      displayDate,
      gpsPlaceName: placeLabel,
      gpsCoords: exif.gps,
      width: dims.width,
      height: dims.height,
      isScreenshot: false,
      isPortraitOrientation,
      folderType: "travel_place",
      folderId: `folder-travel-${slug}`,
      folderTitle: `Travel • ${placeLabel}`,
      folderSubtitle: exif.gps ? `GPS Location • ${placeLabel}` : `Travel Album • ${placeLabel}`,
      lifeCategory: "travel",
    };
  }

  // 3. Check Family & Friends / Group Moments
  if (
    /\b(family|mom|dad|parents|home|dinner|wedding|festival|diwali|birthday|sister|brother|cousin|group|together|friends|party)\b/i.test(
      fullContext
    )
  ) {
    return {
      isAiGenerated: false,
      cameraMake: exif.make,
      cameraModel: exif.model,
      captureDateIso,
      displayDate,
      width: dims.width,
      height: dims.height,
      isScreenshot: false,
      isPortraitOrientation,
      folderType: "family",
      folderId: "folder-family",
      folderTitle: "Family & Bonds",
      folderSubtitle: "Home, Gatherings & Inner Circle",
      lifeCategory: "family",
    };
  }

  // 4. Check Office & Workplace (Screenshots, Landscape Desk/Screen setups, Work folders)
  if (
    isScreenshot ||
    /\b(work|office|desk|studio|code|laptop|whiteboard|meeting|project|ui|screen|presentation)\b/i.test(
      fullContext
    )
  ) {
    return {
      isAiGenerated: false,
      cameraMake: exif.make,
      cameraModel: exif.model,
      captureDateIso,
      displayDate,
      width: dims.width,
      height: dims.height,
      isScreenshot,
      isPortraitOrientation,
      folderType: "workplace",
      folderId: "folder-workplace",
      folderTitle: "Office & Workplace",
      folderSubtitle: "Studio Desk, Screens & Builds",
      lifeCategory: "work",
    };
  }

  // 5. Camera Portraits (Vertical camera shots, people/selfies/headshots)
  if (
    isPortraitOrientation ||
    hasCameraHardware ||
    /\b(portrait|selfie|prem|me|profile|dp|headshot|img_|dsc_|pxl_)\b/i.test(fullContext)
  ) {
    return {
      isAiGenerated: false,
      cameraMake: exif.make,
      cameraModel: exif.model,
      captureDateIso,
      displayDate,
      width: dims.width,
      height: dims.height,
      isScreenshot: false,
      isPortraitOrientation: true,
      folderType: "portraits",
      folderId: "folder-portraits",
      folderTitle: "Portraits & Camera",
      folderSubtitle: exif.model
        ? `Captured on ${exif.model}`
        : "Personal Camera & Portraits",
      lifeCategory: "personal",
    };
  }

  // 6. Default: Subfolder name if provided, or Personal Moments
  if (subfolderName && subfolderName !== "Web Folder") {
    const slug = subfolderName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return {
      isAiGenerated: false,
      cameraMake: exif.make,
      cameraModel: exif.model,
      captureDateIso,
      displayDate,
      width: dims.width,
      height: dims.height,
      isScreenshot: false,
      isPortraitOrientation,
      folderType: "personal",
      folderId: `folder-custom-${slug}`,
      folderTitle: subfolderName,
      folderSubtitle: `Folder • ${displayDate}`,
      lifeCategory: "personal",
    };
  }

  return {
    isAiGenerated: false,
    cameraMake: exif.make,
    cameraModel: exif.model,
    captureDateIso,
    displayDate,
    width: dims.width,
    height: dims.height,
    isScreenshot: false,
    isPortraitOrientation,
    folderType: "personal",
    folderId: "folder-personal",
    folderTitle: "Personal Moments",
    folderSubtitle: "Everyday Camera Roll",
    lifeCategory: "personal",
  };
}

