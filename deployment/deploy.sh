#!/usr/bin/env bash
# ==============================================================================
# Study App Production Deployment Helper Script
# ==============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$DIR/docker-compose.prod.yml"
ENV_FILE="$DIR/.env.production"

# Check if production env exists, otherwise offer example
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$DIR/.env.production.example" ]; then
        echo "⚠️  $ENV_FILE not found. Initializing from .env.production.example..."
        cp "$DIR/.env.production.example" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
        echo "ℹ️  Created $ENV_FILE with restricted permissions (0600). Please add your OPENAI_API_KEY if needed."
    fi
fi

ACTION="${1:-status}"

case "$ACTION" in
    up|start)
        echo "🚀 Starting Study App stack in production mode..."
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
        echo "✅ Services started. Checking status..."
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
        ;;
    down|stop)
        echo "🛑 Stopping Study App stack..."
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down
        echo "✅ Services stopped."
        ;;
    restart)
        echo "🔄 Restarting Study App stack..."
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart
        echo "✅ Services restarted."
        ;;
    build)
        echo "🔨 Building production container images..."
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build
        echo "✅ Build complete."
        ;;
    logs)
        SERVICE="${2:-}"
        if [ -n "$SERVICE" ]; then
            docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs -f "$SERVICE"
        else
            docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs -f
        fi
        ;;
    status)
        echo "=== Study App Container Status ==="
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
        echo ""
        echo "=== Endpoint Health Checks ==="
        CHECK_PORT="3000"
        if [ -f "$ENV_FILE" ]; then
            PARSED_PORT=$(grep -E '^APP_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' "\r' || true)
            if [ -n "$PARSED_PORT" ]; then
                CHECK_PORT="$PARSED_PORT"
            fi
        fi
        if curl -fsS "http://localhost:${CHECK_PORT}/health" >/dev/null 2>&1; then
            echo "✅ Gateway & Backend Health: http://localhost:${CHECK_PORT}/health (Status: OK)"
        else
            echo "⚠️  Health endpoint http://localhost:${CHECK_PORT}/health not reachable"
        fi
        ;;
    backup)
        "$DIR/backup-db.sh"
        ;;
    seed)
        echo "🌱 Seeding PostgreSQL database with knowledge graph topics, edges, and notes..."
        DB_USER="postgres"
        DB_NAME="study_db"
        if [ -f "$ENV_FILE" ]; then
            PARSED_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' "\r' || true)
            PARSED_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' "\r' || true)
            [ -n "$PARSED_USER" ] && DB_USER="$PARSED_USER"
            [ -n "$PARSED_DB" ] && DB_NAME="$PARSED_DB"
        fi
        TOPIC_COUNT=$(docker exec -i study_app_postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM topics;" 2>/dev/null | xargs || echo "0")
        if [[ "${2:-}" == "--clean" || "${2:-}" == "--force" ]]; then
            echo "⚠️  Clearing existing data and applying seed..."
            docker exec -i study_app_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "TRUNCATE topics, notes, study_todos CASCADE;"
            docker exec -i study_app_postgres psql -U "$DB_USER" -d "$DB_NAME" < "$DIR/../storage/seeds/seed_test_db.sql"
            echo "✅ Database cleanly re-seeded!"
        elif [ "${TOPIC_COUNT:-0}" -gt 0 ]; then
            echo "ℹ️  Database already populated ($TOPIC_COUNT topics). Use './deploy.sh seed --clean' to wipe and re-seed."
        else
            docker exec -i study_app_postgres psql -U "$DB_USER" -d "$DB_NAME" < "$DIR/../storage/seeds/seed_test_db.sql"
            echo "✅ Database seeded successfully!"
        fi
        ;;
    update)
        "$DIR/auto-update.sh" --force
        ;;
    autoupdate-install)
        echo "📦 Installing Study App auto-update LaunchAgent..."
        LAUNCHAGENT_DIR="$HOME/Library/LaunchAgents"
        PLIST_FILE="$LAUNCHAGENT_DIR/com.studyapp.autoupdate.plist"
        mkdir -p "$LAUNCHAGENT_DIR"
        cp "$DIR/com.studyapp.autoupdate.plist" "$PLIST_FILE"
        launchctl unload "$PLIST_FILE" 2>/dev/null || true
        launchctl load "$PLIST_FILE"
        echo "✅ LaunchAgent loaded successfully! Auto-sync will check for commits every 2 minutes."
        ;;
    autoupdate-uninstall)
        echo "🛑 Unloading Study App auto-update LaunchAgent..."
        PLIST_FILE="$HOME/Library/LaunchAgents/com.studyapp.autoupdate.plist"
        if [ -f "$PLIST_FILE" ]; then
            launchctl unload "$PLIST_FILE" 2>/dev/null || true
            rm -f "$PLIST_FILE"
            echo "✅ LaunchAgent unloaded and removed."
        else
            echo "ℹ️  LaunchAgent was not installed."
        fi
        ;;
    autoupdate-status)
        echo "=== Study App Auto-Update Daemon Status ==="
        if launchctl list | grep -q "com.studyapp.autoupdate"; then
            echo "✅ LaunchAgent is currently LOADED and ACTIVE."
            launchctl list | grep "com.studyapp.autoupdate" || true
        else
            echo "ℹ️  LaunchAgent is NOT loaded."
        fi
        echo ""
        echo "=== Recent Auto-Update Log Entries ==="
        if [ -f "$DIR/auto-update.log" ]; then
            tail -n 20 "$DIR/auto-update.log"
        else
            echo "No log file found at $DIR/auto-update.log."
        fi
        ;;
    autoupdate-logs)
        LOG_FILE="$DIR/auto-update.log"
        touch "$LOG_FILE"
        echo "📄 Streaming $LOG_FILE (Ctrl+C to exit)..."
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {up|down|restart|build|logs [service]|status|backup|seed|update|autoupdate-install|autoupdate-uninstall|autoupdate-status|autoupdate-logs}"
        exit 1
        ;;
esac
