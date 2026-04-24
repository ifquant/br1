# 0520: Lock KOReader Remote Sync To Progress Only

## Why this commit exists

The previous KOReader slices added:

- local KOReader-compatible progress locators
- local KOReader annotation metadata
- manual KOReader exchange files
- official KOSync server-backed progress push/pull

That created a dangerous product ambiguity:

- the local model now knows about KOReader bookmarks and annotations
- the remote KOReader menu items were still generic enough to imply broader sync support
- but the official `koreader/koreader-sync-server` protocol only exposes reading progress

If we kept pushing from there, the next step would have been to invent a non-standard annotation protocol and call it KOReader parity.

That would be the wrong move.

This commit is a deliberate correction slice: it tightens the product copy and desktop notices so the implementation matches the real official protocol boundary.

## What changed

### 1. KOReader remote actions are now explicitly progress-only

[`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/components/library/LibraryHeader.svelte) now labels the actions as:

- `推送 KOReader 阅读进度`
- `拉取 KOReader 阅读进度`

Instead of vague “push/pull KOReader” wording.

That is a small UI change, but it removes the biggest false implication in the current library menu.

### 2. The menu now states where annotations really belong

The same menu now includes an informational note that:

- official KOSync does not provide remote bookmark/annotation sync
- users should use KOReader exchange files for those records today

This is the right product boundary because `br1` already has a real exchange workflow for KOReader annotations and bookmarks. The UI should point to the path that actually exists.

### 3. Desktop notices now keep the same contract

[`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts) now appends the same progress-only clarification to:

- no-progress-available messages
- successful push/pull messages
- KOReader remote failure messages

That prevents the library notice area from quietly reintroducing the old ambiguity after the menu text has been tightened.

## Why this is a real implementation slice

This is not just wording cleanup.

It is a protocol-correctness slice.

Once the codebase has local annotation metadata and a remote sync button, vague language becomes dangerous because it pressures later work toward an unsupported backend contract.

Locking the product surface to the real official protocol is how we keep the next phase technically honest:

- official KOSync: progress only
- KOReader exchange files: progress + annotations + bookmarks
- future remote annotation support: must come from a different provider or plugin-backed server, not from pretending official KOSync does more than it does

## Files to study

- [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/components/library/LibraryHeader.svelte)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)
- [official KOReader Sync Server README](https://github.com/koreader/koreader-sync-server)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
