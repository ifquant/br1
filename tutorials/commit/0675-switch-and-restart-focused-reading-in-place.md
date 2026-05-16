# 0675 Switch And Restart Focused Reading In Place

## Why

The first focused-reading slices could open paragraph focus or RSVP-lite and
could even restore the same excerpt after a reload, but once the overlay was
open the reader still had an awkward gap: switching modes or replaying the same
excerpt meant closing the overlay and opening it again from the menu.

That broke the "stay with this exact excerpt" feel that focused reading is
supposed to create.

This slice closes that gap without widening the excerpt boundary.

## What Changed

- Added pure same-excerpt helpers in `src/lib/reader/readingMode.ts` so the
  current overlay excerpt can switch between paragraph focus and RSVP-lite
  without requesting a new preview/selection from the reader surface.
- Added a pure RSVP restart helper that resets the current excerpt to word 1
  while preserving the same excerpt text, progress metadata, and visible pace.
- Re-exported the new helpers through `src/lib/reader/index.ts` so the route
  can keep owning mode transitions without duplicating focused-reading policy.
- Added overlay-visible actions in
  `src/lib/components/reader/ReaderFocusedReadingOverlay.svelte` for:
  - switch to RSVP-lite from paragraph focus
  - switch back to paragraph focus from RSVP-lite
  - restart the current RSVP excerpt from word 1
- Kept `ReaderStage.svelte` presentation-only by threading the new callbacks
  through the existing overlay component boundary.
- Updated `src/routes/reader/+page.svelte` so the route remains the only owner
  of autoplay side effects:
  - leaving RSVP stops autoplay
  - switching into RSVP on the same excerpt starts autoplay like the existing
    open-RSVP entry flow
  - restarting RSVP only keeps autoplay running if that excerpt was already
    playing before the restart
- Extended helper coverage and the web smoke coverage with
  `reader can switch focused-reading modes on the same excerpt in web mode`.

## Same-Excerpt Boundary

The important behavior change is what this slice does **not** do.

Once the focused-reading overlay is open, the switch/restart actions do not ask
the viewport for a new paragraph, a new DOM selection, or a "next excerpt".
They only transform the excerpt that is already inside the overlay state.

That keeps the product contract honest:

- no invented next-excerpt navigation
- no new locator semantics
- no new PDF or CBZ support claim
- no duplicate autoplay owner outside the route

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader can switch focused-reading modes on the same excerpt in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
