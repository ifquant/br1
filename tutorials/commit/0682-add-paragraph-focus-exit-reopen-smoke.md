# 0682 Add paragraph-focus exit/reopen smoke

## Why

The focused-reading helper already had coverage for the narrow rule that same-book paragraph reopen should keep the hidden excerpt captured before exit. What was missing was a real browser smoke that proves the product route and TXT viewport still honor that same-book reopen precedence after the reader surface progress has changed.

## What changed

- added a Playwright smoke in `tests/e2e/library-smoke.spec.ts` that opens paragraph focus on the TXT sample, exits the overlay, scrolls the plain-text surface until the reader's own progress changes, and then reopens paragraph focus
- made the smoke assert the core seam directly: after the TXT reader surface progress moves, the reopened overlay still shows the hidden same-book excerpt instead of switching away from it
- updated the alignment checklist so the P20 focused-reading series records this new real-browser paragraph continuity evidence explicitly

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader reopens paragraph focus on the hidden excerpt after exit in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product-code changes unless the real browser smoke exposed this exact exit-vs-live precedence bug
- no RSVP, TTS, translation, multi-book, or route-boundary expansion
- no new focused-reading controls or continuity redesign
- no claim that this slice proves a precise visible-paragraph drift contract beyond the progress-change and scroll-and-reopen precedence it now covers
