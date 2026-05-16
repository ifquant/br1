# P20-1.11: verify focused-reading per-book restore across TXT -> EPUB -> TXT

This slice certifies one narrow per-book restore contract for focused reading:
a TXT RSVP session can survive a TXT -> EPUB -> TXT switch without leaking its
overlay state into the settled EPUB leg. The main risk was silent state
leakage: a TXT book's focused-reading excerpt and RSVP progress could look
correct on reload, yet still bleed into a later EPUB open if the route forgot
to restore/reset by `readerBookKey`.

## What changed

- added a focused Playwright smoke in `tests/e2e/library-smoke.spec.ts`
- the smoke starts RSVP-lite on TXT book A, records excerpt/progress/pace state,
  opens EPUB book B as the intermediate supported-text switch, then returns to
  TXT book A
- the return leg proves that focused-reading mode, excerpt, word progress, and
  pace restore for book A, while the settled EPUB leg does not keep the TXT
  overlay open

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores focused reading per book after switching between txt and epub in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no new focused-reading modes, controls, or route-boundary refactor
- no PDF/CBZ widening and no broader cross-book workspace restore claims
- no claim that paragraph mode, EPUB-owned focused-reading state, or reverse
  EPUB -> TXT -> EPUB switching are certified by this slice
