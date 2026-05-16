# Readest Alignment Checklist

Last updated: 2026-05-16

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
- `docs/superpowers/plans/2026-04-25-readest-reader-parity-wave-plan.md`
- `docs/superpowers/plans/2026-04-25-readest-gap-audit-plan.md`
- `docs/superpowers/plans/2026-04-25-readest-gap-driven-parallel-plan.md`
- `docs/superpowers/plans/p0-exit-audit-template.md`

That handoff explains files, task order, and test commands. This checklist remains the only status ledger.

## Sources

- Current `br1` codebase and prior planning docs as of 2026-04-23
- [Readest website](https://readest.com/)
- [Readest GitHub README](https://github.com/readest/readest)

## Current Baseline

`br1` has now closed the first large Readest alignment line for trusted local-library, reader-capability, AI workspace, catalog, and sync groundwork.

Strong areas:

- local library import and desktop reader flow
- managed library-file reading boundary
- EPUB/PDF reopen and reading-state persistence
- growing FB2/MOBI/AZW3/CBZ/TXT support
- reader settings, search, notes, bookmarks, highlights, saved sets
- grouped library browse and library repair workflows
- reader assistance: Wikipedia, dictionary, DeepL, and Yandex translation
- reader TTS, visual/focus aids, parallel read, and code highlighting
- notebook-grade AI assistant and translation workspace structure
- reader-side sync workspace for KOReader progress exchange and remote sync controls
- library operations and desktop support surfaces
- OPDS / Calibre catalog integration through Tauri-owned boundaries
- first-class catalog manager/browser/import surfaces
- local snapshot sync, Readest Cloud sync substrate, and KOReader exchange/progress sync
- transactional local/remote snapshot restore hardening

Main gaps against Readest:

- reader reading-mode parity is now the highest-value frontier: translation mode still behaves too much like a detached workspace instead of following the current reading source by default, and TTS still lacks fuller reading-mode behavior
- the reader notebook still needs explicit mode-follow/lock/resume semantics where a reading mode can either stay attached to the active source or intentionally pin itself to an older source
- Readest local library migration exists, and its “compatibility vs reimport” semantics are now explicit enough to move off the main execution line
- official KOReader parity remains intentionally scoped to exchange plus progress-only remote sync

Planning consequence:

- route-closure is maintenance only
- P0, P1, and P2 are functionally closed as the first Readest alignment line
- P3 is functionally closed as the library-product parity line
- P4 is now a narrow reader capability/search closeout line rather than the long-term mainline
- P5, P6, P7, and P8 are functionally closed as shipped workspace/library/catalog/sync lines
- the next main execution line is `P9 reader reading-mode parity`
- new parity work should prefer tighter reading-mode ownership and source-follow semantics over deeper provider expansion unless a new correctness blocker appears
- the active maturity line is now `P16+ reader maturity pass`, starting with inline translation state before UI integration

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
  - Done commit: 6cf2fd2
  - Notes: the header now owns the visible import entry, search clear action, and search/filter status summary; the shelf-level import tile and shelf-local view-mode echo were removed so the library control surface stops competing with the body. Grouped-browse trail/pivot/sibling navigation remains in the body for now and is intentionally deferred because that path still needs a dedicated header-side rethreading slice.

- [x] P3-1.2 Align library cards, covers, metadata, and status density
  - Outcome: grid/list cards, import tile, and section cards use a more intentional Readest-style hierarchy for cover ratio, title/author line breaks, progress/state chips, and action affordances.
  - Touches: `src/lib/components/library/BookshelfPreview.svelte`, `src/lib/components/library/ContinueReadingShelf.svelte`, any shared library card model/types needed for visual cleanup.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test /Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"` (PASS).
  - Done commit: 3c3eca8
  - Notes: the main shelf cards and continue/recent rows now share a denser book-first hierarchy: slightly tighter cover ratio, stronger title/author emphasis, progress/status labels that read as product state instead of debug text, and less weight on secondary metadata. This slice is intentionally visual-only; metadata detail actions and grouped-browse navigation semantics are unchanged.

- [x] P3-1.3 Align library sort, filter, section, and scroll behavior
  - Outcome: search and filter states now collapse the library into a single result shelf with explicit `搜索结果` / `筛选结果` semantics, while the existing scroll runtime remains the shared host for that contract instead of competing with workflow shelves.
  - Touches: `src/routes/library/+page.svelte`, `src/lib/library/page.ts`, `src/lib/library/body.ts`, `src/lib/library/surface.ts`, focused library smoke coverage.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test /Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"` (PASS).
  - Done commit: 1b985ad
  - Notes: this slice intentionally settles search/filter section rules first. It does not change grouped-browse navigation or invent a new scroll model; the existing scroll host stays in place, but the page state now decides much more clearly when workflow shelves should disappear and when the main result shelf should take over.

- [x] P3-2.1 Productize continue reading and recent reading
  - Outcome: homepage sections for `continue reading` and `recent reading` now have explicit inclusion and completed-book rules, stable section limits, and a reachable “最近没有在读书” workflow notice once only finished books remain.
  - Touches: `src/lib/library/page.ts`, `src/lib/components/library/ContinueReadingShelf.svelte`, focused library section tests.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/library/page.test.ts` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 260c6f1
  - Notes: `continue reading` remains the in-progress shelf, while `recent reading` now excludes finished books instead of acting as a generic “opened sometime” bucket. This slice keeps the existing visual layout, but it turns the homepage reading workflow into a clearer product contract and makes the “no active reading” notice path real instead of theoretical.

- [x] P3-2.2 Tighten Readest local-library migration and compatibility semantics
  - Outcome: the library now distinguishes “detected Readest records”, “still importable from local files”, “already compatible inside br1”, and “records whose local files are gone”, so migration entry points stop implying that every detected Readest book can still be synchronized.
  - Touches: `src-tauri/src/commands/library.rs`, `src-tauri/src/models.rs`, `src/lib/services/libraryPersistence.ts`, `src/lib/library/desktopCatalog.ts`, migration banner/empty-state copy.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/library/page.test.ts ./src/lib/library/desktopCatalog.test.ts` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 1a3580d
  - Notes: this slice does not add more migration breadth. It makes the existing local Readest path honest: banner counts now separate importable books from missing-file records, and “compatible in br1” only counts usable local copies instead of every historical `readest-*` record.

## P4 Reader Product Parity

Goal: close the next set of user-visible Readest gaps that now mainly live in reader capability boundaries, search semantics, and non-EPUB/PDF format product behavior.

- [x] P4-1.1 Centralize reader format capability boundaries for search and annotations
  - Outcome: reader format support now exposes a single shared contract for text annotation and full-text search affordances, so capability copy stops drifting between the sidebar, the viewport, and format-specific special cases.
  - Touches: `src/lib/reader/formats.ts`, `src/lib/components/reader/ReaderViewport.svelte`, focused reader smoke coverage.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows txt search capability boundary messaging in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: b850cc5
  - Notes: this slice is intentionally narrow. It does not add TXT search; it moves the existing unsupported behavior into the shared reader-format capability table so later reader parity work can reuse one source of truth instead of preserving per-component hardcoded messages.

- [x] P4-1.2 Productize reader search states across formats and sidebars
  - Outcome: search idle, unsupported, empty, and result states should read like one product surface across EPUB, TXT, and other supported reader formats instead of a mix of generic defaults and format-specific leftovers.
  - Touches: `src/lib/components/reader/ReaderSidebar.svelte`, shared search capability messaging in `src/lib/reader/formats.ts`, focused reader smoke coverage.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader search states read like one product surface across txt and epub"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 735f1c7
  - Notes: this slice keeps TXT search unsupported, but it stops rendering unsupported, empty, and hit states as disconnected copies. The sidebar summary/result area now reads like one reader surface across TXT and EPUB without adding new search capability.

- [x] P4-2.1 Align reader shell chrome, toolbar density, and progress hierarchy
  - Outcome: header/footer controls, progress summaries, and parallel-reader affordances should feel like one intentional reading product instead of an accumulation of utility controls.
  - Notes: gap audit on 2026-04-25 reduced this from “next mainline” to a narrower follow-on. Do not execute it as shell-only polish if the same effort should instead land under `P5` notebook/translation/TTS workspace work.
  - Follow-up: `0556` narrows the route-level reader toolbar into a two-row chrome model, with layout controls separated from notebook workspace mode switching so the shell stops presenting every reader action as one flat utility strip. Tutorial: `tutorials/commit/0556-split-reader-toolbar-into-layout-and-workspace-modes.md`.
  - Follow-up: `0557` turns the footer into a clearer reading-status hierarchy, with chapter/location promoted above the slider and format/layout reduced to environment chips so progress reads like product context instead of utility metadata. Tutorial: `tutorials/commit/0557-tighten-reader-footer-progress-hierarchy.md`.
  - Follow-up: `0558` regroups the header into primary actions, sidebar entry shortcuts, and a dedicated TTS session block so shell chrome, footer hierarchy, and notebook workspace controls now speak the same product language. Tutorial: `tutorials/commit/0558-regroup-reader-header-controls-by-ownership.md`.
  - Closeout: `0563` closes this shell-chrome line after source review confirmed the route toolbar, header, and footer now present one consistent reading-shell hierarchy without further behavior changes. Tutorial: `tutorials/commit/0563-close-reader-shell-and-sidebar-semantic-gap-slices.md`.

- [x] P4-2.2 Tighten notes, bookmarks, and highlights workspace product semantics
  - Outcome: the sidebar should present notes/bookmarks/highlights as one coherent reading workspace with clearer unsupported states, counts, and action framing across formats.
  - Notes: keep the current storage/sync substrate unless a product-semantic fix requires a bounded correctness repair. This item is now subordinate to `P5-1` notebook workspace planning.
  - Follow-up: `0559` turns the sidebar notes surface into a real annotation workspace by replacing the misleading “最近笔记” framing with “标注”, clarifying the supported-format guidance, and updating note-group and empty-state copy so mixed note/highlight lists stop pretending to be note-only. Tutorial: `tutorials/commit/0559-reframe-notes-panel-as-an-annotation-workspace.md`.
  - Follow-up: `0560` reframes bookmarks as current reading positions instead of a passive saved-list, clarifies current-page state in the sidebar, and updates empty-state/action copy so the bookmark surface reads like a reading workflow. Tutorial: `tutorials/commit/0560-reframe-bookmarks-as-reading-positions.md`.
  - Follow-up: `0561` separates current-book highlights from cross-book highlight-selection sets in the panel language, so the highlights workspace stops presenting those two workflows as one undifferentiated saved list. Tutorial: `tutorials/commit/0561-separate-highlights-from-cross-book-selection-sets.md`.
  - Follow-up: `0562` teaches the highlights empty state to recognize when current-book highlights are gone but cross-book selection sets still remain, so the panel no longer tells the reader “there are no highlights” when reusable highlight work is still present above. Tutorial: `tutorials/commit/0562-keep-highlight-empty-state-aware-of-selection-sets.md`.
  - Closeout: `0563` closes this sidebar-semantic line after source review confirmed notes, bookmarks, and highlights now describe mixed local/cross-book reading workflows without the earlier note-only, bookmark-list-only, or saved-list-only framing. Tutorial: `tutorials/commit/0563-close-reader-shell-and-sidebar-semantic-gap-slices.md`.

## P5 Reader Workspace Parity

Goal: make the reader feel like a multi-workspace Readest-style reading product instead of a growing single-sidebar feature surface.

- [x] P5-1.1 Add a notebook-grade reader workspace shell
  - Outcome: notes/highlights move into a dedicated notebook/workbench surface with explicit open/pin/dismiss behavior instead of remaining only one sidebar tab.
  - Touches: reader workspace shell, route wiring, notes/highlights presentation, focused reader regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open a notebook workspace without collapsing navigation"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: d3f1715
  - Notes: this first workspace slice replaces the old right-side bridge placeholder with a notebook shell, persists pin/tab state at the route level, and opens the notebook when note/highlight actions fire. It intentionally keeps the older sidebar notes/highlights path alive so the reader workspace can grow without rewriting the existing annotation substrate in the same commit.

- [x] P5-1.2 Add an AI assistant workspace on top of the notebook shell
  - Outcome: AI reading help becomes a real workspace with its own framing instead of another provider-result panel.
  - Touches: notebook shell, assistance model, assistant workspace components.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: ec949f1
  - Notes: this slice turns the old assist result area into a shared workspace component and mounts it into the notebook as an `AI 助手` tab. The old sidebar assist entry stays alive for compatibility, but it now reuses the same workspace contract instead of owning a second copy of the assistant UI.

- [x] P5-1.3 Turn translation and TTS into intentional reading modes
  - Outcome: translation stops being only a request panel, and TTS gains more deliberate follow-current/reading-mode semantics.
  - Touches: reader viewport, sidebar/workspace surfaces, TTS helpers, targeted reader regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/reader/tts.test.ts` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commits: da15fca, 9dbfb08
  - Tutorial: `tutorials/commit/0543-turn-translation-into-a-dedicated-reader-mode.md`, `tutorials/commit/0544-turn-tts-into-a-dedicated-reader-mode.md`.
  - Notes: this phase now closes the dedicated translation/TTS reader-mode surface. It still does not introduce a new speech engine or full browser media-session integration, so later reader parity work should treat those as new slices instead of quietly expanding this one.

- [x] P5-1.4 Add recent assistance history and replay inside the AI workspace
  - Outcome: the AI workspace stops behaving like a single latest-result panel and starts keeping per-book recent assistance activity that can be reviewed and replayed from the notebook.
  - Touches: assistance helpers/models, reader route assistance wiring, shared assistant workspace presentation, focused reader regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 2d741e5
  - Tutorial: `tutorials/commit/0564-add-recent-assistance-history-to-the-ai-workspace.md`.
  - Notes: this slice keeps provider/network semantics unchanged. It only adds a per-book recent-activity lane and replay affordances so the AI workspace reads more like a notebook and less like a transient result card.

- [x] P5-1.5 Let the AI workspace review archived assistance records without rerunning them
  - Outcome: the AI workspace becomes reviewable like a notebook lane instead of forcing the reader to replay a request just to recover its prior result.
  - Touches: assistance request-context helpers, shared assistant workspace presentation, focused assistance helper regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: bc99956
  - Tutorial: `tutorials/commit/0565-let-the-ai-workspace-review-archived-records.md`.
  - Notes: this slice still does not add cross-book threads or backend conversation state. It only makes the current-book history lane inspectable without immediately reissuing the old request.

- [x] P5-1.6 Persist current-book assistance history across reader reloads
  - Outcome: the AI workspace keeps the active book's recent assistance lane after reload instead of dropping back to an empty notebook every time the route remounts.
  - Touches: assistance history serialization helpers, reader route local-storage wiring, focused AI workspace restore regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores ai workspace history for the current book in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 59b3c16
  - Tutorial: `tutorials/commit/0566-persist-current-book-ai-history-across-reloads.md`.
  - Notes: this slice persists only the per-book assistance history lane. It still does not persist the live result panel selection, cross-book archives, or backend conversation state.

- [x] P5-1.7 Persist the selected archived assistance record for the current book
  - Outcome: reloading the same book restores not just the assistance history lane, but also the archived lookup/translation record the reader was actively reviewing.
  - Touches: assistance selection serialization helpers, shared assistant workspace controlled selection, reader route local-storage wiring, focused AI workspace restore regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected ai history record for the current book in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 6ff0f25
  - Tutorial: `tutorials/commit/0567-persist-the-selected-archived-ai-record.md`.
  - Notes: this slice still keeps selection scoped to the current book and current local notebook state. It does not add cross-book thread continuity or backend conversation persistence.

- [x] P5-1.8 Let the AI workspace clear current-book archived history by mode
  - Outcome: the reader can intentionally clear the current book's lookup or translation notebook lane instead of treating archived assistance records as write-only history.
  - Touches: shared assistant workspace actions, reader route assistance clearing semantics, focused AI workspace clear-history regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can clear current-book ai history in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: c1723da, 6b62078
  - Tutorial: `tutorials/commit/0568-let-the-ai-workspace-clear-current-book-history.md`; `tutorials/commit/0569-make-current-book-ai-history-clears-write-through.md`.
  - Notes: this slice keeps clearing scoped to the current book and the active notebook mode. The original action added mode-scoped clear controls and fixed the assistance history/selection persistence reactive wiring; the follow-up fix makes the route-owned clear action write through to local storage immediately instead of relying on later reactive persistence.

- [x] P5-1.9 Group current-book AI history into notebook-style lookup and translation sections
  - Outcome: the AI workspace stops reading like one flat history lane and starts presenting lookup and translation records as two explicit notebook sections with their own summary entry points.
  - Touches: shared assistant workspace presentation, focused AI workspace section-summary regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader groups current-book ai history into lookup and translation sections in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 2e3fa06
  - Tutorial: `tutorials/commit/0570-group-current-book-ai-history-into-notebook-sections.md`.
  - Notes: this slice keeps the existing assistance request/result substrate and mode switching, but adds a notebook-style summary layer so current-book lookup and translation archives are visible as separate sections before the reader drops into one lane.

- [x] P5-1.10 Restore the selected translation archive in the correct notebook lane
  - Outcome: reloading the same book with a persisted translation archive selection reopens the AI workspace in the translation lane instead of silently falling back to lookup mode.
  - Touches: shared assistant workspace lane restoration semantics, reader route archived-selection ownership, focused translation-selection restore regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected translation ai history record for the current book in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: a12c1a7
  - Tutorial: `tutorials/commit/0571-restore-selected-translation-archives-in-the-right-lane.md`.
  - Notes: this slice keeps archived selection scoped to the current book, but it now treats the archived translation record as the source of truth for restoring the active lane. Selecting one archived record also clears the other lane's active selection so the notebook carries one active archived context at a time.

- [x] P5-1.11 Keep the active archive summary visible when a notebook lane is collapsed
  - Outcome: the AI workspace reads more like a notebook section by letting the reader collapse the current lane's history list without losing the active archived-record context.
  - Touches: shared assistant workspace section presentation, focused collapsed-history regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader keeps the active ai archive summary visible when the history list is collapsed"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 64853d3
  - Tutorial: `tutorials/commit/0572-keep-active-ai-archive-context-while-collapsing-history.md`.
  - Notes: this slice does not add new persistence or multi-book archive browsing. It only lets the current lookup or translation section fold its list while leaving the active archived record visible as the section summary.

- [x] P5-1.12 Let the AI notebook move from the archive overview into one lane and back again
  - Outcome: the AI workspace stops showing overview cards and active lane details as one flat pile, and instead supports explicit two-level navigation between the current-book archive overview and the focused lookup/translation lane.
  - Touches: shared assistant workspace overview/lane navigation, focused archive-navigation regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 824fa3b
  - Tutorial: `tutorials/commit/0574-add-two-level-navigation-between-ai-overview-and-lanes.md`.
  - Notes: this slice keeps navigation local to the current notebook session. It does not persist overview-vs-lane navigation state, and it does not introduce a cross-book archive browser.

- [x] P5-1.13 Tighten lane headers so focused AI sections read like real notebook sections
  - Outcome: once the reader enters a lookup or translation lane, the lane header itself explains which current-book section they are in and how many records it currently contains, instead of relying on the overview cards and action labels to infer that context.
  - Touches: shared assistant workspace lane-header hierarchy, focused archive-navigation regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 819995b
  - Tutorial: `tutorials/commit/0575-tighten-ai-lane-headers-into-notebook-sections.md`.
  - Notes: this slice keeps the same overview/lane navigation model, but it makes the focused lane self-describing by promoting the lane title and current-book record count into the lane header itself.

- [x] P5-1.14 Separate navigation, maintenance, and item actions inside focused AI lanes
  - Outcome: focused lookup/translation lanes stop presenting every control as one flat row; the lane now distinguishes section navigation, section maintenance, and per-record primary/secondary actions.
  - Touches: shared assistant workspace action hierarchy, focused archive-action regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows notebook-style action hierarchy inside ai archive lanes"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 1b39e4f
  - Tutorial: `tutorials/commit/0576-separate-ai-lane-navigation-maintenance-and-item-actions.md`.
  - Notes: this slice keeps the same archive model and lane navigation, but it stops treating `返回摘要 / 收起列表 / 清空记录 / 查看记录 / 再次发起` as one undifferentiated control band. Selected records now read as state, while replay remains a secondary action.

- [x] P5-1.15 Align lookup and translation result sections inside focused AI lanes
  - Outcome: once the reader enters a focused lookup or translation lane, the result surface itself reads like a notebook section instead of a bare provider payload area.
  - Touches: shared assistant workspace result presentation, focused AI restore/translation regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected ai history record for the current book in web mode|reader restores the selected translation ai history record for the current book in web mode|reader can open translation mode as a dedicated notebook tab"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 0b177d3
  - Tutorial: `tutorials/commit/0577-align-ai-result-sections-across-lookup-and-translation-lanes.md`.
  - Notes: this slice keeps the same assistance history, replay, and persistence semantics. It only gives both lookup and translation results explicit section headers and supporting summaries so current results and restored history read like one notebook surface.

- [x] P5-1.16 Split focused AI lanes into explicit current-record and history-list sections
  - Outcome: a focused lookup or translation lane no longer reads like one flat archive block; it now exposes `当前记录` and `历史记录列表` as explicit notebook subsections.
  - Touches: shared assistant workspace section hierarchy, focused lane structure regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows notebook-style action hierarchy inside ai archive lanes"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 2986907
  - Tutorial: `tutorials/commit/0578-split-focused-ai-lanes-into-current-and-history-sections.md`.
  - Notes: this slice does not change archive storage, replay semantics, or provider behavior. It only gives the focused lane a clearer notebook scaffold so later thread/archive work has stable section anchors.

- [x] P5-1.17 Let focused AI lanes switch between current-record and full-history browsing
  - Outcome: once a record is selected inside a focused lookup or translation lane, the reader can explicitly switch between `只看当前记录` and `查看完整历史` instead of treating selection and browse mode as the same thing.
  - Touches: shared assistant workspace lane navigation semantics, focused AI lane browse-mode regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: a4bbb44
  - Tutorial: `tutorials/commit/0579-let-focused-ai-lanes-switch-between-current-and-history-views.md`.
  - Notes: this slice keeps archive persistence, replay, and provider behavior unchanged. It only adds an explicit browse-mode toggle and keeps the `aria-pressed` state aligned with the visible lane mode so focused navigation reads like a real notebook workflow.

- [x] P5-1.18 Add breadcrumb and grouped browse controls to focused AI lanes
  - Outcome: focused lookup and translation lanes no longer present their browse controls as a loose button row; they now expose a breadcrumb plus grouped `浏览位置` and `浏览范围` controls.
  - Touches: shared assistant workspace lane-navigation presentation, focused AI lane breadcrumb regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: c9f7835
  - Tutorial: `tutorials/commit/0580-add-breadcrumb-and-grouped-browse-controls-to-focused-ai-lanes.md`.
  - Notes: this slice keeps the same archive model and browse-mode behavior from P5-1.17. It only makes the lane navigation self-describing so the reader can see both current position and available browse scope at a glance.

- [x] P5-1.19 Add a browse summary layer to focused AI lane navigation
  - Outcome: focused lookup and translation lanes now show a compact `当前位置 / 当前范围` summary alongside the breadcrumb and grouped controls, so the lane navigation contract reads as one self-describing notebook surface.
  - Touches: shared assistant workspace navigation summary presentation, focused AI lane breadcrumb regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: c3c8c98
  - Tutorial: `tutorials/commit/0581-add-a-browse-summary-layer-to-focused-ai-lanes.md`.
  - Notes: this slice does not change archive semantics or browse-mode behavior. It only makes the lane navigation easier to scan by exposing position and scope as explicit summary state rather than forcing the reader to infer them from the buttons alone.

- [x] P5-1.20 Add current-entry summary to the focused AI navigation contract
  - Outcome: the focused lane navigation surface now states not only position and scope, but also which archived record is currently selected.
  - Touches: shared assistant workspace navigation-summary presentation, focused AI lane breadcrumb regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: e758dc0
  - Tutorial: `tutorials/commit/0582-add-current-entry-summary-to-focused-ai-navigation.md`.
  - Notes: this slice does not add new archive or thread behavior. It closes the focused-lane navigation contract by making the currently viewed record explicit in the top navigation summary instead of leaving it implicit in the content sections below.

- [x] P5-1.21 Collapse focused-lane browse state into one notebook navigation section
  - Outcome: breadcrumb, browse summaries, and browse controls no longer read as separate loose elements; they now live inside one explicit `浏览导航` section at the top of the focused lane.
  - Touches: shared assistant workspace navigation-section presentation, focused AI lane navigation regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: e47d9db
  - Tutorial: `tutorials/commit/0583-collapse-focused-ai-navigation-into-one-section.md`.
  - Notes: this slice does not change archive persistence, replay, or provider behavior. It only turns the focused-lane navigation surface into one explicit notebook section so the navigation contract has a stable top-level anchor.

- [x] P5-1.22 Turn the current-book AI archive overview into a real notebook section
  - Outcome: `本书 AI 记录摘要` no longer reads like a loose card grid; it now has an explicit section header, total summary, and stable entry area before the reader drills into one lane.
  - Touches: shared assistant workspace overview-section presentation, overview-to-lane navigation regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 4c6f9da
  - Tutorial: `tutorials/commit/0584-turn-the-ai-archive-overview-into-a-section.md`.
  - Notes: this slice does not change history storage, lane navigation semantics, or provider behavior. It only gives the overview side of the AI workspace the same notebook-section structure already used inside focused lanes.

- [x] P5-1.23 Add current-book scope summaries to the AI assistant and translation tabs
  - Outcome: entering `AI 助手` or `翻译模式` now immediately states the current-book scope at the top of the workspace instead of leaving that framing entirely to the deeper notebook sections.
  - Touches: shared assistant workspace top-level scope presentation, AI/translation notebook entry regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can open translation mode as a dedicated notebook tab"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 313b185
  - Tutorial: `tutorials/commit/0585-add-current-book-scope-summaries-to-ai-tabs.md`.
  - Notes: this slice does not change history storage, lane navigation, or provider behavior. It only makes the top of the assistant and translation workspaces state the current-book scope before the reader reaches the overview cards or focused lane sections.

- [x] P5-1.24 Separate AI overview mode from focused lane mode
  - Outcome: when the assistant stays on `本书 AI 记录摘要`, the focused lane no longer remains expanded below it; overview mode and lane mode now read as distinct notebook states.
  - Touches: shared assistant workspace overview/lane visibility contract, AI overview navigation regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can move from the ai archive overview into one lane and back again"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: b03e05e
  - Tutorial: `tutorials/commit/0586-separate-ai-overview-mode-from-focused-lanes.md`.
  - Notes: this slice does not change history storage, provider behavior, or focused-lane navigation semantics. It only prevents the overview and focused lane from rendering as two simultaneous notebook states.

- [x] P5-1.25 Make the notebook summary reflect the active AI workspace tab
  - Outcome: the notebook-level summary no longer shows one generic assistant status line; it now changes with `AI 助手` and `翻译模式` so the top strip reflects the active workspace contract.
  - Touches: notebook summary projection, AI/translation notebook entry regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can open translation mode as a dedicated notebook tab"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 640c302
  - Tutorial: `tutorials/commit/0587-make-the-notebook-summary-follow-the-active-ai-tab.md`.
  - Notes: this slice does not change reader storage or AI request behavior. It only stops the notebook summary strip from staying overly generic when the user is already inside assistant- or translation-specific workspace modes.

- [x] P5-1.26 Remove archive-overview navigation semantics from dedicated translation mode
  - Outcome: `翻译模式` no longer pretends it lives under `本书 AI 记录摘要`; its breadcrumb and browse controls now reflect that it is already a dedicated notebook mode.
  - Touches: shared assistant workspace breadcrumb/navigation semantics, translation-mode notebook regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: c88654b
  - Tutorial: `tutorials/commit/0588-remove-overview-semantics-from-dedicated-translation-mode.md`.
  - Notes: this slice does not change translation history storage or replay behavior. It only fixes the navigation contract so the dedicated translation workspace does not expose a fake return path to an overview that is unavailable in locked mode.

- [x] P5-1.27 Record the P5 closeout boundary
  - Outcome: the repo now states which AI workspace parity pieces are considered closed in P5, and which items remain intentionally outside this line.
  - Touches: checklist closeout notes, tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: beafe12
  - Tutorial: `tutorials/commit/0589-close-the-p5-ai-workspace-structure-line.md`.
  - Notes: P5 now includes notebook shell, AI assistant workspace, translation mode, current-book archive overview, focused lane navigation, and notebook-summary alignment. It explicitly does not include cross-book AI archive browsing, thread-style conversation history, provider expansion, or remote AI sync.

- [x] P5-1.28 Run the P5 closeout review
  - Outcome: the repo now records whether the AI workspace line still has merge-blocking structural gaps, and it names the next mainline instead of leaving `继续` to guesswork.
  - Touches: checklist closeout review notes, tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: fd0f449
  - Tutorial: `tutorials/commit/0590-record-the-p5-closeout-review.md`.
  - Notes: this review found no remaining structural blockers inside the current-book AI workspace line. The recommended next mainline is not more `P5` micro-polish, but the next reader workspace surface that is still materially behind Readest.

### P5 Closeout

Included in P5:
- notebook-grade AI assistant tab inside the reader workspace
- dedicated translation mode inside the notebook shell
- current-book archive overview with explicit section structure
- focused lane navigation, current-record/history separation, and browse-mode controls
- top-level scope and notebook-summary alignment for assistant and translation tabs

Explicitly not included in P5:
- cross-book AI archive browsing
- thread-style conversation history
- provider/network expansion beyond the existing lookup/translation substrate
- remote AI sync or cloud archive surfaces

Closeout review verdict:
- no remaining structural blocker was found in the current-book AI workspace line
- remaining gaps are now higher-level product expansion, not notebook-structure correctness
- the next recommended mainline is a new reader workspace line, not further `P5` micro-slices

## P6 Library Operations And Desktop Support

Goal: turn the library from a strong bookshelf into a complete desktop reading hub with visible operational surfaces.

- [x] P6-1.1 Add a productized library operations surface
  - Outcome: backup/restore, KOReader / Readest Cloud sync affordances, and Readest migration context are available from one intentional library header/menu surface without adding renderer-controlled filesystem entry.
  - Touches: library header, desktop page wiring, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 9eef796
  - Notes: this slice productizes the existing snapshot export/restore, KOReader exchange, and remote sync actions by grouping them under a desktop operations surface and exposing visible backup/restore affordances in the header. It keeps migration on the existing Readest banner and now blocks migration from starting while snapshot or remote-sync work is already in flight.

- [x] P6-1.2 Add transfer queue and remaining desktop support affordances
  - Outcome: transfer/queue state becomes inspectable, and desktop support actions stop being scattered or invisible.
  - Touches: library support components, queue/state projection, library notices.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 04aa541
  - Notes: this slice does not invent a new transfer engine. It projects the existing associated-book open queue and rejection reporting path into one library support card, with only safe refresh/clear actions on top of the current desktop substrate.

## P7 Catalog And Ecosystem Productization

Goal: expose the already-built OPDS / Calibre substrate as a real end-user feature.

- [x] P7-1.1 Add a catalog manager product surface
  - Outcome: saved/user-configured catalog sources, auth-required states, and fixture/live-source states are visible in a real Svelte product area.
  - Touches: new route or surfaced library area, catalog services, focused UI regression.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/services/catalogs.test.ts` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "catalog route explains the desktop-owned boundary in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 7173705
  - Tutorial: `tutorials/commit/0545-add-the-first-catalog-manager-and-browser-surface.md`.
  - Notes: this slice adds a first-class `/catalogs` route, root-nav and library-header entry points, saved-source management, and safe browse/search/import-intent presentation on top of the existing desktop-owned substrate. It keeps the existing Tauri trust boundary and does not add renderer-controlled URL fetching or acquisition download execution.

- [x] P7-1.2 Add a catalog browser and import flow
  - Outcome: browse/search/import works as a desktop-visible flow on top of the existing safe catalog substrate.
  - Touches: catalog browse/search UI, import execution command, catalog services, focused catalog tests.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml catalogs` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/services/catalogs.test.ts` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "catalog route explains the desktop-owned boundary in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 17c9a4a
  - Tutorial: `tutorials/commit/0546-execute-safe-catalog-imports-inside-tauri.md`.
  - Notes: catalog import execution now re-resolves the request inside Tauri, materializes only allowlisted fixture acquisitions into a desktop-owned cache, registers the staged file as a trusted import source, and then reuses the existing library import pipeline. The `/catalogs` route now surfaces per-entry importability, desktop-owned import execution, and actionable auth/unsupported guidance without enabling live renderer-side fetching.
  - Notes: this slice should build on `catalogs.rs` / `catalogs.ts`, not replace them.

## P8 Reader Sync Controls

Goal: turn the existing sync substrate into an explicit reader-side control surface instead of leaving it only in library menus and service facades.

- [x] P8-1.1 Add a notebook-grade sync workspace for KOReader flows
  - Outcome: the reader notebook has a visible sync workspace for current-book KOReader exchange export and whole-library KOReader remote progress actions, with explicit desktop-boundary messaging.
  - Touches: reader notebook tabs, reader route state/actions, new sync workspace component, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: f4f90a3
  - Tutorial: `tutorials/commit/0547-add-a-reader-sync-workspace-for-koreader-flows.md`.
  - Notes: this slice does not invent new sync protocols. It lifts existing KOReader exchange import/export and remote progress controls into the reader notebook, keeps current-book exchange export scoped to managed library files, and keeps remote push/pull explicitly progress-only and desktop-owned.

- [x] P8-1.2 Productize sync results, retry affordances, and current-book refresh
  - Outcome: the reader sync workspace now shows the last export/import/remote result as explicit product cards, exposes retry on failed actions, and refreshes the current managed-book sync state after import or pull.
  - Touches: reader sync workspace, reader notebook sync props, reader route sync action state, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 83315d5
  - Tutorial: `tutorials/commit/0548-productize-reader-sync-results-and-retry-flow.md`.
  - Notes: this slice keeps the existing KOReader protocol boundaries, but stops the reader sync tab from behaving like a fire-and-forget action cluster. The workspace now preserves the last export result, summarizes exchange conflicts and remote status, and refreshes the current managed-book locator state after successful import or remote pull.

- [x] P8-1.3 Split current-book and whole-library sync activity lanes
  - Outcome: the reader sync workspace now exposes separate recent-activity lanes for current-book and whole-library actions, so users can tell whether the last thing that changed was a current-book export or a whole-library import/push/pull.
  - Touches: reader route sync activity state, reader notebook sync props, sync workspace activity cards, focused reader smoke timing contract.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: cb9dfbd
  - Tutorial: `tutorials/commit/0549-split-reader-sync-activity-into-current-book-and-library-lanes.md`.
  - Notes: this slice still does not add new sync protocols. It keeps the sync workspace inside the existing KOReader trust boundary, but records and renders separate activity streams for current-book export and whole-library sync work, including cancelled/error/success states and action timestamps.

- [x] P8-1.4 Productize current-book sync readiness states
  - Outcome: the current-book sync panel now shows an explicit readiness card for managed-library identity, local library replica availability, locator quality, and source-file association instead of relying on a single summary sentence.
  - Touches: reader sync workspace current-book presentation, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: e89e59a
  - Tutorial: `tutorials/commit/0550-productize-current-book-sync-readiness-states.md`.
  - Notes: this slice does not add new export or sync capability. It only turns the existing `PersistedLibraryBook` state into a more legible readiness surface, including the difference between KOReader locator, local-only reopen locator, missing managed-library copy, and missing source-file association.

- [x] P8-1.5 Productize whole-library sync readiness states
  - Outcome: the whole-library sync panel now shows an explicit readiness card for desktop runtime, exchange import availability, remote config status, remote connectivity status, and the progress-only boundary instead of relying only on the last result card.
  - Touches: reader sync workspace whole-library presentation, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 181001a
  - Tutorial: `tutorials/commit/0551-productize-whole-library-sync-readiness-states.md`.
  - Notes: this slice still does not add any new sync protocol or remote preflight command. It only turns the already-known desktop/runtime and last-known remote status signals into a legible readiness card so users can distinguish config, connectivity, and protocol-scope limits before triggering the next action.

- [x] P8-1.6 Collapse sync status into per-panel timelines
  - Outcome: the current-book and whole-library panels now keep their latest activity and result details inside compact per-panel status timelines instead of rendering separate activity cards and detached result cards below the actions.
  - Touches: reader sync workspace presentation, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 577c069
  - Tutorial: `tutorials/commit/0552-collapse-sync-status-into-per-panel-timelines.md`.
  - Notes: this slice does not change sync state ownership or add protocol capabilities. It only reorganizes the existing readiness, recent activity, and last-result details into a tighter per-panel timeline so the workspace reads as two coherent status lanes instead of multiple disconnected summary cards.

- [x] P8-1.7 Add explicit empty-state copy to sync timelines
  - Outcome: the current-book and whole-library timelines now render readable initial-state copy instead of blank space when no export/import/remote action has happened yet.
  - Touches: reader sync workspace timeline presentation, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 274a8fe
  - Tutorial: `tutorials/commit/0553-add-explicit-empty-state-copy-to-sync-timelines.md`.
  - Notes: this slice does not change any sync action or state ownership. It only turns the previously blank timeline state into explicit copy so first-open notebook sessions explain that no current-book export or whole-library sync has happened yet.

- [x] P8-1.8 Review and tighten sync workspace presentation hierarchy
  - Outcome: the sync workspace now keeps recent activity and result details inside per-panel timelines and no longer duplicates that information in detached bottom-of-page summary cards.
  - Touches: reader sync workspace presentation, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: aa5386e
  - Tutorial: `tutorials/commit/0554-tighten-sync-workspace-presentation-hierarchy.md`.
  - Notes: this slice does not change sync state ownership, commands, or protocol scope. It only collapses activity and last-result details into the same per-panel lanes as readiness, so the workspace reads as two coherent surfaces instead of one header plus a pile of detached cards.

- [x] P8-1.9 Move sync actions into their owning panels
  - Outcome: current-book export and whole-library import/push/pull actions now live inside their respective panels instead of sharing one mixed bottom action row, and narrow layouts stack the controls more cleanly.
  - Touches: reader sync workspace presentation, focused reader smoke.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: b4ca91c
  - Tutorial: `tutorials/commit/0555-move-sync-actions-into-their-owning-panels.md`.
  - Notes: this slice does not add or remove any sync capability. It only rehomes the existing buttons into the panel they belong to, which makes the workspace read as two independent operating lanes and improves narrow-width stacking behavior.

## P9 Reader Reading-Mode Parity

Goal: close the remaining gap between dedicated reader modes and the live reading source, starting with translation mode ownership.

- [x] P9-1.1 Make translation mode follow the current reading source by default, with explicit lock and resume semantics
  - Outcome: opening translation mode from the active reader keeps it attached to the current reading source by default, while the user can explicitly lock that mode to its current source and later resume live following.
  - Touches: reader route/session ownership, translation mode state contract, notebook action semantics, focused reader regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: abbe0e8
  - Tutorial: `tutorials/commit/0592-make-translation-mode-follow-the-current-reading-source.md`.
  - Notes: translation mode now defaults to the current reading source instead of behaving like a detached request form. When a live reading source is available, the mode follows it; when it is not, the reader can still type or paste text, lock that source explicitly, and later resume live following.

- [x] P9-1.2 Make the notebook summary follow the dedicated TTS mode state
  - Outcome: opening the dedicated TTS mode stops showing the generic notebook summary and instead exposes the current TTS session state, source ownership, and target summary, while switching books resets pinned TTS targets back to current-book follow mode.
  - Touches: reader route/session ownership, reader notebook summary contract, TTS mode focused regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 1ae470e
  - Tutorial: `tutorials/commit/0593-make-the-notebook-summary-follow-the-dedicated-tts-mode.md`.
  - Notes: this slice does not change TTS playback engines or paragraph extraction. It only makes the notebook chrome reflect the actual TTS mode contract.

- [x] P9-1.3 Let dedicated TTS mode switch between source text and translated text
  - Outcome: dedicated `朗读模式` can now stay on original reading text or explicitly switch to the current translated result, and that choice persists through reader settings.
  - Touches: reader settings schema, route-owned TTS target resolution, TTS workspace controls, focused TTS regressions, TTS helper tests.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: 0f4a9a0
  - Tutorial: `tutorials/commit/0594-add-a-source-versus-translated-tts-reading-mode.md`.
  - Notes: this slice does not add paragraph extraction or a richer speech engine. It only closes the most direct product gap between translation mode and TTS mode.

- [x] P9-1.4 Let translated TTS follow the selected translation archive
  - Outcome: when the reader has a selected translation history entry, dedicated translated TTS reads that archive first instead of pretending no translated target exists unless the same result is still live.
  - Touches: route-owned translated TTS target resolution, focused-lane archive selection cleanup, TTS helper labels, focused translated-TTS regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js` (PASS); `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader lets translated tts mode consume the selected translation archive in web mode|reader can open tts mode as a dedicated notebook tab|reader restores the selected translation ai history record for the current book in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: f1f7378
  - Tutorial: `tutorials/commit/0595-let-translated-tts-follow-the-selected-translation-archive.md`.
  - Notes: this slice does not add live excerpt fallback or a richer TTS segment model. It only makes translated TTS honor the translation archive the user is already browsing and keeps archive cleanup from wiping the selected translation lane during notebook restores.

- [x] P9-1.5 Expose translated-TTS archive provenance and jump back to translation mode
  - Outcome: when dedicated translated TTS is reading from a selected translation archive, the TTS tab makes that archive provenance visible and lets the reader jump straight back into the translation workspace without losing the selected record.
  - Touches: TTS workspace provenance panels, notebook-to-translation navigation, focused translated-TTS regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: f6f8905
  - Tutorial: `tutorials/commit/0596-expose-translated-tts-archive-provenance.md`.
  - Notes: this slice does not close the live waiting-source provenance path for translated TTS. It only makes the archive-backed translated-TTS path traceable and directly navigable.

- [x] P9-1.6 Keep live translated-TTS provenance in sync with the current reading source
  - Outcome: when translated TTS has no selected archive and no translated result yet, the TTS tab still shows which current reading source it is waiting on, and the notebook summary upgrades from “还没有可朗读目标” to “等待译文结果”.
  - Touches: route-owned translation-source reactivity, TTS live waiting-state copy, focused translated-TTS regressions.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: f055232
  - Tutorial: `tutorials/commit/0597-keep-live-translated-tts-provenance-in-sync.md`.
  - Notes: this slice does not add new TTS sources or new provenance panels. It only fixes the live-path reactive gap so translated TTS reflects the same current reading source that translation mode already follows.

- [x] P9-1.7 Record the P9 closeout boundary
  - Outcome: the repo now states which translated-TTS and reading-mode parity pieces are considered closed in `P9`, and which larger TTS/translation expansions remain intentionally outside this line.
  - Touches: checklist closeout notes, tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 49aa5b5
  - Tutorial: `tutorials/commit/0598-close-the-p9-reader-reading-mode-line.md`.
  - Notes: P9 now includes translation-mode ownership, dedicated TTS notebook summary ownership, source-versus-translated TTS switching, archive-backed translated-TTS resolution, archive provenance/jump-back affordances, and live waiting-source provenance. It explicitly does not include paragraph segmentation, richer speech engines, provider expansion, cross-book translated-TTS browsing, or remote TTS sync.

- [x] P9-1.8 Run the P9 closeout review
  - Outcome: the repo now records whether the translated-TTS reading-mode line still has structural blockers, and it states whether the next step should stay in `P9` or move to a new reader workspace mainline.
  - Touches: checklist closeout review notes, tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: d249271
  - Tutorial: `tutorials/commit/0599-record-the-p9-closeout-review.md`.
  - Notes: this review found no remaining structural blocker inside the translated-TTS reading-mode line. Remaining gaps are larger reading/playback product expansions rather than ownership or provenance correctness inside the current notebook contract.

### P9 Closeout

Included in P9:
- translation mode now follows the current reading source by default, with explicit lock and resume controls
- dedicated TTS mode owns its notebook summary and current-book follow contract
- dedicated TTS can switch between original text and translated text
- translated TTS can consume the selected translation archive and expose that archive provenance
- translated TTS keeps its live waiting-source provenance aligned with the current reading source when no archive is selected

Explicitly not included in P9:
- paragraph-level or sentence-level TTS segmentation
- new speech engines, voice/provider expansion, or playback queue work
- cross-book translated-TTS archive browsing
- remote/cloud TTS sync surfaces

Closeout review verdict:
- no remaining structural blocker was found in the translated-TTS reading-mode line
- archive-backed and live waiting-source paths are now both represented inside the dedicated TTS notebook contract
- the next recommended mainline is not more `P9` micro-slices, but the next reader workspace line that still has a material parity gap

## P10 Reader TTS Runtime Productization

Goal: move dedicated TTS from a correct reading-mode shell into a more trustworthy runtime surface, starting with active-session retarget behavior.

- [x] P10-1.1 Retarget active TTS sessions when ownership changes
  - Outcome: switching books, switching between source/translated reading, or explicitly returning to the current reading source no longer leaves an active TTS session silently speaking the stale old target while the notebook claims it has moved.
  - Touches: reader TTS retarget policy helper, route-owned TTS session transitions, focused TTS helper tests, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 17a7a2d
  - Tutorial: `tutorials/commit/0600-retarget-active-tts-sessions-when-reading-ownership-changes.md`.
  - Notes: this slice does not add media-session integration, paragraph segmentation, or a richer playback queue. It only makes explicit TTS ownership changes stop lying about which text is currently armed or being spoken.

- [x] P10-1.2 Mirror TTS session state into the browser media session
  - Outcome: dedicated TTS now projects its current target, provenance, and play/pause/stop handlers into the browser-owned media session instead of leaving system-level media controls disconnected from the current reader speech session.
  - Touches: web TTS runtime, reader TTS controller session sync, runtime helper tests, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 0b42ede
  - Tutorial: `tutorials/commit/0601-mirror-reader-tts-into-the-browser-media-session.md`.
  - Notes: this slice does not add paragraph relocation, queueing, or richer external playback transports. It only makes the existing browser-side TTS session visible and controllable through Media Session when the browser supports it.

- [x] P10-1.3 Carry translation target language into the speech runtime
  - Outcome: translated TTS no longer always falls back to the browser UI language; it now carries the chosen translation target language into the speech target and the runtime start path.
  - Touches: reader TTS target contract, translated-target resolution, controller runtime language selection, focused TTS helper tests, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 0558021
  - Tutorial: `tutorials/commit/0602-carry-translation-target-language-into-the-speech-runtime.md`.
  - Notes: this slice does not try to guess source-language pronunciation from arbitrary book text. It only makes translated TTS honor the explicit target language that the translation workflow already knows.

- [x] P10-1.4 Prefer visible plain-text body excerpts over chapter-title fallback
  - Outcome: source-side TTS for TXT no longer falls straight from selection to chapter-title fallback; when there is no active selection, it now uses a stable visible-body excerpt from the plain-text viewport so the reading target sounds like the book instead of its scaffold labels.
  - Touches: plain-text viewport preview state, source-side TTS target resolution, focused TTS helper tests, TXT/TTS smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader uses visible plain-text excerpts as the source tts target in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 089c54b
  - Tutorial: `tutorials/commit/0603-prefer-visible-plain-text-body-excerpts-for-source-tts.md`.
  - Notes: this slice is intentionally TXT-only. It does not attempt unstable live-excerpt extraction for EPUB/PDF/Foliate surfaces, and it does not add source-language detection.

- [x] P10-1.5 Carry EPUB metadata language into source-side TTS targets
  - Outcome: source-side TTS for EPUB/Foliate no longer always falls back to `navigator.language`; when book metadata already declares a language, that value now travels through preview state into source-side TTS target resolution.
  - Touches: foliate preview state emission, source-side TTS target contract, focused TTS helper tests, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 37a2d23
  - Tutorial: `tutorials/commit/0604-carry-epub-metadata-language-into-source-tts.md`.
  - Notes: this slice intentionally does not guess source language from arbitrary text, and it does not add TXT/PDF language inference.

- [x] P10-1.6 Record the P10 closeout boundary
  - Outcome: the repo now explicitly states which reader TTS runtime guarantees count as shipped in `P10`, and which larger playback/runtime ideas remain intentionally outside this line.
  - Touches: checklist/tutorial docs only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 11d9a4b
  - Tutorial: `tutorials/commit/0605-close-the-p10-reader-tts-runtime-line.md`.
  - Notes: this closeout does not add EPUB/PDF live excerpt extraction, source-language inference, or playback queue work. It only makes the stopping point durable inside the repo.

- [x] P10-1.7 Run the P10 closeout review
  - Outcome: the repo now records whether `P10` still has a structural blocker and whether the next recommended step is more `P10` micro-slices or a new reader workspace mainline.
  - Touches: checklist/tutorial docs only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: 1c5b196
  - Tutorial: `tutorials/commit/0606-record-the-p10-closeout-review.md`.
  - Notes: this review does not widen `P10` scope. It only records the verdict on the already-landed runtime slices.

### P10 Closeout

Included in P10:
- active-session retargeting now follows explicit ownership changes such as book switches, source/translated mode switches, and follow-current resets
- dedicated TTS now mirrors its live session into the browser media session with play, pause, and stop controls
- translated TTS now carries explicit translation target language into runtime speech startup
- TXT source-side TTS now prefers stable visible-body excerpts over chapter-title scaffold fallback
- EPUB/Foliate source-side TTS now carries stable book metadata language into source-target resolution

Explicitly not included in P10:
- paragraph-level or sentence-level TTS segmentation or relocation
- richer playback queue, queue navigation, or transport expansion beyond browser media session
- unstable live-excerpt extraction for EPUB, PDF, or Foliate body content
- source-language guessing or inference from arbitrary text for TXT, PDF, or generic source-side playback

Closeout review verdict:
- no remaining structural blocker was found in the shipped P10 runtime line
- the remaining gaps are deliberate scope limits around richer playback/runtime surfaces, not unresolved contract failures in the current TTS route
- the next recommended mainline is not more `P10` micro-slices, but the next reader workspace or playback surface that still has a material parity gap

## P11 Reader Playback Surface Parity

Goal: productize the next reader playback surface after `P10` by making the active TTS location recoverable when the reading viewport drifts away from the text that is still armed or being spoken.

- [x] P11-1.1 Add a back-to-TTS-location relocation control
  - Outcome: dedicated TTS now keeps navigation metadata on the active speech target and exposes a visible `回到朗读位置` action when the current reading viewport has moved away from the text that TTS is still locked to.
  - Touches: reader TTS target/session metadata, route-owned relocation detection and navigation, notebook/TTS workspace summary copy, focused helper tests, focused TTS smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `2a35b6a`.
  - Tutorial: `tutorials/commit/0607-add-a-back-to-tts-location-playback-control.md`.
  - Notes: this slice does not add queueing, sentence stepping, or EPUB/PDF live excerpt extraction. It only makes the current playback location recoverable from the notebook surface.

- [x] P11-1.2 Add readable playback-location summaries to dedicated TTS mode
  - Outcome: dedicated TTS now shows where the active playback target lives, and translated waiting states fall back to the current translation-source location instead of dropping back to an empty generic status.
  - Touches: reader TTS target/session metadata, route-owned source/translated location propagation, notebook/TTS workspace summary copy, focused helper tests, focused TTS smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `9155a69`.
  - Tutorial: `tutorials/commit/0608-add-readable-playback-location-summaries-to-dedicated-tts.md`.
  - Notes: this slice stays on the playback surface. It does not add queueing, sentence stepping, or EPUB/PDF live excerpt extraction.

- [x] P11-1.3 Add a persistent in-reader TTS mini playback bar
  - Outcome: the active TTS session now stays visible on the reading canvas itself, so readers can reopen dedicated TTS, pause/resume, stop, and jump back to the playback location without reopening the notebook first.
  - Touches: reader stage chrome, route-owned mini-bar visibility and drift detection, shared TTS playback-location helpers, focused helper tests, focused TTS smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `29b652a`.
  - Tutorial: `tutorials/commit/0609-add-a-persistent-in-reader-tts-mini-bar.md`.
  - Notes: this slice projects the existing TTS session back onto the reading surface. It does not add queueing, sentence stepping, or EPUB/PDF live excerpt extraction.

- [x] P11-1.4 Keep the mini playback bar visible while translated TTS is still waiting
  - Outcome: translated TTS no longer drops the reading-canvas playback surface while it is waiting for the current translation source to produce a speakable body, so the reader can still see the waiting state and reopen the TTS workspace from the canvas.
  - Touches: mini-bar visibility helper boundaries, translated waiting target copy, route-owned mini-bar state, focused helper tests, focused TTS smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `86b0c85`.
  - Tutorial: `tutorials/commit/0610-keep-the-mini-tts-bar-visible-while-translated-audio-is-waiting.md`.
  - Notes: this slice does not create a new translated playback runtime. It only keeps the existing waiting state visible on the reading canvas and tied to the current translation source context.

- [x] P11-1.5 Add mode and provenance summaries to the in-reader TTS mini bar
  - Outcome: the reading-canvas playback bar now tells the reader whether it is in original-text playback or translated playback, and which reading/translation source currently owns that playback surface.
  - Touches: in-reader mini-bar presentation, route-owned mode/provenance derivation, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `6c32d89`.
  - Tutorial: `tutorials/commit/0611-add-mode-and-provenance-summaries-to-the-mini-tts-bar.md`.
  - Notes: this slice does not add new playback controls or runtime semantics. It only makes the existing reading-canvas playback surface more explicit.

- [x] P11-1.6 Let translated mini-bar provenance jump straight into translation mode
  - Outcome: when translated playback provenance is already visible on the reading canvas, the mini bar now lets the reader jump straight into `翻译模式` without reopening the TTS workspace first.
  - Touches: in-reader mini-bar actions, stage/route-owned translation-mode navigation, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `3f1753c`.
  - Tutorial: `tutorials/commit/0612-let-the-mini-tts-bar-jump-into-translation-mode.md`.
  - Notes: this slice does not add new translation history behavior or new runtime semantics. It only closes the extra navigation hop between the collapsed playback surface and the existing translation workspace.

- [x] P11-1.7 Let the mini TTS bar resume following the current reading position
  - Outcome: when the reader has locked TTS to an older target and collapsed the notebook, the reading-canvas mini bar can now restore follow-current semantics directly instead of forcing a round trip through the TTS workspace first.
  - Touches: in-reader mini-bar actions, stage/route-owned TTS follow-current navigation, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader uses visible plain-text excerpts as the source tts target in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `77efd8a`.
  - Tutorial: `tutorials/commit/0613-let-the-mini-tts-bar-resume-follow-current.md`.
  - Notes: this slice does not add sentence stepping or new playback runtime behavior. It only projects the existing `回到当前阅读位置` ownership action onto the collapsed canvas surface.

- [x] P11-1.8 Let the mini TTS bar lock the current playback target
  - Outcome: while the reader is still following the live reading position, the collapsed mini bar can now lock the current TTS target directly instead of forcing a reopen of the dedicated TTS workspace first.
  - Touches: in-reader mini-bar actions, stage/route-owned TTS ownership controls, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader uses visible plain-text excerpts as the source tts target in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `375550d`.
  - Tutorial: `tutorials/commit/0614-let-the-mini-tts-bar-lock-the-current-playback-target.md`.
  - Notes: this slice does not add new runtime behavior. It only makes the collapsed playback surface symmetrical with the existing dedicated TTS ownership controls.

- [x] P11-1.9 Let the mini TTS bar switch between source and translated playback
  - Outcome: once the notebook is collapsed, the reading-canvas mini bar can now switch directly between `朗读原文` and `朗读译文` instead of forcing the reader to reopen the dedicated TTS workspace first.
  - Touches: in-reader mini-bar actions, stage/route-owned TTS read-aloud mode switching, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `68e6fa1`.
  - Tutorial: `tutorials/commit/0615-let-the-mini-tts-bar-switch-between-source-and-translated-playback.md`.
  - Notes: this slice does not add new translation persistence or playback runtime behavior. It only projects the existing read-aloud mode toggle onto the collapsed playback surface.

- [x] P11-1.10 Record the P11 closeout boundary
  - Outcome: the repo now explicitly states which playback-surface guarantees count as shipped in `P11`, and which larger playback/runtime ideas remain intentionally outside this line.
  - Touches: checklist/tutorial docs only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `9b8ecd3`.
  - Tutorial: `tutorials/commit/0616-close-the-p11-reader-playback-surface-line.md`.
  - Notes: this closeout does not add sentence stepping, queueing, or new runtime work. It only makes the stopping point durable inside the repo.

- [x] P11-1.11 Run the P11 closeout review
  - Outcome: the repo now records whether `P11` still has a structural blocker and whether the next recommended step is more `P11` micro-slices or a new reader workspace/playback line.
  - Touches: checklist/tutorial docs only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `9b8ecd3`.
  - Tutorial: `tutorials/commit/0617-record-the-p11-closeout-review.md`.
  - Notes: this review does not widen `P11` scope. It only records the verdict on the already-landed playback-surface slices.

### P11 Closeout

Included in P11:
- dedicated TTS keeps enough location metadata to relocate the reader back to the active playback anchor
- dedicated TTS and the canvas mini bar now show readable playback-location summaries instead of falling back to generic status text
- the reading-canvas mini bar stays visible during translated waiting states
- the mini bar now exposes explicit translated/source provenance and can jump straight into translation mode when translated playback provenance already exists
- the mini bar now carries the same follow-current and lock-current ownership controls as the dedicated TTS workspace
- the mini bar can now switch directly between source and translated playback without reopening the notebook

Explicitly not included in P11:
- sentence stepping, paragraph stepping, or finer-grained relocation inside a target
- playback queueing, playlist/next-item controls, or richer transport controls
- EPUB/PDF live excerpt extraction or broader TTS runtime upgrades that belong to `P10`-style runtime work
- cross-book translated playback browsing or broader notebook redesign outside the current playback surface

Closeout review verdict:
- no remaining structural blocker was found in the shipped P11 playback-surface line
- the remaining gaps are larger playback/runtime or notebook-product expansions, not unresolved contract failures in the current mini-bar and dedicated-TTS surfaces
- the next recommended mainline is not more `P11` micro-slices, but the next reader workspace or playback line that still has a material parity gap

## P12 Reader Cross-Mode Playback Navigation

Goal: close the remaining navigation asymmetries between `翻译模式` and `朗读模式`, so readers can move between translation and translated playback without unnecessary notebook detours.

- [x] P12-1.1 Let translation mode jump directly into translated TTS
  - Outcome: when the reader is already in `翻译模式`, they can now jump directly into `朗读模式` with `朗读译文` active instead of manually reopening the TTS workspace and re-selecting translated playback.
  - Touches: translation workspace playback strip, notebook tab switching, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can jump from translation mode into translated tts in web mode|reader lets translated tts mode consume the selected translation archive in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `16b119b`.
  - Tutorial: `tutorials/commit/0618-let-translation-mode-jump-directly-into-translated-tts.md`.
  - Notes: this slice does not add new translation persistence or TTS runtime behavior. It only closes the reverse navigation hop from translation mode back into translated playback.

- [x] P12-1.2 Let translation mode switch translated playback back to source
  - Outcome: once translated playback is already active, the reader can switch it back to `朗读原文` directly from `翻译模式`, without reopening `朗读模式` just to undo the translated mode.
  - Touches: translation workspace playback strip, notebook TTS-mode wiring, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch translated playback back to source from translation mode in web mode|reader can jump from translation mode into translated tts in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `b1ff0e2`.
  - Tutorial: `tutorials/commit/0619-let-translation-mode-switch-translated-playback-back-to-source.md`.
  - Notes: this slice does not change translated TTS runtime ownership or persistence. The existing `在朗读模式中查看` action still keeps its `jump into translated playback` contract; the new action only exposes the reverse mode switch while the reader stays in `翻译模式`.

- [x] P12-1.3 Lock the rebound hop from source playback back into translated TTS
  - Outcome: after `翻译模式` has already switched playback back to `朗读原文`, the same strip still proves it can send the reader back into `朗读译文` again, instead of leaving that rebound edge implicit and unverified.
  - Touches: focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch translated playback back to source from translation mode in web mode|reader can jump from translation mode into translated tts in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `eedf705`.
  - Tutorial: `tutorials/commit/0620-lock-the-translation-to-tts-rebound-hop.md`.
  - Notes: this slice is intentionally test-only. It does not change TTS runtime or notebook behavior; it only hardens the already-shipped cross-mode contract so future refactors cannot silently break the rebound path.

- [x] P12-1.4 Close the P12 cross-mode playback navigation line
  - Outcome: `P12` is explicitly treated as closed now that the translation-to-TTS forward hop, reverse mode switch, and rebound contract are all landed and verified.
  - Touches: parity checklist and tutorial ledger only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `22cc477`.
  - Tutorial: `tutorials/commit/0621-close-the-p12-cross-mode-playback-line.md`.
  - Notes: this closeout does not claim broader playback/runtime or notebook-surface parity. It only closes the `translation mode <-> translated TTS` navigation line itself.

- [x] P12-1.5 Record the P12 closeout review
  - Outcome: the repo now explicitly records that no structural blocker remains inside `P12`, so the next slice should move to a new reading-mode or playback line instead of continuing to micro-slice this one.
  - Touches: parity checklist and tutorial ledger only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `22cc477`.
  - Tutorial: `tutorials/commit/0622-record-the-p12-closeout-review.md`.
  - Notes: this review does not reopen `P12` scope. It only records the verdict and keeps the next-mainline boundary explicit.

## P12 Closeout

Included in `P12`:
- `翻译模式 -> 朗读译文` direct jump
- `翻译模式 -> 朗读原文` direct recovery while staying in translation mode
- rebound proof that the same translation-mode strip can send the reader back into translated playback after that recovery

Intentionally not included in `P12`:
- new TTS runtime semantics or provenance rules
- new notebook or mini-bar playback controls outside the existing cross-mode hop
- broader playback-history, queueing, or media-session work

Closeout review verdict:
- P12 has no remaining structural blocker. The translation-mode playback strip, dedicated TTS translation jump surface, mini-bar translation jump guard, and focused rebound smokes now close the cross-mode playback loop, so the next step should move to a new reading-mode or playback line instead of more P12 micro-slices.

## P13 Reader Playback Route-State Parity

Goal: make dedicated `翻译模式` and `朗读模式` URL-addressable so route state, reload, and notebook tab switches all preserve the same reader playback workspace contract.

- [x] P13-1.1 Make dedicated translation and TTS notebook modes URL-addressable
  - Outcome: opening the reader with `workspace=translation` selects `翻译模式`; translation-mode jumps into translated TTS update the route to `workspace=tts`; reload preserves dedicated TTS mode; switching to non-dedicated notebook tabs clears the workspace query param.
  - Touches: reader route parsing and href sync, notebook tab switching, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores dedicated translation and tts modes from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `22c4b8d`.
  - Tutorial: `tutorials/commit/0623-make-dedicated-translation-and-tts-modes-url-addressable.md`.
  - Notes: this slice is route-state parity only. It does not widen notebook persistence beyond the dedicated `translation` and `tts` deep-link contract, and non-dedicated tabs such as `笔记`, `AI`, and `同步` remain query-param free.

- [x] P13-1.2 Make dedicated TTS read-aloud mode route-addressable
  - Outcome: `workspace=tts` now also carries `tts=source|translated`, so direct TTS opens, translation-to-TTS jumps, TTS mode switches, and reload all preserve the same dedicated playback-mode contract without depending on persisted reader settings.
  - Touches: reader route parsing and href sync, TTS read-aloud mode route override, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader restores dedicated tts read-aloud mode from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `f7a8c3b`.
  - Tutorial: `tutorials/commit/0624-make-dedicated-tts-read-aloud-mode-route-addressable.md`.
  - Notes: this slice only routes the dedicated TTS playback mode. It does not make non-TTS reader settings route-owned, and it does not widen route state to cover broader playback/runtime session semantics.

- [x] P13-1.3 Make dedicated translation target language route-addressable
  - Outcome: `workspace=translation` now also carries `tl=zh|en`, so direct translation opens, target-language switches, and reload all preserve the same dedicated translation-mode language contract instead of falling back to component-local defaults.
  - Touches: reader route parsing and href sync, dedicated translation-mode target-language wiring, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader can open translation mode as a dedicated notebook tab|reader restores dedicated translation target language from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `339cbb7`.
  - Tutorial: `tutorials/commit/0625-make-dedicated-translation-target-language-route-addressable.md`.
  - Notes: this slice only routes the dedicated translation target language. It does not make translation provider choice route-owned, and it does not widen route state into broader translation history or runtime semantics.

- [x] P13-1.4 Make dedicated translation provider route-addressable
  - Outcome: `workspace=translation` now also carries `tp=deepl|yandex`, so direct translation opens, provider switches, and reload all preserve the same dedicated translation-provider contract instead of falling back to workspace-local provider state.
  - Touches: reader route parsing and href sync, dedicated translation-provider wiring, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation provider from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `821c8f6`.
  - Tutorial: `tutorials/commit/0626-make-dedicated-translation-provider-route-addressable.md`.
  - Notes: this slice only routes the dedicated translation provider choice. It does not make translation history selection or broader provider/runtime state route-owned.

- [x] P13-1.5 Make dedicated translation archive selection route-addressable
  - Outcome: dedicated `翻译模式` and translated `朗读模式` now also carry `ta=<translation-history-entry-id>`, so direct route opens, translation-to-TTS jumps, and reload all preserve the same archived translation provenance instead of depending on ambient current-book selection state.
  - Touches: reader route parsing and href sync, route-owned translation history selection wiring, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation archive selection from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `d24613f`.
  - Tutorial: `tutorials/commit/0627-make-dedicated-translation-archive-selection-route-addressable.md`.
  - Notes: this slice only routes the selected translation archive that already drives dedicated translation and translated-TTS provenance. It does not route-own lookup selection, broad notebook browse state, or pinned/follow-current translation-source text.

- [x] P13-1.6 Record the P13 closeout boundary
  - Outcome: the repo now explicitly states which dedicated translation/TTS route-state guarantees count as shipped in `P13`, and which larger reading-mode payload/state ideas remain intentionally outside this line.
  - Touches: checklist/tutorial docs only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `16b1318`.
  - Tutorial: `tutorials/commit/0628-close-the-p13-reader-route-state-line.md`.
  - Notes: this closeout does not add route-owned pinned translation-source text, pinned TTS target text, or broader notebook browsing state. It only makes the stopping point durable inside the repo.

- [x] P13-1.7 Run the P13 closeout review
  - Outcome: the repo now records whether `P13` still has a structural blocker and whether the next recommended step is more `P13` micro-slices or a new reader playback/reading-mode line.
  - Touches: checklist/tutorial docs only.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `16b1318`.
  - Tutorial: `tutorials/commit/0629-record-the-p13-closeout-review.md`.
  - Notes: this review does not widen `P13` scope. It only records the verdict on the already-landed route-state slices.

### P13 Closeout

Included in P13:
- dedicated `翻译模式` and `朗读模式` are URL-addressable through `workspace=translation|tts`
- dedicated TTS read-aloud mode is route-owned through `tts=source|translated`
- dedicated translation target language is route-owned through `tl=zh|en`
- dedicated translation provider is route-owned through `tp=deepl|yandex`
- the selected archived translation that drives dedicated translation and translated TTS provenance is route-owned through `ta=<translation-history-entry-id>`

Explicitly not included in P13:
- route-owned pinned translation-source text or labels
- route-owned pinned TTS target text or labels
- route-owned notebook browse/view state beyond the selected translation archive
- arbitrary current-book assistance history replay through URL payloads

Closeout review verdict:
- no remaining structural blocker was found inside the current route-state parity line
- the remaining local reading-mode states now depend on text payloads such as pinned translation source or pinned TTS target, which do not fit the existing compact deep-link contract
- the next recommended mainline is not more `P13` micro-slices, but a new reader playback or reading-mode line if those payload-heavy ownership states need to be productized further

## P14 Reader Mode Ownership Persistence

Goal: make pinned reading-mode ownership behave like a trustworthy per-book reader state instead of a fragile live-session toggle.

- [x] P14-1.1 Persist current-book translation-mode ownership across reload
  - Outcome: dedicated `翻译模式` now restores its current-book ownership state across reload for the same book, including whether it is following the current source or locked to a pinned translation source, so reload no longer silently snaps the mode back to follow-current.
  - Touches: reader page-local translation ownership persistence, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation ownership for the same book across reload"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `4d42a76`.
  - Tutorial: `tutorials/commit/0630-persist-current-book-translation-mode-ownership.md`.
  - Notes: this slice only persists translation-mode ownership for the current book. It does not make pinned translation payload route-owned, and it does not yet persist pinned TTS target ownership.

- [x] P14-1.2 Persist current-book TTS ownership across reload
  - Outcome: dedicated `朗读模式` now restores its current-book ownership state across reload for the same book, including whether it is following the current source or locked to a pinned TTS target, so reload no longer silently snaps the mode back to follow-current.
  - Touches: reader page-local TTS ownership persistence, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated tts ownership for the same book across reload"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `2c7dec9`.
  - Tutorial: `tutorials/commit/0631-persist-current-book-tts-ownership.md`.
  - Notes: this slice only persists TTS ownership for the current book. It does not make pinned TTS payload route-owned, and it does not yet unify translated-TTS ownership persistence with archive/follow-current recovery rules.

- [x] P14-1.3 Persist current-book TTS read-aloud mode across reload
  - Outcome: dedicated `朗读模式` now restores `朗读原文 / 朗读译文` per book across reload, so switching one book into translated playback no longer silently leaks that mode into another book.
  - Touches: reader page-local TTS mode persistence, collapsed mini-bar route-sync guard, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated tts read-aloud mode from route state in web mode|reader can open tts mode as a dedicated notebook tab|reader restores dedicated tts read-aloud mode per book across reload"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `94c267e`.
  - Tutorial: `tutorials/commit/0632-persist-current-book-tts-read-aloud-mode.md`.
  - Notes: this slice keeps route-owned `workspace=tts&tts=...` override semantics for visible dedicated TTS mode, but collapsed mini-bar mode switches no longer reopen the notebook just to rewrite route state. It still does not make pinned TTS payload text route-owned.

- [x] P14-1.4 Persist current-book translated-TTS owner across reload
  - Outcome: current-book translated playback now restores whether dedicated `朗读模式` belongs to a `历史译文` path or a `live translated` path, so the same book no longer silently snaps back to archive-backed playback just because an older translation history selection still exists.
  - Touches: reader page-local translated-owner persistence, dedicated translation-to-TTS provenance handoff, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader lets translated tts mode consume the selected translation archive in web mode|reader preserves live translated tts ownership over archive selection across reload"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `a792920`.
  - Tutorial: `tutorials/commit/0633-persist-current-book-translated-tts-owner-across-reload.md`.
  - Notes: this slice persists the translated-TTS owner decision and stops live owner from silently downgrading into archive-backed playback. It does not make pinned translation payload text route-owned.

- [x] P14-1.5 Persist current-book live translated-TTS snapshots across reload
  - Outcome: same-book translated playback now restores the most recent live translated body even when the live translation result is no longer reconstructable from `assistanceState` or a surviving exact-match history entry, so reload no longer drops a live-owner session into an empty/wrong translated target.
  - Touches: reader page-local live translated snapshot persistence, live translated target reconstruction, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader lets translated tts mode consume the selected translation archive in web mode|reader restores live translated tts snapshot over archive selection across reload"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `1440d42`.
  - Tutorial: `tutorials/commit/0634-persist-current-book-live-translated-tts-snapshots.md`.
  - Notes: this slice only persists current-book live translated playback snapshots. It still does not make translated payload text route-owned deep-link state, and it does not widen translated playback into a cross-book archive system.

- [x] P14-1.6 Persist current-book live translation snapshots across reload
  - Outcome: same-book dedicated `翻译模式` now restores the most recent live translated body even when reload no longer has a live `assistanceState` or a surviving exact-match history entry, so the current translation panel does not silently drop back to empty or stale archive semantics.
  - Touches: reader page-local live translation snapshot persistence, translation workspace result reconstruction, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores live translation snapshots for the same book across reload|reader restores dedicated translation ownership for the same book across reload"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `0396e13`.
  - Tutorial: `tutorials/commit/0635-persist-current-book-live-translation-snapshots.md`.
  - Notes: this slice only persists current-book live translation result snapshots for dedicated `翻译模式`. It does not make live translation payload text route-owned deep-link state, and it does not widen translation history into a cross-book archive/replay system.

- [x] P14-1.7 Persist current-book translation mode config across reload
  - Outcome: dedicated `翻译模式` now restores its target language and provider per book across reload, so one book's `English / Yandex` choice no longer silently leaks into another book and same-book reload no longer snaps back to `中文 / DeepL`.
  - Touches: reader page-local translation mode config persistence, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation mode config per book across reload|reader restores dedicated translation ownership for the same book across reload|reader restores dedicated translation target language from route state in web mode|reader restores dedicated translation provider from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `349f8ad`.
  - Tutorial: `tutorials/commit/0636-persist-current-book-translation-mode-config.md`.
  - Notes: this slice only persists current-book translation target language and provider. Visible route-owned `workspace=translation&tl=...&tp=...` overrides still win, and pinned translation payload text remains local reader state rather than deep-link state.

- [x] P14-1.8 Persist current-book archived translation provenance across reload
  - Outcome: when the current book restores a selected historical translation record without an explicit route-owned `ta/tl/tp`, dedicated `翻译模式` now also restores that record's own target language and provider, so reload no longer shows the right archived body under the wrong live config chips.
  - Touches: reader page-local archived translation provenance restore, focused reader smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores current-book archived translation provenance across reload|reader restores dedicated translation archive selection from route state in web mode|reader restores dedicated translation mode config per book across reload|reader restores dedicated translation target language from route state in web mode|reader restores dedicated translation provider from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `3c985c6`.
  - Tutorial: `tutorials/commit/0637-persist-current-book-archived-translation-provenance.md`.
  - Notes: this slice only aligns same-book restored archive provenance with dedicated `翻译模式` when the route does not explicitly own `ta/tl/tp`. Explicit route-owned archive/language/provider state still wins, and this slice does not introduce cross-book archive browsing.

- [x] P14-1.9 Close the P14 reader mode ownership persistence line
  - Outcome: `P14` is now explicitly bounded as the current-book restore line for dedicated translation/TTS ownership, config, live bodies, and archive provenance, so follow-up work no longer needs to guess whether more micro-slices still belong here.
  - Touches: reader parity checklist, closeout tutorial.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `287b553`.
  - Tutorial: `tutorials/commit/0638-close-the-p14-reader-mode-ownership-line.md`.
  - Notes: this closeout keeps payload-heavy deep-link state and cross-book archive browsing out of `P14`.

- [x] P14-1.10 Record the P14 closeout review
  - Outcome: the repo now records that no remaining structural blocker was found inside the current-book ownership persistence line, and it names the residuals that are intentionally outside this phase.
  - Touches: reader parity checklist, closeout review tutorial.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `254789f`.
  - Tutorial: `tutorials/commit/0639-record-the-p14-closeout-review.md`.
  - Notes: route-owned payload text, cross-book archive/replay, and broader workspace-shell persistence are left for a different mainline if they become worth productizing.

### P14 Closeout

Closeout review verdict:
- no remaining structural blocker was found inside the current-book reading-mode ownership persistence line
- dedicated `翻译模式` now restores same-book ownership, config, live translated body, and archived provenance without depending on an explicit route-owned `ta/tl/tp`
- dedicated `朗读模式` now restores same-book ownership, read-aloud mode, translated owner, and live translated body without silently collapsing back to follow-current or archive defaults
- the remaining unsolved state is no longer “current-book ownership persistence”; it is payload-heavy deep-link state such as pinned text bodies, or broader cross-book archive/replay behavior
- the next recommended mainline is not more `P14` micro-slices, but a new reader playback / reading-mode line if those payload-heavy or cross-book states need to become explicit product surface

## P15 Reader Source Playback Parity

Goal: make source-side TTS prefer real reading text before scaffold labels across reader formats that already expose trustworthy body content.

- [x] P15-1.1 Prefer current chapter body excerpts over chapter-title fallback for EPUB/Foliate
  - Outcome: source-side EPUB/Foliate TTS now carries real chapter body sentences into dedicated `朗读模式` before falling back to chapter-title scaffolding, and the source-playback smoke contract is aligned with the current translated-waiting copy.
  - Touches: Foliate reader preview-state excerpt extraction, focused TTS/source smoke coverage, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader uses current chapter body excerpts as the EPUB source tts target in web mode|reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`.
  - Done commit: `bc5cfa2`.
  - Tutorial: `tutorials/commit/0640-prefer-current-chapter-body-excerpts-for-epub-source-tts.md`.
  - Notes: this slice only promotes real chapter body text ahead of chapter-title fallback for Foliate-backed source playback. It does not yet guarantee heading-free excerpts in every preloaded renderer state, and it does not widen source excerpt extraction into PDF or other non-Foliate formats.


## P16 Reader Inline Translation And Reading-Mode Surface

Goal: move translation toward a real reading-surface mode without weakening the existing Tauri-owned provider boundary or replacing the dedicated notebook translation workspace.

- [x] P16-1.1 Define the inline translation domain contract
  - Outcome: inline translation now has a pure state contract for visible text candidates, block status, source/translation visibility, translated text retention, and retryable failures before any DOM or provider integration lands.
  - Touches: reader inline-translation helper, reader shared types/index exports, focused helper tests, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-inline-translation-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-inline-translation-tests --noEmit false && node --test ./.tmp-inline-translation-tests/src/lib/reader/inlineTranslation.test.js` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: this commit.
  - Tutorial: `tutorials/commit/0649-define-reader-inline-translation-contract.md`.
  - Notes: this slice intentionally does not observe renderer DOM, call DeepL/Yandex, or show inline UI. It only creates the auditable state machine that later viewport and workspace slices can share.

- [x] P16-1.2 Surface inline translation candidates from the viewport
  - Outcome: translation mode now exposes a route-owned 正文内译文 layer while `ReaderViewport` emits conservative TXT and Foliate body excerpt candidates through reader-state updates.
  - Touches: reader viewport candidate event, reader stage inline layer mount, route-owned inline translation state, focused web smoke, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader exposes inline translation mode without replacing the notebook translation workspace"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: pending user commit.
  - Tutorial: `tutorials/commit/0650-surface-inline-translation-candidates.md`.
  - Notes: this slice intentionally does not walk arbitrary iframe DOM, call translation providers from the renderer, or insert translated DOM into Foliate content. PDF/CBZ and unsupported formats report waiting/unsupported copy instead.

- [x] P16-1.3 Add a focused paragraph/RSVP reading-mode shell
  - Outcome: the reader now exposes a temporary focused-reading overlay with paragraph focus and RSVP-lite entry points that reuse the existing reader preview/selection contract without mutating persisted focus-aid settings.
  - Touches: focused-reading helper state, reader stage/header overlay wiring, route-owned temporary mode state, focused web smoke, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-reading-mode-tests --noEmit false && node --test ./.tmp-reading-mode-tests/src/lib/reader/readingMode.test.js` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens paragraph focus and rsvp-lite reading modes in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed; user requested a dirty working tree only.
  - Tutorial: `tutorials/commit/0651-add-focused-reading-mode-shell.md`.
  - Notes: this first slice stays intentionally small. It does not add Readest's fuller RSVP controller, saved stop position, or temporary Foliate highlight ownership, and PDF/CBZ still show capability copy instead of pretending to extract text.

## P17 TTS Playback Runtime And Panel Maturity

Goal: move dedicated TTS closer to a fuller reader playback surface by giving later UI slices a pure queue/rate/timeout contract before they touch route state or notebook panels.

- [x] P17-1.1 Add a playback queue and timeout model
  - Outcome: reader playback now has a pure helper for segment queues, boundary-safe previous/next stepping, rate clamping, timeout expiry, and no-target summaries before any playback-panel UI lands.
  - Touches: playback queue helper, reader shared types/index exports, focused helper tests, helper test script, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-playback-queue-tests --noEmit false && node --test ./.tmp-playback-queue-tests/src/lib/reader/playbackQueue.test.js` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed; user requested a dirty working tree only.
  - Tutorial: `tutorials/commit/0652-add-reader-playback-queue-model.md`.
  - Notes: this slice intentionally does not modify `+page.svelte`, `ReaderTtsWorkspace.svelte`, or any playback UI. It only turns `ReaderTtsSpeechTarget` inputs into an auditable queue model that Task 5 can wire into real controls.

- [x] P17-1.2 Extract the playback panel from the TTS workspace
  - Outcome: dedicated TTS now exposes a route-owned playback panel with mature controls for source/translated mode switching, queue stepping, rate, timeout, and browser voice capability copy while `ReaderTtsWorkspace.svelte` stays focused on summary and provenance cards.
  - Touches: `ReaderPlaybackPanel.svelte`, `ReaderTtsWorkspace.svelte`, `ReaderNotebook.svelte`, `+page.svelte`, focused web smoke, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader tts workspace exposes mature playback controls in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (pending).
  - Done commit: not committed; user requested a dirty working tree only.
  - Tutorial: `tutorials/commit/0653-extract-reader-playback-panel.md`.
  - Notes: this first panel slice keeps playback queue state local to the reader route and derives it from the current `effectiveTtsTarget`. It does not persist voice choice, expose multi-segment chapter slicing yet, or claim that the current Web Speech runtime already consumes the panel's rate/voice settings.

## P18 Annotation And Footnote Interaction Maturity

Goal: make selection and footnote interactions feel like a mature reading surface without letting popup UI become a second owner of annotation, assistance, or playback state.

- [x] P18-1.1 Add a selection-near annotation popup
  - Outcome: the reader now exposes a selection-near action toolbar for TXT and a conservative bottom-center fallback for other reader surfaces, while keeping note/highlight/lookup/translation/TTS side effects inside the route.
  - Touches: `ReaderAnnotationPopup.svelte`, `ReaderViewport.svelte`, `ReaderStage.svelte`, `+page.svelte`, focused web smoke, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader shows selection-near annotation actions in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed; user requested a dirty working tree only.
  - Tutorial: `tutorials/commit/0654-add-reader-annotation-popup.md`.
  - Notes: this slice does not add footnote previews, cross-iframe exact popup geometry, or new annotation persistence. PDF/CBZ still keep a copy-only popup so the UI does not overclaim unstable in-place actions.

- [x] P18-1.2 Open footnote-like links in a reader popup
  - Outcome: EPUB footnote-like links now open a stage-owned `脚注预览` dialog that shows extracted note content when possible and falls back to a jump action when the renderer cannot safely build a preview.
  - Touches: `ReaderFootnotePopup.svelte`, `ReaderViewport.svelte`, `ReaderStage.svelte`, focused EPUB smoke, local footnote fixture, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens footnote links in a reader popup in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed; user requested a dirty working tree only.
  - Tutorial: `tutorials/commit/0655-add-reader-footnote-popup.md`.
  - Notes: interception/extraction stays in `ReaderViewport` because only the renderer boundary knows which loaded document owns the clicked internal link. Popup placement stays in `ReaderStage`, and fallback navigation still runs through the existing `controlrequest -> href` path instead of creating a second navigation owner.

- [x] P18-1.3 Extract reader sidebar annotation presentation
  - Outcome: the reader annotation/sidebar slice now renders bookmarks, highlights, and notes through a dedicated presentation child while `ReaderSidebar.svelte` keeps all reactive derivation, localStorage-backed highlight workspace state, and mutation helpers.
  - Touches: `ReaderSidebarAnnotations.svelte`, `ReaderSidebar.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader supports txt notes through selection, persistence, and note reopen in web mode|reader productizes bookmarks as current reading positions in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`2980`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed; user requested no commit.
  - Tutorial: `tutorials/commit/0656-extract-reader-sidebar-annotation-presentation.md`.
  - Notes: baseline `ReaderSidebar.svelte` line count for this slice was `4178`. The extraction stays intentionally conservative: the child accepts a wide prop surface, preserves existing strings/ARIA copy, and leaves the saved-highlight-selection panel in the parent through the `highlights-extra` slot so cross-book import/export and refresh state do not change owners.

- [x] P18-1.4 Extract reader sidebar search presentation
  - Outcome: the reader sidebar search tab now renders through a dedicated presentation child while `ReaderSidebar.svelte` keeps the search controller wiring, history filter state, and all route-owned search mutations.
  - Touches: `ReaderSidebarSearch.svelte`, `ReaderSidebar.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader search states read like one product surface across txt and epub"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`2448`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet.
  - Tutorial: `tutorials/commit/0658-extract-reader-sidebar-search-presentation.md`.
  - Notes: baseline `ReaderSidebar.svelte` line count for this slice was `2980`. The extraction stays presentation-only on purpose: the parent still owns `searchHistoryFilter`, derived summary/result indexes, and all search-controller callbacks so cache/history/result navigation semantics do not split across components.

- [x] P18-1.5 Extract saved highlight-selection presentation
  - Outcome: the cross-book saved highlight-selection workspace now renders through a dedicated child while `ReaderSidebar.svelte` keeps import/export validation, cross-book matching heuristics, workspace persistence, and all mutation ownership.
  - Touches: `ReaderSidebarHighlightSelections.svelte`, `ReaderSidebar.svelte`, `ReaderSidebarAnnotations.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`2177`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet.
  - Tutorial: `tutorials/commit/0659-extract-reader-saved-highlight-selection-presentation.md`.
  - Notes: baseline `ReaderSidebar.svelte` line count for this slice was `2449`. The extraction intentionally keeps all cross-book import/export parsing, refresh summaries, and persisted workspace state in the parent. It also removes the old `ReaderSidebarAnnotations.svelte` global-style patching for slot content so the saved-selection markup and CSS share one owner again.

- [x] P18-1.6 Extract reader overview and TOC presentation
  - Outcome: the book-summary card, overflow menu, and TOC preview now render through a dedicated child while `ReaderSidebar.svelte` keeps sidebar shell ownership, tab routing, and all non-navigation workspace state.
  - Touches: `ReaderSidebarOverview.svelte`, `ReaderSidebar.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader keeps the overview sidebar surface legible in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1866`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet.
  - Tutorial: `tutorials/commit/0660-extract-reader-overview-and-toc-presentation.md`.
  - Notes: baseline `ReaderSidebar.svelte` line count for this slice was `2162`. The extraction keeps `activeTab`, search/highlight owners, and the sidebar shell in the parent, but moves the local book-menu affordance and TOC rendering into one presentation child so the parent no longer carries that UI-only state. The focused smoke certifies overview visibility, overflow-menu presence, and that clicking a non-active TOC entry can still activate it; it does not certify broader metadata or label semantics beyond that surface.

- [x] P18-1.7 Extract reader sidebar chrome
  - Outcome: move the sidebar header controls and tab strip into `ReaderSidebarChrome.svelte` while `ReaderSidebar.svelte` keeps tab ownership, workspace routing, and persistence-heavy reader state.
  - Touches: `ReaderSidebarChrome.svelte`, `ReaderSidebar.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader sidebar chrome keeps tab routing legible in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1663`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: `3769fd7`.
  - Tutorial: `tutorials/commit/0661-extract-reader-sidebar-chrome.md`.
  - Notes: baseline `ReaderSidebar.svelte` line count for this slice was `1862`. This seam stays presentation-only. The child emits explicit toggle, pin, close, and tab-selection intents, but `ReaderSidebar.svelte` still owns the actual tab-to-workspace switch plus saved-highlight persistence and cross-book selection logic.

- [x] P18-1.8 Extract reader sidebar assist presentation host
  - Outcome: the sidebar `assist` tab now mounts a dedicated presentation child while `ReaderSidebar.svelte` keeps active-tab routing and all assistance history ownership aligned with the existing notebook workspace.
  - Touches: `ReaderSidebarAssist.svelte`, `ReaderSidebar.svelte`, `tests/e2e/library-smoke.spec.ts`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader sidebar assist workspace stays legible in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1658`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: `52c0bb5`.
  - Tutorial: `tutorials/commit/0662-extract-reader-sidebar-assist-presentation.md`.
  - Notes: baseline `ReaderSidebar.svelte` line count for this slice was `1663`. The new child stays presentation-only on purpose: it wraps the `ReaderAssistWorkspace` host and forwards the existing request/history callbacks, but it does not become a second owner of active-tab routing, local assistance restore state, or notebook/archive semantics.

- [x] P18-1.9 Extract reader sidebar annotation controller
  - Outcome: current-book annotation derived state, group open/close rules, and highlight-selection helpers move into `sidebarAnnotations.ts` while `ReaderSidebar.svelte` keeps persistence, cross-book saved-highlight ownership, tab routing, and scroll-to-active effects.
  - Touches: `src/lib/reader/sidebarAnnotations.ts`, `ReaderSidebar.svelte`, `tests/e2e/library-smoke.spec.ts`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader annotation controller interactions stay legible in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1512`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet.
  - Tutorial: `tutorials/commit/0663-extract-reader-sidebar-annotation-controller.md`.
  - Notes: this slice is intentionally about current-book controller logic only. It does not move cross-book selection import/export, route-tab ownership, or the existing `ReaderSidebarAnnotations.svelte` presentation contract. The smoke creates real TXT highlights and drives select-all, selected filtering, individual unselect, and clear-selection behavior through the extracted controller path.

- [x] P18-1.10 Extract saved-highlight helper logic
  - Outcome: saved-highlight refresh labels/details, export payload validation, imported-name generation, existing cross-book lookup, imported highlight matching, import preview shaping, import-source shaping, and refresh-summary shaping now live in `sidebarHighlightSelections.ts`.
  - Touches: `src/lib/reader/sidebarHighlightSelections.ts`, `ReaderSidebar.svelte`, `tests/e2e/library-smoke.spec.ts`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader saved-highlight helper flows stay legible in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1261`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet.
  - Tutorial: `tutorials/commit/0664-extract-reader-sidebar-saved-highlight-helpers.md`.
  - Notes: `ReaderSidebar.svelte` still owns saved-highlight state fields, persistence/hydration, action entrypoints, notices, previews, active-tab routing, and the slot mount into `ReaderSidebarHighlightSelections.svelte`. The focused smoke exports a real TXT saved-highlight set, imports it as a cross-book payload, imports matched highlights, and refreshes the imported mapping.

- [x] P18-1.11 Extract highlights workspace persistence helpers
  - Outcome: highlights workspace defaults, persisted payload normalization/validation, saved-selection payload cleanup, and local persistence payload shaping now live in `sidebarHighlightsWorkspace.ts`.
  - Touches: `src/lib/reader/sidebarHighlightsWorkspace.ts`, `ReaderSidebar.svelte`, `tests/e2e/library-smoke.spec.ts`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader highlights workspace persistence stays legible in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` (`1194`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet.
  - Tutorial: `tutorials/commit/0665-extract-reader-sidebar-highlights-workspace-persistence.md`.
  - Notes: `ReaderSidebar.svelte` still owns the mutable workspace fields, async load/save effects, token race guard, service/localStorage branches, active-tab routing, and every other sidebar state owner. The focused smoke persists highlight sort, selected-filter state, selected ids, and a saved highlight set across reload.


## P19 Reader File Boundary Reduction

Goal: keep `+page.svelte` as the reader coordinator while pushing maturity-surface precedence and reset rules into auditable pure helpers instead of growing more route-local reactive branches.

- [x] P19-1.1 Extract route coordination helpers for maturity surfaces
  - Outcome: route coordination for dedicated translation precedence, book-change annotation-popup clearing, and effective-TTS-target playback queue resets now lives in `maturityMode.ts`, with focused helper tests covering the same maturity invariants plus the stage-matching footnote reset rule.
  - Touches: `src/lib/reader/maturityMode.ts`, `src/lib/reader/maturityMode.test.ts`, `src/lib/reader/route.ts`, `src/routes/reader/+page.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-maturity-mode-tests --noEmit false && node --test ./.tmp-maturity-mode-tests/src/lib/reader/maturityMode.test.js` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader exposes inline translation mode without replacing the notebook translation workspace|reader shows selection-near annotation actions in web mode"` (PASS); `wc -l /Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte` (`2853`); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet; user requested no commit.
  - Tutorial: `tutorials/commit/0657-extract-reader-maturity-route-coordination.md`.
  - Notes: Svelte navigation, localStorage restore/persist, and event handlers intentionally remain inside `+page.svelte`. The footnote reset rule is covered in the new pure helper tests so it stays documented alongside the route-owned maturity decisions, but the live popup owner still remains `ReaderStage.svelte`.

- [x] P19-1.2 Extract route book-switch maturity restore bundle
  - Outcome: the current-book maturity restore/reset bundle now resolves through `resolveReaderMaturityBookRestoreState(...)`, so TTS ownership fields, translation ownership/config restore, inline translation reset state, annotation selection clearing, and focused-reading reset semantics are auditable in pure helper code.
  - Touches: `src/lib/reader/maturityMode.ts`, `src/lib/reader/maturityMode.test.ts`, `src/lib/reader/route.ts`, `src/lib/reader/translationOwnership.ts`, `src/routes/reader/+page.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet; user requested no commit.
  - Tutorial: `tutorials/commit/0666-extract-reader-route-maturity-book-restore.md`.
  - Notes: `+page.svelte` still owns localStorage restore calls, `ttsController.stop()`, reactive timing, state assignment, and last-restored book-key guards. The helper only shapes plain restored data and reset targets for the route to apply, and this slice also normalizes the reused translation-restore helper's ESM import path so helper tests remain runnable.

- [x] P19-1.3 Extract route TTS mini-bar derived state
  - Outcome: the collapsed TTS mini-bar now resolves its visible/status/context/target/location/action/capability bundle through `resolveReaderTtsMiniBarState(...)`, so the route no longer open-codes the whole label and capability cluster.
  - Touches: `package.json`, `src/lib/reader/currentBookPersistence.ts`, `src/lib/reader/tts.ts`, `src/lib/reader/ttsOwnership.ts`, `src/lib/reader/ttsOwnership.test.ts`, `src/lib/reader/index.ts`, `src/routes/reader/+page.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader tts workspace exposes mature playback controls in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet; user requested no commit.
  - Tutorial: `tutorials/commit/0667-extract-reader-tts-mini-bar-derived-state.md`.
  - Notes: runtime actions, route sync, notebook ownership, effective TTS target ownership, and translated-source ownership remain in `+page.svelte`. The new helper only shapes plain mini-bar display/action state from already-owned inputs, and `test:reader-helpers` now includes `ttsOwnership.test.ts` directly instead of relying on an ad hoc command.

- [x] P19-1.4 Extract translation-live and translated-TTS derivation
  - Outcome: the route now delegates the pure live translation snapshot, panel-result, translated-source, and translated-TTS snapshot derivation chain to `resolveReaderTranslationTtsDerivationState(...)` while keeping persistence and runtime ownership in `+page.svelte`.
  - Touches: `src/lib/reader/ttsOwnership.ts`, `src/lib/reader/ttsOwnership.test.ts`, `src/lib/reader/index.ts`, `src/routes/reader/+page.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader tts workspace exposes mature playback controls in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet; user requested no commit.
  - Tutorial: `tutorials/commit/0668-extract-reader-translation-tts-derivation.md`.
  - Notes: `+page.svelte` still owns current preview, assistance state/history, translated-TTS owner, current-book localStorage persistence, and the route-local `resolveCurrentLiveTranslatedTtsResult()` call. The helper only combines existing translation and TTS ownership helpers into one auditable plain-data result.

- [x] P19-1.5 Extract current-book persistence guards
  - Outcome: current-book persist safety checks for translation live snapshots, translation mode config, and the bundled TTS ownership/read-aloud/translated-owner/translated-snapshot state now live in `currentBookPersistence.ts`.
  - Touches: `src/lib/reader/currentBookPersistence.ts`, `src/lib/reader/maturityMode.test.ts`, `src/lib/reader/index.ts`, `src/routes/reader/+page.svelte`, checklist/tutorial docs.
  - Verify: `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS); `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode"` (PASS); `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS).
  - Done commit: not committed yet; user requested no commit.
  - Tutorial: `tutorials/commit/0669-extract-reader-current-book-persist-gates.md`.
  - Notes: `+page.svelte` still owns `localStorage`, `getReaderStorage()`, and the actual persist calls. The helpers only prevent default/pre-restore route state from clobbering per-book persisted state during boot or book switches.

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
| 2026-04-25 | Align the library top toolbar and search behavior | 6cf2fd2 | `pnpm check`; `git diff --check`; `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"` | moves import/search status back into the header, removes the shelf import tile, and stops shelf headers from echoing top-level view semantics |
| 2026-04-25 | Align library cards, covers, metadata, and status density | 3c3eca8 | `pnpm check`; `git diff --check`; `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"` | tightens card and row hierarchy around cover/title/status/progress emphasis so grid/list and continue-reading surfaces feel like one product system |
| 2026-04-25 | Align library sort, filter, section, and scroll behavior | 1b985ad | `pnpm check`; `git diff --check`; `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"` | collapses search/filter states into explicit result shelves and hides workflow sections once the page is in search/filter mode |
| 2026-04-25 | Productize continue reading and recent reading | 260c6f1 | `pnpm check`; `pnpm dlx tsx --test ./src/lib/library/page.test.ts`; `git diff --check` | turns continue/recent shelves into explicit reading-workflow rules and excludes finished books from recent reading |
| 2026-04-25 | Tighten Readest local-library migration and compatibility semantics | 1a3580d | `pnpm check`; `cargo check --manifest-path src-tauri/Cargo.toml`; `pnpm dlx tsx --test ./src/lib/library/page.test.ts ./src/lib/library/desktopCatalog.test.ts`; `git diff --check` | separates detected Readest records from importable local files and from already-compatible br1 copies so migration entry points stop overstating what can be synced |
| 2026-04-25 | Centralize reader format capability boundaries for search and annotations | b850cc5 | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows txt search capability boundary messaging in web mode"`; `git diff --check` | moves TXT search unsupported handling into the shared reader format capability contract so viewport and sidebar behavior can grow from one source of truth |
| 2026-04-25 | Productize reader search states across formats and sidebars | 735f1c7 | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader search states read like one product surface across txt and epub"`; `git diff --check` | turns the sidebar search surface into one coherent product state machine across TXT unsupported search, EPUB empty results, and EPUB hit navigation |
| 2026-04-25 | Add a notebook-grade reader workspace shell | d3f1715 | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open a notebook workspace without collapsing navigation"`; `git diff --check` | replaces the old bridge placeholder with a real notebook workbench, persists pin/tab state at the route level, and keeps legacy sidebar notes/highlights reachable while the new reader workspace line grows |
| 2026-04-25 | Add an AI assistant workspace on top of the notebook shell | ec949f1 | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"`; `git diff --check` | turns the old assist panel into a shared workspace component and mounts it into the notebook so lookup and translation stop being only a sidebar result panel |
| 2026-04-25 | Add a productized library operations surface | 9eef796 | `pnpm check`; `git diff --check` | promotes backup/restore into visible library header actions, groups snapshot/KOReader/Readest Cloud work under one desktop operations menu, and blocks Readest migration from starting while snapshot or remote sync work is already active |
| 2026-04-25 | Expose library desktop support and associated-open queue context | 04aa541 | `pnpm check`; `git diff --check` | adds a library support card for desktop/main-window context, current associated-open queue activity, last processed batches, and recent rejected inputs without inventing any new renderer-owned file-open path |
| 2026-04-25 | Add the first catalog manager and browser surface | 7173705 | `pnpm check`; `pnpm dlx tsx --test ./src/lib/services/catalogs.test.ts`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "catalog route explains the desktop-owned boundary in web mode"`; `git diff --check` | adds `/catalogs`, saved-source management, root/library entry points, and safe browse/search/import-intent presentation without acquisition execution |
| 2026-05-04 | Productize reader sync results and retry flow | 83315d5 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | preserves last export/import/remote results in the reader sync tab, adds retry affordances for failed actions, and refreshes the current managed-book sync state after import or pull |
| 2026-05-04 | Split reader sync activity into current-book and library lanes | cb9dfbd | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | adds separate recent-activity cards for current-book export and whole-library import/push/pull work, with status and timestamps, and hardens the focused smoke to wait for the reader shell before opening the sync tab |
| 2026-05-04 | Productize current-book sync readiness states | e89e59a | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | adds an explicit readiness card for managed-library identity, managed copy availability, locator quality, and source association so current-book export readiness is visible without inferring from one locator sentence |
| 2026-05-04 | Productize whole-library sync readiness states | 181001a | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | adds an explicit readiness card for desktop/runtime availability, exchange import availability, remote config and connectivity state, and the progress-only protocol boundary in the whole-library sync panel |
| 2026-05-04 | Collapse sync status into per-panel timelines | 577c069 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | folds each panel’s recent activity and last-result details into compact status timelines so current-book export and whole-library sync each read as one coherent lane |
| 2026-05-04 | Add explicit empty-state copy to sync timelines | 274a8fe | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | adds readable initial-state copy for both timelines so first-open sync workspaces explain that no current-book export or whole-library sync has been performed yet |
| 2026-05-04 | Tighten sync workspace presentation hierarchy | aa5386e | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | collapses detached export/import/remote result cards back into the per-panel status timelines so current-book and whole-library sync each read as one coherent surface |
| 2026-05-04 | Move sync actions into their owning panels | b4ca91c | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | moves current-book export into the current-book panel and import/push/pull into the whole-library panel, removing the mixed bottom action row and improving narrow-width stacking |
| 2026-04-25 | Execute safe catalog imports inside Tauri | 17c9a4a | `pnpm check`; `cargo test --manifest-path src-tauri/Cargo.toml catalogs`; `pnpm dlx tsx --test ./src/lib/services/catalogs.test.ts`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "catalog route explains the desktop-owned boundary in web mode"`; `git diff --check` | turns ready catalog intents into real managed-library imports by re-resolving them inside Tauri, materializing only allowlisted fixture acquisitions, and reusing the trusted library import pipeline |
| 2026-05-04 | Add a reader sync workspace for KOReader flows | f4f90a3 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | adds a sync tab to the reader notebook, current-book KOReader exchange export, reader-side import/push/pull controls, and explicit desktop-boundary messaging for non-desktop or non-managed-book contexts |
| 2026-05-04 | Productize reader sync results and retry flow | 83315d5 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | adds last-result cards for export/import/remote actions, conflict and remote-status summaries, retry affordances for failed actions, and managed-book state refresh after import or remote pull |
| 2026-05-04 | Split reader toolbar into layout and workspace modes | ce782cb | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"`; `git diff --check` | separates route-level layout controls from notebook mode switching so the top toolbar stops presenting every reader action as one flat utility strip |
| 2026-05-04 | Tighten reader footer progress hierarchy | c5905db | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader opens and reopens EPUB sample assets in web mode"`; `git diff --check` | promotes chapter and location into a dedicated reading-status block, keeps the progress slider central, and demotes format/layout into environment chips while hardening footer-based sample reader smoke |
| 2026-05-04 | Regroup reader header controls by ownership | d27f52a | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader persists epub layout settings through reload in web mode"`; `git diff --check` | separates primary actions, sidebar shortcuts, and TTS session state in the header so the reader shell chrome no longer reads like one flat action row |
| 2026-05-04 | Reframe the notes tab as an annotation workspace | 9394676 | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"`; `git diff --check` | renames the notes surface to `标注`, distinguishes capability guidance from current next-step guidance, and stops mixed note/highlight groups and empty states from pretending to be note-only |
| 2026-05-04 | Reframe bookmarks as reading positions | 5f243b6 | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader productizes bookmarks as current reading positions in web mode"`; `git diff --check` | turns the bookmark panel into a current-page reading-position workflow with clearer saved/unsaved state, action copy, and empty-state framing |
| 2026-05-04 | Separate current-book highlights from selection sets | b3df3df | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"`; `git diff --check` | teaches the highlights panel to distinguish local current-book highlights from cross-book selection sets, renames the secondary section to `跨书高亮选择集`, and updates saved-selection filters accordingly |
| 2026-05-04 | Keep highlight empty-state copy aware of saved selection sets | 4802025 | `pnpm check`; `pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode"`; `git diff --check` | fixes the final highlight empty-state contradiction so the panel no longer claims there are no highlights when current-book highlights are gone but reusable cross-book selection sets still remain |
| 2026-05-04 | Add recent assistance history to the AI workspace | 2d741e5 | `pnpm check`; `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"`; `git diff --check` | adds per-book recent assistance history and replay affordances to the shared AI workspace without changing provider/network behavior |
| 2026-05-04 | Let the AI workspace review archived assistance records | bc99956 | `pnpm check`; `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"`; `git diff --check` | adds explicit history-record review inside the AI workspace so prior lookup and translation results can be revisited without rerunning the request |
| 2026-05-05 | Persist current-book assistance history across reloads | 59b3c16 | `pnpm check`; `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores ai workspace history for the current book in web mode"`; `git diff --check` | serializes and restores the active book's assistance history from local storage so the notebook-like AI lane survives a route reload without becoming a global cross-book archive |
| 2026-05-05 | Persist the selected archived AI record for the current book | 6ff0f25 | `pnpm check`; `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected ai history record for the current book in web mode"`; `git diff --check` | serializes and restores the active archived assistance selection so the notebook reopens the same lookup or translation record instead of only restoring the surrounding history lane |
| 2026-05-05 | Let the AI workspace clear current-book history by mode | c1723da | `pnpm check`; `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can clear current-book ai history in web mode"`; `git diff --check` | adds explicit mode-scoped clear actions for the current book's AI notebook history and fixes the assistance persistence reactive wiring so cleared history/selection really writes back to local storage |
| 2026-05-05 | Make current-book AI history clears write through immediately | 6b62078 | `pnpm check`; `pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can clear current-book ai history in web mode"`; `git diff --check` | removes the clear-history race by persisting the route-owned assistance history and selection immediately inside the clear action instead of waiting for later reactive storage sync |
| 2026-05-05 | Group current-book AI history into notebook-style lookup and translation sections | 2e3fa06 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader groups current-book ai history into lookup and translation sections in web mode"`; `git diff --check` | adds a current-book history overview to the AI workspace so lookup and translation archives show up as separate notebook sections before the user drills into one active lane |
| 2026-05-05 | Restore the selected translation archive in the correct notebook lane | a12c1a7 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected translation ai history record for the current book in web mode"`; `git diff --check` | restores the AI workspace into the translation lane when the persisted archived selection is translation-owned and constrains the notebook to one active archived record across lookup and translation lanes |
| 2026-05-05 | Keep the active archive summary visible when a notebook lane is collapsed | 64853d3 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader keeps the active ai archive summary visible when the history list is collapsed"`; `git diff --check` | adds lane-level collapse controls and keeps the active archived record visible as section context even after the current history list is folded |
| 2026-05-05 | Let the AI notebook move from the archive overview into one lane and back again | 824fa3b | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"`; `git diff --check` | turns the overview cards into real navigation entry points and adds an explicit return path back to the current-book archive overview from a focused lookup or translation lane |
| 2026-05-05 | Tighten lane headers so focused AI sections read like notebook sections | 819995b | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"`; `git diff --check` | promotes the focused lookup/translation lane title and current-book record count into the lane header so the notebook section remains self-describing after the reader drills down from the overview |
| 2026-05-05 | Separate navigation, maintenance, and item actions inside focused AI lanes | 1b39e4f | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows notebook-style action hierarchy inside ai archive lanes"`; `git diff --check` | splits focused-lane controls into section navigation, section maintenance, and per-record primary/secondary actions so the notebook lane no longer reads like one flat tool row |
| 2026-05-05 | Align lookup and translation result sections inside focused AI lanes | 0b177d3 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected ai history record for the current book in web mode|reader restores the selected translation ai history record for the current book in web mode|reader can open translation mode as a dedicated notebook tab"`; `git diff --check` | adds explicit result-section headers and supporting summaries for lookup and translation lanes so restored history and live results read like one notebook surface instead of raw provider payload cards |
| 2026-05-05 | Split focused AI lanes into explicit current-record and history-list sections | 2986907 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows notebook-style action hierarchy inside ai archive lanes"`; `git diff --check` | adds explicit `当前记录` and `历史记录列表` subsections inside focused lookup/translation lanes so the notebook can separate active archived context from the archive list itself |
| 2026-05-05 | Let focused AI lanes switch between current-record and full-history browsing | a4bbb44 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`; `git diff --check` | adds an explicit browse-mode toggle between `只看当前记录` and `查看完整历史` so selecting an archived record no longer implicitly changes how much of the lane the reader is browsing |
| 2026-05-05 | Add breadcrumb and grouped browse controls to focused AI lanes | c9f7835 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`; `git diff --check` | adds a visible breadcrumb plus grouped browse-position and browse-scope controls so focused lanes explain both where the reader is and what scope they are browsing |
| 2026-05-05 | Add a browse summary layer to focused AI lanes | c3c8c98 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`; `git diff --check` | adds explicit `当前位置 / 当前范围` summary state so the focused-lane navigation contract does not rely only on breadcrumb and toggle controls |
| 2026-05-05 | Add current-entry summary to the focused AI navigation contract | e758dc0 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`; `git diff --check` | adds explicit `当前条目` summary state so the focused-lane navigation surface states which archived record is currently selected instead of relying only on the content sections below |
| 2026-05-05 | Collapse focused-lane browse state into one notebook navigation section | e47d9db | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`; `git diff --check` | turns the focused-lane breadcrumb, summary, and browse controls into one explicit `浏览导航` section so the notebook navigation contract has a stable top-level anchor instead of three loose UI fragments |
| 2026-05-05 | Turn the current-book AI archive overview into a real notebook section | 4c6f9da | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"`; `git diff --check` | turns the current-book AI archive overview from a loose card grid into a section with its own header, total summary, and stable lane-entry area |
| 2026-05-05 | Add current-book scope summaries to the AI assistant and translation tabs | 313b185 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can open translation mode as a dedicated notebook tab"`; `git diff --check` | adds explicit current-book scope summaries at the top of the assistant and translation workspaces so the reader can see tab-level scope before drilling into notebook sections |
| 2026-05-05 | Separate AI overview mode from focused lane mode | b03e05e | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can move from the ai archive overview into one lane and back again"`; `git diff --check` | makes overview mode and focused lane mode mutually exclusive so the assistant no longer renders the current-book overview and a live focused lane at the same time |
| 2026-05-05 | Make the notebook summary reflect the active AI workspace tab | 640c302 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can open translation mode as a dedicated notebook tab"`; `git diff --check` | makes the notebook summary strip reflect assistant-specific and translation-specific workspace state instead of keeping one generic assistant status line across all tabs |
| 2026-05-05 | Remove archive-overview navigation semantics from dedicated translation mode | c88654b | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"`; `git diff --check` | removes the fake overview parent and return action from locked translation mode so its navigation contract matches the fact that it is already a dedicated workspace |
| 2026-05-05 | Record the P5 closeout boundary | beafe12 | `pnpm check`; `git diff --check` | documents which AI workspace structures are now treated as closed in P5 and which larger ideas remain intentionally out of scope for the next mainline |
| 2026-05-05 | Run the P5 closeout review | fd0f449 | `pnpm check`; `git diff --check` | records that the current-book AI workspace line no longer has structural blockers and that the next step should be a new reader workspace mainline instead of more P5 micro-polish |
| 2026-05-05 | Make translation mode follow the current reading source by default | abbe0e8 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"`; `git diff --check` | makes dedicated translation mode follow the live reading source when one exists, keeps manual text entry viable when it does not, and adds explicit lock/resume controls so the workspace no longer behaves like a detached request form |
| 2026-05-05 | Make the notebook summary follow the dedicated TTS mode state | 1ae470e | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | makes dedicated TTS mode own its notebook summary and current-book follow state instead of reusing the generic notebook summary or carrying pinned targets across book switches |
| 2026-05-05 | Let dedicated TTS mode switch between source and translated text | 0f4a9a0 | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | adds a persisted source-versus-translated TTS mode, routes TTS target resolution through the current translation result when available, and makes the dedicated TTS workspace expose an explicit original/translated reading toggle |
| 2026-05-05 | Let translated TTS follow the selected translation archive | f1f7378 | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader lets translated tts mode consume the selected translation archive in web mode|reader can open tts mode as a dedicated notebook tab|reader restores the selected translation ai history record for the current book in web mode"`; `git diff --check` | makes dedicated translated TTS consume the selected translation archive before falling back to the live translation result and fixes the focused-lane restore path so archive cleanup cannot silently drop the selected translation record |
| 2026-05-05 | Expose translated-TTS archive provenance and jump back to translation mode | f6f8905 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`; `git diff --check` | makes archive-backed translated TTS show its provenance inside the TTS tab itself and lets the reader jump straight back to the translation workspace without losing the selected translation record |
| 2026-05-05 | Keep live translated-TTS provenance in sync with the current reading source | f055232 | `pnpm check`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`; `git diff --check` | makes the live translated-TTS path reuse the same current reading source that translation mode already follows, so the notebook summary and waiting-state copy say `等待译文结果` instead of collapsing back to a generic no-target state |
| 2026-05-05 | Record the P9 closeout boundary | 49aa5b5 | `pnpm check`; `git diff --check` | documents which translation/TTS reading-mode pieces now count as closed in P9 and which larger playback or cross-book expansions remain intentionally out of scope |
| 2026-05-05 | Run the P9 closeout review | d249271 | `pnpm check`; `git diff --check` | records that the translated-TTS reading-mode line no longer has structural blockers and that the next step should be a new reader workspace mainline instead of more P9 micro-slices |
| 2026-05-05 | Retarget active TTS sessions when reading ownership changes | 17a7a2d | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | makes explicit TTS ownership changes restart or re-arm the active session instead of leaving speech on the stale old target while the notebook has already switched to a new reading contract |
| 2026-05-05 | Mirror TTS session state into the browser media session | 0b42ede | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | mirrors the current TTS target, provenance, and play/pause/stop controls into the browser-owned media session so system-level media controls stop being disconnected from the active reader speech session |
| 2026-05-05 | Carry translation target language into the speech runtime | 0558021 | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | carries the chosen translation target language through translated TTS target resolution and into runtime speech startup so translated playback stops defaulting to the browser UI locale |
| 2026-05-05 | Prefer visible plain-text body excerpts over chapter-title fallback | 089c54b | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader uses visible plain-text excerpts as the source tts target in web mode"`; `git diff --check` | lets TXT/source TTS consume a stable visible-body excerpt from the plain-text viewport before falling back to scaffold labels, while intentionally leaving EPUB/PDF live-excerpt extraction out of scope |
| 2026-05-05 | Carry EPUB metadata language into source-side TTS targets | 37a2d23 | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | carries stable `book.metadata.language` from the Foliate reader preview into source-side TTS target resolution so EPUB source playback can prefer book language without guessing from arbitrary text |
| 2026-05-05 | Close the P10 reader TTS runtime line | 11d9a4b | `pnpm check`; `git diff --check` | documents which active-session, media-session, translated-language, TXT excerpt, and EPUB metadata-language guarantees now count as closed in P10 and which larger playback/runtime expansions remain intentionally out of scope |
| 2026-05-05 | Run the P10 closeout review | 1c5b196 | `pnpm check`; `git diff --check` | records that the current reader TTS runtime line has no remaining structural blocker and that the next step should be a new reader workspace or playback mainline instead of more P10 micro-slices |
| 2026-05-06 | Add a back-to-TTS-location playback control | `2a35b6a` | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | keeps navigation metadata on the active TTS target and surfaces a reader-visible way to jump back to the locked playback location after the viewport drifts away |
| 2026-05-09 | Add readable playback-location summaries to dedicated TTS mode | `9155a69` | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | threads chapter/location/progress summaries through source, translated, and locked TTS targets, and lets translated waiting states fall back to the current translation-source location instead of an empty location surface |
| 2026-05-09 | Keep the in-reader TTS mini bar visible during translated waiting states | pending | `pnpm check`; `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`; `CI=1 pnpm test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`; `git diff --check` | keeps the in-reader mini playback bar visible while translated TTS is waiting on a selected live or archived translation source, and replaces the generic empty-target fallback with source-tied waiting copy |
| 2026-05-10 | Let translation mode switch translated playback back to source | `b1ff0e2` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch translated playback back to source from translation mode in web mode|reader can jump from translation mode into translated tts in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | adds the missing reverse cross-mode edge inside `翻译模式`, so readers can undo translated playback in place without changing the existing `jump into translated TTS` contract |
| 2026-05-10 | Lock the translation-to-TTS rebound hop after source recovery | `eedf705` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch translated playback back to source from translation mode in web mode|reader can jump from translation mode into translated tts in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | proves the same translation-mode strip can still rebound back into translated TTS after the reader has already switched playback back to source, without changing shipped runtime behavior |
| 2026-05-10 | Close the P12 cross-mode playback navigation line | `22cc477` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | records that the current translation-to-TTS navigation line has no remaining structural blocker and should now give way to a new playback or reader-workspace mainline instead of more P12 micro-slices |
| 2026-05-10 | Record the P12 closeout review | `22cc477` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | records the explicit closeout verdict that P12 no longer has a structural blocker and that future work should move to a new playback or reader-workspace line |
| 2026-05-10 | Make dedicated translation and TTS modes route-addressable | `22c4b8d` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader can jump from translation mode into translated tts in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | turns dedicated translation and TTS notebook tabs into route-owned reader states so reload, cross-mode jumps, and tab exits all preserve the same playback workspace contract |
| 2026-05-10 | Make dedicated TTS read-aloud mode route-addressable | `f7a8c3b` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader restores dedicated tts read-aloud mode from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | turns `workspace=tts` into a self-describing playback-state contract so direct opens, translated jumps, mode switches, and reload no longer depend on ambient persisted TTS settings |
| 2026-05-10 | Make dedicated translation target language route-addressable | `339cbb7` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader can open translation mode as a dedicated notebook tab|reader restores dedicated translation target language from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | turns `workspace=translation` into a self-describing target-language contract so direct opens, target-language switches, and reload no longer fall back to the workspace-local translation default |
| 2026-05-10 | Make dedicated translation provider route-addressable | `821c8f6` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation provider from route state in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | turns `workspace=translation` into a self-describing provider-choice contract so direct opens, provider switches, and reload no longer fall back to workspace-local translation provider state |
| 2026-05-10 | Prefer current chapter body excerpts for EPUB source TTS | `bc5cfa2` | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader uses current chapter body excerpts as the EPUB source tts target in web mode|reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | promotes real EPUB/Foliate chapter body sentences ahead of chapter-title fallback for source-side TTS and aligns the focused smoke contract with the current translated-waiting copy |
| 2026-05-15 | Add the reader playback queue model | not committed; user requested a dirty working tree only | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-playback-queue-tests --noEmit false && node --test ./.tmp-playback-queue-tests/src/lib/reader/playbackQueue.test.js`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | adds a pure queue/rate/timeout state machine derived from `ReaderTtsSpeechTarget`, so Task 5 can wire playback-panel controls without inventing a second TTS target model |
| 2026-05-15 | Extract the reader playback panel | not committed; user requested a dirty working tree only | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader tts workspace exposes mature playback controls in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | extracts queue/rate/timeout/voice controls into a dedicated playback panel and keeps the queue state route-local so `ReaderTtsWorkspace` no longer owns the mature playback UI directly |
| 2026-05-15 | Add a selection-near annotation popup | pending current slice commit | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader shows selection-near annotation actions in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | adds a route-owned annotation action toolbar that anchors near TXT selections, falls back conservatively for other formats, and keeps PDF/CBZ on a copy-only popup instead of fake inline actions |
| 2026-05-15 | Add a reader footnote popup | not committed; user requested a dirty working tree only | `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`; `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens footnote links in a reader popup in web mode"`; `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` | intercepts internal footnote-like EPUB links, shows extracted note content in a stage-owned popup when available, and falls back to a conservative jump-to-body action when excerpt extraction fails |
