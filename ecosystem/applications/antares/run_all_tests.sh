#!/usr/bin/env bash
# Runs every day's test suite from a clean state and prints one summary.
# Usage: bash run_all_tests.sh   (run from the project root)

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASS=0
FAIL=0
FAILED_DAYS=()

echo "=== Day 1: Knowledge Object schema demo ==="
(cd "$ROOT_DIR/day1" && python3 day1_knowledge_object.py > /dev/null) \
  && { echo "  OK"; PASS=$((PASS+1)); } \
  || { echo "  FAILED"; FAIL=$((FAIL+1)); FAILED_DAYS+=("day1"); }

for d in day2 day3 day4 day5 day6 day7 day8 day9 day10; do
  echo "=== $d: pytest ==="
  if (cd "$ROOT_DIR/$d" && python3 -m pytest -q); then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
    FAILED_DAYS+=("$d")
  fi
done

echo ""
echo "=== SUMMARY ==="
echo "Passed: $PASS / $((PASS+FAIL))"
if [ "$FAIL" -gt 0 ]; then
  echo "Failed days: ${FAILED_DAYS[*]}"
  exit 1
fi
echo "All days passed. Ready for integration review."
