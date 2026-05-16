# 0678 Persist focused-reading RSVP return state across paragraph-mode reloads

## Why

Focused reading already preserved the same-excerpt RSVP cursor, pace, and paused/play intent while the overlay stayed open. But if the reader reloaded while sitting in paragraph mode after detouring from RSVP-lite, persistence only remembered the visible paragraph state. Returning to RSVP-lite after reload therefore reset to word one, even though the product was still on the same book and exact same excerpt.

## What changed

- extended `src/lib/reader/readingMode.ts` so a persisted paragraph-mode focused-reading payload may also carry the hidden same-excerpt RSVP return cursor and pace for supported text surfaces
- restored that hidden RSVP return snapshot only for the same persisted excerpt, and always rebuilt it with paused intent so reload does not claim it can reconstruct a live autoplay timer
- added helper coverage plus a focused Playwright smoke proving the reader reloads back into paragraph mode, then switches to RSVP-lite on the same excerpt at the saved word and pace while remaining paused

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader preserves same-excerpt rsvp return state across paragraph-mode reloads in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no autoplay reload restore and no persisted "playing" intent
- no cross-excerpt or cross-book focused-reading semantics
- no PDF/CBZ focused-reading expansion and no new locator contract
