# 0691 Annotate reader translation source and snapshot boundaries

## Why

After the focused-reading and translated-TTS comment passes, the next small but worthwhile auditability gap was `translationOwnership.ts`. The file already held the right policy, but a newcomer still had to reverse-engineer three closely related boundaries:

- when translation follows the current excerpt vs a pinned source
- when the visible translation panel should reuse a persisted live snapshot
- when route-owned translation restore is allowed to override ambient current-book selection

This slice keeps the behavior untouched and only makes those contracts explicit.

## What changed

- annotated translation source ownership so `follow current` vs `pinned source` reads like a deliberate policy boundary instead of a boolean branch
- annotated pinned-source creation so partial caller payloads are clearly normalized against the currently resolved source before storage
- annotated the live translation snapshot chain so the difference between:
  - `next live snapshot`
  - `visible panel result`
  - `sticky current snapshot`
  is explicit
- annotated translation-mode config restore so the precedence ladder is readable:
  - explicit translation-route params/history
  - restored per-book config
  - ambient current-book selected translation history entry re-derives config when no explicit route-owned translation state exists
- annotated route-time translation config refresh so it is clear that only dedicated translation mode is allowed to retune the workspace config live

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no behavior change to translation mode, inline translation, or translated TTS
- no new route comments; this slice stays inside `translationOwnership.ts`
- no broader reader comment pass beyond the translation source/snapshot/config boundary
