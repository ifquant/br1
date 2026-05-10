# 0623 Make dedicated translation and TTS modes URL-addressable

## Why

`翻译模式` and `朗读模式` had already become dedicated reader workspaces, but they were still local notebook toggles.

That left a real parity gap:
- direct route opens could not target a dedicated reading mode
- cross-mode jumps could change the notebook tab without updating the route
- reload could restore the wrong workspace contract unless local notebook state happened to match

This slice makes the dedicated translation and TTS modes behave like real route-owned reading states.

## What changed

- Added a `workspace=translation|tts` reader-route contract and helper for updating the current URL without disturbing the active book target.
- Rewired dedicated translation and TTS entry points to use the same notebook-tab helper, so opening those modes updates route state and switching back to non-dedicated tabs clears it.
- Added a focused smoke that proves route-open translation, translation-to-TTS jump, reload persistence, and clearing the query param when returning to a non-dedicated notebook tab.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores dedicated translation and tts modes from route state in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- route-addressable `笔记`, `AI`, or `同步` notebook states
- broader notebook persistence changes beyond the dedicated translation/TTS route contract
