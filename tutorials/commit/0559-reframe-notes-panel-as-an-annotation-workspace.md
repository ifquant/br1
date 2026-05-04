# 0559 Reframe Notes Panel As An Annotation Workspace

## Why this change exists

The sidebar `笔记` tab was already doing more than one job:

- it showed plain notes
- it showed highlights
- it let the reader filter by annotation kind
- it exposed mixed deletion actions over both note and highlight results

But the product framing still said `最近笔记`.

That was inaccurate in two ways:

- the panel is not only about notes
- the default guidance copy still mixed up capability support with current user next-step guidance

So the panel could behave like an annotation workspace while still talking like a note-only list.

This slice fixes that mismatch without changing the storage model or any sync path.

## What changed

### 1. The notes tab now identifies itself as `标注`

[`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) now labels the notes surface as `标注` instead of `最近笔记`.

That better matches what the panel actually contains:

- notes
- highlights
- mixed chapter groups

### 2. Supported-format guidance now distinguishes capability from current next step

The panel summary now uses one explicit `notesPanelSummary` branch:

- unsupported formats still show the capability boundary message
- active selections explain that the user can immediately create a note or highlight
- existing annotation state explains that the current book already has both note and highlight history here
- empty supported state now tells the user to select text first, instead of reusing the generic support message

This makes the panel read more like a real reading workflow and less like a capability table.

### 3. Group and empty-state copy now matches mixed annotation content

The chapter groups no longer announce themselves as `某章节的笔记` when they may actually contain both note and highlight items.

The chapter-empty and default-empty states now also use:

- `标注`
- `笔记`
- `高亮`

according to the active kind filter, instead of always falling back to note-only language.

### 4. The existing TXT notes smoke now asserts the new product contract

[`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) now checks that:

- the notes panel presents itself as `标注`
- the default supported-format guidance points the user toward selecting text first
- the selected-text state upgrades to `可以直接记笔记或高亮`

The same smoke also now scopes tab and selection-card interactions to the sidebar surface explicitly, so it no longer collides with same-name notebook tabs or duplicated selection-card markup elsewhere in the reader shell.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- bookmark panel framing changes
- highlight panel framing changes
- any note/highlight persistence, sync, or cross-book selection behavior changes
