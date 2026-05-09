# 0610 Keep the mini TTS bar visible while translated audio is waiting

## Why

`P11-1.3` made the active TTS session visible on the reading canvas, but translated TTS still had one surface gap: if the reader switched to `朗读译文` before a translated body existed, the mini bar disappeared again. That hid the waiting state exactly when the user still needed a visible playback anchor and a direct way back into the TTS workspace.

This slice keeps the mini bar alive during translated waiting states and ties its waiting copy to the current translation-source context instead of collapsing back to the generic “no target” state.

## What changed

- Extended the shared mini-bar visibility helper so translated waiting states can keep the playback bar visible when a live or archived translation source already exists but no speakable translated body has been produced yet.
- Added a shared translated-waiting target label helper so route-owned mini-bar copy does not hand-roll `等待译文结果` formatting.
- Updated the route-owned mini-bar state so translated waiting mode keeps the canvas bar visible and names the active translation-source context.
- Tightened focused smoke coverage so the dedicated TTS flow proves the translated waiting state can survive notebook collapse and reopen from the mini bar.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new translated speech runtime or provider behavior
- queueing, sentence stepping, or richer playback controls
- new playback surfaces outside the existing canvas mini bar and dedicated TTS workspace
