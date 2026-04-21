# 0319 - Add Manual Relink Repair Contract

This slice makes the manual relink review panel more explicit before the file picker opens. The user now sees the repair contract: replacement files are linked back into the existing record, while reading status, progress, and restore location are preserved when available.

## What Changed

- Added `repairContractLabel` and `repairContractDetail` to `ManualRelinkReview`.
- Built the contract text from the persisted repair target, including restore-location wording when the record has progress data.
- Rendered the contract as a dedicated block in the manual relink review panel.
- Extended the focused desktop repair regression to assert the contract before the replacement-file action.

## Why This Matters

Manual relink is the riskiest repair path because it asks users to pick a replacement file. The UI now states the two important guarantees before that picker opens:

- the selected file repairs the current record in place
- the repair keeps the existing reading state instead of creating a duplicate book

## Verification

- `pnpm check` (PASS)
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"` (PASS after rerun; first run hit the existing searchbox timing flake)
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "bulk repairs eligible broken library copies"` (PASS)
- `git diff --check` (PASS)

## Not Included

- The system file-picker relink path still needs a separate end-to-end harness.
- Durable repair queue persistence and richer conflict resolution remain deferred.
