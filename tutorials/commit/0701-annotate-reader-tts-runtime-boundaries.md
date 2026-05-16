# 0701 annotate reader TTS runtime boundaries

## Why

`src/lib/reader/tts.ts` owns the live speech-runtime contract, but that was easy
to misread as generic browser glue after the recent route-level ownership
comment passes. A newcomer needed clearer notes about retarget policy,
translated metadata fallback, controller ownership, and why stale runtime
callbacks cannot overwrite a newer speech session.

## What changed

- annotated the retarget policy so `speaking`, `paused`, and idle/error sessions
  explain why they choose different transitions
- clarified that translated TTS keeps translated text provenance while still
  borrowing source chapter/location/progress labels when translated metadata is incomplete
- documented that the controller owns live runtime/session transitions rather
  than route persistence or URL restore
- added comments around cached target updates, pre-runtime session stamping, and
  stop-time token invalidation so mini-bar/runtime coordination is easier to audit

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no TTS behavior changes
- no route-level ownership or persistence refactor
