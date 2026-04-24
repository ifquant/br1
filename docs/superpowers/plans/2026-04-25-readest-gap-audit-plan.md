# Readest Gap Audit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the current `br1` Tauri + Svelte implementation against the local `readest` implementation and produce a prioritized gap list that can directly drive the next alignment plan.

**Architecture:** This is an audit-only plan. It does not change product code. The output is one durable gap list document under `.planning/` with category-by-category findings, source evidence from both repos, and recommended follow-on execution slices. The checklist remains the status ledger; this plan is only the audit handoff.

**Tech Stack:** Local source reading across `br1` SvelteKit + Tauri and `readest` Next.js + Tauri, repo-local markdown artifacts, shell inspection with `rg`, `sed`, and `git`.

---

## Scope Check

This audit covers the user-visible parity frontier plus adjacent product-support surfaces:

- library product surface
- reader shell and sidebar workspace
- ecosystem / desktop support surfaces that are already part of Readest’s product story

This audit does not:

- reopen closed trust-boundary work unless a current gap depends on it
- re-audit low-level parser correctness already covered by prior slices
- prescribe code changes inline

## File Structure

- Create: `/Users/dev/workspace2/hc_apps/br1/docs/superpowers/plans/2026-04-25-readest-gap-audit-plan.md`
- Create: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-GAP-LIST.md`
- Modify: no product code files

## Task 1: Freeze The Audit Scope

**Files:**
- Read: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Read: `/Users/dev/workspace2/hc_apps/br1/docs/superpowers/plans/2026-04-25-readest-reader-parity-wave-plan.md`

- [x] **Step 1: Read the current parity ledger**

Run:

```bash
sed -n '1,260p' /Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md
```

Expected: confirm `P0-P3` are closed, `P4` is current, and prior baseline text is not reused as the new gap list.

- [x] **Step 2: Read the current reader wave plan**

Run:

```bash
sed -n '1,260p' /Users/dev/workspace2/hc_apps/br1/docs/superpowers/plans/2026-04-25-readest-reader-parity-wave-plan.md
```

Expected: confirm what is already being executed so the audit does not mislabel active P4 work as “undiscovered gap.”

## Task 2: Audit Library Surface Gaps

**Files:**
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/page.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/LibraryHeader.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/ImportMenu.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/Bookshelf.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/BookItem.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/BackupWindow.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/MigrateDataWindow.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/TransferQueuePanel.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/SettingsMenu.tsx`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`

- [x] **Step 1: Capture Readest library product surfaces**

Read the files above and list concrete user-visible library surfaces that Readest exposes:

- header controls
- import variants
- shelf/card/list behavior
- backup / restore / migration / transfer queue / settings operations

- [x] **Step 2: Capture current br1 library coverage**

Read the `br1` library route and library components above and list:

- already matched behavior
- partial equivalents
- completely missing surfaces

- [x] **Step 3: Record library gaps with evidence**

For each gap, include:

- `Gap`
- `Readest evidence`
- `br1 evidence`
- `Impact`
- `Recommended follow-on slice`

## Task 3: Audit Reader Surface Gaps

**Files:**
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/page.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/HeaderBar.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/footerbar/FooterBar.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/sidebar/SideBar.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/notebook/Notebook.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/notebook/AIAssistant.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTextTranslation.ts`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTTSControl.ts`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useReadwiseSync.ts`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/KOSyncSettings.tsx`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.ts`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/koreaderSync.ts`

- [x] **Step 1: Map Readest reader workspaces and support panels**

Extract the visible workspaces:

- header / footer / shell
- sidebar
- notebook
- AI assistant
- translation / TTS / progress sync / Readwise

- [x] **Step 2: Map current br1 reader coverage**

Extract the current `br1` equivalents:

- shell chrome
- sidebar tabs
- assist / TTS / parallel / sync / notes

- [x] **Step 3: Record reader gaps with evidence**

Use the same `Gap / Readest evidence / br1 evidence / Impact / Recommended slice` structure.

## Task 4: Audit Ecosystem And Desktop Support Gaps

**Files:**
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/opds/page.tsx`
- Read: `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/opds/components/*` (only the files needed to understand the visible product shape)
- Read: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/catalogs.rs`
- Read: `/Users/dev/workspace2/hc_apps/br1/src/lib/services/catalogs.ts`
- Read: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/sync_snapshot.rs`
- Read: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/remote_sync.rs`
- Read: `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/koreader_remote_sync.rs`

- [x] **Step 1: Identify shipped-but-unexposed support surfaces**

Decide whether `br1` already has lower-level substrate that lacks Readest-like product surfacing.

- [x] **Step 2: Record ecosystem gaps with evidence**

Focus on product-visible deltas, not just protocol completeness.

## Task 5: Write The Gap List

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-GAP-LIST.md`

- [x] **Step 1: Write the gap list with this structure**

```md
# Readest Gap List

Date: 2026-04-25

## Audit Method

## Confirmed Strengths

## Gaps By Category

### Library
| Priority | Gap | Readest evidence | br1 evidence | Impact | Recommended slice |

### Reader
| Priority | Gap | Readest evidence | br1 evidence | Impact | Recommended slice |

### Ecosystem / Desktop
| Priority | Gap | Readest evidence | br1 evidence | Impact | Recommended slice |

## Recommended Next Planning Inputs

## Explicitly Out Of Scope
```

- [x] **Step 2: Verify the audit artifact is syntactically clean**

Run:

```bash
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: no output.

## Execution Notes

Completed on 2026-04-25 by source-reading both local repos:

- `br1`: current checklist, current reader wave plan, library route/components, reader route/components, assistance/TTS modules, catalog services, and Tauri command surfaces
- `readest`: library page/components, reader page/components, notebook/AI assistant, translation/TTS/Readwise hooks, KOReader settings, and OPDS browser/catalog manager

Primary output:

- `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-GAP-LIST.md`

Audit conclusion:

- `P3` library homepage parity is substantially closed and should now be treated as a regression-sensitive baseline, not the main roadmap
- the biggest remaining deltas are productized desktop/library support surfaces, reader workspace depth, and ecosystem surfaces that exist in Readest as first-class UI rather than only substrate
