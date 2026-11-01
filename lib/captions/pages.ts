// captions/pages.ts
// Turns Whisper word timestamps into "pages" (the chunk of words shown on screen together).

export interface Word {
  text: string;
  start: number; // seconds
  end: number; // seconds
}

export interface Page {
  words: Word[];
  start: number;
  end: number;
}

export interface PageOptions {
  maxWords: number;
  maxChars: number;
  maxGap?: number; // seconds of silence that forces a new page
}

// Whisper / faster-whisper / whisper.cpp all emit { word | text, start, end }
export interface WhisperWord {
  word?: string;
  text?: string;
  start: number;
  end: number;
}

export const normalizeWords = (raw: WhisperWord[]): Word[] =>
  raw
    .map((w) => ({ text: (w.word ?? w.text ?? '').trim(), start: w.start, end: w.end }))
    .filter((w) => w.text.length > 0)
    .map((w) => ({ ...w, end: Math.max(w.end, w.start + 0.08) }))
    .sort((a, b) => a.start - b.start);

// Convenience: full Whisper JSON (word_timestamps=True) -> Word[]
export const flattenWhisper = (json: {
  segments: { words?: WhisperWord[] }[];
}): Word[] => normalizeWords(json.segments.flatMap((s) => s.words ?? []));

export const buildPages = (words: Word[], opts: PageOptions): Page[] => {
  const maxGap = opts.maxGap ?? 0.6;
  const pages: Page[] = [];
  let cur: Word[] = [];

  const flush = () => {
    if (cur.length === 0) return;
    pages.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };

  for (const w of words) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    const tooMany = cur.length >= opts.maxWords;
    const tooLong = chars > opts.maxChars;
    const gap = prev ? w.start - prev.end > maxGap : false;
    if (cur.length > 0 && (tooMany || tooLong || gap)) flush();
    cur.push(w);
    if (/[.?!]$/.test(w.text)) flush(); // sentence end = new page
  }
  flush();

  // Hold each page until the next one starts (if the gap is small) so captions never flicker.
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    pages[i].end =
      next && next.start - pages[i].end < 0.4 ? next.start : pages[i].end + 0.12;
  }
  return pages;
};
