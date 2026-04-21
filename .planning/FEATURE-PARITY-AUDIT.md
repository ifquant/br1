# br1 Feature Parity Audit

Last updated: 2026-04-20

## Purpose

This document tracks `br1` against the product-facing feature list the project wants to match, instead of only tracking implementation by phase. It is meant to prevent local optimization around one page or one layout slice while larger product gaps remain open.

Status labels:

- `Completed`: user-visible capability exists with a coherent product path
- `Partial`: some implementation exists, but scope, reliability, or product surface is incomplete
- `Not started`: no meaningful implementation evidence in the current codebase
- `Needs redesign`: there is related code, but it does not yet map cleanly to the target feature

## Summary

### P0 Core Reader

| Feature | Status | Current Evidence | Main Gap | Suggested Phase |
|---|---|---|---|---|
| Multi-Format Support | Partial | `EPUB` and `PDF` have stable open / restore regressions; import pickers and reader entrypoints now admit `FB2`, `MOBI`, `AZW3`, `CBZ`, and `TXT` through a shared file-format contract; web smoke opens all six secondary-format sample assets end to end; and focused desktop webdriver regressions now prove those same formats can be imported, opened in reader windows, advanced, returned into the library workflow with persisted restore signals, reopened through library hrefs into visible restore state, and keep library metadata human-readable for `CBZ`, `FB2/MOBI/AZW3`, and `TXT` instead of leaking stored filenames, page asset names, placeholder FB2 authors, missing FB2 language, fake `0%` Kindle progress text, rounded `0%` library progress badges, or planned-only TXT errors【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:167】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:1】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts:1】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:35】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1608】 | Actual feature parity is still centered on `EPUB/PDF`; the new evidence proves one stable import/open/return/reopen path per format in both web asset mode and desktop library-file mode, but broader multi-format parity still needs richer metadata, annotation behavior, and fixture depth beyond one main sample per format | Phase 9 |
| Scroll/Page View Modes | Partial | Reader now has a formal settings model with a user-facing `分页 / 滚动` switch, renderer-level `flow` wiring, web reload coverage proving `EPUB` can reopen in `SCROLL` mode without dropping the setting, focused desktop `EPUB`, `FB2`, Kindle-family, `TXT`, and `PDF` reader-window regressions proving the same `SCROLL` mode survives true close-and-reopen paths alongside existing highlights workspace or page-restore state, and a runtime hydration pass that now normalizes persisted settings back into storage while applying `themePreset`, `viewWidthMode`, and `chromeMode` consistently to foliate-backed, PDF/page-labeled, and TXT/plain-text surfaces【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte:147】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte:60】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:395】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/settings.ts:1】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:49】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:3254】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:3560】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:4778】 | The mode system is now real across the main reflowable, plain-text, Kindle-family, and PDF restore paths, but parity still needs clearer handling across every mode combination instead of a few strong representative regressions | Phase 8 |
| Full-Text Search | Partial | Reader has whole-book search UI, explicit result navigation, history, disk cache, and automated reopen regression coverage; search results now expose a local `上一条 / 下一条` navigator with current result count feedback, search history is persisted as structured entries with query/config/result-count/timestamp metadata, migrates old string-only history automatically, supports `全部 / 有命中 / 无命中` filtering plus per-entry deletion and replay in the sidebar, and now exposes a current-book cache status panel that shows cache availability, history/result-count totals, a visible cache identity/fingerprint, and a first per-query cache ledger for successful current-book searches while keeping cache clearing distinct from history clearing, with the cache identity and query ledger covered in both web reload smoke and desktop reopen regressions and the clear-cache action covered end to end by desktop evidence that proves user feedback and actual disk-cache removal after replaying cached results, and with the broader management layer covered by both web reload smoke evidence and desktop reopen coverage on the EPUB path, including a two-result cached search replay that proves `下一条 / 上一条` moves `1 / 2 -> 2 / 2 -> 1 / 2` instead of only rendering a disabled single-result control【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:491】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/searchController.ts:1】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1577】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:6980】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:108】 | Advanced search product surface is stronger than before and no longer hides current-book cache state behind the history list, but parity still lacks explicit cross-book search and a fuller cache browser with low-level per-query entry metadata such as saved/last-accessed timestamps | Phases 7 and 10 |
| Annotations and Highlighting | Partial | Notes and bookmarks are implemented, persisted, reopened, edited, deleted, and covered by desktop regressions; the reader sidebar now exposes an explicit format-level text-annotation contract, so `CBZ` no longer pretends to support正文批注, while `TXT` now supports both selection-based notes and persisted highlights with note-list badges and reopen behavior in both web smoke and focused desktop regressions, the same highlight-vs-note split is covered through the real desktop EPUB reader path, `FB2/MOBI/AZW3` now all have matching desktop foliate-reader annotation evidence, and the sidebar has moved beyond a single mixed note list into both a minimal `全部类型 / 高亮 / 笔记` management layer and a first dedicated `高亮` workspace tab that now also supports deleting the currently visible highlights in one action, deleting the currently filtered note view or an individual note group in one action, switching between recent-first and oldest-first ordering, selecting only part of the current highlight set for deletion, inverting the current visible highlight selection, temporarily narrowing the workspace to just the current selected highlight set, saving named highlight selection sets per book, renaming those saved sets, explicitly sorting those saved sets by recent-first or oldest-first, exporting them into a structured per-book payload preview with locator snapshots, importing that payload back into the current book even when both raw highlight ids and saved CFIs drift, surfacing a cross-book compatibility preview before any real foreign-book import is attempted, and now letting the user import only the matched subset from that cross-book preview with visible source provenance on the resulting saved set while preserving that provenance through the structured same-book import/export contract, including the originating selection-set identity and unmatched-count metadata, now updating an already-imported foreign selection in place instead of duplicating it when the same source book and source selection are imported again, now exposing both a first per-set `刷新映射` action and a first `刷新全部跨书映射` bulk action that rerun the stored foreign highlight snapshots against the current book without requiring another manual JSON import, with refresh results surfaced as a structured summary plus a filterable `全部已保存 / 完全匹配 / 部分匹配 / 未匹配` saved-set view instead of only a coarse total-count notice, showing per-card refresh outcome badges, unresolved counts, and a first unresolved-text drill-down on imported saved sets, and now persisting that refresh-outcome filter per book so reloads return to the same review lens, while still persisting selections across reloads and reopens and selecting, clearing, inverting, or deleting the current chapter group as a unit, with that path exercised in web smoke plus the desktop `TXT`, `EPUB`, `FB2`, and Kindle-family reader flows, and with the unresolved drill-down itself now covered by web `TXT` plus the real desktop `EPUB`, `FB2`, `MOBI`, and `AZW3` saved-set refresh paths instead of forcing all annotations into one flat list【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:640】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:264】【/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte:169】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:35】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:2470】 | The product surface now distinguishes highlights from notes, exposes a first dedicated highlights workspace, has a first bulk-management action for deleting visible highlights with web plus desktop evidence across TXT, EPUB, FB2, and Kindle-family reader flows, now also has current-view and per-group note deletion controls with web TXT plus desktop TXT evidence, now has a first explicit highlights sort control with web plus desktop TXT evidence, now has a first partial-selection delete path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, now has a first invert-selection path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, now has a first selected-only highlights view with web TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, now has a first per-group selection-management path with web TXT plus desktop EPUB evidence, now has a first per-group delete path with web TXT plus desktop EPUB evidence, now has a first per-group invert-selection path with web TXT plus desktop EPUB evidence, now has a first per-book highlights selection-persistence path with web TXT plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, and now has a first named saved-selection-set flow with rename, explicit sort, structured export preview, locator-backed same-book import support that survives both id drift and cfi drift, plus a first cross-book compatibility-preview layer and matched-subset import path on web TXT and desktop EPUB, with source provenance attached to imported subset cards, preserved when those saved sets are exported and imported again into the same book, enriched with source selection identity and unresolved-count metadata, then used both to update an existing foreign-book import instead of duplicating it and to refresh that foreign-book mapping either one set at a time or in bulk from stored snapshots, with refresh outcomes now visible per-card, filterable at the saved-set workspace level, remembered per book, and inspectable through a first unresolved-text ledger with web TXT plus desktop EPUB plus desktop FB2 plus desktop MOBI/AZW3 evidence, but richer instant annotation flows, deeper grouping controls, broader foreign-book reuse, and full per-highlight remediation actions still keep cross-format annotation parity incomplete | Phase 7 |
| Customize Font and Layout | Partial | Reader now has a formal persisted settings model covering `fontFamily`, `fontScale`, `lineHeight`, `pageMargins`, `themePreset`, `viewWidthMode`, and `chromeMode`; those settings are wired into both foliate renderer styles and the plain-text surface, web smoke proves the `EPUB` renderer keeps the chosen font family, font size, line height, and margins after reload while also exposing stable stage/header/viewport shell palette tokens, focused desktop `EPUB`, `FB2`, Kindle-family, and `TXT` reader regressions prove the same typography/layout choices survive true reader-window reopen flows, and focused desktop `PDF` coverage now proves fixed/page-labeled reading keeps the same persisted settings, `SCROLL` flow, width mode, and viewport CSS-variable contract through reopen without pretending PDF is a typography-reflow surface; the runtime now uses one shared theme palette and chrome/width inset contract across foliate shell styling, header chrome, viewport framing, PDF host styling, and TXT/plain-text paper styling instead of treating secondary surfaces as layout exceptions【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/settings.ts:1】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte:147】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:392】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts:214】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:49】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:3254】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:3560】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:4778】 | The settings system is now formal and no longer scattered, but parity still needs richer typography presets and deeper chrome/sidebar/layout alignment than this persisted settings matrix provides, especially for the standalone sidebar surface | Phase 8 |
| File Association and Open With | Partial | Desktop import, `open original file`, `library-file` targets, and separate reader window flows are in place; the Tauri bundle now declares file associations for `epub/pdf/fb2/mobi/azw3/cbz/txt`, focused desktop regressions prove that both a running main window and a cold-start app launch can consume associated-book open requests and open the file in a separate reader window through the same structured `library-file` route, the runtime intake now normalizes quoted paths, `file://` URLs, cwd-relative inputs, and duplicate requests before queueing them to the main window, native Tauri `RunEvent::Opened` document-open events now reuse that same queue/focus path instead of bypassing the associated-book intake flow, and rejected empty or unsupported associated inputs now emit a shell-level notice instead of disappearing silently while the supported-format and text-annotation capability boundary is derived from a single reader format metadata table【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:210】【/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte:14】【/Users/dev/workspace2/hc_apps/br1/src-tauri/tauri.conf.json:20】【/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs:1】【/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs:1】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1280】 | OS-level registration plus runtime intake are now more coherent, but true packaged-app verification across macOS/Windows/Linux installers still needs explicit release-build evidence, and canonicalization/queueing failures that occur after raw-input rejection still rely on the deeper existing filter path rather than a dedicated packaged regression | Phase 6 |
| Library Management | Partial | Library page supports import, search, sorting, continue reading, recent reading, Readest migration, cover loading, and desktop reopen flows; it now also has an explicit `全部 / 在读 / 未开始 / 已读完` status filter in the header with per-status counts, applies that filter consistently across `继续阅读`, `最近阅读`, and the main shelf, keys scroll restoration by the active filter context, explains filter/search misses with product-level empty states that name the full active search/status/format/collection/tag condition plus direct clear-filter recovery and per-condition empty-state chip removal through shared recovery rendering instead of leaving the shelf looking broken, distinguishes between a missing original import path versus a missing stored library copy so the recovery UI can keep reading enabled for the former while surfacing `重新导入` and disabling dead-end read actions for the latter, adds a main-shelf metadata review panel covering title/author/format/status/progress/source/availability/compatibility/restore/original-path/imported/recent-reading fields plus visible per-book cover status, header-level cover coverage summary, and local `书架归类` / `标签` fields with header-level format, collection, and tag filtering, aggregate and per-option status/format/collection/tag counts, metadata-panel quick filters for status, format, collection, and tag, active-filter detail feedback with removable condition chips now covered for status, format, collection, tag, and search removal, visible collection/tag inventory summaries, visible filtered-result counts, and one-click filter clearing, a title/author/description/language/publisher/collection/tags edit flow with an explicit no-file-move/no-progress-reset contract that persists to `library.json` without changing the managed book file, plus a main-shelf `打开原文件` action with web smoke plus desktop shelf evidence, now lets users remove a normal shelf item from both the main shelf review panel and the `继续阅读 / 最近阅读 / 待修复书籍` workflow detail panels while deleting only br1's managed library copy and record instead of the original source file, and now makes that removal undoable when the original source path is still available by restoring the previous record and br1-managed copy from the source file, and now adds a dedicated `待修复书籍` queue with visible queue and header summaries that separate automatically repairable copies from manual relink records, plus both per-book repair actions with desktop UI-click regression coverage, a first bulk-repair path that can rebuild every eligible missing local library copy from its original source path in one action, skip manual-only relink cases without blocking the batch, and surface an explicit repaired-vs-manual summary both as a global notice and as queue-local operation history afterwards, while manual-only rows now surface `待复核 / 先复核再重关联`, open a review panel before the file picker path, show the title/format/source/progress that will be repaired, add a visible repair contract stating that replacement files are re-linked in place while preserving status/progress/restore location instead of creating duplicate entries, warn about same-title or same-source conflicts when they exist, explicitly tells users that replacement-file preflight will check existence, format, title, author, source path, and SHA-256 fingerprint, preflights those signals before reimporting, and makes the in-place relink route explicit instead of collapsing all broken states into the same repair button, all while preserving reading progress when the match is confident【/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte:134】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte:1】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte:1】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte:1】【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:1】【/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs:1】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1940】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:2147】 | Product-level library management now has a clearer recovery surface, including in-place repair instead of blind reimport duplication, a UI-verified per-book repair action, a first queue-level bulk repair action, visible repair-queue and header summaries, queue-local repair operation history, a first explicit manual-review relink surface with conflict-aware metadata, visible repair contract, and visible preflight contract, a first identity-aware and fingerprint-backed replacement-file preflight contract, a metadata review and core bibliographic edit panel for normal shelf items with an explicit safety contract, visible per-book cover status, and visible cover coverage summary, status filters with per-status counts, a first format filter with per-format counts plus metadata-panel status and format quick filtering, a first local collection label plus collection filter with aggregate group counts and per-collection book counts, first editable local tags surfaced in search, metadata review, tag filtering with aggregate tag counts and per-tag book counts, metadata-panel quick-filter actions, inventory summaries for cover/status/format/collection/tag counts plus highest-density group/tag, explicit current-filter detail text for status/format/collection/tag/search states, and removable per-condition chips for filter recovery now proven for status, format, collection, tag, and search, visible filter hit-count feedback, full-condition empty-result messaging with inline empty-state clear actions plus per-condition removal chips, and clear-all recovery for stacked filters, a direct original-file action from that panel, and a safe remove action that works from both the normal shelf and reading workflow sections while keeping original source files intact, plus an undo path when the original source is still available, but it still lacks full cover editing/replacement, full collections/tags management beyond counted single-field collection/tag filtering and editable tag metadata, online catalog integration, plus deeper broken-file repair flows such as durable queue persistence and richer conflict resolution | Phases 2 and 3 |

### P1 Advanced Reading Experience

| Feature | Status | Current Evidence | Main Gap | Suggested Phase |
|---|---|---|---|---|
| Dictionary / Wikipedia Lookup | Not started | No lookup controller, UI, or service integration evidence in current `src/` or `src-tauri/` search results | Entire feature surface is absent | New phase after 7 or 8 |
| Parallel Read | Not started | No split-reader workspace, dual-book state, or multi-document reading surface evidence | Entire feature surface is absent | New phase after 8 |
| Code Syntax Highlighting | Not started | No reader-side code block highlighting pipeline or specialized style controls were found | Entire feature surface is absent | New phase after 8 |
| Text-to-Speech (TTS) Support | Not started | Earlier tutorials mention TTS as future work, but there is no current product implementation in `src/` or `src-tauri/` | Entire feature surface is absent | Phase 11 or dedicated post-Phase-8 phase |
| Accessibility | Partial | The app includes basic semantic roles, tab structures, searchboxes, and mobile web app metadata【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:365】【/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte:21】 | No explicit accessibility audit, keyboard-navigation parity matrix, or screen-reader support evidence for VoiceOver / NVDA / Orca level claims | New accessibility-specific phase |
| Visual & Focus Aids | Partial | Reader now has width modes, atmosphere modes, focused content framing, and cleaner workspace geometry【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte:148】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte:304】 | No reading ruler, paragraph-by-paragraph mode, speed-reading aids, or broader focus-tools product surface | New phase after 8 |

### P2 Services and Ecosystem

| Feature | Status | Current Evidence | Main Gap | Suggested Phase |
|---|---|---|---|---|
| OPDS / Calibre Integration | Not started | No OPDS or Calibre integration code was found in the current app or Tauri backend | Entire feature surface is absent | Phase 11 |
| Translate with DeepL and Yandex | Not started | No DeepL / Yandex translation services, keys, UI, or reader actions were found | Entire feature surface is absent | Phase 11 |
| Sync across Platforms | Not started | Current persistence is local desktop storage; no remote sync model or account-backed cross-device state exists in the codebase【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:153】【/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/bookmarks.rs:8】 | Entire sync stack is absent: remote state, auth, conflict handling, and mobile/client parity | Phase 11 |
| Sync with Koreader | Not started | No Koreader sync entrypoints or protocol integrations were found | Entire feature surface is absent | Phase 11 or dedicated ecosystem phase |

## Detailed Audit Notes

### 1. Multi-Format Support

Current `br1` should be treated as:

- `EPUB`: implemented
- `PDF`: implemented
- `FB2/MOBI/CBZ/TXT`: at least one sample asset now opens end to end in web mode and desktop `library-file` mode
- `AZW3`: one real `KF8` sample now opens end to end in both web asset mode and desktop `library-file` mode

Evidence:

- Desktop import currently filters `epub`, `pdf`, `mobi`, `azw3`, `fb2`, `cbz`, and `txt` via the shared reader file-format contract【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:169】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts:1】
- Reader file input accepts `.epub,.pdf,.mobi,.azw3,.fb2,.cbz,.txt` via the same shared contract【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte:232】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts:1】
- Web smoke now opens sample `FB2`, `MOBI`, `AZW3`, `CBZ`, and `TXT` assets without a reader stage error and asserts the expected `format/layout` footer state【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:51】
- Focused desktop webdriver coverage now imports those same sample formats through the real `import_library_books` command, advances reading state, verifies they move from shelf into the reading workflow with persisted restore signals after returning from reader, reopens them through refreshed library hrefs into visible restore state, checks that `CBZ` plus `FB2/MOBI/AZW3/TXT` titles/statuses/authors/language/progress strings and progress badges stay human-readable after round-trips, and separately asserts that `CBZ` now imports `title/author/language/publisher/description` from `ComicInfo.xml` and writes a usable cover asset before any reader open, `FB2` imports the same metadata class directly from its XML container, `MOBI` imports the `language` metadata its legacy container actually carries, and `AZW3` lifts richer `author/language/publisher/description` metadata before any reader open【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1324】
- Reader now exposes a dedicated plain-text reading surface for `.txt` assets, with scroll progress, restore fractions, and desktop reopen coverage instead of falling back to a planned-format error【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:1】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:35】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1684】
- Focused desktop regressions cover `EPUB` and `PDF` reopen flows【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1194】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1288】
- The checked-in `sample-book.azw3` fixture is now a real `version 8` Kindle container rather than a renamed legacy `.mobi`, so the current `AZW3` evidence is no longer just an extension-path check【/Users/dev/workspace2/hc_apps/br1/static/samples/sample-book.azw3】

Conclusion:

`br1` should not yet claim the full “multi-format support” row from the feature list. It now has a verifiable import/open/return/reopen path for `FB2/MOBI/AZW3/CBZ/TXT` in both web asset mode and desktop `library-file` mode, including a real `KF8` sample for `AZW3`, a real plain-text scroll/restore path for `TXT`, and explicit import contracts where `CBZ` lifts `title/author/language/publisher/description` from `ComicInfo.xml` and persists a usable cover asset at import time, `FB2` lifts the same metadata class from its XML container, legacy `MOBI` containers still import the `language` metadata they truly carry while keeping clean fallbacks for missing fields, and `AZW3` imports richer `author/language/publisher/description` fields before any reader round-trip. It no longer lets round-trips overwrite library metadata with stored filenames, internal page asset names, title-duplicate chapter labels, placeholder FB2 authors, missing FB2 language, missing FB2 description/publisher, missing CBZ metadata or cover assets before reader round-trips, fake `0%` Kindle-family progress strings, rounded `0%` library progress badges, missing `MOBI` language due to a skipped EXTH block, missing `AZW3` author/language/publisher/description metadata, or a planned-only TXT failure for a format that is now actually readable. Full parity still requires broader fixture coverage and deeper metadata / annotation consistency across formats.

### 2. Reading Modes and Layout

Current `br1` has:

- a user-facing `scroll / paginated` switch
- a formal persisted reader settings model
- view width modes
- chrome visibility modes
- theme presets
- font family / font scale / line-height / page-margin controls that now drive the real reading surface

It still does **not** yet have:

- a completed cross-format parity story for every mode combination
- the broader typography/layout polish implied by full Readest parity

Conclusion:

This row is `Partial`, not `Completed`.

### 3. Search / Notes / Bookmarks

This is one of the strongest areas in current `br1`.

Evidence:

- search UI, history, config, cache clear, and result list【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:491】
- search execution, disk cache, and cache key handling【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:435】
- notes and bookmarks persistence in host-side storage【/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/bookmarks.rs:8】
- reopen/edit/delete regression coverage for notes and bookmarks【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1443】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1510】

Conclusion:

This cluster is solid but still better labeled `Partial`, because the target feature list implies a more mature annotation/highlighting surface than current `notes + bookmarks` alone. The product surface is at least more honest now: formats that do not yet support正文文本批注 are explicitly marked as such, `TXT` has moved up from that bucket into a minimal but real selection-note-persist-reopen workflow, highlights are finally a first-class persisted action instead of being implied by the note overlay implementation, the new split is now backed by web plus desktop evidence on `TXT`, the main `EPUB` path, and the desktop `FB2/MOBI/AZW3` foliate surfaces instead of only one format family, the notes workspace now has a first dedicated management layer via `全部类型 / 高亮 / 笔记` filtering with web evidence plus desktop TXT/EPUB/FB2/Kindle-family evidence, there is now also a first dedicated `高亮` workspace tab for separating pure highlight review from mixed note management with both web plus desktop TXT/EPUB/FB2/Kindle-family evidence, that workspace now has a first bulk-management action for deleting currently visible highlights with web plus desktop TXT/EPUB/FB2/Kindle-family evidence, it now also has a first explicit `最近添加 / 最早添加` sort control with web plus desktop TXT evidence, it now also has a first partial-selection delete path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first invert-selection path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first selected-only highlights view with web TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first per-group selection-management path with web TXT plus desktop EPUB evidence, it now also has a first per-group delete path with web TXT plus desktop EPUB evidence, it now also has a first per-group invert-selection path with web TXT plus desktop EPUB evidence, it now also has a first per-book highlights selection-persistence path with web TXT plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first named saved-selection-set flow with web TXT plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, unresolved drill-down on imported saved sets is now backed by web TXT plus desktop EPUB plus desktop FB2 plus desktop MOBI/AZW3 evidence, and the desktop host-side notes/bookmarks store no longer relies on path-length-sensitive base64 filenames for long `library-file` keys.

### 4. Library and Desktop File Flow

`br1` already has a credible desktop reading workflow:

- import local books
- migrate Readest library records
- open original file
- open separate reader window
- return reading state back to library

Evidence:

- local import and Readest import service actions【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:310】
- desktop reader window creation【/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerWindow.ts:13】
- library page workflow organization【/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte:520】

Conclusion:

This is advanced enough to count as `Partial` to strong `Partial`, but not full parity with the broader feature list yet.

### 5. Services / Online Features

This is the weakest area in current `br1`.

No meaningful implementation evidence was found for:

- OPDS / Calibre
- DeepL / Yandex translation
- TTS
- cross-platform sync
- Koreader sync

Conclusion:

These rows should all be treated as `Not started` for planning purposes. They should not be hidden behind the current strong local-reader progress.

## Recommended Planning Cut

### Immediate Planning Priority

1. Finish `Phase 5` and `Phase 6`
2. Finish `Phase 7` and `Phase 8`
3. Re-audit the P0 rows after that

Reason:

The current codebase is strongest on local desktop reading foundations. It is still too early to mix in remote/service capability work without first stabilizing the local product surface.

### Recommended Product Buckets

#### P0 Core Reader

- Multi-Format Support
- Scroll/Page View Modes
- Full-Text Search
- Annotations and Highlighting
- Customize Font and Layout
- File Association and Open With
- Library Management

#### P1 Advanced Reading Experience

- Dictionary / Wikipedia Lookup
- Parallel Read
- Code Syntax Highlighting
- Accessibility
- Visual & Focus Aids
- TTS

#### P2 Services and Ecosystem

- OPDS / Calibre Integration
- Translate with DeepL and Yandex
- Sync across Platforms
- Sync with Koreader

## Bottom Line

`br1` is no longer just a shell. It already has a serious local-reader core:

- desktop library flow
- reader open pipeline
- `EPUB/PDF` reopen and geometry regressions
- notes / bookmarks / search persistence
- growing reader layout parity

But measured against the full feature list, the project is still **core-reader strong, service/ecosystem weak**.

That means the correct next planning move is:

- stop evaluating progress by local reader slices alone
- use this feature matrix as the main parity scoreboard
- only claim feature completion when the product row, not just one implementation path, is actually closed
