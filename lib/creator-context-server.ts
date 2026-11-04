import fs from "node:fs/promises";
import path from "node:path";
import { BANK_DIR } from "./story-bank";
import {
  formatCreatorContextForPrompt,
  sanitizeCreatorContextSnapshot,
  type CreatorContextSnapshot,
} from "./creator-context";

const CONTEXT_FILE = path.join(BANK_DIR, "creator-context.json");

export async function readCreatorContextSnapshot(): Promise<CreatorContextSnapshot | null> {
  try {
    const raw = await fs.readFile(CONTEXT_FILE, "utf8");
    return sanitizeCreatorContextSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeCreatorContextSnapshot(
  snapshot: CreatorContextSnapshot
): Promise<void> {
  await fs.mkdir(BANK_DIR, { recursive: true });
  const tempFile = `${CONTEXT_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(snapshot), "utf8");
  await fs.rename(tempFile, CONTEXT_FILE);
}

export async function getCreatorContextForPrompt(
  task: string,
  options: { includePersonalArchive?: boolean } = {}
): Promise<string> {
  const snapshot = await readCreatorContextSnapshot();
  return formatCreatorContextForPrompt(snapshot, task, 18000, options.includePersonalArchive !== false);
}
