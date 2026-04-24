# 0515: Add KOReader Server Progress Sync

## Why this commit exists

`br1` could already import and export KOReader-compatible exchange files, but it still had no direct way to sync progress with a running KOReader server. This commit closes that next parity gap with a narrow slice: manual, desktop-owned, progress-only push and pull.

The important constraint is trust boundary. The renderer must not become a generic network proxy. KOReader server URL and credentials stay inside Tauri-owned desktop env, and the frontend only sends normalized progress entries for books that already exist in the local sync snapshot.

## What changed

### 1. Added a dedicated Tauri KOReader remote sync command

In [`src-tauri/src/commands/koreader_remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/koreader_remote_sync.rs), the desktop side now owns:

- config resolution from env:
  - `BR1_KOREADER_SYNC_BASE_URL`
  - `BR1_KOREADER_SYNC_USERNAME`
  - `BR1_KOREADER_SYNC_USERKEY`
  - optional device name/id overrides
- auth against fixed KOReader endpoints
- manual progress push with `PUT /syncs/progress`
- manual progress pull with `GET /syncs/progress/{document}`

This keeps three things out of renderer control:

- remote base URL construction
- auth headers
- endpoint choice

That is the core safety property of this slice.

### 2. Added frontend progress-entry builders and pull-merge helpers

In [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts), the KOReader service layer now does two new jobs:

- project the current local sync snapshot into KOReader remote progress entries
- merge pulled remote progress back into the current snapshot

The merge helper is intentionally conservative:

- if one KOReader document hash matches multiple local books, it skips
- if local reading state is newer than the remote timestamp, it skips
- it only rewrites `reading-state`, not notes or bookmarks

That keeps this commit focused on server-backed progress sync instead of silently broadening into remote annotation sync.

### 3. Wired the existing library menu to the new flow

In the library header and desktop coordinator, the existing “更多操作” menu now exposes two new actions:

- push to KOReader
- pull from KOReader

The coordinator reuses the existing busy/notice pattern already used by Readest Cloud sync:

- start with the current local snapshot
- build KOReader progress entries
- call the Tauri command
- on pull, merge only safe updates
- surface explicit notices for missing config, auth failure, offline, retryable failure, empty result, and successful apply

## Design choices worth noticing

### Why this is not folded into `run_remote_sync`

`readestCloud` sync moves whole snapshots. KOReader server sync only moves per-book progress records. Those are different contracts.

Keeping KOReader on its own command avoids corrupting the remote snapshot abstraction and keeps the transport/result shapes honest.

### Why push/pull are manual only

Automatic background sync sounds convenient, but it would force a much wider product and correctness surface:

- retry policy
- startup timing
- merge policy
- user-visible conflict ownership

This commit stops earlier on purpose. It delivers a usable parity step without hiding unresolved policy decisions.

## Files to study

- [`src-tauri/src/commands/koreader_remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/koreader_remote_sync.rs)
- [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)
- [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/components/library/LibraryHeader.svelte)
- [`src/lib/services/koreaderSync.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.test.ts)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec svelte-kit sync && pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/services/koreaderSync.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/koreader.test.js`
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
