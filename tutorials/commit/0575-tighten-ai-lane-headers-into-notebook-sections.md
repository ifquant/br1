# 0575 Tighten AI lane headers into notebook sections

## Why this change exists

The AI workspace already had a two-level structure:

- a current-book archive overview
- one focused lookup or translation lane

But once the reader entered a lane, the lane header still leaned on generic labels like `最近翻译` or `最近求助`. That left too much of the section meaning implied by the previous overview state and by nearby action buttons.

This slice makes the focused lane self-describing. The lane header now states which current-book section the reader is in and how many records that section currently contains.

## What changed

- promote the focused lane title to `本书查找记录` / `本书翻译记录`
- add a lane-header summary line like `当前书 1 条翻译记录`
- keep the explanatory notebook copy below that summary so the section has a clear title, current state, and supporting note
- extend the existing overview-to-lane smoke so it verifies the focused translation lane header contract, not just the navigation path

## Why this shape

This stays fully inside the current notebook presentation layer:

- no new persistence
- no new provider/backend behavior
- no cross-book archive browser

It only fixes hierarchy. After the reader drills down, the lane should explain itself without relying on the previous overview cards still being visible.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can move from the ai archive overview into one lane and back again"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no persisted overview-vs-lane navigation state
- no cross-book AI archive browser
- no redesign of the AI provider/conversation model
