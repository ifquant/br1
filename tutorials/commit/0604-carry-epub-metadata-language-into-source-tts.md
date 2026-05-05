# 0604: Carry EPUB metadata language into source-side TTS

## Why

`P10` already fixed translated-language playback and then improved source-side TXT target quality, but EPUB source playback still had a runtime mismatch: even when Foliate book metadata already declared a stable book language, source-side TTS continued to fall back to `navigator.language`.

This slice keeps the change narrow and reliable. It does **not** guess language from arbitrary content. It only reuses the language metadata that Foliate already exposes on the opened book document.

## What changed

1. `ReaderPreviewState` now carries `ttsSourceLanguage`.
2. `ReaderViewport.svelte` reads `book.metadata.language` for Foliate-backed books and puts the trimmed value onto preview state.
3. The reader route forwards that preview language into source-side TTS target resolution.
4. `resolveReaderTtsSpeechTargetForMode(...)` now applies source language to source-mode targets:
   - selected text
   - visible excerpt
   - chapter-title fallback
   - title fallback
5. Focused helper tests now lock both:
   - TXT excerpt targets still carry source language when known
   - EPUB chapter fallback can carry `book.metadata.language`

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- No source-language guessing from arbitrary text.
- No TXT or PDF language inference.
- No EPUB live-excerpt extraction beyond the already-landed TXT-only source-target improvement.
