#!/usr/bin/env bash
# Log helper. Usage: ./scripts/logs.sh [follow|errors|slow|last N]
case "${1:-follow}" in
  follow) docker logs -f --tail 50 task-tracker ;;
  errors) docker logs task-tracker 2>&1 | grep -E '"level":"error"|"status":5' ;;
  slow)   docker logs task-tracker 2>&1 | grep -E '"ms":[0-9]{3,}' ;;
  last)   docker logs --tail "${2:-100}" task-tracker ;;
  *) echo "usage: logs.sh [follow|errors|slow|last N]"; exit 1 ;;
esac
