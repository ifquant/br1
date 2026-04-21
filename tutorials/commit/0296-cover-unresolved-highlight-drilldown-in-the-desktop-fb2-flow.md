# 0296 - Cover unresolved highlight drilldown in the desktop FB2 flow

## Why this change exists

The imported saved-set unresolved drilldown already had web `TXT` coverage and a real desktop `EPUB` path. `FB2` is also part of the foliate-backed secondary-format lane, so the annotation parity audit needed evidence that unresolved imported highlight snapshots remain visible outside the main EPUB path.

This slice does not add new runtime behavior. It extends the existing desktop FB2 annotation regression so the same product contract is covered in a secondary reflowable format.

## What changed

- The focused FB2 desktop annotation regression now exports a saved highlight selection, imports a synthetic foreign-book payload with one matched and one intentionally missing snapshot, and asserts the imported card shows source provenance plus the `未映射片段` drilldown text.
- The temporary imported saved set is deleted before the rest of the existing FB2 cleanup flow continues, so the test still validates the original save/apply/delete path.
- The FB2 test now clears persisted highlights workspace state before seeding notes and saved sets, and its saved-set cleanup checks actual saved-set cards instead of being confused by import notices.
- The parity audit now records unresolved drilldown evidence as web `TXT` plus desktop `EPUB` plus desktop `FB2`.

## Verification

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"` (PASS)

## Notes for future agents

- Do not treat panel-wide text as saved-set state when import notices are visible. Inspect `.saved-highlight-selection-card` text when proving a saved set was removed.
- If a focused desktop regression creates persistent reader workspace state, make the setup resilient to previous failed runs before adding more assertions.
