# 0370 Normalize Tauri Rust Formatting

This slice applies `cargo fmt` to the Rust files that were already drifting from the formatter output.

## Why this matters

The previous trust-boundary test slice passed its targeted tests, but full `cargo fmt --check` still failed on unrelated existing formatting drift. Leaving that failure in place makes later security or reader work noisier because a routine formatter check reports old differences.

This commit keeps the cleanup mechanical and separate from behavioral changes.

## What changed

`cargo fmt` reformatted:

- `src-tauri/src/commands/bookmarks.rs`
- `src-tauri/src/commands/search_cache.rs`
- `src-tauri/src/util.rs`

The changes are import wrapping, chained-call wrapping, and function signature wrapping only.

## Verification

Run:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected result: formatter check passes, and the Rust test suite passes.

## Takeaway

Keep formatter-only cleanup isolated. It makes later diffs easier to review and prevents formatting noise from hiding security or product changes.
