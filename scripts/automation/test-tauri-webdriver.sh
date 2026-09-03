#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BIN_DIR="$REPO_ROOT/node_modules/.bin"
DEV_PORT="${DEV_PORT:-1420}"
WEBDRIVER_PORT="${WEBDRIVER_PORT:-4445}"
POLL_INTERVAL="${POLL_INTERVAL:-2}"
TIMEOUT="${TIMEOUT:-120}"
APP_OPEN_ARGS="${APP_OPEN_ARGS:-}"
TAURI_MODE="${TAURI_MODE:-dev}"
ORIGINAL_HOME="${HOME:-}"
E2E_HOME="${BR1_E2E_HOME:-}"
E2E_HOME_CREATED=""

if [[ -z "$E2E_HOME" ]]; then
  E2E_HOME="$(mktemp -d "${TMPDIR:-/tmp}/br1-webdriver-home.XXXXXX")"
  E2E_HOME_CREATED="1"
fi

export CARGO_HOME="${CARGO_HOME:-$ORIGINAL_HOME/.cargo}"
export RUSTUP_HOME="${RUSTUP_HOME:-$ORIGINAL_HOME/.rustup}"
export HOME="$E2E_HOME"

if [[ "$TAURI_MODE" != "dev" && "$TAURI_MODE" != "packaged" ]]; then
  echo "ERROR: TAURI_MODE must be 'dev' or 'packaged'." >&2
  exit 1
fi

if [[ "$TAURI_MODE" == "dev" && ! -x "$BIN_DIR/vite" ]]; then
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
  if [[ "$TAURI_MODE" == "dev" ]]; then
    lsof -ti :"$DEV_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  fi

  if [[ -n "$E2E_HOME_CREATED" ]]; then
    rm -rf "$E2E_HOME"
  fi
}

trap cleanup EXIT INT TERM

cd "$REPO_ROOT"

READEST_BOOKS_DIR="$HOME/Library/Application Support/com.bilingify.readest/Readest/Books"
mkdir -p "$READEST_BOOKS_DIR/br1-readest-fixture"
cp "$REPO_ROOT/static/samples/sample-book.epub" "$READEST_BOOKS_DIR/br1-readest-fixture/sample-book.epub"
cat > "$READEST_BOOKS_DIR/br1-readest-fixture/config.json" <<'JSON'
{
  "location": "epubcfi(/6/4!/4/2/2[introduction],/4/1:0,/4/1:20)"
}
JSON
cat > "$READEST_BOOKS_DIR/library.json" <<'JSON'
[
  {
    "hash": "br1-readest-fixture",
    "format": "epub",
    "title": "Readest Fixture Book",
    "author": "Readest Fixture Author",
    "metadata": {
      "description": "Seeded by the br1 WebDriver harness.",
      "publisher": "Bridge Reader Lab",
      "language": "en"
    },
    "createdAt": 1770000000000,
    "downloadedAt": 1770000000000,
    "progress": [1, 4]
  }
]
JSON

if [[ "$TAURI_MODE" == "packaged" ]]; then
  echo "Building packaged Tauri app with webdriver..."
  HOME="$ORIGINAL_HOME" "$BIN_DIR/tauri" build --debug --features webdriver --bundles app
  TAURI_CMD=("$REPO_ROOT/src-tauri/target/debug/bundle/macos/br1.app/Contents/MacOS/br1")
else
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

  TAURI_CMD=("$BIN_DIR/tauri" dev --features webdriver --no-watch --config '{"build":{"beforeDevCommand":""}}')
fi

echo "Starting Tauri with webdriver..."
if [[ -n "$APP_OPEN_ARGS" ]]; then
  # shellcheck disable=SC2206
  EXTRA_APP_ARGS=($APP_OPEN_ARGS)
  if [[ "$TAURI_MODE" == "packaged" ]]; then
    TAURI_CMD+=("${EXTRA_APP_ARGS[@]}")
  else
    # `tauri dev` needs both separators before arguments reach the app binary.
    TAURI_CMD+=("--" "--" "${EXTRA_APP_ARGS[@]}")
  fi
fi
"${TAURI_CMD[@]}" &
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

if [[ "$#" -gt 0 ]]; then
  echo "Running WebDriver test command: $*"
  "$@"
fi
