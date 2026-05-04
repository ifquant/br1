# 0560 Reframe Bookmarks As Reading Positions

## Why this change exists

The bookmark tab already behaved like a small reading-position workflow:

- it tracked whether the current page was already saved
- it let the reader save or remove the current position
- it let the reader jump back to earlier saved positions

But the copy still described the surface more like a passive bookmark list.

That left two product mismatches:

- the panel did not speak clearly about the current reading position
- the main action and empty states did not read like a live reading workflow

This slice keeps the same bookmark model and persistence. It only changes the bookmark panel’s product language.

## What changed

### 1. The panel now frames bookmarks as `阅读位置`

[`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) now labels the bookmark surface as `阅读位置`.

This does not rename the tab itself. The tab still stays under the familiar bookmark icon and `书签面板` region. But inside the panel, the copy now explains what the feature is actually for: saving and revisiting reading positions.

### 2. The summary now reflects the current page state

The new `bookmarksPanelSummary` copy distinguishes:

- saved positions exist and the current page is already saved
- saved positions exist but the current page is not saved yet
- no saved positions exist, but the reader already has a stable current location
- no stable reading location exists yet

That makes the summary read like live session state instead of generic help text.

### 3. Action and meta copy now use current-page language

The main bookmark action now reads:

- `保存当前页位置`
- `移除当前页书签`

And the meta row now reports:

- `当前页已入书签`
- `当前页未入书签`

instead of the older `当前位置` phrasing.

This is a small wording change, but it makes the panel align better with the rest of the reader shell, which is already trying to talk in concrete reading-session language.

### 4. The empty state now reads like a reading workflow

The old empty-state text treated the panel as a generic saved list.

Now it explicitly says:

- there are no saved reading positions yet
- save the current page first

The chapter-filter empty state also now talks about `保存的阅读位置` instead of just `书签`.

### 5. A focused bookmarks smoke now locks the new contract

[`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) now includes a dedicated bookmark-focused check that:

- opens the bookmark tab
- verifies the new `阅读位置` framing
- saves the current page
- verifies the panel transitions to `当前页已入书签`

This keeps the slice tied to one real user-visible workflow instead of only checking copy in isolation.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader productizes bookmarks as current reading positions in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- bookmark storage or target-locator semantics
- highlight panel framing changes
- any sync/export behavior for bookmark data
