// captions/styles.ts
// 10 caption presets (5 bold + 3 cinematic + 2 minimal). All fonts are SIL OFL or Apache 2.0 (hackathon-safe).
// To add a new style later: add an id, add one entry in CAPTION_STYLES, add a case in CaptionLayer.

export const ensureGoogleFontsLoaded = () => {
  if (typeof document === 'undefined') return;
  const id = 'google-fonts-caption-bundle';
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@900&family=Luckiest+Guy&family=DM+Serif+Display:ital@0;1&family=Poppins:wght@800&family=Bebas+Neue&family=Cinzel:wght@700&family=Bodoni+Moda:ital,wght@1,500&family=Anton&family=Inter:wght@500&family=Jost:wght@300&display=swap';
    document.head.appendChild(link);
  }
};

export type CaptionStyleId =
  | 'hormozi'
  | 'beast'
  | 'pinterest'
  | 'pill'
  | 'neon'
  | 'cinzel'
  | 'editorial'
  | 'trailer'
  | 'clean'
  | 'whisper';

export interface CaptionStyle {
  id: CaptionStyleId;
  label: string;
  description: string;
  loadFont: () => string; // returns the CSS font-family
  weight: number;
  sizeRatio: number; // font size as a fraction of min(width, height)  -> works for 9:16 and 16:9
  charWidthEm: number; // avg glyph width, used to auto-shrink very long words
  uppercase: boolean;
  stripPunctuation: boolean;
  letterSpacing: number; // em
  lineHeight: number;
  strokeRatio: number; // total stroke width as fraction of font size (0 = none)
  maxWords: number;
  maxChars: number;
  yRatio: number; // vertical centre of the caption block, as a fraction of video height
  entry: 'scale' | 'rise' | 'none'; // how the whole page enters
  fadeOutFrames: number;
  push?: boolean; // slow cinematic push-in while the page is on screen
  colors: {
    text: string;
    active: string[]; // cycled word by word
    stroke: string;
    glow?: [string, string];
  };
}

export const CAPTION_STYLES: Record<CaptionStyleId, CaptionStyle> = {
  // 1. Alex Hormozi: heavy uppercase, 3 words, active word changes colour + pops
  hormozi: {
    id: 'hormozi',
    label: 'Hormozi',
    description: 'Heavy uppercase, 3 words at a time, active word pops in yellow / green',
    loadFont: () => "'Montserrat', 'Arial Black', Impact, sans-serif",
    weight: 900,
    sizeRatio: 0.095,
    charWidthEm: 0.74,
    uppercase: true,
    stripPunctuation: true,
    letterSpacing: 0,
    lineHeight: 1.05,
    strokeRatio: 0.14,
    maxWords: 3,
    maxChars: 22,
    yRatio: 0.62,
    entry: 'scale',
    fadeOutFrames: 2,
    colors: { text: '#FFFFFF', active: ['#FFE600', '#27F06B', '#FF3B3B'], stroke: '#000000' },
  },

  // 2. MrBeast: ONE huge word at a time, bouncy pop, thick outline, hard 3D shadow
  beast: {
    id: 'beast',
    label: 'Beast',
    description: 'One giant word at a time, bouncy pop, thick outline, slight tilt',
    loadFont: () => "'Luckiest Guy', 'Arial Black', Impact, cursive, sans-serif",
    weight: 400,
    sizeRatio: 0.15,
    charWidthEm: 0.66,
    uppercase: true,
    stripPunctuation: true,
    letterSpacing: 0.01,
    lineHeight: 1,
    strokeRatio: 0.2,
    maxWords: 1,
    maxChars: 18,
    yRatio: 0.55,
    entry: 'none',
    fadeOutFrames: 0,
    colors: { text: '#FFFFFF', active: ['#FFFFFF', '#FFE600', '#3DF0FF', '#FF5A5A'], stroke: '#000000' },
  },

  // 3. Pinterest: big soft serif, lowercase, blur-fade in, one word italic emphasis
  pinterest: {
    id: 'pinterest',
    label: 'Pinterest',
    description: 'Big soft serif, lowercase, words fade in softly, one italic emphasis word',
    loadFont: () => "'DM Serif Display', Georgia, serif",
    weight: 400,
    sizeRatio: 0.115,
    charWidthEm: 0.5,
    uppercase: false,
    stripPunctuation: false,
    letterSpacing: -0.01,
    lineHeight: 1.08,
    strokeRatio: 0,
    maxWords: 6,
    maxChars: 34,
    yRatio: 0.68,
    entry: 'none',
    fadeOutFrames: 6,
    colors: { text: '#FFFFFF', active: ['#FFFFFF'], stroke: '#000000' },
  },

  // 4. Pill / Capsule: rounded highlight box jumps from word to word
  pill: {
    id: 'pill',
    label: 'Pill',
    description: 'Clean modern sans, rounded highlight capsule jumps from word to word',
    loadFont: () => "'Poppins', 'Segoe UI', Arial, sans-serif",
    weight: 800,
    sizeRatio: 0.08,
    charWidthEm: 0.66,
    uppercase: false,
    stripPunctuation: true,
    letterSpacing: -0.01,
    lineHeight: 1.25,
    strokeRatio: 0,
    maxWords: 4,
    maxChars: 26,
    yRatio: 0.7,
    entry: 'rise',
    fadeOutFrames: 3,
    colors: { text: '#FFFFFF', active: ['#FF4A1C'], stroke: '#000000' },
  },

  // 5. Cyber Neon: tall condensed caps, dim until spoken, then glows
  neon: {
    id: 'neon',
    label: 'Neon',
    description: 'Tall condensed caps, dim until spoken, then glows cyan / violet',
    loadFont: () => "'Bebas Neue', Impact, 'Arial Narrow', sans-serif",
    weight: 400,
    sizeRatio: 0.13,
    charWidthEm: 0.42,
    uppercase: true,
    stripPunctuation: true,
    letterSpacing: 0.04,
    lineHeight: 1,
    strokeRatio: 0,
    maxWords: 4,
    maxChars: 24,
    yRatio: 0.5,
    entry: 'none',
    fadeOutFrames: 4,
    colors: {
      text: 'rgba(255,255,255,0.4)',
      active: ['#FFFFFF'],
      stroke: '#000000',
      glow: ['#00F0FF', '#8A5CFF'],
    },
  },

  // ---------- Cinematic / Editorial ----------

  // 6. Cinzel: film title-card capitals, wide tracking, gold active word
  cinzel: {
    id: 'cinzel',
    label: 'Cinematic',
    description: 'Film title-card capitals, wide tracking, ivory text, gold active word',
    loadFont: () => "'Cinzel', Georgia, serif",
    weight: 700,
    sizeRatio: 0.1,
    charWidthEm: 0.8,
    uppercase: true,
    stripPunctuation: true,
    letterSpacing: 0.1,
    lineHeight: 1.25,
    strokeRatio: 0,
    maxWords: 3,
    maxChars: 20,
    yRatio: 0.55,
    entry: 'none',
    fadeOutFrames: 8,
    colors: { text: '#F3E9D2', active: ['#F5D58A'], stroke: '#000000' },
  },

  // 7. Editorial: high-contrast Bodoni italic, magazine-cover rise
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    description: 'High-contrast Bodoni italic, big lowercase, words rise like a magazine cover',
    loadFont: () => "'Bodoni Moda', Georgia, serif",
    weight: 500,
    sizeRatio: 0.125,
    charWidthEm: 0.5,
    uppercase: false,
    stripPunctuation: false,
    letterSpacing: -0.015,
    lineHeight: 1.05,
    strokeRatio: 0,
    maxWords: 5,
    maxChars: 30,
    yRatio: 0.66,
    entry: 'rise',
    fadeOutFrames: 6,
    colors: { text: '#FFFFFF', active: ['#FFFFFF'], stroke: '#000000' },
  },

  // 8. Trailer: giant condensed caps, 2 words, slow push-in
  trailer: {
    id: 'trailer',
    label: 'Trailer',
    description: 'Giant condensed caps, 2 words, hard cut-in and slow push-in',
    loadFont: () => "'Anton', Impact, 'Arial Narrow', sans-serif",
    weight: 400,
    sizeRatio: 0.17,
    charWidthEm: 0.5,
    uppercase: true,
    stripPunctuation: true,
    letterSpacing: 0.04,
    lineHeight: 1,
    strokeRatio: 0,
    maxWords: 2,
    maxChars: 16,
    yRatio: 0.5,
    entry: 'none',
    fadeOutFrames: 3,
    push: true,
    colors: { text: '#F4F4F4', active: ['#FF4A1C'], stroke: '#000000' },
  },

  // ---------- Very minimal ----------

  // 9. Clean: small neutral sans, whole line at once, spoken word at full brightness
  clean: {
    id: 'clean',
    label: 'Clean',
    description: 'Small neutral sans, whole line visible, spoken word at full brightness',
    loadFont: () => "'Inter', system-ui, Arial, sans-serif",
    weight: 500,
    sizeRatio: 0.052,
    charWidthEm: 0.55,
    uppercase: false,
    stripPunctuation: false,
    letterSpacing: -0.005,
    lineHeight: 1.3,
    strokeRatio: 0,
    maxWords: 7,
    maxChars: 44,
    yRatio: 0.78,
    entry: 'none',
    fadeOutFrames: 4,
    colors: { text: '#FFFFFF', active: ['#FFFFFF'], stroke: '#000000' },
  },

  // 10. Whisper: thin, widely spaced capitals that fade in one by one
  whisper: {
    id: 'whisper',
    label: 'Whisper',
    description: 'Thin, widely spaced capitals fading in word by word, centred and quiet',
    loadFont: () => "'Jost', system-ui, Arial, sans-serif",
    weight: 300,
    sizeRatio: 0.058,
    charWidthEm: 0.55,
    uppercase: true,
    stripPunctuation: true,
    letterSpacing: 0.28,
    lineHeight: 1.5,
    strokeRatio: 0,
    maxWords: 4,
    maxChars: 26,
    yRatio: 0.5,
    entry: 'none',
    fadeOutFrames: 8,
    colors: { text: '#FFFFFF', active: ['#FFFFFF'], stroke: '#000000' },
  },
};

// Handy for a style picker in the app UI
export const CAPTION_STYLE_LIST = Object.values(CAPTION_STYLES);
