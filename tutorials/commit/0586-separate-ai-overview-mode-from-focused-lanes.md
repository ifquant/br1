# 0586 Separate AI overview mode from focused lanes

## Why this change exists

The AI notebook already had two meaningful states:

- `本书 AI 记录摘要`
- a focused lookup or translation lane

But the assistant still rendered those states together. That blurred the product contract because the overview was supposed to be the entry state, while the lane was supposed to be the drilled-in state.

This slice closes that mismatch by making overview mode and focused-lane mode mutually exclusive.

## What changed

- when `本书 AI 记录摘要` is visible, the focused lookup/translation lane no longer stays rendered underneath it
- add a lightweight overview-mode prompt that explains the reader must enter a lane to see lane navigation, current record, and history list
- extend the AI workspace and overview-to-lane smokes so they verify that overview mode hides the lane, and that returning from a lane restores overview mode instead of stacking both states
- record the slice in the Readest alignment checklist

## Why this shape

This is a notebook-state separation pass:

- no history storage changes
- no provider or replay changes
- no focused-lane navigation changes

The goal is only to stop rendering two notebook states at once.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can move from the ai archive overview into one lane and back again"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no history persistence or provider-layer changes
- no conversation-thread model beyond the current notebook archives
