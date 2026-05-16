# 0688 Narrow the EPUB paragraph-focus latch into a one-shot guard

## Why

`0687` fixed the positive EPUB menu-focus race by keeping the last non-empty route selection around after the live Foliate selection disappeared. That solved the immediate launch gap, but the route-owned latch still behaved too much like a same-book cache: once an EPUB selection had been captured, later paragraph-focus launches in the same book could keep reusing it even after unrelated navigation or other same-book interaction.

This follow-up keeps the race fix route-owned, but makes the boundary explicit and short-lived. The route now stages the latest live EPUB selection only until it clears, arms a one-shot guard for the next shared focused-reading launch, and clears that guard again after launch or after explicit same-book primary navigation controls.

The remaining hole was another EPUB timing seam: same-book navigation could clear the route guard first, but a slightly later `selectionchange(null)` from Foliate could rebuild the guard from `previousSelection` and bring the stale excerpt back. This slice closes that seam with an explicit sticky suppression boundary instead of a timing guess.

## What changed

- replaced the unbounded `lastNonEmptyReaderSelection` route latch with an explicit `focusedReadingLaunchSelectionGuard`
- added pure maturity helpers that:
  - stage the latest live EPUB selection while it still exists
  - arm the guard when that EPUB selection clears
  - consume and clear the guard on the next focused-reading launch
  - clear the guard on book switches and same-book primary navigation control requests such as `prev`, `next`, `start`, `href`, and `fraction`
- added a route-boundary suppression bit plus helper resolutions so same-book navigation can keep the stale guard cleared even if Foliate reports the selection clear slightly later
- updated the route-owned primary control dispatcher so direct `href` / primary-navigation helpers pass through the same guard-clearing boundary instead of relying only on `on:controlrequest`
- updated the route-owned EPUB `selectionchange` handler so a delayed `selectionchange(null)` cannot re-arm the guard after same-book navigation, while a fresh live selection still clears the suppression and stages the new excerpt normally
- updated the route-owned focused-reading input builder so every launch explicitly consumes or clears the guard instead of letting it survive as a same-book cache
- kept beginner-friendly comments around the non-obvious ownership boundary so a new contributor can see why this state stays in the route
- added helper coverage for the delayed-clear suppression boundary plus the existing one-shot arm/consume/clear semantics across `prev`, `next`, `start`, `href`, and `fraction`
- added focused web smoke proving both the positive menu-clear race and the delayed same-book navigation clear race

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && rm -rf .tmp-reader-helper-tests && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-reader-helper-tests --noEmit false && node --test ./.tmp-reader-helper-tests/src/lib/reader/readingMode.test.js --test-name-pattern "focused-reading route keeps the menu-triggered epub clear path armed for one launch|focused-reading route suppresses delayed epub selection clears after same-book navigation|focused-reading route clears delayed-clear suppression when another book opens" && rm -rf .tmp-reader-helper-tests`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --grep "reader latches the last epub selection before menu-triggered paragraph focus in web mode|reader does not re-arm the epub paragraph-focus guard after same-book navigation delays the live selection clear in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no TTS, translation, sidebar, or broader reader-route refactor
- no change to hidden focused-reading reopen ownership; same-book reopen still comes from `focusedReadingState`, not from this guard
- no new PDF, CBZ, or other non-EPUB paragraph-focus fallback behavior
