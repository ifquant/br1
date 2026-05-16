# 0688 Narrow the EPUB paragraph-focus latch into a one-shot guard

## Why

`0687` fixed the positive EPUB menu-focus race by keeping the last non-empty route selection around after the live Foliate selection disappeared. That solved the immediate launch gap, but the route-owned latch still behaved too much like a same-book cache: once an EPUB selection had been captured, later paragraph-focus launches in the same book could keep reusing it even after unrelated navigation or other same-book interaction.

This follow-up keeps the race fix route-owned, but makes the boundary explicit and short-lived. The route now stages the latest live EPUB selection only until it clears, arms a one-shot guard for the next shared focused-reading launch, and clears that guard again after launch or after explicit same-book navigation controls.

## What changed

- replaced the unbounded `lastNonEmptyReaderSelection` route latch with an explicit `focusedReadingLaunchSelectionGuard`
- added pure maturity helpers that:
  - stage the latest live EPUB selection while it still exists
  - arm the guard when that EPUB selection clears
  - consume and clear the guard on the next focused-reading launch
  - clear the guard on book switches and same-book navigation control requests
- updated the route-owned focused-reading input builder so every launch explicitly consumes or clears the guard instead of letting it survive as a same-book cache
- kept beginner-friendly comments around the non-obvious ownership boundary so a new contributor can see why this state stays in the route
- added helper coverage for arm/consume/clear semantics and a focused web smoke proving the positive menu-clear race still works while same-book navigation controls no longer leave the stale selection guard behind

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-reader-helper-tests && pnpm exec tsc -p tsconfig.json --outDir .tmp-reader-helper-tests --noEmit false && node --test ./.tmp-reader-helper-tests/src/lib/reader/readingMode.test.js && rm -rf .tmp-reader-helper-tests`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader latches the last epub selection before menu-triggered paragraph focus in web mode|reader clears the armed epub paragraph-focus guard after same-book navigation controls in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no TTS, translation, sidebar, or broader reader-route refactor
- no change to hidden focused-reading reopen ownership; same-book reopen still comes from `focusedReadingState`, not from this guard
- no new PDF, CBZ, or other non-EPUB paragraph-focus fallback behavior
