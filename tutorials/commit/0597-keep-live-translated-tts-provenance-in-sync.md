## Why

`P9-1.5` made archive-backed translated TTS traceable, but the live path still had a reactive gap. If the reader switched to `朗读译文` without a selected archive and before any translation result existed, the TTS tab could still behave like it had no source at all, even though translation mode already knew which current reading source it was following.

This slice closes that live-path gap without expanding archive behavior or adding new TTS sources.

## What changed

1. The reader route now recomputes the translation-mode source with explicit reactive dependencies instead of relying on an implicit function read.
2. Dedicated translated TTS inherits that current reading source when it is still waiting for a translated result.
3. The TTS notebook summary now upgrades from `还没有可朗读目标` to `等待译文结果` on the live translated path.
4. Focused TTS smoke now proves both live waiting-source provenance and archive-backed translated-TTS provenance.

## Why this shape

This keeps the slice narrow and behavior-preserving:

- no new translation archive behavior
- no new TTS playback source kinds
- no TTS engine change
- no extra workspace mode

It only repairs the reactive contract so translated TTS stays aligned with the current reading source that translation mode already owns.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- new translated-TTS source kinds beyond the current reading source and selected archive
- richer live excerpt extraction for translated TTS
