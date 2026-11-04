# Production image for the local-media pilot deployment.
FROM node:20-bookworm-slim AS builder

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run typecheck && npm run build

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# FFmpeg/FFprobe are required by nearly every media pipeline. Python is kept
# in the image because transcription is executed by the Next.js API process.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv ca-certificates dumb-init \
  && python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --upgrade pip \
  && /opt/venv/bin/pip install faster-whisper edge-tts \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/venv/bin:${PATH}"
WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --chown=node:node hf-entrypoint.sh ./hf-entrypoint.sh
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts

# These directories are intentionally persisted by docker-compose. They hold
# prototype story data, uploads, intermediate runs, and generated media.
RUN chmod +x ./hf-entrypoint.sh \
  && mkdir -p /data data/storybank workspace public/assets public/voiceover public/gallery-assets \
  && chmod 777 /data \
  && chown -R node:node /app

USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/bin/sh", "/app/hf-entrypoint.sh"]
CMD ["npm", "start"]
