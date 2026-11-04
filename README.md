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

