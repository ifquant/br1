# 0676 Preserve focused-reading RSVP detour resume

## Why

Focused reading already let the reader switch the same excerpt between paragraph focus and RSVP-lite. But if the reader paused on word N, glanced at the paragraph, and switched back, RSVP-lite restarted from word 1. That broke the reading flow and made the paragraph detour feel like an accidental restart instead of a quick glance.

## What changed

- extended `src/lib/reader/readingMode.ts` so focused-reading state keeps an in-memory same-excerpt RSVP resume snapshot with the last word list, word index, and pace
- taught same-excerpt paragraph/RSVP mode switches to reuse that saved RSVP snapshot when it exists, while keeping the existing word-1 fallback when no prior RSVP state exists for the current excerpt
- kept explicit RSVP restart honest by resetting both the visible RSVP cursor and the saved same-excerpt return point back to word 1
- added helper coverage for same-excerpt paragraph detours and a focused web smoke that proves the reader returns to the saved RSVP position and pace after switching back

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader preserves same-excerpt rsvp position across paragraph detours in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no new persistence payload for paragraph-mode detours beyond the existing focused-reading state model
- no new locator semantics, next-excerpt navigation, or expanded PDF/CBZ focused-reading support
- no overlay-owned autoplay runtime; timer ownership remains in the reader route
