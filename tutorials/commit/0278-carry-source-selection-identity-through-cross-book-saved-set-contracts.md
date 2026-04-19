## Why

The previous slice preserved cross-book provenance through the structured saved-set import/export contract, but that provenance was still too anonymous. A recovered subset could say which book it came from and how many highlights matched, yet it still lost the identity of the original foreign selection set and how many highlights stayed unresolved.

That made the foreign-book contract too weak for any richer remap workflow. This commit hardens it by carrying source selection identity and unresolved-count metadata as part of the saved-set provenance model.

## What changed

### 1. Extend `importSource` beyond book-level provenance

In [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts), `ReaderHighlightSelectionSet.importSource` now includes:

- `bookKey`
- `selectionName`
- `unmatchedCount`

This turns cross-book provenance into something stable enough to describe the original foreign selection set, not just the foreign book.

### 2. Preserve the richer provenance model everywhere it matters

In [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte):

- persisted highlights workspace hydration now validates and restores the richer `importSource` shape
- cross-book preview state now tracks `sourceBookKey`
- matched-subset import now stores:
  - source book key
  - source selection-set name
  - unresolved count (`totalCount - matchedCount`)
- cross-book preview copy now shows `来源选择集`
- saved-set cards now render provenance as:
  - `跨书导入 · <book> / <selection> · <matched>/<total>`

This means imported saved sets are no longer anonymous matched subsets; they keep enough source identity for future remap work.

### 3. Lock the contract in the two highest-value regressions

The existing `TXT web` and `EPUB desktop` import/export flows now inject richer provenance into imported payloads and assert that it survives:

- same-book import/export
- cross-book preview
- matched-subset import card rendering

## Verification

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line`
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"`
- `pnpm check`
- `git diff --check`

## Not included

- Foreign-book remap behavior is still limited to importing the matched subset into the current book.
- Secondary-format desktop regressions do not yet assert the richer cross-book provenance contract.
