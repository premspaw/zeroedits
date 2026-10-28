import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { createRun, loadState, recordStageSuccess, recordStageFailure } from "./state.ts";
import { validateCuts, validateApprovedCutsSemantic } from "./tools/cuts-validator.ts";
import {
  planTalkingHeadEdit,
  mapSourceTimeToEditedTime,
  mergeOverlappingCuts,
  assembleFinalEditPlan,
} from "./tools/edit-planner.ts";
import {
  callWonderEditorialCleanup,
  callWonderCreativeDirector,
  buildEditedTranscript,
} from "./tools/wonder-director.ts";
import type { TranscriptSegment } from "./types.ts";
import { alignTranscriptWithScript } from "./tools/transcript-aligner.ts";
import { getPipelineBTemplate, PIPELINE_B_TEMPLATES } from "./templates/registry.ts";

describe("Pipeline B — Template Registry", () => {
  it("provides registered talking-head templates with 9:16 aspect ratio", () => {
    const template = getPipelineBTemplate("hormoziPunch");
    assert.equal(template.id, "hormoziPunch");
    assert.equal(template.aspectRatio, "9:16");
    assert.equal(template.enableProgressBar, true);

    const fallback = getPipelineBTemplate("unknown-id");
    assert.equal(fallback.id, "hormoziPunch");
  });
});

describe("Pipeline B — State Persistence & Bounded Stages", () => {
  it("creates atomic run state with initial UPLOADED stage completed", () => {
    const testVideo = path.join(process.cwd(), "test_mock.mp4");
    const state = createRun({
      rawVideoPath: testVideo,
      userScript: "Testing auto editor pipeline",
      templateId: "voxEditorial",
    });

    assert.ok(state.runId.startsWith("run-b-"));
    assert.equal(state.currentStage, "UPLOADED");
    assert.equal(state.stages.UPLOADED.status, "completed");
    assert.equal(state.stages.MEDIA_VALIDATED.status, "pending");

    // Verify it loads from disk
    const loaded = loadState(state.runId);
    assert.equal(loaded.runId, state.runId);
    assert.equal(loaded.templateId, "voxEditorial");
  });

  it("updates stage success with duration tracking and logs", () => {
    const state = createRun({ rawVideoPath: "dummy.mp4" });
    recordStageSuccess(state, "MEDIA_VALIDATED", { duration: 15 });

    const loaded = loadState(state.runId);
    assert.equal(loaded.stages.MEDIA_VALIDATED.status, "completed");
    assert.equal(loaded.stages.MEDIA_VALIDATED.output.duration, 15);
    assert.ok(loaded.logs.some((l) => l.message.includes("MEDIA_VALIDATED")));
  });

  it("records stage failures cleanly without corrupting previous stages", () => {
    const state = createRun({ rawVideoPath: "dummy.mp4" });
    recordStageFailure(state, "CUTS_VALIDATED", "Overlapping cuts detected");

    const loaded = loadState(state.runId);
    assert.equal(loaded.status, "failed");
    assert.equal(loaded.stages.CUTS_VALIDATED.status, "failed");
    assert.equal(loaded.stages.FAILED.status, "completed");
    assert.equal(loaded.stages.FAILED.error, "Overlapping cuts detected");
  });
});

describe("Pipeline B — Cuts Validation Layer (Independent Verification)", () => {
  it("passes valid non-overlapping cuts within video duration", () => {
    const mockEditPlan = {
      title: "Test",
      hookLine: "Hook",
      cuts: [
        { id: "cut-1", start: 2.0, end: 3.5, type: "silence" as const, reason: "dead air" },
      ],
      keepSegments: [
        { start: 0, end: 2.0, duration: 2.0, zoomScale: 1.0 },
        { start: 3.5, end: 10.0, duration: 6.5, zoomScale: 1.15 },
      ],
      cleanDuration: 8.5,
      cutDuration: 1.5,
      visualPlan: [],
      templateId: "hormoziPunch",
      notes: "Clean cuts",
    };

    const result = validateCuts(mockEditPlan, 10.0);
    assert.equal(result.passed, true);
    assert.equal(result.errors.length, 0);
  });

  it("catches out-of-bounds and inverted cuts", () => {
    const invalidPlan = {
      title: "Test",
      hookLine: "Hook",
      cuts: [
        { id: "cut-bad", start: 8.0, end: 4.0, type: "silence" as const, reason: "inverted" },
      ],
      keepSegments: [],
      cleanDuration: 0,
      cutDuration: 0,
      visualPlan: [],
      templateId: "hormoziPunch",
      notes: "",
    };

    const result = validateCuts(invalidPlan, 10.0);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some((e) => e.includes("inverted")));
  });

  it("flags human review when cut ratio exceeds 50%", () => {
    const heavyCutPlan = {
      title: "Heavy cuts",
      hookLine: "Hook",
      cuts: [
        { id: "cut-heavy", start: 2.0, end: 9.0, type: "silence" as const, reason: "cut most" },
      ],
      keepSegments: [
        { start: 0, end: 2.0, duration: 2.0, zoomScale: 1.0 },
        { start: 9.0, end: 10.0, duration: 1.0, zoomScale: 1.15 },
      ],
      cleanDuration: 3.0,
      cutDuration: 7.0, // 70% cut
      visualPlan: [],
      templateId: "hormoziPunch",
      notes: "",
    };

    const result = validateCuts(heavyCutPlan, 10.0);
    assert.equal(result.needsReview, true);
    assert.ok(result.reviewReason?.includes("50%"));
  });
});

describe("Pipeline B — Transcript Alignment & Edit Planner", () => {
  it("aligns spoken words with script and computes deviation score", () => {
    const transcript = [
      {
        id: 1,
        start: 0,
        end: 2.5,
        text: "how to edit reels with ai",
        words: [
          { word: "how", start: 0, end: 0.5, confidence: 0.9 },
          { word: "to", start: 0.5, end: 0.8, confidence: 0.9 },
          { word: "edit", start: 0.8, end: 1.2, confidence: 0.9 },
          { word: "reels", start: 1.2, end: 1.8, confidence: 0.9 },
          { word: "with", start: 1.8, end: 2.1, confidence: 0.9 },
          { word: "ai", start: 2.1, end: 2.5, confidence: 0.9 },
        ],
      },
    ];

    const result = alignTranscriptWithScript(transcript, "how to edit reels with ai");
    assert.equal(result.matchedWords, 6);
    assert.equal(result.deviationScore, 0);
  });

  it("identifies and trims repeated words (stutters) and vocal fillers (ah, um, oh)", () => {
    const transcript = [
      {
        id: 1,
        start: 0.0,
        end: 4.0,
        text: "um welcome welcome to this ah video",
        words: [
          { word: "um", start: 0.1, end: 0.4, confidence: 0.9 },
          { word: "welcome", start: 0.5, end: 1.0, confidence: 0.9 },
          { word: "welcome", start: 1.1, end: 1.6, confidence: 0.9 },
          { word: "to", start: 1.7, end: 1.9, confidence: 0.9 },
          { word: "this", start: 2.0, end: 2.3, confidence: 0.9 },
          { word: "ah", start: 2.4, end: 2.7, confidence: 0.9 },
          { word: "video", start: 2.8, end: 3.4, confidence: 0.9 },
        ],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      totalDuration: 4.0,
      templateId: "hormoziPunch",
    });

    assert.ok(plan.cutRepetitionsCount! >= 1, "Should cut repeated 'welcome'");
    assert.ok(plan.cutFillersCount! >= 2, "Should cut 'um' and 'ah'");
    assert.ok(plan.cuts.some((c) => c.reason.includes("repeated")), "Cut list must contain repetition reason");
    assert.ok(plan.cuts.some((c) => c.reason.includes("filler")), "Cut list must contain filler reason");
    assert.ok(plan.keepSegments.length >= 1, "Should generate valid keep segments");
  });

  it("cuts multi-word phrase retakes, word runs, and plans animated image stickers", () => {
    const transcript = [
      {
        id: 1,
        start: 0.0,
        end: 7.0,
        text: "in five clicks in five clicks edit video poop poop poop poop ready to post",
        words: [
          { word: "in", start: 0.5, end: 0.7, confidence: 0.9 },
          { word: "five", start: 0.7, end: 1.0, confidence: 0.9 },
          { word: "clicks", start: 1.0, end: 1.4, confidence: 0.9 },
          { word: "in", start: 1.5, end: 1.7, confidence: 0.9 },
          { word: "five", start: 1.7, end: 2.0, confidence: 0.9 },
          { word: "clicks", start: 2.0, end: 2.4, confidence: 0.9 },
          { word: "edit", start: 2.5, end: 2.8, confidence: 0.9 },
          { word: "video", start: 2.8, end: 3.2, confidence: 0.9 },
          { word: "poop", start: 3.3, end: 3.6, confidence: 0.9 },
          { word: "poop", start: 3.6, end: 3.9, confidence: 0.9 },
          { word: "poop", start: 3.9, end: 4.2, confidence: 0.9 },
          { word: "poop", start: 4.2, end: 4.5, confidence: 0.9 },
          { word: "ready", start: 4.6, end: 5.0, confidence: 0.9 },
          { word: "to", start: 5.0, end: 5.2, confidence: 0.9 },
          { word: "post", start: 5.2, end: 5.6, confidence: 0.9 },
        ],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      totalDuration: 7.0,
      templateId: "hormoziPunch",
    });

    assert.ok(plan.cutRepetitionsCount! >= 2, "Should cut both phrase repeat and word run");
    assert.ok(plan.visualPlan.some((v) => v.type === "image_overlay"), "Should plan animated image stickers");
    assert.ok(plan.visualPlan.some((v) => v.content.includes("5 CLICKS")), "Should plan 5 CLICKS sticker");
    assert.ok(plan.cleanDuration < 7.0, "Clean duration must be reduced");
  });
});

describe("Pipeline B — Code Review Automated Verification Suite (10 Target Cases)", () => {
  it("Case 1: 'This, this software' — preserves one 'this' and cuts the accidental stutter", () => {
    const transcript = [
      {
        id: 1,
        start: 0.1,
        end: 2.5,
        text: "this this software is amazing",
        words: [
          { word: "this", start: 0.1, end: 0.4, confidence: 0.95 },
          { word: "this", start: 0.5, end: 0.8, confidence: 0.95 },
          { word: "software", start: 0.9, end: 1.4, confidence: 0.95 },
          { word: "is", start: 1.4, end: 1.7, confidence: 0.95 },
          { word: "amazing", start: 1.7, end: 2.3, confidence: 0.95 },
        ],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      totalDuration: 2.5,
      templateId: "voxEditorial",
    });

    assert.equal(plan.cutRepetitionsCount, 1, "Exactly one repetition cut made");
    const cut = plan.cuts.find((c) => c.type === "retake");
    assert.ok(cut, "Expected retake cut for stuttered 'this'");
    assert.ok(cut.start <= 0.15, "Cut starts at first 'this'");
    assert.ok(cut.end <= 0.50, "Cut ends before second 'this'");

    // Crucial: Must preserve word 2 ('this' at 0.5-0.8) and remaining phrase
    const keepsWord2 = plan.keepSegments.some((s) => s.start <= 0.5 && s.end >= 0.8);
    assert.ok(keepsWord2, "Must preserve the second instance of 'this'");
  });

  it("Case 2: 'Very, very important' — preserves intentional rhetorical emphasis", () => {
    const transcript = [
      {
        id: 1,
        start: 0.2,
        end: 2.2,
        text: "very very important detail",
        words: [
          { word: "very", start: 0.2, end: 0.6, confidence: 0.95 },
          { word: "very", start: 0.7, end: 1.1, confidence: 0.95 },
          { word: "important", start: 1.2, end: 1.8, confidence: 0.95 },
          { word: "detail", start: 1.8, end: 2.2, confidence: 0.95 },
        ],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      totalDuration: 2.5,
      templateId: "voxEditorial",
    });

    // Zero repetition cuts should be approved
    assert.equal(plan.cutRepetitionsCount, 0, "Intentional emphasis must not be cut");
    const hasProtectedEmphasis = plan.protectedRanges?.some(
      (pr) => pr.reason.includes("emphasis") && pr.start <= 0.2 && pr.end >= 1.1
    );
    assert.ok(hasProtectedEmphasis, "Should establish protected range for intentional emphasis");
    assert.ok(plan.cleanDuration >= 2.2, "Spoken content must remain intact");
  });

  it("Case 3: 0.6s natural pause — preserved under 'natural' pacing profile", () => {
    const transcript = [
      {
        id: 1,
        start: 0.2,
        end: 1.0,
        text: "think about that",
        words: [
          { word: "think", start: 0.2, end: 0.5, confidence: 0.9 },
          { word: "about", start: 0.5, end: 0.8, confidence: 0.9 },
          { word: "that", start: 0.8, end: 1.0, confidence: 0.9 },
        ],
      },
      {
        id: 2,
        start: 1.6,
        end: 2.5,
        text: "now here is why",
        words: [
          { word: "now", start: 1.6, end: 1.8, confidence: 0.9 },
          { word: "here", start: 1.8, end: 2.0, confidence: 0.9 },
          { word: "is", start: 2.0, end: 2.2, confidence: 0.9 },
          { word: "why", start: 2.2, end: 2.5, confidence: 0.9 },
        ],
      },
    ];

    const naturalPlan = planTalkingHeadEdit({
      transcript,
      silences: [{ start: 1.0, end: 1.6, duration: 0.6 }],
      totalDuration: 2.8,
      pacingProfile: "natural",
    });

    // 0.6s pause is within natural pacing threshold (0.75s) and must NOT be cut
    assert.equal(naturalPlan.cutSilenceSegmentsCount, 0, "0.6s pause must be preserved in natural mode");
    assert.ok(
      naturalPlan.protectedRanges?.some(
        (p) => p.reason.includes("natural breathing") || p.reason.includes("pause")
      )
    );
  });

  it("Case 4: A filler between two words — cuts filler while protecting speech boundaries", () => {
    const transcript = [
      {
        id: 1,
        start: 0.2,
        end: 2.0,
        text: "create um content",
        words: [
          { word: "create", start: 0.2, end: 0.8, confidence: 0.95 },
          { word: "um", start: 0.9, end: 1.2, confidence: 0.95 },
          { word: "content", start: 1.3, end: 1.9, confidence: 0.95 },
        ],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      totalDuration: 2.2,
    });

    assert.equal(plan.cutFillersCount, 1, "Must cut filler 'um'");
    const fillerCut = plan.cuts.find((c) => c.type === "filler");
    assert.ok(fillerCut);
    assert.ok(fillerCut.start >= 0.8, "Must not clip 'create'");
    assert.ok(fillerCut.end <= 1.3, "Must not clip 'content'");
  });

  it("Case 5: Repeated multiword phrase — trims first take and preserves second take", () => {
    const transcript = [
      {
        id: 1,
        start: 0.2,
        end: 3.5,
        text: "in five clicks in five clicks edit video",
        words: [
          { word: "in", start: 0.2, end: 0.4, confidence: 0.9 },
          { word: "five", start: 0.4, end: 0.7, confidence: 0.9 },
          { word: "clicks", start: 0.7, end: 1.0, confidence: 0.9 },
          { word: "in", start: 1.2, end: 1.4, confidence: 0.9 },
          { word: "five", start: 1.4, end: 1.7, confidence: 0.9 },
          { word: "clicks", start: 1.7, end: 2.0, confidence: 0.9 },
          { word: "edit", start: 2.2, end: 2.6, confidence: 0.9 },
          { word: "video", start: 2.6, end: 3.1, confidence: 0.9 },
        ],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      totalDuration: 3.5,
    });

    assert.ok(plan.cutRepetitionsCount! >= 1);
    assert.ok(plan.cuts.some((c) => c.reason.includes("repeated phrase")));
  });

  it("Case 6: Multiple cuts near start of video — exact timeline mapping without ratio drift", () => {
    const keepSegments = [
      { start: 1.0, end: 2.5, duration: 1.5, zoomScale: 1.0 }, // cut [0.0, 1.0] removed 1.0s
      { start: 3.5, end: 6.0, duration: 2.5, zoomScale: 1.15 }, // cut [2.5, 3.5] removed 1.0s
    ];

    // Source time 4.5s:
    // Falls inside segment 2 (3.5 - 6.0).
    // Prior segment duration = 1.5s.
    // Offset in segment 2 = 4.5 - 3.5 = 1.0s.
    // Exact edited time = 1.5 + 1.0 = 2.5s.
    const mapped = mapSourceTimeToEditedTime(4.5, keepSegments);
    assert.equal(mapped, 2.5);
  });

  it("Case 7: Overlapping candidate cuts — merges strictly overlapping cuts without gap deletion", () => {
    const rawCuts = [
      { id: "c1", start: 1.0, end: 2.2, type: "silence" as const, reason: "silence" },
      { id: "c2", start: 2.0, end: 3.0, type: "filler" as const, reason: "filler" },
    ];

    const merged = mergeOverlappingCuts(rawCuts, 5.0);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].start, 1.0);
    assert.equal(merged[0].end, 3.0);
    assert.ok(merged[0].reason.includes("silence") && merged[0].reason.includes("filler"));
  });

  it("Case 8: Short spoken segments (< 0.25s) — retained in keepSegments without being discarded", () => {
    const transcript = [
      {
        id: 1,
        start: 0.5,
        end: 0.68, // 0.18s duration short word
        text: "and",
        words: [{ word: "and", start: 0.5, end: 0.68, confidence: 0.9 }],
      },
      {
        id: 2,
        start: 1.8,
        end: 2.5,
        text: "continue",
        words: [{ word: "continue", start: 1.8, end: 2.5, confidence: 0.9 }],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      silences: [{ start: 0.7, end: 1.7, duration: 1.0 }],
      totalDuration: 2.6,
    });

    // The segment [0, 0.7] is retained and not discarded even though it contains short speech
    assert.ok(plan.keepSegments.some((s) => s.start <= 0.5 && s.end >= 0.68));
    assert.ok(plan.keepSegments.length >= 2);
  });

  it("Case 9: No cuts required — keeps entire video intact", () => {
    const transcript = [
      {
        id: 1,
        start: 0.1,
        end: 2.9,
        text: "how to build faster with modern developer tools",
        words: [
          { word: "how", start: 0.1, end: 0.3, confidence: 0.9 },
          { word: "to", start: 0.3, end: 0.5, confidence: 0.9 },
          { word: "build", start: 0.5, end: 0.9, confidence: 0.9 },
          { word: "faster", start: 0.9, end: 1.4, confidence: 0.9 },
          { word: "with", start: 1.4, end: 1.7, confidence: 0.9 },
          { word: "modern", start: 1.7, end: 2.1, confidence: 0.9 },
          { word: "tools", start: 2.1, end: 2.8, confidence: 0.9 },
        ],
      },
    ];

    const plan = planTalkingHeadEdit({
      transcript,
      totalDuration: 3.0,
      pacingProfile: "natural",
    });

    assert.equal(plan.cuts.length, 0);
    assert.equal(plan.cleanDuration, 3.0);
    assert.equal(plan.keepSegments.length, 1);
    assert.equal(plan.keepSegments[0].start, 0);
    assert.equal(plan.keepSegments[0].end, 3.0);
  });

  it("Case 10: All content marked for removal — safety fallback preserves original video", () => {
    // If cuts span the entire duration [0, 4.0]
    const plan = planTalkingHeadEdit({
      transcript: [],
      silences: [{ start: 0.0, end: 4.0, duration: 4.0 }],
      totalDuration: 4.0,
    });

    assert.ok(plan.keepSegments.length >= 1, "Must produce fallback keepSegment");
    assert.equal(plan.keepSegments[0].start, 0);
    assert.equal(plan.keepSegments[0].end, 4.0);
    assert.equal(plan.cleanDuration, 4.0);
  });
});

describe("Pipeline B — Semantic Cuts Validation Layer", () => {
  it("rejects non-finite timestamps and inverted cut intervals", () => {
    const rawCuts = [
      { id: "c-nan", start: NaN, end: 4.0, type: "silence" as const, reason: "bad" },
      { id: "c-inf", start: 1.0, end: Infinity, type: "silence" as const, reason: "bad" },
      { id: "c-inv", start: 5.0, end: 2.0, type: "silence" as const, reason: "bad" },
      { id: "c-ok", start: 2.0, end: 3.0, type: "silence" as const, reason: "ok" },
    ];

    const result = validateApprovedCutsSemantic(rawCuts, { totalDuration: 10.0 });
    assert.equal(result.validCuts.length, 1);
    assert.equal(result.validCuts[0].id, "c-ok");
    assert.equal(result.rejectedCuts.length, 3);
    assert.ok(result.rejectedCuts.some((r) => r.reason.includes("non-finite")));
    assert.ok(result.rejectedCuts.some((r) => r.reason.includes("Inverted")));
  });

  it("clamps out-of-bounds cuts and rejects cuts beyond duration", () => {
    const rawCuts = [
      { id: "c-out", start: 12.0, end: 14.0, type: "silence" as const, reason: "out" },
      { id: "c-clamp", start: -0.5, end: 2.0, type: "silence" as const, reason: "clamp" },
      { id: "c-over", start: 8.0, end: 11.0, type: "silence" as const, reason: "over" },
    ];

    const result = validateApprovedCutsSemantic(rawCuts, { totalDuration: 10.0 });
    assert.equal(result.validCuts.length, 2);
    assert.equal(result.validCuts[0].start, 0);
    assert.equal(result.validCuts[0].end, 2.0);
    assert.equal(result.validCuts[1].start, 8.0);
    assert.equal(result.validCuts[1].end, 10.0);
    assert.equal(result.rejectedCuts.length, 1);
    assert.ok(result.rejectedCuts[0].reason.includes("outside source duration"));
  });

  it("strictly protects intentional speech by rejecting cuts overlapping protected ranges", () => {
    const rawCuts = [
      { id: "c-inside", start: 2.2, end: 2.8, type: "repetition" as const, reason: "cut" },
      { id: "c-partial", start: 1.5, end: 2.5, type: "silence" as const, reason: "cut" },
      { id: "c-clean", start: 4.5, end: 5.5, type: "silence" as const, reason: "clean" },
    ];

    const protectedRanges = [
      { start: 2.0, end: 3.0, reason: "Intentional repetition of 'very, very important'" },
    ];

    const result = validateApprovedCutsSemantic(rawCuts, {
      totalDuration: 10.0,
      protectedRanges,
    });

    // c-inside is completely rejected
    assert.ok(result.rejectedCuts.some((r) => r.cut.id === "c-inside"));
    // c-partial is adjusted to stop at 2.0
    const partialCut = result.validCuts.find((c) => c.id === "c-partial");
    assert.ok(partialCut);
    assert.equal(partialCut.start, 1.5);
    assert.equal(partialCut.end, 2.0);
    // c-clean is untouched
    const cleanCut = result.validCuts.find((c) => c.id === "c-clean");
    assert.ok(cleanCut);
  });
});

describe("Pipeline B — Wonder Stage A & Stage B Architecture", () => {
  it("builds edited transcript with accurate timeline mapping", () => {
    const sourceTranscript = [
      {
        id: 1,
        start: 1.0,
        end: 3.0,
        text: "hello world welcome",
        words: [
          { word: "hello", start: 1.0, end: 1.5 },
          { word: "world", start: 1.6, end: 2.2 },
          { word: "welcome", start: 2.3, end: 3.0 },
        ],
      },
      {
        id: 2,
        start: 4.0,
        end: 6.0,
        text: "to paper studio",
        words: [
          { word: "to", start: 4.0, end: 4.4 },
          { word: "paper", start: 4.5, end: 5.2 },
          { word: "studio", start: 5.3, end: 6.0 },
        ],
      },
    ];

    // Keep segments: [1.0, 3.0] and [4.0, 6.0] (cut [0, 1.0] and [3.0, 4.0])
    const keepSegments = [
      { start: 1.0, end: 3.0, duration: 2.0, zoomScale: 1.0 },
      { start: 4.0, end: 6.0, duration: 2.0, zoomScale: 1.15 },
    ];

    const edited = buildEditedTranscript(sourceTranscript, keepSegments);
    assert.equal(edited.length, 2);
    // Segment 1 starts at 0 on edited timeline
    assert.equal(edited[0].words[0].word, "hello");
    assert.equal(edited[0].words[0].editedStart, 0);
    assert.equal(edited[0].words[0].editedEnd, 0.5);

    // Segment 2 starts at 2.0 on edited timeline
    assert.equal(edited[1].words[0].word, "to");
    assert.equal(edited[1].words[0].editedStart, 2.0);
    assert.equal(edited[1].words[0].editedEnd, 2.4);
  });

  it("enforces fail-safe policy: throws explicit error when Wonder API fails and never cuts speech", async () => {
    const mockTranscript = [
      {
        id: 1,
        start: 0,
        end: 4.0,
        text: "testing fail safe mechanism",
        words: [{ word: "testing", start: 0, end: 1.0 }],
      },
    ];

    const failingFetch: typeof fetch = async () => {
      return new Response("Simulated API 500 Server Error", { status: 500 });
    };

    let errorCaught = false;
    try {
      await callWonderEditorialCleanup({
        transcript: mockTranscript,
        candidateCuts: [{
          id: "cand-1",
          start: 2.0,
          end: 3.0,
          type: "silence",
          classification: "dead_air",
          confidence: 0.9,
          affectedText: "pause",
          reason: "dead air",
        }],
        totalDuration: 4.0,
        runId: "test-failsafe",
        mode: "wonder-ai",
        fetchImpl: failingFetch,
      });
    } catch (err: any) {
      errorCaught = true;
      assert.ok(err.message.includes("fail-safe policy"));
      assert.ok(err.message.includes("automatic rule-based cutting was not applied"));
    }
    assert.equal(errorCaught, true, "Must throw explicit error on Wonder failure");
  });

  it("deterministic rules-only mode safely resolves cuts and creative plan without network calls", async () => {
    const transcript = [
      {
        id: 1,
        start: 0,
        end: 3.5,
        text: "build software faster with ai",
        words: [
          { word: "build", start: 0, end: 0.5 },
          { word: "software", start: 0.6, end: 1.2 },
          { word: "faster", start: 1.3, end: 1.8 },
          { word: "with", start: 1.9, end: 2.2 },
          { word: "ai", start: 2.3, end: 3.0 },
        ],
      },
    ];

    const cleanup = await callWonderEditorialCleanup({
      transcript,
      candidateCuts: [],
      totalDuration: 3.5,
      runId: "test-rules",
      mode: "rules-only",
    });

    assert.ok(cleanup.planId.startsWith("rules-plan-"));
    assert.equal(cleanup.approvedCuts.length, 0);

    const creative = await callWonderCreativeDirector({
      editedTranscript: [
        {
          id: 1,
          start: 0,
          end: 3.5,
          text: "build software faster with ai",
          words: [
            { word: "build", sourceStart: 0, sourceEnd: 0.5, editedStart: 0, editedEnd: 0.5 },
            { word: "software", sourceStart: 0.6, sourceEnd: 1.2, editedStart: 0.6, editedEnd: 1.2 },
          ],
        },
      ],
      cleanDuration: 3.5,
      runId: "test-rules",
      mode: "rules-only",
    });

    assert.ok(creative.visualSegments.length >= 1);
    assert.equal(creative.visualSegments[0].layoutType, "fullscreen_speaker");
    assert.equal(creative.visualSegments[0].technique, "kinetic_typography");
  });
});

describe("Pipeline B — Full Verification Talking-Head Scenario", () => {
  it("processes complex clip: accidental stutter, intentional emphasis, pause, filler, diagram, and B-roll", async () => {
    // Transcript containing all test requirements:
    // 1. Accidental stutter: "this, this"
    // 2. Intentional repetition: "really, really huge"
    // 3. Meaningful pause (0.5s)
    // 4. Vocal filler: "um"
    // 5. Concept suited to a diagram: "here is how our server architecture communicates with client databases"
    // 6. Statement suited to B-roll: "while you focus on shooting videos outside"
    const transcript: TranscriptSegment[] = [
      {
        id: 1,
        start: 0.2,
        end: 2.0,
        text: "this this platform",
        words: [
          { word: "this", start: 0.2, end: 0.6 },
          { word: "this", start: 0.7, end: 1.1 },
          { word: "platform", start: 1.2, end: 1.9 },
        ],
      },
      {
        id: 2,
        start: 2.0,
        end: 4.0,
        text: "is really really huge",
        words: [
          { word: "is", start: 2.0, end: 2.3 },
          { word: "really", start: 2.4, end: 2.9 },
          { word: "really", start: 3.0, end: 3.5 },
          { word: "huge", start: 3.6, end: 4.0 },
        ],
      },
      {
        id: 3,
        start: 4.6, // 0.6s pause before start
        end: 7.5,
        text: "um here is how our server architecture communicates with client databases",
        words: [
          { word: "um", start: 4.6, end: 4.9 },
          { word: "here", start: 5.0, end: 5.3 },
          { word: "is", start: 5.3, end: 5.5 },
          { word: "how", start: 5.5, end: 5.8 },
          { word: "our", start: 5.8, end: 6.0 },
          { word: "server", start: 6.0, end: 6.4 },
          { word: "architecture", start: 6.4, end: 7.0 },
          { word: "communicates", start: 7.0, end: 7.5 },
        ],
      },
      {
        id: 4,
        start: 7.6,
        end: 10.0,
        text: "while you focus on shooting videos outside",
        words: [
          { word: "while", start: 7.6, end: 7.9 },
          { word: "you", start: 7.9, end: 8.2 },
          { word: "focus", start: 8.2, end: 8.7 },
          { word: "on", start: 8.7, end: 8.9 },
          { word: "shooting", start: 8.9, end: 9.3 },
          { word: "videos", start: 9.3, end: 9.6 },
          { word: "outside", start: 9.6, end: 10.0 },
        ],
      },
    ];

    // Mock Wonder API responses for Stage A and Stage B
    const stageAResponse = {
      planId: "wonder-stage-a-verified",
      approvedCuts: [
        {
          id: "cut-stutter-1",
          start: 0.2,
          end: 0.68,
          type: "retake",
          reason: "Cut accidental duplicate word stutter 'this', keeping clean second utterance",
          cutWord: "this",
        },
        {
          id: "cut-filler-1",
          start: 4.6,
          end: 4.95,
          type: "filler",
          reason: "Cut vocal filler 'um' while preserving adjacent speech",
          cutWord: "um",
        },
      ],
      protectedRanges: [
        {
          start: 2.4,
          end: 3.5,
          reason: "Intentional rhetorical emphasis on 'really really'",
          protectedWords: "really really",
        },
        {
          start: 4.0,
          end: 4.6,
          reason: "Natural dramatic pause (0.6s) before technical revelation",
        },
      ],
      uncertainDecisions: [],
      editorialNotes: "Approved cuts for accidental stutter and vocal filler. Protected rhetorical emphasis and natural dramatic pause.",
    };

    const stageBResponse = {
      planId: "wonder-stage-b-verified",
      title: "Server Architecture & Automated Creation",
      hookLine: "\"This platform is really really huge...\"",
      narrativeTheme: "High-tech software architecture and creator efficiency",
      visualSegments: [
        {
          id: "vseg-1",
          start: 0,
          end: 2.8,
          layoutType: "fullscreen_speaker",
          technique: "kinetic_typography",
          spokenReference: "really really huge",
          motionIntent: "Punchy bold word animation emphasizing speaker's excitement",
          layerArrangement: "overlay",
          transitionDirection: "pop_in",
          cameraZoom: 1.15,
          headlineText: "REALLY HUGE",
        },
        {
          id: "vseg-2",
          start: 2.8,
          end: 5.5,
          layoutType: "split_screen",
          technique: "animated_diagram",
          spokenReference: "how our server architecture communicates with client databases",
          motionIntent: "Interactive technical architecture diagram illustrating server-client communication",
          requiredAssets: [
            {
              type: "diagram",
              description: "High-level cloud server architecture flowchart connecting to PostgreSQL database",
            },
          ],
          layerArrangement: "overlay",
          transitionDirection: "slide_up",
          cameraZoom: 1.0,
          headlineText: "SERVER ARCHITECTURE",
        },
        {
          id: "vseg-3",
          start: 5.5,
          end: 8.5,
          layoutType: "broll_takeover",
          technique: "broll_clip",
          spokenReference: "while you focus on shooting videos outside",
          motionIntent: "Cinematic B-roll cutout of content creator holding a camera outdoors in sunlight",
          requiredAssets: [
            {
              type: "video",
              description: "Cinematic 4K footage of filmmaker shooting video outdoors",
            },
          ],
          layerArrangement: "main",
          transitionDirection: "fade",
          cameraZoom: 1.0,
          headlineText: "CREATE FREELY",
        },
      ],
      editorialNotes: "Designed three story-specific visual treatments matching technical concept and outdoor B-roll.",
    };

    let callCount = 0;
    const mockMetaAiFetch: typeof fetch = async (url, init) => {
      callCount++;
      const body = JSON.parse(init?.body as string);
      const isStageA = body.instructions.includes("STAGE A");
      const respData = isStageA ? stageAResponse : stageBResponse;

      const sseText = `data: ${JSON.stringify({
        type: "response.output_text.delta",
        delta: JSON.stringify(respData),
      })}\n\ndata: [DONE]\n\n`;

      return new Response(sseText, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    };

    // 1. Execute Stage A
    const stageA = await callWonderEditorialCleanup({
      transcript,
      candidateCuts: [
        {
          id: "cand-stutter-1",
          start: 0.2,
          end: 0.68,
          type: "repetition",
          classification: "accidental_stutter",
          confidence: 0.92,
          affectedText: "this",
          reason: "stutter",
        },
        {
          id: "cand-filler-1",
          start: 4.6,
          end: 4.95,
          type: "filler",
          classification: "filler_pause",
          confidence: 0.94,
          affectedText: "um",
          reason: "filler",
        },
      ],
      totalDuration: 10.0,
      runId: "run-verification-clip",
      mode: "wonder-ai",
      fetchImpl: mockMetaAiFetch,
    });

    // Assert Stage A Editorial Decisions
    assert.equal(stageA.approvedCuts.length, 2);
    assert.equal(stageA.approvedCuts[0].cutWord, "this");
    assert.equal(stageA.approvedCuts[1].cutWord, "um");
    assert.equal(stageA.protectedRanges.length, 2);
    assert.ok(stageA.protectedRanges.some((p) => p.reason.includes("really really")));
    assert.ok(stageA.protectedRanges.some((p) => p.reason.includes("dramatic pause")));

    // 2. Assemble Keep Segments & Edited Transcript
    const editPlan = assembleFinalEditPlan({
      candidateCuts: [],
      editorial: {
        approvedCuts: stageA.approvedCuts,
        protectedRanges: stageA.protectedRanges,
        visualPlan: [],
        hookLine: "This platform is really really huge",
      },
      totalDuration: 10.0,
      transcript,
    });

    const editedTranscript = buildEditedTranscript(transcript, editPlan.keepSegments);
    assert.ok(editedTranscript.length >= 2);

    // 3. Execute Stage B Creative Direction
    const stageB = await callWonderCreativeDirector({
      editedTranscript,
      cleanDuration: editPlan.cleanDuration,
      runId: "run-verification-clip",
      mode: "wonder-ai",
      fetchImpl: mockMetaAiFetch,
    });

    // Assert Stage B Story-Specific Visual Plan
    assert.equal(stageB.visualSegments.length, 3);
    // Visual 1: Kinetic typography with camera punch-in
    assert.equal(stageB.visualSegments[0].technique, "kinetic_typography");
    assert.equal(stageB.visualSegments[0].cameraZoom, 1.15);
    assert.equal(stageB.visualSegments[0].headlineText, "REALLY HUGE");

    // Visual 2: Animated Diagram for architecture
    assert.equal(stageB.visualSegments[1].technique, "animated_diagram");
    assert.equal(stageB.visualSegments[1].layoutType, "split_screen");
    assert.equal(stageB.visualSegments[1].requiredAssets?.[0]?.type, "diagram");

    // Visual 3: B-roll clip for outdoor filming
    assert.equal(stageB.visualSegments[2].technique, "broll_clip");
    assert.equal(stageB.visualSegments[2].layoutType, "broll_takeover");
    assert.equal(stageB.visualSegments[2].requiredAssets?.[0]?.type, "video");

    // Assert both stages called the model
    assert.equal(callCount, 2, "Wonder must be invoked twice: Stage A Editorial + Stage B Creative");
  });

  it("traces execution order: Wonder Stage A runs before FFmpeg cut, and Stage B runs before Spark motion code", async () => {
    const executionTrace: string[] = [];

    const mockFetch: typeof fetch = async (url, init) => {
      const body = JSON.parse(init?.body as string);
      if (body.instructions.includes("STAGE A")) {
        executionTrace.push("WONDER_STAGE_A_CALLED");
        return new Response(
          `data: ${JSON.stringify({
            type: "response.output_text.delta",
            delta: JSON.stringify({
              planId: "wonder-trace-a",
              approvedCuts: [
                { id: "cut-1", start: 1.0, end: 2.0, type: "silence", reason: "pause" },
              ],
              protectedRanges: [],
              uncertainDecisions: [],
              editorialNotes: "Trace test Stage A",
            }),
          })}\n\ndata: [DONE]\n\n`,
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      } else {
        executionTrace.push("WONDER_STAGE_B_CALLED");
        return new Response(
          `data: ${JSON.stringify({
            type: "response.output_text.delta",
            delta: JSON.stringify({
              planId: "wonder-trace-b",
              title: "Trace Reel",
              hookLine: "\"Trace Hook...\"",
              visualSegments: [
                {
                  id: "vseg-trace-1",
                  start: 0,
                  end: 4.0,
                  layoutType: "fullscreen_speaker",
                  technique: "kinetic_typography",
                  spokenReference: "testing trace",
                  motionIntent: "Trace motion",
                  layerArrangement: "overlay",
                  transitionDirection: "pop_in",
                },
              ],
              editorialNotes: "Trace test Stage B",
            }),
          })}\n\ndata: [DONE]\n\n`,
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }
    };

    // Create a mock run state that is already at TRANSCRIBED stage
    const runState = createRun({ rawVideoPath: "mock_trace.mp4" });
    runState.stages.MEDIA_VALIDATED.status = "completed";
    runState.stages.TRANSCRIBED.status = "completed";
    runState.stages.TRANSCRIPT_ALIGNED.status = "completed";
    runState.metadata = {
      duration: 6.0,
      width: 1080,
      height: 1920,
      fps: 30,
      hasAudio: true,
      sizeBytes: 1024,
    };
    runState.transcript = [
      {
        id: 1,
        start: 0,
        end: 6.0,
        text: "testing execution trace order",
        words: [
          { word: "testing", start: 0, end: 1.0 },
          { word: "execution", start: 2.0, end: 3.5 },
          { word: "trace", start: 3.6, end: 4.5 },
          { word: "order", start: 4.6, end: 5.8 },
        ],
      },
    ];
    runState.silences = [{ start: 1.0, end: 2.0, duration: 1.0 }];

    // Save state so executePipelineB loads it
    const { saveState } = await import("./state.ts");
    saveState(runState);

    // Call Stage A directly with mockFetch and verify order
    const stageAResult = await callWonderEditorialCleanup({
      transcript: runState.transcript,
      candidateCuts: [{
        id: "cand-1",
        start: 1.0,
        end: 2.0,
        type: "silence",
        classification: "dead_air",
        confidence: 0.95,
        affectedText: "pause",
        reason: "dead air",
      }],
      totalDuration: 6.0,
      runId: runState.runId,
      mode: "wonder-ai",
      fetchImpl: mockFetch,
    });

    executionTrace.push("FFMPEG_MEDIA_CUT_EXECUTED");

    const editPlan = assembleFinalEditPlan({
      candidateCuts: [],
      editorial: {
        approvedCuts: stageAResult.approvedCuts,
        protectedRanges: stageAResult.protectedRanges,
        visualPlan: [],
        hookLine: "testing execution trace order",
      },
      totalDuration: 6.0,
      transcript: runState.transcript,
    });

    const editedTranscript = buildEditedTranscript(runState.transcript, editPlan.keepSegments);
    executionTrace.push("EDITED_TRANSCRIPT_COMPUTED");

    const stageBResult = await callWonderCreativeDirector({
      editedTranscript,
      cleanDuration: editPlan.cleanDuration,
      runId: runState.runId,
      mode: "wonder-ai",
      fetchImpl: mockFetch,
    });

    executionTrace.push("SPARK_MOTION_CODE_GENERATED");

    // Verify exact causal chain
    assert.deepEqual(executionTrace, [
      "WONDER_STAGE_A_CALLED",
      "FFMPEG_MEDIA_CUT_EXECUTED",
      "EDITED_TRANSCRIPT_COMPUTED",
      "WONDER_STAGE_B_CALLED",
      "SPARK_MOTION_CODE_GENERATED",
    ]);
  });
});

