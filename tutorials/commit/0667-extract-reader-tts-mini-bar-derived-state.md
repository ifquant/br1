# 0667 Extract Reader TTS Mini-Bar Derived State

## Why

The reader route still owned a long reactive cluster for the collapsed TTS
mini-bar: visibility, status labels, context summaries, target fallback labels,
location summaries, primary action labels, and button capabilities. Those values
are pure reader-domain derivations, while the route should stay focused on
runtime ownership and navigation.

This slice moves that display/action bundle into `src/lib/reader/ttsOwnership.ts`
as `resolveReaderTtsMiniBarState(...)` and exports it through the reader helper
barrel for the route. It also promotes `ttsOwnership.test.ts` into the normal
`test:reader-helpers` harness so this contract no longer depends on an ad hoc
one-off test command.

## What Moved

`resolveReaderTtsMiniBarState(...)` now returns:

- `visible`
- `statusLabel`
- `contextSummary`
- `targetLabel`
- `locationSummary`
- `primaryActionLabel`
- `canRunPrimaryAction`
- `canStop`
- `canOpenTranslationMode`
- `canResumeFollowingCurrent`
- `canPinCurrentTarget`
- `canSwitchMode`
- `modeSwitchLabel`

The helper reuses the existing mini-bar summary, waiting-label, visibility, and
TTS label helpers instead of duplicating their lower-level semantics.

## What Stayed Route-Owned

- `ttsController.start/pause/resume/stop`
- route sync and workspace URL updates
- `notebookVisible` / `notebookTab` ownership
- `effectiveTtsTarget` ownership
- `translatedTtsSourceKind`, `translatedTtsSourceContextLabel`, and
  `translatedTtsSourceText` ownership
- assignment of the helper output into the props passed to `ReaderStage`

## Behavior Notes

Translated mode has one special waiting state: the mini-bar may be visible and
able to open translation mode even before it has runnable translated speech.
That happens when the route knows there is live/archive translation provenance,
but no translated text has arrived yet.

Follow-current and pinned-target controls are mutually shaped by route-owned TTS
ownership. When following current location, the collapsed mini-bar can pin the
current target. When already pinned, it can resume following current location.

## Helper Coverage

`src/lib/reader/ttsOwnership.test.ts` now directly covers:

- translated waiting state: visible mini-bar, waiting target label, translation
  workspace action, and disabled primary speech action
- follow-current vs pinned-target capability state: pin current target while
  following, resume following while pinned

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader tts workspace exposes mature playback controls in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
