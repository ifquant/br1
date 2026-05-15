# Add Focused Reading Mode Shell

## Why This Slice Exists

`br1` already had persisted focus aids, but it still lacked a temporary reading-mode shell for “read this excerpt differently right now.” This slice adds that explicit temporary mode without changing what the saved ruler and focus-aid settings mean.

## What Changed

- Added `src/lib/reader/readingMode.ts` plus `readingMode.test.ts` so paragraph focus and RSVP-lite can share one pure helper contract.
- Added `ReaderFocusedReadingOverlay.svelte` for the on-canvas temporary mode surface:
  - paragraph mode reuses the same reader typography variables as the main canvas
  - RSVP-lite shows one word at a time plus previous/next controls
  - unsupported formats or missing text show explicit capability copy
- Wired `ReaderHeaderBar.svelte`, `ReaderStage.svelte`, and `src/routes/reader/+page.svelte` so the route owns the temporary mode state while the header menu exposes entry actions near the existing reading-mode/focus-aid controls.
- Added a focused smoke that opens both paragraph focus and RSVP-lite in web mode.

## Boundary Notes

This is intentionally only a shell:

- no full Readest RSVP controller
- no saved RSVP stop position
- no temporary Foliate highlight injection
- no changes to persisted ruler/focus-aid settings semantics

The helper only consumes `ReaderPreviewState.ttsSourceText` and the current selection. It does not inspect DOM on its own.

## Verification

Run before committing:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-reading-mode-tests --noEmit false && node --test ./.tmp-reading-mode-tests/src/lib/reader/readingMode.test.js
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens paragraph focus and rsvp-lite reading modes in web mode"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```
