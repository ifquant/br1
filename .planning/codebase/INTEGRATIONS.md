# br1 Integrations

## Summary

`br1` integrates primarily with the local desktop environment rather than remote web services. The core integrations are Tauri host APIs, local filesystem persistence, imported Readest data, the workspace `foliate-js` dependency, and vendored PDF.js runtime assets.

## Tauri Host APIs

Frontend services call Tauri commands through the shared platform boundary in `src/lib/services/platform.ts`.

Primary host-facing services:

- `src/lib/services/libraryPersistence.ts`
- `src/lib/services/readerSearchCache.ts`
- `src/lib/services/readerNotes.ts`
- `src/lib/services/readerBookmarks.ts`
- `src/lib/services/readerWindow.ts`

Command registration happens in `src-tauri/src/lib.rs` through:

- `commands::library::*`
- `commands::search_cache::*`
- `commands::notes::*`
- `commands::bookmarks::*`

## Local Filesystem / App Data

The app stores its own data under Tauri app data roots, resolved in `src-tauri/src/util.rs`.

Important storage roots:

- Library records and copied books:
  - `app_data_dir/library/`
  - `library.json`
- Reader search cache:
  - `app_data_dir/reader-search/`
- Reader notes:
  - `app_data_dir/reader-notes/`
- Reader bookmarks:
  - `app_data_dir/reader-bookmarks/`

Book binaries are loaded through `load_library_book_binary`, then turned back into browser `File` objects in `src/lib/services/libraryPersistence.ts`.

## Readest Import

`br1` reads an existing Readest desktop library and copies it into its own storage instead of reading it in place.

Relevant paths and code:

- Detection/import surface in `src/lib/services/libraryPersistence.ts`
- Host-side import logic in `src-tauri/src/commands/library.rs`
- Readest path resolution in `src-tauri/src/util.rs`

Imported Readest fields include:

- metadata
- cover image if present
- restore location
- progress-derived labels

This is a local-app integration, not a network API.

## foliate-js Workspace Dependency

The reader relies on a sibling workspace checkout:

- `../foliate-js`

Frontend bootstrap points:

- `src/lib/reader/foliate.ts`
- `src/lib/components/reader/ReaderViewport.svelte`

This integration is important because `br1` uses a local evolving copy rather than a published npm package.

## PDF.js Vendor Pipeline

`br1` does not serve PDF.js directly from package internals at runtime. It copies the required runtime into static assets.

Vendor preparation:

- script: `scripts/setup-pdfjs-vendor.mjs`
- target directory: `static/vendor/pdfjs/`

Assets copied include:

- JS bundles
- wasm files such as `jbig2.wasm`
- runtime fallback JS
- cmaps and standard fonts
- flattened PDF.js CSS derived from `../foliate-js/vendor/pdfjs/`

## Tauri Windowing

Desktop reader windows are opened as separate webviews through:

- `src/lib/services/readerWindow.ts`

This integration uses:

- `@tauri-apps/api/webviewWindow`
- `@tauri-apps/api/window`

Library-to-reader navigation can therefore switch between in-window web routing and dedicated desktop windows depending on environment.

## Desktop File Dialog / File Opening

The app integrates with the host OS for:

- importing books via `@tauri-apps/plugin-dialog`
- opening original book files via `@tauri-apps/plugin-opener`

Code locations:

- `src/lib/services/libraryPersistence.ts`
- `src/lib/services/readerWindow.ts`

## Test / Automation Integrations

Web-mode automation:

- `tests/e2e/library-smoke.spec.ts`
- `playwright.config.ts`

Desktop automation:

- `e2e/app.e2e.ts`
- `wdio.conf.ts`
- `scripts/automation/test-tauri-webdriver.sh`

The WebDriver path depends on the optional Rust feature:

- `webdriver` in `src-tauri/Cargo.toml`

## Not Present

As of the current codebase, there is no active integration with:

- remote sync APIs
- cloud auth providers
- analytics SDKs
- server-side databases
- HTTP backend services
