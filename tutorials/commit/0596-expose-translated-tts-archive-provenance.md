## Why

`P9-1.4` made dedicated translated TTS consume the selected translation archive, but the TTS tab still looked like a blind playback surface. Once the reader switched into `朗读模式`, there was no explicit answer to “which translation record is this reading from?” and no direct way back to the translation workspace to inspect that record.

This slice closes that traceability gap without changing the playback engine or adding new archive persistence.

## What changed

1. The dedicated TTS workspace now shows a `译文来源` panel in translated mode.
2. When translated TTS is backed by a selected translation archive, that panel shows the archive context and original source excerpt.
3. The translated-TTS provenance panel exposes a direct `在翻译模式中查看` action.
4. Clicking that action reopens the existing translation workspace with the same selected translation record still active.

## Why this shape

This keeps the change inside the current `P9` reading-mode line:

- no new archive model
- no new TTS engine behavior
- no cross-book replay surface
- no new translation persistence

It only makes the archive-backed translated-TTS path legible and directly navigable from the TTS tab itself.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- live waiting-source provenance for translated TTS when there is no selected archive
- new translated-TTS playback sources beyond the already selected translation archive
