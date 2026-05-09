# 0608 Add readable playback-location summaries to dedicated TTS mode

## Why

`P11-1.1` already made the active playback location recoverable after the reader drifted away from a locked TTS target, but the dedicated TTS surface still did not clearly explain where the current playback target lived. In practice that left the notebook and TTS tab relying on generic follow/locked wording even when chapter, location, and progress metadata were already available.

## What changed

- threaded readable playback-location metadata through `ReaderTtsSpeechTarget` and `ReaderTtsSessionState`
- propagated chapter/location/progress labels from the live reader preview and translated TTS source resolution paths
- updated the notebook TTS summary and dedicated TTS workspace to show a readable `朗读位置` summary
- added a translated waiting-state fallback so `朗读译文` can still show the current translation-source location before a translated body exists
- extended focused helper tests and focused TTS smoke coverage around the new summary contract

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- playback queueing, sentence stepping, or richer transport controls
- EPUB/PDF live excerpt extraction
- any reopening of the closed `P10` runtime line
