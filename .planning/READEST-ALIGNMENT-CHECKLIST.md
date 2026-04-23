# Readest Alignment Checklist

Last updated: 2026-04-23

## Purpose

This is the single execution plan for aligning `br1` with Readest.

Older Readest planning documents were consolidated into this checklist so the repo has one source of truth for:

- current baseline
- execution order
- completion criteria
- per-slice checkoff state
- verification evidence

When a checklist item ships, update that item from `- [ ]` to `- [x]`, fill in its done commit and verification notes, then commit the checklist update with the implementation slice.

Detailed worker handoff:

- `docs/superpowers/plans/2026-04-23-readest-alignment-phase-1.md`
- `docs/superpowers/plans/p0-exit-audit-template.md`

That handoff explains files, task order, and test commands. This checklist remains the only status ledger.

## Sources

- Current `br1` codebase and prior planning docs as of 2026-04-23
- [Readest website](https://readest.com/)
- [Readest GitHub README](https://github.com/readest/readest)

## Current Baseline

`br1` is core-reader strong and advanced/service weak.

Strong areas:

- local library import and desktop reader flow
- managed library-file reading boundary
- EPUB/PDF reopen and reading-state persistence
- growing FB2/MOBI/AZW3/CBZ/TXT support
- reader settings, search, notes, bookmarks, highlights, saved sets
- grouped library browse and library repair workflows

Main gaps against Readest:

- Dictionary / Wikipedia lookup is not implemented
- Parallel Read is not implemented
- Text-to-Speech is still a placeholder-level product signal
- Visual and focus aids are shallow compared with a complete reading-assistance surface
- OPDS / Calibre integration is not implemented
- DeepL / Yandex translation is not implemented
- cross-device sync is not implemented
- KOReader sync is not implemented

Planning consequence:

- route-closure is maintenance only
- P0 must pass an exit audit before the plan treats the local reader as complete
- P1 becomes the first product-facing main line after P0
- P2 is a real service/ecosystem line, not a vague future bucket

## Execution Rules

- Execute top to bottom unless a blocker is recorded in this file.
- Keep every slice commit-sized.
- Each shipped slice must update this checklist.
- Each shipped slice must add or update `tutorials/commit/`.
- Each shipped slice must run:
  - `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
  - `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`
- Commit messages must follow `/Users/dev/workspace2/hc_apps/AGENTS.md`.
- Do not recreate parallel roadmap, state, requirements, or feature-audit files.
- If a future workflow needs derived status, derive it from this file.

## P0 Exit Checklist

Goal: prove the local reader core is shippable before moving the main execution line to advanced reading features.

- [ ] P0-0.1 Run a P0 exit audit
  - Outcome: every P0 row is marked `PASS`, `BLOCKED`, or `SHIPPABLE_WITH_CAVEAT` inside this checklist.
  - Touches: planning docs only unless the audit exposes a blocking correctness bug.
  - Verify: `pnpm check`; `git diff --check`.
  - Done commit:
  - Notes:

- [x] P0-1.1 Certify multi-format open/import/reopen coverage
  - Outcome: EPUB, PDF, FB2, MOBI, AZW3, CBZ, and TXT each have fixture-backed import, open, return, and reopen evidence.
  - Touches: reader format contract, library import/open flow, e2e fixtures/tests.
  - Verify: `pnpm check`; targeted desktop/web format regressions; `git diff --check`.
  - Done commit: 6a71dd4
  - Notes: `tests/e2e/library-smoke.spec.ts` now loops all seven sample fixtures, including `sample-book.epub` and `sample-outline.pdf`, and confirms open/reopen state through reload.

- [x] P0-1.2 Close file-association and trusted-open evidence gaps
  - Outcome: packaged-style open-with intake, associated-open queue normalization, unsupported input rejection, and managed library-file trust boundaries are verified together.
  - Touches: Tauri open events, associated-open queue, reader route intake, desktop tests.
  - Verify: `pnpm check`; targeted associated-open regression; `git diff --check`.
  - Done commit: 26e74db
  - Notes: `e2e/app.e2e.ts` now has a targeted `certifies associated-open queue normalization and trusted-open boundaries` regression, and the startup associated-open desktop test continues to cover packaged-style intake.

- [x] P0-2.1 Certify scroll/paginated and reader settings persistence
  - Outcome: flow, typography, margins, theme, width mode, and chrome mode persist across reload/reopen for primary supported surfaces.
  - Touches: reader settings, stage/header/viewport wiring, e2e coverage.
  - Verify: `pnpm check`; targeted settings persistence regressions; `git diff --check`.
  - Done commit: 38a05da
  - Notes: `e2e/app.e2e.ts` now has `P0 settings persist across reopen`, which reopens a sample EPUB after changing flow/font/layout settings and confirms the settings still drive the real reader state.

- [ ] P0-2.2 Close remaining layout polish for reader chrome and sidebar
  - Outcome: header, footer, viewport, sidebar, PDF host, TXT paper, and foliate surfaces share consistent layout tokens and no obvious Readest-parity shell mismatch remains.
  - Touches: reader components and styles.
  - Verify: `pnpm check`; visual/source review; `git diff --check`.
  - Done commit:
  - Notes:

- [x] P0-3.1 Certify search cache, history, replay, and clearing behavior
  - Outcome: whole-book search has reliable query execution, result navigation, history replay, cache identity, cache ledger, and cache clear semantics.
  - Touches: search controller, reader sidebar, search cache service, e2e tests.
  - Verify: `pnpm check`; targeted search/cache regressions; `git diff --check`.
  - Done commit: 38a05da
  - Notes: `e2e/app.e2e.ts` now has `P0 search cache can replay and clear current-book search`, which replays a seeded current-book cache entry, restores the query, and confirms the cache file is removed after clear.

- [x] P0-3.2 Certify annotations, notes, bookmarks, and progress restore
  - Outcome: create, edit, delete, locate, persist, reopen, selection-set, and format-capability behavior are covered for the supported reader surfaces.
  - Touches: reader sidebar, reader viewport, notes/bookmarks/highlights services, e2e tests.
  - Verify: `pnpm check`; targeted annotation/bookmark/progress regressions; `git diff --check`.
  - Done commit: a6e6285
  - Notes: `e2e/app.e2e.ts` now has `P0 annotations notes bookmarks and progress restore`, which creates TXT highlights and a note, persists a bookmark, proves bookmark locate behavior, and reopens with restored progress plus the saved notes/bookmarks still present.

- [ ] P0-4.1 Certify library import, migration, grouping, filtering, and sorting
  - Outcome: library management can be treated as a complete local bookshelf workflow rather than an import launcher.
  - Touches: library surface, desktop catalog/projection modules, library tests.
  - Verify: `pnpm check`; targeted library workflow regressions; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P0-4.2 Certify library repair, remove, restore, cover, and metadata workflows
  - Outcome: destructive and recovery flows preserve user data, respect trusted paths, and surface clear recovery states.
  - Touches: Tauri library commands, library maintenance modules, desktop tests.
  - Verify: `pnpm check`; targeted repair/remove/restore regressions; `git diff --check`.
  - Done commit:
  - Notes:

## P1 Advanced Reading Experience

Goal: close the user-visible Readest gaps that live inside the reading experience.

- [ ] P1-1.1 Add the reader assistance domain model
  - Outcome: typed lookup/assistance request, result, provider, loading, empty, and error states exist outside route files.
  - Touches: reader types, reader services facade, assistance controller.
  - Verify: `pnpm check`; unit/source review; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-1.2 Implement Wikipedia lookup
  - Outcome: selected text or current term can trigger a Wikipedia lookup with success, empty, offline, and error states.
  - Touches: assistance service, reader sidebar or bridge panel, reader selection wiring.
  - Verify: `pnpm check`; mocked/fixture provider test; targeted reader UI regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-1.3 Add dictionary lookup through the same assistance interface
  - Outcome: dictionary lookup uses the same reader assistance workflow instead of a separate UI path.
  - Touches: provider abstraction, lookup UI, tests.
  - Verify: `pnpm check`; provider fallback test; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-2.1 Replace the TTS placeholder with a real session model
  - Outcome: reader tracks unavailable, idle, speaking, paused, and error states with start, pause, resume, and stop actions.
  - Touches: reader types, reader workspace/stage controls, TTS controller.
  - Verify: `pnpm check`; source-level availability review; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-2.2 Implement system/Web Speech TTS v1
  - Outcome: supported platforms can read selected text or current passage aloud, and unsupported platforms get an explicit disabled state.
  - Touches: TTS service, reader controls, e2e-safe fallback tests.
  - Verify: `pnpm check`; targeted TTS state regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-2.3 Add visual and focus aids
  - Outcome: reading ruler, paragraph or line focus, and persisted focus-aid settings exist as real reader features.
  - Touches: reader settings, viewport overlay, header/sidebar controls.
  - Verify: `pnpm check`; visual/source review; targeted persistence regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-2.4 Run an accessibility hardening pass
  - Outcome: keyboard navigation, focus states, ARIA labels, reduced-motion behavior, and screen-reader basics are explicitly audited and fixed.
  - Touches: reader chrome, sidebar, library actions where needed.
  - Verify: `pnpm check`; keyboard/manual audit notes; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-3.1 Add the parallel-read session model
  - Outcome: two reader panes can be represented with independent source, navigation, progress, and loading state.
  - Touches: reader types, route/control model, reader workspace shell.
  - Verify: `pnpm check`; source-level model review; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-3.2 Implement the first parallel-read surface
  - Outcome: users can open two panes side by side without breaking existing single-reader workflows.
  - Touches: reader workspace/stage/viewport composition, reader navigation, e2e tests.
  - Verify: `pnpm check`; targeted parallel-reader regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P1-3.3 Add code syntax highlighting
  - Outcome: code blocks in reader content have an explicit highlighting path and do not rely only on browser defaults.
  - Touches: reader content injection or renderer styling boundary, dependencies if required, tests/fixtures.
  - Verify: `pnpm check`; code-block fixture regression; bundle/source review; `git diff --check`.
  - Done commit:
  - Notes:

## P2 Services And Ecosystem

Goal: turn Readest service and ecosystem features into concrete `br1` capabilities without weakening desktop trust boundaries.

- [ ] P2-1.1 Add the catalog connector domain model
  - Outcome: catalog sources, entries, pagination, search, auth/error states, and import intents are typed before any UI expansion.
  - Touches: service types, Tauri command model, library service facade.
  - Verify: `pnpm check`; Rust check if dependencies change; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-1.2 Implement OPDS parsing and browsing
  - Outcome: OPDS fixture feeds can be listed, paged, searched, and converted into safe import intents.
  - Touches: Tauri catalog command/module, parser tests, library catalog UI.
  - Verify: `pnpm check`; Rust parser tests; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-1.3 Add Calibre-compatible catalog flow
  - Outcome: Calibre OPDS or compatible catalog sources can be configured and browsed through the same catalog surface.
  - Touches: catalog source settings, auth/connectivity states, tests.
  - Verify: `pnpm check`; fixture/manual catalog regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-2.1 Add translation provider configuration
  - Outcome: DeepL/Yandex provider settings are stored locally and missing-key states are visible; no service key is bundled.
  - Touches: settings service, Tauri/service boundary, reader UI.
  - Verify: `pnpm check`; provider-config regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-2.2 Implement DeepL translation bridge
  - Outcome: selected text or paragraph translation works through a provider abstraction with quota/key/network failure states.
  - Touches: translation service, reader assistance UI, tests.
  - Verify: `pnpm check`; mocked provider test; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-2.3 Implement Yandex translation bridge
  - Outcome: Yandex uses the same translation request/result workflow as DeepL.
  - Touches: translation provider, config UI, tests.
  - Verify: `pnpm check`; mocked provider test; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-3.1 Add the sync substrate data model
  - Outcome: library metadata, reading state, bookmarks, notes, highlights, and settings have exportable/importable sync records and stable ids.
  - Touches: sync types, persistence services, conflict model.
  - Verify: `pnpm check`; sync fixture tests; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-3.2 Implement local sync snapshot import/export
  - Outcome: users can create and restore a local sync snapshot before remote providers exist.
  - Touches: Tauri sync commands, service facade, library/settings UI.
  - Verify: `pnpm check`; snapshot round-trip regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-3.3 Add the first remote sync provider
  - Outcome: a provider-backed sync path exists with explicit offline, conflict, and retry semantics.
  - Touches: sync provider abstraction, Tauri network/service boundary, tests.
  - Verify: `pnpm check`; mocked provider sync regression; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-4.1 Add KOReader import/export mapping
  - Outcome: KOReader-compatible progress and annotation data can map into and out of the sync substrate without becoming the core model.
  - Touches: ecosystem adapter module, sync mapping tests.
  - Verify: `pnpm check`; KOReader fixture round-trip; `git diff --check`.
  - Done commit:
  - Notes:

- [ ] P2-4.2 Add KOReader sync workflow
  - Outcome: users can run a visible KOReader sync/import/export flow with conflict reporting.
  - Touches: adapter UI, sync services, tests.
  - Verify: `pnpm check`; adapter workflow regression; `git diff --check`.
  - Done commit:
  - Notes:

## Service Security Gate

These checks apply to every P2 service slice.

- [ ] S-1 Renderer cannot turn catalog or translation commands into arbitrary network proxying
  - Done commit:
  - Notes:

- [ ] S-2 Renderer cannot use service flows to read arbitrary local files
  - Done commit:
  - Notes:

- [ ] S-3 Long-lived provider credentials are not stored in renderer-only state
  - Done commit:
  - Notes:

- [ ] S-4 Network and filesystem failures produce product-level error states, not silent failures
  - Done commit:
  - Notes:

## Completion Log

Use this log when completing each item.

| Date | Item | Commit | Verification | Notes |
|---|---|---|---|---|
