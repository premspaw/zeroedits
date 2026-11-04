import { NextRequest, NextResponse } from "next/server";
import {
  listProjectsFromDisk,
  getProjectFromDisk,
  saveProjectToDisk,
  deleteProjectFromDisk,
  type StudioProject,
} from "@/lib/studio-projects";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const project = getProjectFromDisk(id);
      if (!project) {
        return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, project });
    }

    const projects = listProjectsFromDisk();
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    console.error("Failed to read studio projects:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to read projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<StudioProject>;
    if (!body.title || !body.formatType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title and formatType" },
        { status: 400 }
      );
    }

    const id = body.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const fullProject: StudioProject = {
      id,
      title: body.title,
      formatType: body.formatType,
      description: body.description || "",
      storyPrompt: body.storyPrompt || "",
      goal: body.goal || "personal-brand",
      lockedMemory: {
        isToneLocked: body.lockedMemory?.isToneLocked ?? true,
        tonality: body.lockedMemory?.tonality || "punchy",
        toneBible: body.lockedMemory?.toneBible || `Consistent narrative tone for ${body.title}`,
        isVoiceLocked: body.lockedMemory?.isVoiceLocked ?? true,
        voice: body.lockedMemory?.voice || "EN-IN",
        voiceSpeed: body.lockedMemory?.voiceSpeed ?? 1.0,
        voicePitch: body.lockedMemory?.voicePitch ?? 1.0,
        isTemplateLocked: body.lockedMemory?.isTemplateLocked ?? true,
        template: body.lockedMemory?.template || "cutout",
        templateStyleName: body.lockedMemory?.templateStyleName || "Standard",
        visualRules: body.lockedMemory?.visualRules || "",
        aspectRatio: body.lockedMemory?.aspectRatio || "9:16",
      },
      seriesMeta: body.seriesMeta
        ? {
            seriesName: body.seriesMeta.seriesName || body.title,
            currentEpisode: body.seriesMeta.currentEpisode ?? 1,
            totalPlannedEpisodes: body.seriesMeta.totalPlannedEpisodes ?? 5,
            episodes: body.seriesMeta.episodes || [
              {
                id: `ep-1-${Date.now()}`,
                episodeNumber: 1,
                title: `${body.title} - Episode 1`,
                hook: body.storyPrompt || "Series Premiere",
                status: "in_progress",
                createdAt: now,
              },
            ],
            seriesArc: body.seriesMeta.seriesArc || "",
          }
        : undefined,
      databaseFileName: `${id}.json`,
      activityLog: body.activityLog || [
        {
          timestamp: new Date().toLocaleTimeString(),
          action: "Created Database File",
          details: `Created project database "${id}.json" with locked ${body.formatType} memory settings.`,
        },
      ],
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    const saved = saveProjectToDisk(fullProject);
    return NextResponse.json({
      success: true,
      project: saved,
      databaseFileName: saved.databaseFileName,
      message: `Database file ${saved.databaseFileName} created successfully and memory locked.`,
    });
  } catch (error: any) {
    console.error("Failed to save studio project:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to save project" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing project id" }, { status: 400 });
    }
    const deleted = deleteProjectFromDisk(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}

