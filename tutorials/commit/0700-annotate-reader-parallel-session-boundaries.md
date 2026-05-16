# 0700 Annotate reader parallel session boundaries

## Why

After the route ownership, persistence, assist-workspace, and notebook handoff comment passes, the next high-value auditability gap was the parallel-reading session coordinator.

That seam is easy to misread because the UI can show two reader panes at once, but the code does not restore or persist two independent reader sessions:

- the primary pane is rebuilt from route-derived open intent
- the secondary pane starts empty on route rebuild and is cloned from the live primary pane
- pane control requests and previews live inside `parallelSession`
- the outer route still owns notebook, sidebar, TTS, bookmarks, and other durable reader workflows

This slice keeps behavior unchanged and only makes that ownership split explicit.

## What changed

- annotated `parallel.ts` so the pane invariants around `source`, `openTarget`, `controlRequest`, `preview`, `progress`, and `mountState` read as one coordinated session model
- annotated route-level parallel seeding so `autoOpen` reseeds only primary, while route resets collapse the whole session back to route-derived primary plus empty secondary
- annotated the secondary `ReaderStage` mount so it is obvious that the companion pane does not get its own note/bookmark ownership even though it still shares outer sidebar/TTS shell inputs

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no product behavior changes
- no parallel-session refactor or new persistence model
- no attempt to restore two independent durable reader sessions
