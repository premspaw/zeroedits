/**
 * Meta Muse — Pipeline B (Auto Video Editor) Types & Stage Definitions
 * Implements Meta Agent Workshop bounded execution patterns.
 */

export type PipelineBStage =
  | "UPLOADED"
  | "MEDIA_VALIDATED"
  | "TRANSCRIBED"
  | "TRANSCRIPT_ALIGNED"
  | "EDIT_PLANNED"
  | "CUTS_VALIDATED"
  | "CLEAN_VIDEO_CREATED"
  | "VISUAL_PLAN_CREATED"
  | "ASSETS_RESOLVED"
  | "MOTION_GENERATED"
  | "PREVIEW_READY"
  | "EXPORT_REQUESTED"
  | "EXPORT_COMPLETED"
  | "FAILED"
  | "NEEDS_REVIEW";

export interface MediaMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  audioSampleRate?: number;
  audioChannels?: number;
  formatName?: string;
  sizeBytes: number;
}

export interface TranscriptWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
  confidence?: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

export type PacingProfile = "snappy" | "natural" | "relaxed";

export interface PacingConfig {
  profile: PacingProfile;
  minSilenceDuration: number;
  /** Margin kept for mid-sentence word gaps. */
  preservedSilenceMargin: number;
  minSpeechMargin: number;
  /** Margin kept after sentence-ending punctuation / transcript segment ends (0.18-0.25s). */
  sentenceBoundaryMargin?: number;
  /** Mid-sentence gaps at/above this length are treated as deliberate dramatic pauses. */
  dramaticPauseThreshold?: number;
  /** Lead-in silence kept before the next word after a dramatic pause. */
  dramaticPauseMargin?: number;
}

export interface CandidateCut {
  id: string;
  start: number;
  end: number;
  type: "silence" | "filler" | "repetition" | "phrase_retake" | "sentence_pause" | "false_start" | "correction";
  classification:
    | "accidental_stutter"
    | "intentional_emphasis"
    | "filler_pause"
    | "natural_pause"
    | "dead_air"
    | "uncertain"
    | "needs_review";
  confidence: number;
  affectedText: string;
  reason: string;
  alternativeKeepOption?: {
    start: number;
    end: number;
    description: string;
  };
}

export interface ProtectedRange {
  start: number;
  end: number;
  reason: string;
  protectedWords?: string;
}

export interface EditCut {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  type: "silence" | "filler" | "retake" | "off_script" | "user_specified";
  reason: string;
  cutWord?: string;
}

export interface KeepSegment {
  start: number;
  end: number;
  duration: number;
  zoomScale: number; // 1.0 (standard) or 1.15 (punch-in emphasis)
}

export type VisualSegmentLayout =
  | "fullscreen_speaker"
  | "split_screen"
  | "stacked_layout"
  | "picture_in_picture"
  | "broll_takeover"
  | "sam_cutout"
  | "depth_cutout";

export type ZaiCutoutMode =
  | "animation_then_cutout"
  | "depth_behind_speaker"
  | "collage_cutout"
  | "pure_animation"
  | "fullscreen_speaker";

export interface SAMCutoutBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  normX: number; // 0.0 - 1.0
  normY: number; // 0.0 - 1.0
  normW: number; // 0.0 - 1.0
  normH: number; // 0.0 - 1.0
  confidence?: number;
  fileId?: string;
  objectId?: string;
  maskHeight?: number;
  maskWidth?: number;
  maskEncoding?: "lossless" | "one_bit";
  maskPayload?: string;
  maskRle?: {
    size: [number, number];
    counts: string | number[];
  };
  maskSvgPath?: string;
  /** Public URL of the frame-by-frame SAM 3.1 mask track JSON (`sam_track.json`). */
  trackUrl?: string;
  /** Number of per-frame masks in the track. */
  trackFrameCount?: number;
  frameMasks?: Array<{
    frameIndex: number;
    normX: number;
    normY: number;
    normW: number;
    normH: number;
    maskHeight: number;
    maskWidth: number;
    svgPath: string;
  }>;
}

export type VisualTechnique =
  | "kinetic_typography"
  | "dynamic_captions"
  | "animated_diagram"
  | "procedural_graphic"
  | "ui_mockup"
  | "broll_clip"
  | "generated_image"
  | "ai_video"
  | "sam_cutout_pop"
  | "camera_punch_in"
  | "brand_lower_third";

export interface VisualAssetRequirement {
  type: "image" | "video" | "icon" | "diagram" | "ui_mockup";
  description: string;
  sourceUrl?: string;
  prompt?: string;
}

export interface VisualPlanSegment {
  id: string;
  start: number; // in seconds relative to clean video
  end: number;   // in seconds relative to clean video
  layoutType: VisualSegmentLayout;
  technique: VisualTechnique;
  spokenReference: string;
  motionIntent: string;
  visualRecipe?: {
    metaphor: string;
    style?: "auto" | "clay_3d" | "paper_cut" | "paper_card" | "procedural" | "glass" | "black_neon" | "anime";
    objects: Array<{
      label: string;
      shape: "circle" | "rect" | "diamond" | "line" | "text";
      motion: "rise" | "orbit" | "pulse" | "slide" | "unfold" | "scatter";
      position: "upper-left" | "upper-right" | "center" | "lower-left" | "lower-right";
    }>;
  };
  requiredAssets?: VisualAssetRequirement[];
  layerArrangement: "background" | "main" | "overlay" | "foreground";
  transitionDirection:
    | "slide_up"
    | "slide_down"
    | "slide_left"
    | "slide_right"
    | "pop_in"
    | "zoom_in"
    | "fade"
    | "none";
  cameraZoom?: number;
  headlineText?: string;
  cutoutMode?: ZaiCutoutMode;
  animationLeadInSec?: number; // Seconds the codebase story animation runs BEFORE the talking-head cutout pops in
  brandSettings?: {
    primaryColor?: string;
    highlightColor?: string;
    fontFamily?: string;
  };
}

export interface VisualOverlayItem {
  id: string;
  type: "kinetic_word" | "icon_badge" | "image_overlay" | "progress_bar" | "lower_third" | "sound_effect";
  timestamp: number; // in seconds relative to clean video
  duration: number;
  content: string;
  animation?: "pop" | "bounce" | "slide_up" | "fade";
  style?: Record<string, any>;
  soundName?: string;
  segmentId?: string;
}

export interface EditedTranscriptWord {
  word: string;
  sourceStart: number;
  sourceEnd: number;
  editedStart: number;
  editedEnd: number;
  confidence?: number;
}

export interface EditedTranscriptSegment {
  id: number;
  start: number; // in seconds relative to clean video
  end: number;   // in seconds relative to clean video
  text: string;
  words: EditedTranscriptWord[];
}

export interface EditPlan {
  runId?: string;
  title: string;
  hookLine: string;
  cuts: EditCut[];
  keepSegments: KeepSegment[];
  cleanDuration: number;
  cutDuration: number;
  cutSilenceDuration?: number;
  cutFillerDuration?: number;
  cutRepetitionDuration?: number;
  cutSilenceSegmentsCount?: number;
  cutRepetitionsCount?: number;
  cutFillersCount?: number;
  candidateCuts?: CandidateCut[];
  protectedRanges?: ProtectedRange[];
  uncertainDecisions?: {
    candidateId: string;
    actionTaken: "kept_safe" | "cut";
    rationale: string;
  }[];
  pacingProfile?: PacingProfile;
  visualPlan: VisualOverlayItem[];
  visualSegments?: VisualPlanSegment[];
  editedTranscript?: EditedTranscriptSegment[];
  transcript?: TranscriptSegment[];
  templateId: string;
  notes: string;
  samBox?: SAMCutoutBox;
  samCutoutUrl?: string;
}

export interface StageRecord {
  stage: PipelineBStage;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  input?: any;
  output?: any;
  error?: string;
}

export interface PipelineBRunState {
  runId: string;
  createdAt: string;
  updatedAt: string;
  currentStage: PipelineBStage;
  status: "idle" | "running" | "paused" | "completed" | "failed" | "needs_review";
  reviewReason?: string;
  rawVideoPath: string;
  userScript?: string;
  templateId: string;
  mode?: "wonder-ai" | "rules-only";
  pacingProfile?: PacingProfile;
  transcriptionCoverage?: {
    model: string;
    source: "whisper" | "script_fallback";
    lastWordEnd: number;
    totalDuration: number;
    untranscribedTailSec: number;
    complete: boolean;
  };
  metadata?: MediaMetadata;
  transcript?: TranscriptSegment[];
  editedTranscript?: EditedTranscriptSegment[];
  silences?: { start: number; end: number; duration: number }[];
  alignedScript?: {
    matchedWords: number;
    deviationScore: number;
    notes: string;
  };
  editPlan?: EditPlan;
  /** Constant-30fps master transcoded from the ORIGINAL full-res upload. All cuts are computed and rendered from this. */
  cfrVideoPath?: string;
  /** Automated QA gate results (duration, word parity, mask, safe zone, loop seam). */
  qaReport?: import("./tools/qa-gates.ts").QaReport;
  cleanVideoPath?: string;
  motionCodePath?: string;
  previewUrl?: string;
  finalVideoPath?: string;
  resolvedAssets?: Record<string, string>;
  stages: Record<PipelineBStage, StageRecord>;
  logs: { timestamp: string; level: "info" | "warn" | "error"; message: string }[];
}

