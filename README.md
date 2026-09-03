# NexusOps

**AI-powered, real-time IT Operations & Incident Management Platform.**

NexusOps is an enterprise-style IT service management platform built on a fully open-source stack: incident, problem, change, asset & knowledge management, role-based access control, audit logging, real-time collaboration (WebSockets/Socket.IO), and a local-first AI layer backed by **Ollama** (no paid AI APIs required).

> **Status: Phase 7 complete.** All core modules (incidents, assets, knowledge, problems, changes), real-time collaboration, AI layer, RBAC, audit logging, and secure file uploads are built and tested. Phase 8 (docs + E2E) is underway.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, React Router, hand-rolled CSS design system |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL 16 + pgvector (Prisma ORM) |
| Cache/Queue | Redis 7 (caching, real-time, BullMQ job queue) |
| AI | Ollama (local LLM + embeddings) — optional, graceful fallback |
| Testing | Vitest, Supertest, Playwright (roadmap) |
| CI/CD | GitHub Actions |
| Infra | Docker + Docker Compose |

---

## Prerequisites

- **Docker Desktop** (WSL2 backend on Windows)
- **Node.js ≥ 20** (v22 recommended)
- **Ollama** (optional; required only for the AI features in Phase 6)

## Installation & Local Development

```bash
cd nexusops

# 1. Start infrastructure (PostgreSQL 16 + pgvector, Redis 7)
docker compose up -d postgres redis

# 2. Install dependencies (npm workspaces)
npm install

# 3. Prepare environment
cp .env.example .env          # then fill in real secrets (see "Environment" below)
# Also copy to backend/.env so Prisma CLI (run from backend/) can read it.

# 4. Create the database schema (creates the pgvector extension too)
cd backend
npx prisma migrate dev        # applies migrations + generates client

# 5. Seed realistic demo data
npx tsx prisma/seed.ts

# 6. Run the API (terminal 1)
npm run dev --workspace backend

# 7. Run the frontend (terminal 2)
npm run dev --workspace frontend
```

Open **http://localhost:5173** (frontend) — the Vite dev server proxies `/api` to the backend on `:4000`.

## Demo Accounts

Password for **all** demo accounts is `Password123!`:

| Role | Email |
|---|---|
| Admin | `admin@nexusops.local` |
| IT Manager | `manager@nexusops.local` |
| Technician | `tech1@nexusops.local` / `tech2@nexusops.local` |
| Employee | `employee@nexusops.local` / `employee2@nexusops.local` |

## Environment Variables

See `.env.example` for the full template (no real secrets are committed). Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets (generate long random values) |
| `ENCRYPTION_KEY` | 32-byte hex key for sensitive fields at rest |
| `OLLAMA_BASE_URL` / `OLLAMA_CHAT_MODEL` / `OLLAMA_EMBED_MODEL` | Local AI configuration |
| `AI_ENABLED` | Master switch for AI features |

## Docker

```bash
docker compose up -d                # infrastructure (postgres, redis)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

The `frontend` and `backend` application services are added in later phases.

## Tests

```bash
npm run test:backend                 # Vitest unit + integration
npm run typecheck --workspace backend
npm run typecheck --workspace frontend
npm run build                        # full workspace build
```

## Roadmap

- **Phase 0 (DONE):** Monorepo, Docker infra, schema, migrations, seed, CI skeleton
- **Phase 1 (DONE):** Authentication & RBAC (JWT access/refresh, roles/permissions, middleware, audit)
- **Phase 2 (DONE):** Incident management core + SLA engine
- **Phase 3 (DONE):** Real-time layer (Socket.IO, notifications, presence)
- **Phase 4 (DONE):** Frontend shell + design system + role dashboards
- **Phase 5 (DONE):** Assets, Knowledge, Problems, Changes (full CRUD + workflows)
- **Phase 6 (DONE):** AI layer (Ollama, classification, RAG assistant, duplicate detection)
- **Phase 7 (DONE):** Secure file uploads + security hardening (audit review, admin panel)
- **Phase 8 (DONE):** Documentation suite + E2E test infrastructure

Full architecture & design documentation lives in `docs/`.

## License

MIT.