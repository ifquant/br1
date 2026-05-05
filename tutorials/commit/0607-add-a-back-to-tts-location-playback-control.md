# 0607: Add a back-to-TTS-location playback control

## Why this change exists

`P10` closed the TTS runtime line, but one visible playback gap still remained after that closeout: once the reader locked a TTS target and then navigated elsewhere, the notebook could say what text was still armed, but it had no direct way to take the reader back to that playback location.

That made playback feel less recoverable than Readest’s TTS surface. The next step after `P10` needed to be a playback-surface slice, not more runtime plumbing.

## What changed

1. `ReaderTtsSpeechTarget` and `ReaderTtsSessionState` now keep navigation metadata alongside the existing label/source/follow fields.
2. Source-side and translated TTS target resolution now carry location metadata whenever the reader already knows it.
3. The reader route now compares the active TTS location against the current reading viewport and exposes `回到朗读位置` when they diverge.
4. The dedicated TTS workspace and notebook summary now surface this as an explicit playback-state contract instead of hiding it behind stale target text.
5. Focused helper tests and focused smoke now lock the TXT flow:
   - TTS targets preserve navigation metadata
   - a locked target can drift away from the current viewport
   - the reader can jump back to the active TTS location from the notebook

## Why this shape

This slice stays narrow on purpose:

- it does not reopen `P10`
- it does not add queueing or sentence stepping
- it does not depend on unstable EPUB/PDF live excerpt extraction

The goal is only to make the active playback location recoverable from the current notebook surface.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- No playback queue, voice/rate controls, or sentence stepping.
- No EPUB/PDF live excerpt extraction.
- No reopening of the `P10` runtime closeout boundary.
