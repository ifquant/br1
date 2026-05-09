# 0609 Add a persistent in-reader TTS mini playback bar

## Why

`P11-1.2` made dedicated `朗读模式` explain where playback is anchored, but the playback surface still disappeared once the notebook closed. That left the reader with a correct TTS contract that was trapped behind the workspace.

This slice projects the active TTS session back onto the reading canvas itself. The reader can now see the current playback target, reopen the TTS workspace, pause/resume, stop, and jump back to the playback location without reopening the notebook first.

## What changed

- Added `ReaderTtsMiniBar.svelte` and rendered it on the primary `ReaderStage`, not inside the notebook, so playback remains visible on the reading canvas.
- Reused the existing route-owned TTS state and actions for the mini bar instead of introducing a second playback state machine.
- Added shared helper coverage for mini-bar visibility, compact playback-location summaries, and playback-drift detection when raw progress locators differ but the user-visible reading location is already aligned again.
- Tightened the focused smoke so it checks the persistent bar, TTS workspace reopening from the bar, and drift relocation from the bar against the real notebook close/collapse contract.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- queueing, sentence stepping, or any other new speech-runtime behavior
- EPUB/PDF/Foliate live excerpt extraction beyond the existing source-side target contract
- any new playback surface outside the primary reader stage
