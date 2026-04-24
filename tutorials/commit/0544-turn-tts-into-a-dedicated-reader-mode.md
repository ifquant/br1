# 0544 Turn TTS Into A Dedicated Reader Mode

## Why

`br1` already had Web Speech based TTS controls, but they still lived as header transport buttons. That made朗读 look like a transient control, not a deliberate reading mode. This slice closes `P5-1.3` by giving TTS its own notebook workspace, explicit target/follow semantics, and focused regression coverage.

## What changed

- added a dedicated `朗读模式` notebook tab and toolbar entry in [`/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
- added [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderTtsWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderTtsWorkspace.svelte) so TTS now has a visible mode surface with target, follow-current, and session-state panels
- enriched [`/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.ts) and [`/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts) with explicit source/target/follow metadata plus helper exports, then locked them with [`/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.test.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.test.ts)
- added a focused smoke in [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) that verifies the dedicated TTS mode opens without depending on real audio playback

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open tts mode as a dedicated notebook tab"` PASS
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/reader/tts.test.ts` PASS
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` PASS

## Not included

- this slice still uses the existing Web Speech runtime; it does not introduce a new TTS engine or any Tauri-owned speech service
- this slice makes follow-current semantics explicit in the reader workspace, but it does not attempt full browser media-session integration or pane-specific playback ownership
