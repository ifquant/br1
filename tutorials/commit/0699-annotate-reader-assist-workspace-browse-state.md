# 0699 Annotate reader assist workspace browse state

## Why

After the route handoff, persistence, translation ownership, and TTS ownership comment passes, the next high-value auditability gap was the browse-state coordinator inside `ReaderAssistWorkspace`.

That seam is easy to misread because one component serves two different reader surfaces:

- the generic `assistant` tab can browse overview cards plus lookup/translation lanes
- the dedicated `translation` tab reuses the same component under `lockedMode="translation"`
- selected history entry ids are parent-owned durable selection
- overview visibility and lane focus/full state are only local notebook browse state
- the workspace renders whatever history slice the parent passes in; it does not enforce current-book scoping by itself

This slice keeps product behavior unchanged, but it also tightens a few user-facing copy and accessibility labels so the visible wording matches the documented ownership contract.

## What changed

- annotated `ReaderAssistWorkspace` so restored lane choice reads as an ongoing UI mirror of parent-owned selected history ids, including the child-side request to clear stale selections when a non-empty incoming slice no longer contains them, not as a new persistence owner
- annotated the translation-locked branch so it is clear that dedicated translation mode narrows the component contract instead of turning it into a free-form assistant panel, and that direct textarea edits to an unfollowed draft are mirrored back into the parent-owned pinned source
- annotated lane browse state and `openArchiveLane()` so overview/focus toggles stay clearly separate from route syncing and persisted history selection
- tightened workspace copy so it uses “current range” language to avoid implying that this component itself enforces book scoping
- tightened a few notebook/assist labels so collapsed-state copy and aria wording no longer imply “recent only” or a stronger local ownership contract than the code actually has
- annotated the `ReaderNotebook` call site so the reused component's two contracts are obvious where the notebook chooses between `assistant` and `translation`

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no workflow or state-management behavior changes
- no route/persistence refactor
- no redesign of the assistant or translation notebook surfaces
