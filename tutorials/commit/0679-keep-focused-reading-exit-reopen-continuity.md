# 0679 Keep focused-reading exit/reopen continuity

## Why

Focused reading already restored supported text excerpts across reload, but exiting the overlay still deleted that same-book state entirely. That meant a reader could leave focused reading, stay on the same book, reopen paragraph focus or RSVP-lite a moment later, and get whatever live excerpt the surface exposed now instead of the excerpt they had just been working through.

## What changed

- extended `src/lib/reader/readingMode.ts` so `exitReaderFocusedReading(...)` now returns an `off` state with a hidden same-book resume payload for supported text surfaces instead of wiping the excerpt immediately
- taught the focused-reading start helpers to prefer that hidden same-book payload on reopen, including restoring the saved RSVP word index and pace while forcing paused playback intent
- narrowed `src/routes/reader/+page.svelte` so fresh RSVP entry still autoplays, but reopening from the hidden exit payload stays paused because the route-owned timer was already torn down
- updated current-book persistence coverage and a focused Playwright smoke so empty `off` state still clears storage while exit/reopen on the same TXT book reopens the last excerpt with the saved cursor and pace

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader reopens the last focused-reading excerpt after exit in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no cross-book or cross-excerpt focused-reading continuity
- no PDF/CBZ focused-reading widening and no new locator contract
- no autoplay reconstruction when reopening after exit
