# 0687 Latch the last EPUB selection for focused-reading launch

## Why

`readingMode.ts` already prefers `selection.text` and labels that path as `当前选区`, but the first-open EPUB flow still had a route-boundary race. When the reader opened paragraph focus from the header menu, the menu interaction could steal focus from the Foliate iframe, clear the live DOM selection, and leave `currentReaderSelection` empty just before the route called `startReaderParagraphFocus(...)`. That made the first open fall back to the preview-owned `当前章节正文` path even though the reader had explicitly selected text a moment earlier.

## What changed

- added a pure `resolveReaderFocusedReadingLaunchSelection(...)` helper in `src/lib/reader/maturityMode.ts`
- added a focused helper test in `src/lib/reader/readingMode.test.ts` that pins the route-owned fallback contract when the live EPUB selection has already cleared
- added a route-owned `lastNonEmptyReaderSelection` latch in `src/routes/reader/+page.svelte`
- updated the route to refresh that latch only from non-empty reader selections, so selection-clear events do not erase the last explicit EPUB excerpt
- reset the latch on book switches so selection state cannot leak across books or hidden-resume reopen boundaries
- changed focused-reading launch input to prefer the live selection first and then the latched route selection only for first-open launch
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
- no claim that every menu interaction preserves the browser selection itself; the fix only preserves the last explicit selection for focused-reading launch
