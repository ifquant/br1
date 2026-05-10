# 0620 Lock the translation-to-TTS rebound hop

## Why

`P12-1.1` and `P12-1.2` already shipped the two user-visible controls on the `翻译模式朗读去向` strip:

- jump directly into `朗读译文`
- switch translated playback back to `朗读原文`

What still was not explicitly locked was the rebound hop after that recovery. Once the reader had already switched playback back to source, the tests stopped before proving that the same strip could still send them back into translated TTS again.

That was no longer a runtime gap. It was a contract gap in coverage.

## What changed

- Extended the focused `translation mode -> TTS` smoke instead of touching broader reader or playback tests.
- The smoke now proves the full rebound chain:
  - `翻译模式` jumps into `朗读译文`
  - `翻译模式` switches playback back to `朗读原文`
  - the same `在朗读模式中查看` action remains visible
  - clicking it again returns the reader to `朗读译文`
- Updated the parity checklist so this hardening slice is recorded as part of `P12`.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can switch translated playback back to source from translation mode in web mode|reader can jump from translation mode into translated tts in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no runtime changes to TTS mode switching
- no new notebook or mini-bar playback controls
