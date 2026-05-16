# 0673 Add Focused-Reading Overlay Keyboard Transport

## Why

Focused reading already had a route-owned RSVP-lite controller, but the overlay
still depended on pointer controls for everything except `Escape`. That made the
temporary focus layer feel slower than the rest of the reader and left its
keyboard boundary implicit.

This slice keeps the ownership model intact while making the overlay readable
and controllable from the keyboard when it owns focus.

## What Changed

- Extended `ReaderFocusedReadingOverlay.svelte` so `Escape` still exits from
  both modes, while RSVP-lite maps `Space`, `ArrowLeft`, `ArrowRight`,
  `ArrowUp`, and `ArrowDown` into the existing route callbacks.
- Added compact visible shortcut hints to the overlay so the product does not
  hide transport behavior behind undocumented keys.
- Kept paragraph-focus honest: it only advertises `Escape`, and it does not
  pretend to support RSVP-only playback or stepping controls.
- Updated the focused Playwright smoke to verify paragraph-mode exit, RSVP-lite
  keyboard pause/resume, stepping, pace changes, and the unchanged PDF
  capability copy.

## Ownership Boundary

The keyboard layer remains a view concern, not a new controller.

`ReaderFocusedReadingOverlay.svelte` owns:

- focus-time key handling
- preventing browser defaults only for keys the overlay actually consumes
- visible shortcut hints

`+page.svelte` still owns:

- RSVP autoplay timer lifecycle
- focused-reading mode transitions
- word stepping and pace updates
- all persistence and current-book restore behavior

The overlay only forwards keys into the route-owned actions it already receives.

## Capability Boundary

This slice intentionally does not widen focused-reading claims.

- RSVP-lite keyboard transport only runs while the overlay owns focus and only
  on supported text surfaces.
- Paragraph-focus still behaves like a static reading mode with `Escape`.
- PDF and CBZ still show capability copy instead of pretending they have
  transport-ready text playback.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader focused-reading overlay supports keyboard transport in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
