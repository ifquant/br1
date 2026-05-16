# 0683 Verify hidden focused-reading resume after exit/reload/reopen

## Why

The focused-reading line already had separate smoke evidence for reload restore and for same-book exit/reopen continuity, but this checklist slice needed the exact combined path. The risk was a hidden resume payload that looked correct in storage yet got lost once the overlay had been exited and the page reloaded before the reader manually reopened RSVP-lite.

## What changed

- added a focused Playwright smoke in `tests/e2e/library-smoke.spec.ts`
- the smoke uses the TXT sample only, builds a non-default RSVP state with a moved word index, faster pace, and paused playback, exits the overlay, reloads the page, and then manually reopens RSVP-lite from the reader menu
- made the assertions match the required continuity seam directly: the reopened overlay shows the same excerpt, restores the saved RSVP word index and pace, and stays paused instead of reconstructing autoplay
- updated the alignment checklist so P20 records this exit -> reload -> reopen evidence as its own narrow TXT-first certification row

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores hidden focused-reading resume after exit and reload in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product-code changes unless this exact smoke had exposed a real restore bug
- no EPUB or selection-precedence expansion
- no library restore, route-boundary refactor, or new focused-reading UI
- no PDF/CBZ widening or broader multi-book continuity claim
