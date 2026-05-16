# 0686 Verify EPUB hidden focused-reading resume after exit/reload/reopen

## Why

The focused-reading line already had separate EPUB smoke evidence for selection-owned exit/reopen continuity and for human-readable overlay context on reopen, but it did not yet prove the combined reload hop in between. The risk was a hidden same-book resume payload that looked correct before reload yet failed to survive a real exit -> reload -> manual reopen path once the original Foliate DOM selection was gone.

## What changed

- extended the existing EPUB-focused Playwright smoke in `tests/e2e/library-smoke.spec.ts`
- kept the real Foliate selection-owned path: the smoke builds a live EPUB selection from fixture text, opens paragraph-focused reading from that selection, and captures the visible source/progress context from the first overlay open
- after exit, the smoke clears the live EPUB selection, moves reading progress, reloads the same book, and confirms the overlay stays closed until the reader manually reopens paragraph focus from the menu
- made the final assertions prove the hidden same-book payload survives reload: manual reopen still restores the same selection-owned excerpt, the same human-readable source chip, and the same progress percentage captured before exit
- updated the alignment checklist so P20 records this exact EPUB exit -> reload -> reopen seam as its own narrow certification row

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader reuses the exited epub selection-owned focused-reading excerpt after exit, reload, and reopen in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product-code changes because the existing EPUB hidden-resume path already behaved correctly in the live reader
- no claim that reload auto-reopens focused reading; the smoke proves the opposite and requires a manual reopen
- no cross-book continuity, dual-ownership, route refactor, or Tauri reopen expansion
- no broader TTS, translation, sidebar, PDF, or CBZ assertions
