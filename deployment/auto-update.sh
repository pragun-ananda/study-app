#!/usr/bin/env bash
# ==============================================================================
# Study App - Pull-Based Auto-Deployment Script
# ==============================================================================
# Checks remote repository for new commits, runs a pre-deploy database backup,
# pulls fast-forward changes, rebuilds & restarts containers, and verifies health.
# ==============================================================================
set -euo pipefail

# Ensure standard binaries and Homebrew/Docker paths are available in non-interactive/cron/launchd environments
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$DIR/.." && pwd)"
COMPOSE_FILE="$DIR/docker-compose.prod.yml"
ENV_FILE="$DIR/.env.production"

BRANCH="main"
FORCE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --force|-f)
            FORCE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --branch|-b)
            BRANCH="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: $0 [--force|-f] [--verbose|-v] [--branch|-b <branch>]"
            exit 1
            ;;
    esac
done

# Acquire atomic execution lock using lock directory pattern
LOCK_DIR="/tmp/study_app_autoupdate.lock"
PID_FILE="$LOCK_DIR/pid"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    if [ -f "$PID_FILE" ]; then
        EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || echo "")"
        if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
            if [ "$VERBOSE" = true ]; then
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] Another update process (PID $EXISTING_PID) is running. Skipping."
            fi
            exit 0
        fi
    fi

    # Lock is stale or orphaned from an unclean reboot/kill
    rm -rf "$LOCK_DIR"
    if ! mkdir "$LOCK_DIR" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Failed to acquire lock directory $LOCK_DIR. Skipping." >&2
        exit 0
    fi
fi

echo "$$" > "$PID_FILE"
cleanup() {
    rm -rf "$LOCK_DIR"
}
trap cleanup EXIT INT TERM

cd "$REPO_DIR"

# Ensure repo is on target branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    if [ "$VERBOSE" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️ Repository is currently on '$CURRENT_BRANCH' (target: '$BRANCH'). Skipping auto-update."
    fi
    exit 0
fi

# Ensure repo has no uncommitted changes to tracked files
if ! git diff-index --quiet HEAD --; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Working tree has uncommitted local modifications. Skipping auto-update to protect local work." >&2
    exit 0
fi

# Fetch remote changes quietly with error handling for network outages
if ! git fetch origin "$BRANCH" --quiet 2>/dev/null; then
    if [ "$VERBOSE" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Unable to reach origin/$BRANCH (offline or network error). Skipping."
    fi
    exit 0
fi

CURRENT_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse "origin/$BRANCH")"

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ] && [ "$FORCE" = false ]; then
    if [ "$VERBOSE" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Stack is already up to date at commit ${CURRENT_COMMIT:0:7}."
    fi
    exit 0
fi

# If local branch is ahead of origin, do not overwrite unless forced
if git merge-base --is-ancestor "origin/$BRANCH" HEAD 2>/dev/null && [ "$CURRENT_COMMIT" != "$REMOTE_COMMIT" ] && [ "$FORCE" = false ]; then
    if [ "$VERBOSE" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️ Local branch is ahead of origin/$BRANCH. Skipping auto-update."
    fi
    exit 0
fi

echo "================================================================================"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 New updates detected for Study App ($BRANCH)!"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local commit:  ${CURRENT_COMMIT:0:7}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Remote commit: ${REMOTE_COMMIT:0:7}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Commit summary:"
git log --oneline -n 10 "${CURRENT_COMMIT}..${REMOTE_COMMIT}" || true
echo "--------------------------------------------------------------------------------"

# Step 1: Pre-update database snapshot
if [ -f "$DIR/backup-db.sh" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📦 Creating pre-deployment database backup..."
    if ! "$DIR/backup-db.sh"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Warning: Database backup returned non-zero code. Proceeding with update..." >&2
    fi
fi

# Step 2: Fast-forward pull
if [ "$CURRENT_COMMIT" != "$REMOTE_COMMIT" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📥 Pulling latest changes from origin/$BRANCH..."
    if ! git pull --ff-only origin "$BRANCH"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Fast-forward pull failed. Local branch may have diverged. Manual intervention required." >&2
        exit 1
    fi
fi

# Step 3: Rebuild and restart production containers
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Rebuilding and redeploying Docker stack..."
if [ ! -f "$ENV_FILE" ] && [ -f "$DIR/.env.production.example" ]; then
    cp "$DIR/.env.production.example" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

# Step 4: Prune dangling images to conserve disk space
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 Pruning old dangling images..."
docker image prune -f >/dev/null 2>&1 || true

# Step 5: Verify stack health
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🩺 Verifying stack health..."
CHECK_PORT="3000"
if [ -f "$ENV_FILE" ]; then
    PARSED_PORT=$(grep -E '^APP_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' "\r' || true)
    if [ -n "$PARSED_PORT" ]; then
        CHECK_PORT="$PARSED_PORT"
    fi
fi

HEALTHY=false
for i in {1..15}; do
    if curl -fsS "http://localhost:${CHECK_PORT}/health" >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$HEALTHY" = true ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Auto-deployment successful! Stack is healthy at commit $(git rev-parse --short HEAD)."
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Stack started, but health check http://localhost:${CHECK_PORT}/health did not respond OK within 30s." >&2
fi
echo "================================================================================"
