# 0522: Repair The KOReader Locator Split Before Merge

## Why this commit exists

`P2-4.6` introduced the right semantic boundary:

- `progressLocation` is the local `br1` reopen field
- `koreaderProgressLocation` is the KOReader-facing locator field

But the final merge-gate review found that some KOReader code paths still violated that boundary:

- exchange export still read KOReader xpointer from `progressLocation`
- exchange import still wrote KOReader xpointer back through `progressLocation`
- KOReader remote pull could still overwrite local reopen CFI with the remote KOReader locator

That is not a cosmetic issue. It means the branch could still regress local reopen semantics after a KOReader import or remote sync.

This commit fixes that before merge.

## What changed

### 1. KOReader sync model helpers now respect the split

[`src/lib/sync/koreader.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.ts) now treats KOReader config xpointer as a `koreaderProgressLocation` concern.

That means:

- `createKoReaderReadingStateSyncRecord(...)` preserves the existing local `progressLocation`
- KOReader `config.xpointer` is written into `koreaderProgressLocation`
- `restoreKoReaderBookConfigFromSync(...)` reads `koreaderProgressLocation` first

There is still a compatibility fallback to `progressLocation` for older records, but only as a fallback.

### 2. Exchange export/import no longer route KOReader xpointer through the local reopen field

[`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts) now exports KOReader config from `book.koreaderProgressLocation ?? book.progressLocation`.

That ordering matters:

- new data uses the correct KOReader field
- older pre-split data still exports something usable

On import, the resulting reading-state record now keeps:

- local `progressLocation` unchanged
- imported KOReader locator in `koreaderProgressLocation`

### 3. Remote pull preserves the local reopen CFI

The remote-pull merge path now keeps `progressLocation` untouched and only updates `koreaderProgressLocation` when the KOReader server returns a locator-shaped progress value.

This is the critical user-facing fix. A manual KOReader pull should not silently rewrite the field that `br1` itself uses to reopen the book locally.

## Why this commit matters for merge

Without this fix, the branch still had a semantic contradiction:

- the docs said the split existed
- the reader persistence slice said the split existed
- but exchange and remote pull still violated it in practice

That would be a bad point to merge.

This commit turns the split into a real invariant instead of just a design claim.

## Files to study

- [`src/lib/sync/koreader.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.ts)
- [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [`src/lib/sync/koreader.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.test.ts)
- [`src/lib/services/koreaderSync.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.test.ts)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec svelte-kit sync && pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/reader/xcfi.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/services/koreaderSync.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/koreader.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/model.test.js`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
