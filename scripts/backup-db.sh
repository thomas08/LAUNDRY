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

# Off-box upload to DigitalOcean Spaces (S3-compatible), if configured in .env.prod:
#   SPACES_BUCKET, SPACES_ENDPOINT (e.g. https://sgp1.digitaloceanspaces.com),
#   SPACES_ACCESS_KEY, SPACES_SECRET_KEY, optional SPACES_PREFIX (default: linenflow)
# Best-effort: a failed upload warns but does not fail the local backup.
if [ -n "${SPACES_BUCKET:-}" ]; then
	if command -v aws >/dev/null 2>&1; then
		DEST="s3://${SPACES_BUCKET}/${SPACES_PREFIX:-linenflow}/$(basename "$OUT")"
		if AWS_ACCESS_KEY_ID="${SPACES_ACCESS_KEY:-}" AWS_SECRET_ACCESS_KEY="${SPACES_SECRET_KEY:-}" \
			aws s3 cp "$OUT" "$DEST" --endpoint-url "${SPACES_ENDPOINT}" --only-show-errors; then
			echo "[$(date -Is)] uploaded to $DEST"
		else
			echo "[$(date -Is)] WARN: Spaces upload failed (kept local copy)" >&2
		fi
	else
		echo "[$(date -Is)] WARN: SPACES_BUCKET set but 'aws' CLI not installed" >&2
	fi
fi

# Prune old LOCAL backups (remote retention: set a Spaces lifecycle rule in the DO console)
find "$BACKUP_DIR" -name 'linenflow-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Is)] done. Retention ${RETENTION_DAYS}d local. Current backups:"
ls -lh "$BACKUP_DIR"/linenflow-*.sql.gz
