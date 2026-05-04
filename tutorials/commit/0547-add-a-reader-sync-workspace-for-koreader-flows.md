# 0547 Add A Reader Sync Workspace For KOReader Flows

## Why this change exists

`br1` already had substantial KOReader sync substrate:

- exchange export/import
- remote progress push/pull
- KOReader locator persistence in reader state

But from a user perspective those controls still lived in the library operations area. That made sync feel like maintenance, not like part of the reading workflow.

This slice moves the control surface closer to the act of reading. The reader notebook now has a dedicated `同步工作台`, so sync becomes something users can inspect and trigger while they are inside a book.

## What changed

### 1. The notebook gets a new sync tab

[`src/lib/components/reader/ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte) now includes a `同步工作台` tab alongside notes, highlights, assistant, translation, and TTS.

This is not just one more button in the header. It makes sync a first-class workspace inside the reader’s secondary shell.

### 2. Add a dedicated sync workspace component

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) is the new product surface.

It exposes two different sync scopes explicitly:

- **current-book scope**
  - export the currently opened managed-library book as a KOReader exchange file
  - show whether the book is from the managed library
  - show whether a KOReader-compatible locator already exists

- **whole-library scope**
  - import a KOReader exchange file
  - push KOReader remote progress
  - pull KOReader remote progress

That distinction matters. Without it, the reader would blur “current-book sync operation” and “whole-library remote maintenance action” into one vague surface.

### 3. Route-level reader state now owns sync actions

[`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) now wires the notebook sync tab to the existing service layer.

The route:

- tracks the current managed-library record for the opened book
- builds a single-book local sync snapshot for KOReader exchange export
- calls the existing KOReader exchange import dialog
- calls the existing KOReader remote push/pull commands
- records product-level success/error notices for the workspace

This keeps the new UI thin. The notebook tab owns product presentation and action sequencing; the actual sync substrate stays where it already belonged.

### 4. Current-book export is intentionally narrower than import/push/pull

The new workspace only allows **current-book exchange export** when the reader is opened from a managed library file.

That is deliberate. Exporting from an arbitrary asset URL or non-managed source would blur the meaning of the current book and reopen boundary confusion. By keeping export tied to `br1` managed library records, the notebook remains explicit about what it is exporting and why.

### 5. Web mode keeps the boundary explicit

The new reader smoke proves that the sync workspace is visible in web mode but still says “desktop sync is unavailable” there.

That preserves the same product rule we have used elsewhere:

- renderer-visible product surface: yes
- pretending web mode can run desktop-owned sync actions: no

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new sync providers or new remote protocols
- Readwise-style highlight sync
- whole-library snapshot controls inside the reader notebook
- any change to the current KOReader remote boundary, which remains progress-only
