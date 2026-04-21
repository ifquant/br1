# 0310. Add Repair Candidate Preflight

Manual relink already required a review panel before opening the file picker,
but the selected replacement file was imported immediately. This slice adds a
small preflight contract so br1 can detect obvious replacement mistakes before
it mutates the library record.

## What Changed

- Added a Tauri `preview_library_repair_candidate` command.
- The preview reports:
  - selected file path
  - selected file name
  - selected format
  - whether the selected file exists
  - whether the selected format matches the current record format
  - whether the selected path matches the current record source path
- Added a frontend `previewLibraryRepairCandidate()` service wrapper.
- Manual picker-based repair now previews the selected file before importing it.
- Missing selected files stop with an explicit error notice.
- Format mismatches now require a second confirmation before br1 reuses that
  selected file for the existing record.
- The desktop repair regression now verifies that a TXT candidate is rejected as
  a format/source mismatch for a CBZ manual relink record, while the original
  CBZ source passes the preview contract.

## Why This Matters

Replacement-file relink is one of the riskiest local-library actions: choosing
the wrong file can preserve progress against the wrong book. This preflight does
not solve every identity problem, but it gives the product a concrete contract
for the most obvious errors and a place to add deeper title/hash checks later.

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

This does not add durable repair-queue state, title/hash matching, or a richer
conflict-resolution wizard.
