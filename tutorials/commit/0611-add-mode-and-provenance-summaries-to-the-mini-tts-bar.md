# 0611 Add mode and provenance summaries to the mini TTS bar

## Why

`P11-1.3` and `P11-1.4` made the in-reader mini bar durable enough to survive notebook collapse and translated waiting states, but it still spoke in half-sentences. On the reading canvas the bar could show `空闲 / 正文摘录 / 第 1 / 3 节` without clearly telling the reader whether that surface belonged to original-text playback, translated playback, or a translation-derived source.

This slice makes the mini bar state explicit without changing runtime behavior: the reader can now tell which playback mode is active and which source currently owns that playback surface.

## What changed

- Added a dedicated mode/provenance summary line to the in-reader TTS mini bar.
- Derived that summary from the existing route-owned TTS state: original-text playback reuses the current reading source, and translated playback reuses the current translation or archive provenance.
- Extended the focused reader smoke so the canvas bar proves both `原文朗读` and translated waiting/source context instead of only checking generic target/location text.
- Cleaned the `P11` checklist ledger by removing the stale duplicate `P11-1.4` placeholder while recording this new slice as `P11-1.5`.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader uses visible plain-text excerpts as the source tts target in web mode|reader can open tts mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new playback buttons, queueing, or runtime semantics
- any provider/runtime expansion outside the current TTS and translation source contracts
