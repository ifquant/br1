# 0579 Let focused AI lanes switch between current and history views

## Why this change exists

The focused AI lanes already had better notebook structure:

- overview cards
- focused lookup or translation lanes
- explicit `当前记录` and `历史记录列表` subsections

But selection and browsing were still coupled too tightly. Once a reader selected an archived record, there was no explicit way to say whether they wanted to stay in a full archive view or temporarily narrow the lane to the active record.

That made the lane harder to read as a notebook workflow. Selecting a record and changing the scope of the page are different actions and should not be conflated.

## What changed

- add explicit browse-mode controls inside focused lanes:
  - `只看当前记录`
  - `查看完整历史`
- keep record selection separate from browse-mode changes, so `查看记录` only selects the record
- make the history section collapse into focused-mode copy when `只看当前记录` is active
- add a focused smoke that verifies the lane can move from full-history browsing into current-record browsing and back again
- keep the browse-mode buttons' `aria-pressed` state aligned with the visible lane mode

## Why this shape

This stays inside notebook navigation semantics:

- no archive persistence changes
- no provider or replay changes
- no new thread model

The goal is only to make focused lanes behave more like an intentional notebook browsing surface instead of one large archive panel with implicit mode changes.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browser
- no archive persistence or replay changes
- no thread-style conversation model beyond the current notebook archives
