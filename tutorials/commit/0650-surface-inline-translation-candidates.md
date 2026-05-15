# Surface Inline Translation Candidates

## Why This Slice Exists

Translation mode already had a notebook workspace, but it did not yet show that translation can become part of the reading surface itself. This slice adds the first inline translation UI without replacing the notebook workspace or moving provider requests into renderer-owned code.

## What Changed

- `ReaderViewport.svelte` now emits `inlinetranslationcandidates` after reader-state updates.
- Candidate extraction is deliberately conservative: TXT uses the visible plain-text excerpt, and Foliate-backed books use the same current chapter body excerpt already trusted for source TTS.
- `ReaderInlineTranslationLayer.svelte` renders the enabled state, source/translation visibility toggles, provider/language summary, block count, status, and waiting/unsupported copy.
- `+page.svelte` owns inline translation state and decides when viewport candidates become queued blocks.
- The notebook translation workspace remains visible and unchanged while the inline layer is enabled.

## Boundary Notes

This slice does not walk arbitrary iframe DOM. It does not call DeepL or Yandex from the reader viewport or the inline layer. It also does not insert translated DOM into Foliate content. Provider work still belongs behind the existing translation assistance service path.

PDF, CBZ, and unsupported formats emit no candidates and show capability/waiting copy until a later safe text-layer integration exists.

## Verification

Run before committing:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader exposes inline translation mode without replacing the notebook translation workspace"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```
