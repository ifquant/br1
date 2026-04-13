# br1 Codebase Stack

## Summary

`br1` is a desktop-first reader shell built around `SvelteKit` on the frontend and `Tauri 2` on the host side. The app is centered on a Readest-inspired library/reader split, with `foliate-js` providing EPUB/PDF reading primitives and a local vendor pipeline for `pdfjs-dist`.

## Primary Languages

- TypeScript for the Svelte app and Node-based build/test/vendor scripts
- Svelte 5 components for UI composition in `src/lib/components/` and route entrypoints in `src/routes/`
- Rust 2021 for Tauri commands and local persistence in `src-tauri/src/`
- Small Python prototype utilities in `pydemo/` for sample-book generation and experiments

## Frontend Runtime

- `SvelteKit` app shell configured by `svelte.config.js`, `vite.config.js`, and `tsconfig.json`
- Browser-side routes:
  - `src/routes/library/+page.svelte`
  - `src/routes/reader/+page.svelte`
  - `src/routes/+layout.svelte`
- Reader UI composition lives under:
  - `src/lib/components/reader/`
  - `src/lib/reader/`
  - `src/lib/services/`

## Host/Desktop Runtime

- `Tauri 2` app configured in `src-tauri/Cargo.toml`
- App entrypoints:
  - `src-tauri/src/main.rs`
  - `src-tauri/src/lib.rs`
- Command modules:
  - `src-tauri/src/commands/library.rs`
  - `src-tauri/src/commands/search_cache.rs`
  - `src-tauri/src/commands/notes.rs`
  - `src-tauri/src/commands/bookmarks.rs`

## Key Frontend Dependencies

- `foliate-js` via local file dependency: `file:../foliate-js`
- `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`
- `overlayscrollbars` and `overlayscrollbars-svelte` for library/reader scroll surfaces
- `construct-style-sheets-polyfill` for reader rendering support
- `pdfjs-dist` for the PDF runtime copied into `static/vendor/pdfjs/`

## Key Dev/Test Dependencies

- `svelte-check` for type and Svelte diagnostics
- `@playwright/test` for web-mode smoke coverage in `tests/e2e/library-smoke.spec.ts`
- `webdriverio` stack for Tauri desktop regression coverage in `e2e/app.e2e.ts`
- `@tauri-apps/cli` for local desktop development
- `postcss` + `postcss-nested` in `scripts/setup-pdfjs-vendor.mjs`

## Important Scripts

- `pnpm check` — Svelte/type validation
- `pnpm dev` — Vite dev server
- `pnpm tauri dev` — desktop runtime
- `pnpm test:e2e` — Playwright web checks
- `pnpm test:e2e:tauri` / `pnpm test:tauri:webdriver` — desktop regression flow
- `pnpm setup-vendors` — PDF vendor setup pipeline

## Local Asset / Vendor Stack

- PDF runtime is copied into `static/vendor/pdfjs/` by `scripts/setup-pdfjs-vendor.mjs`
- Cover assets and sample books live in:
  - `static/covers/`
  - `static/samples/`
- Python demo content lives in:
  - `pydemo/sample_book.epub`
  - `pydemo/sample_outline.pdf`
  - `pydemo/data/`

## Current Product Scope Signals

- Library shell and reader shell are both active, not a stub-only repo
- Desktop behavior matters more than plain web mode because local files, Tauri persistence, separate reader windows, and Readest library import all depend on host capabilities
- The codebase is not a generic starter anymore despite `README.md` still being close to template state
