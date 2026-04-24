# Readest Reader Parity Wave Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the next `br1` parity line into a reader-focused execution program that closes the highest-value Readest UX gaps in search, chrome hierarchy, and sidebar workspace semantics.

**Architecture:** Keep `.planning/READEST-ALIGNMENT-CHECKLIST.md` as the status ledger, but execute `P4` through narrow, reviewable waves. Wave 1 splits into two disjoint tracks: `P4-1.2` search-state productization and `P4-2.1` reader shell chrome hierarchy. Wave 2 follows with notes/bookmarks/highlights workspace semantics once the search copy/state contract is stable.

**Tech Stack:** SvelteKit 5, Tauri 2, TypeScript, Svelte components, Playwright web smoke, WebDriverIO desktop regression where shell behavior needs desktop-only evidence.

---

## Scope Check

This is a reader-only plan. Do not mix in new sync/provider work, library homepage work, or Tauri trust-boundary changes unless a reader slice exposes a correctness bug that must be fixed to keep the reader working.

Parallelism rule:

- Wave 1 Task 1 and Task 2 are parallel-safe because they have disjoint write sets.
- Task 3 waits for Task 1 because it changes the same sidebar surface.
- Each shipped slice still needs:
  - checklist update
  - `tutorials/commit/`
  - `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
  - `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## File Structure

- Modify `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`: search summary/empty/unsupported/result product semantics and notes workspace framing.
- Modify `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`: continue to emit search state that the sidebar can render as a product surface.
- Modify `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`: shared reader capability contract for search/annotation messaging.
- Modify `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`: only if a search/sidebar presentation state needs a new typed field.
- Modify `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`: tighten action density and reading-first hierarchy.
- Modify `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte`: tighten progress/navigation/meta hierarchy.
- Modify `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`: coordinate chrome visibility and width/hierarchy without inventing a new route architecture.
- Modify `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`: fast reader smoke assertions for search/sidebar UX.
- Modify `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`: desktop-only reader shell/chrome evidence when web smoke is insufficient.
- Modify `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`: mark shipped slices with commit hash and verification.
- Add `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0538-*.md`, `0539-*.md`, `0540-*.md`: one tutorial per shipped slice.

## Wave Plan

### Wave 1A: P4-1.2 Reader Search State Productization

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts` (only if needed)
- Test: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

- [ ] **Step 1: Write the focused failing smoke**

Add one reader smoke that proves the sidebar search surface distinguishes:

- idle guidance
- unsupported search
- empty result
- non-empty result

Use the existing TXT and EPUB samples instead of inventing fixtures:

```ts
test('reader search states read like one product surface across txt and epub', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book');
  await page.getByRole('tab', { name: '搜索' }).click();
  await expect(page.locator('.search-summary')).toContainText('正文搜索');
  await page.getByRole('searchbox', { name: '搜索正文内容' }).fill('plain text');
  await expect(page.getByLabel('搜索结果')).toContainText('TXT 书籍暂不支持全文搜索。');

  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.epub&label=Sample%20EPUB%20Book');
  await page.getByRole('tab', { name: '搜索' }).click();
  await page.getByRole('searchbox', { name: '搜索正文内容' }).fill('does-not-exist');
  await expect(page.getByLabel('搜索结果')).toContainText('没有命中正文内容。');
});
```

- [ ] **Step 2: Run the focused smoke and capture the baseline**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader search states read like one product surface across txt and epub"
```

Expected before implementation: FAIL because current sidebar summary/empty copy is still generic and not intentionally unified across unsupported/empty/result states.

- [ ] **Step 3: Productize the search surface**

Keep `ReaderViewport` as the source of raw search state and let `ReaderSidebar` own the reader-facing interpretation. Prefer derived presentation helpers over more inline branching:

```ts
const getSearchSummaryModel = (search: ReaderSidebarSearchState, formatLabel: string) => {
  if (search.status === 'searching') return { title: '正在搜索', detail: '...' };
  if (search.status === 'error') return { title: '当前格式不支持正文搜索', detail: search.error };
  if (search.results.length) return { title: `${search.results.length}`, detail: '正文命中结果' };
  if (search.term.trim() && search.status === 'done') {
    return { title: '0', detail: '当前关键词没有命中正文内容' };
  }
  return { title: '正文搜索', detail: '输入关键词后会在正文里搜索，而不只是过滤目录。' };
};
```

Constraints:

- do not add TXT search
- do not invent a new API call
- keep the shared unsupported message in `/src/lib/reader/formats.ts`
- if a new type is needed, add it in `/src/lib/reader/types.ts` and export it cleanly

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader search states read like one product surface across txt and epub"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: all commands pass.

- [ ] **Step 5: Update docs and commit**

Update:

- `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0538-productize-reader-search-states-across-formats.md`

Commit:

```bash
git add src/lib/components/reader/ReaderSidebar.svelte src/lib/components/reader/ReaderViewport.svelte src/lib/reader/formats.ts src/lib/reader/types.ts tests/e2e/library-smoke.spec.ts .planning/READEST-ALIGNMENT-CHECKLIST.md tutorials/commit/0538-productize-reader-search-states-across-formats.md
git commit -m "feat(reader-search): productize search states across formats"
```

### Wave 1B: P4-2.1 Reader Shell Chrome Hierarchy

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Test: `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts` or `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts` (prefer the file that already covers the interaction you change)

- [ ] **Step 1: Write the failing chrome regression**

Add a focused regression that proves the shell preserves reading-first hierarchy in parallel mode and ordinary single-reader mode. Anchor on the current surface that already exists:

```ts
test('reader chrome keeps progress and navigation visible in parallel mode', async ({ page }) => {
  // open EPUB sample
  // enter parallel mode
  // assert both panes still expose header/footer controls
  // assert progress, location, and next/prev controls remain visible without overlap collapse
});
```

If this fits better in `e2e/app.e2e.ts`, use the existing grep-friendly reader desktop tests there instead of forcing it into web smoke.

- [ ] **Step 2: Run the targeted regression and capture the baseline**

Run one targeted command only:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --grep "reader chrome keeps progress and navigation visible in parallel mode"
```

Or, if you used the desktop suite:

```bash
bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh pnpm -C /Users/dev/workspace2/hc_apps/br1 exec wdio run wdio.conf.ts --mochaOpts.grep "reader chrome keeps progress and navigation visible in parallel mode"
```

- [ ] **Step 3: Tighten header/footer/stage hierarchy**

Keep the existing components; do not create a new shell abstraction. Favor hierarchy changes like:

```svelte
<!-- Header -->
<div class="title-row">
  <strong>{preview.title}</strong>
  <div class="subtitle-row">
    <small>{preview.author}</small>
    <span>{preview.chapterLabel}</span>
  </div>
</div>

<!-- Footer -->
<label class="progress-strip" aria-label="阅读进度">
  <input type="range" ... />
  <span>{preview.progressLabel}</span>
</label>
<div class="footer-meta">
  <span>{locationDisplayLabel}</span>
  <span>{formatDisplayLabel}</span>
  <span>{layoutDisplayLabel}</span>
</div>
```

Target outcomes:

- progress becomes the primary footer signal
- navigation controls read as one cluster
- header actions stop overpowering title/chapter context
- parallel mode keeps both panes legible instead of feeling like duplicated utility chrome

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Plus the one targeted chrome regression you added.

- [ ] **Step 5: Update docs and commit**

Update:

- `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0539-align-reader-shell-chrome-and-progress-hierarchy.md`

Commit:

```bash
git add src/lib/components/reader/ReaderHeaderBar.svelte src/lib/components/reader/ReaderFooterBar.svelte src/lib/components/reader/ReaderStage.svelte e2e/app.e2e.ts tests/e2e/library-smoke.spec.ts .planning/READEST-ALIGNMENT-CHECKLIST.md tutorials/commit/0539-align-reader-shell-chrome-and-progress-hierarchy.md
git commit -m "feat(reader-shell): align chrome and progress hierarchy"
```

### Wave 2: P4-2.2 Notes, Bookmarks, And Highlights Workspace Semantics

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts` (only if a presentation model needs typing)
- Test: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

- [ ] **Step 1: Write the failing focused smoke**

Add a sidebar smoke that proves unsupported states, selection states, and saved-workspace states read coherently:

```ts
test('reader notes workspace presents unsupported, selection, and saved states coherently', async ({ page }) => {
  // open CBZ and assert unsupported annotation framing
  // open TXT and assert selection CTA hierarchy
  // create a highlight/note and assert grouped counts and action labels stay coherent
});
```

- [ ] **Step 2: Run the focused smoke**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader notes workspace presents unsupported, selection, and saved states coherently"
```

- [ ] **Step 3: Productize the workspace semantics**

Keep storage/sync behavior unchanged. Only tighten user-facing semantics:

```svelte
{#if !supportsTextAnnotations}
  <div class="selection-card unsupported-selection" aria-label="正文批注支持提示">
    <strong>当前格式暂不支持正文批注</strong>
    <p>{textAnnotationSupportMessage}</p>
  </div>
{:else if notesState.selection}
  <div class="selection-card" aria-label="当前选中文本预览">
    ...
  </div>
{/if}
```

Target outcomes:

- unsupported format messaging is explicit and consistent
- primary/secondary actions tell the truth
- counts, filters, and destructive actions read like one workspace instead of three stacked utilities

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader notes workspace presents unsupported, selection, and saved states coherently"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

- [ ] **Step 5: Update docs and commit**

Update:

- `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0540-tighten-reader-notes-bookmarks-and-highlights-workspace.md`

Commit:

```bash
git add src/lib/components/reader/ReaderSidebar.svelte src/lib/reader/types.ts tests/e2e/library-smoke.spec.ts .planning/READEST-ALIGNMENT-CHECKLIST.md tutorials/commit/0540-tighten-reader-notes-bookmarks-and-highlights-workspace.md
git commit -m "feat(reader-notes): tighten workspace semantics across formats"
```

## Execution Order

1. Run Wave 1A and Wave 1B in parallel with disjoint ownership.
2. After both land, re-read the shared reader surfaces and then execute Wave 2.
3. Do not expand format support in this plan. This is productization, not capability creep.

## Self-Review

- Spec coverage: this plan covers every remaining unchecked `P4` item in `.planning/READEST-ALIGNMENT-CHECKLIST.md`.
- Placeholder scan: no `TODO`, `TBD`, or “write tests later” placeholders remain.
- Type consistency: all referenced component and test paths exist in the current `br1` tree.
