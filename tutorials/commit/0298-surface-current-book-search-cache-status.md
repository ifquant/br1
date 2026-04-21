# 0298 - Surface current-book search cache status

## Why this change exists

`Full-Text Search` already had structured history, disk cache restore, and replay coverage, but the product surface still hid cache state behind an optional `清空缓存` button inside the history header. That made cache behavior hard to inspect as a user-facing reading tool.

This slice adds a small cache visibility surface without changing the search execution or persistence model.

## What changed

- The search sidebar now shows a `search cache status` panel whenever the current book has a search cache key and the search box is empty.
- The panel states that current-book search cache is enabled and summarizes total history, hit-history, and zero-result-history counts.
- `清空缓存` moved into that cache status panel, while `清空历史` remains with the history list.
- Web and desktop regressions now assert the cache status panel after reload/reopen.

## Verification

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "reader manages structured search history through reload in web mode"` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'restores search history, options, and disk cache after reopening the same book' --mochaOpts.timeout 240000"` (PASS)

## Notes for future agents

- This is intentionally not a full cache browser. It is the first user-visible cache status/clear surface for the current book.
- Keep cache clearing separate from history clearing. They are related operationally, but they should not be presented as the same product action.
