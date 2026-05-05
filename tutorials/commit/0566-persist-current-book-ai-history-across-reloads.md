# 0566 Persist Current-Book AI History Across Reloads

## Why this commit exists

By `0565`, the AI workspace could already keep a current-book history lane and let the reader inspect archived records. But that lane still vanished whenever the reader route reloaded, which meant the notebook behavior stopped at the lifetime of one mounted page.

This commit closes that gap in the narrowest useful way: persist only the current book’s assistance history lane, and restore it when the same book is opened again. It does not turn the assistant into a global archive or a backend conversation system.

## What changed

### 1. Add explicit assistance-history serialization helpers

In [`src/lib/reader/assistance.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts):

- `READER_ASSISTANCE_HISTORY_LIMIT` is now an explicit shared constant
- `serializeReaderAssistanceHistory(...)` writes a sorted bounded history payload
- `parseReaderAssistanceHistory(...)` restores only valid entries and drops malformed records

This keeps persistence logic out of the route and makes the storage boundary testable.

### 2. Persist history per `readerBookKey`

In [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte):

- assistance history now uses a per-book storage key: `br1.reader.assistance.history:${readerBookKey}`
- when the active book changes, the route restores stored history for that book instead of blindly clearing the lane
- when the history lane changes, the route writes the bounded serialized payload back to local storage
- malformed stored payloads are ignored and removed instead of poisoning the reader route

This means the notebook remembers assistance activity for the current book, but does not quietly expand into a shared cross-book archive.

### 3. Add a focused restore smoke

In [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts), the new regression:

- seeds local storage for the sample EPUB’s assistance-history key
- opens the reader
- verifies the notebook restores the saved history entry
- verifies `查看记录` can still open the archived result body

That keeps this slice tied to real user-facing behavior instead of only helper tests.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores ai workspace history for the current book in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no persistence of the currently selected archived record inside the result panel
- no cross-book AI archive or global notebook history
- no provider, prompt, or backend behavior changes
