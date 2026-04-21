# 0317 - Keep Bulk Repair Results In The Queue

This slice keeps the last bulk-repair result visible inside the `待修复书籍` queue after the global notice is shown. The repair queue should behave like a management surface, not only a transient action launcher.

## What Changed

- Added an optional `operationSummary` prop to `ContinueReadingShelf`.
- Stored the latest bulk-repair outcome in the library page.
- Rendered successful, no-op, and failed bulk-repair summaries inside the repair queue.
- Extended the desktop bulk-repair regression to verify that the queue keeps the post-action result.

## Implementation Notes

The shelf component still does not know repair semantics. It receives a plain display string and renders it as a queue-local operation summary. The library page owns the exact wording because it already owns the bulk-repair counts and failure handling.

The queue-local summary complements the global notice. The notice is useful for immediate feedback, while the queue summary remains attached to the broken-file management area after the user continues scanning the library.

## Verification

- `pnpm check` (PASS)
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "bulk repairs eligible broken library copies"` (PASS)
- `git diff --check` (PASS)

## Not Included

- The operation summary is still session-local UI state.
- Durable repair queue persistence and richer conflict resolution remain deferred.
