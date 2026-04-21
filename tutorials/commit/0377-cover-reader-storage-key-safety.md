# 0377 - Cover Reader Storage Key Safety

This slice adds a small regression test for renderer-controlled reader storage
keys.

## What changed

- Added a Rust unit test proving search cache keys, current reader storage keys,
  and legacy note/bookmark keys do not produce path separators or `..`
  components.

## Why this matters

The reader notes, bookmarks, highlights workspace, and search cache commands all
accept renderer-controlled book/cache keys. They do not use those keys as raw
paths; they hash or URL-safe encode them before touching disk. This test locks
that trust-boundary assumption so future refactors do not accidentally turn a
book key back into a filesystem path component.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml --features webdriver` passed.
- `pnpm check` passed.
- `git diff --check` passed.
