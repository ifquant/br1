# 0631 Persist Current-Book TTS Ownership

## Why

Dedicated `朗读模式` already exposed explicit `跟随当前阅读位置` versus `锁定当前朗读目标` ownership, but that state still disappeared on reload. The result was a reader surface that claimed it could lock a playback target, then quietly snapped back to follow-current as soon as the same book reloaded.

## What changed

- added current-book local persistence for TTS ownership in the reader page
- restore whether dedicated TTS is following the live reading source or locked to a pinned target when the same book reloads
- restore the pinned TTS target payload itself through the existing normalized `ReaderTtsSpeechTarget` boundary so the target text and playback-location summary stay honest after reload
- reset TTS ownership when the book key changes, so one book's pinned playback target does not leak into another book
- added a focused smoke that locks a TXT excerpt target, reloads, verifies the same book restores the locked TTS target, resumes follow-current, and then proves a different book does not inherit the earlier pinned target

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated tts ownership for the same book across reload"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- route-owned pinned TTS payloads
- translated-TTS-specific ownership recovery beyond the existing current-book target restore
- broader playback queueing or sentence-stepping behavior
