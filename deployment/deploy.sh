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
    update)
        echo "📥 Pulling latest git changes..."
        git -C "$DIR/.." pull
        echo "🔄 Rebuilding and redeploying..."
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
        echo "🧹 Pruning old dangling images..."
        docker image prune -f
        echo "✅ Update complete!"
        ;;
    *)
        echo "Usage: $0 {up|down|restart|build|logs [service]|status|backup|update}"
        exit 1
        ;;
esac
