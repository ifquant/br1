#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SAMPLE_PDF_PATH="$REPO_ROOT/static/samples/jbig2-symbol-offset.pdf"

TAURI_MODE=packaged \
APP_OPEN_ARGS="$SAMPLE_PDF_PATH" \
BR1_TEST_PACKAGED_JBIG2_PATH="$SAMPLE_PDF_PATH" \
bash "$SCRIPT_DIR/test-tauri-webdriver.sh" \
  pnpm exec wdio run wdio.conf.ts \
  --mochaOpts.grep "renders a packaged startup JBIG2 PDF"
