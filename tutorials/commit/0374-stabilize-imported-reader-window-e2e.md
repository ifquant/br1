# 0374 - Stabilize Imported Reader Window E2E

This slice makes the reader-window smoke test independent from whatever library
state is left in the desktop app data directory.

## What changed

- The WebDriver test now imports `static/samples/sample-book.txt` through the
  same trusted import helper used by the Tauri trust-boundary tests.
- The test waits for the imported managed-library path to appear on the shelf
  before clicking the reader link.
- The assertion now verifies that the opened link points at the imported
  managed file path, instead of accepting any first shelf item from persisted
  state.
- Reader-window helpers now tolerate the localized reader footer, return-to-
  library button, next-page button, and progress slider labels.
- Format sample tests clear persisted reader settings before asserting the
  default layout mode, so a previous manual run cannot leave the app in scrolled
  mode and break PAGINATED expectations.
- Restore-progress coverage no longer tries to advance a one-page CBZ that is
  already at 100%.

## Why this matters

The old test assumed at least one shelf book already existed. That made the
result depend on local app state and on whether an earlier failed run had left
or removed records. Importing a fixture inside the test keeps the coverage on
the real library-card click flow while making the setup explicit and repeatable.

## Verification

- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep trusted` passed.
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "opens FB2"` passed the trusted-reader, multi-format open, and multi-format restore specs; the command still failed on the unrelated PDF restore spec because the script receives `opens` as the effective grep and includes `reopens a library-file pdf...`.
- `pnpm check` passed.
- `git diff --check` passed.
