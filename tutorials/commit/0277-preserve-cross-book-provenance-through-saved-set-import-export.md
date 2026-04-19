## Why

The previous slice made cross-book matched-subset imports visible inside the highlights workspace, but that provenance still disappeared if a user exported the resulting saved set and later imported it back into the same book. That meant the structured JSON contract was weaker than the in-app persisted state.

This commit closes that mismatch by treating `selectionSet.importSource` as part of the supported saved-set payload instead of a local-only detail.

## What changed

### 1. Validate and preserve `importSource` during saved-set import

In [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte), the saved-set import validator now accepts an optional `selectionSet.importSource` object when it has the expected shape:

- `bookTitle`
- `formatLabel`
- `matchedCount`
- `totalCount`
- `importedAt`

That same metadata is now copied onto the newly created saved set during the normal same-book import path. Before this change, the import flow rebuilt the saved set from `name`, `selectedIds`, and `createdAt` only, so imported cross-book provenance was silently dropped.

### 2. Lock the contract in web and desktop regressions

The two highest-value flows now inject provenance into an imported saved-set payload and verify it survives the import:

- [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
  - `TXT web`
  - imports a payload carrying `Imported TXT Source`
  - asserts the resulting saved-set card still shows `跨书导入 · Imported TXT Source · 1/2`

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - `EPUB desktop`
  - imports a payload carrying `Imported EPUB Source`
  - asserts the resulting saved-set card still shows `跨书导入 · Imported EPUB Source · 1/2`

## Verification

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line`
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"`
- `pnpm check`
- `git diff --check`

## Not included

- Foreign-book remap logic is unchanged; this only preserves existing provenance through the same-book import/export contract.
- Secondary-format desktop regressions do not yet assert provenance-preserving import/export on `FB2/MOBI/AZW3`.
