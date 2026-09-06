# Oracle Cloud Deployment Guide

Complete guide to deploy NexusOps on Oracle Cloud Infrastructure (OCI) **Always Free Tier**.

## Architecture on Oracle Cloud

```
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Cloud VM (Always Free)              │
│                  VM.Standard.A1.Flex (4 OCPU, 24GB RAM)      │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Nginx     │  │   Backend   │  │   Ollama    │          │
│  │   :80/:443  │──│   :4000     │  │   :11434    │          │
│  └─────────────┘  └──────┬──────┘  └─────────────┘          │
│                          │                                    │
│                   ┌──────┴──────┐                            │
│                   │             │                             │
│              ┌────▼────┐  ┌────▼────┐                       │
│              │PostgreSQL│  │  Redis  │                       │
│              │  :5432   │  │  :6379  │                       │
│              └─────────┘  └─────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Oracle Cloud account (free tier is sufficient)
- SSH key pair (RSA or ED25519)
- Domain name (optional, for HTTPS with Let's Encrypt)

---

## Step 1: Create the VM Instance

### Via OCI Console

1. Go to **Compute → Instances → Create Instance**
2. **Name**: `nexusops-prod`
3. **Image**: Canonical Ubuntu 22.04 (or 24.04)
4. **Shape**: VM.Standard.A1.Flex
   - **OCPUs**: 4 (Always Free allows up to 4)
   - **Memory**: 24 GB (Always Free allows up to 24)
5. **SSH Keys**: Upload your public key or let OCI generate one
6. **Boot Volume**: 200 GB (Always Free allows up to 200)
7. **Networking**:
   - Create a new VCN with public subnet
   - Assign a public IP address

### Via OCI CLI

```bash
# Create VCN and subnet (if not exists)
oci vcn create --cidr-block 10.0.0.0/16 --display-name nexusops-vcn --compartment-id <COMPARTMENT_ID>

# Create subnet
oci subnet create --vcn-id <VCN_ID> --cidr-block 10.0.0.0/24 --display-name nexusops-subnet --compartment-id <COMPARTMENT_ID>

# Create instance
oci compute create \
  --compartment-id <COMPARTMENT_ID> \
  --availability-domain <AD> \
  --shape VM.Standard.A1.Flex \
  --shape-config '{"ocpus":4,"memoryInGBs":24}' \
  --source-details '{"sourceType":"image","imageId":"<IMAGE_ID>","bootVolumeSizeInGBs":200}' \
  --display-name nexusops-prod \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
  --subnet-id <SUBNET_ID>
```

---

## Step 2: Configure Networking

### Open Required Ports

Go to **Networking → Virtual Cloud Networks → Your VCN → Security List → Add Ingress Rules**:

| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP | SSH access |
| 80 | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| 443 | 0.0.0.0/0 | HTTPS (frontend + API) |
| 4000 | 0.0.0.0/0 | Backend API (direct access, optional) |

### Via OCI CLI

```bash
# Get security list ID
SEC_LIST=$(oci network security-list list --vcn-id <VCN_ID> --compartment-id <COMPARTMENT_ID> --query 'data[0].id' --raw-output)

# Add ingress rules
oci network security-list update \
  --security-list-id $SEC_LIST \
  --ingress-security-rules '[{"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}}]'

oci network security-list update \
  --security-list-id $SEC_LIST \
  --ingress-security-rules '[{"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}}]'
```

---

## Step 3: Connect to the VM

```bash
# Get the public IP from the OCI console
ssh ubuntu@<PUBLIC_IP>

# Update system
sudo apt update && sudo apt upgrade -y
```

---

## Step 4: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## Step 5: Clone and Configure NexusOps

```bash
# Clone the repository
git clone https://github.com/Chandanpgowda/nexusOps.git
cd nexusops

# Create production environment
cp .env.example .env
nano .env
```

### Production `.env` Configuration

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-domain.com

# Database (local PostgreSQL in Docker)
DATABASE_URL=postgresql://nexusops:STRONG_DB_PASSWORD@postgres:5432/nexusops?schema=public

# Redis (local Redis in Docker)
REDIS_URL=redis://redis:6379

# Auth secrets (generate with: openssl rand -hex 64)
JWT_ACCESS_SECRET=<64_CHAR_HEX>
JWT_REFRESH_SECRET=<64_CHAR_HEX>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_DAYS=7

# Encryption key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=<32_CHAR_HEX>

# AI (Ollama running locally)
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_CHAT_MODEL=qwen2.5:3b
OLLAMA_EMBED_MODEL=nomic-embed-text
AI_ENABLED=true

# Uploads
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=10

# Rate limiting
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
```

### Generate Secrets

```bash
# Generate JWT secrets
openssl rand -hex 64  # JWT_ACCESS_SECRET
openssl rand -hex 64  # JWT_REFRESH_SECRET
openssl rand -hex 32  # ENCRYPTION_KEY
```

---

## Step 6: Deploy

```bash
# Pull latest code
git pull origin master

# Start all services
docker compose up -d --build

# Wait for services to be healthy
docker compose ps

# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Seed demo data
docker compose exec backend npx tsx prisma/seed.ts

# Pull Ollama models (this may take a while)
docker compose exec ollama ollama pull qwen2.5:3b
docker compose exec ollama ollama pull nomic-embed-text
```

---

## Step 7: Set Up HTTPS (Optional but Recommended)

```bash
# Stop nginx temporarily
docker compose stop nginx

# Get SSL certificate
docker run -it --rm \
  -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com

# Restart nginx
docker compose up -d nginx
```

---

## Step 8: Verify Deployment

```bash
# Check all services are running
docker compose ps

# Check logs
docker compose logs -f backend

# Test health endpoint
curl http://localhost:4000/health

# Test from outside (replace with your public IP or domain)
curl http://<PUBLIC_IP>/health
```

---

## Step 9: Set Up Automated Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * cd ~/nexusops && docker exec nexusops-postgres pg_dump -U nexusops nexusops | gzip > ~/backups/db_\$(date +\%Y\%m\%d).sql.gz") | crontab -
```

---

## Useful Commands

```bash
# View logs
docker compose logs -f [service]

# Restart a service
docker compose restart [service]

# Update deployment (after git pull)
docker compose up -d --build

# Check resource usage
docker stats

# Access database shell
docker compose exec postgres psql -U nexusops -d nexusops

# Access Redis CLI
docker compose exec redis redis-cli
```

---

## Cost Estimate

| Resource | Always Free Limit | Used |
|----------|-------------------|------|
| Compute (VM.Standard.A1.Flex) | 4 OCPU, 24 GB RAM | 4 OCPU, 24 GB |
| Block Storage | 200 GB | ~20 GB |
| Outbound Data Transfer | 10 TB/month | < 1 GB |
| **Monthly Cost** | **$0.00** | **$0.00** |

---

## Troubleshooting

### Out of Memory
- Reduce Ollama model size (use `qwen2.5:1.5b` instead of `3b`)
- Limit Redis memory: `--maxmemory 256mb`
- Add swap space: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`

### Services Not Starting
- Check logs: `docker compose logs [service]`
- Verify env vars: `docker compose config`
- Check disk space: `df -h`

### Database Connection Issues
- Verify postgres is healthy: `docker compose ps`
- Check connection string format
- Ensure pgvector extension is installed (included in image)
