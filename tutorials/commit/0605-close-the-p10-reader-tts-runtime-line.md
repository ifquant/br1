# 0605: Close the P10 reader TTS runtime line

## Why this change exists

`P10` already landed its last runtime slice:

- active session retargeting
- browser media session mirroring
- translated-runtime language carry
- TXT visible excerpt targeting
- EPUB metadata-language carry

At that point, the repo still needed one durable answer:

- what now counts as done enough to stop?
- what remains intentionally outside this runtime line?

Without that boundary note, later `继续` work would have to guess whether `P10` was still open.

## What changed

- add a `P10-1.6` closeout-boundary row to the Readest alignment checklist
- add a `P10 Closeout` section that lists what is included in this runtime line
- record the larger runtime expansions that are explicitly not part of `P10`

## Why this shape

This is a closeout-boundary slice:

- no reader behavior changes
- no TTS runtime logic changes
- no new notebook controls

The goal is only to make the `P10` stopping point explicit inside the repo.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no paragraph-level or sentence-level TTS segmentation
- no playback queue or queue-navigation work
- no unstable EPUB/PDF live-excerpt extraction
- no source-language guessing from arbitrary text
