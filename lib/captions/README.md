# Caption layer (Remotion)

10 auto-caption styles driven by Whisper word timestamps. Drop-in layer for any Remotion composition,
live preview in your app via `@remotion/player`, and renders to MP4 with `npx remotion render`.

## Styles

| id | Label | Feel |
|---|---|---|
| `hormozi` | Hormozi | Heavy uppercase, 3 words, active word pops yellow / green / red |
| `beast` | Beast | One giant word at a time, bouncy pop, thick outline |
| `pinterest` | Pinterest | Big soft serif, lowercase, blur-fade in, one italic emphasis word |
| `pill` | Pill | Rounded orange-red box jumps word to word |
| `neon` | Neon | Tall condensed caps, dim until spoken, then glows |
| `cinzel` | Cinematic | Film title-card capitals, wide tracking, gold active word |
| `editorial` | Editorial | High-contrast Bodoni italic, magazine-cover rise |
| `trailer` | Trailer | Giant condensed caps, 2 words, slow push-in |
| `clean` | Clean | Small neutral sans, spoken word at full brightness |
| `whisper` | Whisper | Thin, widely spaced capitals fading in word by word |

Fonts (all SIL OFL or Apache 2.0): Montserrat, Luckiest Guy, DM Serif Display, Poppins, Bebas Neue,
Cinzel, Bodoni Moda, Anton, Inter, Jost.

## Install

```bash
npm i remotion @remotion/cli @remotion/google-fonts @remotion/player react react-dom
```

Copy the `captions/` folder into `src/`.

## Use

```tsx
import { CaptionLayer, flattenWhisper } from './captions';

const words = flattenWhisper(whisperJson); // Whisper with word_timestamps=true

<AbsoluteFill>
  <OffthreadVideo src={staticFile('reel.mp4')} />
  <CaptionLayer words={words} styleId="cinzel" />
</AbsoluteFill>
```

Optional props: `sizeScale` (1.2 = 20% bigger), `yRatio` (0 top, 1 bottom), `accentColors` (override highlight colours).

Style picker in your UI: map over `CAPTION_STYLE_LIST` (id, label, description).

See `usage.example.tsx` for a full composition, Player preview and render command.

## Add a style

1. Add the id to `CaptionStyleId` in `styles.ts`.
2. Add an entry in `CAPTION_STYLES` (font, size, position, colours, words per page).
3. Add a `case` for it in `CaptionLayer.tsx` (the per-word look and animation).

Type-checks clean (`tsc --strict`) against Remotion + @remotion/google-fonts.

## preview.html

Open it in a browser to see all 10 styles animate, no setup needed. It is a browser approximation of the
Remotion output (fonts load from Google Fonts).
