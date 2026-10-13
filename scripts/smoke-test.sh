#!/usr/bin/env bash
# Verifies a running deployment. Usage: ./scripts/smoke-test.sh http://localhost:3000
set -euo pipefail
URL=${1:?usage: smoke-test.sh <base-url>}
fail() { echo "SMOKE TEST FAILED: $1"; exit 1; }
curl -fsS "$URL/health" | grep -q '"status":"ok"' || fail "/health"
curl -fsS "$URL/version" | grep -q '"version"' || fail "/version"
id=$(curl -fsS -X POST -H 'Content-Type: application/json' -d '{"title":"smoke"}' "$URL/api/tasks" | sed -E 's/.*"id":([0-9]+).*/\1/')
curl -fsS "$URL/api/tasks" | grep -q smoke || fail "create/list task"
curl -fsS -X DELETE "$URL/api/tasks/$id" -o /dev/null || fail "delete task"
echo "Smoke test passed for $URL"
