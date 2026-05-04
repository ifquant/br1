# 0562 Keep Highlight Empty State Aware Of Selection Sets

## Why this change exists

After `0561`, the highlights panel could finally describe the difference between:

- current-book highlights
- saved cross-book highlight selection sets

But one contradictory case still remained.

If the reader deleted all current-book highlights while saved cross-book selection sets still existed, the bottom empty state still said:

- `还没有高亮`

That was no longer true. The current book had no local highlights, but the panel still contained reusable highlight work in the cross-book selection-set section above.

This slice fixes only that contradiction.

## What changed

[`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) now adds one more empty-state branch for the highlights panel:

- if there are no current-book highlights
- but saved highlight selection sets still exist

the panel now says:

- `当前书还没有高亮，但跨书高亮选择集还保留在上面，可以继续整理或导入匹配结果。`

That keeps the empty state aligned with the real panel contents.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- highlight grouping or filter behavior
- selection-set import/export/refresh logic
- any bookmark or notes workspace changes
