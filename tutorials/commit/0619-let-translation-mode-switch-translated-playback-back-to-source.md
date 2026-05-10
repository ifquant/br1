# 0619 Let translation mode switch translated playback back to source

## Why

`P12-1.1` closed one half of the cross-mode hop: once the reader was already in `翻译模式`, they could jump directly into `朗读模式` with `朗读译文` active.

The reverse edge was still missing. If translated playback was already active and the reader changed their mind, they still had to reopen `朗读模式` just to switch back to `朗读原文`. That left one unnecessary notebook detour inside the same translation-to-playback flow.

## What changed

- Added a `切换到朗读原文` action to the `翻译模式朗读去向` strip, but only when translated playback is currently active.
- Wired that action through the notebook's existing TTS mode setter instead of introducing a second translation-owned playback state.
- Kept the existing `在朗读模式中查看` behavior unchanged: it still exists to jump directly into translated playback when that cross-mode shortcut is the intent.
- Added a focused smoke that proves:
  - translation mode can still jump directly into translated TTS
  - translation mode can now switch translated playback back to source without leaving the translation workspace

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch translated playback back to source from translation mode in web mode|reader can jump from translation mode into translated tts in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new translated-TTS runtime behavior or provenance rules
- any change to the existing `在朗读模式中查看 -> 朗读译文` shortcut contract
