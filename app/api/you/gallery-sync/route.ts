import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";
import type { GalleryMediaItem, LifeCategory } from "@/lib/zee-brain";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const META_API_KEY =
  process.env.MODEL_API_KEY ||
  process.env.MUSE_API_KEY ||
  process.env.META_API_KEY ||
  "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";

const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".m4v"]);

const SUPPLY_LABELS: Record<Exclude<LifeCategory, "insight">, string> = {
  work: "Workplace & Builder Supply",
  travel: "Horizons & Travel Supply",
  personal: "Personal Rituals Supply",
  family: "Roots & Family Supply",
  relationships: "Human Bonds Supply",
};

const VAR_KEYS: Record<Exclude<LifeCategory, "insight">, string> = {
  work: "user.workplaceStory",
  travel: "user.travelMemory",
  personal: "user.personalLife",
  family: "user.familyMoment",
  relationships: "user.relationshipView",
};

/**
 * Pure Web App Metadata Classifier:
 * Sends ONLY lightweight filenames & folder hints (zero binary upload) to Meta Muse (muse-wonder-1.0).
 */
async function classifyMetadataWithMetaMuse(
  rawItems: { name: string; folderHint?: string; dateIso: string }[]
): Promise<
  Record<
    number,
    {
      category: Exclude<LifeCategory, "insight">;
      title: string;
      location: string;
      aiTags: string[];
      creativeInsight: string;
    }
  >
> {
  if (rawItems.length === 0) return {};
  try {
    const listText = rawItems
      .slice(0, 24)
      .map(
        (it, i) =>
          `${i}: file="${it.name}" folder="${it.folderHint || "web-folder"}" date="${it.dateIso}"`
      )
      .join("\n");

    const parsed = await withModelRetry(
      async () => {
        const res = await fetch("https://api.meta.ai/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: "muse-wonder-1.0",
            input: [
              {
                role: "user",
                content: `Classify these web-app gallery filenames for Prem's Digital Brain:\n${listText}`,
              },
            ],
            stream: true,
            temperature: 0.6,
            max_output_tokens: 2048,
            reasoning: { effort: "low" },
            instructions: `You are Prem's Digital Brain curating his photo & video gallery in a Web App.
For each index, return ONLY valid JSON (no markdown fences):
{
  "items": [
    {
      "index": 0,
      "category": "work" | "travel" | "personal" | "family" | "relationships",
      "title": "Creative 3-6 word editorial title",
      "location": "Inferred setting (e.g. 'Prem's Studio Workplace', 'Horizon Trail', 'Family Table')",
      "aiTags": ["Tag1", "Tag2", "Tag3"],
      "creativeInsight": "1 sentence explaining how Prem's Digital Brain will use this visual in a reel"
    }
  ]
}`,
          }),
        });
        const text = await readModelResponse(res);
        const clean = text
          .replace(/^```[a-zA-Z]*\s*/, "")
          .replace(/```\s*$/, "")
          .trim();
        return JSON.parse(clean);
      },
      { attempts: 2, delayMs: 800 }
    );

    const map: Record<number, any> = {};
    if (Array.isArray(parsed?.items)) {
      for (const entry of parsed.items) {
        if (typeof entry?.index === "number") {
          map[entry.index] = entry;
        }
      }
    }
    return map;
  } catch (e) {
    console.warn("[gallery-sync] Meta classification fallback to heuristic:", e);
    return {};
  }
}

function inferCategoryHeuristic(
  name: string,
  folderHint = "",
  idx = 0
): Exclude<LifeCategory, "insight"> {
  const combined = `${folderHint} ${name}`.toLowerCase();
  if (/(work|desk|studio|code|screen|whiteboard|office|laptop|project|build|ui|app)/i.test(combined)) {
    return "work";
  }
  if (/(travel|trip|kyoto|mountain|beach|flight|horizon|road|vacation|sunset|nature|hill)/i.test(combined)) {
    return "travel";
  }
  if (/(fam|mom|dad|home|parent|dinner|brother|sister|roots|house)/i.test(combined)) {
    return "family";
  }
  if (/(friend|cafe|bond|party|group|together|talk)/i.test(combined)) {
    return "relationships";
  }
  if (/(morning|coffee|journal|book|personal|gym|walk|note)/i.test(combined)) {
    return "personal";
  }
  const cycle: Exclude<LifeCategory, "insight">[] = [
    "work",
    "travel",
    "personal",
    "family",
    "relationships",
  ];
  return cycle[idx % cycle.length];
}

/**
 * Resolves a shared Google Drive folder URL or file URL into direct client-streamable
 * image/video URLs without downloading or storing any files on the server.
 */
async function resolveGoogleDriveWebLinks(driveUrl: string): Promise<
  {
    id: string;
    name: string;
    url: string;
    mediaType: "photo" | "video";
  }[]
> {
  const cleanUrl = driveUrl.trim();

  // Case 0: Google Photos Shared Album / Partner Stream Link (photos.app.goo.gl or photos.google.com/share)
  if (
    cleanUrl.includes("photos.app.goo.gl") ||
    cleanUrl.includes("photos.google.com")
  ) {
    const res = await fetch(cleanUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const html = await res.text();
      // Match high-res Google Photos CDN image base URLs (lh3.googleusercontent.com/pw/...)
      const regex = /https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9_-]{25,}/g;
      const matches = html.match(regex) || [];
      const uniqueUrls = Array.from(new Set(matches)).slice(0, 24);
      if (uniqueUrls.length > 0) {
        return uniqueUrls.map((u, idx) => ({
          id: `gphoto-${Date.now()}-${idx}`,
          name: `Google_Photos_Partner_${idx + 1}.jpg`,
          url: `${u}=w1200`,
          mediaType: "photo" as const,
        }));
      }
    }
    throw new Error(
      "Could not extract photos from this Google Photos link. Make sure Link Sharing is enabled in Google Photos."
    );
  }

  const singleFileMatch =
    cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/) ||
    cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);

  if (folderMatch) {
    const folderId = folderMatch[1];
    const googleApiKey =
      process.env.GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_API_KEY;

    if (googleApiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=${googleApiKey}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.files) && data.files.length > 0) {
            return data.files
              .filter(
                (f: any) =>
                  String(f.mimeType).startsWith("image/") ||
                  String(f.mimeType).startsWith("video/")
              )
              .map((f: any) => ({
                id: f.id,
                name: f.name,
                url: `https://drive.google.com/thumbnail?id=${f.id}&sz=w1200`,
                mediaType: String(f.mimeType).startsWith("video/")
                  ? "video"
                  : "photo",
              }));
          }
        }
      } catch {
        // Fallback to embedded view
      }
    }

    const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    const htmlRes = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const discovered: {
        id: string;
        name: string;
        url: string;
        mediaType: "photo" | "video";
      }[] = [];
      const seenIds = new Set<string>();

      const entryRegex =
        /id="entry-([a-zA-Z0-9_-]{15,})"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
      let match: RegExpExecArray | null;
      while ((match = entryRegex.exec(html)) !== null) {
        const fileId = match[1];
        const rawTitle = match[2].trim();
        if (!seenIds.has(fileId)) {
          seenIds.add(fileId);
          const ext = path.extname(rawTitle).toLowerCase();
          discovered.push({
            id: fileId,
            name: rawTitle,
            url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
            mediaType: VIDEO_EXTS.has(ext) ? "video" : "photo",
          });
        }
      }

      if (discovered.length === 0) {
        const fileLinkRegex = /\/file\/d\/([a-zA-Z0-9_-]{15,})/g;
        let m2: RegExpExecArray | null;
        let count = 1;
        while ((m2 = fileLinkRegex.exec(html)) !== null) {
          const fId = m2[1];
          if (!seenIds.has(fId) && fId !== folderId) {
            seenIds.add(fId);
            discovered.push({
              id: fId,
              name: `Drive_Visual_${count++}.jpg`,
              url: `https://drive.google.com/thumbnail?id=${fId}&sz=w1200`,
              mediaType: "photo",
            });
          }
        }
      }

      if (discovered.length > 0) {
        return discovered.slice(0, 30);
      }
    }

    throw new Error(
      "Could not read files from this Google Drive folder. Make sure folder access is set to 'Anyone with the link can view'."
    );
  }

  if (singleFileMatch) {
    const fileId = singleFileMatch[1];
    return [
      {
        id: fileId,
        name: `Google_Drive_Asset_${fileId.slice(0, 6)}.jpg`,
        url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
        mediaType: "photo",
      },
    ];
  }

  throw new Error(
    "Paste a valid shared Google Drive folder link (https://drive.google.com/drive/folders/...) or file link."
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tilts = [-1.3, 1.2, -0.9, 1.4, -1.1, 0.8];

    // 1. Lightweight Metadata-Only Classification for Browser Folder Picker (Zero file upload to server!)
    if (Array.isArray(body.metadataList) && body.metadataList.length > 0) {
      const metaList: { name: string; folderHint?: string; dateIso: string }[] =
        body.metadataList.slice(0, 36);
      const aiMap = await classifyMetadataWithMetaMuse(metaList);
      return NextResponse.json({
        success: true,
        classifications: aiMap,
      });
    }

    // 2. Google Drive Shared Link Resolution (Streams directly in browser from Google CDN, zero server storage!)
    const driveUrl = String(body.driveUrl || "").trim();
    if (driveUrl) {
      const driveFiles = await resolveGoogleDriveWebLinks(driveUrl);
      const todayIso = new Date().toISOString().slice(0, 10);
      const displayDate = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const metaInput = driveFiles.map((df) => ({
        name: df.name,
        folderHint: "Google Drive Cloud",
        dateIso: todayIso,
      }));
      const metaMap = await classifyMetadataWithMetaMuse(metaInput);

      const items: GalleryMediaItem[] = driveFiles.map((df, idx) => {
        const ai = metaMap[idx];
        const category: Exclude<LifeCategory, "insight"> =
          ai?.category && SUPPLY_LABELS[ai.category as Exclude<LifeCategory, "insight">]
            ? ai.category
            : inferCategoryHeuristic(df.name, "Google Drive", idx);

        const lowerName = df.name.toLowerCase();
        const isAiFile =
          /(gemini|chatgpt|dalle|midjourney|mj_|comfyui|stable|sdxl|flux|imagen|firefly|ideogram|runway|pika|kling|luma|sora|muse[-_]?image|ai[-_]?gen|synthetic)/i.test(
            lowerName
          );
        const placeMatch = lowerName.match(
          /\b(gokarna|goa|coorg|chikmagalur|hampi|mysore|mysuru|pondicherry|ooty|munnar|kerala|manali|ladakh|jaipur|mumbai|bengaluru|bangalore|hyderabad|chennai|rishikesh|kyoto|dolomites|bali|dubai)\b/i
        );
        const placeTitle = placeMatch
          ? placeMatch[1].charAt(0).toUpperCase() + placeMatch[1].slice(1).toLowerCase()
          : null;

        let folderType: GalleryMediaItem["folderType"] = "personal";
        let folderId = "folder-personal";
        let folderTitle = "Portraits & Camera";
        let folderSubtitle = "Cloud Camera Stream";
        let cameraOrAiBadge = "Cloud Photo";

        if (isAiFile) {
          if (df.mediaType === "video") {
            folderType = "ai_videos";
            folderId = "folder-ai-videos";
            folderTitle = "AI Videos & Motion";
            folderSubtitle = "Separated Synthetic Video Clips";
            cameraOrAiBadge = "AI Video";
          } else {
            folderType = "ai_images";
            folderId = "folder-ai-images";
            folderTitle = "AI-Created Images";
            folderSubtitle = "Separated Synthetic & AI Art";
            cameraOrAiBadge = "AI Image";
          }
        } else if (placeTitle || category === "travel") {
          const pName = placeTitle || ai?.location || "Trips";
          const slug = pName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          folderType = "travel_place";
          folderId = `folder-travel-${slug}`;
          folderTitle = `Travel • ${pName}`;
          folderSubtitle = `Travel Location • ${pName}`;
          cameraOrAiBadge = `GPS • ${pName}`;
        } else if (category === "family" || category === "relationships") {
          folderType = "family";
          folderId = "folder-family";
          folderTitle = "Family & Bonds";
          folderSubtitle = "Home, Gatherings & Inner Circle";
          cameraOrAiBadge = "Family Album";
        } else if (category === "work") {
          folderType = "workplace";
          folderId = "folder-workplace";
          folderTitle = "Office & Workplace";
          folderSubtitle = "Studio Desk, Screens & Builds";
          cameraOrAiBadge = "Office Camera";
        } else {
          folderType = "portraits";
          folderId = "folder-portraits";
          folderTitle = "Portraits & Camera";
          folderSubtitle = "Mobile Camera & Portraits";
          cameraOrAiBadge = "Camera Portrait";
        }

        return {
          id: `gdrive-${df.id}-${idx}`,
          title:
            ai?.title ||
            df.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          url: df.url,
          category,
          date: todayIso,
          displayDate,
          location: placeTitle || ai?.location || folderTitle.replace("Travel • ", ""),
          source: "google_drive",
          mediaType: df.mediaType,
          aiTags:
            Array.isArray(ai?.aiTags) && ai.aiTags.length > 0
              ? ai.aiTags.slice(0, 3)
              : [folderTitle, cameraOrAiBadge],
          aspectSummary: cameraOrAiBadge,
          matchedVariable: VAR_KEYS[category],
          reelReady: true,
          supplyDeck: SUPPLY_LABELS[category],
          creativeInsight:
            ai?.creativeInsight ||
            `Sorted into ${folderTitle}.`,
          tiltDeg: tilts[idx % tilts.length],
          folderId,
          folderTitle,
          folderSubtitle,
          folderType,
          isAiGenerated: isAiFile,
          cameraOrAiBadge,
        };
      });

      return NextResponse.json({
        success: true,
        source: "google_drive_link",
        count: items.length,
        items,
      });
    }

    return NextResponse.json(
      { success: false, error: "Provide a Google Drive link or folder metadata." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to resolve web gallery link.",
      },
      { status: 500 }
    );
  }
}
