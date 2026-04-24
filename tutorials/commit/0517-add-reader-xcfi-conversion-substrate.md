# 0517: Add Reader XCFI Conversion Substrate

## Why this commit exists

KOReader parity work was blocked on a missing reader-side conversion layer.

`br1` already had:

- KOReader sync record mapping
- KOReader exchange import/export
- KOReader server-backed progress sync

But it still did not have the utility that makes those features semantically correct inside the reader itself: conversion between EPUB CFI and KOReader CREngine XPointer.

Without that substrate, future work gets stuck in a bad place:

- either we skip books whose local position is not already KOReader-shaped
- or we keep leaking `br1`-specific progress representations into KOReader-facing paths

This commit fixes the missing foundation.

## What changed

### 1. Ported `XCFI` into `br1`

[`src/lib/reader/xcfi.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/xcfi.ts) now contains the reader-side conversion layer adapted from Readest.

It provides:

- `XCFI.extractSpineIndex(...)`
- `new XCFI(document, spineIndex)`
- `xPointerToCFI(...)`
- `cfiToXPointer(...)`
- `getCFIFromXPointer(...)`
- `getXPointerFromCFI(...)`
- `normalizeProgressXPointer(...)`

That is the first time `br1` has a local, checked-in answer to “how do we translate between Foliate/EPUB CFI and KOReader XPointer?”

### 2. Exposed the converter through the reader module surface

[`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/index.ts) now re-exports the converter helpers, so later reader-side KOReader sync slices can import them from the same reader substrate barrel instead of reaching into an ad-hoc util path.

### 3. Added targeted tests for the stable, non-DOM parts

[`src/lib/reader/xcfi.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/xcfi.test.ts) verifies the pieces that are cheap and stable to assert in the current Node test environment:

- spine-index extraction from EPUB CFI
- spine-index extraction from KOReader XPointers
- KOReader XPointer identification
- progress XPointer normalization

This is a deliberate testing boundary. Full range/document round-trip tests need a richer DOM fixture environment and are better added when the converter is actually wired into reader flows.

## Why this slice stays substrate-only

This commit does **not** yet change live reader behavior.

That is intentional. The point of this slice is to land the missing dependency first, so the next commits can wire it into:

- reader progress persistence
- KOReader pull/apply flow
- KOReader note/bookmark syncing

Trying to do substrate + live wiring + new regression fixtures in one commit would make the diff much harder to trust.

## Files to study

- [`src/lib/reader/xcfi.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/xcfi.ts)
- [`src/lib/reader/xcfi.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/xcfi.test.ts)
- [`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/index.ts)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec svelte-kit sync && pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/reader/xcfi.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/services/koreaderSync.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/koreader.test.js`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
