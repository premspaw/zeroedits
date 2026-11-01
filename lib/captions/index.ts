// captions/index.ts  -  import everything from one place:
//   import { CaptionLayer, flattenWhisper, CAPTION_STYLE_LIST } from './captions';

export { CaptionLayer } from './CaptionLayer';
export type { CaptionLayerProps } from './CaptionLayer';
export { CAPTION_STYLES, CAPTION_STYLE_LIST } from './styles';
export type { CaptionStyle, CaptionStyleId } from './styles';
export { buildPages, flattenWhisper, normalizeWords } from './pages';
export type { Word, Page, WhisperWord, PageOptions } from './pages';
