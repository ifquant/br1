# 0558 Regroup Reader Header Controls By Ownership

## Why this change exists

By `0556` and `0557`, the reader shell already had a clearer top toolbar and footer hierarchy.

One dense area still remained: the header actions were all packed into one undifferentiated `阅读控制` row.

That meant four different kinds of things still looked like peers:

- route-level book actions
- sidebar entry shortcuts
- TTS session state
- overflow settings and operations

The shell already knew these were different responsibilities. The header just was not presenting them that way.

This slice keeps the same actions, labels, and menu behavior. It only regroups the header so the ownership of each control family is visible.

## What changed

### 1. Primary actions stay together

[`src/lib/components/reader/ReaderHeaderBar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte) now keeps:

- `回到书库`
- `添加/移除当前位置书签`

inside a dedicated `主要操作` group.

These are the actions that directly affect the current reading session or leave it.

### 2. Sidebar shortcuts are now their own group

The quick-entry buttons for:

- bookmarks
- search
- notes
- assist

now live under a dedicated `侧栏` group instead of reading like more generic top-level actions.

This does not change the button labels or the active-state contract. It only makes it obvious that these buttons are openings into the sidebar workspace.

### 3. TTS is presented as a reading session block

The TTS controls now sit in their own `朗读` group with the existing live status text.

That makes the TTS strip read as a session-status block rather than just two more icon buttons at the end of a crowded row.

### 4. The settings smoke now waits on the reader footer contract first

[`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) already covered the header settings menu, but its initial wait still assumed the shell would be ready as soon as the page loaded.

This slice hardens that existing smoke by waiting for the footer to become visible before asserting layout text. That avoids repeated false failures caused by the reader shell becoming ready slightly after navigation.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader persists epub layout settings through reload in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- footer hierarchy changes beyond `0557`
- any notebook workspace, sync workspace, or TTS behavior changes
- any new reader settings or menu actions
