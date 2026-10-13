#!/usr/bin/env bash
# Redeploy a specific earlier image tag: ./scripts/rollback.sh youruser/task-tracker:<old-sha>
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET=${1:?usage: rollback.sh <image:tag>}
IMAGE="$TARGET" ./scripts/deploy.sh
