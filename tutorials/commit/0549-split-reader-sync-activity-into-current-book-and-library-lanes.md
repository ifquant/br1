# 0549 Split Reader Sync Activity Into Current-Book And Library Lanes

## Why this change exists

`0548` made the reader sync workspace stateful, but the surface still had one remaining product ambiguity: all result cards lived together without making it obvious whether the last meaningful action affected only the current book or the whole managed library.

That matters because the sync tab contains two different scopes:

- **current-book export**
- **whole-library import / remote push / remote pull**

If those scopes share one undifferentiated result area, users have to infer whether the last state change was a book-local export or a library-wide sync operation. This slice makes that distinction explicit.

## What changed

### 1. The route now records sync activity by scope

[`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) now keeps two explicit activity states:

- `currentBookSyncActivity`
- `librarySyncActivity`

Each activity records:

- action label
- status (`success`, `error`, `cancelled`)
- user-facing message
- timestamp

This keeps the activity ownership at the route level, next to the existing result and retry state.

### 2. Each sync action now writes into the correct lane

The route maps actions into the correct scope instead of just showing a transient notice:

- current-book KOReader exchange export updates the **current-book** lane
- KOReader exchange import updates the **library** lane
- KOReader remote push/pull update the **library** lane

Cancelled actions are now visible as explicit activity states instead of disappearing after the temporary notice is gone.

### 3. The workspace renders two separate recent-activity cards

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) now shows:

- a `最近动作` card inside the **当前图书** panel
- a separate `最近动作` card inside the **整库远端动作** panel

That gives the sync workspace a clearer product shape:

- “What is true for this current book?”
- “What is true for the whole library sync substrate?”

instead of one mixed status zone.

### 4. The notebook contract carries activity state explicitly

[`src/lib/components/reader/ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte) now forwards:

- `currentBookActivity`
- `libraryActivity`

This keeps the notebook as a thin presenter rather than making it infer scope from raw sync results.

### 5. The focused smoke now waits for the reader shell itself

The sync workspace smoke had a flaky first-attempt failure because it tried to open the sync tab before the reader shell consistently exposed the footer controls.

The test now waits for [`阅读页脚控制`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) with a longer timeout before opening the sync tab. That is a better synchronization point than assuming a specific notebook trigger appears within the default 5-second window.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new KOReader sync protocols
- sync history persistence beyond the current in-memory reader session
- whole-library snapshot controls inside the reader notebook
- automatic background refresh of remote sync status
