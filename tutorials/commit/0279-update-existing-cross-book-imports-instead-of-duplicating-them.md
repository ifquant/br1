## Why

The previous slices made cross-book saved sets much richer: they could preview compatibility, import only the matched subset, and carry source-book plus source-selection provenance through persistence and import/export.

But behavior still lagged behind the contract. Re-importing the same foreign selection created another local saved set every time, usually with a `(2)`, `(3)`, `(4)` suffix, even though we already had enough provenance to know it was the same upstream object.

This commit makes that provenance actionable: same-source foreign imports now update the existing local import instead of creating duplicates.

## What changed

### 1. Match foreign imports by source identity

In [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte), there is now a focused helper that looks up an existing imported saved set by:

- `importSource.bookKey`
- `importSource.selectionName`

That is the first real use of the richer foreign-book provenance as behavior, not just display.

### 2. Update in place instead of creating another saved set

`importMatchedHighlightsFromPreview()` now does this:

- if no prior import exists for that foreign source, create a new saved set as before
- if a prior import already exists for the same foreign source, update:
  - `selectedIds`
  - `importSource.matchedCount`
  - `importSource.totalCount`
  - `importSource.unmatchedCount`
  - `importSource.importedAt`

It preserves the local saved-set identity instead of generating another duplicate card name.

The notice text also now distinguishes between:

- `已导入跨书选择集`
- `已更新跨书选择集`

### 3. Harden the EPUB desktop regression entry point

While extending the regression, I also tightened the `EPUB` desktop test start path in [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts):

- `findOpenableBook()` now waits until a matching reader href is actually present
- the `EPUB` desktop annotation regression now reuses `findStableEpubBook()`

This removes a race where the test sometimes asserted on the library href list before the EPUB cards had finished rendering.

### 4. Lock the update-in-place contract in web and desktop

Two regressions now prove that importing the same foreign selection twice does not duplicate local saved sets:

- [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
  - `TXT web`
  - imports the same foreign selection twice
  - asserts the second pass says `已更新跨书选择集`
  - asserts the imported saved-set name still appears only once

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - `EPUB desktop`
  - repeats the same cross-book preview/import cycle
  - asserts the second pass updates the existing imported card instead of creating another duplicate

## Verification

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line`
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"`
- `pnpm check`
- `git diff --check`

## Not included

- Foreign-book remap behavior is still limited to the currently matched subset.
- Secondary-format desktop regressions do not yet assert the new update-in-place cross-book import contract.
