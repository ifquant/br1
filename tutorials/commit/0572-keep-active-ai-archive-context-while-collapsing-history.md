# 0572 Keep active AI archive context while collapsing history

## Why this change exists

The AI workspace already had per-book lookup and translation archives, but each lane was still an always-expanded list. That made the notebook feel closer to a long activity feed than to a set of sections the reader could manage intentionally.

This slice adds lane-level collapse controls and keeps the active archived record visible even when the current lane's history list is folded away. The result is closer to a notebook section: a compact summary stays visible, while the full list becomes optional.

## What changed

- add a collapse/expand control to the active lookup or translation history lane
- keep an explicit `当前正在查看` summary card visible whenever an archived record is selected
- when a reader switches into a lane from the current-book overview cards, reopen that lane's history list
- add a focused smoke that selects a lookup record, collapses the list, and verifies the active archived summary remains visible

## Why this shape

This keeps the change inside the existing notebook boundary:

- no new persistence model
- no new provider/backend behavior
- no cross-book archive browser

The section can now tell the reader two things separately:

- which archived record is the active context
- whether the full list of archived records is currently expanded

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader keeps the active ai archive summary visible when the history list is collapsed"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI notebook or archive browser
- no persisted expanded/collapsed state
- no redesign of translation/TTS provider behavior
