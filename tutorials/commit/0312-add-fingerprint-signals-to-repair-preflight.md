# 0312. Add Fingerprint Signals To Repair Preflight

The repair preflight now has format, title, author, and source-path signals. This
slice adds byte-size and SHA-256 fingerprint signals so the replacement-file
contract can distinguish files with similar metadata but different content.

## What Changed

- `LibraryRepairCandidatePreview` now includes:
  - `byteSize`
  - `sha256`
  - `sourceHashMatches`
- The Tauri preview command streams the selected file through SHA-256 instead of
  loading the whole file into memory.
- If the selected file path matches the original source path but the file
  content fingerprint differs, the frontend asks for a second confirmation.
- The focused desktop repair regression verifies:
  - candidate byte size is present
  - candidate SHA-256 looks valid
  - a TXT candidate does not match the CBZ source hash
  - the original CBZ candidate does match the CBZ source hash

## Why This Matters

Title and author signals are useful but not definitive. Fingerprints give the
repair flow a stronger content-level signal without forcing a bigger repair
wizard. This also creates a stable preflight field that future UI can surface in
the manual relink review panel.

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

This does not add a persistent repair queue, full conflict wizard, or visible
fingerprint UI beyond the confirmation guard.
