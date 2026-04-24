# 0519: Persist KOReader Annotation Metadata In Reader State

## Why this commit exists

After `0518`, `br1` could persist a KOReader-compatible locator for reading progress.

That still left a second parity gap:

- locally created bookmarks were still fundamentally CFI-only
- locally created highlights and notes were still fundamentally CFI-only
- the KOReader sync adapter could preserve KOReader metadata only when it arrived from KOReader first

That is the wrong asymmetry.

If `br1` is going to align with Readest-style KOReader exchange, it has to preserve KOReader-compatible metadata for local reader annotations too, not just for imported ones.

## What changed

### 1. Reader annotation types now formally own KOReader metadata

[`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/types.ts) now adds:

- `ReaderKoReaderAnnotationMetadata`
- `ReaderKoReaderBookmarkMetadata`
- optional `koreader` fields on `ReaderNote` and `ReaderBookmark`
- optional `koreaderXPointer` on `ReaderSelectionState`

This matters because KOReader metadata is no longer an unofficial sync-adapter cast. It is now part of the real reader-side model.

### 2. Live reader selections now resolve KOReader XPointers

[`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/components/reader/ReaderViewport.svelte) already knew how to derive a precise EPUB CFI for a selection.

This commit extends that path:

- emit the normal selection state immediately
- asynchronously convert that selection CFI into a KOReader XPointer when possible
- re-emit the same selection with `koreaderXPointer`

That gives the note/highlight flow a real KOReader locator without blocking the ordinary selection UI.

### 3. Local note/highlight and bookmark creation now persist KOReader-compatible metadata

[`src/lib/reader/notesController.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/notesController.ts) now stores KOReader metadata when a live selection has a resolved XPointer.

[`src/lib/reader/bookmarksController.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/bookmarksController.ts) now stores KOReader metadata from the current preview's `koreaderProgressLocation`.

That means locally created reader artifacts now keep:

- the existing `br1` CFI/locator fields for local behavior
- a parallel KOReader metadata lane for future exchange and remote sync

Again, the important design choice is **parallel**, not replacement.

### 4. Tauri and sync round-trips preserve the same metadata

[`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/models.rs) now extends reader bookmark/note JSON records with optional KOReader metadata structs.

[`src/lib/sync/koreader.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.ts) now reads the same metadata from the official reader types instead of relying on local cast-only shadow types.

This is the real payoff:

- local reader state
- Tauri persistence
- sync substrate
- KOReader exchange projection

all now agree on where KOReader annotation metadata lives.

## Why this slice matters

Without this commit, a future KOReader annotation remote-sync feature would start from degraded local data and would have to guess or reconstruct XPointer metadata after the fact.

That would be brittle and would guarantee mismatch between:

- locally created annotations
- imported KOReader annotations
- annotations round-tripped through sync

This commit fixes that boundary early, while the change is still narrow and easy to trust.

## Files to study

- [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/types.ts)
- [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/components/reader/ReaderViewport.svelte)
- [`src/lib/reader/notesController.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/notesController.ts)
- [`src/lib/reader/bookmarksController.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/reader/bookmarksController.ts)
- [`src/lib/sync/koreader.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.ts)
- [`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/models.rs)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec svelte-kit sync && pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/reader/xcfi.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/services/koreaderSync.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/koreader.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/model.test.js`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
