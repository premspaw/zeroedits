// ============================================================================
// PROCEDURAL (GENERATIVE) ANIMATION ENGINE
// Separates Style (fixed deterministic math + noise renderer) from Story (JSON SceneScript)
// Pure function of time: renderProceduralFrame(ctx, width, height, t, script)
// ============================================================================

export type ProceduralStyleId =
  | "procedural-dusk"
  | "neon-synthwave"
  | "paper-cut-parallax"
  | "particle-galaxy"
  | "kinetic-typography"
  | "ink-wash";

export type ProceduralMoodPreset =
  | "calm"
  | "tense"
  | "dreamy"
  | "epic"
  | "melancholic"
  | "electric"
  | "zen";

export type AspectRatioType = "9:16" | "16:9" | "1:1";

export type TrackKeyframe = [number, number]; // [timeInSeconds, normalizedValue 0..1]

export interface ProceduralTracks {
  timeOfDay?: TrackKeyframe[]; // 0.0 = dawn/morning, 0.35 = noon, 0.65 = dusk/sunset, 1.0 = deep night
  cloudDensity?: TrackKeyframe[]; // 0.0 = clear sky, 1.0 = heavy layered clouds
  wind?: TrackKeyframe[]; // 0.0 = still, 1.0 = strong gale/speed
  cameraDrift?: TrackKeyframe[]; // 0.0 = static, 1.0 = sweeping camera pan/zoom
  intensity?: TrackKeyframe[]; // 0.0 = minimal/serene, 1.0 = dramatic peak
  colorMood?: TrackKeyframe[]; // 0.0 = warm/golden, 0.5 = balanced, 1.0 = cool/cyber/mystic
}

export interface ProceduralElements {
  birds?: number; // 0..24
  fireflies?: number; // 0..100
  lake?: boolean; // water reflection layer in bottom third
  stars?: number; // 0..200
  trees?: number; // 0..30
  lanterns?: number; // 0..40 floating lanterns
  petals?: number; // 0..80 sakura/ink petals
  rain?: number; // 0..100 rain streaks
  snow?: number; // 0..100 snow flakes
  boat?: boolean; // silhouette boat on water
  traveler?: boolean; // silhouette walker on ridge
  grid?: boolean; // perspective grid
}

export interface ProceduralCaption {
  t: number;
  end?: number;
  text: string;
}

export interface ProceduralWordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface ProceduralSceneSegment {
  id: string;
  index: number;
  start: number;
  end: number;
  duration: number;
  style?: ProceduralStyleId;
  mood?: ProceduralMoodPreset;
  headline?: string;
  spokenText?: string;
  visualDesc?: string;
  tracks?: ProceduralTracks;
  elements?: ProceduralElements;
  transition?: "crossfade" | "iris" | "wipe" | "cut";
}

export interface SceneScript {
  title?: string;
  style: ProceduralStyleId;
  aspect: AspectRatioType;
  seed: number;
  duration: number;
  mood?: ProceduralMoodPreset;
  tracks: ProceduralTracks;
  elements: ProceduralElements;
  captions: ProceduralCaption[];
  music: {
    mood: ProceduralMoodPreset | string;
    bpm: number;
  };
  scenes?: ProceduralSceneSegment[];
  words?: ProceduralWordTimestamp[];
}

export interface StyleCatalogItem {
  id: ProceduralStyleId;
  name: string;
  moodLabel: string;
  swatch: string;
  accent: string;
  description: string;
  defaultElements: ProceduralElements;
  knobs: string[];
}

export const PROCEDURAL_STYLE_CATALOG: StyleCatalogItem[] = [
  {
    id: "procedural-dusk",
    name: "Procedural Dusk",
    moodLabel: "Atmospheric Landscape",
    swatch: "linear-gradient(135deg, #1E1B4B 0%, #C2410C 55%, #FDE047 100%)",
    accent: "#F97316",
    description: "Sun-to-moon sky arc, FBM mountain ridges, shimmering lake reflections, birds & fireflies",
    defaultElements: { birds: 6, fireflies: 40, lake: true, stars: 90, trees: 10, traveler: true },
    knobs: ["timeOfDay", "cloudDensity", "wind", "cameraDrift", "intensity"],
  },
  {
    id: "neon-synthwave",
    name: "Neon Synthwave",
    moodLabel: "Outrun Cyber Grid",
    swatch: "linear-gradient(135deg, #090418 0%, #9333EA 50%, #00F0FF 100%)",
    accent: "#00F0FF",
    description: "Retro segmented sunset, 3D perspective wireframe grid, outrun peaks & chromatic scanlines",
    defaultElements: { stars: 110, grid: true, birds: 0, fireflies: 30, lake: false },
    knobs: ["timeOfDay", "wind", "intensity", "cameraDrift", "colorMood"],
  },
  {
    id: "paper-cut-parallax",
    name: "Paper-Cut Parallax",
    moodLabel: "Tactile Diorama",
    swatch: "linear-gradient(135deg, #F5F1E8 0%, #E4491B 55%, #2D4A43 100%)",
    accent: "#E4491B",
    description: "Multi-layered paper craft hills, deckle shadows, hanging sun/moon, pine woods & floating lanterns",
    defaultElements: { birds: 5, lanterns: 18, trees: 14, lake: true, traveler: true },
    knobs: ["timeOfDay", "cloudDensity", "wind", "cameraDrift", "colorMood"],
  },
  {
    id: "particle-galaxy",
    name: "Particle Galaxy",
    moodLabel: "Deep Cosmos",
    swatch: "linear-gradient(135deg, #030712 0%, #4338CA 50%, #EC4899 100%)",
    accent: "#A855F7",
    description: "Spiral nebula clouds, orbital gravity streams, constellation nodes & starfield warp",
    defaultElements: { stars: 180, fireflies: 70, lake: false },
    knobs: ["intensity", "wind", "cameraDrift", "colorMood", "cloudDensity"],
  },
  {
    id: "kinetic-typography",
    name: "Kinetic Typography",
    moodLabel: "Rhythmic Motion Grid",
    swatch: "linear-gradient(135deg, #111111 0%, #E4491B 60%, #FFE600 100%)",
    accent: "#FFE600",
    description: "Swiss brutalist geometric stage, mathematical wave rings, harmonic equalizer & bold word pops",
    defaultElements: { grid: true, fireflies: 25 },
    knobs: ["intensity", "wind", "cameraDrift", "colorMood", "timeOfDay"],
  },
  {
    id: "ink-wash",
    name: "Ink Wash",
    moodLabel: "Sumi-e Watercolor",
    swatch: "linear-gradient(135deg, #F4EFE6 0%, #57534E 55%, #DC2626 100%)",
    accent: "#DC2626",
    description: "Rice-paper ink diffusion, misty brush mountains, swaying bamboo reeds, boat & falling petals",
    defaultElements: { birds: 7, petals: 36, lake: true, boat: true, trees: 8 },
    knobs: ["timeOfDay", "cloudDensity", "wind", "cameraDrift", "intensity"],
  },
];

export const MOOD_PRESET_MAP: Record<
  ProceduralMoodPreset,
  {
    bpm: number;
    tracks: (duration: number) => ProceduralTracks;
    description: string;
  }
> = {
  calm: {
    bpm: 70,
    description: "Gentle dawn-to-dusk transition, soft breeze, tranquil water",
    tracks: (d) => ({
      timeOfDay: [[0, 0.15], [d * 0.5, 0.52], [d, 0.85]],
      cloudDensity: [[0, 0.3], [d, 0.5]],
      wind: [[0, 0.2], [d, 0.35]],
      cameraDrift: [[0, 0.1], [d, 0.6]],
      intensity: [[0, 0.25], [d * 0.6, 0.5], [d, 0.35]],
      colorMood: [[0, 0.2], [d, 0.6]],
    }),
  },
  dreamy: {
    bpm: 64,
    description: "Golden twilight into starlit magic, floating fireflies & mist",
    tracks: (d) => ({
      timeOfDay: [[0, 0.45], [d * 0.5, 0.72], [d, 0.95]],
      cloudDensity: [[0, 0.45], [d, 0.65]],
      wind: [[0, 0.15], [d, 0.3]],
      cameraDrift: [[0, 0.2], [d, 0.8]],
      intensity: [[0, 0.4], [d * 0.5, 0.75], [d, 0.55]],
      colorMood: [[0, 0.4], [d, 0.85]],
    }),
  },
  tense: {
    bpm: 118,
    description: "Gathering storm clouds, high wind velocity, dramatic lighting shift",
    tracks: (d) => ({
      timeOfDay: [[0, 0.55], [d * 0.4, 0.8], [d, 0.98]],
      cloudDensity: [[0, 0.5], [d * 0.6, 0.9], [d, 0.85]],
      wind: [[0, 0.45], [d * 0.5, 0.95], [d, 0.85]],
      cameraDrift: [[0, 0.3], [d, 0.95]],
      intensity: [[0, 0.5], [d * 0.7, 0.95], [d, 0.8]],
      colorMood: [[0, 0.6], [d, 0.9]],
    }),
  },
  epic: {
    bpm: 128,
    description: "Sweeping cinematic horizon, soaring energy & radiant climax",
    tracks: (d) => ({
      timeOfDay: [[0, 0.0], [d * 0.5, 0.5], [d, 1.0]],
      cloudDensity: [[0, 0.35], [d * 0.5, 0.7], [d, 0.45]],
      wind: [[0, 0.3], [d * 0.6, 0.85], [d, 0.6]],
      cameraDrift: [[0, 0.0], [d, 1.0]],
      intensity: [[0, 0.3], [d * 0.65, 1.0], [d, 0.75]],
      colorMood: [[0, 0.1], [d * 0.5, 0.5], [d, 0.9]],
    }),
  },
  melancholic: {
    bpm: 60,
    description: "Late dusk into quiet midnight, misty reflections & slow drift",
    tracks: (d) => ({
      timeOfDay: [[0, 0.6], [d, 0.95]],
      cloudDensity: [[0, 0.55], [d, 0.75]],
      wind: [[0, 0.15], [d, 0.25]],
      cameraDrift: [[0, 0.1], [d, 0.45]],
      intensity: [[0, 0.2], [d, 0.45]],
      colorMood: [[0, 0.65], [d, 0.9]],
    }),
  },
  electric: {
    bpm: 135,
    description: "High-speed cyber pulse, neon overdrive & rapid wave harmonics",
    tracks: (d) => ({
      timeOfDay: [[0, 0.7], [d * 0.5, 0.88], [d, 0.75]],
      cloudDensity: [[0, 0.2], [d, 0.4]],
      wind: [[0, 0.65], [d * 0.5, 1.0], [d, 0.9]],
      cameraDrift: [[0, 0.2], [d, 1.0]],
      intensity: [[0, 0.6], [d * 0.5, 1.0], [d, 0.9]],
      colorMood: [[0, 0.8], [d, 1.0]],
    }),
  },
  zen: {
    bpm: 56,
    description: "Minimalist ink stillness, gentle ripples & meditative breath",
    tracks: (d) => ({
      timeOfDay: [[0, 0.2], [d, 0.6]],
      cloudDensity: [[0, 0.25], [d, 0.45]],
      wind: [[0, 0.12], [d, 0.22]],
      cameraDrift: [[0, 0.05], [d, 0.4]],
      intensity: [[0, 0.18], [d, 0.35]],
      colorMood: [[0, 0.3], [d, 0.5]],
    }),
  },
};

// ============================================================================
// 1. SEEDED RANDOMNESS & DETERMINISTIC NOISE ENGINE
// ============================================================================

export function mulberry32(seed: number): () => number {
  let a = (seed >>> 0) + 0x6d2b79f5;
  return function () {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2D(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function valueNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  const aa = hash2D(xi, yi, seed);
  const ba = hash2D(xi + 1, yi, seed);
  const ab = hash2D(xi, yi + 1, seed);
  const bb = hash2D(xi + 1, yi + 1, seed);

  return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
}

export function fbm2D(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise2D(x * frequency, y * frequency, seed + i * 101);
    maxVal += amplitude;
    frequency *= 2.02;
    amplitude *= 0.5;
  }
  return maxVal > 0 ? value / maxVal : 0;
}

// ============================================================================
// 2. TRACK INTERPOLATION & COLOR HELPERS
// ============================================================================

export function sampleTrack(
  track: TrackKeyframe[] | undefined,
  t: number,
  fallback = 0.5
): number {
  if (!Array.isArray(track) || track.length === 0) return fallback;
  if (track.length === 1) return Math.max(0, Math.min(1, Number(track[0][1]) || fallback));

  if (t <= track[0][0]) return Math.max(0, Math.min(1, track[0][1]));
  const last = track[track.length - 1];
  if (t >= last[0]) return Math.max(0, Math.min(1, last[1]));

  for (let i = 0; i < track.length - 1; i++) {
    const [t0, v0] = track[i];
    const [t1, v1] = track[i + 1];
    if (t >= t0 && t <= t1) {
      const span = Math.max(0.0001, t1 - t0);
      const local = (t - t0) / span;
      const eased = 0.5 - 0.5 * Math.cos(local * Math.PI);
      return Math.max(0, Math.min(1, lerp(v0, v1, eased)));
    }
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0");
  const num = parseInt(full.slice(0, 6), 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function lerpColor(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(lerp(r1, r2, clamped));
  const g = Math.round(lerp(g1, g2, clamped));
  const b = Math.round(lerp(b1, b2, clamped));
  return `rgb(${r}, ${g}, ${b})`;
}

export function lerpMultiStopColor(stops: string[], t: number): string {
  if (stops.length === 0) return "#000000";
  if (stops.length === 1) return stops[0];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  return lerpColor(stops[idx], stops[idx + 1], frac);
}

// ============================================================================
// 3. SCHEMA VALIDATION & NORMALIZATION
// ============================================================================

export function inferProceduralStyleFromText(text: string): ProceduralStyleId {
  const lower = (text || "").toLowerCase();
  if (/synthwave|neon|cyber|outrun|grid|retro|vaporwave|laser|matrix/i.test(lower)) {
    return "neon-synthwave";
  }
  if (/paper|cutout|diorama|origami|craft|cardboard|layered hill/i.test(lower)) {
    return "paper-cut-parallax";
  }
  if (/galaxy|space|cosmos|nebula|universe|planet|starfield|quantum|orbit|astronaut/i.test(lower)) {
    return "particle-galaxy";
  }
  if (/kinetic|typography|type|manifesto|quote|bold text|swiss|brutalist|explain/i.test(lower)) {
    return "kinetic-typography";
  }
  if (/ink|wash|sumi|zen|bamboo|calligraphy|watercolor|samurai|haiku|monk|lotus|petal/i.test(lower)) {
    return "ink-wash";
  }
  return "procedural-dusk";
}

export function validateSceneScript(
  raw: any,
  context: {
    topic?: string;
    duration?: number;
    preferredStyle?: string;
    preferredMood?: string;
    aspect?: AspectRatioType;
    seed?: number;
  } = {}
): SceneScript {
  const validStyles: ProceduralStyleId[] = [
    "procedural-dusk",
    "neon-synthwave",
    "paper-cut-parallax",
    "particle-galaxy",
    "kinetic-typography",
    "ink-wash",
  ];

  const duration = Math.max(
    3,
    Math.min(120, Number(raw?.duration) || Number(context.duration) || 15)
  );

  const requestedStyle =
    context.preferredStyle && validStyles.includes(context.preferredStyle as ProceduralStyleId)
      ? (context.preferredStyle as ProceduralStyleId)
      : validStyles.includes(raw?.style as ProceduralStyleId)
      ? (raw.style as ProceduralStyleId)
      : inferProceduralStyleFromText(context.topic || raw?.title || "");

  const aspect: AspectRatioType = ["9:16", "16:9", "1:1"].includes(raw?.aspect)
    ? raw.aspect
    : context.aspect || "9:16";

  const seed =
    typeof context.seed === "number" && Number.isFinite(context.seed)
      ? Math.abs(Math.round(context.seed))
      : typeof raw?.seed === "number" && Number.isFinite(raw.seed)
      ? Math.abs(Math.round(raw.seed))
      : 42;

  const validMoods: ProceduralMoodPreset[] = [
    "calm",
    "tense",
    "dreamy",
    "epic",
    "melancholic",
    "electric",
    "zen",
  ];
  const mood: ProceduralMoodPreset =
    context.preferredMood && validMoods.includes(context.preferredMood as ProceduralMoodPreset)
      ? (context.preferredMood as ProceduralMoodPreset)
      : validMoods.includes(raw?.mood as ProceduralMoodPreset)
      ? (raw.mood as ProceduralMoodPreset)
      : validMoods.includes(raw?.music?.mood as ProceduralMoodPreset)
      ? (raw.music.mood as ProceduralMoodPreset)
      : requestedStyle === "neon-synthwave"
      ? "electric"
      : requestedStyle === "ink-wash"
      ? "zen"
      : "calm";

  const presetDef = MOOD_PRESET_MAP[mood] || MOOD_PRESET_MAP.calm;
  const defaultTracks = presetDef.tracks(duration);

  const sanitizeTrack = (
    inputTrack: any,
    fallbackTrack: TrackKeyframe[] | undefined
  ): TrackKeyframe[] => {
    if (!Array.isArray(inputTrack) || inputTrack.length === 0) {
      return fallbackTrack || [[0, 0.2], [duration, 0.8]];
    }
    const cleaned: TrackKeyframe[] = inputTrack
      .map((pt: any) => {
        if (Array.isArray(pt) && pt.length >= 2) {
          const t = Math.max(0, Math.min(duration, Number(pt[0]) || 0));
          const v = Math.max(0, Math.min(1, Number(pt[1]) || 0));
          return [t, +v.toFixed(3)] as TrackKeyframe;
        }
        if (pt && typeof pt === "object") {
          const t = Math.max(0, Math.min(duration, Number(pt.t ?? pt.time ?? 0)));
          const v = Math.max(0, Math.min(1, Number(pt.v ?? pt.value ?? 0)));
          return [t, +v.toFixed(3)] as TrackKeyframe;
        }
        return null;
      })
      .filter((x): x is TrackKeyframe => x !== null)
      .sort((a, b) => a[0] - b[0]);

    return cleaned.length > 0 ? cleaned : fallbackTrack || [[0, 0.2], [duration, 0.8]];
  };

  const rawTracks = raw?.tracks || {};
  const tracks: ProceduralTracks = {
    timeOfDay: sanitizeTrack(rawTracks.timeOfDay, defaultTracks.timeOfDay),
    cloudDensity: sanitizeTrack(rawTracks.cloudDensity, defaultTracks.cloudDensity),
    wind: sanitizeTrack(rawTracks.wind, defaultTracks.wind),
    cameraDrift: sanitizeTrack(rawTracks.cameraDrift, defaultTracks.cameraDrift),
    intensity: sanitizeTrack(rawTracks.intensity, defaultTracks.intensity),
    colorMood: sanitizeTrack(rawTracks.colorMood, defaultTracks.colorMood),
  };

  const catalogItem =
    PROCEDURAL_STYLE_CATALOG.find((c) => c.id === requestedStyle) || PROCEDURAL_STYLE_CATALOG[0];
  const rawEl = raw?.elements || {};
  const defEl = catalogItem.defaultElements;

  const elements: ProceduralElements = {
    birds: Math.max(0, Math.min(30, Math.round(Number(rawEl.birds ?? defEl.birds ?? 6)))),
    fireflies: Math.max(
      0,
      Math.min(120, Math.round(Number(rawEl.fireflies ?? defEl.fireflies ?? 35)))
    ),
    lake: typeof rawEl.lake === "boolean" ? rawEl.lake : Boolean(defEl.lake ?? true),
    stars: Math.max(0, Math.min(250, Math.round(Number(rawEl.stars ?? defEl.stars ?? 90)))),
    trees: Math.max(0, Math.min(30, Math.round(Number(rawEl.trees ?? defEl.trees ?? 10)))),
    lanterns: Math.max(
      0,
      Math.min(50, Math.round(Number(rawEl.lanterns ?? defEl.lanterns ?? 0)))
    ),
    petals: Math.max(0, Math.min(90, Math.round(Number(rawEl.petals ?? defEl.petals ?? 0)))),
    rain: Math.max(0, Math.min(120, Math.round(Number(rawEl.rain ?? defEl.rain ?? 0)))),
    snow: Math.max(0, Math.min(120, Math.round(Number(rawEl.snow ?? defEl.snow ?? 0)))),
    boat: typeof rawEl.boat === "boolean" ? rawEl.boat : Boolean(defEl.boat ?? false),
    traveler:
      typeof rawEl.traveler === "boolean" ? rawEl.traveler : Boolean(defEl.traveler ?? true),
    grid: typeof rawEl.grid === "boolean" ? rawEl.grid : Boolean(defEl.grid ?? false),
  };

  // Validate captions
  let captions: ProceduralCaption[] = [];
  if (Array.isArray(raw?.captions) && raw.captions.length > 0) {
    captions = raw.captions
      .map((c: any, idx: number) => {
        const text = String(c?.text || c?.script || "").trim();
        if (!text) return null;
        const step = duration / raw.captions.length;
        const t =
          typeof c?.t === "number"
            ? Math.max(0, Math.min(duration - 0.5, +c.t.toFixed(2)))
            : +(idx * step).toFixed(2);
        const end =
          typeof c?.end === "number" && c.end > t
            ? Math.min(duration, +c.end.toFixed(2))
            : +Math.min(duration, t + Math.max(2.0, step * 0.9)).toFixed(2);
        return { t, end, text };
      })
      .filter((x: any): x is ProceduralCaption => x !== null);
  }

  // Validate multi-scene segments if provided, or synthesize from captions
  let scenes: ProceduralSceneSegment[] = [];
  if (Array.isArray(raw?.scenes) && raw.scenes.length > 0) {
    const count = raw.scenes.length;
    const step = duration / count;
    scenes = raw.scenes.map((sc: any, idx: number) => {
      const start =
        typeof sc?.start === "number" ? +sc.start.toFixed(2) : +(idx * step).toFixed(2);
      const end =
        typeof sc?.end === "number" && sc.end > start
          ? +sc.end.toFixed(2)
          : idx === count - 1
          ? duration
          : +((idx + 1) * step).toFixed(2);
      const sceneStyle = validStyles.includes(sc?.style as ProceduralStyleId)
        ? (sc.style as ProceduralStyleId)
        : requestedStyle;
      const sceneMood = validMoods.includes(sc?.mood as ProceduralMoodPreset)
        ? (sc.mood as ProceduralMoodPreset)
        : mood;

      return {
        id: String(sc?.id || `scene-${idx + 1}`),
        index: idx,
        start,
        end,
        duration: +(end - start).toFixed(2),
        style: sceneStyle,
        mood: sceneMood,
        headline: String(sc?.headline || `Scene ${idx + 1}`),
        spokenText: String(sc?.spokenText || sc?.text || captions[idx]?.text || ""),
        visualDesc: String(
          sc?.visualDesc ||
            `${catalogItem.name} procedural layer progression (${start}s–${end}s)`
        ),
        tracks: sc?.tracks
          ? {
              timeOfDay: sanitizeTrack(sc.tracks.timeOfDay, tracks.timeOfDay),
              cloudDensity: sanitizeTrack(sc.tracks.cloudDensity, tracks.cloudDensity),
              wind: sanitizeTrack(sc.tracks.wind, tracks.wind),
              cameraDrift: sanitizeTrack(sc.tracks.cameraDrift, tracks.cameraDrift),
              intensity: sanitizeTrack(sc.tracks.intensity, tracks.intensity),
              colorMood: sanitizeTrack(sc.tracks.colorMood, tracks.colorMood),
            }
          : undefined,
        elements: sc?.elements ? { ...elements, ...sc.elements } : undefined,
        transition: ["crossfade", "iris", "wipe", "cut"].includes(sc?.transition)
          ? sc.transition
          : "crossfade",
      };
    });
  }

  if (captions.length === 0 && scenes.length > 0) {
    captions = scenes
      .filter((s) => s.spokenText)
      .map((s) => ({
        t: s.start,
        end: s.end,
        text: s.spokenText || s.headline || "",
      }));
  }

  if (captions.length === 0) {
    const cleanTopic = (context.topic || "The journey begins").trim();
    captions = [
      { t: 0.5, end: +(duration * 0.45).toFixed(1), text: cleanTopic.slice(0, 80) },
      {
        t: +(duration * 0.5).toFixed(1),
        end: +(duration - 0.4).toFixed(1),
        text: "Light and motion shift across the horizon.",
      },
    ];
  }

  if (scenes.length === 0) {
    scenes = captions.map((c, idx) => {
      const nextCap = captions[idx + 1];
      const start = idx === 0 ? 0 : c.t;
      const end = nextCap ? nextCap.t : duration;
      return {
        id: `scene-${idx + 1}`,
        index: idx,
        start: +start.toFixed(2),
        end: +Math.max(start + 1, end).toFixed(2),
        duration: +Math.max(1, end - start).toFixed(2),
        style: requestedStyle,
        mood,
        headline: `Scene ${idx + 1} • ${catalogItem.name}`,
        spokenText: c.text,
        visualDesc: `${catalogItem.name} (${mood} mood) — timeOfDay & wind tracks evolve deterministically with seed #${seed}.`,
        transition: "crossfade",
      };
    });
  }

  return {
    title: String(raw?.title || context.topic || `${catalogItem.name} Story`),
    style: requestedStyle,
    aspect,
    seed,
    duration,
    mood,
    tracks,
    elements,
    captions,
    music: {
      mood: String(raw?.music?.mood || mood),
      bpm: Number(raw?.music?.bpm) || presetDef.bpm,
    },
    scenes,
    words: Array.isArray(raw?.words) ? raw.words : undefined,
  };
}

// ============================================================================
// 4. STYLE ENGINES — PURE FUNCTIONS OF (ctx, W, H, t, params, elements, seed)
// ============================================================================

export interface EvaluatedFrameParams {
  timeOfDay: number;
  cloudDensity: number;
  wind: number;
  cameraDrift: number;
  intensity: number;
  colorMood: number;
}

// ── STYLE 1: PROCEDURAL DUSK (Atmospheric Landscape) ─────────────────────────
function renderProceduralDusk(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  p: EvaluatedFrameParams,
  el: ProceduralElements,
  seed: number
) {
  const tod = p.timeOfDay; // 0 = dawn, 0.35 = day, 0.68 = dusk, 1.0 = night
  const hasLake = el.lake !== false;
  const horizonY = hasLake ? H * 0.66 : H * 0.78;
  const camPanX = (p.cameraDrift - 0.5) * W * 0.14 + Math.sin(t * 0.35) * W * 0.015;

  // 1. Sky Gradient across Dawn -> Noon -> Dusk -> Night
  const skyTopStops = ["#1A103C", "#1E40AF", "#38BDF8", "#1E1B4B", "#050816"];
  const skyMidStops = ["#9D174D", "#60A5FA", "#BAE6FD", "#9A3412", "#0F172A"];
  const skyBotStops = ["#FDBA74", "#E0F2FE", "#FEF08A", "#FB923C", "#1E293B"];

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, lerpMultiStopColor(skyTopStops, tod));
  skyGrad.addColorStop(0.55, lerpMultiStopColor(skyMidStops, tod));
  skyGrad.addColorStop(1, lerpMultiStopColor(skyBotStops, tod));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY + 4);

  // 2. Stars (fade in during dawn & dusk/night)
  const starVisibility = tod > 0.58 ? (tod - 0.58) / 0.42 : tod < 0.18 ? (0.18 - tod) / 0.18 : 0;
  const starCount = el.stars ?? 90;
  if (starVisibility > 0.02 && starCount > 0) {
    const rand = mulberry32(seed + 101);
    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const sx = ((rand() * W * 1.2 - camPanX * 0.15) % W + W) % W;
      const sy = rand() * horizonY * 0.78;
      const r = (0.8 + rand() * 2.1) * (W / 1080);
      const twinkle = 0.4 + 0.6 * Math.sin(t * (2 + rand() * 4) + i * 1.7);
      ctx.fillStyle = `rgba(255, 250, 235, ${starVisibility * twinkle * 0.9})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Celestial Arc (Sun & Moon)
  const sunAngle = lerp(Math.PI * 0.88, Math.PI * 0.08, Math.min(1, tod / 0.78));
  const sunX = W * 0.5 + Math.cos(sunAngle) * W * 0.34 - camPanX * 0.2;
  const sunY = horizonY * 0.88 - Math.sin(sunAngle) * horizonY * 0.66;
  const sunRadius = Math.min(W, H) * (0.075 + 0.025 * Math.sin(tod * Math.PI));

  if (tod < 0.84) {
    const sunAlpha = tod > 0.72 ? 1 - (tod - 0.72) / 0.12 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, sunAlpha);
    const glowGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, sunRadius * 3.8);
    const sunCoreColor = lerpMultiStopColor(["#FDE047", "#FFFBEB", "#FB923C", "#EF4444"], tod / 0.8);
    glowGrad.addColorStop(0, sunCoreColor);
    glowGrad.addColorStop(0.35, "rgba(251, 146, 60, 0.42)");
    glowGrad.addColorStop(1, "rgba(251, 146, 60, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFDF4";
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Crescent Moon when tod > 0.62
  if (tod > 0.62) {
    const moonProg = (tod - 0.62) / 0.38;
    const moonX = W * (0.72 - moonProg * 0.18) - camPanX * 0.18;
    const moonY = horizonY * (0.58 - moonProg * 0.32);
    const moonR = Math.min(W, H) * 0.055;
    ctx.save();
    ctx.globalAlpha = Math.min(1, moonProg * 1.4);
    ctx.shadowColor = "rgba(224, 242, 254, 0.75)";
    ctx.shadowBlur = 40 * (W / 1080);
    ctx.fillStyle = "#F8FAFC";
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(moonX + moonR * 0.38, moonY - moonR * 0.18, moonR * 0.86, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Procedural FBM Clouds
  const cloudDensity = p.cloudDensity;
  if (cloudDensity > 0.05) {
    const cloudCount = Math.round(4 + cloudDensity * 8);
    const rand = mulberry32(seed + 202);
    const windSpeed = (20 + p.wind * 95) * (W / 1080);
    const cloudColor = lerpMultiStopColor(
      ["#FED7AA", "#FFFFFF", "#FDBA74", "#334155"],
      tod
    );
    ctx.save();
    for (let c = 0; c < cloudCount; c++) {
      const baseY = horizonY * (0.14 + rand() * 0.45);
      const baseW = (180 + rand() * 260) * (W / 1080);
      const baseH = baseW * 0.28;
      const speedMult = 0.5 + rand() * 0.8;
      const cx =
        (((rand() * (W + baseW * 2) + t * windSpeed * speedMult - camPanX * 0.3) %
          (W + baseW * 2)) +
          (W + baseW * 2)) %
          (W + baseW * 2) -
        baseW;

      ctx.fillStyle = cloudColor;
      ctx.globalAlpha = (0.18 + cloudDensity * 0.38) * (0.7 + 0.3 * rand());
      for (let puff = 0; puff < 5; puff++) {
        const px = cx + (puff - 2) * (baseW * 0.22);
        const py = baseY + Math.sin(puff * 1.9 + c) * (baseH * 0.22);
        const pr = baseH * (0.65 + 0.45 * Math.sin((puff / 4) * Math.PI));
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 5. Multi-Layer Procedural Mountain Ridges (FBM Noise)
  const mountainPalettes = [
    // Far ridge
    lerpMultiStopColor(["#4C1D95", "#64748B", "#7C2D12", "#0F172A"], tod),
    // Mid ridge
    lerpMultiStopColor(["#311042", "#334155", "#431407", "#090D16"], tod),
    // Near ridge
    lerpMultiStopColor(["#180826", "#1E293B", "#1C0A00", "#030712"], tod),
  ];

  for (let layer = 0; layer < 3; layer++) {
    const parallax = (0.35 + layer * 0.32) * camPanX;
    const baseRidgeY = horizonY - (2 - layer) * (H * 0.075);
    const amp = H * (0.14 - layer * 0.025);
    const freq = 0.0022 + layer * 0.0011;

    ctx.save();
    ctx.fillStyle = mountainPalettes[layer];
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 2);
    const stepX = Math.max(6, Math.round(W / 120));
    for (let x = 0; x <= W + stepX; x += stepX) {
      const sampleX = (x + parallax) * freq * (1080 / W);
      const n = fbm2D(sampleX, layer * 10.7, seed + layer * 33, 4);
      const y = baseRidgeY - (n - 0.35) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, horizonY + 2);
    ctx.closePath();
    ctx.fill();

    // Mist between mountain layers
    if (layer < 2) {
      const mistGrad = ctx.createLinearGradient(0, baseRidgeY - amp * 0.2, 0, horizonY);
      const mistColor = tod > 0.7 ? "rgba(30, 41, 59, 0.25)" : "rgba(254, 215, 170, 0.22)";
      mistGrad.addColorStop(0, "rgba(0,0,0,0)");
      mistGrad.addColorStop(1, mistColor);
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, baseRidgeY - amp * 0.2, W, horizonY - (baseRidgeY - amp * 0.2));
    }
    ctx.restore();
  }

  // 6. Silhouette Pine Trees & Traveler along the Shore Ridge
  const treeCount = el.trees ?? 10;
  if (treeCount > 0) {
    const rand = mulberry32(seed + 404);
    ctx.save();
    ctx.fillStyle = mountainPalettes[2];
    for (let i = 0; i < treeCount; i++) {
      const tx = (((rand() * W * 1.3 - camPanX * 0.95) % (W * 1.2)) + W * 1.2) % (W * 1.2) - W * 0.1;
      const th = (38 + rand() * 58) * (H / 1920);
      const tw = th * 0.42;
      const sway = Math.sin(t * (1.8 + p.wind * 3) + i) * (p.wind * 6 * (W / 1080));
      const ty = horizonY + 2;

      for (let tier = 0; tier < 3; tier++) {
        const tierY = ty - th * (0.25 + tier * 0.25);
        const tierW = tw * (1 - tier * 0.22);
        ctx.beginPath();
        ctx.moveTo(tx + sway * (tier + 1) * 0.35, tierY - th * 0.38);
        ctx.lineTo(tx - tierW, tierY);
        ctx.lineTo(tx + tierW, tierY);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Silhouette Traveler walking along the horizon ridge
  if (el.traveler !== false) {
    const walkProg = (t / 20) % 1;
    const walkerX = W * (0.22 + 0.56 * walkProg);
    const walkerY = horizonY;
    const scale = H / 1920;
    const stride = Math.sin(t * (4.5 + p.wind * 2));
    ctx.save();
    ctx.translate(walkerX, walkerY);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#05070E";
    ctx.fillStyle = "#05070E";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";

    // Cloak / Torso
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(-10 - p.wind * 8, -16);
    ctx.lineTo(8, -16);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(1, -50, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Legs walking
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.lineTo(-2 + stride * 9, 0);
    ctx.moveTo(2, -18);
    ctx.lineTo(2 - stride * 9, 0);
    ctx.stroke();

    // Walking staff & glowing lantern
    ctx.beginPath();
    ctx.moveTo(10, -44);
    ctx.lineTo(14 + stride * 3, 0);
    ctx.stroke();

    if (tod > 0.45) {
      const lanternGlow = ctx.createRadialGradient(12, -38, 2, 12, -38, 36);
      lanternGlow.addColorStop(0, "rgba(253, 224, 71, 0.95)");
      lanternGlow.addColorStop(1, "rgba(251, 146, 60, 0)");
      ctx.fillStyle = lanternGlow;
      ctx.beginPath();
      ctx.arc(12, -38, 36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 7. Lake Water Reflection Layer
  if (hasLake) {
    const lakeH = H - horizonY;
    const lakeGrad = ctx.createLinearGradient(0, horizonY, 0, H);
    lakeGrad.addColorStop(0, lerpMultiStopColor(["#7C2D12", "#38BDF8", "#9A3412", "#0F172A"], tod));
    lakeGrad.addColorStop(0.5, lerpMultiStopColor(["#311042", "#1E3A8A", "#431407", "#090D16"], tod));
    lakeGrad.addColorStop(1, "#030712");
    ctx.fillStyle = lakeGrad;
    ctx.fillRect(0, horizonY, W, lakeH);

    // Shimmering sun/moon water reflection ripples
    const reflectX = tod < 0.8 ? sunX : W * 0.6;
    const reflectColor = tod < 0.78 ? "rgba(253, 224, 71, 0.45)" : "rgba(224, 242, 254, 0.35)";
    ctx.save();
    ctx.fillStyle = reflectColor;
    for (let r = 0; r < 28; r++) {
      const ry = horizonY + 8 + (r / 28) * (lakeH * 0.78);
      const spread = (18 + r * 6.5) * (W / 1080);
      const waveOffset = Math.sin(t * (3 + p.wind * 4) + r * 0.9) * (12 + r * 1.2) * (W / 1080);
      const rh = Math.max(1.5, (3.2 - r * 0.06) * (H / 1920));
      ctx.fillRect(reflectX - spread * 0.5 + waveOffset, ry, spread, rh);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = mountainPalettes[2];
    ctx.fillRect(0, horizonY, W, H - horizonY);
  }

  // 8. Flapping Birds Flock
  const birdCount = el.birds ?? 6;
  if (birdCount > 0) {
    const rand = mulberry32(seed + 505);
    ctx.save();
    ctx.strokeStyle = tod > 0.72 ? "rgba(226, 232, 240, 0.7)" : "rgba(24, 24, 36, 0.82)";
    ctx.lineWidth = Math.max(1.5, 2.6 * (W / 1080));
    ctx.lineCap = "round";
    for (let b = 0; b < birdCount; b++) {
      const speed = (55 + rand() * 45 + p.wind * 40) * (W / 1080);
      const bx = (((rand() * W + t * speed) % (W + 160)) + (W + 160)) % (W + 160) - 80;
      const by =
        horizonY * (0.18 + rand() * 0.42) + Math.sin(t * 2.2 + b * 1.3) * 14 * (H / 1920);
      const wingSpan = (10 + rand() * 9) * (W / 1080);
      const flap = Math.sin(t * (7.5 + (b % 3) * 1.4) + b) * wingSpan * 0.65;

      ctx.beginPath();
      ctx.moveTo(bx - wingSpan, by - flap);
      ctx.quadraticCurveTo(bx - wingSpan * 0.4, by - Math.abs(flap) * 0.5, bx, by);
      ctx.quadraticCurveTo(bx + wingSpan * 0.4, by - Math.abs(flap) * 0.5, bx + wingSpan, by - flap);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 9. Glowing Fireflies (emerge as dusk/night falls or when fireflies > 0)
  const fireflyCount = el.fireflies ?? 40;
  const fireflyVis = Math.max(0.25, smoothstep(Math.max(0, (tod - 0.35) / 0.65)));
  if (fireflyCount > 0 && fireflyVis > 0.05) {
    const rand = mulberry32(seed + 606);
    ctx.save();
    for (let f = 0; f < fireflyCount; f++) {
      const fx =
        (((rand() * W + Math.sin(t * 0.9 + f * 2.1) * 45 + t * p.wind * 25) % W) + W) % W;
      const fy =
        horizonY * 0.45 +
        rand() * (H * 0.5) +
        Math.cos(t * 1.3 + f * 1.7) * 28 * (H / 1920);
      const pulse = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(t * (2.5 + rand() * 2.5) + f), 2);
      const r = (2.2 + rand() * 3.5) * (W / 1080);

      const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 4.5);
      glow.addColorStop(0, `rgba(253, 224, 71, ${pulse * fireflyVis})`);
      glow.addColorStop(0.4, `rgba(163, 230, 53, ${pulse * fireflyVis * 0.45})`);
      glow.addColorStop(1, "rgba(163, 230, 53, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy, r * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── STYLE 2: NEON SYNTHWAVE (Outrun Cyber Grid) ──────────────────────────────
function renderNeonSynthwave(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  p: EvaluatedFrameParams,
  el: ProceduralElements,
  seed: number
) {
  const horizonY = H * 0.58;
  const speed = 0.8 + p.wind * 2.4 + p.intensity * 1.2;
  const camShiftX = (p.cameraDrift - 0.5) * W * 0.16;

  // 1. Deep Cyber Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, "#050214");
  skyGrad.addColorStop(0.45, lerpColor("#1E093B", "#0F172A", p.colorMood));
  skyGrad.addColorStop(0.82, lerpColor("#7E22CE", "#BE185D", p.intensity));
  skyGrad.addColorStop(1, "#F43F5E");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY + 2);

  // 2. Cyber Starfield
  const rand = mulberry32(seed + 701);
  const stars = el.stars ?? 110;
  ctx.save();
  for (let i = 0; i < stars; i++) {
    const sx = ((rand() * W - camShiftX * 0.2) % W + W) % W;
    const sy = rand() * horizonY * 0.72;
    const twinkle = 0.35 + 0.65 * Math.sin(t * 4 + i);
    ctx.fillStyle = i % 5 === 0 ? `rgba(0, 240, 255, ${twinkle})` : `rgba(255, 255, 255, ${twinkle * 0.8})`;
    ctx.fillRect(sx, sy, 2.5 * (W / 1080), 2.5 * (W / 1080));
  }
  ctx.restore();

  // 3. Retro Segmented Outrun Sun
  const sunR = Math.min(W, H) * (0.21 + 0.02 * Math.sin(t * 2));
  const sunX = W * 0.5 - camShiftX * 0.15;
  const sunY = horizonY - sunR * 0.18;

  ctx.save();
  const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 2.2);
  sunGlow.addColorStop(0, "rgba(251, 113, 133, 0.55)");
  sunGlow.addColorStop(0.5, "rgba(192, 38, 211, 0.25)");
  sunGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, "#FEF08A");
  sunGrad.addColorStop(0.45, "#F97316");
  sunGrad.addColorStop(1, "#EC4899");
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal scanline cutouts in lower half of the sun
  ctx.fillStyle = "#1E093B";
  for (let slice = 0; slice < 7; slice++) {
    const sy = sunY + ((slice * 0.14 + ((t * 0.12) % 0.14)) * sunR);
    if (sy > sunY - sunR * 0.05 && sy < horizonY) {
      const sh = (2 + slice * 2.4) * (H / 1920);
      ctx.fillRect(sunX - sunR * 1.1, sy, sunR * 2.2, sh);
    }
  }
  ctx.restore();

  // 4. Outrun Wireframe Mountains along Horizon
  ctx.save();
  ctx.fillStyle = "#090418";
  ctx.strokeStyle = "#00F0FF";
  ctx.lineWidth = 2.2 * (W / 1080);
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  const cols = 32;
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * W;
    const distFromCenter = Math.abs(i / cols - 0.5) * 2;
    const valleyMask = Math.pow(distFromCenter, 0.85);
    const n = fbm2D(i * 0.35 + camShiftX * 0.005, 2.5, seed + 77, 3);
    const peakH = n * H * 0.16 * (0.25 + 0.75 * valleyMask);
    ctx.lineTo(x, horizonY - peakH);
  }
  ctx.lineTo(W, horizonY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 5. Perspective 3D Neon Grid Floor
  const floorH = H - horizonY;
  const floorGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  floorGrad.addColorStop(0, "#1A0536");
  floorGrad.addColorStop(0.25, "#0B031D");
  floorGrad.addColorStop(1, "#04010C");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizonY, W, floorH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY, W, floorH);
  ctx.clip();

  const gridColor = lerpColor("#EC4899", "#00F0FF", p.colorMood);
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 2 * (W / 1080);

  // Perspective radial lines from vanishing point
  const vpX = W * 0.5 - camShiftX * 0.4;
  const numRays = 26;
  for (let i = -numRays; i <= numRays; i++) {
    ctx.globalAlpha = Math.max(0.15, 1 - Math.abs(i) / (numRays + 2));
    ctx.beginPath();
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(vpX + i * (W * 0.14), H);
    ctx.stroke();
  }

  // Scrolling horizontal perspective lines (exponential Z spacing)
  const scrollOffset = (t * speed * 1.4) % 1;
  const numHoriz = 18;
  for (let j = 0; j < numHoriz; j++) {
    const normZ = (j + scrollOffset) / numHoriz;
    const screenY = horizonY + Math.pow(normZ, 2.4) * floorH;
    ctx.globalAlpha = Math.min(0.95, 0.15 + normZ * 0.85);
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(W, screenY);
    ctx.stroke();
  }

  // Horizon Neon Bloom Line
  ctx.globalAlpha = 1;
  ctx.shadowColor = "#00F0FF";
  ctx.shadowBlur = 24 * (W / 1080);
  ctx.strokeStyle = "#00F0FF";
  ctx.lineWidth = 3.5 * (W / 1080);
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(W, horizonY);
  ctx.stroke();
  ctx.restore();
}

// ── STYLE 3: PAPER-CUT PARALLAX (Tactile Layered Diorama) ────────────────────
function renderPaperCutParallax(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  p: EvaluatedFrameParams,
  el: ProceduralElements,
  seed: number
) {
  const tod = p.timeOfDay;
  const camPan = (p.cameraDrift - 0.5) * W * 0.16;

  // 1. Warm Tactile Paper Sky Backdrop
  const bgPalette = lerpMultiStopColor(["#F5F1E8", "#FDE68A", "#FDBA74", "#1E293B"], tod);
  ctx.fillStyle = bgPalette;
  ctx.fillRect(0, 0, W, H);

  // Hanging Paper Sun / Moon on a String
  const sunX = W * 0.7 - camPan * 0.15;
  const sunY = H * (0.18 + tod * 0.18) + Math.sin(t * 1.8) * 10 * (H / 1920);
  const sunR = Math.min(W, H) * 0.085;

  ctx.save();
  // String holding the paper sun
  ctx.strokeStyle = "rgba(20, 20, 20, 0.28)";
  ctx.lineWidth = 2 * (W / 1080);
  ctx.beginPath();
  ctx.moveTo(sunX, 0);
  ctx.lineTo(sunX, sunY);
  ctx.stroke();

  // Paper drop shadow
  ctx.shadowColor = "rgba(20, 15, 10, 0.25)";
  ctx.shadowBlur = 28 * (W / 1080);
  ctx.shadowOffsetY = 12 * (H / 1920);
  ctx.fillStyle = tod > 0.68 ? "#FEF9C3" : "#E4491B";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Paper Cutout Clouds on Strings
  const cloudCount = Math.round(3 + p.cloudDensity * 5);
  const rand = mulberry32(seed + 303);
  for (let c = 0; c < cloudCount; c++) {
    const cx =
      (((rand() * W + t * (18 + p.wind * 45) * (0.4 + rand() * 0.6) - camPan * 0.25) %
        (W + 260)) +
        (W + 260)) %
        (W + 260) -
      130;
    const cy = H * (0.12 + rand() * 0.26) + Math.sin(t * 1.5 + c) * 6;
    const cw = (110 + rand() * 90) * (W / 1080);

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
    ctx.shadowBlur = 20 * (W / 1080);
    ctx.shadowOffsetY = 10 * (H / 1920);
    ctx.fillStyle = tod > 0.72 ? "#E2E8F0" : "#FFFEFB";
    ctx.beginPath();
    ctx.arc(cx, cy, cw * 0.36, 0, Math.PI * 2);
    ctx.arc(cx - cw * 0.3, cy + cw * 0.08, cw * 0.26, 0, Math.PI * 2);
    ctx.arc(cx + cw * 0.3, cy + cw * 0.08, cw * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. Five Layered Paper-Cut Hills with Strong Diorama Drop Shadows
  const dayHillColors = ["#EADBC8", "#D4A373", "#6B8E5A", "#3A5A40", "#1B2620"];
  const nightHillColors = ["#475569", "#334155", "#1E293B", "#0F172A", "#070A12"];

  for (let layer = 0; layer < 5; layer++) {
    const baseY = H * (0.46 + layer * 0.1);
    const amp = H * (0.075 - layer * 0.006);
    const parallax = camPan * (0.2 + layer * 0.22);
    const fill = lerpColor(dayHillColors[layer], nightHillColors[layer], tod);

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
    ctx.shadowBlur = 32 * (W / 1080);
    ctx.shadowOffsetY = -10 * (H / 1920);
    ctx.fillStyle = fill;

    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) {
      const n = fbm2D((x + parallax) * 0.0025 * (1080 / W), layer * 7.3, seed + layer * 19, 3);
      const y = baseY - (n - 0.4) * amp * 2.1;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 4. Floating Glowing Paper Lanterns
  const lanternCount = el.lanterns ?? 16;
  if (lanternCount > 0) {
    const lRand = mulberry32(seed + 888);
    ctx.save();
    for (let i = 0; i < lanternCount; i++) {
      const lx =
        (((lRand() * W + Math.sin(t * 0.8 + i) * 35 + t * p.wind * 22) % W) + W) % W;
      const ly =
        H - (((lRand() * H + t * (28 + lRand() * 25)) % (H * 0.9)) + H * 0.05);
      const lw = (14 + lRand() * 14) * (W / 1080);
      const lh = lw * 1.35;

      ctx.shadowColor = "rgba(251, 146, 60, 0.85)";
      ctx.shadowBlur = 24 * (W / 1080);
      ctx.fillStyle = "#F97316";
      ctx.beginPath();
      ctx.roundRect(lx - lw / 2, ly - lh / 2, lw, lh, 4 * (W / 1080));
      ctx.fill();

      ctx.fillStyle = "#FEF08A";
      ctx.beginPath();
      ctx.arc(lx, ly, lw * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── STYLE 4: PARTICLE GALAXY (Deep Space Procedural Cosmos) ──────────────────
function renderParticleGalaxy(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  p: EvaluatedFrameParams,
  el: ProceduralElements,
  seed: number
) {
  // 1. Deep Void Background
  const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 20, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
  bgGrad.addColorStop(0, lerpColor("#1E1B4B", "#3B0764", p.colorMood));
  bgGrad.addColorStop(0.55, "#090D16");
  bgGrad.addColorStop(1, "#02040A");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.5 + (p.cameraDrift - 0.5) * W * 0.12;
  const cy = H * 0.44 + Math.sin(t * 0.4) * H * 0.03;
  const maxR = Math.min(W, H) * 0.48;
  const rotSpeed = 0.22 + p.wind * 0.45;

  // 2. Volumetric Nebula Clouds
  const rand = mulberry32(seed + 909);
  ctx.save();
  for (let n = 0; n < 12; n++) {
    const angle = (n / 12) * Math.PI * 2 + t * rotSpeed * 0.35;
    const dist = rand() * maxR * 0.75;
    const nx = cx + Math.cos(angle) * dist;
    const ny = cy + Math.sin(angle) * dist * 0.68;
    const nr = (120 + rand() * 180) * (W / 1080);

    const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    const col = n % 2 === 0 ? "rgba(168, 85, 247, 0.14)" : "rgba(56, 189, 248, 0.12)";
    nebGrad.addColorStop(0, col);
    nebGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebGrad;
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Spiral Galaxy Orbital Particles
  const totalParticles = Math.max(120, (el.stars ?? 160) + (el.fireflies ?? 60));
  const pRand = mulberry32(seed + 999);
  ctx.save();
  for (let i = 0; i < totalParticles; i++) {
    const arm = i % 3;
    const radiusNorm = Math.pow(pRand(), 0.75);
    const r = radiusNorm * maxR * 1.25;
    const spiralOffset = radiusNorm * 4.2 + (arm * Math.PI * 2) / 3;
    const theta = spiralOffset + t * rotSpeed * (1.2 - radiusNorm * 0.65) + (pRand() - 0.5) * 0.45;

    const px = cx + Math.cos(theta) * r;
    const py = cy + Math.sin(theta) * r * 0.62;
    const size = (1.4 + pRand() * 3.8) * (W / 1080);
    const alpha = (1 - radiusNorm * 0.65) * (0.45 + 0.55 * Math.sin(t * 3 + i));

    ctx.fillStyle =
      i % 4 === 0
        ? `rgba(244, 114, 182, ${alpha})`
        : i % 3 === 0
        ? `rgba(56, 189, 248, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Quasar Core Glow
  const coreR = Math.min(W, H) * (0.09 + 0.02 * Math.sin(t * 3.5));
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5);
  coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  coreGrad.addColorStop(0.3, "rgba(232, 121, 249, 0.55)");
  coreGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── STYLE 5: KINETIC TYPOGRAPHY (Swiss / Brutalist Procedural Stage) ─────────
function renderKineticTypography(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  p: EvaluatedFrameParams,
  _el: ProceduralElements,
  seed: number
) {
  // 1. Dynamic High-Contrast Stage Background
  const isDark = p.timeOfDay > 0.35;
  ctx.fillStyle = isDark ? "#0D0D11" : "#F5F1E8";
  ctx.fillRect(0, 0, W, H);

  const strokeCol = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(20, 20, 20, 0.12)";
  const accentCol = lerpMultiStopColor(["#E4491B", "#FFE600", "#00F0FF", "#EC4899"], p.colorMood);

  // 2. Swiss Architectural Grid Lines
  ctx.save();
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = 1.5 * (W / 1080);
  const gridStep = Math.round(W / 8);
  for (let x = gridStep; x < W; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = gridStep; y < H; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // 3. Mathematical Lissajous / Harmonic Rings
  const cx = W * 0.5;
  const cy = H * 0.42;
  const baseR = Math.min(W, H) * 0.28;
  const rings = 5;
  for (let r = 0; r < rings; r++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * (0.25 + p.wind * 0.5) * (r % 2 === 0 ? 1 : -1) + r * 0.4);
    ctx.strokeStyle = r === 0 ? accentCol : strokeCol;
    ctx.lineWidth = (r === 0 ? 4 : 2) * (W / 1080);
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      baseR * (1 - r * 0.12),
      baseR * (0.45 + 0.35 * Math.sin(t * 0.9 + r)),
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  // 4. Procedural Audio/Rhythm Spectrum Equalizer
  const bars = 32;
  const barAreaW = W * 0.76;
  const startX = (W - barAreaW) / 2;
  const barW = (barAreaW / bars) * 0.62;
  const eqY = H * 0.68;

  for (let b = 0; b < bars; b++) {
    const n = valueNoise2D(b * 0.35, t * (2.5 + p.intensity * 3), seed + 55);
    const bh = (16 + n * 120 * (0.4 + p.intensity * 0.8)) * (H / 1920);
    const bx = startX + b * (barAreaW / bars);
    ctx.fillStyle = b % 4 === 0 ? accentCol : isDark ? "rgba(255,255,255,0.65)" : "#141414";
    ctx.beginPath();
    ctx.roundRect(bx, eqY - bh / 2, barW, bh, barW / 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── STYLE 6: INK WASH (Traditional Sumi-e & Watercolor Landscape) ────────────
function renderInkWash(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  p: EvaluatedFrameParams,
  el: ProceduralElements,
  seed: number
) {
  const horizonY = H * 0.68;
  const camPan = (p.cameraDrift - 0.5) * W * 0.14;

  // 1. Textured Rice Paper / Parchment Background
  const paperGrad = ctx.createLinearGradient(0, 0, 0, H);
  paperGrad.addColorStop(0, lerpColor("#F7F3E8", "#E7E0D0", p.timeOfDay));
  paperGrad.addColorStop(1, lerpColor("#EDE5D2", "#D6CEBF", p.timeOfDay));
  ctx.fillStyle = paperGrad;
  ctx.fillRect(0, 0, W, H);

  // Red Cinnabar Sun / Hanko Seal Stamp
  const sunX = W * 0.68 - camPan * 0.15;
  const sunY = H * (0.24 + p.timeOfDay * 0.12);
  const sunR = Math.min(W, H) * 0.08;
  ctx.save();
  ctx.fillStyle = "rgba(210, 38, 30, 0.86)";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Diffusing Sumi-e Ink Mountains
  const inkShades = [
    "rgba(120, 118, 112, 0.25)",
    "rgba(75, 73, 68, 0.45)",
    "rgba(35, 34, 32, 0.72)",
  ];
  for (let layer = 0; layer < 3; layer++) {
    const baseY = horizonY - (2 - layer) * H * 0.08;
    const amp = H * (0.15 - layer * 0.02);
    const parallax = camPan * (0.25 + layer * 0.3);

    ctx.save();
    const mGrad = ctx.createLinearGradient(0, baseY - amp, 0, horizonY);
    mGrad.addColorStop(0, inkShades[layer]);
    mGrad.addColorStop(0.85, "rgba(245, 240, 230, 0.05)");
    ctx.fillStyle = mGrad;

    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= W + 12; x += 12) {
      const n = fbm2D((x + parallax) * 0.0022 * (1080 / W), layer * 9.1, seed + layer * 41, 4);
      ctx.lineTo(x, baseY - (n - 0.35) * amp);
    }
    ctx.lineTo(W, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 3. Calm Ink Lake & Sampan Boat Silhouette
  if (el.boat !== false) {
    const boatX = W * 0.38 + Math.sin(t * 0.7) * 24 * (W / 1080) - camPan * 0.4;
    const boatY = horizonY + H * 0.06 + Math.cos(t * 1.4) * 4 * (H / 1920);
    const s = W / 1080;
    ctx.save();
    ctx.translate(boatX, boatY);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(24, 24, 22, 0.85)";
    ctx.beginPath();
    ctx.moveTo(-65, 0);
    ctx.quadraticCurveTo(0, 22, 65, -4);
    ctx.lineTo(45, -10);
    ctx.quadraticCurveTo(0, 6, -48, -6);
    ctx.closePath();
    ctx.fill();

    // Boatman with bamboo hat
    ctx.beginPath();
    ctx.arc(-18, -28, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-34, -26);
    ctx.lineTo(-18, -38);
    ctx.lineTo(-2, -26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 4. Swaying Bamboo / Reeds in Foreground
  const bambooCount = el.trees ?? 8;
  const bRand = mulberry32(seed + 616);
  ctx.save();
  ctx.strokeStyle = "rgba(24, 24, 22, 0.82)";
  for (let i = 0; i < bambooCount; i++) {
    const bx = (i < bambooCount / 2 ? 0.05 + bRand() * 0.18 : 0.78 + bRand() * 0.18) * W;
    const bh = (260 + bRand() * 340) * (H / 1920);
    const sway = Math.sin(t * (1.6 + p.wind * 2.5) + i) * (18 + p.wind * 28) * (W / 1080);

    ctx.lineWidth = (3.5 + bRand() * 2.5) * (W / 1080);
    ctx.beginPath();
    ctx.moveTo(bx, H);
    ctx.quadraticCurveTo(bx + sway * 0.4, H - bh * 0.5, bx + sway, H - bh);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Drifting Cherry Blossom Petals / Ink Droplets
  const petalCount = el.petals ?? 36;
  const pRand = mulberry32(seed + 717);
  ctx.save();
  for (let i = 0; i < petalCount; i++) {
    const px =
      (((pRand() * W + t * (28 + p.wind * 55) + Math.sin(t * 2 + i) * 30) % W) + W) % W;
    const py = (((pRand() * H + t * (35 + pRand() * 30)) % H) + H) % H;
    const pr = (4 + pRand() * 5) * (W / 1080);
    ctx.fillStyle = i % 3 === 0 ? "rgba(210, 38, 30, 0.65)" : "rgba(40, 38, 35, 0.45)";
    ctx.beginPath();
    ctx.ellipse(px, py, pr, pr * 0.6, t * 2 + i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================================
// 5. MASTER FRAME RENDERER (PURE FUNCTION OF TIME t)
// ============================================================================

export function renderProceduralFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  script: SceneScript,
  options: { showSubtitles?: boolean } = { showSubtitles: true }
) {
  const safeT = Math.max(0, Math.min(script.duration || 15, Number.isFinite(t) ? t : 0));

  // Locate active scene if multi-scene story
  const scenes = script.scenes || [];
  const activeScene =
    scenes.find((s) => safeT >= s.start && safeT <= s.end) || scenes[0] || null;

  const activeStyle: ProceduralStyleId = activeScene?.style || script.style || "procedural-dusk";
  const activeTracks: ProceduralTracks = {
    ...script.tracks,
    ...(activeScene?.tracks || {}),
  };
  const activeElements: ProceduralElements = {
    ...script.elements,
    ...(activeScene?.elements || {}),
  };

  // Sample tracks at exact time t
  const frameParams: EvaluatedFrameParams = {
    timeOfDay: sampleTrack(activeTracks.timeOfDay, safeT, 0.4),
    cloudDensity: sampleTrack(activeTracks.cloudDensity, safeT, 0.4),
    wind: sampleTrack(activeTracks.wind, safeT, 0.3),
    cameraDrift: sampleTrack(activeTracks.cameraDrift, safeT, 0.5),
    intensity: sampleTrack(activeTracks.intensity, safeT, 0.5),
    colorMood: sampleTrack(activeTracks.colorMood, safeT, 0.5),
  };

  const renderStyleById = (styleId: ProceduralStyleId, seedVal: number) => {
    switch (styleId) {
      case "neon-synthwave":
        renderNeonSynthwave(ctx, W, H, safeT, frameParams, activeElements, seedVal);
        break;
      case "paper-cut-parallax":
        renderPaperCutParallax(ctx, W, H, safeT, frameParams, activeElements, seedVal);
        break;
      case "particle-galaxy":
        renderParticleGalaxy(ctx, W, H, safeT, frameParams, activeElements, seedVal);
        break;
      case "kinetic-typography":
        renderKineticTypography(ctx, W, H, safeT, frameParams, activeElements, seedVal);
        break;
      case "ink-wash":
        renderInkWash(ctx, W, H, safeT, frameParams, activeElements, seedVal);
        break;
      case "procedural-dusk":
      default:
        renderProceduralDusk(ctx, W, H, safeT, frameParams, activeElements, seedVal);
        break;
    }
  };

  renderStyleById(activeStyle, script.seed || 42);

  // Weather Overlays (Rain / Snow if requested by story elements)
  if ((activeElements.rain ?? 0) > 0) {
    const rainCount = activeElements.rain || 40;
    const rRand = mulberry32((script.seed || 42) + 1234);
    ctx.save();
    ctx.strokeStyle = "rgba(186, 230, 253, 0.42)";
    ctx.lineWidth = 1.8 * (W / 1080);
    for (let i = 0; i < rainCount; i++) {
      const rx = (((rRand() * W + safeT * 180 * frameParams.wind) % W) + W) % W;
      const ry = (((rRand() * H + safeT * 950) % H) + H) % H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8 * frameParams.wind, ry + 32 * (H / 1920));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Subtle Cinema Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Shared Caption & Word-Synced Subtitle Layer
  if (options.showSubtitles !== false) {
    const captions = script.captions || [];
    const activeCaption = captions.find((c, idx) => {
      const next = captions[idx + 1];
      const cEnd = typeof c.end === "number" ? c.end : next ? next.t : script.duration;
      return safeT >= c.t - 0.15 && safeT <= cEnd + 0.15;
    });

    const captionText = activeCaption?.text || activeScene?.spokenText || "";
    if (captionText) {
      const scale = W / 1080;
      const subGrad = ctx.createLinearGradient(0, H - 360 * scale, 0, H);
      subGrad.addColorStop(0, "rgba(0,0,0,0)");
      subGrad.addColorStop(0.6, "rgba(0,0,0,0.36)");
      subGrad.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = subGrad;
      ctx.fillRect(0, H - 360 * scale, W, 360 * scale);

      ctx.save();
      const fontSize = Math.round(
        (activeStyle === "kinetic-typography" ? 52 : 40) * scale
      );
      const fontFamily =
        activeStyle === "ink-wash" || activeStyle === "paper-cut-parallax"
          ? "'Instrument Serif', Georgia, serif"
          : activeStyle === "neon-synthwave"
          ? "'JetBrains Mono', monospace"
          : "'Montserrat', 'Inter', sans-serif";

      ctx.font = `700 ${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "middle";

      // Wrap into balanced lines
      const words = captionText.split(/\s+/).filter(Boolean);
      const maxLineW = W * 0.82;
      const lines: string[][] = [];
      let curLine: string[] = [];
      let curW = 0;
      const spaceW = ctx.measureText(" ").width;

      for (const w of words) {
        const wW = ctx.measureText(w).width;
        if (curLine.length > 0 && curW + spaceW + wW > maxLineW) {
          lines.push(curLine);
          curLine = [w];
          curW = wW;
        } else {
          curLine.push(w);
          curW += (curLine.length > 1 ? spaceW : 0) + wW;
        }
      }
      if (curLine.length > 0) lines.push(curLine);

      // Compute word-level highlight index across the active caption duration
      const capStart = activeCaption?.t ?? activeScene?.start ?? 0;
      const capEnd =
        activeCaption?.end ??
        activeScene?.end ??
        Math.min(script.duration, capStart + 3.5);
      const capProgress = Math.max(
        0,
        Math.min(1, (safeT - capStart) / Math.max(0.2, capEnd - capStart))
      );
      const activeWordGlobalIdx = Math.min(
        words.length - 1,
        Math.floor(capProgress * words.length)
      );

      const lineH = fontSize * 1.32;
      const baseY =
        activeStyle === "kinetic-typography"
          ? H * 0.42 - ((lines.length - 1) * lineH) / 2
          : H - 185 * scale - ((lines.length - 1) * lineH) / 2;

      let wordCounter = 0;
      lines.forEach((lineWords, idx) => {
        const y = baseY + idx * lineH;
        const totalLineW = lineWords.reduce(
          (acc, w, i) => acc + ctx.measureText(w).width + (i > 0 ? spaceW : 0),
          0
        );
        let cursorX = (W - totalLineW) / 2;
        ctx.textAlign = "left";

        for (const w of lineWords) {
          const isCurrentWord = wordCounter === activeWordGlobalIdx;
          const isPastWord = wordCounter < activeWordGlobalIdx;
          const wWidth = ctx.measureText(w).width;

          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(3, 7 * scale);
          ctx.strokeStyle = "rgba(0, 0, 0, 0.88)";
          ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
          ctx.shadowBlur = 12 * scale;
          ctx.strokeText(w, cursorX, y);

          ctx.shadowColor = isCurrentWord ? "rgba(255, 225, 125, 0.55)" : "transparent";
          ctx.shadowBlur = isCurrentWord ? 16 * scale : 0;
          ctx.fillStyle = isCurrentWord
            ? "#FFE17D"
            : isPastWord
            ? "#FFFFFF"
            : "rgba(255, 255, 255, 0.86)";
          ctx.fillText(w, cursorX, y);

          cursorX += wWidth + spaceW;
          wordCounter++;
        }
      });
      ctx.restore();
    }
  }
}

// ============================================================================
// 6. GENERATE STANDALONE DETERMINISTIC REACT/TSX COMPONENT FOR SPARK & REMOTION
// ============================================================================

export function generateProceduralSparkCode(script: SceneScript): string {
  const serializedScript = JSON.stringify(script, null, 2);
  return `import React, { useEffect, useRef } from "react";

const SCENE_SCRIPT = ${serializedScript};

function mulberry32(seed: number) {
  let a = (seed >>> 0) + 0x6d2b79f5;
  return function () {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function valueNoise2D(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return lerp(
    lerp(hash2D(xi, yi, seed), hash2D(xi + 1, yi, seed), u),
    lerp(hash2D(xi, yi + 1, seed), hash2D(xi + 1, yi + 1, seed), u),
    v
  );
}

function fbm2D(x: number, y: number, seed: number, octaves = 4) {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x * freq, y * freq, seed + i * 101);
    max += amp;
    freq *= 2.02;
    amp *= 0.5;
  }
  return max > 0 ? val / max : 0;
}

function sampleTrack(track: [number, number][] | undefined, t: number, fallback = 0.5) {
  if (!Array.isArray(track) || !track.length) return fallback;
  if (t <= track[0][0]) return track[0][1];
  const last = track[track.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < track.length - 1; i++) {
    const [t0, v0] = track[i];
    const [t1, v1] = track[i + 1];
    if (t >= t0 && t <= t1) {
      const local = (t - t0) / Math.max(0.0001, t1 - t0);
      return lerp(v0, v1, 0.5 - 0.5 * Math.cos(local * Math.PI));
    }
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim().padEnd(6, "0");
  const num = parseInt(clean.slice(0, 6), 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return \`rgb(\${Math.round(lerp(r1, r2, t))},\${Math.round(lerp(g1, g2, t))},\${Math.round(lerp(b1, b2, t))})\`;
}

function lerpMultiStop(stops: string[], t: number) {
  const c = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(c));
  return lerpColor(stops[i], stops[i + 1], c - i);
}

export default function GeneratedReel({
  currentTime = 0,
  width = 1080,
  height = 1920,
}: {
  currentTime?: number;
  duration?: number;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const t = Math.max(0, Math.min(SCENE_SCRIPT.duration || 15, currentTime));
    const tod = sampleTrack(SCENE_SCRIPT.tracks?.timeOfDay as any, t, 0.45);
    const wind = sampleTrack(SCENE_SCRIPT.tracks?.wind as any, t, 0.35);
    const horizonY = H * 0.66;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, lerpMultiStop(["#1A103C", "#1E40AF", "#38BDF8", "#1E1B4B", "#050816"], tod));
    skyGrad.addColorStop(0.55, lerpMultiStop(["#9D174D", "#60A5FA", "#BAE6FD", "#9A3412", "#0F172A"], tod));
    skyGrad.addColorStop(1, lerpMultiStop(["#FDBA74", "#E0F2FE", "#FEF08A", "#FB923C", "#1E293B"], tod));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    for (let layer = 0; layer < 3; layer++) {
      const baseRidgeY = horizonY - (2 - layer) * (H * 0.075);
      const amp = H * (0.14 - layer * 0.025);
      ctx.fillStyle = lerpMultiStop(["#311042", "#334155", "#431407", "#090D16"], Math.min(1, tod + layer * 0.12));
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) {
        const n = fbm2D((x + t * wind * 20) * (0.002 + layer * 0.001), layer * 10, SCENE_SCRIPT.seed + layer * 33, 4);
        ctx.lineTo(x, baseRidgeY - (n - 0.35) * amp);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }

    const activeCap = (SCENE_SCRIPT.captions || []).find((c: any, idx: number) => {
      const next = SCENE_SCRIPT.captions[idx + 1];
      const end = c.end ?? (next ? next.t : SCENE_SCRIPT.duration);
      return t >= c.t - 0.1 && t <= end + 0.1;
    });
    if (activeCap?.text) {
      ctx.font = "700 42px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 7;
      ctx.strokeText(activeCap.text, W / 2, H - 200);
      ctx.fillText(activeCap.text, W / 2, H - 200);
    }
  }, [currentTime, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
`;
}
