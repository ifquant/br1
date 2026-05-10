# 0614 Let the mini TTS bar lock the current playback target

## Why

`P11-1.7` gave the collapsed reading-canvas mini bar the ability to restore follow-current semantics, but the ownership controls were still asymmetric. If the reader stayed in follow-current mode and wanted to freeze the current TTS target, they still had to reopen the dedicated TTS workspace just to press `锁定当前朗读目标`.

That extra reopen step no longer matched the rest of the mini-bar playback surface, which already exposed pause/resume, stop, relocation, translated provenance navigation, and follow-current recovery.

## What changed

- Added a conditional `锁定当前朗读目标` action to the in-reader TTS mini bar.
- Threaded the new action through `ReaderStage` into the existing route-owned `pinCurrentTtsTarget` flow.
- Extended the focused TXT/TTS smoke so the reader can collapse the notebook while still following the live reading position, lock the current target from the mini bar, and then continue through the existing drift/recover flow.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader uses visible plain-text excerpts as the source tts target in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new TTS runtime, sentence stepping, or queueing behavior
- any new ownership semantics beyond surfacing the existing lock action on the collapsed canvas surface
