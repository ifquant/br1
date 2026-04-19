## Why

The previous slice added the first explicit `刷新映射` path for a single imported foreign-book saved set. That closed the gap between “I imported this once” and “I can recompute its matches later”.

But the workflow still did not scale. If a reader had multiple imported foreign-book selection sets, they still had to refresh each card one by one.

This commit adds the first bulk management action for that problem: `刷新全部跨书映射`.

## What changed

### 1. Track imported foreign-book saved sets as a first-class subset

In [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte), the sidebar now derives `importedSavedHighlightSelections` from the saved-set list.

This is intentionally small, but it matters because it gives the highlights workspace a real notion of “all foreign imported sets”, not just isolated card-level actions.

### 2. Add a bulk refresh path

The new `refreshAllCrossBookImportedSelections()` helper:

- iterates over every saved set carrying `importSource`
- rebuilds a lightweight import payload from the stored foreign snapshots
- reruns `resolveImportedHighlightIds(...)`
- updates:
  - `selectedIds`
  - `matchedCount`
  - `unmatchedCount`
  - `importedAt`

The resulting notice is intentionally coarse-grained:

- `已刷新 1 组跨书选择集`
- `已刷新 N 组跨书选择集`

This is the first real bulk-management layer for foreign-book remap state.

### 3. Surface the action in the saved-set toolbar

The saved-set toolbar now includes:

- `导入`
- `刷新全部跨书映射`
- sort controls

The bulk refresh button is disabled unless at least one imported foreign-book saved set exists.

That keeps the action explicit and prevents it from looking like a noop control when the workspace only contains native in-book saved sets.

### 4. Lock it with web and desktop evidence

The highest-value flows now prove the toolbar action works:

- [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
  - `TXT web`
  - still refreshes a single foreign saved set first
  - then uses `刷新全部跨书映射`
  - asserts the bulk success notice appears

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - `EPUB desktop`
  - follows the same path in the real desktop reader flow
  - proves the bulk refresh action works on the persisted imported foreign-book set

## Verification

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line`
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"`
- `pnpm check`
- `git diff --check`

## Not included

- Bulk refresh still only replays stored foreign highlight snapshots; it does not fetch new upstream selection data.
- Secondary-format desktop regressions do not yet assert the new bulk refresh path.
