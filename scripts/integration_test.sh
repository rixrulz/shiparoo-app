#!/usr/bin/env bash
#
# End-to-end integration test for the Shiparoo API.
#
# Exits 0 when every step passes, 1 on any failure.
#
# The API under test is selected with the API_BASE_URL environment
# variable (default: http://localhost:3000), for example:
#
#   API_BASE_URL=https://staging-api.example.com scripts/integration_test.sh
#
# The test creates only its own data (throwaway users, one bid, and one
# load that it cancels before exiting); it needs no real credentials or
# secrets.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

exec node "$SCRIPT_DIR/integration_test.js" "$@"
