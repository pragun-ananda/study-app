#!/usr/bin/env bash
# ==============================================================================
# Database Schema Validation Script (In-Memory)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Running Automated Storage Schema Tests ==="
cd "${SCRIPT_DIR}"

npm test

echo "=== Schema validation complete! ==="
