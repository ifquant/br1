# 0376 - Harden Readest Import Paths

This slice extends the library trust-boundary hardening to the Readest
compatibility importer.

## What changed

- Readest book directories are now resolved from a single safe hash path
  component, then canonicalized under the Readest `Books` root.
- Readest book candidates are canonicalized before import and ignored if they
  escape the resolved book directory, including symlink escapes.
- Readest `config.json` and `cover.png` are read or copied only when their
  canonical paths stay inside the resolved Readest book directory.
- The Readest migration WebDriver selector now accepts the localized migration
  banner label.

## Why this matters

The renderer no longer controls Readest import paths directly, but Readest
metadata is still external local state. Treating its `hash` as a path component
without canonical containment checks could let malformed Readest metadata point
br1 at files outside the expected Readest book directory. This keeps the
compatibility importer aligned with the Tauri trust-boundary rules used for
normal library imports.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml --features webdriver` passed.
- `pnpm check` passed.
- `git diff --check` passed.
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "Readest migration outcomes"` passed.
