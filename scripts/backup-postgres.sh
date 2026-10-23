#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PolyFactory PostgreSQL Daily Backup Script
# Retention: 14 days, Gzip compressed
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-${DB_NAME:-polyfactory}}"
POSTGRES_USER="${POSTGRES_USER:-${DB_USER:-polyfactory_user}}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/polyfactory_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting PolyFactory database backup..."

# Execute pg_dump and pipe directly into gzip
PGPASSWORD="${POSTGRES_PASSWORD:-${DB_PASSWORD:-polyfactory_secure_pwd_2026}}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=plain \
  --no-owner \
  --no-acl | gzip -9 > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed: ${BACKUP_FILE} (${FILESIZE})"

# Cleanup backups older than retention days
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "polyfactory_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} +

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup routine finished successfully."
