# Production launch runbook

## Current readiness

This repository is a working local Next.js studio, not yet a multi-user production service. The UI, API routes, and media pipelines are present, but `lib/db/index.ts` is only a placeholder and data is written to local folders (`data/storybank`, `workspace/pipeline-b/runs`, `public/assets`, `public/voiceover`, and render/temp folders). Those files disappear on many serverless hosts and are not shared across multiple app instances. There is no account authentication or per-user authorization around saved stories and run media. Do not publish this as a public multi-user service until those are addressed.

The application uses FFmpeg/FFprobe, Python/Faster-Whisper, ONNX/Transformers, Remotion and local temporary files. Deploy it first to a persistent Linux VM/container with adequate CPU, RAM, disk, and request timeouts. A standard serverless deployment is not a fit for the complete video workflow. The current Python helper expects `faster-whisper` to be installed; rendering also expects FFmpeg/FFprobe on `PATH`.

## Step 1 — Prepare the host

Use a persistent Node.js host that supports a custom container or VM. Install Node.js 20 LTS, FFmpeg plus FFprobe, Python 3.10+, and the Python package `faster-whisper`. Set a persistent writable work directory with enough temporary storage for source videos and intermediate renders. Set memory/swap and request timeouts for long video jobs. Put a reverse proxy in front with HTTPS and upload limits appropriate to your expected source video sizes.

For the first private pilot, run one app instance and one worker on the same persistent volume. Avoid horizontal scaling until files move to shared object storage and job state moves to a shared database/queue.

## Step 2 — Configure secrets

Copy `.env.example` to your deployment platform's secret manager. Set `MODEL_API_KEY` (the shared server-side key used by Wonder, Spark 1.3, Image, and SAM; `META_API_KEY` and `MUSE_API_KEY` remain supported aliases). `MODEL_API_BASE_URL` defaults to `https://api.meta.ai/v1`. Optional `META_*_MODEL_ID` values select each model version. Keep keys server-side; never set `NEXT_PUBLIC_*_KEY`. Check `/api/meta/status` to see whether a key is configured and which model IDs are active; it never returns the key. Configure WhatsApp values only if using the webhook; `WHATSAPP_VERIFY_TOKEN` must be a long random secret. Rotate any provider key that has ever been committed, shared, or pasted into source code. The previous embedded fallback credential has been removed from source.

Set optional keys only for enabled integrations: `OPENAI_API_KEY` for the WhatsApp audio transcription path; `GOOGLE_DRIVE_API_KEY` or `GOOGLE_API_KEY` for Drive gallery access. Configure provider billing limits and usage alerts.

## Step 3 — Build and run locally on the host

From `my-paper-studio/`:

```powershell
npm ci
npm run typecheck
npm run build
npm start
```

The app listens on port 3000 by default. Put the reverse proxy/TLS in front of it. `npm run lint` currently runs TypeScript type checking; ESLint is not installed/configured in this repository.

## Container deployment (recommended pilot)

The repository includes `Dockerfile`, `docker-compose.yml`, and `Caddyfile`. The image contains Node.js 20, FFmpeg/FFprobe, Python 3, `faster-whisper`, and the Next.js production build. Compose keeps the local prototype data on named volumes and puts Caddy in front with HTTPS, 1 GB request uploads, and 10-minute upstream timeouts.

On an Ubuntu/Debian VM with Docker Engine and the Compose plugin installed:

```bash
cp .env.production.example .env.production
# Edit .env.production: set APP_DOMAIN and server-side provider secrets.
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f paper-studio
```

Point the domain's DNS A/AAAA record at the VM before starting Caddy. Caddy obtains and renews the TLS certificate automatically. Check `https://YOUR_DOMAIN/api/health`; it should return JSON with `"ok":true`. The default Compose limits are 4 CPUs, 8 GB RAM plus 4 GB swap allowance, and named persistent volumes. For larger source videos or concurrent renders, increase the VM disk and memory before raising concurrency.

Back up the named volumes before upgrades. List them with `docker volume ls`, and use a scheduled host backup or snapshot system. This container setup provides persistent single-machine storage; it does not add authentication, Postgres, object storage, or a durable job queue.

## Step 4 — Add durable application services before inviting users

1. **Authentication:** add an identity provider (for example Auth.js, Clerk, or managed OIDC). Require authentication on every private API route, including upload, run status, media, export, story memory, and WhatsApp simulator/sync actions. Derive user identity from the verified session; never trust a client-provided user or run ID alone.
2. **Postgres:** add a managed PostgreSQL database. Replace `lib/db/index.ts` with a real client, schema migrations, and tenant-scoped records for users, story memories/check-ins, WhatsApp sessions, runs, run stages, assets, and retention/deletion state. Scope every query by the authenticated owner. The current local JSON/Markdown persistence is not a production database.
3. **Object storage:** store uploads, generated images/audio, and MP4 exports in S3-compatible object storage (S3, R2, or equivalent). Keep only object keys and metadata in Postgres. Use short-lived signed uploads/downloads and private buckets; don’t serve private files from the public directory.
4. **Background jobs:** move long transcribe/edit/render tasks to a durable queue and worker process. API requests should validate/enqueue and return a job ID; workers report progress to Postgres. Add retry limits, idempotency, cancellation, per-user quotas, and cleanup of temporary files.
5. **Operations:** configure automated DB backups and restore drills, object lifecycle/retention, error reporting, structured logs with secrets/PII redacted, uptime checks, alerts, rate limits, and a privacy/retention policy for uploaded video and personal voice/story data.

These are code and architecture work items, not environment variables that can make the existing local filesystem persistence durable.

## Step 5 — Verify before opening access

Run a private staging deployment. Verify health and logs; exercise sign-in, upload, resume, transcribe, export, download/range playback, story check-in, and failure/retry flows with small and maximum-size files. Restart the app and worker mid-job to verify recovery. Confirm one account cannot read another account's stories or media. Verify quotas, upload rejection, deletion, backups, and restore. Check actual provider/API cost and latency. Only then switch the production domain and invite users gradually.

## Database recommendation

Use managed PostgreSQL for relational ownership, job state, and metadata; use private S3-compatible object storage for binary media. Do not put large video/audio blobs in Postgres. SQLite/local JSON are suitable for a single-machine prototype only. The application currently has no database schema or migrations, so database provisioning alone will not persist app data until the persistence layer is implemented.

## Current launch blockers

- No authentication/authorization or per-user isolation.
- Local-only story, session, job, upload, and export persistence.
- No durable job queue; long-running work occurs in API requests.
- No production database schema/migrations or object storage integration.
- No configured upload/rate/usage quotas or account lifecycle/retention controls.
- Native FFmpeg, FFprobe, Python, and ONNX runtime requirements need a custom Linux image and deployment-specific validation.
- WhatsApp GET sync has been disabled because it exposed private session data without authentication; implement it behind an authenticated API before using the browser sync UI in production.

