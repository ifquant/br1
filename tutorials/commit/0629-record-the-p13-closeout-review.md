# 0629 Record the P13 Closeout Review

## Review verdict

`P13 Reader Playback Route-State Parity` no longer has a structural blocker.

The shipped route contract now covers the compact, user-facing state that is stable enough to survive deep links and reloads without ambiguity:

- workspace selection
- source versus translated TTS mode
- translation target language
- translation provider
- selected archived translation provenance

## Why the line stops here

The next obvious local states are not compact mode flags anymore. They are text-bearing reading targets such as:

- `pinnedTranslationSource.text`
- `pinnedTtsTarget.text`

Routing those values would widen the contract from “addressable workspace state” into “addressable reading payload”. That is a different product decision and should be evaluated in a new reader playback or reading-mode line instead of being smuggled into `P13`.

## Recommended next step

Do not keep slicing `P13`.

If this area needs more work, open a new line that treats pinned/follow-current ownership as a reading-mode or playback-runtime problem rather than as a compact route-state parity extension.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`
