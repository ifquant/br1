# 0698 Annotate reader workspace route handoff

## Why

After the route URL contract, persistence gates, TTS/translation ownership, and library reading-state comment passes, the next high-value auditability gap was the notebook/route handoff around dedicated reader workspaces.

That seam is easy to misread because the notebook is not fully route-owned and not fully local either:

- `translation` and `tts` are dedicated route-owned modes
- notes, highlights, assistant, and sync stay local notebook presentation inside this handoff model
- mount restore starts from persisted notebook shell state, then lets explicit route intent override the dedicated tab/visibility slice
- later reactive route application is edge-triggered so stale URL intent does not keep replaying over ordinary local notebook toggles

This slice keeps behavior unchanged and only makes those ownership boundaries explicit.

## What changed

- annotated `resolveReaderNotebookShellState` so it is clear that pinned/local tab state is restored locally while explicit route workspace modes still force the dedicated tab open
- annotated route request helpers so it is obvious they sanitize the partial route contract instead of serializing all notebook shell state
- annotated `openNotebookWorkspaceTab` and `closeNotebookWorkspace` so dedicated route modes are distinguished from local notebook tabs and pinned shell memory
- annotated the route application block so `lastAppliedRouteWorkspaceMode` reads as an edge-trigger guard, not a second source of notebook truth

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no product behavior changes
- no helper extraction or route/notebook state refactor
- no broader notebook UX redesign outside the current route handoff seam
