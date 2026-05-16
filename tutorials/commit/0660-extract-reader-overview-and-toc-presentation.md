# 0660 Extract Reader Overview And TOC Presentation

## Goal

Shrink `ReaderSidebar.svelte` again without moving sidebar ownership by pulling the book overview card, overflow menu, and TOC preview into a dedicated presentation child.

## Baseline

- `ReaderSidebar.svelte` before this slice: `2162` lines

## What Changed

- added `src/lib/components/reader/ReaderSidebarOverview.svelte` for the current-book overview card, local more-actions menu, and TOC preview list
- rewired `src/lib/components/reader/ReaderSidebar.svelte` to mount the overview child only for the `toc` tab while keeping tab routing, sidebar shell controls, and other workspace branches in the parent
- moved the book-menu local UI state and overview/TOC-specific styles out of `ReaderSidebar.svelte` so the parent no longer carries view-only menu state for that surface

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader keeps the overview sidebar surface legible in web mode"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1866`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Result

- `ReaderSidebar.svelte` after this slice: `1866` lines
- net reduction: `296` lines

## Not Included

- no sidebar shell or tab-host refactor; `ReaderSidebar.svelte` still owns active-tab routing and top-level sidebar controls
- no broader metadata or route-label semantics certification; this slice only proves the overview surface stays visible and that clicking a non-active TOC entry can still activate it after the extraction
