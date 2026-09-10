#!/usr/bin/env bash
# ==============================================================================
# Automated Database Backup Script for Study App PostgreSQL
# ==============================================================================
set -euo pipefail

# Ensure standard tools and Docker binary are in PATH (crucial for macOS cron)
PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$DIR/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
CONTAINER_NAME="study_app_postgres"

# Load environment configuration if available
if [ -f "$DIR/.env.production" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$DIR/.env.production"
    set +a
elif [ -f "$DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$DIR/.env"
    set +a
fi

DB_NAME="${POSTGRES_DB:-study_db}"
DB_USER="${POSTGRES_USER:-postgres}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
TMP_BACKUP_FILE="${BACKUP_FILE}.tmp"

# Clean up partial temporary file if an error occurs
trap 'rm -f "$TMP_BACKUP_FILE"' ERR EXIT

echo "=== [1/2] Initiating PostgreSQL Dump for database '$DB_NAME' ==="
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container '$CONTAINER_NAME' is not currently running. Aborting." >&2
    exit 1
fi

# Do NOT use -t: avoids PTY carriage returns (\r\n) and tty allocation errors in cron
docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip > "$TMP_BACKUP_FILE"
mv "$TMP_BACKUP_FILE" "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created successfully: $BACKUP_FILE ($FILESIZE)"

echo "=== [2/2] Applying Backup Retention Policy (keeping 14 most recent) ==="
cd "$BACKUP_DIR"

# Array accumulation compatible with both bash 3.2 (macOS default) and bash 5+
BACKUPS=()
while IFS= read -r line; do
    [ -n "$line" ] && BACKUPS+=("$line")
done < <(find . -maxdepth 1 -name "backup_${DB_NAME}_*.sql.gz" -type f | sort -r)

if [ "${#BACKUPS[@]}" -gt 14 ]; then
    for old_backup in "${BACKUPS[@]:14}"; do
        rm -f -- "$old_backup"
        echo "🧹 Pruned expired backup: $old_backup"
    done
else
    echo "✅ No expired backups to prune (Retained ${#BACKUPS[@]}/14)."
fi

echo "=== Database Backup Complete ==="
