#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SAMPLE_BOOK_PATH="$REPO_ROOT/static/samples/sample-book.fb2"

APP_OPEN_ARGS="${APP_OPEN_ARGS:-$SAMPLE_BOOK_PATH}" \
BR1_TEST_ASSOCIATED_FILE_PATH="${BR1_TEST_ASSOCIATED_FILE_PATH:-$SAMPLE_BOOK_PATH}" \
bash "$SCRIPT_DIR/test-tauri-webdriver.sh" \
  pnpm exec wdio run wdio.conf.ts \
  --mochaOpts.grep "opens a startup associated book argument in a separate reader window"
