# 0630 Persist Current-Book Translation-Mode Ownership

## Why

Dedicated `翻译模式` already had explicit `跟随当前阅读位置` versus `锁定当前翻译目标` controls, but that ownership was still live-session state only. Reloading the same book could silently throw the mode back to follow-current, which made the reading-mode contract feel weaker than the UI suggested.

## What changed

- added current-book local persistence for translation-mode ownership in the reader page
- restore whether dedicated translation mode is following the live reading source or locked to a pinned source when the same book reloads
- restore the locked translation source text plus label/chapter context so the source panel and textbox stay honest after reload
- reset ownership when the book key changes, so one book's locked translation source does not leak into another book
- added a focused smoke that locks translation mode, replaces the source text, reloads, and verifies the same book restores the locked source before returning to follow-current

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation ownership for the same book across reload"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- route-owned pinned translation payloads
- pinned TTS target persistence
- cross-book translation ownership migration
