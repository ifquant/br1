# 0598 Close the P9 reader reading-mode line

## Why this change exists

`P9` already had its last behavior slice:

- selected translation archives drive translated TTS
- archive provenance is visible inside dedicated TTS mode
- the live waiting path now follows the same current reading source as translation mode

At that point, the repo still needed one durable answer:

- what is now considered done enough to stop?
- what remains intentionally outside this line?

Without that boundary note, later `继续` work would have to guess whether `P9` was still open.

## What changed

- add a `P9-1.7` closeout-boundary row to the Readest alignment checklist
- add a `P9 Closeout` section that lists what is included in this reading-mode line
- record the larger TTS/translation expansions that are explicitly not part of `P9`

## Why this shape

This is a closeout-boundary slice:

- no reader behavior changes
- no TTS engine or translation workflow changes
- no new notebook controls

The goal is only to make the `P9` stopping point explicit inside the repo.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no paragraph-level or sentence-level TTS segmentation
- no new speech engines or provider expansion
- no cross-book translated-TTS archive browsing
- no remote/cloud TTS sync
