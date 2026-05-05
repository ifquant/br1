# 0574 Add two-level navigation between AI overview and lanes

## Why this change exists

The AI workspace already had current-book overview cards plus focused lookup/translation lanes, but both levels were always visible together. That made the notebook feel more like one stacked panel than like a sectioned workspace with an overview and a drill-down view.

This slice makes the structure explicit. The overview cards now act as navigation entry points into a focused lane, and each focused lane can return to the current-book archive overview.

## What changed

- make the current-book overview cards open a focused lookup or translation lane instead of only switching the current mode in place
- hide the overview while the reader is focused on a specific lane
- add a `返回本书 AI 记录摘要` action inside the lane header so the notebook can move back up one level
- keep lane-specific collapse behavior intact, and reopen the lane list when entering from the overview
- add a focused smoke that walks `overview -> translation lane -> back to overview`

## Why this shape

This keeps the product change narrow and local:

- no new persistence contract
- no backend/provider behavior changes
- no cross-book archive browser

It simply turns the existing AI notebook into a clearer two-level structure:

- current-book archive overview
- one focused lookup or translation lane

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no persisted overview-vs-lane navigation state
- no cross-book AI archive browser
- no redesign of provider behavior or conversation model
