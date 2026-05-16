# 0693 Annotate reader route URL contract

## Why

After the focused-reading, translated-TTS, and translation-ownership comment passes, the next small but high-value auditability gap was the reader URL contract in `route.ts`. The file already encoded the right behavior, but a newcomer still had to infer:

- which open targets are safe to carry in the URL
- which workspace params are allowed together
- when archived translation provenance is valid in the URL and when it must be dropped
- where neutral route state stops and concrete renderer control requests begin

This slice keeps behavior unchanged and only makes that contract explicit, including the matching `+page.svelte` handoff seams where route state shapes both shell restore and later reactive re-application.

## What changed

- annotated `ReaderRouteOpenTarget` so `asset` vs `library-file` reads like an intentional boundary between external open handles and known library restore handles
- annotated `ReaderRouteOpenState` so it is clear that route params carry only compact mode/open identifiers while deeper reader state still comes from per-book persistence
- annotated `parseReaderRouteOpenState` so `ta` is clearly limited to:
  - dedicated translation routes
  - translated-TTS routes
  and is not treated as generic route baggage for every workspace
- annotated `toReaderWorkspaceModeHref` so stale translation/TTS params and archived translation ids are explicitly dropped when the destination workspace can no longer consume them
- annotated `toReaderOpenControlRequest` so the handoff from neutral route target to concrete renderer control request is easy to audit
- annotated the `+page.svelte` route sync points so it is easier to follow:
  - notebook UI intents are sanitized through `toReaderWorkspaceModeHref` before publishing route changes
  - mount restore is one route/local handoff seam, while per-book reactive restore is another
  - later reactive blocks re-apply notebook/TTS/translation route ownership in separate seams instead of one monolithic route-state reducer

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product behavior changes
- no new route-time workspace logic; this slice only documents the existing URL contract
- no broader `+page.svelte` comment pass beyond the route-state handoff seams
