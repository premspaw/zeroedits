import path from "path";
import fs from "fs";

export const BANK_DIR = path.join(process.cwd(), "data", "storybank");
export const PERSONAL_MD = path.join(BANK_DIR, "personal.md");
export const RAW_BANK_MD = path.join(BANK_DIR, "raw-bank.md");

export const STORY_GOALS = ["personal-brand", "business", "startup"] as const;
export type StoryGoal = (typeof STORY_GOALS)[number];

export function ensureBankDir(): void {
  fs.mkdirSync(path.join(BANK_DIR, "audio"), { recursive: true });
  if (!fs.existsSync(PERSONAL_MD)) {
    fs.writeFileSync(
      PERSONAL_MD,
      `# Personal Memory — Story Bank\n\n## Profile\n- Name: \n- Goal: personal-brand\n- Niche: \n- Voice notes: \n\n## Stories\n\n(none yet — check in daily and real moments will stack up here.)\n`,
      "utf-8"
    );
  }
  if (!fs.existsSync(RAW_BANK_MD)) {
    fs.writeFileSync(RAW_BANK_MD, `# Raw Bank — daily check-ins\n`, "utf-8");
  }
}

export function resetAllBankData(): void {
  ensureBankDir();
  fs.writeFileSync(RAW_BANK_MD, `# Raw Bank — daily check-ins\n`, "utf-8");
  fs.writeFileSync(
    PERSONAL_MD,
    `# Personal Memory — Story Bank\n\n## Profile\n- Name: \n- Goal: personal-brand\n- Niche: \n- Voice notes: \n\n## Stories\n\n(none yet — check in daily and real moments will stack up here.)\n`,
    "utf-8"
  );
  const audioDir = path.join(BANK_DIR, "audio");
  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(audioDir, file));
      } catch {}
    }
  }
}

/** Project-local interpreter (.venv) first, system python as fallback. */
export function resolveStoryPython(): string {
  const venvPython =
    process.platform === "win32"
      ? path.join(process.cwd(), ".venv", "Scripts", "python.exe")
      : path.join(process.cwd(), ".venv", "bin", "python");
  try {
    if (fs.existsSync(venvPython)) return venvPython;
  } catch {}
  return "python";
}
