# Render Deployment Guide

Deploy NexusOps on Render's free tier. This guide covers both automated (Blueprint) and manual deployment.

## Architecture on Render

```
┌─────────────────────────────────────────────────────────────┐
│                        Render Platform                        │
│                                                               │
│  ┌─────────────────┐          ┌─────────────────┐           │
│  │   Frontend      │          │   Backend       │           │
│  │   (Static Site) │──────────│   (Web Service) │           │
│  │   Free          │  API     │   Free          │           │
│  └─────────────────┘          └────────┬────────┘           │
│                                        │                     │
│                               ┌────────┴────────┐           │
│                               │                 │            │
│                          ┌────▼────┐      ┌────▼────┐      │
│                          │PostgreSQL│      │  Redis  │      │
│                          │  Free   │      │ Upstash │      │
│                          │ (90 days)│      │  Free   │      │
│                          └─────────┘      └─────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Render Free Tier Limits

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Web Service | 750 hrs/month | Sleeps after 15 min inactivity |
| Static Site | Unlimited | CDN-hosted |
| PostgreSQL | 90 days | Then $7/month |
| Redis | Not available | Use Upstash Redis (free) |

---

## Option 1: Automated Deployment (Blueprint)

### Step 1: Fork/Clone the Repository
```bash
# Your code should be on GitHub
git clone https://github.com/Chandanpgowda/nexusOps.git
cd nexusops
```

### Step 2: Deploy via Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New → Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and show the services to create
5. Click **Apply** to deploy

### Step 3: Add Redis (Upstash)
Since Render doesn't offer free Redis, use Upstash:
1. Go to [Upstash](https://upstash.com/) and create a free account
2. Create a new Redis database (choose closest region)
3. Copy the `REDIS_URL` (starts with `rediss://`)
4. In Render Dashboard, go to **nexusops-backend → Environment**
5. Add environment variable:
   - Key: `REDIS_URL`
   - Value: Your Upstash Redis URL

---

## Option 2: Manual Deployment

### Step 1: Create PostgreSQL Database
1. Render Dashboard → **New → PostgreSQL**
2. **Name**: `nexusops-db`
3. **Plan**: Free
4. **Region**: Oregon (or closest)
5. Click **Create Database**
6. Wait for it to be ready, then copy the **Internal Database URL**

### Step 2: Create Backend Web Service
1. Render Dashboard → **New → Web Service**
2. Connect your GitHub repo
3. **Name**: `nexusops-backend`
4. **Runtime**: Docker
5. **Dockerfile Path**: `./backend/Dockerfile`
6. **Plan**: Free
7. **Health Check Path**: `/health`
8. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=<Internal Database URL from Step 1>
   REDIS_URL=<Upstash Redis URL>
   JWT_ACCESS_SECRET=<generate with openssl rand -hex 64>
   JWT_REFRESH_SECRET=<generate with openssl rand -hex 64>
   ENCRYPTION_KEY=<generate with openssl rand -hex 32>
   AI_ENABLED=false
   CORS_ORIGIN=https://nexusops-frontend.onrender.com
   ```
9. Click **Create Web Service**

### Step 3: Create Frontend Static Site
1. Render Dashboard → **New → Static Site**
2. Connect your GitHub repo
3. **Name**: `nexusops-frontend`
4. **Build Command**: `npm ci && npm run build --workspace frontend`
5. **Publish Directory**: `./frontend/dist`
6. Add Environment Variable:
   ```
   VITE_API_URL=https://nexusops-backend.onrender.com
   ```
7. Add Rewrite Rules:
   - Source: `/api/*` → Destination: `https://nexusops-backend.onrender.com/api/*`
   - Source: `/*` → Destination: `/index.html`
8. Click **Create Static Site**

### Step 4: Run Migrations
1. Go to **nexusops-backend → Shell**
2. Run:
   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seed.ts
   ```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `4000` |
| `CORS_ORIGIN` | Yes | Frontend URL |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Upstash Redis URL |
| `JWT_ACCESS_SECRET` | Yes | 64+ char hex string |
| `JWT_REFRESH_SECRET` | Yes | 64+ char hex string |
| `ENCRYPTION_KEY` | Yes | 32 char hex string |
| `AI_ENABLED` | No | `false` (Render can't run Ollama) |
| `UPLOAD_DIR` | No | `/tmp/uploads` (Render ephemeral disk) |

---

## Important Notes

### Free Tier Limitations
- **Backend sleeps** after 15 minutes of inactivity (takes ~30s to wake up)
- **PostgreSQL expires** after 90 days (then $7/month)
- **No Ollama support** — AI features use heuristic fallback
- **Ephemeral disk** — uploads are lost on redeploy (use S3 for persistent storage)

### Keeping Backend Awake (Optional)
Use a free uptime monitor to ping your backend every 14 minutes:
- [UptimeRobot](https://uptimerobot.com/) (free)
- [Cron-Job.org](https://cron-job.org/en/) (free)

Set monitor URL to: `https://nexusops-backend.onrender.com/health`

### Persistent File Uploads
For persistent uploads on Render, integrate with cloud storage:
- AWS S3 (free tier: 5 GB)
- Cloudflare R2 (free tier: 10 GB)
- Backblaze B2 (free tier: 10 GB)

---

## Updating Deployment

### Automatic (GitHub Integration)
Render auto-deploys on push to `main`:
```bash
git add .
git commit -m "update"
git push origin main
```

### Manual
1. Render Dashboard → Select service
2. Click **Deploy latest commit**

---

## Troubleshooting

### Backend Won't Start
- Check logs: **Service → Logs**
- Verify all env vars are set
- Ensure `DATABASE_URL` uses Internal URL

### Database Connection Failed
- Verify `DATABASE_URL` is the **Internal** URL (not External)
- Check if database is in same region

### CORS Errors
- Verify `CORS_ORIGIN` matches frontend URL exactly
- Include protocol (`https://`)

### Free Tier Timeout
- Backend sleeps after 15 min inactivity
- First request after sleep takes ~30s
- Use uptime monitor to keep awake

---

## Cost Estimate

| Service | Cost |
|---------|------|
| Backend (Web Service) | $0.00/month |
| Frontend (Static Site) | $0.00/month |
| PostgreSQL (first 90 days) | $0.00/month |
| Redis (Upstash) | $0.00/month |
| **Total** | **$0.00/month** |

After 90 days: **$7/month** for PostgreSQL (or migrate to Oracle Cloud Free Tier).

---

## Production Recommendation

For production workloads, consider:
- **Render Starter**: $7/month (no sleep, always on)
- **Oracle Cloud Always Free**: 4 OCPU, 24 GB RAM (supports Ollama)
- **Railway**: $5/month starter (includes PostgreSQL)