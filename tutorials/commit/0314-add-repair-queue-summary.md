# 0314. Add Repair Queue Summary

The repair queue already split repairable copies from manual relink records in
behavior, but the section description did not summarize that split. This slice
adds a visible queue summary.

## What Changed

- The library route now derives `manualRepairQueueCount`.
- The `待修复书籍` section description now reports:
  - total pending records
  - records that can be batch-repaired
  - records that require manual review and relink
- The focused desktop repair regression now verifies the summary with one
  batch-repairable TXT record and one manual-only CBZ record.

## Why This Matters

The repair queue should be a management surface, not just a list of broken
cards. The summary tells users what kind of work remains before they click the
bulk action or open manual review panels.

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

This does not add durable queue persistence or new repair behavior.
