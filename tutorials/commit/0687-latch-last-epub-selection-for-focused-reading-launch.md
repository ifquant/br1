# 0687 Latch the last EPUB selection for focused-reading launch

## Why

`readingMode.ts` already prefers `selection.text` and labels that path as `当前选区`, but EPUB paragraph-focus launch still had a route-boundary gap once the live Foliate selection disappeared. The smoke evidence for this slice reproduces the header-menu focus-clear path: the menu steals focus from the Foliate iframe, clears the live DOM selection, and leaves `currentReaderSelection` empty just before the route launches paragraph focus. Without a route-owned fallback, that launch would fall back to the preview-owned `当前章节正文` path even though the reader had explicitly selected text a moment earlier.

## What changed

- added a pure `resolveReaderFocusedReadingLaunchSelection(...)` helper in `src/lib/reader/maturityMode.ts`
- narrowed that helper so the latched fallback only runs for EPUB paragraph-focus launches through the shared route handler after the live selection has already vanished; other formats still rely on the live selection or ordinary preview fallback
- added focused helper tests in `src/lib/reader/readingMode.test.ts` that pin both the EPUB-only fallback contract and the book-switch clear boundary
- added a route-owned `lastNonEmptyReaderSelection` latch in `src/routes/reader/+page.svelte`
- updated the route to refresh that latch only from non-empty EPUB reader selections, so selection-clear events do not erase the last explicit EPUB excerpt and non-EPUB paths never start populating the latch
- reset the latch through a pure helper on book switches, with a matching unit assertion for that clear branch
- changed paragraph-focus launch input to prefer the live selection first and then the latched EPUB route selection only when that shared route-owned launch runs after the live selection is already gone
- added a Playwright smoke that reproduces the header-menu race by clearing the live Foliate selection after opening the menu and before launching paragraph focus

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec tsc -p tsconfig.json --outDir .tmp-reader-helper-tests --noEmit false && node --test ./.tmp-reader-helper-tests/src/lib/reader/readingMode.test.js && rm -rf .tmp-reader-helper-tests`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader latches the last epub selection before menu-triggered paragraph focus in web mode|reader reuses the exited epub selection-owned focused-reading excerpt on reopen in web mode|reader reuses the exited epub selection-owned focused-reading excerpt after exit, reload, and reopen in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no TTS, translation, notebook, sidebar, or broader route refactor
- no new PDF or CBZ focused-reading behavior
- no change to hidden focused-reading reopen ownership; that still comes from `focusedReadingState`, not from the new route latch
- no claim that every menu interaction preserves the browser selection itself; the fix only preserves the last explicit selection for EPUB paragraph-focus launch after the live selection has already vanished
