# 0581 Add a browse summary layer to focused AI lanes

## Why this change exists

The focused AI lanes already had a stronger navigation surface:

- breadcrumb
- grouped browse-position controls
- grouped browse-scope controls

But the reader still had to infer the current lane state from those controls. That is workable, but it makes the navigation contract harder to scan than it needs to be.

This slice adds one more layer: a compact summary that states the current lane position and current browse scope directly.

## What changed

- add a small `当前位置 / 当前范围` summary row under the focused-lane breadcrumb
- keep the breadcrumb and grouped controls in place, but stop relying on them as the only way to infer the current lane state
- make the summary react to browse-mode changes between `只看当前记录` and `查看完整历史`
- extend the focused AI lane smoke so it verifies the summary before and after toggling the browse scope

## Why this shape

This stays inside navigation presentation:

- no archive persistence changes
- no provider or replay changes
- no new thread or cross-book model

The goal is only to make the focused lane navigation self-describing enough that the reader can understand the current notebook state at a glance.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browser
- no archive persistence or replay changes
- no thread-style conversation model beyond the current notebook archives
