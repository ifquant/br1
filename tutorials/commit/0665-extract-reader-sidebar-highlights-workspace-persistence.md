# 0665 Extract Reader Sidebar Highlights Workspace Persistence

## Goal

Move pure highlights workspace persistence helpers out of `ReaderSidebar.svelte` while keeping the sidebar as the actual owner of mutable state and IO effects.

## Baseline

- `ReaderSidebar.svelte` before this slice: `1261` lines

## What Changed

- added `src/lib/reader/sidebarHighlightsWorkspace.ts`
- moved default workspace state creation into the helper
- moved persisted payload normalization and saved-selection validation into the helper
- moved local persistence payload shaping into the helper
- kept `ReaderSidebar.svelte` responsible for mutable fields, async load/save effect wiring, token race guards, service/localStorage IO branches, active-tab routing, and child mounting
- added a focused Playwright smoke that persists highlight sort, selected-filter state, selected ids, and a saved highlight set across reload

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader highlights workspace persistence stays legible in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1194`)

## Result

- `ReaderSidebar.svelte` after this slice: `1194` lines
- net reduction: `67` lines

## Not Included

- no move of sidebar mutable state fields
- no move of async load/save effects, service persistence, localStorage persistence, or race-token ownership
- no change to active-tab routing or saved-highlight child contracts
