# Readest Gap-Driven Parallel Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 2026-04-25 Readest gap audit into the next executable `br1` mainline, with parallel-safe waves that close the biggest remaining product gaps instead of reopening already-closed library homepage or trust-boundary work.

**Architecture:** Treat the new gap list as the product truth, and keep `.planning/READEST-ALIGNMENT-CHECKLIST.md` as the only status ledger. Execution now splits into three explicit lines:

- `P5` reader workspace parity
- `P6` library operations and desktop support
- `P7` catalog and ecosystem productization

Parallelism rule:

- `P5` and `P6` can run in parallel when they touch disjoint write sets.
- `P7` should wait for the first `P6` catalog-entry/library-menu decisions, because the catalog browser needs a stable library operations entry point.
- Within `P5`, notebook shell work and translation/TTS deeper behavior should not land in the same commit unless they share one unavoidable contract.

**Tech Stack:** SvelteKit 5, Tauri 2, TypeScript, Svelte components, Rust command modules, Playwright web smoke, WebDriverIO desktop checks where dialog/menu/runtime behavior is desktop-specific.

---

## Scope Check

This plan is intentionally gap-driven. It does not:

- reopen file trust-boundary work unless a new slice exposes a concrete regression
- relitigate the already-closed `P3` library homepage baseline
- expand KOReader protocol scope beyond the currently explicit product contract

This plan does:

- move `br1` from “feature-rich reader/sidebar” to “intentional Readest-style reader workspaces”
- move `br1` from “bookshelf + hidden desktop powers” to “desktop reading product with visible operational surfaces”
- move OPDS/catalog support from substrate to real product UI

## File Structure

- Read: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-GAP-LIST.md`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/docs/superpowers/plans/2026-04-25-readest-gap-driven-parallel-plan.md`
- Future code slices will mainly touch:
  - `src/lib/components/reader/*`
  - `src/lib/components/library/*`
  - `src/routes/library/*`
  - `src/routes/opds/*` or equivalent new route area
  - `src/lib/services/catalogs.ts`
  - `src-tauri/src/commands/*` only when a product slice needs a bounded desktop-side capability

## Phase Order

### P5 Reader Workspace Parity

Target outcome: the reader stops feeling like one large sidebar and starts feeling like a multi-workspace reading product.

#### P5-1 Notebook workspace shell

**Files:**

- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Add or modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook*.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Test: focused reader smoke or desktop regression

- [ ] **Step 1: carve notebook shell out of the current sidebar accumulation**

Target:

- reading TOC/search/bookmarks can stay sidebar-grade
- note/highlight work becomes notebook-grade
- notebook gets explicit visible/open/pinned state instead of piggybacking on one sidebar tab

- [ ] **Step 2: add one focused regression**

Expected proof:

- reader can open notebook without collapsing normal navigation/search usage
- notebook can be dismissed/pinned cleanly
- existing notes/highlights remain reachable through the new shell

- [ ] **Step 3: verify and document**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Plus one targeted reader regression.

#### P5-2 AI assistant workspace

**Files:**

- Modify: notebook workspace files from `P5-1`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts`
- Add or modify: assistant workspace components
- Test: focused source/state regression

- [ ] **Step 1: keep the existing lookup/translation substrate, but lift AI into a notebook workspace**

Target:

- do not regress Wikipedia/dictionary/translation provider behavior
- add a real assistant workspace contract instead of another sidebar result panel

- [ ] **Step 2: split “lookup” from “conversation/workspace”**

Target:

- ordinary term lookup remains lightweight
- AI reading assistant gets its own workspace/state framing

- [ ] **Step 3: verify and document**

Run the shared checks plus one targeted reader-assistant regression.

#### P5-3 Translation mode and TTS productization

**Files:**

- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.ts`
- Add or modify: dedicated translation/TTS helpers

- [ ] **Step 1: translation becomes a reading mode, not only a request panel**

Target:

- visible translated-reading surface
- explicit source/translated visibility rules
- no renderer-controlled provider or network regression

- [ ] **Step 2: TTS becomes a product reading mode**

Target:

- follow current reading location more intentionally
- media-session/back-to-current-location semantics get first-class behavior
- translated/source reading semantics stop being ad hoc

- [ ] **Step 3: verify and document**

Use focused reader regressions rather than giant end-to-end suites.

### P6 Library Operations And Desktop Support

Target outcome: the library becomes a complete desktop reading hub, not only a bookshelf and sync launcher.

#### P6-1 Library operations menu/dialog system

**Files:**

- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts`
- Add: library operation dialog components as needed
- Possibly modify bounded Tauri commands if a missing operation is already implicit but not surfaced

- [ ] **Step 1: define one intentional library operations surface**

Target actions:

- backup / restore
- library root migration
- metadata refresh
- desktop-only operations such as fullscreen or always-on-top only if they belong in the library product surface

- [ ] **Step 2: keep operation ownership desktop-side**

Target:

- dialogs and filesystem picks remain Tauri-owned
- renderer only receives summaries/results

- [ ] **Step 3: verify and document**

Use `pnpm check`, `git diff --check`, and one focused desktop/library regression if a new dialog flow lands.

#### P6-2 Transfer queue and desktop support affordances

**Files:**

- Modify or add: library support components
- Possibly add queue/state projection files under `src/lib/library`

- [ ] **Step 1: expose transfer/queue state as a product surface**

Target:

- ongoing import/download/sync work becomes inspectable
- errors/retries are not hidden in transient notices only

- [ ] **Step 2: fold remaining desktop support affordances into the same visible system**

Target:

- updater/profile/desktop support actions stop being scattered or absent

### P7 Catalog And Ecosystem Productization

Target outcome: the existing OPDS/Calibre substrate becomes a visible desktop browsing feature.

#### P7-1 Catalog manager

**Files:**

- Add: a dedicated Svelte route or equivalent surfaced library area for catalog management
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/catalogs.ts`
- Modify: library routing/entry points as needed

- [ ] **Step 1: expose saved catalog sources as a real product area**

Target:

- saved catalogs
- fixture/user-configured sources
- auth-required/unsupported/offline states presented intentionally

#### P7-2 Catalog browser

**Files:**

- Add: catalog browsing/search/import UI
- Reuse: existing Tauri catalog browse/search/import-intent commands

- [ ] **Step 1: add page browse/search/import UX on top of the existing safe substrate**

Target:

- no new renderer-controlled URL fetching
- import flows continue through Tauri-owned intent boundaries

## Recommended Parallel Execution

Wave A:

- `P5-1` notebook workspace shell
- `P6-1` library operations menu/dialog system

Wave B:

- `P5-2` AI assistant workspace
- `P6-2` transfer queue and desktop support affordances

Wave C:

- `P5-3` translation mode and TTS productization
- `P7-1` catalog manager

Wave D:

- `P7-2` catalog browser

## Verification Standard

Every shipped slice must still include:

- checklist update
- `tutorials/commit/`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

Prefer one focused regression per slice over broad re-runs of unstable suites.

## Commit Discipline Reminder

Use the multi-line commit format from `/Users/dev/workspace2/hc_apps/AGENTS.md`.

For planning-only commits, be explicit that the change:

- redefines the active parity line
- points to the new audit-derived plan
- does not include product code changes
