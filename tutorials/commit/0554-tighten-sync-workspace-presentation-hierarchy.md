# 0554 Tighten Sync Workspace Presentation Hierarchy

## Why this change exists

After `0553`, the sync workspace had correct state and explicit empty-state copy, but the presentation hierarchy still had one remaining problem: readiness lived inside each panel, while some recent status details still lived as detached summary cards outside the panels.

That made the workspace readable, but not tight.

The user reads this surface as two scopes:

- current-book sync
- whole-library sync

Each scope should be able to explain both:

- what is ready right now
- what most recently happened here

without sending the eye to a separate result area.

## What changed

### 1. Detached result cards are fully absorbed into the panel timelines

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) now keeps the latest export/import/remote result details entirely inside:

- `当前图书同步状态时间线`
- `整库同步状态时间线`

That means the bottom-of-workspace result stack is gone.

### 2. Each panel now reads as one coherent lane

The current-book lane now holds:

- current-book readiness
- most recent export action or export result
- empty-state copy when nothing has happened yet

The whole-library lane now holds:

- whole-library readiness
- most recent import or remote action/result
- empty-state copy when nothing has happened yet

This makes the layout more deliberate and easier to scan.

### 3. State ownership did not move

This is still a presentation-only refactor.

The route continues to own:

- readiness signals
- last action state
- import results
- remote sync results

The component just derives a tighter visual hierarchy from the same inputs.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new sync actions or new KOReader protocols
- persistent timeline history
- changes to Tauri trust boundaries
