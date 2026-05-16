# 0669 Extract Reader Current-Book Persist Gates

## Why

The reader route restores current-book state after it first renders with defaults.
Without guard checks, those default values can write back to localStorage before
the matching book has finished restoring and accidentally clobber persisted
translation or TTS state.

This slice moves those pure guard predicates into
`src/lib/reader/currentBookPersistence.ts` while keeping every storage write in
`src/routes/reader/+page.svelte`.

## What Moved

New helpers:

- `canPersistReaderCurrentBookTranslationLiveSnapshot(...)`
- `canPersistReaderCurrentBookTranslationModeConfig(...)`
- `canPersistReaderCurrentBookTtsOwnershipState(...)`

The TTS gate checks all related restored-key families together:

- TTS ownership
- read-aloud mode
- translated owner
- translated live snapshot

## What Stayed Route-Owned

- `localStorage` availability checks
- `getReaderStorage()`
- calls to `persistReaderCurrentBookTranslationLiveSnapshot(...)`
- calls to `persistReaderCurrentBookTranslationModeConfig(...)`
- calls to `persistCurrentBookTtsOwnershipState()`
- reactive timing and assignment ownership

## Helper Coverage

`src/lib/reader/maturityMode.test.ts` now covers:

- same-book restored keys allow translation persistence
- missing or other-book restored keys block translation persistence
- TTS persistence requires every restored TTS key family to match the active
  book key

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

