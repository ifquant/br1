# 0600 Retarget active TTS sessions when reading ownership changes

## Why this change exists

`P9` closed the reading-mode contract for translated TTS, but one runtime gap still remained:

- the notebook could switch back to the current reading source
- or switch between `朗读原文` and `朗读译文`
- while an active TTS session kept speaking the stale old target

That meant the workspace could describe one ownership state while the runtime was still reading another.

## What changed

- add a shared `planReaderTtsRetargetAction(...)` helper for active-session retarget decisions
- rewire the reader route so explicit TTS ownership changes restart or re-arm the session instead of only changing notebook state
- stop stale active TTS playback when the reader switches to a different book
- add focused TTS helper coverage for the new retarget policy

## Why this shape

This is the first `P10` slice, and it stays narrow on purpose.

The goal is not to build a richer speech engine yet. The goal is to make the existing TTS runtime stop lying when the user explicitly changes who owns the reading target.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no media-session integration
- no paragraph-level or sentence-level TTS segmentation
- no richer playback queue or relocation history
