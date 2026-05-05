# 0583 Collapse focused AI navigation into one section

## Why this change exists

The focused AI lanes already had all the right navigation ingredients:

- breadcrumb
- browse summary
- grouped browse-position controls
- grouped browse-scope controls

But they still read like separate fragments stacked in one header. That made the notebook navigation contract harder to scan than it needed to be.

This slice closes that gap by turning those fragments into one explicit `浏览导航` section.

## What changed

- wrap the focused-lane breadcrumb, browse summary, and grouped browse controls inside one `浏览导航` notebook section
- add a section header summary so the top of the lane states the current position and, when relevant, the current browse scope
- extend the focused AI lane smoke so it verifies the new section contract before and after switching into `只看当前记录`
- record the slice in the Readest alignment checklist

## Why this shape

This is a presentation closeout for the focused-lane navigation surface:

- no archive persistence changes
- no replay or provider changes
- no new cross-book archive model

The goal is only to give the notebook navigation one stable top-level anchor instead of asking the reader to mentally combine several small UI blocks.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows notebook-style action hierarchy inside ai archive lanes"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no archive replay or provider-layer changes
- no conversation-thread model beyond the current notebook archives
