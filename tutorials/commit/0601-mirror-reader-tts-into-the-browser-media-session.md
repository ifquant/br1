# 0601 Mirror reader TTS into the browser media session

## Why this change exists

After `P10-1.1`, the reader no longer lied about active TTS ownership changes inside its own notebook.

But there was still one clear runtime gap:

- the browser/system media session still knew nothing about the current reader TTS target
- play/pause/stop controls outside the notebook were not connected to the current reader speech session

That meant dedicated TTS was now internally coherent, but still disconnected from the browser-owned playback surface.

## What changed

- extend the Web Speech runtime with a browser Media Session sync path
- mirror current TTS title/source/status into media metadata and playback state
- wire media-session `play` / `pause` / `stop` handlers back into the reader TTS controller
- add runtime-focused tests for metadata clearing and handler installation

## Why this shape

This slice keeps `P10` on runtime behavior instead of reopening notebook presentation.

The goal is not to invent a richer playback engine yet. The goal is to make the existing browser-owned TTS session visible and controllable through the browser media session when that capability exists.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-tts-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-tts-tests --noEmit false && perl -0pi -e "s#from './tts';#from './tts.js';#g; s#from './ttsRuntime';#from './ttsRuntime.js';#g" ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/tts.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js && node --test ./.tmp-tts-tests/src/lib/reader/tts.test.js ./.tmp-tts-tests/src/lib/reader/ttsRuntime.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no paragraph-level relocation or live excerpt segmentation
- no playback queue or chapter-jump controls
- no non-browser speech transport or remote playback integration
