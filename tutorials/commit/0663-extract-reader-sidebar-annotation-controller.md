# 0663 Extract Reader Sidebar Annotation Controller

## Goal

Shrink `ReaderSidebar.svelte` by moving the current-book annotation controller logic into a pure helper module without changing who owns persistence, tab routing, or cross-book saved-highlight workflows.

## Baseline

- `ReaderSidebar.svelte` before this slice: `1658` lines

## What Changed

- added `src/lib/reader/sidebarAnnotations.ts` for current-book annotation derived state, group open/close rules, and highlight-selection helpers
- rewired `src/lib/components/reader/ReaderSidebar.svelte` to consume the extracted controller helpers while keeping persistence, cross-book import/export, active-tab routing, and scroll-to-active effects in the Svelte parent
- added a focused Playwright smoke that proves real annotation controller interactions still work after the extraction

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader annotation controller interactions stay legible in web mode"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1512`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Result

- `ReaderSidebar.svelte` after this slice: `1512` lines
- net reduction: `146` lines

## Not Included

- no change to cross-book saved-highlight import/export parsing, refresh summaries, or persisted workspace ownership
- no change to sidebar tab routing, scroll-to-active effects, or `ReaderSidebarAnnotations.svelte` markup contract
