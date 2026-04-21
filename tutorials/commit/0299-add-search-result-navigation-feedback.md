# 0299 - Add search result navigation feedback

## Why this change exists

The search sidebar already listed full-text results and allowed direct result clicks, but it did not expose an explicit reader-style navigation control. A serious reader search surface should show where the user is in the result set and make previous/next navigation visible instead of relying only on a list.

This slice keeps the scope local to current-book search. It does not start cross-book search.

## What changed

- The search panel now shows a `search result navigation` control whenever results are available.
- The control displays the current result position as `x / n`.
- `上一条` and `下一条` buttons route through the existing `onSearchResult` callback and are disabled when movement is impossible.
- The current result index prefers the most recently clicked search result, then falls back to the reader active CFI.
- The desktop cached-search regression now asserts a single cached result shows `1 / 1` and disables both navigation buttons.

## Verification

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'restores search history, options, and disk cache after reopening the same book' --mochaOpts.timeout 240000"` (PASS; one prior run hit a transient cleanup window error before an unchanged rerun passed)

## Notes for future agents

- This is the first result navigator surface, not full cross-book search.
- A future stronger regression should use a real multi-result fixture and verify next/previous navigation changes the active result index.
