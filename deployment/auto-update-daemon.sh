#!/usr/bin/env bash
# ==============================================================================
# Study App - Background Auto-Update Daemon Loop
# ==============================================================================
# Runs auto-update.sh on a recurring interval. Inherits terminal/user session
# permissions, bypassing macOS TCC sandbox restrictions on ~/Desktop.
# ==============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$DIR/auto-update.log"
PID_FILE="/tmp/study_app_daemon.pid"
INTERVAL="${1:-120}"

echo "$$" > "$PID_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Study App Auto-Update Daemon started (PID: $$, interval: ${INTERVAL}s)." >> "$LOG_FILE"

cleanup() {
    rm -f "$PID_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🛑 Study App Auto-Update Daemon stopped." >> "$LOG_FILE"
    exit 0
}
trap cleanup EXIT INT TERM

while true; do
    "$DIR/auto-update.sh" >> "$LOG_FILE" 2>&1 || true
    sleep "$INTERVAL"
done
