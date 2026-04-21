# 0321 - Expand Shelf Metadata Editing

This slice expands the shelf metadata editor beyond title and author. The same metadata panel can now edit description, language, and publisher, while still preserving the managed book file and reading state.

## What Changed

- Extended `update_library_book_metadata` to accept optional description, language, and publisher fields.
- Extended the library persistence service and library page handler to pass those fields through.
- Added language, publisher, and description controls to the shelf metadata edit form.
- Updated the desktop metadata regression to verify the expanded fields in `library.json`.

## Boundaries

Empty description, language, or publisher values are stored as absent optional fields. Title and author remain required.

This still does not edit cover art, reading progress, tags, or collections.

## Verification

- `pnpm check` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf title"` (PASS)
- `git diff --check` (PASS)

## Not Included

- Cover editing, collections, tags, and online metadata lookup remain deferred.
- The editor intentionally avoids changing reading state or file paths.
