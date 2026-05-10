# 0615 Let the mini TTS bar switch between source and translated playback

## Why

`P11-1.8` finished the ownership controls on the collapsed mini bar, but one obvious playback action still lived only inside the dedicated TTS workspace: switching between `朗读原文` and `朗读译文`.

That meant the reader could already pause, stop, jump back to playback, lock the current target, and restore follow-current from the reading canvas, but still had to reopen the notebook just to flip the read-aloud mode.

## What changed

- Added a conditional mode-switch action to the in-reader TTS mini bar.
- Reused the existing route-owned `setTtsReadAloudTextMode(...)` path instead of creating a new playback flow.
- Kept the translated-mode action gated by real translated provenance so the collapsed surface does not offer `朗读译文` when there is no current live/archive translation source to read from.
- Extended the focused reader smokes so the collapsed mini bar can flip source/translated playback in both the translated waiting path and the archived translated path.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new translation persistence or archive-selection behavior
- any new playback runtime semantics beyond exposing the existing read-aloud mode toggle on the collapsed canvas surface
