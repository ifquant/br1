# 0556 Split Reader Toolbar Into Layout And Workspace Modes

## Why this change exists

The reader route had already grown into a multi-workspace product:

- parallel reading
- notebook
- AI workspace
- translation mode
- TTS mode
- sync workspace

But the top toolbar still rendered all of those controls as one flat row of pills.

That made two things worse:

- the shell looked denser than the product really was
- the user had to parse layout actions and workspace mode switches as if they were the same kind of control

This slice is a narrow `P4-2.1` chrome cleanup. It does not add new reader capability. It only makes the route-level control hierarchy read more like one deliberate shell.

## What changed

### 1. The toolbar is now split into two control groups

[`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) now renders the reader toolbar as two rows:

- `阅读布局控制`
- `工作台模式切换`

The first row keeps the layout-level actions:

- toggle parallel reading
- open or close the notebook shell

The second row now owns the notebook mode switches:

- notes
- AI
- translation
- TTS
- sync

That means the shell no longer asks the user to treat every control as one undifferentiated utility button.

### 2. Existing reader smoke contracts stay intact

The visible button copy is shorter now, but the existing accessible names are still preserved on the workspace buttons:

- `打开笔记工作台`
- `打开 AI 工作台`
- `打开翻译模式`
- `打开朗读模式`
- `打开同步工作台`

That matters because the current Playwright smoke coverage already treats those names as the route-level product contract.

### 3. Narrow-width layout now stacks by control family

The toolbar CSS now switches from a single right-aligned row to a grid that:

- keeps the layout row together
- lets workspace mode buttons wrap as a dedicated group
- collapses the workspace mode strip to two columns and then one column on narrower widths

This is still a route-level shell change, not a notebook redesign.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- progress hierarchy changes in the footer or stage chrome
- notes, bookmarks, or highlights workspace semantic cleanup
- any Tauri, sync, or reader service behavior changes
