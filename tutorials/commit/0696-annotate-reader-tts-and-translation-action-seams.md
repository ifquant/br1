# 0696 Annotate reader TTS and translation action seams

## Why

After the helper-ownership, route-contract, and persistence-gate passes, the next remaining newcomer-audit gap was the route-side action seam where reader interactions actually mutate TTS and translation state.

The underlying helpers already explained ownership rules, but a newcomer still had to infer when a user action:

- only retargets the live TTS runtime
- changes persisted TTS ownership
- upgrades translated playback from `live` to `archive`
- must also sync route state because a translation or translated-TTS route-owning surface is active, or the notebook tab is still parked there

This slice keeps behavior unchanged and only makes those action seams explicit.

## What changed

- annotated `applyTtsRetarget` so it is clear that retargeting is a runtime handoff decision, not a persistence decision
- annotated `setTranslatedTtsOwner` so archive-vs-live ownership changes are visibly persisted as part of the current-book TTS bundle
- annotated `setTtsReadAloudTextMode` so source/translated switching reads as a coordinated route action: write the new mode, clean up stale pinned-current playback in local route state, retarget runtime, then sync route when TTS still owns the URL contract
- annotated `requestAssistanceTranslation` so translation requests visibly create history entries even for empty outcomes, keeping translation mode, archive replay, and translated-TTS ownership on one history contract
- annotated the translated branch of `selectAssistanceHistoryEntry` so it is clear why translation mode or translated TTS must sync `ta` when that route-owning surface is active or the notebook tab is still parked there

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no product behavior changes
- no new tests or checklist rows; this is a comments-only auditability slice
- no broader TTS or assistance refactor outside these route action seams
