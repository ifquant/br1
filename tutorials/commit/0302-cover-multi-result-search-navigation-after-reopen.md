# 0302. Cover Multi-Result Search Navigation After Reopen

This slice tightens the `Full-Text Search` evidence. The search surface already
had history, cache visibility, replay, and a result navigator, but the desktop
reopen regression only proved the single-result case. That left the navigator
mostly proven as UI chrome rather than as a working multi-result control.

## What Changed

- The desktop search reopen regression now seeds two cached results for the same
  query instead of one.
- The structured history entry records `2` hits, so the reopened history card
  must show `2 条命中`.
- Replaying the history entry must restore both cached result cards.
- The result navigator now has to prove:
  - initial state: `1 / 2`, previous disabled, next enabled
  - after `下一条`: `2 / 2`, previous enabled, next disabled
  - after `上一条`: `1 / 2`, previous disabled, next enabled
- The audit now records that desktop EPUB search reopen coverage includes
  multi-result navigation, not just single-result cache replay.

## Why This Matters

A search product is not complete just because it can display one cached result.
The reader must let users move through multiple hits predictably after reopening
the same book. This is especially important because search state combines three
separate contracts:

- persisted structured search history
- disk-backed current-book result cache
- active/recent result navigation state in the sidebar

This regression keeps those contracts tied together.

## Verification

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'restores search history, options, and disk cache after reopening the same book' --mochaOpts.timeout 240000"
```

Result: PASS, 1 focused desktop search regression passing.

No new cross-book search surface is added here. This only strengthens the
current-book search product evidence.
