# 0624 Make dedicated TTS read-aloud mode route-addressable

## Why

`P13-1.1` made the dedicated `翻译模式` and `朗读模式` URL-addressable, but `workspace=tts` still did not say whether the reader should arrive in `朗读原文` or `朗读译文`.

That left a real route-state hole:
- direct `workspace=tts` loads still depended on persisted reader settings for the active read-aloud mode
- translation-to-TTS jumps could land in `朗读模式`, but the route did not encode that the target was specifically translated playback
- reloading a dedicated TTS URL could reproduce the wrong playback mode if local settings disagreed

This slice closes that gap by letting dedicated TTS route state carry the playback mode itself.

## What changed

- Extended the reader route contract so `workspace=tts` can also carry `tts=source|translated`.
- Rewired the reader page to apply route-owned TTS mode overrides before opening dedicated TTS, and to keep the URL in sync when the read-aloud mode changes while TTS is active.
- Added focused route-state smokes that prove translation-to-TTS jumps write `tts=translated`, direct `workspace=tts&tts=source` loads override persisted reader settings, reload preserves the encoded mode, and switching away from TTS clears the extra route state.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader restores dedicated tts read-aloud mode from route state in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- route-owned persistence for non-TTS reader settings
- broader playback session, queueing, or runtime semantics beyond the dedicated TTS mode contract
