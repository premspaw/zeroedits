---
title: Paper Studio
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 3000
---

# Paper Studio

Paper Studio is a Next.js application for AI-assisted storyboards, talking-head editing, and vertical video exports. It uses the Next.js App Router, React, TypeScript, FFmpeg/FFprobe, Python transcription, ONNX/Transformers, Remotion, and external model APIs.

## Local development

Requirements: Node.js 20 LTS, FFmpeg and FFprobe on `PATH`, Python 3.10+ with `faster-whisper` for story transcription, and a server-side model API key for AI features.

```powershell
npm ci
Copy-Item .env.example .env.local
# Set MODEL_API_KEY in .env.local using a local editor or your secret manager.
npm run dev
```

Open `http://localhost:3000`. Do not commit `.env.local` or expose model keys using `NEXT_PUBLIC_` variables.

## Hugging Face Spaces

This app is a Docker Space, not a Gradio app; it serves Next.js on port `3000`. Attach the existing `premspaw/zeroedits1` bucket as a read-write volume at `/data`. The container entrypoint keeps the app's `workspace`, `data`, generated assets, gallery media, and voiceover files under `/data/paper-studio` so they survive Space restarts.

Add only the API keys needed by enabled features as Space secrets. The Hugging Face write token is for deploying the Space source; do not add it to the app's runtime secrets or commit it. Authenticate the local Hugging Face CLI with `hf auth login` before pushing to the existing Space repository. The app has no user authentication and stores app data in one shared space, so keep the Space private until access controls and per-user data isolation are implemented.

## Checks and production build

```powershell
npm run typecheck
npm run build
npm start
```

`npm run lint` is currently an alias for TypeScript checking; ESLint has not been configured. See [DEPLOYMENT.md](./DEPLOYMENT.md) for production readiness, required infrastructure, and a step-by-step launch plan. The app currently uses local filesystem persistence and is not ready for a public multi-user/serverless launch.

## Main directories

- `app/` — Next.js pages and API routes.
- `components/` — UI and video stages.
- `lib/` — model, persistence, and media pipeline code.
- `public/` — static assets and local development media.
- `data/` and `workspace/` — local prototype state and generated artifacts; not durable production storage.
- `scripts/` — project utilities.
- `tests/` — existing pipeline test assets.

