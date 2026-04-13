# br1 Structure

## Summary

The repository is centered on the `br1` Tauri app, with a clear split between frontend app code, Rust host code, automation, tutorials, and small prototype/demo assets.

## Top-Level Layout

- `src/` — SvelteKit app source
- `src-tauri/` — Rust host runtime and Tauri configuration
- `scripts/` — automation and setup helpers
- `e2e/` — WebdriverIO-based desktop regression suite
- `tests/e2e/` — Playwright web smoke suite
- `static/` — cover assets, sample assets, vendored PDF runtime
- `tutorials/commit/` — per-commit learning notes
- `pydemo/` — prototype/demo helpers outside the shipped app
- `docs/` — ad hoc product notes

## Frontend Structure

### Routes

- `src/routes/+layout.svelte` — global shell and CSS tokens
- `src/routes/library/+page.svelte` — library page orchestration
- `src/routes/reader/+page.svelte` — reader page orchestration

### Components

- `src/lib/components/index.ts` — central export barrel
- `src/lib/components/library/`
  - `LibraryHeader.svelte`
  - `BookshelfPreview.svelte`
  - `ContinueReadingShelf.svelte`
- `src/lib/components/reader/`
  - `ReaderSidebar.svelte`
  - `ReaderStage.svelte`
  - `ReaderHeaderBar.svelte`
  - `ReaderFooterBar.svelte`
  - `ReaderViewport.svelte`
  - `ReaderWorkspace.svelte` (deprecated export, retained for legacy compatibility)

### Reader Domain Modules

- `src/lib/reader/types.ts` — shared reader-side types
- `src/lib/reader/index.ts` — reader export surface
- `src/lib/reader/foliate.ts` — foliate bootstrap helpers
- `src/lib/reader/searchController.ts`
- `src/lib/reader/notesController.ts`
- `src/lib/reader/bookmarksController.ts`
- `src/lib/reader/sidebarController.ts`

### Services

- `src/lib/services/platform.ts` — Tauri environment/invoke boundary
- `src/lib/services/libraryPersistence.ts` — library import/load/update/readest integration
- `src/lib/services/readerSearchCache.ts`
- `src/lib/services/readerNotes.ts`
- `src/lib/services/readerBookmarks.ts`
- `src/lib/services/readerWindow.ts`
- `src/lib/services/windowDrag.ts`

### Other Frontend Support

- `src/lib/library/types.ts` — library shelf types
- `src/lib/types/foliate-js.d.ts` — custom TS declarations
- `src/lib/vendor/pdfjs-host-entry.js` — PDF host contract adapter
- `src/lib/stores/index.ts` — currently minimal placeholder surface

## Host / Rust Structure

- `src-tauri/src/main.rs` — binary entrypoint
- `src-tauri/src/lib.rs` — Tauri builder and command registration
- `src-tauri/src/models.rs` — serialized models and constants
- `src-tauri/src/util.rs` — path, IO, metadata, pruning helpers
- `src-tauri/src/commands/`
  - `mod.rs`
  - `library.rs`
  - `search_cache.rs`
  - `notes.rs`
  - `bookmarks.rs`

Supporting Tauri folders:

- `src-tauri/capabilities/`
- `src-tauri/capabilities-extra/`
- `src-tauri/icons/`

## Automation / Testing Structure

- `e2e/app.e2e.ts` — primary Tauri WebDriver regression suite
- `wdio.conf.ts` — WebdriverIO configuration
- `tests/e2e/library-smoke.spec.ts` — Playwright web smoke
- `playwright.config.ts` — Playwright config
- `scripts/automation/test-tauri-webdriver.sh` — bootstraps Vite + Tauri + WebDriver for tests
- `scripts/automation/desktop-open-first-library-book.sh` — helper desktop smoke flow

## Asset / Vendor Structure

- `static/covers/` — library cover visuals and fallbacks
- `static/samples/` — sample EPUB/PDF assets
- `static/vendor/pdfjs/` — copied runtime artifacts for PDF support

## Documentation / Knowledge Capture

- `tutorials/commit/` — very large, continuously growing commit-by-commit tutorial history
- `docs/main1.md` — local product/idea notes
- `README.md` — still near-template, not a full repo guide

## Prototype / Demo Area

- `pydemo/` contains Python scripts and sample assets for prototyping outside the main app runtime
- This folder is useful context, but the main shipped application is the Svelte/Tauri stack

## Structural Notes

- The repo includes generated or heavy local directories such as `node_modules/`, `.svelte-kit/`, and `src-tauri/target/`
- Planning artifacts are currently absent; this map will create `.planning/codebase/`
- The active engineering center of gravity is clearly `src/routes/reader/+page.svelte`, `src/lib/components/reader/`, `src/lib/reader/`, and `src-tauri/src/commands/`
