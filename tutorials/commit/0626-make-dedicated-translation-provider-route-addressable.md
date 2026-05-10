# 0626 Make dedicated translation provider route-addressable

## Why

`P13-1.3` made dedicated translation mode carry its target language in the route, but the provider choice was still local workspace state.

That left one more adjacent route-state gap inside the same dedicated translation contract:
- direct `workspace=translation` links could not say whether the reader should arrive on `DeepL` or `Yandex`
- switching providers only changed local workspace state
- reload could reproduce the wrong provider even though the reader was already in the right dedicated translation workspace

This slice closes that gap by letting dedicated translation mode carry the provider in the route.

## What changed

- Extended the reader route contract so `workspace=translation` can also carry `tp=deepl|yandex`.
- Rewired the reader page and dedicated translation workspace so provider changes sync into the route, and direct route opens override the workspace-local provider default.
- Added a focused smoke that proves direct translation route opens can restore `Yandex`, switching back to `DeepL` rewrites the route, and reload preserves the updated provider.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation provider from route state in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- route-owned translation history or archive selection
- broader translation runtime or provider credential behavior beyond the dedicated provider-choice contract
