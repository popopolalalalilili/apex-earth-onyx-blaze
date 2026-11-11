#!/bin/sh
set -e
cd /workspace
if ! curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8091/health; then
  WICK_HEALTH_PORT=8091 node --import tsx src/worker/main.ts >> /tmp/wick-worker.log 2>&1 &
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/wick-dev.log 2>&1 &
i=0
while [ "$i" -lt 40 ]; do
  if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done
echo "dev server did not start" >&2
tail -n 40 /tmp/wick-dev.log >&2 || true
exit 1
