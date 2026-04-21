# 0303. Surface Current Book Search Cache Identity

This slice makes the current-book search cache panel more inspectable.
Previously the sidebar could tell the user that a cache existed and could clear
it, but it did not show which book/cache identity was active.

## What Changed

- The search cache status panel now shows `缓存标识：...`.
- Long identifiers are shortened in the visible text while the full value remains
  available through the element title.
- Web smoke now proves the asset reader shows `/samples/sample-book.epub` as its
  cache identity after reload.
- The desktop search reopen regression now asserts that the cache identity is
  visible before and after replaying cached results.
- The parity audit now records this as deeper current-book cache visibility,
  while still leaving full per-query cache inspection out of scope.

## Why This Matters

Search cache state is easy to make invisible. If a user only sees "cache enabled"
and a destructive "clear cache" button, they cannot tell whether the panel refers
to the current book, a stale book, or a migrated cache. Showing the active cache
identity makes the management surface more auditable without adding a large cache
browser.

## Verification

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "reader manages structured search history through reload in web mode"
```

Result: PASS, 1 focused web smoke regression passing.

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'restores search history, options, and disk cache after reopening the same book' --mochaOpts.timeout 240000"
```

Result: PASS, 1 focused desktop search regression passing.

This does not add cross-book search or a full cache-entry inspector.
