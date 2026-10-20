#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export PORT="3000"
export NODE_ENV="production"

cd "$DIR"

# Rebuild frontend if dist does not exist
if [ ! -d "$DIR/frontend/dist" ]; then
  npm --prefix "$DIR/frontend" run build
fi

exec "$DIR/backend/node_modules/.bin/tsx" "$DIR/backend/src/test-server.ts"
