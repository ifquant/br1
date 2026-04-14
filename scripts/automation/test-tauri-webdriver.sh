#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BIN_DIR="$REPO_ROOT/node_modules/.bin"
TEST_COMMAND="${*:-}"
DEV_PORT="${DEV_PORT:-1420}"
WEBDRIVER_PORT="${WEBDRIVER_PORT:-4445}"
POLL_INTERVAL="${POLL_INTERVAL:-2}"
TIMEOUT="${TIMEOUT:-120}"

if [[ ! -x "$BIN_DIR/vite" ]]; then
  echo "ERROR: missing local vite binary at $BIN_DIR/vite. Run pnpm install first." >&2
  exit 1
fi

if [[ ! -x "$BIN_DIR/tauri" ]]; then
  echo "ERROR: missing local tauri binary at $BIN_DIR/tauri. Run pnpm install first." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${TAURI_PID:-}" ]]; then
    pkill -P "$TAURI_PID" 2>/dev/null || true
    kill "$TAURI_PID" 2>/dev/null || true
    wait "$TAURI_PID" 2>/dev/null || true
  fi

  if [[ -n "${DEV_PID:-}" ]]; then
    pkill -P "$DEV_PID" 2>/dev/null || true
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi

  lsof -ti :"$WEBDRIVER_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  lsof -ti :"$DEV_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
}

trap cleanup EXIT INT TERM

cd "$REPO_ROOT"

echo "Starting Vite dev server on port $DEV_PORT..."
"$BIN_DIR/vite" dev --host 127.0.0.1 --port "$DEV_PORT" &
DEV_PID=$!

echo "Waiting for dev server..."
elapsed=0
while ! curl -sf "http://127.0.0.1:${DEV_PORT}" >/dev/null 2>&1; do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "ERROR: Vite dev server exited unexpectedly." >&2
    exit 1
  fi
  if (( elapsed >= TIMEOUT )); then
    echo "ERROR: Timed out waiting for dev server on port $DEV_PORT." >&2
    exit 1
  fi
  sleep "$POLL_INTERVAL"
  (( elapsed += POLL_INTERVAL ))
done

echo "Starting Tauri with webdriver..."
"$BIN_DIR/tauri" dev --features webdriver --no-watch --config '{"build":{"beforeDevCommand":""}}' &
TAURI_PID=$!

echo "Waiting for WebDriver server on port $WEBDRIVER_PORT..."
elapsed=0
while ! curl -sf "http://127.0.0.1:${WEBDRIVER_PORT}/status" >/dev/null 2>&1; do
  if ! kill -0 "$TAURI_PID" 2>/dev/null; then
    echo "ERROR: Tauri exited before WebDriver became ready." >&2
    exit 1
  fi
  if (( elapsed >= TIMEOUT )); then
    echo "ERROR: Timed out waiting for WebDriver on port $WEBDRIVER_PORT." >&2
    exit 1
  fi
  sleep "$POLL_INTERVAL"
  (( elapsed += POLL_INTERVAL ))
done

echo "PASS: WebDriver is ready on port $WEBDRIVER_PORT"

if [[ -n "$TEST_COMMAND" ]]; then
  echo "Running WebDriver test command: $TEST_COMMAND"
  eval "$TEST_COMMAND"
fi
