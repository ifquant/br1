# 0662 Extract Reader Sidebar Assist Presentation

## Goal

Shrink `ReaderSidebar.svelte` one more step by moving the sidebar assist host into a dedicated presentation child without changing who owns tab routing or assistance history.

## Baseline

- `ReaderSidebar.svelte` before this slice: `1663` lines

## What Changed

- added `src/lib/components/reader/ReaderSidebarAssist.svelte` as a thin presentation host for the sidebar `assist` tab
- rewired `src/lib/components/reader/ReaderSidebar.svelte` to mount the new child only for `activeTab === 'assist'` while keeping the active-tab switch and assistance-history callbacks in the parent
- added a focused Playwright smoke that proves the sidebar `查找` tab still opens the expected assist panel and shared workspace content in web mode

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader sidebar assist workspace stays legible in web mode"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1658`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Result

- `ReaderSidebar.svelte` after this slice: `1658` lines
- net reduction: `5` lines

## Not Included

- no change to `ReaderAssistWorkspace.svelte`; the shared workspace surface still owns its own local assist-lane presentation details
- no change to sidebar tab ownership, assistance-history restore semantics, or notebook/assist route coordination
