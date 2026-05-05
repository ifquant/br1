# 0582 Add current-entry summary to focused AI navigation

## Why this change exists

The focused AI lanes already had a readable navigation contract:

- breadcrumb
- grouped browse-position controls
- grouped browse-scope controls
- compact `当前位置 / 当前范围` summary

But one piece was still implicit. When the reader switched into `只看当前记录`, the UI still relied on the content section below to explain which archived record was currently in focus.

This slice closes that gap by letting the navigation summary state the active archived record directly.

## What changed

- add a `当前条目` field to the focused-lane navigation summary when an archived record is selected
- keep the summary empty of entry details while the lane is still browsing full history
- extend the focused AI lane smoke so it verifies the new summary before selection and after switching into `只看当前记录`
- record the slice in the Readest alignment checklist

## Why this shape

This stays inside the focused-lane navigation contract:

- no new archive persistence behavior
- no provider or request-model changes
- no cross-book archive browser or thread model

The goal is only to make the top navigation surface fully self-describing, so the reader does not need to infer the active record from the lower content sections.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no archive replay or provider-layer changes
- no conversation-thread model beyond the current notebook archives
