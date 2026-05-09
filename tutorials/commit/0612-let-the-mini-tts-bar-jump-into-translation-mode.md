# 0612 Let the mini TTS bar jump into translation mode

## Why

`P11-1.5` made the in-reader TTS mini bar explicit about translated playback provenance, but it still left one extra hop on the collapsed reading surface. Once the notebook was closed, the canvas bar could tell the reader `等待当前翻译来源` or `历史译文 · DeepL`, but the only direct action was reopening the TTS workspace first.

This slice closes that gap without widening the runtime: when translated provenance already exists on the canvas, the reader can now jump straight into `翻译模式` from the mini bar and inspect the same source/archive context there.

## What changed

- Added a conditional `在翻译模式中查看` action to the in-reader TTS mini bar.
- Threaded that action through `ReaderStage` into the route-owned notebook navigation, so it opens `翻译模式` directly.
- Scoped the new action to the collapsed playback surface, instead of duplicating the same button while the notebook is already open.
- Extended the focused reader smoke to prove both paths:
  - translated waiting can collapse to the canvas and jump into `翻译模式`
  - translated archive playback can collapse to the canvas and reopen `翻译模式` with the selected archive still active

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab|reader lets translated tts mode consume the selected translation archive in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new translation history persistence or archive-selection semantics
- any new TTS runtime behavior beyond this playback-surface navigation shortcut
