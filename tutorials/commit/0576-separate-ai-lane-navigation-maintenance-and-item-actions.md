# 0576 Separate AI lane navigation, maintenance, and item actions

## Why this change exists

The AI notebook already had better section structure, but the action layer still read too flat. Inside a focused lane, navigation, maintenance, and per-record actions all looked like the same kind of chip button. That made the notebook feel more like a utility toolbar than a reading workspace.

This slice separates those concerns:

- section navigation
- section maintenance
- per-record actions

It also turns the selected record into visible state instead of another button.

## What changed

- split focused-lane header controls into `记录分区导航` and `记录分区维护操作`
- style `返回本书 AI 记录摘要` as the primary section-level navigation action
- keep `收起记录列表` as a secondary maintenance action and `清除本书...` as the destructive maintenance action
- replace the selected item's `正在查看` button with a state badge, while unselected items keep `查看记录` as the primary row action and `再次发起` as the secondary row action
- add a focused smoke that verifies the maintenance group, the presence of a `查看记录` action before selection, and the `当前正在查看` status badge after selection

## Why this shape

This stays inside the current notebook presentation layer:

- no archive model changes
- no new persistence
- no provider/backend behavior changes

The goal is only to make the lane read more like a structured notebook section and less like a row of interchangeable tools.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows notebook-style action hierarchy inside ai archive lanes"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browser
- no persisted section-action state
- no redesign of the AI provider/conversation model
