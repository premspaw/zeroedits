import fs from "fs";

const SAMPLE_RATE = 24_000;
const MIN_CUE_SPACING = 0.4;
const MAX_CUES_PER_TEN_SECONDS = 4;

export type CreateSoundBeat = {
  id?: number | string;
  start?: number;
  end?: number;
  sound?: string;
  transition?: string;
  animationCues?: Array<{ time?: number; action?: string }>;
};

export type CreateSoundCue = {
  time: number;
  kind: "pop" | "whoosh" | "impact" | "chime" | "zap" | "click" | "rain" | "footstep" | "splash";
  description: string;
};

function effectKind(description: string): CreateSoundCue["kind"] | null {
  const text = description.toLowerCase();
  if (!text.trim() || /\b(no (?:sound|sfx|effect)|silence|silent|ambient only|music only)\b/.test(text)) return null;
  if (/\b(rain|raindrop|drizzle|downpour)\b/.test(text)) return "rain";
  if (/\b(footstep|footsteps|walking|running steps|stomp)\b/.test(text)) return "footstep";
  if (/\b(splash|splatter|water drop|waterfall|wave crash)\b/.test(text)) return "splash";
  if (/\b(thunder|explosion|impact|slam|boom|thud|hit|crash|punch|bass drop)\b/.test(text)) return "impact";
  if (/\b(zap|electric|glitch|laser|spark|static)\b/.test(text)) return "zap";
  if (/\b(chime|bell|ding|twinkle|shimmer|magic|success)\b/.test(text)) return "chime";
  if (/\b(whoosh|swoosh|swish|sweep|wind|wipe|transition|riser)\b/.test(text)) return "whoosh";
  if (/\b(click|tap|tick|snap|button)\b/.test(text)) return "click";
  if (/\b(pop|plop|bounce|pulse|accent)\b/.test(text)) return "pop";
  return /\b(music|score|song|melody|ambience|atmosphere)\b/.test(text) ? null : "pop";
}

export function planCreateSoundEffects(beats: CreateSoundBeat[], duration: number): CreateSoundCue[] {
  const selected: CreateSoundCue[] = [];
  const sorted = [...beats].sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
  for (const beat of sorted) {
    const start = Number(beat.start);
    const end = Number(beat.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || start >= duration) continue;
    const description = String(beat.sound || "").trim();
    const kind = effectKind(description);
    if (!kind) continue;

    const matchingCue = (beat.animationCues || []).find((cue) => {
      const time = Number(cue.time);
      return Number.isFinite(time) && time >= start && time < end &&
        /entrance|reveal|impact|hit|transition|pop|appear/i.test(String(cue.action || ""));
    });
    const cueTime = matchingCue ? Number(matchingCue.time) : start + Math.min(0.12, (end - start) / 4);
    const time = Math.max(0, Math.min(duration - 0.05, cueTime));
    if (selected.length && time - selected[selected.length - 1].time < MIN_CUE_SPACING) continue;
    if (selected.filter((previous) => previous.time > time - 10).length >= MAX_CUES_PER_TEN_SECONDS) continue;
    selected.push({ time: +time.toFixed(3), kind, description });
  }
  return selected;
}

function cueSample(kind: CreateSoundCue["kind"], t: number, length: number, random: () => number): number {
  const p = t / length;
  const fade = Math.max(0, 1 - p);
  const noise = random() * 2 - 1;
  if (kind === "rain") {
    const envelope = Math.min(1, t * 18) * Math.min(1, (length - t) * 7);
    return noise * (0.04 + (random() > 0.985 ? 0.25 : 0)) * envelope;
  }
  if (kind === "footstep") {
    const phase = t % 0.29;
    return (Math.sin(2 * Math.PI * (100 - 55 * phase) * phase) * 0.75 + noise * 0.25) * Math.exp(-32 * phase) * 0.3;
  }
  if (kind === "splash") {
    return (noise * 0.8 + Math.sin(2 * Math.PI * 430 * t) * 0.2) * Math.exp(-10 * t) * Math.min(1, t * 100) * 0.25;
  }
  if (kind === "whoosh") {
    const envelope = Math.sin(Math.PI * p) ** 2;
    return (noise * 0.7 + Math.sin(2 * Math.PI * (180 + 360 * p) * t) * 0.3) * envelope * 0.25;
  }
  if (kind === "impact") {
    const frequency = 145 - 100 * p;
    return (Math.sin(2 * Math.PI * frequency * t) * 0.75 + noise * Math.exp(-50 * t) * 0.25) * Math.exp(-13 * t) * 0.34;
  }
  if (kind === "chime") {
    return (Math.sin(2 * Math.PI * 880 * t) * 0.65 + Math.sin(2 * Math.PI * 1320 * t) * 0.35) * Math.exp(-7 * t) * 0.19;
  }
  if (kind === "zap") {
    const frequency = 1750 - 1300 * p;
    return (Math.sin(2 * Math.PI * frequency * t) * 0.75 + noise * 0.25) * Math.exp(-16 * t) * 0.19;
  }
  if (kind === "click") {
    return (noise * 0.75 + Math.sin(2 * Math.PI * 1900 * t) * 0.25) * Math.exp(-90 * t) * 0.2;
  }
  const frequency = 760 - 460 * p;
  return Math.sin(2 * Math.PI * frequency * t) * Math.exp(-25 * t) * fade * 0.22;
}

function cueDuration(kind: CreateSoundCue["kind"]): number {
  if (kind === "whoosh") return 0.42;
  if (kind === "rain") return 0.75;
  if (kind === "footstep") return 0.58;
  if (kind === "splash") return 0.45;
  if (kind === "chime") return 0.55;
  if (kind === "impact") return 0.34;
  if (kind === "zap") return 0.28;
  if (kind === "click") return 0.12;
  return 0.22;
}

/** Render one deterministic, quiet effects bed that can be synced in preview and MP4. */
export function writeCreateSoundEffectsWav(cues: CreateSoundCue[], duration: number, outputPath: string): void {
  const frames = Math.max(1, Math.ceil(duration * SAMPLE_RATE));
  const samples = new Float32Array(frames * 2);
  cues.forEach((cue, index) => {
    const firstFrame = Math.round(cue.time * SAMPLE_RATE);
    const length = cueDuration(cue.kind);
    const count = Math.min(Math.ceil(length * SAMPLE_RATE), frames - firstFrame);
    let seed = (0x9e3779b9 ^ Math.round(cue.time * 1000) ^ index) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let i = 0; i < count; i++) {
      const value = cueSample(cue.kind, i / SAMPLE_RATE, length, random);
      const frame = (firstFrame + i) * 2;
      samples[frame] += value * 0.72;
      samples[frame + 1] += value * 0.68;
    }
  });

  const wav = Buffer.allocUnsafe(44 + samples.length * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + samples.length * 2, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(outputPath, wav);
}
