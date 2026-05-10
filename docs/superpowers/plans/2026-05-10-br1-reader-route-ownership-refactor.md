# Br1 Reader Route Ownership Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current reader route owner into smaller explicit seams so `src/routes/reader/+page.svelte` stops owning route parsing, per-book persistence, translation/TTS ownership, and workspace orchestration all in one file.

**Architecture:** Keep the reader route as the top-level product owner, but move the heavy state families behind pure TypeScript controllers/helpers with narrow inputs and outputs. The route should still coordinate Svelte stores, preview/control callbacks, and child components, but persistence decoding, workspace-mode resolution, and translated/source playback ownership should become separately testable modules. This plan deliberately stays on the frontend reader line only; the large `src-tauri/src/commands/library.rs` split is a separate follow-up plan.

**Tech Stack:** SvelteKit 5, Svelte components, TypeScript, existing `src/lib/reader/*` helpers, Playwright smoke tests, `pnpm check`.

---

## Scope Check

The comment pass made two major refactor candidates obvious:

- `src/routes/reader/+page.svelte` is the biggest active ownership hotspot at 3073 lines and contains multiple current-book persistence families, route-state overrides, workspace navigation, and translated/source playback handoff logic.
- `src-tauri/src/commands/library.rs` is the biggest backend hotspot at 2295 lines and mixes import, repair, trusted-path, and associated-open concerns.

These are independent subsystems and should not be forced into one refactor plan. This document covers only the **reader route ownership extraction**. The backend command split should be planned separately after this line lands.

## File Structure

New files introduced by this refactor:

- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/workspaceMode.ts`
  - Owns route-to-workspace resolution, dedicated tab routing, and notebook surface mode helpers.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/currentBookPersistence.ts`
  - Owns current-book localStorage key derivation plus typed parse/serialize helpers for translation/TTS ownership, config, and live snapshots.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/translationOwnership.ts`
  - Owns follow-current vs pinned translation source state, archived/live provenance preference, and translated-body snapshot normalization.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/ttsOwnership.ts`
  - Owns follow-current vs locked TTS target state, read-aloud mode state, translated owner selection, and mini-bar-level ownership summaries.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/currentBookPersistence.test.ts`
  - Covers persistence parsing and bad-data fallback behavior without Svelte route setup.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/translationOwnership.test.ts`
  - Covers translation owner resolution, archived/live fallback rules, and snapshot normalization.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/ttsOwnership.test.ts`
  - Covers TTS owner resolution, read-aloud mode restore, and translated-owner restore ordering.

Existing files modified by this refactor:

- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
  - Shrink route ownership to coordination glue; remove inline parse/restore/persist logic that belongs in the new helpers.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
  - Export the new helper surfaces.
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
  - Keep existing focused restore/playback contracts aligned with the extracted helpers.

## Refactor Target

The current route has four distinct state families that should stop being handwritten inline:

1. **Current-book storage keys and persistence**
   - `notesStorageKey`, `bookmarksStorageKey`, `assistanceHistoryStorageKey`, `translationOwnershipStorageKey`, `ttsOwnershipStorageKey`, `translatedTtsLiveSnapshotStorageKey`, and related parse/persist helpers.
2. **Translation-mode ownership**
   - `translationFollowsCurrentSource`, `pinnedTranslationSource`, `translationTargetLanguage`, `translationProvider`, `translationLiveSnapshot`, archive/live provenance restore.
3. **TTS ownership**
   - `ttsFollowsCurrentLocation`, `pinnedTtsTarget`, `ttsReadAloudTextMode`, `translatedTtsOwner`, `translatedTtsLiveSnapshot`, effective target selection.
4. **Workspace mode resolution**
   - notebook tab vs dedicated workspace mode vs route-owned workspace query semantics.

The route should remain the top-level coordinator, but these state families should be represented as reusable pure helpers so later UI and backend refactors stop adding more branches into one `.svelte` file.

## Task 1: Extract Current-Book Persistence Helpers

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/currentBookPersistence.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/currentBookPersistence.test.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`

- [ ] **Step 1: Write the persistence helper tests**

Add tests for:
- key derivation per `readerBookKey`
- null return on malformed JSON
- removal behavior when payload is empty/invalid
- current-book isolation between two different book keys

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
```

Expected: FAIL until the helper exports exist and the route compiles against them.

- [ ] **Step 2: Implement `currentBookPersistence.ts`**

Move these responsibilities out of `+page.svelte`:
- storage key derivation for translation/TTS/assistance families
- parse/serialize helpers for JSON-backed persisted state
- tiny write-through helpers that accept `Storage | undefined`

Keep the helper pure:
- no Svelte imports
- no route parsing
- no `window` assumptions

- [ ] **Step 3: Rewire the route to use the persistence helper**

Replace inline key construction and parse/persist helpers in `+page.svelte` with imports from `currentBookPersistence.ts`.

Keep behavior identical:
- explicit route overrides still win
- same-book restore still wins over global defaults
- malformed payloads still clear themselves

- [ ] **Step 4: Run focused verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation ownership for the same book across reload|reader restores dedicated tts ownership for the same book across reload"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/dev/workspace2/hc_apps/br1 add src/lib/reader/currentBookPersistence.ts src/lib/reader/currentBookPersistence.test.ts src/lib/reader/index.ts src/routes/reader/+page.svelte
git -C /Users/dev/workspace2/hc_apps/br1 commit -m "refactor(reader-persistence): extract current-book storage helpers"
```

## Task 2: Extract Translation Ownership

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/translationOwnership.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/translationOwnership.test.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`

- [ ] **Step 1: Write translation ownership tests**

Cover:
- follow-current vs pinned source selection
- route-owned archive selection beating ambient restore only when explicit
- live translation snapshot reuse only when source text still matches
- archived provenance restoring provider/language when route does not specify them

- [ ] **Step 2: Implement the ownership helper**

Move out of `+page.svelte`:
- source normalization
- live/archived translation panel result derivation
- current-book restore fallback ordering for target language/provider/live snapshot

The helper should expose plain functions that the route can call from `$:` blocks.

- [ ] **Step 3: Rewire `+page.svelte`**

Replace ad hoc inline branches around:
- `translationFollowsCurrentSource`
- `pinnedTranslationSource`
- `translationLiveSnapshot`
- `liveTranslationPanelResult`
- archived translation provenance fallback

with imported helper calls.

- [ ] **Step 4: Run focused verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores live translation snapshots for the same book across reload|reader restores current-book archived translation provenance across reload|reader restores dedicated translation mode config per book across reload"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/dev/workspace2/hc_apps/br1 add src/lib/reader/translationOwnership.ts src/lib/reader/translationOwnership.test.ts src/lib/reader/index.ts src/routes/reader/+page.svelte
git -C /Users/dev/workspace2/hc_apps/br1 commit -m "refactor(reader-translation): extract translation ownership state"
```

## Task 3: Extract TTS Ownership

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/ttsOwnership.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/ttsOwnership.test.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`

- [ ] **Step 1: Write TTS ownership tests**

Cover:
- follow-current vs locked target restore
- per-book read-aloud mode restore
- translated owner restore preferring live snapshot when appropriate
- archive owner continuing to point at selected translation archive
- waiting-state summaries remaining stable when live translated text is missing

- [ ] **Step 2: Implement `ttsOwnership.ts`**

Move out of `+page.svelte`:
- TTS ownership parse/restore glue
- translated owner resolution
- translated live snapshot reuse
- compact playback summary helpers that depend only on TTS ownership inputs

- [ ] **Step 3: Rewire the route**

Replace inline branches around:
- `ttsFollowsCurrentLocation`
- `pinnedTtsTarget`
- `ttsReadAloudTextMode`
- `translatedTtsOwner`
- `translatedTtsLiveSnapshot`
- `effectiveTtsTarget`

with imported helper calls.

- [ ] **Step 4: Run focused verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated tts ownership for the same book across reload|reader restores dedicated tts read-aloud mode per book across reload|reader preserves live translated tts ownership over archive selection across reload|reader restores live translated tts snapshot over archive selection across reload"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/dev/workspace2/hc_apps/br1 add src/lib/reader/ttsOwnership.ts src/lib/reader/ttsOwnership.test.ts src/lib/reader/index.ts src/routes/reader/+page.svelte
git -C /Users/dev/workspace2/hc_apps/br1 commit -m "refactor(reader-tts): extract tts ownership state"
```

## Task 4: Extract Workspace Mode Resolution

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/workspaceMode.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

- [ ] **Step 1: Add focused assertions before refactor**

Add or tighten focused route/workspace assertions for:
- `workspace=translation` reopening dedicated translation mode
- `workspace=tts&tts=translated` reopening dedicated translated TTS
- switching from translation mode into translated TTS preserving the dedicated workspace contract
- collapsing back into notes clearing dedicated workspace route state

- [ ] **Step 2: Implement the workspace-mode helper**

Move out of `+page.svelte`:
- notebook tab vs dedicated workspace mapping
- route override precedence
- helper functions that decide whether dedicated modes should stay open or collapse back to notebook tabs

- [ ] **Step 3: Rewire the route**

Replace ad hoc mode branches with helper calls and keep `goto(...)` coordination in the route.

- [ ] **Step 4: Run focused verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader restores dedicated tts read-aloud mode from route state in web mode|reader can jump from translation mode into translated tts in web mode"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/dev/workspace2/hc_apps/br1 add src/lib/reader/workspaceMode.ts src/lib/reader/index.ts src/routes/reader/+page.svelte tests/e2e/library-smoke.spec.ts
git -C /Users/dev/workspace2/hc_apps/br1 commit -m "refactor(reader-workspace): extract dedicated workspace mode resolution"
```

## Task 5: Final Reader Route Sweep

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

- [ ] **Step 1: Remove dead inline helpers and reorder imports**

Delete any route-local helpers that became redundant after extraction, and group imports so ownership families are obvious to future readers.

- [ ] **Step 2: Verify the route is materially smaller**

Measure:

```bash
wc -l /Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte
```

Expected: the route should be materially smaller than the current 3073 lines and should no longer contain hand-written JSON parse/persist helpers for current-book state.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation ownership for the same book across reload|reader restores dedicated tts ownership for the same book across reload|reader restores live translation snapshots for the same book across reload|reader preserves live translated tts ownership over archive selection across reload|reader restores dedicated translation and tts modes from route state in web mode|reader can jump from translation mode into translated tts in web mode"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git -C /Users/dev/workspace2/hc_apps/br1 add src/routes/reader/+page.svelte src/lib/reader/index.ts src/lib/reader/currentBookPersistence.ts src/lib/reader/currentBookPersistence.test.ts src/lib/reader/translationOwnership.ts src/lib/reader/translationOwnership.test.ts src/lib/reader/ttsOwnership.ts src/lib/reader/ttsOwnership.test.ts src/lib/reader/workspaceMode.ts tests/e2e/library-smoke.spec.ts
git -C /Users/dev/workspace2/hc_apps/br1 commit -m "refactor(reader-route): split current-book ownership out of the reader route"
```

## Not In This Plan

- Splitting `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`
- Reworking `ReaderAssistWorkspace.svelte` or `ReaderNotebook.svelte` visual structure beyond what route extraction requires
- Replacing localStorage persistence with a different storage backend
- Cross-book archive replay or payload-heavy deep-link state

## Self-Review

Spec coverage:
- The plan directly targets the largest current refactor hotspot: `src/routes/reader/+page.svelte`.
- It splits the work into four independent state families plus a final sweep, which matches the code ownership clusters visible in the route today.
- The backend `library.rs` hotspot is explicitly acknowledged and intentionally deferred into a separate plan so this refactor does not blur frontend and desktop concerns.

Placeholder scan:
- No `TBD`, `TODO`, or “implement later” placeholders remain.
- Every task names exact files, concrete verification commands, and commit points.

Type consistency:
- The new modules consistently use the ownership-family names introduced in the route today: `currentBookPersistence`, `translationOwnership`, `ttsOwnership`, and `workspaceMode`.
- Verification targets remain aligned with the existing smoke names that already exercise these contracts.
