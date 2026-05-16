# 0672 Add Reader RSVP-lite Controller

## Why

Focused reading could already open an RSVP-lite overlay, but it still behaved
like a static shell. Readers had to step word-by-word manually, there was no
visible speed control, and the route had not yet claimed the autoplay boundary
that decides when playback starts, pauses, resumes, or stops.

This slice turns RSVP-lite into a first real focused-reading controller on the
supported text surfaces without pretending PDF or CBZ have the same capability.

## What Changed

- Added pure RSVP-lite pace helpers in `readingMode.ts`, including readable
  default/min/max bounds, pace persistence, and explicit end-of-word-list
  clamping.
- Kept timer ownership in `src/routes/reader/+page.svelte`, where autoplay now
  starts when RSVP-lite opens, pauses/resumes without losing the current word,
  and stops at the final word instead of wrapping.
- Extended `ReaderFocusedReadingOverlay.svelte` with presentation-only autoplay
  and pace controls plus visible words-per-minute feedback.
- Threaded the new overlay callbacks through `ReaderStage.svelte` without moving
  focused-reading semantics into the stage component.
- Expanded helper coverage for pace clamping, old-payload backfill, and end-stop
  behavior, then updated the focused Playwright smoke to verify autoplay, pause,
  resume, pace changes, and the explicit PDF boundary.

## Ownership Boundary

The autoplay timer remains route-owned on purpose.

`readingMode.ts` owns:

- pace normalization
- word-index clamping
- the persisted RSVP state shape
- the pure “can this advance?” rule

`+page.svelte` owns:

- when autoplay starts
- when it pauses or resumes
- when the timer is created or cleared
- the decision to stop at the end of the current word list

The overlay only renders the state and emits callbacks.

## Capability Boundary

This slice stays honest about format support.

- TXT/EPUB-like text surfaces can autoplay RSVP-lite because the route already
  has a restorable text excerpt and word list.
- PDF and CBZ still do not expose a durable focused-reading text anchor here, so
  they continue to show capability copy instead of fake RSVP controls.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader can autoplay rsvp-lite with pause and pace controls in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
