# 0599 Record the P9 closeout review

## Why this change exists

`P9` already had its structural closeout note, but one practical question still remained:

- does the translated-TTS reading-mode line still hide a blocker?
- or is it actually stable enough to stop and move on?

Without a recorded review verdict, the checklist would still leave later `继续` work guessing whether more `P9` micro-slices were required.

## What changed

- add a `P9-1.8` closeout-review row to the Readest alignment checklist
- record the review verdict that the translated-TTS reading-mode line has no remaining structural blocker
- state that the next recommended step is a new reader workspace mainline instead of more `P9` micro-slices

## Why this shape

This is a review/closeout slice:

- no reader behavior changes
- no TTS or translation contract changes
- no new notebook controls

The goal is only to make the transition out of `P9` explicit and durable inside the repo.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no paragraph-level or sentence-level TTS segmentation
- no new speech engines, provider expansion, or playback queue work
- no cross-book translated-TTS archive browsing
- no remote/cloud TTS sync
