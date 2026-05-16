# 0677 Preserve focused-reading RSVP play/pause intent across same-excerpt detours

## Why

Focused reading already preserved the same-excerpt RSVP cursor and pace when the reader detoured into paragraph focus. But the route still auto-resumed RSVP whenever the reader switched back, even if the reader had explicitly paused first. That made a quick paragraph glance feel dishonest because the product forgot the reader's last in-session play/pause intent.

## What changed

- extended `src/lib/reader/readingMode.ts` so same-excerpt RSVP resume state also carries a transient play/pause intent alongside the saved word index and pace
- kept that intent in-memory only, so reload restore still does not claim it can rebuild a live autoplay timer from persistence
- updated `src/routes/reader/+page.svelte` to snapshot the reader's RSVP intent before switching to paragraph mode, then only restart autoplay on return when that saved intent says the reader had left RSVP playing
- added helper coverage plus a focused Playwright smoke that proves paused RSVP stays paused across same-excerpt paragraph detours while restart-from-word-1 still preserves the current play/pause intent

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader preserves same-excerpt rsvp play-pause intent across paragraph detours in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no reload-time autoplay restore, new locator semantics, or cross-excerpt resume behavior
- no persistence schema expansion for play/pause intent; this remains an in-session same-excerpt behavior only
- no PDF/CBZ focused-reading expansion and no move of autoplay timer ownership out of the route
