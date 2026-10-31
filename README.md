# Paper Studio — AI Video & Story Explainer Engine

Production Next.js application powered by **Zee** (AI Creative Director), **Meta Muse Wonder** (Editorial & Visual Storyboarding), and **Meta Muse Spark 1.3** (60fps Motion Synthesis).

---

## Production Directory Structure

```text
my-paper-studio/
├── app/                          # Next.js App Router (Pages & API Endpoints)
│   ├── page.tsx                  # Main Studio Workspace (Create & Auto-Edit Modes)
│   ├── story-bank/               # Memory Lane & Personal Story Bank Page
│   │   └── page.tsx
│   └── api/
│       ├── generate/             # Pipeline A: Storyboard & Script Generation
│       ├── code/                 # Pipeline A: Spark 1.3 60fps JSX Motion Synthesis
│       ├── voiceover/            # Multi-language TTS Voiceover Synthesis
│       ├── render-video/         # Remotion + FFmpeg MP4 Video Renderer
│       ├── remux-mp4/            # H.264 High-Profile Faststart MP4 Verifier
│       ├── preview-runtime/      # Live Sandbox Preview Runtime
│       ├── story/                # Memory Lane / Story Bank APIs (checkin, distill, memory, audio)
│       └── pipeline-b/           # Pipeline B: Talking-Head Auto-Editor APIs
│           ├── upload/           # Upload & Stage A/B Orchestration
│           ├── status/[runId]/   # Real-time Stage Polling
│           ├── resume/           # Custom Cut & Transcript Rebuild
│           ├── export/           # Deterministic FFmpeg + ASS MP4 Export
│           └── media/[runId]/[type]/ # Atomic Range-Enabled MP4 Streaming & Download
│
├── components/                   # Modular UI & Interactive Stage Components
│   ├── Pip.tsx                   # Zee AI Agent Avatar, Mood Engine & Thinking Guidance
│   ├── TalkingHeadExplainerStage.tsx # 60fps Dialogue-Synced Story Explainer Stage
│   ├── WonderStoryboard.tsx      # Editorial Cuts, Transcript Editor & Visual Scenes Board
│   ├── SparkLiveRunner.tsx       # Live 60fps React Motion Sandbox Player
│   ├── StoryBankView.tsx         # Memory Lane / Daily Voice Check-in Interface
│   ├── VideoExportModal.tsx      # 1080x1920 MP4 Export & Download Modal
│   └── spark-preview-document.ts # Isolated iframe Runtime Document Builder
│
├── lib/                          # Core Backend Services & AI Pipelines
│   ├── model-retry.ts            # Resilient Exponential Backoff for Muse APIs
│   ├── model-response.ts         # Structured JSON & Code Block Parser
│   ├── story-bank.ts             # Story Bank Persistence & Distillation Logic
│   ├── story-transcribe.py       # Faster-Whisper Word-Level Audio Transcriber
│   └── pipeline-b/               # Pipeline B: Talking-Head Auto-Edit Architecture
│       ├── orchestrator.ts       # 10-Stage Deterministic State Machine
│       ├── state.ts              # Run State Persistence
│       ├── types.ts              # Shared TypeScript Contracts
│       ├── templates/
│       │   └── registry.ts       # Format Registry (Story Explainer, Hormozi, Minimal, etc.)
│       └── tools/
│           ├── media-validator.ts      # FFprobe Stream & Duration Inspector
│           ├── transcription.ts        # Word-Level Timestamp & Silence Extractor
│           ├── transcript-aligner.ts   # Script-to-Speech Alignment Engine
│           ├── edit-planner.ts         # Acoustic Pause & Retake Candidate Detector
│           ├── wonder-director.ts      # Stage A (Retake/Silence Cuts) & Stage B (Visual Plan)
│           ├── cuts-validator.ts       # Speech Protection & Cut Boundary Guard
│           ├── clean-video-builder.ts  # Single-Pass FFmpeg Filtergraph Cutter
│           ├── image-generator.ts      # Muse Wonder B-Roll Asset Generator
│           ├── motion-generator.ts     # Remotion / Spark Overlay Code Generator
│           ├── sam-segmenter.ts        # Subject Framing & Segmentation Helper
│           └── export-service.ts       # H.264 MP4 + Dialogue-Synced ASS Subtitles Exporter
│
├── data/
│   └── storybank/                # Local Markdown & Audio Store for Memory Lane
├── public/
│   ├── fonts/                    # Anton & Montserrat Fonts for FFmpeg/ASS Burn-in
│   └── assets/                   # Generated Scene Assets per Active Run
└── workspace/
    └── pipeline-b/runs/          # Active Pipeline B Run Artifacts
```

