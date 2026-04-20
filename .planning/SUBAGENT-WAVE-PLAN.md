# br1 Subagent Wave Plan

Last updated: 2026-04-20

## Purpose

This document is the execution contract for parallel subagent work on `br1`.

It exists to prevent the current Readest-parity closeout from degenerating into merge conflicts around:

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`
- `/Users/dev/workspace2/hc_apps/br1/tutorials/commit`

The split is by write ownership, not by equal feature count.

## Orchestrator-Only Paths

Subagents must not edit:

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`
- `/Users/dev/workspace2/hc_apps/br1/tutorials/commit`

The orchestrator owns:

- integration
- targeted regressions
- parity-audit updates
- tutorials
- final commits

## Worker Ownership

### Worker A: P0-2 Reader Settings

Owns:

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

Goal:

- close `Scroll/Page View Modes`
- close `Customize Font and Layout`

Targeted verification contract:

- `pnpm check`
- one settings-focused webdriver grep selected by the orchestrator

### Worker B: P0-4 Library Management

Owns:

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`

Goal:

- close `Library Management`

Targeted verification contract:

- `pnpm check`
- one library-focused smoke or webdriver grep selected by the orchestrator

### Worker C: P0-1 Multi-format and Open-With

Owns:

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/tauri.conf.json`
- `/Users/dev/workspace2/hc_apps/br1/static/samples`

Goal:

- close `Multi-Format Support`
- close `File Association and Open With`

Targeted verification contract:

- `cargo check --manifest-path src-tauri/Cargo.toml`
- one multi-format or open-with webdriver grep selected by the orchestrator

### Worker D: P0-3 Search and Annotation Productization

Owns:

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/notesController.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/searchController.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerSearchCache.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerNotes.ts`

Restrictions:

- does not start in Wave 1
- does not edit `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte` unless the orchestrator explicitly transfers ownership after Worker A completes

Goal:

- close `Full-Text Search`
- close `Annotations and Highlighting`

Targeted verification contract:

- `pnpm check`
- one search/highlights-focused smoke or webdriver grep selected by the orchestrator

## Wave Sequence

### Wave 0

Do:

- lock ownership
- freeze orchestrator-only paths
- define worker-level verification contracts

Do not:

- treat this wave as product feature delivery

Exit gate:

- Worker A/B/C can start without ambiguity

### Wave 1

Start:

- Worker A
- Worker B
- Worker C

Do not start:

- Worker D

Exit gate:

- each worker lands one complete slice in its owned area
- orchestrator integrates and commits once

### Wave 2

Start:

- Worker D
- Worker B
- Worker C

Precondition:

- Worker A has completed its current slice
- ownership of `ReaderViewport.svelte` is no longer contested

Exit gate:

- Worker D lands one search/highlights slice
- orchestrator integrates and commits once

### Wave 3

Start:

- Worker D
- whichever of Worker B or Worker C still owns the weakest remaining P0 row

Exit gate:

- P0 rows are ready for closeout review against `FEATURE-PARITY-AUDIT.md`

## Prompt Contract For All Subagents

Every subagent prompt must include these rules:

1. You own only the listed write scope.
2. You are not alone in the codebase and must not revert other work.
3. You must not edit orchestrator-only paths.
4. You must produce a runtime patch, not just analysis.
5. You must report:
   - files changed
   - targeted verification run
   - remaining gap

## Notes For The Orchestrator

- Treat `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts` as the desktop focused-regression hub.
- Treat `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts` as the web smoke hub.
- Keep worker-level checks narrow.
- Run broader integration checks only after collecting subagent output.
