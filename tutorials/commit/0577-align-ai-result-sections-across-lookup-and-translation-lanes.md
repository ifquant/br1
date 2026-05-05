# 0577 Align AI result sections across lookup and translation lanes

## Why this change exists

The AI notebook already had better lane structure:

- overview cards
- focused lookup or translation lanes
- clearer lane headers and action hierarchy

But the result area inside those lanes still lagged behind. Lookup history restored into a mostly bare result body, while translation used a different card rhythm. That made the notebook feel structurally consistent at the lane level but inconsistent at the point where the reader actually reads the returned content.

This slice brings the result surfaces back into the same notebook cadence.

## What changed

- add an explicit `查找结果` header and summary line for lookup results, including restored history, loading, empty, offline, and error states
- promote lookup result titles into a dedicated result heading instead of treating the title as the section label
- rename the lookup link action to `打开词条来源` and group it under a small result-action row
- add structured `原文` / `译文` card headers for translation mode so both cards carry their own supporting summary
- update focused AI restore and translation-mode smoke expectations to match the new result-section contract

## Why this shape

This stays inside presentation hierarchy:

- no provider changes
- no archive-model changes
- no persistence changes
- no new AI thread semantics

The only goal is to make lookup and translation results feel like two variants of the same notebook workspace instead of two unrelated payload containers.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected ai history record for the current book in web mode|reader restores the selected translation ai history record for the current book in web mode|reader can open translation mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browser
- no redesign of provider or network behavior
- no thread-style conversation model beyond the current notebook archives
