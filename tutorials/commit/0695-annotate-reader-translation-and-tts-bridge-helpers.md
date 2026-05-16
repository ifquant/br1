# 0695 Annotate reader translation and TTS bridge helpers

## Why

After the ownership, route-contract, and persistence-gate passes, the remaining newcomer-audit gap was not another pure helper. It was the small set of route helpers in `+page.svelte` that bridge those helper contracts back to live reader state.

Those functions decide how current preview context, current selection, translation fallback, translated-TTS owner, and notebook/route actions are assembled before the underlying helper modules run. The behavior was already correct, but the route intent was still too implicit.

## What changed

- annotated `resolveCurrentLiveTranslatedTtsResult` so it is clear that helper modules decide match rules, while the route supplies the active preview/location metadata that accepted translated results reuse
- annotated `resolveCurrentReaderTtsSpeechTarget` so it is clear this is the route-side packaging point for selection, preview, translation ownership, and translated provenance before shared TTS ownership helpers resolve the final target
- annotated `openTranslatedTtsWorkspace` so it is explicit that entering translated TTS is a coordinated route/notebook/ownership action rather than a single mode flag flip
- annotated `resolveReaderTranslationFallback` and `resolveReaderTranslationModeSource` so the fallback order and route-side source normalization stay readable
- annotated `requestAssistanceTranslation` so translation requests are visibly tied to the same fallback contract used by translation mode and archive replay
- annotated `selectAssistanceHistoryEntry` so the immediate `archive` translated-TTS ownership jump and route sync rule are easy to audit

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no product behavior changes
- no new tests or checklist rows; this is a comments-only auditability slice
- no broader assist/TTS feature refactor outside these route bridge helpers
