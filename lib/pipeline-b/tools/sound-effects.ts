import fs from "fs";
import type { EditPlan, VisualOverlayItem } from "../types.ts";

const SAMPLE_RATE = 44_100;
const EFFECT_DURATION = 0.16;
const MIN_SPACING_SECONDS = 0.14;
const MAX_EVENTS_PER_TEN_SECONDS = 5;

/**
 * Build restrained, deterministic UI-pop cues for the explicit visual beats in an edit.
 * The clip's original dialogue remains the main audio; effects are quiet, short, and
 * limited to visual overlays that already carry a sound cue in the edit plan.
 */
export function writeEditSoundEffectsWav(editPlan: EditPlan, outputPath: string): number {
  const cues = selectSoundEffectCues(editPlan);
  if (cues.length === 0) return 0;

  const frameCount = Math.max(1, Math.ceil(editPlan.cleanDuration * SAMPLE_RATE));
  const samples = new Float32Array(frameCount * 2);
  for (let cueIndex = 0; cueIndex < cues.length; cueIndex++) {
    const cue = cues[cueIndex];
    const onset = Math.max(0, cue.timestamp);
    const firstFrame = Math.round(onset * SAMPLE_RATE);
    const cueSamples = Math.min(Math.ceil(EFFECT_DURATION * SAMPLE_RATE), frameCount - firstFrame);
    if (cueSamples <= 0) continue;

    // A soft low pop with a faint, very short high transient. This reads as a UI arrival
    // without adding a whoosh to every cut or masking speech intelligibility.
    const pan = cueIndex % 2 === 0 ? -0.12 : 0.12;
    const leftGain = Math.sqrt((1 - pan) * 0.5) * 0.19;
    const rightGain = Math.sqrt((1 + pan) * 0.5) * 0.19;
    const seed = hashString(cue.id || `${cue.timestamp}:${cue.content}`);
    const phase = (seed % 6283) / 1000;

    for (let i = 0; i < cueSamples; i++) {
      const t = i / SAMPLE_RATE;
      const progress = t / EFFECT_DURATION;
      const bodyEnvelope = Math.exp(-28 * t) * Math.min(1, t / 0.004);
      const bodyPhase = 2 * Math.PI * (680 * t - 1050 * t * t) + phase;
      const body = Math.sin(bodyPhase) * bodyEnvelope;
      const transient = i < SAMPLE_RATE * 0.018
        ? (Math.sin(2 * Math.PI * 3100 * t + phase) * Math.exp(-240 * t))
        : 0;
      const tail = Math.exp(-46 * t) * Math.sin(2 * Math.PI * 420 * t + phase * 0.37);
      const value = (body * 0.72 + transient * 0.12 + tail * 0.16) * Math.min(1, 1.4 - progress * 0.4);
      const frame = (firstFrame + i) * 2;
      samples[frame] += value * leftGain;
      samples[frame + 1] += value * rightGain;
    }
  }

  fs.writeFileSync(outputPath, encodePcm16Wav(samples, SAMPLE_RATE, 2));
  return cues.length;
}

function selectSoundEffectCues(editPlan: EditPlan): VisualOverlayItem[] {
  const candidates = (editPlan.visualPlan || [])
    .filter((item) =>
      item.type === "sound_effect" ||
      (Boolean(item.soundName) && (item.type === "image_overlay" || item.type === "icon_badge"))
    )
    .filter((item) => Number.isFinite(item.timestamp) && item.timestamp >= 0 && item.timestamp < editPlan.cleanDuration)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Enforce the sound-design restraint rule on a rolling ten-second window and avoid
  // near-simultaneous layered pops when two visuals enter together.
  const selected: VisualOverlayItem[] = [];
  for (const cue of candidates) {
    if (selected.length && cue.timestamp - selected[selected.length - 1].timestamp < MIN_SPACING_SECONDS) continue;
    const windowStart = cue.timestamp - 10;
    const recentCount = selected.filter((previous) => previous.timestamp > windowStart).length;
    if (recentCount >= MAX_EVENTS_PER_TEN_SECONDS) continue;
    selected.push(cue);
  }
  return selected;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function encodePcm16Wav(samples: Float32Array, sampleRate: number, channels: number): Buffer {
  const dataBytes = samples.length * 2;
  const wav = Buffer.allocUnsafe(44 + dataBytes);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * 2, 28);
  wav.writeUInt16LE(channels * 2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    wav.writeInt16LE(Math.round(clipped * 32767), 44 + i * 2);
  }
  return wav;
}
