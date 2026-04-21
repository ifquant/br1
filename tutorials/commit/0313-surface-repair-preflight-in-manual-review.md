# 0313. Surface Repair Preflight In Manual Review

The repair flow now has a strong candidate preflight contract, but the manual
review panel only told users to choose a replacement file. This slice makes the
preflight visible before the picker opens.

## What Changed

- `ManualRelinkReview` now carries:
  - `preflightLabel`
  - `preflightDetail`
- The library route fills those fields for every manual relink review state.
- `ContinueReadingShelf` renders a dedicated preflight block in the manual
  review panel.
- The preflight copy tells users that br1 checks:
  - file existence
  - format
  - title
  - author
  - original source path
  - SHA-256 fingerprint
- The focused desktop repair regression now verifies the visible preflight copy
  before bulk repair runs.

## Why This Matters

Preflight should not be an invisible implementation detail. Showing the contract
in the review panel sets the user's expectation before file selection and makes
manual relink less surprising when br1 later asks for an extra confirmation.

## Verification

```bash
pnpm check
```

Result: PASS, 0 Svelte diagnostics.

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "bulk repairs eligible broken library copies"
```

Result: PASS, 1 focused desktop repair regression passing.

```bash
git diff --check
```

Result: PASS.

This does not add new repair behavior; it surfaces the existing preflight
contract in the manual review UI.
