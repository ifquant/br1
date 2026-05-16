# 0657 Extract Reader Maturity Route Coordination

## Why

P16-P18 added real reader maturity behavior, but the route had started to accumulate more precedence and reset logic inline. This slice extracts the pure coordination decisions into `src/lib/reader/maturityMode.ts` so `src/routes/reader/+page.svelte` can stay the coordinator instead of becoming the second home for route-policy details.

## Baseline

- `src/routes/reader/+page.svelte` line count before this slice: `2849`
- `src/routes/reader/+page.svelte` line count after this slice: `2853`

The line count did not drop yet because this task creates a new helper module and replaces inline branches conservatively instead of doing a wider route rewrite. The main improvement is ownership: the route now delegates the non-trivial coordination rules to a pure helper file with direct tests.

## What moved

- dedicated translation-route precedence now goes through `resolveReaderMaturityRouteTranslationConfig(...)`
  - this keeps `workspace=translation` as the only route state that may retune the shared translation provider/target-language config that inline translation also reuses
- annotation popup clearing on book-source changes now goes through `resolveReaderAnnotationPopupSelectionForBookChange(...)`
  - the route still owns selection events, but the pure helper documents that a source switch invalidates popup visibility derived from the prior book's selection
- playback queue retarget/reset now goes through `resolveReaderPlaybackQueueForEffectiveTtsTarget(...)`
  - the helper preserves rate and remaining timeout while rebuilding queue state when the effective TTS target changes

## What intentionally stayed route-owned

- Svelte navigation and URL sync
- current-book localStorage restore/persist
- viewport and notebook event handlers
- runtime TTS controller start/pause/resume/stop ownership

This is deliberate. The helper owns pure decisions only; the route still owns side effects and runtime wiring.

## Helper coverage

`src/lib/reader/maturityMode.test.ts` now covers:

- inline translation route state never overrides dedicated translation route state
- annotation popup visibility clears when the book source changes
- footnote popup state clears when control nonce changes
- playback queue state resets when effective TTS target changes

The footnote popup's live owner remains `ReaderStage.svelte`, but the same reset rule is now pinned in a pure helper test so the coordination contract stays explicit.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-maturity-mode-tests --noEmit false && node --test ./.tmp-maturity-mode-tests/src/lib/reader/maturityMode.test.js` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader exposes inline translation mode without replacing the notebook translation workspace|reader shows selection-near annotation actions in web mode"` (PASS)
- `wc -l /Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte` (`2853`)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)
