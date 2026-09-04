# Sentinel Identity & Trust — standalone service image.
# Build context is the backend/ directory (contains package.json + identity/).
#   docker build -f identity/deploy/Dockerfile -t sentinel-identity ./backend
FROM node:22-alpine

WORKDIR /app

# Install production dependencies (express, pg, cors, dotenv).
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# App source.
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Container-level liveness (compose/K8s can also probe /api/v1/health/ready).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Default: run the dedicated identity service (only /api/v1).
# Migrations + seed are run by the orchestrator before this (see docker-compose.yml).
CMD ["node", "identity/server.js"]
