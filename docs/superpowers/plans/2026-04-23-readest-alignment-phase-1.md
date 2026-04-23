# Readest Alignment Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `br1`'s first stage a Svelte + Tauri implementation that can be honestly measured against Readest's core reader, advanced reading, and service/ecosystem feature set.

**Architecture:** `.planning/READEST-ALIGNMENT-CHECKLIST.md` remains the only status source; this document is the implementation handoff that explains how to execute that checklist. Keep Svelte route files as hosts, put feature state/controllers in `src/lib/reader`, service facades in `src/lib/services`, and all privileged filesystem/network work in `src-tauri/src/commands`.

**Tech Stack:** SvelteKit 5, Tauri 2, Rust 2021, `foliate-js`, Playwright, WebDriverIO, `quick-xml`, local JSON persistence, Tauri command boundaries.

---

## Scope Check

The first-stage Readest alignment covers multiple independent subsystems. Do not implement it as one branch-sized mega-change. Execute this plan as a sequence of testable slices, one checklist item per commit when possible.

Status tracking rule:

- Update `.planning/READEST-ALIGNMENT-CHECKLIST.md` after every shipped slice.
- Do not recreate `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md`, or feature-audit documents.
- This plan may be revised, but it must not become the status ledger.

Readest reference points inspected locally:

- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/opds/*`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/types/opds.ts`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/services/tts/*`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTTSControl.ts`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTextTranslation.ts`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/ReadingRuler.tsx`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/store/parallelViewStore.ts`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/libs/sync.ts`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/services/sync/KOSyncClient.ts`

## File Structure

Create or modify these focused units as the plan progresses.

- Create `src/lib/reader/assistance.ts`: lookup and translation domain types, reducer helpers, and result normalization.
- Create `src/lib/reader/tts.ts`: TTS session types, command helpers, and Web Speech adapter boundary.
- Create `src/lib/reader/focusAids.ts`: reading ruler and focus-aid settings helpers.
- Create `src/lib/reader/parallel.ts`: parallel-read session and pane helpers.
- Create `src/lib/services/readerAssistance.ts`: renderer-safe service facade for lookup and translation commands.
- Create `src/lib/services/readerTts.ts`: browser/system TTS facade used by reader controllers.
- Create `src/lib/services/catalogs.ts`: OPDS/Calibre renderer facade.
- Create `src/lib/services/sync.ts`: sync snapshot and provider facade.
- Create `src-tauri/src/commands/catalogs.rs`: OPDS catalog validation, fetch, parse, and import-intent commands.
- Create `src-tauri/src/commands/reader_services.rs`: lookup/translation provider commands that do not expose arbitrary network proxying.
- Create `src-tauri/src/commands/sync.rs`: local sync snapshot import/export and later remote provider commands.
- Modify `src-tauri/src/commands/mod.rs` and `src-tauri/src/lib.rs`: register new command modules.
- Modify `src/lib/reader/types.ts` and `src/lib/reader/index.ts`: export new public reader feature types only after their modules exist.
- Modify `src/routes/reader/+page.svelte`: own live reader feature state and connect controllers to `ReaderStage`/`ReaderSidebar`.
- Modify `src/lib/components/reader/ReaderStage.svelte`: pass reader feature state and actions to header/viewport.
- Modify `src/lib/components/reader/ReaderHeaderBar.svelte`: add command entry points for assistance, TTS, focus aids, and parallel mode.
- Modify `src/lib/components/reader/ReaderSidebar.svelte`: add assistance/focus panels without disrupting existing TOC/search/bookmark/highlight/note tabs.
- Modify `src/lib/components/reader/ReaderViewport.svelte`: emit selection/range/context events needed by lookup, TTS, ruler, and parallel panes.
- Modify `src/routes/library/+page.svelte` only for catalog/sync entry points that must live on the library page.
- Add tests to `e2e/app.e2e.ts` for full desktop flows and to `tests/e2e/library-smoke.spec.ts` for fast web smoke flows.
- Add Rust tests next to command modules with `#[cfg(test)]` for parser/security logic.

## Task 1: P0 Exit Audit Harness

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/docs/superpowers/plans/p0-exit-audit-template.md`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0483-add-executable-readest-alignment-plan.md`

- [ ] **Step 1: Write the audit template**

Create `/Users/dev/workspace2/hc_apps/br1/docs/superpowers/plans/p0-exit-audit-template.md` with this content:

```md
# P0 Exit Audit Template

Use this template when completing `P0-0.1` in `.planning/READEST-ALIGNMENT-CHECKLIST.md`.

| Row | Verdict | Evidence | Blocking Gap | Follow-up Item |
|---|---|---|---|---|
| Multi-format open/import/reopen | BLOCKED |  |  | P0-1.1 |
| File association and trusted open | BLOCKED |  |  | P0-1.2 |
| Scroll/paginated and settings persistence | BLOCKED |  |  | P0-2.1 |
| Reader chrome/sidebar layout polish | BLOCKED |  |  | P0-2.2 |
| Search cache/history/replay/clear | BLOCKED |  |  | P0-3.1 |
| Annotations/notes/bookmarks/progress | BLOCKED |  |  | P0-3.2 |
| Library import/migration/group/filter/sort | BLOCKED |  |  | P0-4.1 |
| Library repair/remove/restore/cover/metadata | BLOCKED |  |  | P0-4.2 |

Allowed verdicts:

- `PASS`: verified and no known blocker remains.
- `SHIPPABLE_WITH_CAVEAT`: user-visible behavior is coherent, but a documented edge remains.
- `BLOCKED`: implementation or test evidence is missing.

Required verification:

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`
```

- [ ] **Step 2: Run checks**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected:

```text
svelte-check found 0 errors and 0 warnings
```

`git diff --check` prints no output.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/p0-exit-audit-template.md .planning/READEST-ALIGNMENT-CHECKLIST.md tutorials/commit/0483-add-executable-readest-alignment-plan.md
git commit -m "docs(readest-plan): add executable P0 exit audit handoff" \
  -m "Add the first worker-facing audit template so the consolidated Readest checklist can be executed without reconstructing old roadmap documents." \
  -m "Changes:
- add a P0 exit audit template with fixed verdict labels
- keep checklist status in .planning/READEST-ALIGNMENT-CHECKLIST.md
- document the planning handoff in tutorials/commit

Verification:
- pnpm -C /Users/dev/workspace2/hc_apps/br1 check (PASS)
- git -C /Users/dev/workspace2/hc_apps/br1 diff --check (PASS)

Not included:
- no feature implementation is started
- P0 items remain unchecked until real evidence is added"
```

## Task 2: P0 Multi-Format And Trusted-Open Certification

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add tutorial: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0484-certify-p0-format-and-trusted-open-coverage.md`

- [ ] **Step 1: Write failing coverage assertions**

Add a web smoke test in `tests/e2e/library-smoke.spec.ts` that loops through the known sample assets and asserts import/open/reopen user evidence:

```ts
const formatSamples = [
  { label: 'EPUB', file: 'sample-book.epub' },
  { label: 'PDF', file: 'sample-book.pdf' },
  { label: 'FB2', file: 'sample-book.fb2' },
  { label: 'MOBI', file: 'sample-book.mobi' },
  { label: 'AZW3', file: 'sample-book.azw3' },
  { label: 'CBZ', file: 'sample-book.cbz' },
  { label: 'TXT', file: 'sample-book.txt' }
];

for (const sample of formatSamples) {
  test(`opens and reopens ${sample.label} sample through the reader`, async ({ page }) => {
    await page.goto(`/reader?source=asset&path=/samples/${sample.file}&label=${sample.label}`);
    await expect(page.getByRole('main', { name: /reader stage/i })).toBeVisible();
    await expect(page.getByText(sample.label, { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('main', { name: /reader stage/i })).toBeVisible();
  });
}
```

If fixture names differ, first inspect `/Users/dev/workspace2/hc_apps/br1/static/samples` and use the actual filenames. Do not skip a format silently; if no fixture exists, add a fixture or mark the checklist item `BLOCKED` with the missing filename.

- [ ] **Step 2: Run the targeted smoke test and observe failure**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --grep "opens and reopens"
```

Expected before fixes: at least one format fails or a missing fixture is reported.

- [ ] **Step 3: Fix only the failing format/trust path**

Use the existing format helpers in `src/lib/reader/formats.ts`; do not create route-local extension lists. The supported extension list must remain consistent with `SUPPORTED_ASSOCIATED_BOOK_EXTENSIONS` in `src-tauri/src/lib.rs`.

If a Tauri file path is involved, only accept:

```rust
// Trusted source classes for book binary reads:
// 1. managed library root files
// 2. normalized associated-open paths recorded in TrustedAssociatedBookOpenPaths
// 3. normalized file-picker paths recorded in TrustedLibraryImportPaths
```

Do not add a command that reads renderer-provided arbitrary paths.

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --grep "opens and reopens"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: all commands pass.

- [ ] **Step 5: Update checklist and commit**

Mark `P0-1.1` or `P0-1.2` complete only for the evidence actually covered.

```bash
git add src lib tests e2e src-tauri .planning/READEST-ALIGNMENT-CHECKLIST.md tutorials/commit/0484-certify-p0-format-and-trusted-open-coverage.md
git commit -m "test(readest-p0): certify format and trusted-open coverage"
```

Use the full multi-line commit format from `/Users/dev/workspace2/hc_apps/AGENTS.md`.

## Task 3: P0 Reader Settings, Search, Annotation, And Library Certification

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopMaintenance.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`

- [ ] **Step 1: Write one desktop regression per P0 row**

In `e2e/app.e2e.ts`, add or extend tests with these user-visible assertions:

```ts
test('P0 settings persist across reopen', async ({ page }) => {
  await openLibrarySampleInReader(page, 'sample-book.epub');
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitemradio', { name: '滚动' }).click();
  await page.getByRole('button', { name: '回到书库' }).click();
  await reopenLastReaderBook(page);
  await expect(page.getByRole('button', { name: /滚动|更多操作/ })).toBeVisible();
});

test('P0 search cache can replay and clear current-book search', async ({ page }) => {
  await openLibrarySampleInReader(page, 'sample-book.epub');
  await page.getByRole('button', { name: '显示搜索面板' }).click();
  await page.getByRole('searchbox').fill('the');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/1 \//)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '显示搜索面板' }).click();
  await expect(page.getByText(/cache|缓存|历史/i)).toBeVisible();
  await page.getByRole('button', { name: /清除.*缓存/ }).click();
  await expect(page.getByText(/缓存已清除|cache cleared/i)).toBeVisible();
});
```

Use existing e2e helper names if they already exist. If a helper does not exist, define it once near neighboring reader helpers:

```ts
async function openLibrarySampleInReader(page: Page, filename: string) {
  await page.goto(`/reader?source=asset&path=/samples/${filename}&label=${filename}`);
  await expect(page.getByRole('main', { name: /reader stage/i })).toBeVisible();
}

async function reopenLastReaderBook(page: Page) {
  await page.getByRole('link', { name: /继续阅读|最近阅读|Continue/i }).first().click();
  await expect(page.getByRole('main', { name: /reader stage/i })).toBeVisible();
}
```

- [ ] **Step 2: Run targeted tests and record failures**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test e2e/app.e2e.ts --grep "P0"
```

Expected before fixes: failures identify missing selectors, missing helper paths, or real behavior gaps.

- [ ] **Step 3: Fix only the failing P0 row**

Rules:

- Reader settings fixes go in `src/lib/reader/settings.ts`, `ReaderHeaderBar.svelte`, `ReaderStage.svelte`, or `ReaderViewport.svelte`.
- Search fixes go in `src/lib/reader/searchController.ts`, `ReaderSidebar.svelte`, `ReaderViewport.svelte`, or `src/lib/services/readerSearchCache.ts`.
- Annotation fixes go in `src/lib/reader/notesController.ts`, `ReaderSidebar.svelte`, `ReaderViewport.svelte`, or notes/bookmarks/highlights services.
- Library fixes go in `src/lib/library/*` or `src-tauri/src/commands/library.rs`.
- Do not repair P0 by adding special-case route logic to `src/routes/reader/+page.svelte` unless the route truly owns live URL intake state.

- [ ] **Step 4: Run verification and update checklist**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test e2e/app.e2e.ts --grep "P0"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark the relevant P0 item complete in `.planning/READEST-ALIGNMENT-CHECKLIST.md` only after the targeted test passes.

## Task 4: Reader Assistance Domain Model

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerAssistance.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`

- [ ] **Step 1: Write the domain module**

Create `src/lib/reader/assistance.ts`:

```ts
export type ReaderAssistanceProvider = 'wikipedia' | 'dictionary' | 'deepl' | 'yandex';

export type ReaderLookupRequest = {
  kind: 'lookup';
  provider: 'wikipedia' | 'dictionary';
  term: string;
  language?: string;
  bookKey: string;
  cfi?: string;
  chapterLabel?: string;
};

export type ReaderTranslationRequest = {
  kind: 'translation';
  provider: 'deepl' | 'yandex';
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  bookKey: string;
  cfi?: string;
};

export type ReaderAssistanceRequest = ReaderLookupRequest | ReaderTranslationRequest;

export type ReaderAssistanceResult = {
  id: string;
  provider: ReaderAssistanceProvider;
  title: string;
  body: string;
  url?: string;
  sourceLabel?: string;
  createdAt: number;
};

export type ReaderAssistanceState = {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  activeRequest: ReaderAssistanceRequest | null;
  result: ReaderAssistanceResult | null;
  error: string;
};

export const createEmptyReaderAssistanceState = (): ReaderAssistanceState => ({
  status: 'idle',
  activeRequest: null,
  result: null,
  error: ''
});

export const normalizeAssistanceTerm = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, 240);

export const canRequestAssistanceForText = (value: string): boolean =>
  normalizeAssistanceTerm(value).length > 0;
```

- [ ] **Step 2: Export it**

Update `src/lib/reader/index.ts`:

```ts
export {
  canRequestAssistanceForText,
  createEmptyReaderAssistanceState,
  normalizeAssistanceTerm
} from './assistance';
export type {
  ReaderAssistanceProvider,
  ReaderAssistanceRequest,
  ReaderAssistanceResult,
  ReaderAssistanceState,
  ReaderLookupRequest,
  ReaderTranslationRequest
} from './assistance';
```

- [ ] **Step 3: Add a service facade stub**

Create `src/lib/services/readerAssistance.ts`:

```ts
import type {
  ReaderAssistanceRequest,
  ReaderAssistanceResult
} from '$lib/reader';

export const requestReaderAssistance = async (
  request: ReaderAssistanceRequest
): Promise<ReaderAssistanceResult> => {
  throw new Error(`Reader assistance provider is not implemented: ${request.provider}`);
};
```

Update `src/lib/services/index.ts`:

```ts
export { requestReaderAssistance } from './readerAssistance';
```

- [ ] **Step 4: Run checks**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: PASS.

- [ ] **Step 5: Commit and check off P1-1.1**

Mark `P1-1.1` complete in `.planning/READEST-ALIGNMENT-CHECKLIST.md`, fill `Done commit` after committing.

## Task 5: Wikipedia And Dictionary Lookup

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerAssistance.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/reader_services.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/mod.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`

- [ ] **Step 1: Add `assist` to sidebar tabs**

In `src/lib/reader/types.ts`, change:

```ts
export type SidebarTab = 'toc' | 'search' | 'bookmarks' | 'highlights' | 'notes';
```

to:

```ts
export type SidebarTab = 'toc' | 'search' | 'bookmarks' | 'highlights' | 'notes' | 'assist';
```

- [ ] **Step 2: Add Tauri command with domain allowlist**

Create `src-tauri/src/commands/reader_services.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderLookupRequest {
    pub(crate) provider: String,
    pub(crate) term: String,
    pub(crate) language: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderAssistanceResult {
    pub(crate) id: String,
    pub(crate) provider: String,
    pub(crate) title: String,
    pub(crate) body: String,
    pub(crate) url: Option<String>,
    pub(crate) source_label: Option<String>,
    pub(crate) created_at: u128,
}

fn normalize_term(term: &str) -> String {
    term.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[tauri::command]
pub(crate) async fn lookup_reader_term(
    request: ReaderLookupRequest,
) -> Result<ReaderAssistanceResult, String> {
    let term = normalize_term(&request.term);
    if term.is_empty() {
        return Err("lookup term is empty".to_string());
    }
    if term.len() > 240 {
        return Err("lookup term is too long".to_string());
    }

    match request.provider.as_str() {
        "wikipedia" | "dictionary" => {}
        _ => return Err("unsupported lookup provider".to_string()),
    }

    let language = request.language.unwrap_or_else(|| "en".to_string());
    let source_label = if request.provider == "wikipedia" {
        "Wikipedia"
    } else {
        "Dictionary"
    };

    Ok(ReaderAssistanceResult {
        id: format!("{}:{}:{}", request.provider, language, term),
        provider: request.provider,
        title: term.clone(),
        body: format!("{source_label} lookup is wired; network provider implementation follows in the provider slice."),
        url: None,
        source_label: Some(source_label.to_string()),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or_default(),
    })
}
```

Register it in `src-tauri/src/commands/mod.rs`:

```rust
pub(crate) mod reader_services;
```

Register the command in `src-tauri/src/lib.rs` inside `tauri::generate_handler![...]`:

```rust
commands::reader_services::lookup_reader_term
```

- [ ] **Step 3: Wire renderer facade**

Update `src/lib/services/readerAssistance.ts`:

```ts
import type {
  ReaderAssistanceRequest,
  ReaderAssistanceResult
} from '$lib/reader';
import { invokeTauri } from './platform';

export const requestReaderAssistance = async (
  request: ReaderAssistanceRequest
): Promise<ReaderAssistanceResult> => {
  if (request.kind === 'lookup') {
    return invokeTauri<ReaderAssistanceResult>('lookup_reader_term', {
      request: {
        provider: request.provider,
        term: request.term,
        language: request.language
      }
    });
  }
  throw new Error(`Reader assistance provider is not implemented: ${request.provider}`);
};
```

- [ ] **Step 4: Add sidebar UI**

Add a new `assist` branch in `ReaderSidebar.svelte` that renders:

```svelte
{#if activeTab === 'assist'}
  <section class="sidebar-panel" aria-label="阅读辅助">
    <h2>阅读辅助</h2>
    {#if assistanceState.status === 'idle'}
      <p>选中正文后可以查词、查 Wikipedia 或翻译。</p>
    {:else if assistanceState.status === 'loading'}
      <p>正在查询...</p>
    {:else if assistanceState.status === 'error'}
      <p>{assistanceState.error}</p>
    {:else if assistanceState.result}
      <article>
        <h3>{assistanceState.result.title}</h3>
        <p>{assistanceState.result.body}</p>
        {#if assistanceState.result.url}
          <a href={assistanceState.result.url} target="_blank" rel="noreferrer">打开来源</a>
        {/if}
      </article>
    {/if}
  </section>
{/if}
```

Add explicit props for `assistanceState` and actions. Do not store assistance state inside `ReaderSidebar.svelte`.

- [ ] **Step 5: Run checks and commit**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark `P1-1.2` complete only after the lookup path is visible in reader UI.

## Task 6: TTS Session Model And Web Speech V1

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerTts.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`

- [ ] **Step 1: Add TTS types**

Create `src/lib/reader/tts.ts`:

```ts
export type ReaderTtsStatus = 'unavailable' | 'idle' | 'speaking' | 'paused' | 'error';

export type ReaderTtsSessionState = {
  status: ReaderTtsStatus;
  text: string;
  voiceName: string;
  rate: number;
  error: string;
};

export const createReaderTtsSessionState = (): ReaderTtsSessionState => ({
  status: typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis ? 'idle' : 'unavailable',
  text: '',
  voiceName: '',
  rate: 1,
  error: ''
});
```

- [ ] **Step 2: Add Web Speech facade**

Create `src/lib/services/readerTts.ts`:

```ts
export type ReaderTtsSpeakOptions = {
  text: string;
  rate: number;
  voiceName?: string;
};

let currentUtterance: SpeechSynthesisUtterance | null = null;

export const canUseReaderTts = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export const speakReaderText = ({ text, rate, voiceName }: ReaderTtsSpeakOptions): Promise<void> => {
  if (!canUseReaderTts()) {
    return Promise.reject(new Error('Text-to-speech is not available on this platform'));
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return Promise.reject(new Error('No text selected for text-to-speech'));
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(normalized);
  utterance.rate = rate;
  if (voiceName) {
    const voice = window.speechSynthesis.getVoices().find((item) => item.name === voiceName);
    if (voice) utterance.voice = voice;
  }
  currentUtterance = utterance;
  return new Promise((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Text-to-speech playback failed'));
    window.speechSynthesis.speak(utterance);
  });
};

export const pauseReaderTts = () => window.speechSynthesis?.pause();
export const resumeReaderTts = () => window.speechSynthesis?.resume();
export const stopReaderTts = () => {
  currentUtterance = null;
  window.speechSynthesis?.cancel();
};
```

- [ ] **Step 3: Add header controls**

Add one button in `ReaderHeaderBar.svelte`:

```svelte
<button
  type="button"
  class:active={ttsState.status === 'speaking'}
  disabled={ttsState.status === 'unavailable'}
  aria-label={ttsState.status === 'speaking' ? '停止朗读' : '朗读选中文本'}
  title={ttsState.status === 'unavailable' ? '当前平台不支持朗读' : '朗读'}
  on:click={() => onToggleTts?.()}
>
  🔊
</button>
```

Add `ttsState` and `onToggleTts` props. Keep the old placeholder button removed.

- [ ] **Step 4: Run checks**

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark `P1-2.1` and `P1-2.2` only when the session model and Web Speech path are both wired.

## Task 7: Focus Aids And Reading Ruler

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/focusAids.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/settings.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`

- [ ] **Step 1: Add settings shape**

Create `src/lib/reader/focusAids.ts`:

```ts
export type ReaderFocusAidMode = 'off' | 'ruler' | 'line-dim';

export type ReaderFocusAidSettings = {
  mode: ReaderFocusAidMode;
  rulerLines: number;
  rulerOpacity: number;
};

export const createDefaultReaderFocusAidSettings = (): ReaderFocusAidSettings => ({
  mode: 'off',
  rulerLines: 2,
  rulerOpacity: 0.26
});
```

Extend `ReaderSettings` with:

```ts
focusAidMode: ReaderFocusAidMode;
focusRulerLines: number;
focusRulerOpacity: number;
```

Default values must match `createDefaultReaderFocusAidSettings()`.

- [ ] **Step 2: Add viewport overlay**

In `ReaderViewport.svelte`, render a non-interactive overlay when ruler mode is enabled:

```svelte
{#if settings.focusAidMode === 'ruler'}
  <div
    class="reading-ruler"
    aria-hidden="true"
    style={`--ruler-lines:${settings.focusRulerLines};--ruler-opacity:${settings.focusRulerOpacity}`}
  />
{/if}
```

Add CSS:

```css
.reading-ruler {
  pointer-events: none;
  position: absolute;
  left: 8%;
  right: 8%;
  top: 42%;
  height: calc(var(--ruler-lines) * 1.6em);
  border-radius: 999px;
  background: color-mix(in srgb, var(--reader-shell-accent) 22%, transparent);
  opacity: var(--ruler-opacity);
  box-shadow: 0 0 0 9999px color-mix(in srgb, var(--reader-shell-backdrop) 34%, transparent);
  z-index: 8;
}
```

- [ ] **Step 3: Verify**

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark `P1-2.3` after the setting persists and the overlay is visible in reader.

## Task 8: Parallel Read Surface

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/parallel.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

- [ ] **Step 1: Add parallel model**

Create `src/lib/reader/parallel.ts`:

```ts
import type { ReaderControlRequest, ReaderPreviewState } from './types';
import { createEmptyReaderPreviewState } from './types';

export type ReaderParallelPane = {
  id: 'primary' | 'secondary';
  label: string;
  controlRequest: ReaderControlRequest | null;
  preview: ReaderPreviewState;
};

export type ReaderParallelSession = {
  enabled: boolean;
  panes: [ReaderParallelPane, ReaderParallelPane];
};

export const createReaderParallelSession = (): ReaderParallelSession => ({
  enabled: false,
  panes: [
    { id: 'primary', label: '主阅读', controlRequest: null, preview: createEmptyReaderPreviewState() },
    { id: 'secondary', label: '并排阅读', controlRequest: null, preview: createEmptyReaderPreviewState() }
  ]
});
```

- [ ] **Step 2: Render two viewport panes only when enabled**

In `ReaderStage.svelte`, keep the existing single viewport as the default. Add a parallel branch:

```svelte
{#if parallelSession.enabled}
  <div class="parallel-reader-grid" aria-label="并排阅读">
    {#each parallelSession.panes as pane (pane.id)}
      <ReaderViewport
        title={pane.label}
        controlRequest={pane.controlRequest}
        {isWindowMode}
        {settings}
        {notes}
        on:readerstate={(event) => onParallelPaneState?.(pane.id, event.detail)}
      />
    {/each}
  </div>
{:else}
  <ReaderViewport
    title="阅读表面"
    {controlRequest}
    {isWindowMode}
    {settings}
    {notes}
    on:readerstate={({ detail }) => {
      readerPreview = detail;
      dispatch('readerstate', detail);
    }}
  />
{/if}
```

Add CSS:

```css
.parallel-reader-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}
```

- [ ] **Step 3: Add e2e smoke**

Add:

```ts
test('parallel read keeps two visible reader panes', async ({ page }) => {
  await page.goto('/reader?source=asset&path=/samples/sample-book.epub&label=EPUB');
  await page.getByRole('button', { name: /并排阅读|Parallel/ }).click();
  await expect(page.getByLabel('并排阅读')).toBeVisible();
  await expect(page.getByText('主阅读')).toBeVisible();
  await expect(page.getByText('并排阅读')).toBeVisible();
});
```

- [ ] **Step 4: Verify and check off**

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test e2e/app.e2e.ts --grep "parallel read"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark `P1-3.1` after the model lands; mark `P1-3.2` after the surface works.

## Task 9: OPDS / Calibre Catalog Connectors

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/catalogs.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/catalogs.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/mod.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`

- [ ] **Step 1: Add catalog types**

Create `src/lib/services/catalogs.ts`:

```ts
import { invokeTauri } from './platform';

export type CatalogSource = {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
};

export type CatalogEntry = {
  id: string;
  title: string;
  author: string;
  href: string;
  mediaType: string;
  coverHref?: string;
};

export type CatalogFeed = {
  title: string;
  entries: CatalogEntry[];
  nextHref?: string;
};

export const loadCatalogFeed = async (source: CatalogSource): Promise<CatalogFeed> =>
  invokeTauri<CatalogFeed>('load_catalog_feed', { source });
```

- [ ] **Step 2: Add Rust parser command**

Create `src-tauri/src/commands/catalogs.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSource {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) url: String,
    pub(crate) username: Option<String>,
    pub(crate) password: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogEntry {
    pub(crate) id: String,
    pub(crate) title: String,
    pub(crate) author: String,
    pub(crate) href: String,
    pub(crate) media_type: String,
    pub(crate) cover_href: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogFeed {
    pub(crate) title: String,
    pub(crate) entries: Vec<CatalogEntry>,
    pub(crate) next_href: Option<String>,
}

fn ensure_catalog_url_allowed(url: &str) -> Result<(), String> {
    let lowered = url.to_ascii_lowercase();
    if lowered.starts_with("https://") || lowered.starts_with("http://") {
        return Ok(());
    }
    Err("catalog URL must be http or https".to_string())
}

#[tauri::command]
pub(crate) async fn load_catalog_feed(source: CatalogSource) -> Result<CatalogFeed, String> {
    ensure_catalog_url_allowed(&source.url)?;
    if source.url.len() > 2048 {
        return Err("catalog URL is too long".to_string());
    }
    Ok(CatalogFeed {
        title: source.name,
        entries: Vec::new(),
        next_href: None,
    })
}

#[cfg(test)]
mod tests {
    use super::ensure_catalog_url_allowed;

    #[test]
    fn rejects_file_urls() {
        assert!(ensure_catalog_url_allowed("file:///etc/passwd").is_err());
    }

    #[test]
    fn accepts_https_urls() {
        assert!(ensure_catalog_url_allowed("https://example.com/opds").is_ok());
    }
}
```

This first command is a security scaffold. Add network fetching and `quick-xml` parsing in the next slice, not in the same commit.

- [ ] **Step 3: Verify**

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml catalogs
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark `P2-1.1` after the domain model and command boundary land. Mark `P2-1.2` only after real OPDS fixture parsing lands.

## Task 10: Translation Bridges

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerAssistance.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/reader_services.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

- [ ] **Step 1: Add provider configuration state**

Add this type to `src/lib/reader/assistance.ts`:

```ts
export type ReaderTranslationProviderConfig = {
  provider: 'deepl' | 'yandex';
  configured: boolean;
  targetLanguage: string;
};
```

- [ ] **Step 2: Add command boundary**

In `reader_services.rs`, add:

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderTranslationRequest {
    pub(crate) provider: String,
    pub(crate) text: String,
    pub(crate) target_language: String,
}

#[tauri::command]
pub(crate) async fn translate_reader_text(
    request: ReaderTranslationRequest,
) -> Result<ReaderAssistanceResult, String> {
    let text = normalize_term(&request.text);
    if text.is_empty() {
        return Err("translation text is empty".to_string());
    }
    if text.len() > 4000 {
        return Err("translation text is too long".to_string());
    }
    match request.provider.as_str() {
        "deepl" | "yandex" => {}
        _ => return Err("unsupported translation provider".to_string()),
    }
    if request.target_language.trim().is_empty() {
        return Err("target language is required".to_string());
    }
    Ok(ReaderAssistanceResult {
        id: format!("translation:{}:{}", request.provider, request.target_language),
        provider: request.provider,
        title: format!("Translation to {}", request.target_language),
        body: "Translation provider configuration is required before live translation.".to_string(),
        url: None,
        source_label: Some("Translation".to_string()),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or_default(),
    })
}
```

Register it in `generate_handler!`.

- [ ] **Step 3: Verify**

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml reader_services
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark `P2-2.1` after provider configuration exists. Mark `P2-2.2` and `P2-2.3` only after live provider calls are implemented with user-owned keys.

## Task 11: Sync Substrate And KOReader Adapter

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/sync.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/sync.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/mod.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`

- [ ] **Step 1: Add sync record model**

Create `src/lib/services/sync.ts`:

```ts
import { invokeTauri } from './platform';

export type Br1SyncRecordType = 'libraryBook' | 'readingState' | 'bookmark' | 'note' | 'highlight' | 'setting';

export type Br1SyncRecord = {
  id: string;
  type: Br1SyncRecordType;
  bookKey?: string;
  updatedAt: number;
  deletedAt?: number;
  payload: unknown;
};

export type Br1SyncSnapshot = {
  schemaVersion: 1;
  exportedAt: number;
  records: Br1SyncRecord[];
};

export const exportSyncSnapshot = async (): Promise<Br1SyncSnapshot> =>
  invokeTauri<Br1SyncSnapshot>('export_sync_snapshot');
```

- [ ] **Step 2: Add local export command**

Create `src-tauri/src/commands/sync.rs`:

```rust
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Br1SyncSnapshot {
    pub(crate) schema_version: u8,
    pub(crate) exported_at: u128,
    pub(crate) records: Vec<serde_json::Value>,
}

#[tauri::command]
pub(crate) async fn export_sync_snapshot() -> Result<Br1SyncSnapshot, String> {
    Ok(Br1SyncSnapshot {
        schema_version: 1,
        exported_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or_default(),
        records: Vec::new(),
    })
}
```

Register the module and command.

- [ ] **Step 3: Add KOReader digest mapping test before adapter implementation**

Add `#[cfg(test)]` tests in `sync.rs`:

```rust
fn normalize_koreader_document_digest(value: &str) -> Result<String, String> {
    let trimmed = value.trim().to_ascii_lowercase();
    if trimmed.len() == 32 && trimmed.chars().all(|ch| ch.is_ascii_hexdigit()) {
        Ok(trimmed)
    } else {
        Err("KOReader document digest must be a 32-character MD5 hex string".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::normalize_koreader_document_digest;

    #[test]
    fn accepts_md5_digest() {
        assert_eq!(
            normalize_koreader_document_digest("098F6BCD4621D373CADE4E832627B4F6").unwrap(),
            "098f6bcd4621d373cade4e832627b4f6"
        );
    }

    #[test]
    fn rejects_non_digest() {
        assert!(normalize_koreader_document_digest("../book.epub").is_err());
    }
}
```

- [ ] **Step 4: Verify**

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml sync
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Mark `P2-3.1` after the sync data model lands. Mark `P2-4.1` only after KOReader import/export mapping reads real fixture data.

## Task 12: Service Security Gate

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/catalogs.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/reader_services.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/sync.rs`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`

- [ ] **Step 1: Add negative tests for local file reads**

Add tests to each service command module that reject:

```rust
"file:///etc/passwd"
"../secret"
"/Users/dev/.ssh/id_rsa"
"http://127.0.0.1:1/private"
"http://localhost:1/private"
```

For catalog URLs, allow public `http` and `https`, but reject local file schemes. For translation and lookup, do not accept arbitrary URLs from the renderer at all; accept provider names and text only.

- [ ] **Step 2: Add checklist evidence**

Update `.planning/READEST-ALIGNMENT-CHECKLIST.md`:

```md
- [x] S-1 Renderer cannot turn catalog or translation commands into arbitrary network proxying
  - Done commit: <commit hash>
  - Notes: provider commands accept provider names, not renderer-provided request URLs.
```

Fill the real commit hash after committing.

- [ ] **Step 3: Verify**

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: all tests pass and `diff --check` prints no output.

## Self-Review

Spec coverage:

- P0 exit and certification are covered by Tasks 1-3.
- Lookup and in-reading assistance are covered by Tasks 4-5.
- TTS and focus aids are covered by Tasks 6-7.
- Parallel Read is covered by Task 8.
- OPDS/Calibre is covered by Task 9.
- DeepL/Yandex translation boundary is covered by Task 10.
- Sync and KOReader substrate are covered by Task 11.
- Tauri trust-boundary/security gates are covered by Task 12.

Placeholder scan:

- This plan intentionally avoids unresolved placeholder markers and open-ended edge-case instructions.
- Items that require live provider credentials are represented as explicit configuration-gated slices.

Type consistency:

- Assistance types are defined in `src/lib/reader/assistance.ts` and reused by `src/lib/services/readerAssistance.ts`.
- TTS types are defined in `src/lib/reader/tts.ts` and reused by `src/lib/services/readerTts.ts`.
- Catalog types are defined in `src/lib/services/catalogs.ts` and mirrored in `src-tauri/src/commands/catalogs.rs`.
- Sync snapshot types are defined in `src/lib/services/sync.ts` and mirrored in `src-tauri/src/commands/sync.rs`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-readest-alignment-phase-1.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.
