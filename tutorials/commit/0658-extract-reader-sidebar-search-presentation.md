# 0658 Extract Reader Sidebar Search Presentation

## Goal

Shrink `ReaderSidebar.svelte` again without changing search behavior by moving the entire search-tab presentation into a dedicated child component while keeping controller/state ownership in the parent.

## Baseline

- `ReaderSidebar.svelte` before this slice: `2980` lines

## What Changed

- added `src/lib/components/reader/ReaderSidebarSearch.svelte` for the search field, search options, cache/history cards, result navigation, result list, and their search-specific CSS
- rewired `src/lib/components/reader/ReaderSidebar.svelte` to pass the existing search state, derived summary/index values, formatters, and explicit callbacks into the child instead of rendering the tab inline
- kept `searchHistoryFilter`, search summary derivation, result index derivation, and the live `searchController` callback wiring in `ReaderSidebar.svelte` so cache clearing, history replay, and result navigation still have one owner

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader search states read like one product surface across txt and epub"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`2448`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Result

- `ReaderSidebar.svelte` after this slice: `2448` lines
- net reduction: `532` lines

## Not Included

- no search-controller refactor; the child only renders the existing search model and emits explicit callbacks
- no new search behavior, copy changes, or format-capability semantics beyond preserving the existing tab surface
