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

- [x] P0-0.1 Run a P0 exit audit
  - Outcome: every P0 row is marked `PASS`, `BLOCKED`, or `SHIPPABLE_WITH_CAVEAT` inside this checklist.
  - Touches: planning docs only unless the audit exposes a blocking correctness bug.
  - Verify: `pnpm check` (PASS); `git diff --check` (PASS).
  - Done commit: c14966a
  - Notes: P0 has no `BLOCKED` row. The local reader core is shippable for the Phase 1 baseline, with one documented layout caveat: P0-2.2 is source/static certified but not screenshot-regression certified.

  | Row | Verdict | Evidence | Blocking Gap | Follow-up Item |
  |---|---|---|---|---|
  | Multi-format open/import/reopen | PASS | `6a71dd4`; `tests/e2e/library-smoke.spec.ts` loops EPUB, PDF, FB2, MOBI, AZW3, CBZ, and TXT sample fixtures through open/reopen evidence. | None. | P0-1.1 |
  | File association and trusted open | PASS | `26e74db`; associated-open queue normalization, startup open-with intake, trusted library-file open, and untrusted renderer-path rejection are covered by desktop regressions. | None. | P0-1.2 |
  | Scroll/paginated and settings persistence | PASS | `38a05da`; `P0 settings persist across reopen` reopens a sample EPUB after changing flow, typography, margins, theme, width, and chrome settings. | None. | P0-2.1 |
  | Reader chrome/sidebar layout polish | SHIPPABLE_WITH_CAVEAT | `e3f5b83`; shared window-shell width and edge tokens now align header, footer, viewport, pinned sidebar, overlay sidebar, and PDF/TXT/foliate host surfaces. | No functional blocker; visual edge-case drift at unusual window sizes remains possible because this slice used source/static certification only. | P0-2.2 |
  | Search cache/history/replay/clear | PASS | `38a05da`; `P0 search cache can replay and clear current-book search` verifies replay, query restoration, cache identity, and clear semantics. | None. | P0-3.1 |
  | Annotations/notes/bookmarks/progress | PASS | `a6e6285`; `P0 annotations notes bookmarks and progress restore` creates TXT highlights/notes/bookmarks, locates via bookmark, and reopens with restored progress. | None. | P0-3.2 |
  | Library import/migration/group/filter/sort | PASS | `83d5932`; `P0 library import migration grouping filtering and sorting` covers sample import, format sorting, format grouping, format filtering, and reuses the existing Readest migration banner/notice regression. | None. | P0-4.1 |
  | Library repair/remove/restore/cover/metadata | PASS | `add8f96`; `P0 library repair remove restore cover and metadata` anchors cover/repair trust safety and reuses existing remove/undo, row repair, bulk repair, and metadata persistence regressions. | None. | P0-4.2 |

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

- [x] P0-2.2 Close remaining layout polish for reader chrome and sidebar
  - Outcome: header, footer, viewport, sidebar, PDF host, TXT paper, and foliate surfaces share consistent layout tokens and no obvious Readest-parity shell mismatch remains.
  - Touches: reader components and styles.
  - Verify: `pnpm check`; visual/source review; `git diff --check`.
  - Done commit: e3f5b83
  - Notes: normalized window-shell width and edge tokens across header, footer, viewport, and sidebar; removed the sidebar's extra window-mode vertical margin so pinned/overlay chrome lines up with the reader stage. Inspected PDF/TXT/foliate window surfaces and found no remaining shell-token drift after the sidebar margin fix.

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

- [x] P0-4.1 Certify library import, migration, grouping, filtering, and sorting
  - Outcome: library management can be treated as a complete local bookshelf workflow rather than an import launcher.
  - Touches: library surface, desktop catalog/projection modules, library tests.
  - Verify: `pnpm check` (PASS); `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "P0 library import migration grouping filtering and sorting"` (PASS); `git diff --check` (PASS).
  - Done commit: 83d5932
  - Notes: `e2e/app.e2e.ts` now has `P0 library import migration grouping filtering and sorting`, which drives the persisted sample records through format sorting, format grouping, and metadata-driven filtering. The Readest migration evidence still comes from `reports Readest migration outcomes through the library banner and notice flow`.

- [x] P0-4.2 Certify library repair, remove, restore, cover, and metadata workflows
  - Outcome: destructive and recovery flows preserve user data, respect trusted paths, and surface clear recovery states.
  - Touches: Tauri library commands, library maintenance modules, desktop tests.
  - Verify: `pnpm check` (PASS); `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "P0 library repair remove restore cover and metadata"` (PASS); `git diff --check` (PASS).
  - Done commit: add8f96
  - Notes: `e2e/app.e2e.ts` now has `P0 library repair remove restore cover and metadata`, which consolidates trusted cover loading and repair-preview safety into one grep-friendly certification anchor while reusing the existing dedicated repair, undo, remove/restore, and metadata-edit coverage for the remaining legs.

## P1 Advanced Reading Experience

Goal: close the user-visible Readest gaps that live inside the reading experience.

- [x] P1-1.1 Add the reader assistance domain model
  - Outcome: typed lookup/assistance request, result, provider, loading, empty, and error states exist outside route files.
  - Touches: reader types, reader services facade, assistance controller.
  - Verify: `pnpm check`; unit/source review; `git diff --check`.
  - Done commit: 51154a8
  - Notes: domain model and renderer-safe facade stub added; lookup and translation UI wiring remain for P1-1.2+

- [x] P1-1.2 Implement Wikipedia lookup
  - Outcome: selected text or current term can trigger a Wikipedia lookup with success, empty, offline, and error states.
  - Touches: assistance service, reader sidebar or bridge panel, reader selection wiring.
  - Verify: `pnpm check` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `cargo test --manifest-path src-tauri/Cargo.toml --lib` (PASS); `git diff --check` (PASS).
  - Done commit: 2ac7972
  - Notes: Wikipedia lookup now goes through a Tauri MediaWiki Action API bridge with server-side allowlisted URL construction, and the reader sidebar has an `assist` tab plus header shortcut that seeds from the current selection or chapter title. No desktop e2e lookup run was added in this slice; live lookup still depends on desktop runtime and network availability.

- [x] P1-1.3 Add dictionary lookup through the same assistance interface
  - Outcome: dictionary lookup uses the same reader assistance workflow instead of a separate UI path.
  - Touches: provider abstraction, lookup UI, tests.
  - Verify: `pnpm check`; provider fallback test; `git diff --check`.
  - Done commit: 0494
  - Follow-up: 0495 keeps the Wikipedia/dictionary provider chips visibly selected and exposes pressed state to assistive technology.
  - Notes: dictionary lookup now goes through the shared assistance facade and the same assist panel term input, with server-side `dictionaryapi.dev` URL construction and Rust coverage for the English-only normalization/formatting path.

- [x] P1-2.1 Replace the TTS placeholder with a real session model
  - Outcome: reader tracks unavailable, idle, speaking, paused, and error states with start, pause, resume, and stop actions.
  - Touches: reader types, reader workspace/stage controls, TTS controller.
  - Notes: the model/control split now exists in `src/lib/reader/tts.ts`; the header button reflects the current session state, but the controller still treats the engine as unavailable and surfaces that explicitly instead of faking speech. Tutorial: `tutorials/commit/0496-replace-the-reader-tts-placeholder-with-a-session-model.md`.
  - Verify: `pnpm check`; source-level availability review; `git diff --check`.
  - Done commit: 0496
  - Notes: this was the model-only slice; P1-2.2 now wires it to a browser speech runtime.

- [x] P1-2.2 Implement system/Web Speech TTS v1
  - Outcome: supported platforms can read selected text or current passage aloud, and unsupported platforms get an explicit disabled state.
  - Touches: TTS service, reader controls, e2e-safe fallback tests.
  - Verify: `pnpm check`; targeted TTS state regression; `git diff --check`.
  - Done commit: 0497
  - Notes: selected text now speaks through `speechSynthesis` first; if no selection exists, the reader falls back to a conservative chapter title or book title seed and labels that path as a safe fallback instead of pretending to extract full passage text.

- [x] P1-2.3 Add visual and focus aids
  - Outcome: reading ruler, paragraph or line focus, and persisted focus-aid settings exist as real reader features.
  - Touches: reader settings, viewport overlay, header/sidebar controls.
  - Verify: `pnpm check`; visual/source review; targeted persistence regression; `git diff --check`.
  - Done commit: 0498
  - Notes: this v1 adds a persisted reading ruler plus a line/paragraph focus band in the viewport overlay, with no paragraph detection or foliate DOM rewriting.

- [x] P1-2.4 Run an accessibility hardening pass
  - Outcome: keyboard navigation, focus states, ARIA labels, reduced-motion behavior, and screen-reader basics are explicitly audited and fixed.
  - Touches: reader chrome, sidebar, library actions where needed.
  - Verify: `pnpm check`; keyboard/manual audit notes; `git diff --check`.
  - Done commit: 0499
  - Notes: added explicit focus-visible rings for reader chrome, sidebar controls, the route-level resize/bridge buttons, reduced-motion fallbacks for window-mode chrome, and live-region status output for TTS plus reader open/error status.

- [x] P1-3.1 Add the parallel-read session model
  - Outcome: two reader panes can be represented with independent source, navigation, progress, and loading state.
  - Touches: reader types, route/control model, reader workspace shell.
  - Verify: `pnpm check`; source-level model review; `git diff --check`.
  - Done commit: 0500
  - Notes: added `src/lib/reader/parallel.ts` with primary/secondary pane state, route-derived session creation, pane preview/control updates, and active-pane switching; the route now keeps a single-pane session anchor in sync without rendering a second viewport. Tutorial: `tutorials/commit/0500-add-the-parallel-read-session-model.md`.

- [x] P1-3.2 Implement the first parallel-read surface
  - Outcome: users can open two panes side by side without breaking existing single-reader workflows.
  - Touches: reader workspace/stage/viewport composition, reader navigation, e2e tests.
  - Verify: `pnpm check`; targeted parallel-reader regression; `git diff --check`.
  - Done commit: 0501
  - Notes: added a route-level toggle that clones the current primary source into a second `ReaderStage`, keeps primary and secondary control requests separate, and stacks the panes on narrow screens while splitting them side by side when there is room. Tutorial: `tutorials/commit/0501-add-the-first-parallel-read-surface.md`.

- [x] P1-3.3 Add code syntax highlighting
  - Outcome: code blocks in reader content have an explicit highlighting path and do not rely only on browser defaults.
  - Touches: reader content injection or renderer styling boundary, dependencies if required, tests/fixtures.
  - Verify: `pnpm check`; code-block fixture regression; bundle/source review; `git diff --check`.
  - Done commit: 0502
  - Notes: added a lightweight local tokenizer/styling path, apply it to foliate-rendered documents on content load, and use fenced-code parsing for TXT fallback fixtures without changing ordinary TXT rendering. Tutorial: `tutorials/commit/0502-add-reader-code-syntax-highlighting.md`.

## P2 Services And Ecosystem

Goal: turn Readest service and ecosystem features into concrete `br1` capabilities without weakening desktop trust boundaries.

- [x] P2-1.1 Add the catalog connector domain model
  - Outcome: catalog sources, entries, pagination, search, auth/error states, and import intents are typed before any UI expansion.
  - Touches: service types, Tauri command model, library service facade.
  - Verify: `pnpm check` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `git diff --check` (PASS).
  - Done commit: 0503
  - Notes: added renderer-safe catalog status and import-intent model/facade plus matching Tauri command model stubs; OPDS/Calibre parsing, browsing, auth handling, and network fetching remain deferred to P2-1.2/P2-1.3. Tutorial: `tutorials/commit/0503-add-the-catalog-connector-domain-model.md`.

- [x] P2-1.2 Implement OPDS parsing and browsing
  - Outcome: OPDS fixture feeds can be listed, paged, searched, and converted into safe import intents.
  - Touches: Tauri catalog command/module, parser tests, library catalog UI.
  - Verify: `pnpm check` (PASS); `cargo test --manifest-path src-tauri/Cargo.toml catalogs` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `git diff --check` (PASS).
  - Done commit: 0504
  - Notes: added bundled OPDS fixture sources, allowlisted page browsing, local search filtering, import-intent conversion, parser tests, and renderer-safe service functions; renderer input cannot trigger arbitrary URL fetching. Tutorial: `tutorials/commit/0504-implement-fixture-backed-opds-and-calibre-catalogs.md`.

- [x] P2-1.3 Add Calibre-compatible catalog flow
  - Outcome: Calibre OPDS or compatible catalog sources can be configured and browsed through the same catalog surface.
  - Touches: catalog source settings, auth/connectivity states, tests.
  - Verify: `pnpm check` (PASS); `cargo test --manifest-path src-tauri/Cargo.toml catalogs` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `git diff --check` (PASS).
  - Done commit: 0505
  - Notes: added Tauri-owned user catalog source settings, normalized/persisted OPDS and Calibre-compatible source metadata, auth-required connectivity states, configured fixture browsing through the same catalog parser/search/import flow, and explicit unsupported states for live URLs without adding arbitrary network fetch/proxy behavior. Tutorial: `tutorials/commit/0505-complete-calibre-compatible-catalog-settings.md`.

- [x] P2-2.1 Add translation provider configuration
  - Outcome: DeepL/Yandex provider settings are stored locally and missing-key states are visible; no service key is bundled.
  - Touches: settings service, Tauri/service boundary, reader UI.
  - Verify: `pnpm check`; provider-config regression; `git diff --check`.
  - Done commit: 0506, 0507
  - Notes: Tauri now owns reader translation provider status storage for DeepL/Yandex, renderer reads only redacted configuration/status summaries, configured state is derived from local provider key presence rather than renderer input, and the assist sidebar shows missing-key states without bundling or exposing service keys. Translation requests still short-circuit because the actual bridge is not wired yet. Tutorial: `tutorials/commit/0506-add-tauri-owned-reader-translation-provider-status.md`; hardening follow-up: `tutorials/commit/0507-derive-reader-translation-config-from-local-keys.md`.

- [x] P2-2.2 Implement DeepL translation bridge
  - Outcome: selected text or paragraph translation works through a provider abstraction with quota/key/network failure states.
  - Touches: translation service, reader assistance UI, tests.
  - Verify: `node --test --experimental-strip-types src/lib/reader/assistance.test.mjs`; `pnpm check`; `cargo test --manifest-path src-tauri/Cargo.toml`; `cargo check --manifest-path src-tauri/Cargo.toml`; `git diff --check`.
  - Done commit: 0508
  - Notes: reader assistance now routes translation requests through a Tauri-owned `translate_reader_assistance` command, DeepL endpoint selection is server-side allowlisted (`api.deepl.com` / `api-free.deepl.com`) based on the local key, missing-key/offline/quota-auth-config-success states are mapped explicitly, and the assist sidebar can translate the current selection or fall back to the current chapter/title text without exposing a renderer-controlled proxy URL. Tutorial: `tutorials/commit/0508-implement-reader-deepl-translation-bridge.md`.

- [x] P2-2.3 Implement Yandex translation bridge
  - Outcome: Yandex uses the same translation request/result workflow as DeepL.
  - Touches: translation provider, config UI, tests.
  - Verify: `node --test --experimental-strip-types src/lib/reader/assistance.test.mjs`; `pnpm check`; `cargo test --manifest-path src-tauri/Cargo.toml`; `cargo check --manifest-path src-tauri/Cargo.toml`; `git diff --check`.
  - Done commit: 0509
  - Notes: Yandex now rides the same `translate_reader_assistance` Tauri command and reader assist result state as DeepL, the sidebar translation mode exposes both providers through the same existing chip row, and Tauri derives Yandex auth (`Api-Key` or `Bearer`) plus required `folderId` from local env only. Missing local auth/folder config, offline failures, auth/config failures, and rate/quota-style failures are surfaced as explicit states without adding a generic proxy or renderer-controlled URL. Tutorial: `tutorials/commit/0509-implement-reader-yandex-translation-bridge.md`.

- [x] P2-3.1 Add the sync substrate data model
  - Outcome: library metadata, reading state, bookmarks, notes, highlights, and settings have exportable/importable sync records and stable ids.
  - Touches: sync types, persistence services, conflict model.
  - Verify: `pnpm check` (PASS); `pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/sync/model.test.js` (PASS); `git diff --check` (PASS).
  - Done commit: this commit
  - Notes: added `src/lib/sync` with explicit record envelopes for library metadata, reading state, bookmarks, notes, highlights workspace, and persisted reader settings; stable record ids are derived from durable book ids or hashed persisted store keys without changing existing product writes. Import/export UI, snapshot file commands, conflict resolution flow, and any migration of timestamp-based per-item annotation ids remain deferred to P2-3.2+.

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

- [x] S-1 Renderer cannot turn catalog or translation commands into arbitrary network proxying
  - Done commit: 0505
  - Notes: catalog commands only; user-configured http/https OPDS URLs are persisted as source metadata but browsing returns an explicit unsupported product state unless the source maps to an allowlisted bundled fixture page, so renderer input still cannot trigger live arbitrary URL fetching.

- [ ] S-2 Renderer cannot use service flows to read arbitrary local files
  - Done commit:
  - Notes:

- [x] S-3 Long-lived provider credentials are not stored in renderer-only state
  - Done commit: 0505
  - Notes: catalog commands only; the renderer-facing catalog settings input stores only auth kind, required/configured booleans, and labels/redacted presence metadata. No password/token/cookie secret value is accepted or persisted by the catalog source settings command.

- [x] S-4 Network and filesystem failures produce product-level error states, not silent failures
  - Done commit: 0505
  - Notes: catalog commands only; invalid settings files, source settings write failures, unsupported live URLs, auth-required sources, and non-allowlisted page hrefs return `CatalogErrorState` or source connectivity states instead of silently dropping failures.

## Completion Log

Use this log when completing each item.

| Date | Item | Commit | Verification | Notes |
|---|---|---|---|---|
