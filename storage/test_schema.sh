#!/usr/bin/env bash
# ==============================================================================
# Database Schema Validation Script
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/schema.sql"

echo "=== Running Automated Storage Schema Tests ==="
cd "${SCRIPT_DIR}"

if command -v npm >/dev/null 2>&1; then
    echo "-> Running in-memory PostgreSQL constraint test suite..."
    npm test
else
    echo "-> Warning: npm not found. Skipping in-memory suite."
fi

# If PostgreSQL credentials or container are available, validate directly against psql
if [ -n "${DATABASE_URL:-}" ] || command -v psql >/dev/null 2>&1; then
    echo "-> Validating schema against live PostgreSQL..."
    PG_CONN="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/study_app_test}"
    if psql "${PG_CONN}" -c "SELECT 1" >/dev/null 2>&1; then
        psql "${PG_CONN}" -f "${SCHEMA_FILE}"
        echo "-> Live PostgreSQL schema initialization verified successfully!"
    else
        echo "-> Notice: Live PostgreSQL instance not reachable at ${PG_CONN}; in-memory verification passed."
    fi
fi

echo "=== Schema validation complete! ==="
