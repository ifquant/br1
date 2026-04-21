# 0306. Add Safe Library Record Removal

This slice closes another library-management gap: users could inspect an
imported shelf record, repair broken copies, and reopen books, but they could
not deliberately remove a book from the local br1 library. Removing a book is a
destructive library action, so the implementation keeps a strict boundary
between br1-managed copies and the user's original source file.

## What Changed

- Added a Tauri `remove_library_book` command.
- The command removes the matching `library.json` record.
- The command deletes only files under br1's managed library root, including the
  stored book copy and optional copied cover asset.
- The original `sourcePath` is intentionally left untouched.
- Added a frontend `removeLibraryBook()` service wrapper.
- The main shelf metadata panel now exposes `从书库移除` when persistence is
  available.
- The library route confirms the action, refreshes the shelf from the returned
  records, and shows a notice that the original file was not deleted.
- Desktop webdriver now imports a unique temporary TXT source, removes it from
  the shelf, then verifies:
  - the br1 library record is gone
  - the br1 stored copy is gone
  - the original source file still exists

## Why This Matters

Library management needs safe lifecycle actions, not only import and repair.
This is intentionally narrower than a full deletion system: it removes br1's
local ownership of a book while avoiding any claim over user-owned files outside
the app library directory. That makes the action predictable enough to expose in
the normal shelf UI.

## Verification

```bash
pnpm check
```

Result: PASS, 0 Svelte diagnostics.

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Result: PASS.

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "removes an imported shelf book"
```

Result: PASS, 1 focused desktop library removal regression passing.

```bash
git diff --check
```

Result: PASS.

This does not add collections, editable metadata, undo, or remote catalog
deletion semantics.
