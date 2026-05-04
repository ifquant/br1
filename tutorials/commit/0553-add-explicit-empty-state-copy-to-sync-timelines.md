# 0553 Add Explicit Empty-State Copy To Sync Timelines

## Why this change exists

After `0552`, the reader sync workspace had compact per-panel timelines, but a first-open session still had one product gap: if no current-book export or whole-library sync had happened yet, each timeline area was just blank.

That is technically correct, but poor product behavior. A blank panel forces users to guess:

- is the timeline supposed to be empty?
- did something fail to render?
- do I need to trigger a sync first?

The workspace should answer those questions directly.

## What changed

### 1. Current-book timeline now has initial-state copy

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) now renders a muted timeline card when there has not been any current-book export yet.

The copy explains that:

- no current-book export has happened yet
- once the user exports a managed-library book on desktop, the latest result will appear here

This turns “empty because nothing happened” into a readable state.

### 2. Whole-library timeline now has initial-state copy

The same component now renders a corresponding muted card for the whole-library lane when there has not yet been:

- an exchange import
- a KOReader remote push
- a KOReader remote pull

That keeps the current-book lane and the library lane consistent with each other.

### 3. The smoke now locks both empty states

[`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) now asserts the two empty-state messages in web mode.

This matters because empty states are easy to accidentally regress when the component grows. The test now treats them as part of the intended product contract.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new sync actions
- sync history persistence
- remote probing before the first sync action
- any trust-boundary change between renderer and Tauri
