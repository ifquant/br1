# 0661 Extract Reader Sidebar Chrome

## Goal

Reduce `ReaderSidebar.svelte` again by moving the header controls and tab strip into a presentation child while keeping tab ownership and workspace routing in the parent.

## Baseline

- `ReaderSidebar.svelte` before this slice: `1862` lines

## What Changed

- added `src/lib/components/reader/ReaderSidebarChrome.svelte` for the sidebar header, pin/close controls, and tab strip
- rewired `src/lib/components/reader/ReaderSidebar.svelte` to pass explicit UI intents into the chrome child while keeping `activeTab` ownership and the tab-to-workspace switch in the parent
- moved chrome-only styles out of `ReaderSidebar.svelte` so the parent stays focused on workspace coordination and persistence-heavy branches

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader sidebar chrome keeps tab routing legible in web mode"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1663`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Result

- `ReaderSidebar.svelte` after this slice: `1663` lines
- net reduction: `199` lines

## Not Included

- no change to the actual tab owner; `ReaderSidebar.svelte` still decides which workspace branch renders for each sidebar tab
- no change to saved highlight selection persistence, cross-book import/export logic, or scroll-to-active coordination
