#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

ROLE="${1:-bridge}"
mkdir -p logs bridge/panes

case "$ROLE" in
  bridge)    exec python3 ./bridge/bridge.py ;;
  coder)     exec script -q logs/coder.log claude ;;
  reviewer)  exec script -q logs/reviewer.log claude ;;
  *) echo "Unknown role: $ROLE" >&2; exit 1 ;;
esac
