# 0627 Make dedicated translation archive selection route-addressable

## Why

`P13-1.4` made dedicated translation mode carry provider choice in the route, but the selected archived translation still lived in ambient current-book selection state.

That left one adjacent provenance gap inside the same dedicated translation and translated-TTS contract:
- direct `workspace=translation` links could not deterministically say which archived translation the notebook should reopen
- jumping from dedicated translation into translated TTS could preserve mode and provider, but still depended on local storage to recover the same archived translation source
- reload in translated TTS could land on the right route mode while losing the exact archived translation provenance that produced the current translated playback target

This slice closes that gap by letting dedicated translation mode and translated TTS carry the selected archived translation entry id in the route.

## What changed

- Extended the reader route contract so dedicated `翻译模式` and translated `朗读模式` can also carry `ta=<translation-history-entry-id>`.
- Rewired the reader page so an explicit route-owned translation archive selection overrides empty or divergent local storage selection, while leaving lookup history and non-dedicated notebook tabs out of scope.
- Synced translation-history selection changes, translation-to-TTS jumps, translated-TTS reload, and non-dedicated tab exits so the route preserves or clears `ta` in the same places that already own the dedicated playback mode contract.
- Added a focused smoke that seeds two translation history entries plus an empty persisted selection, opens a route that explicitly selects the second archive, verifies dedicated translation restoration, jumps into translated TTS, reloads, and confirms the same archived translation provenance stays active.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation archive selection from route state in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- route-owned lookup history selection
- broader notebook browse state, pinned translation-source state, or non-dedicated translation persistence beyond the explicit archived-translation provenance contract
