# 0668 Extract Reader Translation TTS Derivation

## Why

`src/routes/reader/+page.svelte` still open-coded the pure chain that connects
live translation state to translated-TTS state:

- compute the next live translation snapshot
- compute the translation panel result
- resolve whether the persisted live translation snapshot should be reused,
  replaced, or cleared
- derive the translated-TTS source provenance
- compute the next translated-TTS live snapshot

Those are reader-domain derivations. The route should still own persistence,
runtime state, and assignment timing, but it should not duplicate the snapshot
cache rules inline.

## What Moved

`src/lib/reader/ttsOwnership.ts` now exposes
`resolveReaderTranslationTtsDerivationState(...)`, which returns:

- `nextTranslationLiveSnapshot`
- `liveTranslationPanelResult`
- `resolvedTranslationLiveSnapshot`
- `translatedSourceState`
- `nextTranslatedTtsLiveSnapshot`

The helper reuses the existing translation snapshot helpers from
`translationOwnership.ts` and the existing translated-TTS source/snapshot helpers
from `ttsOwnership.ts`.

## What Stayed Route-Owned

- current preview ownership
- assistance state and assistance history ownership
- translated-TTS owner state
- current-book localStorage persistence for `translationLiveSnapshot`
- TTS ownership persistence for `translatedTtsLiveSnapshot`
- the `resolveCurrentLiveTranslatedTtsResult()` call site, because it depends on
  the route's current preview and location-label shaping

## Cache Semantics

There are two separate caches:

- The live translation snapshot backs the translation panel. It only stores
  source text, translated text, and provider label, and it is safe only while the
  active translation source still matches the cached source text.
- The translated-TTS snapshot backs speech. It carries additional provenance such
  as target language, chapter, location, progress, and href so spoken translated
  text can describe where it came from.

Keeping both caches in the same helper makes their relationship visible without
merging them into one state owner.

## Helper Coverage

`src/lib/reader/ttsOwnership.test.ts` now covers:

- live translation snapshot reuse and replacement through the extracted helper
- translated-TTS source derivation for archived translation state, including the
  rule that archive ownership clears live translated-TTS snapshots

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader tts workspace exposes mature playback controls in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

