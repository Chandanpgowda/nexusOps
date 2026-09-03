# Deployment

NexusOps is designed to run fully on **free and open-source infrastructure**. No paid service is required.

## Local Development (Docker)

```bash
git clone <repository>
cd nexusops

# Start infrastructure
docker compose up -d postgres redis

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Fill in real secrets

# Run migrations + seed
cd backend
npx prisma migrate dev
npx tsx prisma/seed.ts

# Run apps (two terminals)
npm run dev --workspace backend    # API on :4000
npm run dev --workspace frontend   # UI on :5173
```

## Production Docker Build

```dockerfile
# Multi-stage build for backend
FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

## Free Cloud Deployment Options

### Option 1: Railway / Render (Free Tier)

| Service | Free tier limit | Notes |
|---|---|---|
| Railway | 500 hours/month | Good for backend + Postgres |
| Render | 750 hours/month | Web service + Postgres |
| Supabase | 500 MB Postgres | Alternative to self-hosted PG |

**Limitation**: Ollama requires too much RAM for free tiers. Deploy without AI or use a separate GPU server.

### Option 2: Oracle Cloud Free Tier (Always Free)

| Resource | Always-free allowance |
|---|---|
| Compute | 4 ARM cores, 24 GB RAM |
| Block storage | 200 GB |
| Database | 2 Autonomous DBs |

This is the **best free option** for running Ollama alongside the app.

### Option 3: Home Server / Raspberry Pi

Run everything on your own hardware:
- Docker Compose on a home server
- Tailscale for secure remote access
- No monthly costs

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars, random |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars, random |
| `ENCRYPTION_KEY` | Yes | 32-byte hex string |
| `CORS_ORIGIN` | Yes | Frontend origin URL |
| `OLLAMA_BASE_URL` | No | Ollama server URL |
| `OLLAMA_CHAT_MODEL` | No | Default: `qwen2.5:7b` |
| `OLLAMA_EMBED_MODEL` | No | Default: `nomic-embed-text` |
| `AI_ENABLED` | No | Default: `true` |
| `UPLOAD_DIR` | No | Default: `./uploads` |

## Health Checks

```bash
curl http://localhost:4000/health
# {"status":"ok","service":"nexusops-api"}
```

Docker Compose includes health checks for postgres and redis:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U nexusops"]
  interval: 10s
  timeout: 5s
  retries: 5
```

## Monitoring

| Tool | Purpose | Cost |
|---|---|---|
| Pino (built-in) | Structured logging | Free |
| pg_stat_statements | Query performance | Free (PG extension) |
| Redis INFO | Cache hit rates | Free |
| Uptime Kuma | Uptime monitoring | Free (self-hosted) |

## Backup Strategy

```bash
# PostgreSQL backup
docker exec nexusops-postgres pg_dump -U nexusops nexusops > backup.sql

# Restore
cat backup.sql | docker exec -i nexusops-postgres psql -U nexusops nexusops
```

Schedule with cron:

```bash
0 2 * * * cd /path/to/nexusops && ./scripts/backup.sh
```

## Scaling Considerations

| Scale | Architecture |
|---|---|
| < 100 users | Single backend instance, local Postgres |
| 100–10,000 users | Multiple backend instances, PgBouncer, Redis Sentinel |
| 10,000+ users | Kubernetes, read replicas, CDN for frontend |

## CI/CD (GitHub Actions)

The included workflow runs on every push:

1. **Lint** — ESLint for backend and frontend
2. **Typecheck** — TypeScript strict mode
3. **Test** — Vitest unit + integration tests
4. **Build** — Production build verification
5. **Docker** — Image build verification

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```
