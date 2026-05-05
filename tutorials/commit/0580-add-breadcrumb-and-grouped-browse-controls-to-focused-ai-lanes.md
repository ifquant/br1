# 0580 Add breadcrumb and grouped browse controls to focused AI lanes

## Why this change exists

The focused AI lanes already had better navigation semantics:

- current-record vs full-history browse mode
- explicit current-record and history-list sections
- overview-to-lane navigation

But the control surface still read too much like a loose row of buttons. The reader could switch modes, but the lane did not yet clearly explain:

- where they were in the notebook
- which controls change position
- which controls change browse scope

This slice makes that structure visible.

## What changed

- add a small breadcrumb that shows the current notebook path inside the focused lane
- group `返回本书 AI 记录摘要` under a `浏览位置` control group
- group `只看当前记录` and `查看完整历史` under a `浏览范围` control group
- keep the browse-mode behavior from the previous slice unchanged while making the control surface self-describing
- add a focused smoke that verifies the breadcrumb text and the grouped browse controls inside the focused lane

## Why this shape

This stays inside lane-navigation presentation:

- no archive persistence changes
- no provider or replay changes
- no new conversation or thread model

The goal is only to make the lane header read like a notebook navigation surface rather than a flat row of unrelated chips.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browser
- no archive persistence or replay changes
- no thread-style conversation model beyond the current notebook archives
