#!/usr/bin/env bash
# ==============================================================================
# Database Schema Validation Script
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/schema.sql"

echo "=== Running Automated Storage Schema Tests ==="
cd "${SCRIPT_DIR}"

TESTS_RAN=0

# 1. In-memory PostgreSQL constraint test suite via Vitest + pg-mem
if command -v npm >/dev/null 2>&1; then
    echo "-> Running in-memory PostgreSQL constraint test suite..."
    npm test
    TESTS_RAN=1
else
    echo "-> Warning: npm not found. Skipping in-memory suite."
fi

# 2. Live PostgreSQL Validation
if [ -n "${DATABASE_URL:-}" ]; then
    # Explicit DATABASE_URL was configured: live validation MUST succeed or fail the build
    echo "-> DATABASE_URL is configured. Validating against live PostgreSQL instance..."
    if ! command -v psql >/dev/null 2>&1; then
        echo "Error: DATABASE_URL is set (${DATABASE_URL}), but 'psql' is not installed or not in PATH." >&2
        exit 1
    fi

    if ! psql "${DATABASE_URL}" -c "SELECT 1" >/dev/null 2>&1; then
        echo "Error: Could not connect to configured DATABASE_URL (${DATABASE_URL})." >&2
        exit 1
    fi

    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${SCHEMA_FILE}"
    echo "-> Live PostgreSQL schema initialization verified successfully!"
    TESTS_RAN=1
elif command -v psql >/dev/null 2>&1; then
    # Optional local PostgreSQL check when DATABASE_URL is not explicitly specified
    LOCAL_PG="postgresql://postgres:postgres@localhost:5432/study_app_test"
    if psql "${LOCAL_PG}" -c "SELECT 1" >/dev/null 2>&1; then
        echo "-> Local PostgreSQL instance detected at ${LOCAL_PG}. Validating schema..."
        psql "${LOCAL_PG}" -v ON_ERROR_STOP=1 -f "${SCHEMA_FILE}"
        echo "-> Local PostgreSQL schema initialization verified successfully!"
        TESTS_RAN=1
    else
        echo "-> Notice: Optional local PostgreSQL instance not reachable at ${LOCAL_PG}; in-memory verification passed."
    fi
fi

if [ "${TESTS_RAN}" -eq 0 ]; then
    echo "Error: No validation test suites could be executed (neither npm nor a live PostgreSQL instance was available)." >&2
    exit 1
fi

echo "=== Schema validation complete! ==="
