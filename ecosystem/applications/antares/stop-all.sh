#!/usr/bin/env bash
# stop-all.sh — shuts down every process start-all.sh started.
cd "$(dirname "$0")"

if [ ! -d .run ]; then
  echo "Nothing to stop (.run directory not found)."
  exit 0
fi

for pidfile in .run/*.pid; do
  [ -e "$pidfile" ] || continue
  name=$(basename "$pidfile" .pid)
  pid=$(cat "$pidfile")
  if kill "$pid" 2>/dev/null; then
    echo "Stopped $name (pid $pid)"
  fi
  rm -f "$pidfile"
done

echo "All Antares services stopped."
