# 0375 - Stabilize PDF Restore E2E

This slice makes the PDF restore WebDriver coverage deterministic after the
reader chrome was localized.

## What changed

- PDF restore setup now imports `static/samples/sample-outline.pdf` and prefers
  that fixture over historical PDFs already present in the desktop library.
- Reader location assertions normalize Chinese PDF labels like `第 2 / 4 页`
  back to the stable test form `Page 2 / 4`.
- Reader menu helpers now accept the localized `更多操作` button and Chinese
  settings group labels.

## Why this matters

The previous test could pick a large real imported PDF from local app state,
which made the restore path depend on user data and window timing. It also
expected old English aria labels after the reader UI had been localized. The
test now keeps the product text localized while preserving stable internal test
assertions.

## Verification

- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "library-file pdf"` passed.
