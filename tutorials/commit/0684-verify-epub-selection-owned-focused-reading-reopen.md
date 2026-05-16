# 0684 Verify EPUB selection-owned focused reading across exit/reopen

## Why

The focused-reading continuity slices already covered TXT hidden-resume behavior, but they did not yet certify the EPUB-only case where a real Foliate text selection owns the excerpt. The risk was that exiting the overlay would leave behind a same-book resume payload that looked correct in helper tests, yet a manual reopen in the live EPUB reader could still lose that selection-owned excerpt once the original DOM selection disappeared.

## What changed

- added a focused Playwright smoke in `tests/e2e/library-smoke.spec.ts`
- the smoke creates a real EPUB selection inside the Foliate document, opens paragraph-focused reading from that selection-owned excerpt, and verifies the overlay surfaces it as `当前选区`
- after exit, the smoke clears the live DOM selection and moves the EPUB view to a different progress point before manually reopening paragraph focus
- made the assertions prove the hidden same-book selection-owned excerpt wins on reopen after live selection has been cleared and reader progress has moved, with the overlay source chip reading `当前选区` on both first open and reopen
- updated the alignment checklist so P20 records this EPUB-only selection-precedence seam as its own narrow certification row

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader reuses the exited epub selection-owned focused-reading excerpt on reopen in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product-code changes because the existing EPUB hidden-resume seam already behaved correctly in the live reader
- no exit -> reload -> reopen coverage in this slice
- no route-boundary refactor, Tauri reopen flow, or per-book dual-ownership expansion
- no broader TTS, translation, notebook, PDF, or CBZ assertions
- no claim that this slice proves a stronger visible-paragraph replacement contract beyond selection-clear plus progress-change reopen precedence
