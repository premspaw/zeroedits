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
  type: "silence" | "filler" | "repetition" | "phrase_retake" | "sentence_pause";
  classification: "accidental_stutter" | "intentional_emphasis" | "filler_pause" | "natural_pause" | "dead_air";
  confidence: number;
  affectedText: string;
  reason: string;
}

export interface ProtectedRange {
  start: number;
  end: number;
  reason: string;
}

export interface EditCut {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  type: "silence" | "filler" | "retake" | "off_script" | "user_specified";
  reason: string;
}

export interface KeepSegment {
  start: number;
  end: number;
  duration: number;
  zoomScale: number; // 1.0 (standard) or 1.15 (punch-in emphasis)
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
  pacingProfile?: PacingProfile;
  visualPlan: VisualOverlayItem[];
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
  metadata?: MediaMetadata;
  transcript?: TranscriptSegment[];
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
  stages: Record<PipelineBStage, StageRecord>;
  logs: { timestamp: string; level: "info" | "warn" | "error"; message: string }[];
}
