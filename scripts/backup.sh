#!/bin/bash
# NexusOps Backup Script
# Run via crontab: 0 2 * * * /home/ubuntu/nexusops/scripts/backup.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "📦 Starting backup at $(date)"

# PostgreSQL backup
echo "  → Backing up PostgreSQL..."
docker exec nexusops-postgres pg_dump -U nexusops nexusops | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Redis backup
echo "  → Backing up Redis..."
docker exec nexusops-redis redis-cli BGSAVE
docker cp nexusops-redis:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

# Uploads backup
echo "  → Backing up uploads..."
docker run --rm -v nexusops_uploads_data:/data -v "$BACKUP_DIR:/backup" alpine tar czf "/backup/uploads_$TIMESTAMP.tar.gz" -C /data .

# Clean old backups
echo "  → Cleaning up old backups ($RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"
echo "📊 Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
