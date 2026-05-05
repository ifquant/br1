# 0602 Carry translation target language into the speech runtime

## Why this change exists

After `P10-1.2`, dedicated TTS could project its session into the browser media session, but translated speech still had a correctness gap:

- the reader could choose the right translated text
- yet the speech runtime still defaulted to `navigator.language`

That meant translated TTS could speak the right content with the wrong locale.

## What changed

- extend the TTS speech-target contract with an optional speech-language tag
- carry `targetLanguage` from translation requests/history into translated TTS target resolution
- normalize common short language codes such as `zh` and `en` into runtime-friendly tags
- make the TTS controller prefer `target.lang` over the browser UI language when starting speech

## Why this shape

This slice stays narrow on explicit translation knowledge.

It does not try to guess the correct language for arbitrary source text. It only uses the translation target language that the reader workflow already knows, which makes translated TTS more correct without adding speculative language detection.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no automatic source-language detection for arbitrary book text
- no paragraph relocation or playback queue work
- no non-browser speech transport or richer voice-selection UI
