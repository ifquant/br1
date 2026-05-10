# 0621 Close the P12 cross-mode playback navigation line

## Why

`P12` started as a narrow follow-on to the playback surfaces and runtime lines. Its purpose was not to invent new TTS behavior, but to close the remaining reader-facing navigation asymmetries between `翻译模式` and `朗读模式`.

By this point, that line has landed all three pieces it needed:

- direct jump from `翻译模式` into `朗读译文`
- direct recovery from translated playback back to `朗读原文` while staying in `翻译模式`
- explicit smoke coverage that the same strip can rebound back into translated playback again after that recovery

That is enough to treat `P12` itself as closed.

## What changed

- Marked `P12` as closed in the parity checklist.
- Recorded what counts as included in this line.
- Recorded what is intentionally out of scope, so future playback or notebook work does not get misfiled as unfinished `P12`.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no new TTS runtime or provenance behavior
- no new notebook or mini-bar controls
- no broader playback-history or media-session work
