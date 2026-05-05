# 0567 Persist The Selected Archived AI Record

## Why this commit exists

`0566` made the current book’s AI history lane durable across reloads, but it still restarted in a partially amnesiac state: the history list came back, yet the specific archived record the reader had been reviewing did not. After reload, the notebook remembered the lane, but forgot which note-like AI artifact was open.

This commit closes that gap in the narrowest useful way. It persists the selected archived assistance record for the current book, without turning the AI workspace into a cross-book archive or backend conversation system.

## What changed

### 1. Add explicit assistance-selection serialization helpers

In [`src/lib/reader/assistance.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts) this commit adds:

- `ReaderAssistanceWorkspaceSelection`
- `createEmptyReaderAssistanceWorkspaceSelection(...)`
- `serializeReaderAssistanceWorkspaceSelection(...)`
- `parseReaderAssistanceWorkspaceSelection(...)`

That keeps selection persistence separate from history persistence instead of mixing the two concerns in the route.

### 2. Lift archived-record selection into the route

Before this commit, [`ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte) owned its own selected archived record id. That made review state impossible to share cleanly between the notebook and the sidebar, and impossible to persist at the route level without duplicating component-local behavior.

Now the selection is controlled from [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte):

- lookup and translation selections are stored separately
- the route persists them under a per-book storage key
- the workspace receives the current selection as props and reports changes upward

This keeps the shared AI workspace under one reader-owned state model.

### 3. Restore the selected archived record after reload

On reopening the same book:

- the route restores the per-book assistance history lane
- it also restores the per-book archived selection payload
- the AI workspace can therefore reopen directly into the same archived result the reader was reviewing

That makes the notebook feel meaningfully more durable, instead of restoring only the surrounding list.

### 4. Add a focused restore regression

In [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts), the new smoke:

- seeds local storage with both history and archived-selection state
- opens the sample EPUB
- opens the AI workspace
- verifies the saved selection is already active and its archived result body is visible

So this slice is covered as a real notebook restore behavior, not only as a helper contract.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected ai history record for the current book in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no cross-book thread continuity
- no persistence of live provider request state beyond the selected archived record id
- no backend/provider changes
