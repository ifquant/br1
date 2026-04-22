#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNS="${1:-20}"

if ! [[ "$RUNS" =~ ^[0-9]+$ ]] || [[ "$RUNS" -lt 1 ]]; then
  echo "ERROR: run count must be a positive integer." >&2
  exit 1
fi

for i in $(seq 1 "$RUNS"); do
  echo "=== STARTUP STRESS $i/$RUNS ==="
  bash "$SCRIPT_DIR/test-tauri-webdriver-startup-associated-open.sh"
done
