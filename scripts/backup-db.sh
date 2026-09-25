#!/usr/bin/env bash
# =============================================================================
# Database Backup Procedure Script — PostgreSQL Dump
# =============================================================================

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/badminton_live_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "Starting PostgreSQL database backup..."
docker exec -t badminton-live-db pg_dump -U badminton -d badminton_live > "${BACKUP_FILE}"

echo "✅ Backup successfully created at: ${BACKUP_FILE}"
echo "File size: $(du -h "${BACKUP_FILE}" | cut -f1)"
