# 0315. Cover Repair Queue Summary After Bulk Repair

The previous slice added a visible repair queue summary. This slice strengthens
the desktop regression so it also proves the summary updates after the bulk
repair action changes queue membership.

## What Changed

- The focused desktop repair regression now checks the post-bulk-repair queue
  summary.
- The test verifies that after one eligible TXT record is rebuilt, the repair
  queue shows:
  - `共 1 本待处理`
  - `0 本可批量修复副本`
  - `1 本需逐本复核重关联`
- The same regression still verifies the repaired TXT record keeps progress and
  the manual CBZ record remains in the queue.

## Why This Matters

The repair queue summary is only useful if it follows state changes. This test
locks in that behavior without adding more UI or broadening the product surface.

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

This is test-only coverage for the existing repair queue summary behavior.
