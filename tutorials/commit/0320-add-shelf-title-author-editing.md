# 0320 - Add Shelf Title Author Editing

This slice turns the main shelf metadata panel from read-only review into a first editable metadata surface. The scope is intentionally narrow: users can edit title and author, and the update is persisted to `library.json` without touching the managed book file or reading state.

## What Changed

- Added a Tauri `update_library_book_metadata` command.
- Added `updateLibraryBookMetadata` to the library persistence service.
- Added an `编辑标题/作者` form to the shelf metadata panel.
- Wired the library page to persist title/author edits and refresh the shelf from the updated records.
- Added a desktop regression that edits a visible shelf book, verifies `library.json`, verifies the UI, and restores the original metadata afterward.
- Updated library test helpers to include the current `.shelf .book-card` DOM class.

## Boundaries

The edit command only accepts non-empty title and author values. It matches the target by record id or file path and preserves the existing file path, progress, restore location, cover, source path, and timestamps.

## Verification

- `pnpm check` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf title"` (PASS)
- `git diff --check` (PASS)

## Not Included

- Editing description, language, publisher, cover, collections, tags, or reading status remains deferred.
- No online metadata lookup or catalog integration is added.
