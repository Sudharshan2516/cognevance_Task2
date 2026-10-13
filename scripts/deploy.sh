#!/usr/bin/env bash
# Deploys a Docker image with health check and automatic rollback.
# Usage: IMAGE=youruser/task-tracker:<tag> ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=${IMAGE:?set IMAGE, e.g. IMAGE=youruser/task-tracker:abc1234}
HOST_PORT=${HOST_PORT:-80}
STATE_FILE=.deployed_image
PREVIOUS=$(cat "$STATE_FILE" 2>/dev/null || true)

log() { echo "[$(date -u +%FT%TZ)] $*"; }

log "Pulling $IMAGE"
docker pull "$IMAGE"

log "Starting new version"
export IMAGE HOST_PORT
docker compose up -d --remove-orphans

log "Waiting for health check (max 60s)"
for i in $(seq 1 30); do
  status=$(docker inspect --format '{{.State.Health.Status}}' task-tracker 2>/dev/null || echo starting)
  if [ "$status" = "healthy" ]; then
    echo "$IMAGE" > "$STATE_FILE"
    log "Deployment SUCCESS: $IMAGE is healthy"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

log "Deployment FAILED: container not healthy. Last logs:"
docker logs --tail 30 task-tracker || true
if [ -n "$PREVIOUS" ]; then
  log "Rolling back to $PREVIOUS"
  IMAGE="$PREVIOUS" docker compose up -d
  log "Rollback complete"
fi
exit 1
