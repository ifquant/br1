# 0618 Let translation mode jump directly into translated TTS

## Why

By the end of `P11`, the playback surface had become fairly symmetric from the TTS side: the collapsed mini bar and dedicated `朗读模式` could already jump into `翻译模式` whenever translated provenance mattered.

The reverse edge was still missing. Once the reader was already in `翻译模式`, there was no equally direct way back into `朗读模式` with `朗读译文` selected. That kept one unnecessary notebook detour in the middle of the translated-reading flow.

## What changed

- Added a playback-aware strip to `翻译模式` that explains how the current translation source relates to translated playback.
- Added a direct `在朗读模式中查看` action there.
- Wired that action through the notebook so it opens `朗读模式` and forces `朗读译文` using the existing mode-switch path.
- Added focused smoke coverage for both:
  - the live translation-mode source path
  - the archived translated provenance path

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can jump from translation mode into translated tts in web mode|reader lets translated tts mode consume the selected translation archive in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new translation history persistence or archive-selection behavior
- any new TTS runtime behavior beyond this cross-mode navigation shortcut
