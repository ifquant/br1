# 0555 Move Sync Actions Into Their Owning Panels

## Why this change exists

By `0554`, the sync workspace hierarchy was much cleaner, but one layout problem remained: the action buttons still lived in a shared bottom row even though the rest of the workspace had already been split into two independent lanes:

- current-book sync
- whole-library sync

That meant the user could read the workspace as two separate surfaces, but still had to drop down into one mixed control strip to act.

This slice fixes that mismatch.

## What changed

### 1. Current-book export now lives inside the current-book panel

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) now renders the export button inside the `当前图书` panel, right below readiness and timeline state.

That keeps the action next to the state that explains whether the action is available.

### 2. Whole-library actions now live inside the whole-library panel

The same component now renders:

- exchange import
- KOReader remote push
- KOReader remote pull

inside the `整库同步` panel instead of in a single bottom action strip.

This gives the whole-library lane one continuous flow:

- readiness
- timeline
- actions

### 3. Narrow-width stacking is cleaner

The action area now uses a layout that stacks more predictably on narrow widths:

- current-book keeps one focused export action
- whole-library actions use a grid that collapses to one column on smaller widths

This does not change any behavior, but it makes the workspace feel less cramped and less “toolbar-like”.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new sync commands
- new KOReader protocol support
- desktop/mobile route restructuring outside the sync workspace itself
