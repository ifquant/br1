# 0322 - Clarify Shelf Metadata Edit Contract

This slice aligns the shelf metadata editor UI with its expanded scope and makes the safety boundary explicit.

## What Changed

- Renamed the shelf edit entry from `编辑标题/作者` to `编辑元数据`.
- Added a short contract note inside the edit form.
- Extended the desktop metadata regression to assert that the contract is visible before saving.

## Why This Matters

The editor now handles title, author, description, language, and publisher. The old entry label under-described the action, and the form did not state the key guarantee: saving metadata does not move files, reset progress, or overwrite restore locations.

## Verification

- `pnpm check` (PASS)
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf title"` (PASS)
- `git diff --check` (PASS)

## Not Included

- No new metadata fields were added in this slice.
- Cover editing, collections, tags, and online metadata lookup remain deferred.
