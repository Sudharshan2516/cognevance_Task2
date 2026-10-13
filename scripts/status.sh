#!/usr/bin/env bash
# Shows deployment status: container state, health, running image, version endpoint
cd "$(dirname "$0")/.."
PORT=${HOST_PORT:-80}
echo "== Container =="; docker ps --filter name=task-tracker --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
echo; echo "== Health ==";  docker inspect --format '{{.State.Health.Status}}' task-tracker 2>/dev/null || echo "not running"
echo; echo "== Deployed image =="; cat .deployed_image 2>/dev/null || echo "none recorded"
echo; echo "== /version =="; curl -fsS "http://localhost:$PORT/version" || echo "unreachable"; echo
echo; echo "== Last 10 log lines =="; docker logs --tail 10 task-tracker 2>&1
