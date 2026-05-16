# 0666 Extract Reader Route Maturity Book Restore

## Why

`src/routes/reader/+page.svelte` still owned the right side effects for per-book restore, but the actual maturity reset bundle on book switch had become too easy to misread: TTS ownership restore, translation config restore, inline translation reset, annotation popup clearing, and focused-reading reset were all being reassembled inline.

This slice moves that plain-data shaping into `src/lib/reader/maturityMode.ts` so the route can stay the owner of storage IO and runtime timing without also being the second home for restore-policy details.

## Baseline

- `src/routes/reader/+page.svelte` line count before this slice: `2880`
- `src/routes/reader/+page.svelte` line count after this slice: `2877`

The route stays large because it still owns side effects, but the book-switch restore contract is now explicit and testable instead of being spread across a long reactive block.

## What moved

- current-book maturity restore now goes through `resolveReaderMaturityBookRestoreState(...)`
  - this returns the plain restored TTS ownership fields, translation ownership/config result, inline translation reset state, selection clearing result, and focused-reading reset state that the route should apply after loading per-book storage
- dedicated translation archive precedence during restore still comes from the existing translation restore contract
  - this slice reuses that rule instead of duplicating it inside `+page.svelte`, and normalizes the helper's ESM import path so the Node-based helper test harness can execute it directly
- annotation selection clearing on book switch is now part of the same restore bundle
  - the route still owns when restore happens; the helper owns what stale UI state must be cleared

## What intentionally stayed route-owned

- `localStorage` reads and writes
- `ttsController.stop()` and the live speaking/paused guard
- reactive timing for when the restore block runs
- assignment into route-local state and the `lastRestored*BookKey` guards

This boundary is deliberate. The route still owns side effects and sequencing; the helper only decides the restored/reset state shape.

## Helper coverage

`src/lib/reader/maturityMode.test.ts` now also covers:

- book restore clears book-scoped transient maturity surfaces
- book restore lets dedicated translation route archive precedence win

That keeps the new helper honest without turning the route test surface into another giant integration-only contract.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
