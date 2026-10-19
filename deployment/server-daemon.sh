#!/usr/bin/env bash
# ==============================================================================
# Study App - Background Server Daemon Supervisor Loop
# ==============================================================================
# Keeps Study App backend + SPA server running continuously on port 3000.
# Auto-restarts the server if it ever terminates unexpectedly.
# Inherits user session permissions, bypassing macOS TCC restrictions on ~/Desktop.
# ==============================================================================
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$DIR/.." && pwd)"
LOG_FILE="/Users/cheese/Library/Logs/study-app.log"
PID_FILE="/tmp/study_app_server.pid"

mkdir -p "$(dirname "$LOG_FILE")"
echo "$$" > "$PID_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Study App Background Server Daemon started (PID: $$)." >> "$LOG_FILE"

cleanup() {
    rm -f "$PID_FILE"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🛑 Study App Background Server Daemon stopped." >> "$LOG_FILE"
    exit 0
}
trap cleanup EXIT INT TERM

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Study App server on port 3000..." >> "$LOG_FILE"
    "$REPO_DIR/scripts/start-server.sh" >> "$LOG_FILE" 2>&1 || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Server stopped. Restarting in 3 seconds..." >> "$LOG_FILE"
    sleep 3
done
