## Why

`P9-1.3` let dedicated TTS switch between `原文` and `译文`, but translated mode still only knew how to consume the current live translation result. That left a continuity gap inside the notebook: a user could open an older translation record and read it on screen, but TTS translated mode still behaved as if no translated target existed.

This slice closes that gap without opening a larger excerpt or engine rewrite.

## What changed

1. The reader route now resolves translated TTS targets from the selected translation archive entry before falling back to the current live translation result.
2. Translated TTS source labels now distinguish `历史译文` from `当前译文`.
3. The focused AI lane no longer clears a valid persisted translation selection just because another lane is temporarily active during notebook restore.
4. TTS helper coverage now includes explicit archive-source labeling.
5. Focused TTS smoke now proves that a selected translation archive can become the translated read-aloud target without regressing the existing translation-archive restore contract.

## Why this shape

This stays within the existing P9 reading-mode line:

- no new notebook panel
- no inline translation work
- no viewport excerpt extraction
- no speech-engine expansion

It only fixes the most obvious continuity break between dedicated translation reading and dedicated translated TTS, plus the narrow restore bug that could wipe the selected translation archive before TTS had a chance to consume it.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader lets translated tts mode consume the selected translation archive in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- live paragraph/excerpt fallback for translation and TTS
- translated TTS replay from archive history beyond the currently selected translation record
- richer AI archive navigation or cross-book replay semantics
