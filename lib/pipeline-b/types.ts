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
  preservedSilenceMargin: number;
  minSpeechMargin: number;
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
  | "sam_cutout";

export type VisualTechnique =
  | "kinetic_typography"
  | "dynamic_captions"
  | "animated_diagram"
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
  cleanVideoPath?: string;
  motionCodePath?: string;
  previewUrl?: string;
  finalVideoPath?: string;
  resolvedAssets?: Record<string, string>;
  stages: Record<PipelineBStage, StageRecord>;
  logs: { timestamp: string; level: "info" | "warn" | "error"; message: string }[];
}

