# 0518: Persist KOReader-Compatible Reader Locators

## Why this commit exists

The previous slice added the reader-side `XCFI` conversion substrate, but that code was still inert.

`br1` could:

- convert CFI and XPointer in isolation
- sync KOReader progress when a book already had a KOReader-shaped locator

But it still could not *produce and persist* a KOReader-compatible locator from the live reader session itself.

That left a real parity gap:

- local reopen in `br1` wants the existing EPUB CFI
- KOReader remote sync wants a KOReader-compatible locator
- using one field for both would either break local reopen semantics or leak the wrong value onto the KOReader wire

This commit closes that gap by storing both.

## What changed

### 1. Reader preview state now carries a parallel KOReader locator

[`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/components/reader/ReaderViewport.svelte) now does two things when the open book is an EPUB and the current position has a CFI:

- it still emits the normal `progressLocation` CFI immediately
- it also resolves a normalized KOReader XPointer asynchronously and re-emits the reader state with `koreaderProgressLocation`

That split is important. The main reader state does not block on conversion work, but the KOReader-facing locator still gets persisted once it is available.

### 2. Persistence keeps local reopen and KOReader sync semantics separate

[`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/routes/reader/+page.svelte) now passes both fields into the persistence update.

On the desktop side, [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/library.rs) and [`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/models.rs) add `koreader_progress_location` to the stored library record.

That means:

- `progressLocation` stays the `br1` reopen field
- `koreaderProgressLocation` becomes the KOReader/export field

This is the right boundary. We no longer force one locator format to do two jobs.

### 3. Sync substrate and KOReader export now preserve the new field

[`src/lib/sync/model.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/model.ts) now carries `koreaderProgressLocation` through `reading-state` records and restores it on import.

[`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts) now prefers that KOReader-specific field when projecting remote progress entries, instead of guessing from the regular local reopen CFI.

That makes the wire contract sharper:

- export prefers the KOReader locator when available
- pure local-only pseudo-locators like `txt:` still do not leak into KOReader sync
- pull can keep a KOReader locator without destroying the reader's own local resume field

## Why this is better than overwriting `progressLocation`

Overwriting `progressLocation` with a KOReader XPointer would be the wrong shortcut.

`br1` already uses `progressLocation` as the local reader reopen contract. Replacing it with an XPointer would make local reader restore behavior depend on KOReader semantics.

That would be an architectural regression, not a parity improvement.

The parallel field keeps the contracts explicit:

- local reader resume stays local-reader shaped
- KOReader sync stays KOReader shaped

## Files to study

- [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/components/reader/ReaderViewport.svelte)
- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/routes/reader/+page.svelte)
- [`src/lib/services/libraryPersistence.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/libraryPersistence.ts)
- [`src/lib/sync/model.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/model.ts)
- [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/library.rs)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec svelte-kit sync && pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/reader/xcfi.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/services/koreaderSync.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/koreader.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/model.test.js`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
