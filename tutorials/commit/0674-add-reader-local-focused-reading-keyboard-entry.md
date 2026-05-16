# 0674 Add Reader-Local Focused-Reading Keyboard Entry

## Why

Focused reading could already open from the reader menu, and the overlay itself
already had its own keyboard transport once open. What was missing was the
first keyboard step for a hard-reading session: opening paragraph focus or
RSVP-lite straight from the reader surface without detouring through pointer
chrome.

This slice adds that entry point without widening the focused-reading boundary.

## What Changed

- Added reader-local `Shift+P` and `Shift+R` entry shortcuts inside
  `ReaderStage.svelte`, reusing the existing `onStartParagraphFocus` and
  `onStartRsvpLite` callbacks instead of creating a second controller path.
- Guarded the shortcut scope so it only fires while the reader route is mounted
  and focus still belongs to the reader shell or unfocused reader body.
- Exempted editable targets so note/search/text-entry flows do not accidentally
  launch focused reading while the user is typing.
- Added compact visible shortcut hints in `ReaderHeaderBar.svelte` and mirrored
  the same shortcut labels in the focused-reading menu entries.
- Extended the reader smoke coverage with
  `reader opens focused reading modes from keyboard in web mode`.

## Keyboard Boundary

The shortcut listener is route-local, not app-global.

`ReaderStage.svelte` now listens for the two entry shortcuts at window scope,
but only as a convenience for the mounted reader route:

- if focus is still on the route body before the user tabs into a specific
  control, the shortcuts work
- if focus is inside the reader shell, the shortcuts work
- if focus is inside an editable target, the shortcuts do nothing

That keeps the entry point local to the reader surface while still supporting a
keyboard-first session from initial page load.

## Capability Boundary

This slice intentionally does not change any deeper focused-reading ownership.

- the route still owns actual mode transitions
- the existing overlay still owns once-open keyboard transport and `Escape`
- no new persistence semantics were added
- no autoplay-resume behavior changed
- PDF and CBZ still rely on the same unsupported-capability copy instead of
  pretending the new shortcut creates text-mode support

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens focused reading modes from keyboard in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
