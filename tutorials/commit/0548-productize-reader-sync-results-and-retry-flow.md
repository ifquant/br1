# 0548 Productize Reader Sync Results And Retry Flow

## Why this change exists

`0547` made KOReader sync controls visible inside the reader notebook, but the surface still behaved too much like a raw action cluster:

- export success only showed a transient notice
- exchange import conflicts were hidden behind a generic summary
- remote sync failures had no retry affordance
- successful import or pull did not refresh the current managed-book locator state in the open reader

That left the notebook sync tab structurally present but still weak as a product surface. This slice turns it into a stateful workspace instead of four buttons plus a toast.

## What changed

### 1. The sync workspace now preserves the last meaningful result

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) now renders result cards for:

- the most recent current-book KOReader exchange export
- the most recent KOReader exchange import
- the most recent KOReader remote push or pull

That matters because sync work is not binary. Users need to see what actually happened after the action completed, not only whether a notice briefly flashed.

### 2. Exchange import and remote sync get product-level summaries

The sync workspace now adds compact interpretation on top of the raw service result:

- import conflicts are summarized as missing-match, ambiguous-match, and local-newer buckets
- up to the first few concrete conflict details are shown inline
- remote results get status-specific copy for missing config, auth failure, offline, retryable failure, empty, and progress-only success boundaries

This keeps the trust boundary unchanged while making the state legible.

### 3. Failed sync actions can be retried from the workspace

[`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) now keeps a retry callback for the last failed sync action.

The notebook passes that callback into the sync workspace, so an error notice can expose a concrete `重试刚才的动作` button. The user no longer has to remember which of the four actions just failed and manually trigger it again.

### 4. Import and pull now refresh the current managed-book state

The route now uses a shared `refreshCurrentManagedBookState()` helper for both initial resolution and post-sync refresh.

That means a successful KOReader exchange import or remote pull can update the reader’s current managed-book record and cover state before the user leaves the notebook. Without this, the tab could keep claiming the book had no KOReader locator even after sync just wrote one.

### 5. The notebook contract now carries explicit sync result props

[`src/lib/components/reader/ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte) now forwards:

- `syncExchangeExportResult`
- `syncExchangeImportResult`
- `syncRemoteResult`
- `onRetrySyncAction`

That keeps the route as the owner of sync state, while the notebook and workspace remain thin presentation layers.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new KOReader sync protocols
- remote annotation sync
- background sync scheduling
- a broader reader-wide activity log beyond the sync workspace itself
