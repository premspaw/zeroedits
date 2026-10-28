import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { createRun, loadState, recordStageSuccess, recordStageFailure } from "./state.ts";
import { validateCuts } from "./tools/cuts-validator.ts";
import {
  planTalkingHeadEdit,
  mapSourceTimeToEditedTime,
  mergeOverlappingCuts,
} from "./tools/edit-planner.ts";
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
