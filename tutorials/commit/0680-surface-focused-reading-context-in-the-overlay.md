# P20-1.10: surface focused-reading context in the overlay

## Why this slice exists

The focused-reading overlay already knew the current excerpt source and reading progress, but it presented that context mostly as one dense summary line. That made the mode feel harder to scan during real reading sessions, especially when the reader wanted quick reassurance about what excerpt they were looking at and how far into the book they were.

## What changed

- kept the existing focused-reading behavior and state contract intact
- turned the overlay's current excerpt context into small readable metadata chips for excerpt source and progress
- filtered raw restore locators such as `txt:...` and `epubcfi(...)` out of the primary overlay copy so the presentation stays reading-first instead of machine-first
- added a focused Playwright smoke that checks the overlay surfaces the richer context in web mode

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader focused-reading overlay shows chapter and progress context in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no change to focused-reading continuity, autoplay, or keyboard transport semantics
- no new PDF/CBZ focused-reading support
- no attempt to surface footer-only line or page labels that are not already part of the focused-reading overlay state
