# 0603: Prefer visible plain-text body excerpts for source TTS

## Why

Dedicated TTS runtime work had already fixed translated-language correctness and media-session projection, but source-side TXT playback still had an obvious quality gap: without an active selection, TTS fell from real content straight to chapter-title or book-title fallback. For plain text books that meant the notebook could honestly say "source reading mode" while the armed text was often just `纯文本` or the title line.

This slice keeps the change narrow and trustworthy. It only upgrades the plain-text viewport path, and it does **not** attempt unstable live-excerpt extraction for EPUB/PDF/Foliate surfaces yet.

## What changed

1. `ReaderPreviewState` now carries optional TTS-oriented source excerpt metadata.
2. `ReaderViewport.svelte` computes a stable visible-body excerpt for the plain-text engine:
   - skips heading-style first lines
   - skips `Section N` scaffold headings
   - collects a bounded visible-body snippet from the current scroll neighborhood
3. Source-side `resolveReaderTtsSpeechTargetForMode(...)` now prefers:
   - current selection
   - plain-text visible excerpt
   - chapter fallback
   - title fallback
4. The route passes the new preview excerpt fields into TTS target resolution.
5. Tests now lock both helper priority and the real TXT notebook contract.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader uses visible plain-text excerpts as the source tts target in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- No EPUB/PDF/Foliate live-excerpt extraction.
- No source-language pronunciation detection.
- No paragraph queueing or richer TTS transport changes.
