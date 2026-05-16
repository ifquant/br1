# 0671 Persist Reader Focused Reading Resume

## Why

Focused reading already had two useful modes: paragraph focus and RSVP-lite. The
gap was continuity. If a reader entered RSVP-lite on a text book, advanced to a
word, then reloaded or reopened the same book, the overlay always reset to off.

This slice makes focused reading behave more like a reading mode for supported
text surfaces without widening the capability boundary to formats that do not
yet have a stable text anchor.

## What Changed

- Added a focused-reading persistence payload in `readingMode.ts`.
- Stored only the state that can be honestly restored: mode, format, visible
  source text, source/progress labels, RSVP words, and RSVP word index.
- Routed per-book storage through `currentBookPersistence.ts` alongside the
  existing current-book storage keys.
- Wired `+page.svelte` to restore focused reading during the current-book
  restore boundary and to persist state only after that same book has restored.
- Added helper coverage for supported RSVP round-trip, unsupported PDF/CBZ
  rejection, and stale RSVP index clamping.
- Added a Playwright smoke that opens RSVP-lite on the sample TXT book, advances
  one word, reloads, and verifies the same overlay position returns.

## Capability Boundary

The persisted anchor is the actual text segment shown in the focused-reading
overlay. That is appropriate for the supported text surfaces this first slice is
claiming, because the restored overlay can show the same user-visible segment
without asking the reader surface to recreate a DOM selection.

PDF and CBZ remain excluded. A PDF selection or CBZ presentation layer can expose
text-like data, but this code does not yet have a durable locator that proves the
same segment can be recovered later. The helper therefore drops those payloads
instead of pretending exact restore exists.

## What Stayed Put

The route still owns:

- `localStorage` access and storage timing
- book-switch restore sequencing
- focused-reading start/exit/word-step handlers
- the current preview and selection inputs
- the overlay component contract

The helper only normalizes, validates, serializes, and parses plain focused
reading state.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores focused reading position for supported text surfaces"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
