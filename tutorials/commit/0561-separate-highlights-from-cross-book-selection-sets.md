# 0561 Separate Highlights From Cross-Book Selection Sets

## Why this change exists

The highlights panel in `br1` already carried two different workflows:

- current-book highlights
- saved cross-book highlight selection sets

Both were useful, but the panel language still blurred them together.

That created a product problem:

- the top of the panel said `高亮`
- the secondary section said `已保存选择集`
- the saved-selection filters said `全部已保存`

So a user had to infer that the lower half of the panel was not just “more saved highlights”, but a separate cross-book reuse workflow.

This slice does not change any of the selection-set logic. It only makes the panel admit that it owns two related, but distinct, workflows.

## What changed

### 1. The highlights summary now explains both layers

[`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) now computes a `highlightsPanelSummary` that distinguishes:

- unsupported-format capability limits
- current-book highlights only
- current-book highlights plus saved cross-book selection sets
- saved cross-book selection sets without local highlights yet
- the empty supported state

That means the panel summary finally tells the user whether they are working with local highlights, cross-book reuse, or both.

### 2. The saved-selection section is now explicitly cross-book

Inside the same panel, the secondary section heading now reads:

- `跨书高亮选择集`

and the helper copy now says:

- `按书保留跨书映射结果`

This is the important semantic split: the section is no longer pretending to be just another generic saved list.

### 3. The saved-selection filters now use selection-set language

The catch-all filter button for saved selection sets now reads:

- `全部选择集`

instead of `全部已保存`.

That matters because this filter is scoped to the selection-set workflow, not to every saved thing in the panel.

### 4. The long TXT annotation smoke now locks the new hierarchy

[`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) already exercises the entire highlight and cross-book selection-set flow.

This slice updates that existing smoke so it now also asserts:

- the new top-level highlights summary
- the `跨书高亮选择集` heading
- the new `全部选择集` filter label
- the new `按书保留跨书映射结果` copy after reload

That keeps the new wording tied to a real end-to-end workflow instead of a synthetic copy-only test.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- selection-set import/export/refresh logic
- highlight persistence or grouping behavior
- notebook-side highlight workspace changes
