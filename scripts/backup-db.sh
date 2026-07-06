#!/usr/bin/env bash
# ── LinenFlow™ PostgreSQL backup ────────────────────────────────────────────
# Dumps the database from the running postgres container, gzips it, and prunes
# dumps older than RETENTION_DAYS. Run from the repo directory (the one holding
# docker-compose.prod.yml).
#
#   ./scripts/backup-db.sh [backup-dir]      # default dir: ./backups
#
# Daily cron (02:30), logging to a file:
#   30 2 * * * cd /opt/linenflow && ./scripts/backup-db.sh >> /var/log/linenflow-backup.log 2>&1
#
# IMPORTANT: copy the dumps OFF this server (object storage / another host).
# A backup that only lives on the same VPS does not survive the VPS dying.
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Load DB_USER / DB_NAME from the env file
set -a; [ -f "$ENV_FILE" ] && . "$ENV_FILE"; set +a
DB_USER="${DB_USER:-linenflow}"
DB_NAME="${DB_NAME:-linenflow}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/linenflow-$STAMP.sql.gz"

echo "[$(date -Is)] dumping '$DB_NAME' -> $OUT"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
	pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip -9 >"$OUT"

# Fail loudly if the dump is suspiciously small (e.g. auth/connection error)
if [ "$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")" -lt 1000 ]; then
	echo "[$(date -Is)] ERROR: dump looks empty ($OUT) — check DB credentials/container" >&2
	exit 1
fi

# Prune old backups
find "$BACKUP_DIR" -name 'linenflow-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Is)] done. Retention ${RETENTION_DAYS}d. Current backups:"
ls -lh "$BACKUP_DIR"/linenflow-*.sql.gz
