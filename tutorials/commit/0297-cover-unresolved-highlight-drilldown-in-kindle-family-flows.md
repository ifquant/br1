# 0297 - Cover unresolved highlight drilldown in Kindle-family flows

## Why this change exists

The unresolved saved-set drilldown now had evidence in web `TXT`, desktop `EPUB`, and desktop `FB2`. The remaining foliate-backed secondary formats in the focused annotation matrix were `MOBI` and `AZW3`, so the next adjacent parity slice was to prove the same imported saved-set review behavior in those Kindle-family reader windows.

This keeps the work in P0 annotation/productization territory. It does not add a new feature surface.

## What changed

- The `MOBI/AZW3` focused desktop annotation regression now clears persisted highlights workspace state before seeding each format.
- After reopening the saved selection set, the test exports it, imports a synthetic foreign-book payload with one unmatched highlight snapshot, and asserts the imported card shows source provenance plus the `未映射片段` drilldown text.
- The temporary imported saved set is deleted before continuing the existing apply/delete/invert/bulk-delete cleanup path.
- Saved-set deletion assertions now inspect `.saved-highlight-selection-card` text instead of broad panel text, because import notices can legitimately mention the deleted saved-set name.
- The parity audit now records unresolved drilldown evidence across web `TXT`, desktop `EPUB`, desktop `FB2`, and desktop `MOBI/AZW3`.

## Verification

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"` (PASS after one transient AZW3 hydrate/window failure on the first run)

## Notes for future agents

- The first focused run failed before the new assertions while waiting for AZW3 hydration and logged a webdriver `No window could be found` error. The immediate rerun passed without code changes, so treat that as an environment/window transient unless it becomes reproducible.
- Keep imported saved-set cleanup card-scoped. Panel notices are product state, not saved-set card state.
