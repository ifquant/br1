# 0379 - Enable Strict Clippy Gate

This slice makes the current Tauri crate pass strict clippy with warnings denied.

## What changed

- Added narrow `#[allow(clippy::too_many_arguments)]` annotations to the two
  Tauri command handlers whose argument lists are part of the renderer invoke
  API shape.

## Why this matters

The remaining clippy findings were not implementation bugs; they were command
signature shape warnings. Refactoring them into request structs would touch the
frontend invocation contract without improving the trust-boundary work. Keeping
the allow attributes local lets `cargo clippy -- -D warnings` become a usable
verification gate without hiding broader lint output.

## Verification

- `cargo clippy --manifest-path src-tauri/Cargo.toml --features webdriver -- -D warnings` passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --features webdriver` passed.
- `pnpm check` passed.
- `git diff --check` passed.
