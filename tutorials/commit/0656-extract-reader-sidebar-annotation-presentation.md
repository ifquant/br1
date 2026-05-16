# 0656 Extract Reader Sidebar Annotation Presentation

## Goal

Shrink `ReaderSidebar.svelte` without behavior drift by moving the bookmarks, highlights, and notes panel presentation into a dedicated child component while keeping reactive derivation, highlight-workspace persistence, and mutation helpers in the parent.

## Baseline

- `ReaderSidebar.svelte` before this slice: `4178` lines

## What Changed

- added `src/lib/components/reader/ReaderSidebarAnnotations.svelte` for the bookmarks, highlights, and notes panel markup plus their panel-specific CSS
- rewired `src/lib/components/reader/ReaderSidebar.svelte` to pass derived props and callbacks into the child while keeping ownership of filters, selection state, saved-highlight-selection logic, and localStorage hydration/persistence in the parent
- kept the saved-highlight-selection subpanel in `ReaderSidebar.svelte` through the child component's `highlights-extra` slot so cross-book import/export and refresh flows do not silently move away from their existing owner

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader supports txt notes through selection, persistence, and note reopen in web mode|reader productizes bookmarks as current reading positions in web mode"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`2980`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Result

- `ReaderSidebar.svelte` after this slice: `2980` lines
- net reduction: `1198` lines

## Not Included

- no behavioral redesign of the annotation workspace API; the child intentionally accepts a wide prop/callback surface for this narrow extraction
- no new annotation/bookmark/highlight behavior or copy changes beyond restoring exact existing strings and labels during the move
