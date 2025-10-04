#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

MODULE_ADDRESS="${1:-${APTOS_MODULE_ADDRESS:-}}"
if [[ -z "${MODULE_ADDRESS}" ]]; then
  if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    MODULE_ADDRESS=$(grep -E '^VITE_APTOS_CONTRACT_ADDRESS=' "${PROJECT_ROOT}/.env" | tail -n 1 | cut -d '=' -f 2-)
  fi
fi

if [[ -z "${MODULE_ADDRESS}" ]]; then
  echo "Error: module address not provided."
  echo "Usage: ${0##*/} <module-address>"
  echo "   or set APTOS_MODULE_ADDRESS or VITE_APTOS_CONTRACT_ADDRESS in .env"
  exit 1
fi

API_URL="${APTOS_DEVNET_API:-https://api.devnet.aptoslabs.com/v1}"
PROFILE="${APTOS_PROFILE:-devnet}"
CONFIG_PATH="${APTOS_CONFIG_PATH:-${HOME}/.aptos/config.yaml}"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  cat <<EOF
❌ Unable to locate Aptos CLI config at ${CONFIG_PATH}.
Run \`aptos init --profile ${PROFILE}\` (or set APTOS_CONFIG_PATH) so the CLI knows which account to publish with.
Aborting publish.
EOF
  exit 1
fi

MODULE_ENDPOINT="${API_URL}/accounts/${MODULE_ADDRESS}/module/game"

if curl -fsS "${MODULE_ENDPOINT}" >/dev/null 2>&1; then
  echo "✅ Aptos module already deployed at ${MODULE_ADDRESS}."
  exit 0
fi

echo "⚠️ Module not found at ${MODULE_ADDRESS}; publishing to devnet..."

set +e
aptos move publish \
  --assume-yes \
  --profile "${PROFILE}" \
  --package-dir "${PROJECT_ROOT}/contracts" \
  --named-addresses cash_trading_game="${MODULE_ADDRESS}"

STATUS=$?
set -e

if [[ ${STATUS} -ne 0 ]]; then
  echo "❌ Publication failed (exit code ${STATUS}). See Aptos CLI output above."
  exit ${STATUS}
fi

echo "🚀 Publication complete."
