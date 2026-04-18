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
| Multi-Format Support | Partial | `EPUB` and `PDF` have stable open / restore regressions; import pickers and reader entrypoints now also admit `FB2`, `MOBI`, `AZW3`, and `CBZ` through a shared file-format contract, web smoke opens sample `FB2/MOBI/AZW3/CBZ` assets end to end, and a focused desktop webdriver regression now reopens those same formats through the real `library-file -> reader window` path【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:167】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte:232】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts:1】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:51】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1324】 | Actual feature parity is still centered on `EPUB/PDF`; the new evidence proves one stable open path per format in both web asset mode and desktop library-file mode. `TXT` is still a planned-not-implemented format, and `AZW3` is currently validated via the shared Kindle container path rather than a KF8-specific fixture | Phase 9 |
| Scroll/Page View Modes | Partial | Reader now has paginated geometry control, width modes, and layout labels such as `PAGINATED` / `FIXED`【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:111】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:191】 | There is no user-facing switch between scrolling and paginated reading modes yet | Phase 8 |
| Full-Text Search | Partial | Reader has whole-book search UI, result navigation, history, disk cache, and automated reopen regression coverage【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:491】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:435】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1577】 | Advanced search product surface is still thinner than the target list: no explicit cross-book search, no polished long-term management UX, and no full feature audit against the product list | Phases 7 and 10 |
| Annotations and Highlighting | Partial | Notes and bookmarks are implemented, persisted, reopened, edited, deleted, and covered by desktop regressions【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:623】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte:799】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1443】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1510】 | The current product surface is mostly notes + bookmarks. Rich highlight workflows, “instant mode”, and a full annotation product pass are still missing or implicit | Phase 7 |
| Customize Font and Layout | Partial | Width modes, atmosphere modes, chrome visibility, and layout-driven geometry now exist in the reader menu【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte:148】【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte:57】 | No full settings surface for font family, font size, line height, margins, theme presets, or deeper typography controls yet | Phase 8 |
| File Association and Open With | Partial | Desktop import, `open original file`, `library-file` targets, and separate reader window flows are in place【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:210】【/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerWindow.ts:13】 | There is no evidence of OS-level file association registration or full “Open With br1” product integration | Phase 6 |
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
- `FB2/MOBI/CBZ`: at least one sample asset now opens end to end in web mode
- `AZW3`: one `.azw3` asset now opens end to end through the shared Kindle container path, but KF8-specific behavior is still unverified
- `TXT`: explicitly in scope but not implemented yet, with a dedicated planned-not-implemented reader error

Evidence:

- Desktop import currently filters `epub`, `pdf`, `mobi`, `azw3`, `fb2`, `cbz` via the shared reader file-format contract【/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts:169】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts:1】
- Reader file input accepts `.epub,.pdf,.mobi,.azw3,.fb2,.cbz` via the same shared contract【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte:232】【/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts:1】
- Web smoke now opens sample `FB2`, `MOBI`, `AZW3`, and `CBZ` assets without a reader stage error and asserts the expected `format/layout` footer state【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:51】
- Focused desktop webdriver coverage now imports those same sample formats through the real `import_library_books` command and reopens each one through the `library-file` window flow【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1324】
- Reader now exposes a deterministic planned-format error for `.txt` assets instead of falling through to a generic lower-level open failure【/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte:167】【/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts:35】
- Focused desktop regressions cover `EPUB` and `PDF` reopen flows【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1194】【/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts:1288】

Conclusion:

`br1` should not yet claim the full “multi-format support” row from the feature list. It now has a verifiable open path for `FB2/MOBI/AZW3/CBZ` in both web asset mode and desktop `library-file` mode, but full parity still requires richer import/open-with behavior, broader fixture coverage, and a real KF8-grade `AZW3` validation path.

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

This cluster is solid but still better labeled `Partial`, because the target feature list implies a more mature annotation/highlighting surface than current `notes + bookmarks` alone.

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
