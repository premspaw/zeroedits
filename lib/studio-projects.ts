import path from "path";
import fs from "fs";

export type ProjectFormatType =
  | "series"
  | "documentary"
  | "explainer"
  | "procedural"
  | "brand"
  | "personalized";

export type AspectRatioType = "9:16" | "1:1" | "16:9" | "4:5";

export interface LockedMemorySettings {
  isToneLocked: boolean;
  tonality: string; // e.g. "punchy" | "calm" | "cinematic" | "hormozi" | "humorous" | "dramatic"
  toneBible: string;

  isVoiceLocked: boolean;
  voice: string; // e.g. "EN-IN" | "EN-US" | "HI-VIHAAN" | "HI-ANANYA" | "KN-DIVYA" | "KN-KIRAN"
  voiceSpeed?: number;
  voicePitch?: number;

  isTemplateLocked: boolean;
  template: string; // e.g. "cutout" | "paperCut" | "clay3d" | "procedural" | "blackNeon" | "minimal"
  templateStyleName?: string;
  visualRules?: string;

  aspectRatio: AspectRatioType;
}

export interface ProjectEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  hook: string;
  script?: string;
  status: "planned" | "in_progress" | "ready";
  reelId?: string;
  createdAt: string;
}

export interface StudioProject {
  id: string;
  title: string;
  formatType: ProjectFormatType;
  description: string;
  storyPrompt?: string;
  goal: "personal-brand" | "education" | "business" | "entertainment";

  lockedMemory: LockedMemorySettings;

  seriesMeta?: {
    seriesName: string;
    currentEpisode: number;
    totalPlannedEpisodes?: number;
    episodes: ProjectEpisode[];
    seriesArc?: string;
  };

  databaseFileName: string;
  activityLog: Array<{
    timestamp: string;
    action: string;
    details: string;
  }>;

  createdAt: string;
  updatedAt: string;
}

export const PROJECTS_DIR = path.join(process.cwd(), "data", "storybank", "projects");
export const PROJECTS_INDEX_FILE = path.join(PROJECTS_DIR, "index.json");

export function ensureProjectsDir(): void {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROJECTS_INDEX_FILE)) {
    fs.writeFileSync(PROJECTS_INDEX_FILE, JSON.stringify({ projects: [] }, null, 2), "utf-8");
  }
}

export function listProjectsFromDisk(): StudioProject[] {
  ensureProjectsDir();
  try {
    if (!fs.existsSync(PROJECTS_INDEX_FILE)) return [];
    const indexData = JSON.parse(fs.readFileSync(PROJECTS_INDEX_FILE, "utf-8"));
    const projectList: StudioProject[] = [];
    for (const item of indexData.projects || []) {
      const projFile = path.join(PROJECTS_DIR, `${item.id}.json`);
      if (fs.existsSync(projFile)) {
        try {
          const content = JSON.parse(fs.readFileSync(projFile, "utf-8"));
          projectList.push(content);
        } catch {
          projectList.push(item);
        }
      } else {
        projectList.push(item);
      }
    }
    return projectList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error("Error reading projects index:", err);
    return [];
  }
}

export function getProjectFromDisk(id: string): StudioProject | null {
  ensureProjectsDir();
  const projFile = path.join(PROJECTS_DIR, `${id}.json`);
  if (!fs.existsSync(projFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(projFile, "utf-8")) as StudioProject;
  } catch (err) {
    console.error("Error reading project file:", err);
    return null;
  }
}

export function saveProjectToDisk(project: StudioProject): StudioProject {
  ensureProjectsDir();
  const now = new Date().toISOString();
  const updatedProject: StudioProject = {
    ...project,
    updatedAt: now,
    createdAt: project.createdAt || now,
    databaseFileName: `${project.id}.json`,
  };

  // 1. Write the main JSON database file
  const projFile = path.join(PROJECTS_DIR, `${project.id}.json`);
  fs.writeFileSync(projFile, JSON.stringify(updatedProject, null, 2), "utf-8");

  // 2. Write a human-readable Markdown summary file in data/storybank/projects/
  const mdFile = path.join(PROJECTS_DIR, `${project.id}.md`);
  const mdContent = `# Project: ${updatedProject.title}
- **ID**: \`${updatedProject.id}\`
- **Format**: ${updatedProject.formatType}
- **Created**: ${updatedProject.createdAt}
- **Last Updated**: ${updatedProject.updatedAt}

## Locked Memory Settings
- **Tone**: ${updatedProject.lockedMemory.tonality} (Locked: ${updatedProject.lockedMemory.isToneLocked ? "YES" : "NO"})
- **Voiceover**: ${updatedProject.lockedMemory.voice} (Locked: ${updatedProject.lockedMemory.isVoiceLocked ? "YES" : "NO"})
- **Template Style**: ${updatedProject.lockedMemory.template} (Locked: ${updatedProject.lockedMemory.isTemplateLocked ? "YES" : "NO"})
- **Aspect Ratio**: ${updatedProject.lockedMemory.aspectRatio}
- **Tone Bible**: ${updatedProject.lockedMemory.toneBible || "Consistent with series tone"}

${
  updatedProject.seriesMeta
    ? `## Series Meta
- **Series Title**: ${updatedProject.seriesMeta.seriesName}
- **Current Episode**: ${updatedProject.seriesMeta.currentEpisode} of ${updatedProject.seriesMeta.totalPlannedEpisodes || "Ongoing"}
- **Episodes**:
${(updatedProject.seriesMeta.episodes || [])
  .map(
    (ep) =>
      `  - Ep ${ep.episodeNumber}: ${ep.title} [Status: ${ep.status}] (Hook: "${ep.hook}")`
  )
  .join("\n")}
`
    : ""
}

## Activity Log
${(updatedProject.activityLog || [])
  .map((log) => `- [${log.timestamp}] **${log.action}**: ${log.details}`)
  .join("\n")}
`;
  fs.writeFileSync(mdFile, mdContent, "utf-8");

  // 3. Update master index.json
  try {
    let indexData = { projects: [] as any[] };
    if (fs.existsSync(PROJECTS_INDEX_FILE)) {
      indexData = JSON.parse(fs.readFileSync(PROJECTS_INDEX_FILE, "utf-8"));
    }
    const existingIndex = indexData.projects.findIndex((p: any) => p.id === project.id);
    const summary = {
      id: updatedProject.id,
      title: updatedProject.title,
      formatType: updatedProject.formatType,
      aspectRatio: updatedProject.lockedMemory.aspectRatio,
      template: updatedProject.lockedMemory.template,
      voice: updatedProject.lockedMemory.voice,
      tonality: updatedProject.lockedMemory.tonality,
      isSeries: updatedProject.formatType === "series",
      currentEpisode: updatedProject.seriesMeta?.currentEpisode ?? 1,
      databaseFileName: updatedProject.databaseFileName,
      updatedAt: updatedProject.updatedAt,
      createdAt: updatedProject.createdAt,
    };

    if (existingIndex >= 0) {
      indexData.projects[existingIndex] = summary;
    } else {
      indexData.projects.unshift(summary);
    }
    fs.writeFileSync(PROJECTS_INDEX_FILE, JSON.stringify(indexData, null, 2), "utf-8");
  } catch (err) {
    console.error("Error updating project index.json:", err);
  }

  return updatedProject;
}

export function deleteProjectFromDisk(id: string): boolean {
  ensureProjectsDir();
  try {
    const projFile = path.join(PROJECTS_DIR, `${id}.json`);
    const mdFile = path.join(PROJECTS_DIR, `${id}.md`);
    if (fs.existsSync(projFile)) fs.unlinkSync(projFile);
    if (fs.existsSync(mdFile)) fs.unlinkSync(mdFile);

    if (fs.existsSync(PROJECTS_INDEX_FILE)) {
      const indexData = JSON.parse(fs.readFileSync(PROJECTS_INDEX_FILE, "utf-8"));
      indexData.projects = (indexData.projects || []).filter((p: any) => p.id !== id);
      fs.writeFileSync(PROJECTS_INDEX_FILE, JSON.stringify(indexData, null, 2), "utf-8");
    }
    return true;
  } catch (err) {
    console.error("Error deleting project:", err);
    return false;
  }
}

