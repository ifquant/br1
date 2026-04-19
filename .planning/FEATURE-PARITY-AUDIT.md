# br1 Feature Parity Audit

Last updated: 2026-04-18

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
| Scroll/Page View Modes | Partial | Reader now has paginated geometry control, width modes, and layout labels such as `PAGINATED` / `FIXED`【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:111】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:191】 | There is no user-facing switch between scrolling and paginated reading modes yet | Phase 8 |
| Full-Text Search | Partial | Reader has whole-book search UI, result navigation, history, disk cache, and automated reopen regression coverage【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:491】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:435】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1577】 | Advanced search product surface is still thinner than the target list: no explicit cross-book search, no polished long-term management UX, and no full feature audit against the product list | Phases 7 and 10 |
| Annotations and Highlighting | Partial | Notes and bookmarks are implemented, persisted, reopened, edited, deleted, and covered by desktop regressions; the reader sidebar now exposes an explicit format-level text-annotation contract, so `CBZ` no longer pretends to support正文批注, while `TXT` now supports both selection-based notes and persisted highlights with note-list badges and reopen behavior in both web smoke and focused desktop regressions, the same highlight-vs-note split is covered through the real desktop EPUB reader path, `FB2/MOBI/AZW3` now all have matching desktop foliate-reader annotation evidence, and the sidebar has moved beyond a single mixed note list into both a minimal `全部类型 / 高亮 / 笔记` management layer and a first dedicated `高亮` workspace tab that now also supports deleting the currently visible highlights in one action, switching between recent-first and oldest-first ordering, selecting only part of the current highlight set for deletion, inverting the current visible highlight selection, temporarily narrowing the workspace to just the current selected highlight set, saving named highlight selection sets per book, renaming those saved sets, explicitly sorting those saved sets by recent-first or oldest-first, exporting them into a structured per-book payload preview with locator snapshots, importing that payload back into the current book even when both raw highlight ids and saved CFIs drift, persisting them across reloads and reopens, and selecting, clearing, inverting, or deleting the current chapter group as a unit, with that path exercised in web smoke plus the desktop `TXT`, `EPUB`, `FB2`, and Kindle-family reader flows instead of forcing all annotations into one flat list【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:640】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:264】【/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte:169】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:35】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:2470】 | The product surface now distinguishes highlights from notes, exposes a first dedicated highlights workspace, has a first bulk-management action for deleting visible highlights with web plus desktop evidence across TXT, EPUB, FB2, and Kindle-family reader flows, now has a first explicit highlights sort control with web plus desktop TXT evidence, now has a first partial-selection delete path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, now has a first invert-selection path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, now has a first selected-only highlights view with web TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, now has a first per-group selection-management path with web TXT plus desktop EPUB evidence, now has a first per-group delete path with web TXT plus desktop EPUB evidence, now has a first per-group invert-selection path with web TXT plus desktop EPUB evidence, now has a first per-book highlights selection-persistence path with web TXT plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, and now has a first named saved-selection-set flow with rename, explicit sort, structured export preview, and locator-backed same-book import support that survives both id drift and cfi drift plus evidence on web TXT and desktop EPUB, but richer instant annotation flows, deeper grouping controls, true cross-book reuse, and CBZ-class non-text formats still keep cross-format annotation parity incomplete | Phase 7 |
| Customize Font and Layout | Partial | Width modes, atmosphere modes, chrome visibility, and layout-driven geometry now exist in the reader menu【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte:148】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte:57】 | No full settings surface for font family, font size, line height, margins, theme presets, or deeper typography controls yet | Phase 8 |
| File Association and Open With | Partial | Desktop import, `open original file`, `library-file` targets, and separate reader window flows are in place; the Tauri bundle now declares file associations for `epub/pdf/fb2/mobi/azw3/cbz/txt`, and focused desktop regressions now prove that both a running main window and a cold-start app launch can consume associated-book open requests and open the file in a separate reader window through the same structured `library-file` route【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:210】【/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte:14】【/Users/dev/workspace2/hc_apps/br1/src-tauri/tauri.conf.json:20】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1280】 | OS-level registration is now declared and both startup/runtime open flows are covered, but true packaged-app verification across macOS/Windows/Linux installers still needs explicit release-build evidence | Phase 6 |
| Library Management | Partial | Library page supports import, search, sorting, continue reading, recent reading, Readest migration, cover loading, and desktop reopen flows【/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte:134】【/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte:515】 | Product-level library management still lacks broader collections / metadata tools / online catalog integration | Phases 2 and 3 |

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

- paginated reader geometry
- view width modes
- chrome visibility modes
- atmosphere modes

It does **not** yet have:

- a user-facing scroll vs paginated mode switch
- a fully developed reading settings system

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

This cluster is solid but still better labeled `Partial`, because the target feature list implies a more mature annotation/highlighting surface than current `notes + bookmarks` alone. The product surface is at least more honest now: formats that do not yet support正文文本批注 are explicitly marked as such, `TXT` has moved up from that bucket into a minimal but real selection-note-persist-reopen workflow, highlights are finally a first-class persisted action instead of being implied by the note overlay implementation, the new split is now backed by web plus desktop evidence on `TXT`, the main `EPUB` path, and the desktop `FB2/MOBI/AZW3` foliate surfaces instead of only one format family, the notes workspace now has a first dedicated management layer via `全部类型 / 高亮 / 笔记` filtering with web evidence plus desktop TXT/EPUB/FB2/Kindle-family evidence, there is now also a first dedicated `高亮` workspace tab for separating pure highlight review from mixed note management with both web plus desktop TXT/EPUB/FB2/Kindle-family evidence, that workspace now has a first bulk-management action for deleting currently visible highlights with web plus desktop TXT/EPUB/FB2/Kindle-family evidence, it now also has a first explicit `最近添加 / 最早添加` sort control with web plus desktop TXT evidence, it now also has a first partial-selection delete path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first invert-selection path with web plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first selected-only highlights view with web TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first per-group selection-management path with web TXT plus desktop EPUB evidence, it now also has a first per-group delete path with web TXT plus desktop EPUB evidence, it now also has a first per-group invert-selection path with web TXT plus desktop EPUB evidence, it now also has a first per-book highlights selection-persistence path with web TXT plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, it now also has a first named saved-selection-set flow with web TXT plus desktop TXT plus desktop EPUB plus desktop FB2 plus desktop Kindle-family evidence, and the desktop host-side notes/bookmarks store no longer relies on path-length-sensitive base64 filenames for long `library-file` keys.

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
