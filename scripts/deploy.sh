#!/bin/bash
# NexusOps Oracle Cloud Deployment Script
# Run this on your Oracle Cloud VM after cloning the repo

set -e

echo "🚀 NexusOps Deployment Script for Oracle Cloud"
echo "================================================"

# Check if running as root (should NOT be)
if [ "$EUID" -eq 0 ]; then
    echo "❌ Do NOT run this script as root. Run as the ubuntu user."
    exit 1
fi

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    newgrp docker
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo apt install -y docker-compose-plugin
fi

echo "✅ Docker ready"

# Create .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Generate secrets
    JWT_ACCESS=$(openssl rand -hex 64)
    JWT_REFRESH=$(openssl rand -hex 64)
    ENCRYPTION=$(openssl rand -hex 32)
    DB_PASS=$(openssl rand -hex 16)
    
    # Update .env with generated secrets
    sed -i "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$JWT_ACCESS|" .env
    sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH|" .env
    sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION|" .env
    sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASS|" .env
    sed -i "s|CHANGE_ME_STRONG_PASSWORD|$DB_PASS|g" docker-compose.prod.yml
    
    echo "✅ Generated secrets and created .env"
    echo "⚠️  Please edit .env to set CORS_ORIGIN to your domain/IP"
else
    echo "✅ .env already exists"
fi

# Create nginx directories
mkdir -p nginx/certbot/conf nginx/certbot/www

# Build and start services
echo "🏗️  Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services to be healthy..."
sleep 15

# Check service status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

# Seed data
echo "🌱 Seeding demo data..."
docker compose -f docker-compose.prod.yml exec -T backend npx tsx prisma/seed.ts

# Pull Ollama models
echo ""
echo "🤖 Pulling Ollama models (this may take a while)..."
docker compose -f docker-compose.prod.yml exec ollama ollama pull qwen2.5:3b
docker compose -f docker-compose.prod.yml exec ollama ollama pull nomic-embed-text

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your application:"
echo "   - Frontend: http://$(curl -s ifconfig.me)"
echo "   - API: http://$(curl -s ifconfig.me)/api"
echo "   - Health: http://$(curl -s ifconfig.me)/health"
echo ""
echo "🔑 Demo credentials (password for all: Password123!):"
echo "   - admin@nexusops.local (ADMIN)"
echo "   - manager@nexusops.local (IT_MANAGER)"
echo "   - tech1@nexusops.local (TECHNICIAN)"
echo "   - employee@nexusops.local (EMPLOYEE)"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "   - Restart: docker compose -f docker-compose.prod.yml restart"
echo "   - Update: docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "🔒 To set up HTTPS:"
echo "   1. Point your domain to this server's IP"
echo "   2. Edit nginx/nginx.conf and uncomment the HTTPS server block"
echo "   3. Run: docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d your-domain.com"
echo "   4. Restart: docker compose -f docker-compose.prod.yml restart nginx"
