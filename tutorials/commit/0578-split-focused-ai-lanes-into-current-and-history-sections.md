# 0578 Split focused AI lanes into current and history sections

## Why this change exists

The AI notebook already had stronger lane structure:

- overview cards
- focused lookup or translation lanes
- lane headers
- clearer action hierarchy

But once the reader entered a focused lane, the archive body still read like one continuous block. The active archived record and the history list were visually adjacent, but they were not yet named as separate notebook sections.

That made the workspace harder to extend. If later slices add thread-like browsing or richer archive navigation, they need stable section anchors instead of one undifferentiated archive body.

## What changed

- add an explicit `当前记录` subsection above the active archived-record summary when one record is selected
- add an explicit `历史记录列表` subsection above the archive list, collapsed copy, or empty-state copy
- give both subsections their own short summary line so the reader can tell what they are looking at before reading the record cards
- extend the focused AI lane smoke so it verifies the new subsection contract after selecting a record

## Why this shape

This slice stays strictly inside notebook structure:

- no archive persistence changes
- no provider or request behavior changes
- no new replay semantics

The goal is only to make the focused lane read like a notebook page with named subsections, not like one large mixed archive panel.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader shows notebook-style action hierarchy inside ai archive lanes"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browser
- no thread-style conversation model
- no changes to archive storage or selection persistence
