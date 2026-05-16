# 0659 Extract Reader Saved Highlight Selection Presentation

## Goal

Shrink `ReaderSidebar.svelte` again without changing cross-book highlight behavior by moving the saved highlight-selection workspace into a dedicated child while leaving parsing, persistence, and remap ownership in the parent.

## Baseline

- `ReaderSidebar.svelte` before this slice: `2449` lines

## What Changed

- added `src/lib/components/reader/ReaderSidebarHighlightSelections.svelte` for the saved-selection cards, cross-book import preview, refresh summary filters, export preview, and their styling
- rewired `src/lib/components/reader/ReaderSidebar.svelte` to pass the existing saved-selection state, derived summaries, and explicit callbacks into the child instead of rendering the `highlights-extra` slot content inline
- removed the old `:global(...)` saved-selection style block from `src/lib/components/reader/ReaderSidebarAnnotations.svelte` so the saved-selection markup and CSS live under the same component owner again

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`2177`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Result

- `ReaderSidebar.svelte` after this slice: `2177` lines
- net reduction: `272` lines

## Not Included

- no changes to saved-selection import/export validation, text matching heuristics, or persisted workspace semantics
- no route-level refactor; the sidebar parent still owns all mutation logic and only delegates rendering
