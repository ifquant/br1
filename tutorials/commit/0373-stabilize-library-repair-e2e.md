# 0373 Stabilize Library Repair E2E

This slice stabilizes the desktop library e2e tests after the trust-boundary changes made renderer path handling stricter.

## Why this matters

The security fix changed repair preview from renderer-supplied expected fields to backend-resolved persisted records. That is the right trust model, but existing e2e helpers still assumed the old shape in a few places.

The affected tests also used book titles as row identifiers. Several fixture imports can share the same title across repeated test runs, so title-only lookup can click or assert against the wrong row.

## What changed

The imported-book helper now keeps the persisted record `id` returned by Tauri.

The remove/undo test finds the target card by exact reader `path` query parameter instead of title text. This avoids collisions with existing sample-book rows.

The bulk repair test now:

- passes the stable persisted record id into repair preview
- expects source path and source hash mismatch when the persisted original source is intentionally missing
- asserts repair queue summaries from the repair section itself instead of an optional header summary element
- finds the manual review detail panel by visible panel content instead of an exact aria-label string

## Verification

Run the focused desktop checks:

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "removes an imported shelf book"
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "bulk repairs eligible broken library copies"
```

Expected result: both focused WebDriver runs pass.

## Takeaway

For desktop library e2e tests, prefer persisted ids or exact reader paths over titles. Titles are user-facing labels, not stable test identities.
