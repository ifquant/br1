# 0570 Group current-book AI history into notebook sections

## Why this change exists

The AI workspace already kept per-book lookup and translation history, but it still read like one flat activity lane. A reader had to switch modes first and only then discover whether the current book actually had lookup records, translation records, or both.

This slice adds a notebook-style summary layer. The workspace now tells the reader, up front, how much current-book history exists in each lane and what the latest lookup or translation record is before they drill into one active lane.

## What changed

- derive `lookupHistory` and `translationHistory` summaries from the existing shared assistance history
- render a new `本书 AI 记录摘要` section with one card for `查找记录` and one for `翻译记录`
- let each summary card switch the workspace into the matching lane
- add a focused smoke that seeds both lookup and translation history and verifies the section overview plus lane switching

## Why this shape

This keeps the current assistance model intact:

- no new provider or backend contract
- no new persistence model
- no cross-book archive layer

It only makes the current-book notebook more legible by separating “what history exists for this book?” from “which lane am I actively reading right now?”

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader groups current-book ai history into lookup and translation sections in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI notebook or thread browser
- no change to assistance provider/network behavior
- no redesign of translation mode or TTS mode
