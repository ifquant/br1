# 0692 Annotate reader focused-reading selection guard

## Why

The next highest-risk auditability hotspot after the translation ownership pass was the focused-reading EPUB selection guard in `maturityMode.ts`. The implementation was already correct, but a newcomer still had to reconstruct a small state machine from scattered helper names:

- live EPUB selection
- staged guard (`armed: false`)
- one-shot armed guard (`armed: true`)
- consumed or cleared guard
- delayed-null rearm suppression after same-book navigation

This slice keeps behavior unchanged and only makes that guard lifecycle explicit.

## What changed

- annotated `consumeReaderFocusedReadingLaunchSelection` so it is clear that:
  - live selections win first
  - the guard is only a fallback for the narrow EPUB paragraph-focus race
  - paragraph focus may reuse the vanished selection once, while RSVP and other flows may not
- annotated `resolveReaderFocusedReadingLaunchSelectionGuardForSelectionChange` so a delayed null selection is readable as a transition from staged excerpt to armed one-shot guard rather than a generic cache
- annotated the control-request and selection-boundary helpers so it is explicit why navigation-like requests:
  - clear the staged/armed guard
  - clear the live EPUB selection
  - set the sticky suppression bit that blocks a later delayed null event from rearming the guard
- annotated the book-change boundary so it is explicit why book switches clear more aggressively than same-book navigation
- added one route-side note in `+page.svelte` showing that the route consumes the guard helper’s result immediately instead of letting the vanished EPUB excerpt survive beyond the current launch

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no behavior change to focused-reading launch or EPUB selection handling
- no new tests or checklist rows; this is a comments-only auditability slice
- no broader route comment pass beyond the focused-reading selection-guard boundary
