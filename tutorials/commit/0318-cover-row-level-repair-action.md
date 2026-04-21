# 0318 - Cover Row-Level Repair Action

This slice changes the single-book repair regression from a direct helper reimport into a real user-facing row action. The goal is to prove that clicking `修复副本` in the repair queue rebuilds the missing managed copy and returns the book to the normal reading workflow.

## What Changed

- Added a WebDriver helper for clicking a named action inside a specific library row.
- Updated the broken TXT repair regression to click `修复副本` instead of calling the desktop import helper directly.
- Asserted that the repaired book leaves `待修复书籍`, regains a reader link, and shows the success notice.
- Kept the existing disk-level checks for single-record repair and progress preservation.

## Why This Matters

The old regression proved that reimporting the same source could repair a broken record, but it did not prove that the visible repair queue action worked. This test now covers the actual product path users take from `待修复书籍`.

## Verification

- `pnpm check` (PASS)
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "repairs a broken local library record"` (PASS)
- `git diff --check` (PASS)

## Not Included

- Manual file-picker relink still needs separate coverage because it requires a different interaction path.
- Durable repair queue persistence and richer conflict resolution remain deferred.
