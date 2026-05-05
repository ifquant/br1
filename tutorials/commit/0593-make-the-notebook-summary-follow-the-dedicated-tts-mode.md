## Why

`P9-1.1` gave translation mode a real reading-mode ownership contract, but `朗读模式` still stopped at "can open the tab". The notebook summary kept falling back to the generic notes/highlights copy, and pinned TTS targets could survive a book switch even though they belonged to the previous reading session.

This slice closes that smaller but real gap before we expand TTS capability itself.

## What changed

1. The reader route now resets pinned TTS targets when `readerBookKey` changes.
2. The notebook summary now follows the dedicated `朗读模式` tab instead of reusing the generic notebook summary.
3. The focused TTS smoke now proves `锁定当前朗读目标 -> 回到当前阅读位置` instead of only checking that the tab opens.

## Why this shape

This stays on the `P9 reader reading-mode parity` line. It does not try to add translated-text TTS or a richer speech pipeline yet. It only makes the existing TTS mode behave like a real reader mode with current-book ownership and notebook-aware chrome.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- reading translated text aloud
- paragraph/excerpt extraction changes for TTS targets
