# 0690 Annotate reader translated-TTS ownership and derivation

## Why

The next newcomer-audit gap after `0689` was not the EPUB focused-reading guard anymore. It was the translated-TTS ownership path: the route, per-book restore, archived translation selection, live translation cache, translated-TTS snapshot, and collapsed mini-bar all participate, but for different reasons.

That code was already working. The problem was that a reader engineer had to infer too much policy from similarly named values such as `translationLiveSnapshot`, `translatedTtsLiveSnapshot`, `translatedTtsOwner`, and the route-driven translation/TTS mode state.

## What changed

- annotated `ttsOwnership.ts` so the translated-TTS precedence ladder is explicit:
  - fallback owner is chosen before storage restore from route/workspace context
  - route override only applies when dedicated translation/TTS routes explicitly own translated playback choice
  - TTS restore/persist works as one small bundle instead of unrelated scalar values
  - effective target resolution explains the follow-current vs pinned-target boundary
- annotated the translated-TTS derivation workflow in `ttsOwnership.ts`:
  - live translation results beat matching history entries, which beat persisted translated-TTS snapshot reuse
  - translation-panel snapshot and translated-TTS snapshot are parallel caches with different UI purposes
  - the mini-bar is a read-only summary of the settled playback inputs, not a second ownership source
- annotated the route reactive chain in `src/routes/reader/+page.svelte` so a newcomer can follow the intended order:
  - earlier route blocks settle translated owner choice and speech target
  - the annotated derivation block then updates translation snapshot families independently
  - downstream UI such as the mini-bar reads the settled state afterward

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no behavior change to translated playback, translation mode, or mini-bar actions
- no new tests or checklist rows; this is a comments-only auditability slice
- no broad route comment pass outside the translated-TTS ownership and derivation chain
