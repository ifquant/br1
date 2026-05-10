# 0616 Close the P11 reader playback-surface line

## Why

`P11` started as the next parity line after `P10` runtime productization: make the active TTS location and ownership recoverable from the reading surface itself, instead of forcing every recovery action back through the dedicated TTS workspace.

By `P11-1.9`, the collapsed mini bar had already absorbed the remaining high-value playback-surface actions:

- jump back to the active playback location
- jump straight into `翻译模式` from translated provenance
- restore follow-current ownership
- lock the current playback target
- switch between source and translated playback

At that point, continuing to cut more `P11` micro-slices would mostly turn into low-yield chrome tweaks instead of real parity closures.

## What changed

- Marked the `P11` playback-surface line as explicitly closed in the checklist.
- Recorded which playback-surface guarantees now count as shipped in this line.
- Recorded which larger playback/runtime ideas remain intentionally out of scope for the next mainline.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- any new reader or TTS behavior changes
- any sentence stepping, queueing, or broader runtime/product expansions
