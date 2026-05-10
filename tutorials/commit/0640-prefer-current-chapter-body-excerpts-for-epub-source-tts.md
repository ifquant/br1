# 0640 Prefer Current Chapter Body Excerpts for EPUB Source TTS

## Why

`P10` already taught TXT source-side TTS to prefer visible body excerpts over scaffold labels, but EPUB/Foliate source playback still collapsed to chapter-title fallback too early. That made dedicated `朗读模式` feel less like a real reading surface whenever the book already exposed trustworthy chapter body text.

## What changed

- added Foliate-backed source excerpt extraction in [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) so reader preview state can hand source-side TTS real chapter body sentences before falling back to title-like scaffolding
- kept the TXT excerpt path untouched, so plain-text source playback still follows the existing visible-body contract from `P10`
- aligned the focused TTS smoke in [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) with the current translated-waiting copy and added an EPUB source-playback assertion that locks real body-text presence rather than a chapter-title-only fallback

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader uses current chapter body excerpts as the EPUB source tts target in web mode|reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- a hard guarantee that every preloaded Foliate renderer state strips every heading token out of the surfaced excerpt
- any new source excerpt extraction path for PDF or other non-Foliate reader engines
