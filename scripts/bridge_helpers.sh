#!/usr/bin/env bash
set -euo pipefail
ZJ="${ZELLIJ_BIN:-$HOME/.local/bin/zellij}"

case "${1:-}" in
  status)
    echo "== list-clients =="
    "$ZJ" action list-clients || true
    echo
    echo "== pane ids (files) =="
    for f in bridge/panes/*.id; do [ -f "$f" ] && printf "%s => %s\n" "$f" "$(cat "$f")"; done || true
    echo
    echo "== recent bridge log =="
    tail -n 50 bridge/bridge.log 2>/dev/null || true
    ;;
  kill)
    pkill -f "python3 ./bridge/bridge.py" || true
    ;;
  *)
    echo "usage: $0 {status|kill}" ;;
esac
