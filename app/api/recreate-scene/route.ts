import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateMuseImage } from "@/lib/pipeline-b/tools/image-generator";
import { readModelResponse } from "@/lib/model-response";
import { withModelRetry } from "@/lib/model-retry";

export const maxDuration = 180;

const SCENE_SUGGESTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: { type: "string" },
    },
  },
} as const;

const RECREATE_SCENE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "spokenText",
    "characterAppearanceInScene",
    "visualPrompt",
    "cameraMotion",
    "atmosphere",
    "lightingMood",
    "visualEffect",
    "layoutType",
    "technique",
    "motionIntent",
    "cameraZoom",
    "visualRecipe",
  ],
  properties: {
    headline: { type: "string" },
    spokenText: { type: "string" },
    characterAppearanceInScene: { type: "string" },
    visualPrompt: { type: "string" },
    cameraMotion: {
      type: "string",
      enum: [
        "push_in",
        "pull_out",
        "pan_left",
        "pan_right",
        "tilt_up",
        "dramatic_zoom",
        "slow_drift",
      ],
    },
    atmosphere: {
      type: "string",
      enum: [
        "sakura",
        "embers",
        "rain",
        "starlight",
        "golden_dust",
        "snow",
        "wind_streaks",
        "none",
      ],
    },
    lightingMood: {
      type: "string",
      enum: [
        "golden_hour",
        "twilight",
        "moonlight",
        "neon_night",
        "stormy",
        "sunbeams",
      ],
    },
    visualEffect: {
      type: "string",
      enum: [
        "divine_aura",
        "lightning_flash",
        "speed_lines",
        "sun_flare",
        "shockwave",
        "magic_sparkles",
        "none",
      ],
    },
    layoutType: {
      type: "string",
      enum: ["fullscreen_speaker", "broll_takeover", "sam_cutout", "depth_cutout"],
    },
    technique: {
      type: "string",
      enum: ["kinetic_typography", "animated_diagram", "procedural_graphic", "ui_mockup", "sam_cutout_pop"],
    },
    motionIntent: { type: "string" },
    cameraZoom: { type: "number" },
    visualRecipe: {
      type: "object",
      additionalProperties: false,
      required: ["style", "metaphor", "objects"],
      properties: {
        style: { type: "string", enum: ["clay_3d", "paper_cut", "paper_card", "procedural", "glass", "black_neon", "anime"] },
        metaphor: { type: "string" },
        objects: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "shape", "motion", "position"],
            properties: {
              label: { type: "string" },
              shape: { type: "string", enum: ["circle", "rect", "diamond", "line", "text"] },
              motion: { type: "string", enum: ["rise", "orbit", "pulse", "slide", "unfold", "scatter"] },
              position: { type: "string", enum: ["upper-left", "upper-right", "center", "lower-left", "lower-right"] },
            },
          },
        },
      },
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = "auto", // "imageStory" | "pipeline-b" | "pipeline-a"
      action = "recreate",
      runId,
      sceneIndex = 0,
      userInstruction = "",
      customStart,
      customEnd,
      currentBeat,
      storyboard,
      editPlan,
      audioStory,
      visualStyle = "auto",
    } = body;

    const apiKey =
      process.env.MODEL_API_KEY ||
      process.env.MUSE_API_KEY ||
      process.env.META_API_KEY ||
      "LLM_1860443481810017_68xXARFV7vSAirRAltuNyxLM3pQ";
    const baseUrl = process.env.MODEL_API_BASE_URL || "https://api.meta.ai/v1";

    const resolvedMode =
      mode !== "auto"
        ? mode
        : audioStory
        ? "imageStory"
        : editPlan
        ? "pipeline-b"
        : "pipeline-a";

    const targetStart =
      typeof customStart === "number"
        ? customStart
        : typeof currentBeat?.start === "number"
        ? currentBeat.start
        : 0;
    const targetEnd =
      typeof customEnd === "number"
        ? customEnd
        : typeof currentBeat?.end === "number"
        ? currentBeat.end
        : targetStart + 4;
    const targetDur = +Math.max(0.5, targetEnd - targetStart).toFixed(2);
    const validStyles = new Set(["auto", "clay_3d", "paper_cut", "paper_card", "procedural", "glass", "black_neon", "anime"]);
    const requestedVisualStyle = validStyles.has(String(visualStyle)) ? String(visualStyle) : "auto";
    const adjacentContext = [
      editPlan?.visualSegments?.[sceneIndex - 1]?.spokenReference || storyboard?.beats?.[sceneIndex - 1]?.script,
      editPlan?.visualSegments?.[sceneIndex + 1]?.spokenReference || storyboard?.beats?.[sceneIndex + 1]?.script,
    ].filter(Boolean);

    // =========================================================================
    // 1. Call Meta Muse Wonder 1.0 to recreate ONLY this single scene
    // =========================================================================
    const characterBible =
      audioStory?.characterAndWorldBible ||
      storyboard?.globalDirection?.concept ||
      "Consistent recurring main character and visual identity";
    const currentSpoken =
      currentBeat?.script ||
      currentBeat?.text ||
      audioStory?.scenes?.[sceneIndex]?.spokenText ||
      `Scene ${sceneIndex + 1}`;
    const currentVisual =
      currentBeat?.visualDesc ||
      audioStory?.scenes?.[sceneIndex]?.visualPrompt ||
      "";

    if (action === "suggestions") {
      const prompt = `You are the visual director for Scene ${sceneIndex + 1} of a short explainer video. Create 4 concise, distinct animation directions that are specific to this scene. Each should say what visual metaphor/object appears and the motion/pop-out treatment. Do not suggest generic phone scrolls unless a phone is literally in the dialogue. Avoid repeating the current design. Each suggestion should be short enough to display as a selectable chip.\n\nScene dialogue: ${currentSpoken}\nScene visual context: ${currentVisual}\nNeighboring dialogue: ${JSON.stringify(adjacentContext)}\nCurrent design to avoid repeating: ${JSON.stringify(editPlan?.visualSegments?.[sceneIndex]?.visualRecipe || {})}\nUser style preference: ${requestedVisualStyle}\nAdditional direction: ${userInstruction || "none"}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        const res = await fetch(`${baseUrl}/responses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: "muse-wonder-1.0",
            input: [{ role: "user", content: prompt }],
            stream: true,
            temperature: 0.8,
            max_output_tokens: 900,
            reasoning: { effort: "low" },
            text: { format: { type: "json_schema", name: "SceneAnimationSuggestions", schema: SCENE_SUGGESTIONS_SCHEMA, strict: true } },
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Wonder returned HTTP ${res.status} while suggesting this scene.`);
        const raw = (await readModelResponse(res)).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(raw);
        const suggestions = Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 4)
          : [];
        if (suggestions.length < 3) throw new Error("Wonder returned too few scene-specific suggestions.");
        return NextResponse.json({ success: true, suggestions });
      } catch (error: any) {
        return NextResponse.json({ error: error?.name === "AbortError" ? "Wonder took too long to suggest this scene." : error?.message || "Could not suggest scene animations." }, { status: 502 });
      } finally {
        clearTimeout(timeout);
      }
    }

    const wonderPrompt = `You are Meta Muse Wonder 1.0 recreating ONLY Scene ${sceneIndex + 1} (${targetStart.toFixed(2)}s – ${targetEnd.toFixed(2)}s) based on the user's specific instruction.
Do NOT touch any other scenes.

Pipeline Mode: "${resolvedMode}"
Time Window: ${targetStart.toFixed(2)}s to ${targetEnd.toFixed(2)}s (${targetDur}s duration)
Character & World Continuity Bible (MUST PRESERVE): "${characterBible}"
Current Spoken Dialogue in Scene ${sceneIndex + 1}: "${currentSpoken}"
Current Visual Description in Scene ${sceneIndex + 1}: "${currentVisual}"
Neighboring dialogue for story continuity: ${JSON.stringify(adjacentContext)}
Current animation recipe: ${JSON.stringify(editPlan?.visualSegments?.[sceneIndex]?.visualRecipe || {})}
Required visual style: "${requestedVisualStyle}" ("auto" means choose what best serves the exact dialogue).

USER INSTRUCTION FOR RECREATING SCENE ${sceneIndex + 1}:
"${userInstruction || "Recreate this scene with stronger character consistency, richer visual storytelling, and more dynamic animation."}"

RULES:
1. Keep the character's exact species, age, facial features, hair/fur, crown/headgear, and outfit 100% consistent with the Character & World Continuity Bible in \`characterAppearanceInScene\` and \`visualPrompt\`.
2. Apply the user's instruction directly to Scene ${sceneIndex + 1} (${targetStart.toFixed(2)}s – ${targetEnd.toFixed(2)}s).
3. If the user asked to change the spoken line or headline, update \`spokenText\` and \`headline\`; otherwise keep \`spokenText\` aligned with the spoken dialogue.
4. Choose the best \`cameraMotion\`, \`atmosphere\`, \`lightingMood\`, and \`visualEffect\` (or \`layoutType\`, \`technique\`, \`motionIntent\`, \`cameraZoom\` for talking-head auto-edit) to fulfill the user's request.
5. For Pipeline B, create a NEW \`visualRecipe\` for this scene: a story-specific metaphor and 2–5 concrete objects with labels, shape, movement, and positions. Do not copy the current recipe. Never use a phone unless the dialogue calls for one. Follow the required style exactly. If the required style is \"auto\", choose ONE concrete style from the schema enum based on the dialogue and return that style; never return \"auto\".
6. Never include text/watermarks/"HOOK" badges inside \`visualPrompt\`.`;

    let directedScene: any = null;
    try {
      directedScene = await withModelRetry(
        async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45_000);
          try {
          const res = await fetch(`${baseUrl}/responses`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({
              model: "muse-wonder-1.0",
              input: [{ role: "user", content: wonderPrompt }],
              stream: true,
              temperature: 0.65,
              max_output_tokens: 6000,
              reasoning: { effort: "medium" },
              text: {
                format: {
                  type: "json_schema",
                  name: "RecreateSingleScene",
                  schema: RECREATE_SCENE_SCHEMA,
                  strict: true,
                },
              },
            }),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`Wonder returned HTTP ${res.status}.`);
          const text = await readModelResponse(res);
          const clean = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          return JSON.parse(clean);
          } catch (err: any) {
            if (err?.name === "AbortError") throw new Error("Scene direction timed out after 45 seconds.");
            throw err;
          } finally {
            clearTimeout(timeout);
          }
        },
        { attempts: 1, delayMs: 0 }
      );
    } catch (wonderErr) {
      console.warn("[RecreateScene] Wonder fallback:", wonderErr);
      if (resolvedMode === "pipeline-b") {
        return NextResponse.json(
          { success: false, error: `Wonder could not finish directing Scene ${sceneIndex + 1}: ${(wonderErr as Error)?.message || "Please retry this scene."}` },
          { status: 502 }
        );
      }
      const isDiagram = /diagram|step|process|how|system|grow|stat/i.test(currentSpoken + " " + userInstruction);
      const words = currentSpoken.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 3);
      directedScene = {
        headline: currentBeat?.headline || (words[0] ? words.join(" ").toUpperCase() : `Scene ${sceneIndex + 1}`),
        spokenText: currentSpoken,
        characterAppearanceInScene: characterBible,
        visualPrompt: `${characterBible}. ${userInstruction}. Illustrating "${currentSpoken}", pure 9:16 vertical cinematic frame.`,
        cameraMotion: "dramatic_zoom",
        atmosphere: "golden_dust",
        lightingMood: "golden_hour",
        visualEffect: "divine_aura",
        layoutType: /speaker|face/i.test(userInstruction) ? "fullscreen_speaker" : "broll_takeover",
        technique: isDiagram ? "animated_diagram" : "kinetic_typography",
        motionIntent: userInstruction || `Dynamic visual emphasis on "${words.join(" ")}"`,
        cameraZoom: 1.12,
        visualRecipe: {
          style: requestedVisualStyle !== "auto" ? requestedVisualStyle : "paper_cut",
          metaphor: `Story visual focus on ${words.join(" ")}`,
          objects: words.map((w: string, i: number) => ({
            label: w.toUpperCase(),
            shape: i === 0 ? "badge" : "card",
            position: i === 0 ? "center" : i === 1 ? "upper-left" : "lower-right",
            motion: "pulse",
          })),
        },
      };
    }

    // =========================================================================
    // MODE A: IMAGE STORYTELLER (Regenerate ONLY Scene K's 9:16 Image)
    // =========================================================================
    if (resolvedMode === "imageStory") {
      const targetRunId = runId || audioStory?.runId || `story-recreate-${Date.now()}`;
      const runDir = path.join(process.cwd(), "workspace", "audio-stories", targetRunId);
      const stateFilePath = path.join(runDir, "story_state.json");

      let savedState: any = null;
      if (fs.existsSync(stateFilePath)) {
        try {
          savedState = JSON.parse(fs.readFileSync(stateFilePath, "utf-8"));
        } catch {}
      }

      // Load Anchor Character Image (reference image or scene_1.png) for consistency
      let anchorDataUri: string | null = null;
      const publicAssetsDir = path.join(process.cwd(), "public", "assets", targetRunId);
      if (fs.existsSync(publicAssetsDir)) {
        const refCandidates = ["reference.png", "reference.jpg", "reference.jpeg", "reference.webp", "scene_1.png"];
        for (const cand of refCandidates) {
          if (sceneIndex === 0 && cand === "scene_1.png") continue; // If recreating scene 1 itself without user ref, allow fresh anchor or use scene_2
          const candPath = path.join(publicAssetsDir, cand);
          if (fs.existsSync(candPath)) {
            const bytes = fs.readFileSync(candPath);
            const ext = path.extname(cand).toLowerCase();
            const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
            anchorDataUri = `data:${mime};base64,${bytes.toString("base64")}`;
            break;
          }
        }
      }

      const styleLock =
        savedState?.artStylePromptLock ||
        "Masterpiece 2D theatrical anime film aesthetic (Makoto Shinkai & Ufotable quality), volumetric lighting";
      const charSheet = savedState?.characterAndWorldBible || characterBible;

      const fullConsistentPrompt = [
        `[STYLE LOCK]: ${styleLock}.`,
        `[CHARACTER MODEL SHEET]: ${charSheet}.`,
        `[SUBJECT IN THIS SHOT]: ${directedScene.characterAppearanceInScene || charSheet}.`,
        `[USER RECREATE INSTRUCTION]: ${userInstruction}.`,
        `[SCENE ${sceneIndex + 1} ACTION & FRAMING]: ${directedScene.visualPrompt}.`,
        `[CONTINUITY MANDATE]: Keep the character's exact species, age, facial features, hair/fur, crown/headgear, and outfit 100% identical to the Character Model Sheet. Full-bleed 9:16 vertical composition, zero text, zero watermarks.`,
      ].join(" ");

      const assetId = `scene_${sceneIndex + 1}`;
      const imgRes = await generateMuseImage({
        prompt: fullConsistentPrompt,
        runId: targetRunId,
        assetId,
        reasoningStrength: "high",
        referenceImageDataUri: anchorDataUri,
      });

      const cacheBustedUrl = `${imgRes.publicUrl}?t=${Date.now()}`;

      const updatedScene = {
        ...(audioStory?.scenes?.[sceneIndex] || {}),
        id: assetId,
        index: sceneIndex + 1,
        start: targetStart,
        end: targetEnd,
        duration: targetDur,
        spokenText: directedScene.spokenText || currentSpoken,
        headline: directedScene.headline || `Scene ${sceneIndex + 1}`,
        characterAppearanceInScene: directedScene.characterAppearanceInScene,
        visualPrompt: fullConsistentPrompt,
        cameraMotion: directedScene.cameraMotion || "dramatic_zoom",
        atmosphere: directedScene.atmosphere || "golden_dust",
        lightingMood: directedScene.lightingMood || "golden_hour",
        visualEffect: directedScene.visualEffect || "divine_aura",
        assetUrl: cacheBustedUrl,
        localFilePath: imgRes.filePath,
      };

      if (savedState && Array.isArray(savedState.scenes)) {
        savedState.scenes[sceneIndex] = updatedScene;
        fs.writeFileSync(stateFilePath, JSON.stringify(savedState, null, 2), "utf-8");
      }

      const updatedBeat = {
        ...(currentBeat || {}),
        id: sceneIndex + 1,
        label: `Scene ${sceneIndex + 1} • ${updatedScene.headline}`,
        start: targetStart,
        end: targetEnd,
        durNum: targetDur,
        duration: `${targetDur.toFixed(1)}s`,
        script: updatedScene.spokenText,
        headline: updatedScene.headline,
        visualDesc: updatedScene.visualPrompt,
        motion: `Cinematic ${updatedScene.cameraMotion.replace(/_/g, " ")} • ${updatedScene.visualEffect.replace(/_/g, " ")} • ${updatedScene.atmosphere.replace(/_/g, " ")}`,
        camera: `${updatedScene.cameraMotion.replace(/_/g, " ")} (${updatedScene.lightingMood.replace(/_/g, " ")})`,
        assetUrl: cacheBustedUrl,
      };

      return NextResponse.json({
        success: true,
        mode: "imageStory",
        sceneIndex,
        updatedScene,
        updatedBeat,
      });
    }

    // =========================================================================
    // MODE B: AUTO-EDIT TALKING-HEAD (Pipeline B Single-Scene Recreate — Zero Static Images)
    // =========================================================================
    if (resolvedMode === "pipeline-b") {
      const targetRunId = runId || editPlan?.runId || editPlan?.planId;
      const aiRecipeStyle = String(directedScene.visualRecipe?.style || "procedural");
      const darkStyleContext = /\b(neon|night|dark|cyber|black|midnight)\b/i.test(`${currentSpoken} ${currentVisual} ${userInstruction}`);
      const resolvedRecipeStyle = requestedVisualStyle !== "auto"
        ? requestedVisualStyle
        : validStyles.has(aiRecipeStyle) && aiRecipeStyle !== "auto" && (aiRecipeStyle !== "black_neon" || darkStyleContext)
        ? aiRecipeStyle
        : "procedural";

      const resolvedLayout = /cutout|pop|before/i.test(userInstruction)
        ? "sam_cutout"
        : /depth|behind/i.test(userInstruction)
        ? "depth_cutout"
        : /speaker|face/i.test(userInstruction)
        ? "fullscreen_speaker"
        : directedScene.layoutType || "sam_cutout";
      const recreatedObjects = (Array.isArray(directedScene.visualRecipe?.objects) ? directedScene.visualRecipe.objects : [])
        .slice(0, 5)
        .map((obj: any) => ({
          label: String(obj.label || "Story object").slice(0, 48),
          shape: ["circle", "rect", "diamond", "line", "text"].includes(obj.shape) ? obj.shape : "text",
          motion: ["rise", "orbit", "pulse", "slide", "unfold", "scatter"].includes(obj.motion) ? obj.motion : "rise",
          position: ["upper-left", "upper-right", "center", "lower-left", "lower-right"].includes(obj.position) ? obj.position : "center",
        }));
      if (recreatedObjects.length < 2) {
        recreatedObjects.push(
          { label: String(directedScene.headline || "Story beat"), shape: "text", motion: "rise", position: "upper-left" },
          { label: String(directedScene.visualRecipe?.metaphor || currentSpoken).slice(0, 48), shape: "circle", motion: "pulse", position: "lower-right" }
        );
      }

      const updatedVisualSegment = {
        ...(editPlan?.visualSegments?.[sceneIndex] || {}),
        id: `seg_${sceneIndex + 1}`,
        start: targetStart,
        end: targetEnd,
        // This is a deliberate user-requested regeneration, so the selected recipe
        // must take precedence over the generic automatic shot classifier.
        layoutType: "spark_scene",
        animationLeadInSec: 0.15,
        technique: "procedural_graphic",
        spokenReference: directedScene.spokenText || currentSpoken,
        headlineText: directedScene.headline || `SCENE ${sceneIndex + 1}`,
        motionIntent: `${userInstruction ? `[Recreated: ${userInstruction}] ` : ""}${directedScene.motionIntent || directedScene.visualPrompt}`,
        visualRecipe: {
          style: resolvedRecipeStyle,
          metaphor: String(directedScene.visualRecipe?.metaphor || directedScene.motionIntent || currentSpoken).slice(0, 180),
          objects: recreatedObjects,
        },
        cameraZoom: directedScene.cameraZoom || 1.12,
        transitionDirection: "pop_in",
      };

      const updatedBeat = {
        ...(currentBeat || {}),
        id: sceneIndex + 1,
        label: `Scene ${sceneIndex + 1} • ${String(updatedVisualSegment.technique).replace(/_/g, " ").toUpperCase()}`,
        start: targetStart,
        end: targetEnd,
        durNum: targetDur,
        duration: `${targetDur.toFixed(1)}s`,
        script: updatedVisualSegment.spokenReference,
        headline: updatedVisualSegment.headlineText,
        visualDesc: updatedVisualSegment.motionIntent,
        motion: updatedVisualSegment.motionIntent,
        camera: `Dynamic ${Number(updatedVisualSegment.cameraZoom).toFixed(2)}x Zoom`,
      };

      let updatedMotionCode: string | undefined = undefined;
      const sparkResponse = await fetch(new URL("/api/code", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(115_000),
        body: JSON.stringify({
          mode: "pipeline_b_scene",
          scene: updatedVisualSegment,
        }),
      });
      const sparkResult = await sparkResponse.json();
      if (!sparkResponse.ok || !sparkResult.success || !sparkResult.data?.code) {
        throw new Error(sparkResult.error || `Spark 1.3 could not generate Scene ${sceneIndex + 1}.`);
      }
      updatedVisualSegment.sparkCode = sparkResult.data.code;
      updatedMotionCode = sparkResult.data.code;
      if (targetRunId) {
        const statePath = path.join(process.cwd(), "workspace", "pipeline-b", "runs", targetRunId, "state.json");
        if (fs.existsSync(statePath)) {
          try {
            const stateObj = JSON.parse(fs.readFileSync(statePath, "utf-8"));
            if (stateObj.editPlan && Array.isArray(stateObj.editPlan.visualSegments)) {
              stateObj.editPlan.visualSegments[sceneIndex] = updatedVisualSegment;
              fs.writeFileSync(statePath, JSON.stringify(stateObj, null, 2), "utf-8");
            }
          } catch (err) {
            console.warn("[RecreateScene] Could not persist Pipeline B state:", err);
          }
        }
      }

      return NextResponse.json({
        success: true,
        mode: "pipeline-b",
        sceneIndex,
        updatedVisualSegment,
        updatedBeat,
        updatedMotionCode,
        updatedEditPlan: {
          ...(editPlan || {}),
          runId: targetRunId || editPlan?.runId,
          visualSegments: (editPlan?.visualSegments || []).map((segment: any, index: number) =>
            index === sceneIndex ? updatedVisualSegment : segment
          ),
        },
      });
    }

    // =========================================================================
    // MODE C: CREATE / SPARK 1.3 (Pipeline A Single-Scene Recreate)
    // =========================================================================
    const updatedBeat = {
      ...(currentBeat || {}),
      id: sceneIndex + 1,
      label: directedScene.headline || currentBeat?.label || `Scene ${sceneIndex + 1}`,
      start: targetStart,
      end: targetEnd,
      durNum: targetDur,
      duration: `${targetDur.toFixed(1)}s`,
      script: directedScene.spokenText || currentSpoken,
      text: directedScene.spokenText || currentSpoken,
      visualDesc: directedScene.visualPrompt,
      motion: `${directedScene.cameraMotion.replace(/_/g, " ")} • ${directedScene.visualEffect.replace(/_/g, " ")}`,
      camera: `${directedScene.cameraMotion.replace(/_/g, " ")} (${directedScene.lightingMood.replace(/_/g, " ")})`,
    };

    const updatedStoryboardBeat = {
      ...(storyboard?.beats?.[sceneIndex] || {}),
      id: sceneIndex + 1,
      role: directedScene.headline || `Scene ${sceneIndex + 1}`,
      start: targetStart,
      end: targetEnd,
      duration: targetDur,
      text: directedScene.spokenText || currentSpoken,
      voiceover: directedScene.spokenText || currentSpoken,
      visualDesc: directedScene.visualPrompt,
      motion: `${directedScene.cameraMotion.replace(/_/g, " ")} • ${directedScene.visualEffect.replace(/_/g, " ")}`,
      camera: `${directedScene.cameraMotion.replace(/_/g, " ")}`,
      lighting: directedScene.lightingMood.replace(/_/g, " "),
    };

    return NextResponse.json({
      success: true,
      mode: "pipeline-a",
      sceneIndex,
      updatedBeat,
      updatedStoryboardBeat,
    });
  } catch (err: any) {
    console.error("[RecreateScene] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to recreate scene.",
      },
      { status: 500 }
    );
  }
}

