#!/usr/bin/env bash
set -euo pipefail

ROLE="${1:-coder}"   # coder | reviewer

# Ensure zsh login env (NVM, npm global bin, etc.) is loaded
if [ -f "$HOME/.zprofile" ]; then . "$HOME/.zprofile"; fi
if [ -f "$HOME/.zshrc" ];    then . "$HOME/.zshrc";    fi

# Try to find claude in common places
CLAUDE_BIN=""
try_paths=()

# whatever the shell knows
if command -v claude >/dev/null 2>&1; then
  CLAUDE_BIN="$(command -v claude)"
fi

# Add common locations to search
try_paths+=("$CLAUDE_BIN")
try_paths+=("$(npm bin -g 2>/dev/null)/claude")
try_paths+=("$HOME/.nvm/versions/node/$(node -v 2>/dev/null | sed 's/v//')/bin/claude")
try_paths+=("/opt/homebrew/bin/claude")
try_paths+=("/usr/local/bin/claude")

for p in "${try_paths[@]}"; do
  if [ -n "${p:-}" ] && [ -x "$p" ]; then
    CLAUDE_BIN="$p"
    break
  fi
done

# If not found, install the official CLI globally
if [ -z "${CLAUDE_BIN}" ] || [ ! -x "${CLAUDE_BIN}" ]; then
  echo "[find_claude] Installing @anthropic-ai/claude-dev globally via npm..."
  npm i -g @anthropic-ai/claude-dev
  CLAUDE_BIN="$(npm bin -g)/claude"
fi

# Rename pane (best-effort)
if command -v zellij >/dev/null 2>&1; then
  zellij action rename-pane "$ROLE" || true
fi

# Ensure logs dir
mkdir -p logs

# Prefer the Code REPL if available
exec "${CLAUDE_BIN}" code 2>&1 | tee -a "logs/${ROLE}.log"
