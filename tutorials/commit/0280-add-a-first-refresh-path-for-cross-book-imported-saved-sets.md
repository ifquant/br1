## Why

The previous slice let `br1` recognize repeated imports of the same foreign selection set and update the existing local import instead of creating duplicates. That improved the cross-book contract, but the workflow still depended on the user manually re-pasting a JSON payload whenever they wanted to rerun the remap.

This commit removes that requirement for the first time. Imported foreign saved sets now keep enough source snapshot data to support an explicit `刷新映射` action directly from the highlights workspace.

## What changed

### 1. Keep foreign highlight snapshots inside imported saved-set provenance

In [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts), `ReaderHighlightSelectionSet.importSource` now also stores:

- `highlights: ReaderHighlightSelectionSetExportHighlight[]`

That is the minimum source material required to rerun matching later without asking the user to re-import the original JSON blob.

### 2. Validate and persist the richer provenance model

In [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte):

- persisted workspace hydration now restores `importSource.highlights`
- same-book import validation now accepts imported saved sets that carry those snapshots
- cross-book compatibility preview now keeps `sourceHighlights`
- matched-subset import writes those snapshots into the resulting local saved set

This upgrades foreign-book provenance from “identity plus counts” into “identity plus replayable remap input”.

### 3. Add the first explicit `刷新映射` action

Imported foreign saved sets now show a `刷新映射` action in the saved-set card.

When clicked, it:

1. rebuilds a lightweight import payload from the stored foreign snapshots
2. reruns `resolveImportedHighlightIds(...)` against the current book
3. updates:
   - `selectedIds`
   - `matchedCount`
   - `unmatchedCount`
   - `importedAt`
4. emits an explicit `已刷新跨书选择集` notice

This is the first path that lets a saved cross-book import refresh itself in place without another prompt-driven import.

### 4. Lock the behavior in TXT web and EPUB desktop

The highest-value regressions now prove this path works:

- [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
  - imports a saved set carrying foreign provenance snapshots
  - clicks `刷新映射`
  - asserts the success notice appears without another JSON import

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - runs the same path in the real desktop EPUB reader flow
  - proves the refresh action works before the later cross-book preview/update path

## Verification

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line`
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"`
- `pnpm check`
- `git diff --check`

## Not included

- Refresh still only recomputes matches from the stored foreign snapshots; it does not discover new foreign snapshots or synthesize missing source data.
- Secondary-format desktop regressions do not yet assert the new `刷新映射` path.
