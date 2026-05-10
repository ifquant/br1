# 0628 Close the P13 Reader Route-State Line

## Why

`P13` started as a compact route-state parity line for dedicated `翻译模式` and `朗读模式`. After routing workspace mode, TTS mode, translation target language, translation provider, and the selected archived translation, the remaining local states are no longer compact identifiers. They are payload-heavy reading targets such as pinned translation text or pinned TTS target text.

That means continuing to cut `P13` micro-slices would stop being “route-state parity” and start turning live reading content into URL state. This document records that boundary explicitly.

## What counts as shipped in P13

- dedicated `translation` and `tts` workspace modes are URL-addressable
- dedicated TTS read-aloud mode is route-owned
- dedicated translation target language is route-owned
- dedicated translation provider is route-owned
- the selected archived translation that drives translated-TTS provenance is route-owned

## What is intentionally not in P13

- pinned translation-source text or label in route state
- pinned TTS target text or label in route state
- broader notebook browse/view state beyond the selected translation archive
- arbitrary assistance history replay through URL payloads

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`
