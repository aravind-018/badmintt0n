#!/usr/bin/env bash
# =============================================================================
# Database Restore Procedure Script — PostgreSQL Dump Restore
# =============================================================================

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore-db.sh <path-to-backup.sql>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' not found."
  exit 1
fi

echo "Restoring database from: ${BACKUP_FILE}..."
docker exec -i badminton-live-db psql -U badminton -d badminton_live < "${BACKUP_FILE}"

echo "✅ Database successfully restored from: ${BACKUP_FILE}"
