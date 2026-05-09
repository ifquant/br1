# 0613 Let the mini TTS bar resume follow-current

## Why

`P11-1.6` closed the translated-provenance navigation hop on the collapsed reading surface, but one adjacent playback action still disappeared with the notebook: once the reader locked TTS to an older target, only the dedicated TTS workspace could restore `跟随当前阅读位置`.

That left the canvas mini bar with a partial control surface. It could still describe the locked playback state and the drifted playback location, but it could not directly clear that ownership lock.

## What changed

- Added a conditional `回到当前阅读位置` action to the in-reader TTS mini bar.
- Threaded that action through `ReaderStage` into the existing route-owned `resumeFollowingCurrentTtsTarget` flow.
- Scoped the new action to the collapsed playback surface so it does not duplicate the existing workspace-level ownership action while the notebook is already open.
- Extended the TXT/TTS smoke so a locked, drifted playback target can collapse to the canvas, restore follow-current from the mini bar, and clear both the drift affordance and the locked-state copy.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader uses visible plain-text excerpts as the source tts target in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new sentence-level playback controls or queueing behavior
- any new TTS runtime semantics beyond exposing the existing follow-current action on the collapsed canvas surface
