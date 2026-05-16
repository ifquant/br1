# 0664 Extract Reader Sidebar Saved Highlight Helpers

## Goal

Move the pure cross-book saved-highlight helper logic out of `ReaderSidebar.svelte` and into `src/lib/reader/sidebarHighlightSelections.ts` without moving state ownership or changing the rendered saved-selection workspace.

## Baseline

- `ReaderSidebar.svelte` before this slice: `1512` lines

## What Changed

- moved saved-highlight refresh outcome labels/details into `sidebarHighlightSelections.ts`
- moved export payload validation/parsing, imported-name generation, existing imported-selection lookup, and imported highlight matching into `sidebarHighlightSelections.ts`
- moved import-preview, import-source, single-refresh, and refresh-all summary shaping into `sidebarHighlightSelections.ts`
- kept `savedHighlightSelections`, import/export notices, import previews, selection ids, persistence/hydration, and action entrypoints in `ReaderSidebar.svelte`
- added a focused Playwright smoke that exports a real TXT saved-highlight set, imports it as a cross-book payload, imports matched highlights, and refreshes the imported mapping

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader saved-highlight helper flows stay legible in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1261`)

## Result

- `ReaderSidebar.svelte` after this slice: `1261` lines
- net reduction: `251` lines

## Not Included

- no move of saved-highlight persistence/hydration ownership
- no move of parent-owned state fields, notices, import previews, selection ids, or action entrypoints
- no change to active-tab routing or the `ReaderSidebarHighlightSelections.svelte` slot contract
