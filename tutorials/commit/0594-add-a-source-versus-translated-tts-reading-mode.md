## Why

`P9-1.2` made dedicated TTS mode look like a real reader mode, but it still only knew how to speak source-side fallback text. That left translation mode and TTS mode disconnected even though they now live in the same notebook surface.

This slice adds the smallest real bridge: TTS can now stay on original text or switch to the current translated result.

## What changed

1. Reader settings now persist a `ttsReadAloudText` mode with `source` and `translated`.
2. The reader route now resolves TTS targets through a shared helper instead of hardcoding source-only fallback logic.
3. Dedicated `朗读模式` now exposes `朗读原文 / 朗读译文`.
4. When `朗读译文` is selected and there is no current translation result yet, TTS shows an explicit waiting state instead of silently falling back to source metadata.

## Why this shape

This stays commit-sized and within the existing `P9 reader reading-mode parity` line:

- no new TTS engine work
- no paragraph extraction rewrite
- no inline translation/TTS coupling inside the reading canvas

It only closes the most obvious product gap between dedicated translation mode and dedicated TTS mode.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- speaking paragraph excerpts from the live viewport
- speaking translated text automatically from history replay or remote providers beyond the current translation result
