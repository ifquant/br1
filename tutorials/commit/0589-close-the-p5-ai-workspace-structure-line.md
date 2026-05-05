# 0589 Close the P5 AI workspace structure line

## Why this change exists

`P5` accumulated a long chain of small AI workspace slices:

- notebook shell
- archive overview
- focused lane navigation
- translation-mode separation
- notebook-summary alignment

By this point, the main risk was no longer missing structure. The risk was losing track of what this line was actually supposed to close, and what still belonged to a later phase.

This slice records that boundary directly in the repo.

## What changed

- add a `P5-1.27` closeout row to the Readest alignment checklist
- add a `P5 Closeout` subsection that lists what is now considered included in this line
- explicitly list the ideas that are still out of scope, such as cross-book AI archive browsing and thread-style conversation history

## Why this shape

This is a closeout/documentation slice:

- no product behavior changes
- no storage changes
- no UI restructuring

The goal is only to make the next execution decision legible: continue polishing `P5`, or move to a new reader workspace mainline.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no thread-style conversation history
- no provider/network expansion beyond the current lookup/translation substrate
- no remote AI sync or cloud archive surface
