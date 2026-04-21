# 0369 Cover Library Trust Boundary Helpers

This slice adds regression tests for the Tauri library trust-boundary helpers that protect book import, repair preview, and restore flows.

## Why this matters

The previous security slice moved filesystem authority out of the renderer and into Tauri-owned trust sources. That change is important enough that it should not rely only on code review memory.

These tests focus on the small helper contracts that make the larger command behavior safe:

- selected book paths must be existing files with supported book extensions
- restore destinations must reject parent-directory traversal components
- removed or persisted records must be found by backend-owned record identity, not by renderer-supplied source paths
- persisted source allowlists must match exact stored keys

## What changed

`src-tauri/src/commands/library.rs` now has a focused `#[cfg(test)]` module for the pure trust-boundary helpers.

The tests intentionally avoid constructing a full Tauri app. That keeps them fast and stable while still covering the helper behavior that would otherwise be easy to weaken during future refactors.

## Verification

Run the targeted test set:

```bash
cargo test --manifest-path src-tauri/Cargo.toml library::tests
```

Expected result: all library trust-boundary helper tests pass.

## Takeaway

For Tauri filesystem commands, test the boundary helpers directly whenever possible. The renderer can request an action, but it should not be able to mint filesystem authority by sending a path string.
