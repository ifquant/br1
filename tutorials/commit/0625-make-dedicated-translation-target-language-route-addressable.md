# 0625 Make dedicated translation target language route-addressable

## Why

`P13-1.1` made the dedicated `翻译模式` URL-addressable, but the mode still fell back to its local default target language after a direct open or reload.

That left a smaller but real route-state gap:
- direct `workspace=translation` links could not say whether the reader should arrive in `中文` or `English`
- switching the dedicated translation target language only changed local component state
- reload could reproduce the wrong target language even though the reader was already in the right dedicated workspace

This slice closes that gap by letting dedicated translation mode carry its target language in the route.

## What changed

- Extended the reader route contract so `workspace=translation` can also carry `tl=zh|en`.
- Rewired the reader page and dedicated translation workspace so target-language changes sync back into the URL, and direct route opens override the workspace-local default.
- Added focused smokes that prove direct translation route opens can restore `English`, switching back to `中文` rewrites the route, and reload preserves the updated target language.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader can open translation mode as a dedicated notebook tab|reader restores dedicated translation target language from route state in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- route-owned translation provider selection
- broader translation persistence, history, or runtime behavior beyond the dedicated target-language contract
