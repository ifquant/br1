# 0311. Add Identity Signals To Repair Preflight

The repair preflight could already detect existence, format, and source-path
matches. This slice adds title and author identity signals, using the same
metadata derivation rules as import.

## What Changed

- `LibraryRepairCandidatePreview` now includes:
  - `title`
  - `author`
  - `titleMatches`
  - `authorMatches`
- The Tauri preview command derives candidate title and author from FB2, CBZ,
  MOBI, and AZW3 metadata where available.
- For simpler formats, the preview falls back to the file stem and `Unknown
  author`, matching the import path.
- Picker-based manual repair now asks for a second confirmation when the format
  matches but title or author identity looks wrong.
- The focused desktop repair regression now verifies:
  - a TXT candidate for a CBZ repair has the wrong title signal
  - the original CBZ source has a matching title signal
  - placeholder authors remain tolerant instead of blocking safe repairs

## Why This Matters

Format-only preflight still misses a common mistake: selecting a different book
with the same extension. Title and author signals make the relink flow safer
without forcing a heavyweight conflict wizard. They also establish the contract
that future hash or richer metadata checks can extend.

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
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "bulk repairs eligible broken library copies"
```

Result: PASS, 1 focused desktop repair regression passing.

```bash
git diff --check
```

Result: PASS.

This does not add content hashes, a persistent repair queue, or a full conflict
resolution wizard.
