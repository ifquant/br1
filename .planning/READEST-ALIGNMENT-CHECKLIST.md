# Readest Alignment Checklist

Last updated: 2026-04-25

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

`br1` has closed the first Readest alignment line for reader capabilities and service/ecosystem groundwork.

Strong areas:

- local library import and desktop reader flow
- managed library-file reading boundary
- EPUB/PDF reopen and reading-state persistence
- growing FB2/MOBI/AZW3/CBZ/TXT support
- reader settings, search, notes, bookmarks, highlights, saved sets
- grouped library browse and library repair workflows
- reader assistance: Wikipedia, dictionary, DeepL, and Yandex translation
- reader TTS, visual/focus aids, parallel read, and code highlighting
- OPDS / Calibre catalog integration through Tauri-owned boundaries
- local snapshot sync, Readest Cloud sync substrate, and KOReader exchange/progress sync
- transactional local/remote snapshot restore hardening

Main gaps against Readest:

- library product parity is still uneven: header/search density, card hierarchy, section semantics, and overall shelf behavior are not yet intentionally aligned as one product surface
- continue reading / recent reading are implemented but not yet closed as a stable Readest-style homepage workflow
- Readest local library migration exists, but its “compatibility vs reimport” semantics are still not explicit enough as a product experience
- official KOReader parity is closed only for exchange plus progress-only remote sync; bookmark/annotation remote sync remains intentionally out of scope
- the service/security hardening line is strong, but it is no longer the main user-visible parity frontier

Planning consequence:

- route-closure is maintenance only
- P0, P1, and P2 are functionally closed as the first Readest alignment line
- the next main execution line should shift back to user-visible library product parity
- new parity work should prefer visible library workflow/visual slices over deeper sync/provider expansion unless a new correctness blocker appears

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
  - Done commit: f481f3a
  - Notes: added `src/lib/sync` with explicit record envelopes for library metadata, reading state, bookmarks, notes, highlights workspace, and persisted reader settings; stable record ids are derived from durable book ids or hashed persisted store keys without changing existing product writes. Import/export UI, snapshot file commands, conflict resolution flow, and any migration of timestamp-based per-item annotation ids remain deferred to P2-3.2+.

- [x] P2-3.2 Implement local sync snapshot import/export
  - Outcome: users can create and restore a local sync snapshot before remote providers exist.
  - Touches: Tauri sync commands, service facade, library/settings UI.
  - Verify: `pnpm check` (PASS); `cargo check` (PASS); `cargo test` (PASS, includes sync snapshot round-trip/apply regression); `git diff --check` (PASS).
  - Done commit: 0511
  - Notes: added Tauri-owned save/open dialog commands plus snapshot file parsing and apply helpers under `src-tauri/src/commands/sync_snapshot.rs`; wired minimal export/import actions into the existing library header menu instead of adding a new page; export builds a versioned sync snapshot from library metadata, reading state, bookmarks, notes, highlights workspace, and reader settings; import restores the persisted library/bookmark/note/highlight shapes and applies reader settings back into local storage with explicit success/error notices.

- [x] P2-3.3 Add the first remote sync provider
  - Outcome: a provider-backed sync path exists with explicit offline, conflict, and retry semantics.
  - Touches: sync provider abstraction, Tauri network/service boundary, tests, library sync actions.
  - Verify: `pnpm check` (PASS); `pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/sync/model.test.js .tmp-sync-tests/src/lib/sync/remote.test.js` (PASS); `cargo test --manifest-path src-tauri/Cargo.toml remote_sync` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `git diff --check` (PASS).
  - Done commit: 00d5fd1
  - Notes: added a first `readestCloud` remote provider on top of the snapshot substrate through a Tauri-owned `run_remote_sync` HTTP bridge. Renderer never supplies the remote URL; Tauri derives `BR1_READEST_CLOUD_SYNC_BASE_URL`, `BR1_READEST_CLOUD_SYNC_LIBRARY_ID`, and `BR1_READEST_CLOUD_SYNC_TOKEN` from local desktop env only, then talks to one provider-owned endpoint family. The library header now exposes minimal `Push` / `Pull` actions. Push refuses to overwrite a diverged remote snapshot and returns an explicit conflict state; pull restores the remote snapshot through the existing local apply path. Missing-config, offline, retryable failure, conflict, success, and empty-remote states all surface as product notices instead of getting collapsed into generic thrown errors.

- [x] P2-3.4 Make snapshot restore transactional and keep remote pull on restore-level validation
  - Outcome: local snapshot restore and `readestCloud` pull now apply a whole restore set together or leave local state unchanged, and remote payload acceptance stays tied to the same restore-level validation gate as local restore instead of drifting back to a weaker JSON-only check.
  - Touches: shared restore/apply helpers under `src-tauri/src/commands/sync_snapshot.rs` and `src-tauri/src/commands/remote_sync.rs`, plus minimal library notice wiring.
  - Verify: `cargo test --manifest-path src-tauri/Cargo.toml sync_snapshot` (PASS); `cargo test --manifest-path src-tauri/Cargo.toml remote_sync` (PASS); `pnpm check` (PASS); `git diff --check` (PASS).
  - Done commit: d8695f8
  - Notes: the shared snapshot apply roots now execute as a rollback-backed file mutation plan across `library.json`, bookmarks, notes, and highlights workspace files. That means local snapshot restore and Readest Cloud pull now share the same transactional write boundary instead of relying on partial directory clears and sequential writes.

- [x] P2-4.1 Add KOReader import/export mapping
  - Outcome: KOReader-compatible progress and annotation data can map into and out of the sync substrate without becoming the core model.
  - Touches: ecosystem adapter module, sync mapping tests.
  - Verify: `pnpm check` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/sync/koreader.test.js` (PASS); `git diff --check` (PASS).
  - Done commit: 5d7f1bf
  - Notes: added a pure `src/lib/sync/koreader.ts` adapter that keeps KOReader-only hashes, xpointers, page numbers, and annotation style/color metadata inside the ecosystem edge instead of introducing new core sync record kinds. The first slice covers KOReader book-config progress mapping through `reading-state` plus annotation/bookmark round-trips through the existing `notes` and `bookmarks` records, with fixture coverage that explicitly drops deleted KOReader entries and keeps page-progress handling best-effort until the visible workflow slice.

- [x] P2-4.2 Add KOReader sync workflow
  - Outcome: users can run a visible KOReader sync/import/export flow with conflict reporting.
  - Touches: adapter UI, sync services, tests.
  - Verify: `pnpm check` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/sync/koreader.test.js .tmp-sync-tests/src/lib/services/koreaderSync.test.js` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `git diff --check` (PASS).
  - Done commit: ea2ad10
  - Notes: added a visible library-menu KOReader exchange workflow on top of the adapter slice instead of jumping straight to remote KOReader protocol wiring. Export now writes a Tauri-owned `br1-koreader-sync-*.json` exchange document built from the current sync snapshot; import opens the same kind of document through a Tauri dialog, merges only uniquely matched books back into the current snapshot, and skips missing, ambiguous, or locally newer books with explicit conflict counts in the resulting notice instead of hard-stopping the whole import.

- [x] P2-4.3 Add KOReader server-backed progress sync
  - Outcome: users can manually push and pull KOReader reading progress against a configured KOReader server without turning the renderer into a generic network proxy.
  - Touches: KOReader remote command, sync service merge helpers, library menu wiring, tests.
  - Verify: `pnpm check` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/services/koreaderSync.test.js .tmp-sync-tests/src/lib/sync/koreader.test.js` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `git diff --check` (PASS).
  - Done commit: affd7a2
  - Notes: added a dedicated Tauri-owned `run_koreader_remote_sync` command that authenticates with fixed KOReader endpoint families and env-owned credentials, then wires manual push/pull actions into the existing library menu. Push only emits reading progress payloads; pull only merges reading-state records, skips ambiguous hashes and locally newer records, and leaves annotation remote sync explicitly out of scope for this slice.

- [x] P2-4.4 Normalize KOReader remote progress semantics
  - Outcome: KOReader remote progress sync now speaks locator/page semantics instead of leaking `br1` UI progress labels into the protocol.
  - Touches: KOReader progress projection/merge helpers, desktop sync notices, tests.
  - Verify: `pnpm check` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/services/koreaderSync.test.js .tmp-sync-tests/src/lib/sync/koreader.test.js` (PASS); `git diff --check` (PASS).
  - Done commit: 2e104d1
  - Notes: corrected the first remote-progress slice so push now prefers KOReader-compatible locators or page values and skips unsupported local-only positions like `txt:` pseudo-locators, while pull maps remote locator values back into `progressLocation` and keeps `br1` display progress as a percentage/page label. This keeps the KOReader wire contract closer to Readest instead of serializing raw UI text.

- [x] P2-4.5 Add reader-side XCFI conversion substrate
  - Outcome: `br1` now has a checked-in CFI/XPointer conversion utility layer that future KOReader reader-sync work can call directly.
  - Touches: reader substrate utilities, exports, targeted tests.
  - Verify: `pnpm check` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/reader/xcfi.test.js .tmp-sync-tests/src/lib/services/koreaderSync.test.js .tmp-sync-tests/src/lib/sync/koreader.test.js` (PASS); `git diff --check` (PASS).
  - Done commit: 50f8f10
  - Notes: ported the Readest `XCFI` converter into `src/lib/reader/xcfi.ts` with `extractSpineIndex`, bidirectional conversion helpers, and XPointer normalization. This slice is intentionally substrate-only: it exposes the conversion layer to `br1` without yet wiring live reader progress or notes persistence through it.

- [x] P2-4.6 Persist KOReader-compatible reader locators alongside local progress
  - Outcome: EPUB reader progress persistence now keeps a KOReader-facing locator in parallel with the existing local reopen CFI so remote sync can export the right wire value without breaking `br1` resume semantics.
  - Touches: reader viewport state emission, reader persistence/update flow, sync substrate records, KOReader sync projection, targeted tests.
  - Verify: `pnpm check` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/reader/xcfi.test.js .tmp-sync-tests/src/lib/services/koreaderSync.test.js .tmp-sync-tests/src/lib/sync/koreader.test.js .tmp-sync-tests/src/lib/sync/model.test.js` (PASS); `git diff --check` (PASS).
  - Done commit: 183e574
  - Notes: `ReaderViewport` now converts live EPUB CFIs into normalized KOReader XPointers asynchronously and emits them as a separate `koreaderProgressLocation`, while the route still persists the original `progressLocation` for local reopen. The new field is carried through `LibraryBookRecord`, sync `reading-state`, Readest import, and KOReader remote projection so push prefers the KOReader locator and pull preserves it without overwriting the reader's own CFI resume path.

- [x] P2-4.7 Persist KOReader annotation and bookmark metadata in local reader state
  - Outcome: locally created highlights, notes, and bookmarks can keep KOReader-compatible locator metadata so later exchange/remote annotation sync does not have to reconstruct that data from lossy CFI-only state.
  - Touches: reader selection emission, reader notes/bookmarks controllers, Tauri reader note/bookmark schema, KOReader sync adapter, targeted tests.
  - Verify: `pnpm check` (PASS); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/reader/xcfi.test.js .tmp-sync-tests/src/lib/services/koreaderSync.test.js .tmp-sync-tests/src/lib/sync/koreader.test.js .tmp-sync-tests/src/lib/sync/model.test.js` (PASS); `git diff --check` (PASS).
  - Done commit: 924cb06
  - Notes: `ReaderSelectionState`, `ReaderNote`, and `ReaderBookmark` now have an explicit optional `koreader` metadata lane instead of forcing KOReader data to hide in sync-only adapter casts. `ReaderViewport` resolves KOReader XPointers for live selections, note/highlight creation persists that locator metadata, bookmark creation persists the current KOReader progress locator, and Tauri note/bookmark JSON now round-trips the same optional metadata shape without breaking old files.

- [x] P2-4.8 Lock KOReader remote sync to the official progress-only contract
  - Outcome: the UI and desktop notices no longer imply that the official `koreader/koreader-sync-server` can sync annotations or bookmarks; remote KOReader actions are explicitly scoped to progress only.
  - Touches: library KOReader remote action copy, desktop KOReader remote notices, checklist/tutorial.
  - Verify: `pnpm check` (PASS); `git diff --check` (PASS).
  - Done commit: 121d6f8
  - Notes: after re-checking the official KOSync server boundary, this slice intentionally stops short of inventing a non-standard annotation protocol. The KOReader remote actions are now labeled as reading-progress actions, and the UI points users to KOReader exchange files for bookmark/annotation transfer until a different server/provider slice exists.

- [x] P2-4.9 Repair the KOReader locator split across exchange and remote pull
  - Outcome: KOReader-facing xpointer values now stay in `koreaderProgressLocation`, while `progressLocation` continues to serve local br1 reopen semantics.
  - Touches: KOReader sync model helpers, exchange export/import, remote pull merge logic, targeted tests.
  - Verify: `pnpm check` (PASS); `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test .tmp-sync-tests/src/lib/reader/xcfi.test.js .tmp-sync-tests/src/lib/services/koreaderSync.test.js .tmp-sync-tests/src/lib/sync/koreader.test.js .tmp-sync-tests/src/lib/sync/model.test.js` (PASS); `git diff --check` (PASS).
  - Done commit: 57424d5
  - Notes: this slice closes the merge blocker found during final review: exchange export/import and KOReader remote pull were still routing KOReader locators back through `progressLocation`. The fix preserves a compatibility fallback for older records that only have `progressLocation`, but when both fields exist `koreaderProgressLocation` now wins and local resume CFI stays untouched.

### P2-4 Closeout

- Status: `P2-4` is functionally closed for the official KOReader parity surface currently implemented in `br1`.
- Included:
  - KOReader exchange import/export for progress, bookmarks, and annotations
  - official KOSync server-backed reading progress push/pull
  - reader-side CFI/XPointer substrate plus persisted KOReader locator/annotation metadata
- Explicitly not included:
  - remote bookmark/annotation sync over official `koreader/koreader-sync-server`
  - any invented non-standard remote annotation protocol layered on top of official KOSync
- Merge implication:
  - this phase is now in a merge-reviewable state because the protocol boundary is explicit instead of half-implied.

## P3 Library Product Parity

Goal: close the remaining user-visible Readest gaps that now mainly live in the library homepage, shelf semantics, and local-library compatibility experience.

- [x] P3-1.1 Align the library top toolbar and search behavior
  - Outcome: the library header becomes the single real control surface for search, import entry, view-mode switching, and overflow actions instead of sharing those responsibilities with shelf-local preview controls.
  - Touches: `src/lib/components/library/LibraryHeader.svelte`, `src/lib/components/library/BookshelfPreview.svelte`, `src/routes/library/+page.svelte`, focused library smoke coverage.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test /Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"` (PASS).
  - Done commit: this commit
  - Notes: the header now owns the visible import entry, search clear action, and search/filter status summary; the shelf-level import tile and shelf-local view-mode echo were removed so the library control surface stops competing with the body. Grouped-browse trail/pivot/sibling navigation remains in the body for now and is intentionally deferred because that path still needs a dedicated header-side rethreading slice.

- [ ] P3-1.2 Align library cards, covers, metadata, and status density
  - Outcome: grid/list cards, import tile, and section cards use a more intentional Readest-style hierarchy for cover ratio, title/author line breaks, progress/state chips, and action affordances.
  - Touches: `src/lib/components/library/BookshelfPreview.svelte`, `src/lib/components/library/ContinueReadingShelf.svelte`, any shared library card model/types needed for visual cleanup.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`; manual visual review against current Readest.
  - Notes: do not treat this as generic CSS cleanup. The purpose is to tighten product hierarchy, remove bridge/debug feeling, and make grid/list semantics feel like one system.

- [ ] P3-1.3 Align library sort, filter, section, and scroll behavior
  - Outcome: search, shelf sections, view-mode changes, and library scrolling follow explicit product rules instead of implementation-convenient defaults.
  - Touches: `src/routes/library/+page.svelte`, library projection/controller helpers, section composition, scroll container wiring, focused library behavior tests.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`; focused library workflow regression if section semantics move.
  - Notes: this slice should settle how search affects sections, how view-mode switches preserve context, and whether current scroll behavior still exposes obvious Readest drift.

- [ ] P3-2.1 Productize continue reading and recent reading
  - Outcome: homepage sections for `continue reading` and `recent reading` have stable inclusion, ordering, limits, empty-state, and completed-book rules that users can predict.
  - Touches: `src/lib/components/library/ContinueReadingShelf.svelte`, `src/routes/library/+page.svelte`, library state/projection helpers, focused library section tests.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`; focused section workflow regression or documented manual audit.
  - Notes: this is intentionally after `P3-1.x` because section semantics depend on the main shelf/search contract. The output should read as a stable homepage workflow, not a temporary data projection.

- [ ] P3-2.2 Tighten Readest local-library migration and compatibility semantics
  - Outcome: users can tell which parts of a Readest local-library import are true compatibility, which are best-effort migration, and which still fall back to reimport-style behavior.
  - Touches: `src-tauri/src/commands/library.rs`, `src-tauri/src/models.rs`, `src/lib/services/libraryPersistence.ts`, migration banner/notice copy and any library metadata projection that surfaces compatibility results.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`; focused manual desktop migration review.
  - Notes: the goal is not more migration surface area by default. The goal is to make current compatibility behavior explicit, fill the highest-value local metadata/state gaps, and stop the product from feeling like a blind file reimport with a Readest label.

## Service Security Gate

These checks apply to every P2 service slice.

- [x] S-1 Renderer cannot turn catalog or translation commands into arbitrary network proxying
  - Done commit: 0505, 00d5fd1, affd7a2, 121d6f8
  - Notes: catalog commands only originally; now remote sync too. User-configured http/https OPDS URLs are still persisted only as source metadata, browsing still returns an explicit unsupported product state unless the source maps to an allowlisted bundled fixture page, and the new `readestCloud` sync path does not accept renderer-supplied URLs at all. Tauri derives the sync base URL and library id from local desktop env, constructs the endpoint family itself, and keeps auth/header use inside the desktop boundary.

- [x] S-2 Renderer cannot use service flows to read arbitrary local files
  - Done commit: 0511
  - Notes: sync snapshot import/export now keeps file selection and save-path ownership inside Tauri dialogs. The renderer never supplies arbitrary snapshot filesystem paths; it only receives parsed snapshot content or file-name summaries, while restore writes go through Tauri-owned app-data paths and existing hashed storage roots. KOReader exchange import now follows the same rule: file selection, validation, match resolution, and local apply all execute inside Tauri instead of returning a parsed exchange document to renderer for merge/apply.

- [x] S-3 Long-lived provider credentials are not stored in renderer-only state
  - Done commit: 0505, 00d5fd1, affd7a2
  - Notes: catalog commands only originally; now remote sync too. The renderer-facing catalog settings input still stores only auth kind, required/configured booleans, and labels/redacted presence metadata, and the remote sync token is read from local desktop env only. No long-lived password/token/cookie secret is accepted from renderer state for either path.

- [x] S-4 Network and filesystem failures produce product-level error states, not silent failures
  - Done commit: 0505, 00d5fd1, affd7a2, 121d6f8
  - Notes: catalog commands only originally; now remote sync too. Invalid settings files, source settings write failures, unsupported live URLs, auth-required sources, and non-allowlisted page hrefs still return `CatalogErrorState` or source connectivity states, and remote sync now returns explicit missing-config, offline, retryable-failure, conflict, success, and empty states instead of silently dropping network/file boundary failures.

## Completion Log

Use this log when completing each item.

| Date | Item | Commit | Verification | Notes |
|---|---|---|---|---|
| 2026-04-25 | Move KOReader exchange import/apply into Tauri | 9cdd6ba | `cargo check --manifest-path src-tauri/Cargo.toml`; `cargo test --manifest-path src-tauri/Cargo.toml sync_snapshot`; `pnpm check`; `git diff --check` | closes the last renderer-owned KOReader exchange apply path by routing file pick, validation, merge/apply, and conflict summaries through `restore_koreader_sync_exchange_dialog` |
| 2026-04-25 | Harden post-merge sync validation and KOReader import semantics | 987ee43 | `cargo test --manifest-path src-tauri/Cargo.toml sync_snapshot`; `cargo test --manifest-path src-tauri/Cargo.toml remote_sync`; `pnpm check`; `git diff --check` | adds rollback-backed KOReader exchange writes, makes local-newer honor KOReader `updated_at`, requires KOReader identity for fallback matching, promotes Readest Cloud pull validation to restore-level checks, and stops Readest import from seeding `koreaderProgressLocation` |
| 2026-04-25 | Make snapshot restore transactional across local and remote apply | d8695f8 | `cargo test --manifest-path src-tauri/Cargo.toml sync_snapshot`; `cargo test --manifest-path src-tauri/Cargo.toml remote_sync`; `pnpm check`; `git diff --check` | replaces the shared snapshot apply roots with a rollback-backed mutation plan so local snapshot restore and Readest Cloud pull no longer risk half-applied library/bookmark/note/highlights state |
| 2026-04-25 | Align the library top toolbar and search behavior | this commit | `pnpm check`; `git diff --check`; `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"` | moves import/search status back into the header, removes the shelf import tile, and stops shelf headers from echoing top-level view semantics |
