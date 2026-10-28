import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { createRun, loadState, recordStageSuccess, recordStageFailure } from "./state.ts";
import { validateCuts } from "./tools/cuts-validator.ts";
import { planTalkingHeadEdit } from "./tools/edit-planner.ts";
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
