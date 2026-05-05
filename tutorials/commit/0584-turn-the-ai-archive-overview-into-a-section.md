# 0584 Turn the AI archive overview into a section

## Why this change exists

The focused lookup and translation lanes already read like notebook sections:

- explicit section headers
- stable summaries
- clear navigation anchors

But `本书 AI 记录摘要` still looked like a loose card grid. That made the entry side of the AI workspace feel flatter than the focused lanes it led into.

This slice closes that mismatch by turning the current-book archive overview into a real notebook section.

## What changed

- wrap `本书 AI 记录摘要` in an explicit section with its own section header
- add a total summary line that states how many lookup and translation records the current book already has
- give the overview cards a named entry area instead of leaving them as an unlabeled grid
- extend the overview-to-lane smoke so it verifies the new section contract before drilling into one lane
- record the slice in the Readest alignment checklist

## Why this shape

This is an overview-side structure pass:

- no history storage changes
- no lane navigation semantics changes
- no provider or replay changes

The goal is only to make the overview side of the AI workspace use the same notebook-section language as the focused lanes.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no archive replay or provider-layer changes
- no conversation-thread model beyond the current notebook archives
