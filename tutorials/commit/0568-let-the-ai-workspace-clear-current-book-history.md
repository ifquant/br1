# 0568 Let The AI Workspace Clear Current-Book History

## Why this commit exists

By `0567`, the AI workspace could already restore the current book’s archived history and even reopen the specific record the reader had been reviewing. But one basic notebook operation was still missing: the reader had no explicit way to clear that archived lane when it was no longer useful.

This commit adds that operation in the narrowest product-safe form:

- clear only the current book’s assistance history
- clear only the active notebook mode (`查找` or `翻译`)
- keep provider/backend behavior untouched

While implementing that flow, this slice also fixes a real correctness problem in the route’s assistance persistence wiring: the reactive persistence blocks were not explicitly dependent on `assistanceHistory` and `assistanceSelection`, so clearing those lanes did not reliably write the new state back to local storage.

## What changed

### 1. Add mode-scoped clear actions to the shared AI workspace

In [`src/lib/components/reader/ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte):

- `最近求助` now exposes `清除本书求助记录`
- `最近翻译` now exposes `清除本书翻译记录`

These actions stay inside the history lane they affect, so the notebook surface explains its own cleanup behavior instead of burying it in some outer settings area.

### 2. Route the clear action through reader-owned state

In [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte):

- the route now clears only the selected mode’s history entries
- the matching archived selection id is cleared at the same time
- notebook and sidebar assistant surfaces both reuse the same route-owned action

That keeps one source of truth for history cleanup instead of giving notebook and sidebar separate local semantics.

### 3. Fix assistance persistence reactivity

The route already had `persistAssistanceHistory()` and `persistAssistanceSelection()` helpers, but their reactive wrappers did not explicitly depend on the state they were supposed to watch.

This commit changes those reactive statements so they now explicitly depend on:

- `assistanceHistory`
- `assistanceHistoryStorageKey`
- `assistanceSelection`
- `assistanceSelectionStorageKey`

Without this fix, the UI could look cleared while local storage still kept stale archived history.

### 4. Add a focused clear-history smoke

In [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts), the new regression:

- seeds a current-book AI history entry
- opens the AI workspace
- clears the current book’s lookup history lane
- verifies the empty state
- verifies the persisted history payload becomes `[]`

This keeps the slice anchored to real notebook behavior instead of only internal state expectations.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can clear current-book ai history in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no cross-book clear/archive controls
- no provider/backend changes
- no global “clear all AI history” control
