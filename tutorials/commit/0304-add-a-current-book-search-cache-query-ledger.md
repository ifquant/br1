# 0304. Add A Current-Book Search Cache Query Ledger

This slice makes the search cache panel more useful as a management surface.
After the previous change, the panel showed which book cache was active. It
still did not show which successful queries were available to replay from that
current-book cache/history contract.

## What Changed

- The search cache status panel now lists successful current-book search entries
  under `search cache query entries`.
- Each entry shows:
  - the query text
  - the result count
  - whether the query was scoped to the whole book or current section
- Clicking a cache query entry replays that search, using the same structured
  history path as the regular history chips.
- Web smoke proves the ledger shows `/samples/sample-book.epub` cache identity,
  `constitutional order`, and `3 条 · 全书`, then replays the ledger entry.
- The desktop search reopen regression proves the same ledger is visible for a
  disk-seeded cache and that clicking the ledger entry restores the cached query.

## Why This Matters

The cache panel should not only say "cache exists". A reader needs to know which
queries are available to reuse for the current book. This adds a small cache
ledger without building a full cache browser or cross-book search index.

## Verification

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "reader manages structured search history through reload in web mode"
```

Result: PASS, 1 focused web smoke regression passing.

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'restores search history, options, and disk cache after reopening the same book' --mochaOpts.timeout 240000"
```

Result: PASS, 1 focused desktop search regression passing.

This does not add cross-book search or expose low-level cache timestamps yet.
