# 0689 Annotate reader focused-reading and persistence boundaries

## Why

The recent reader work pushed a lot of focused-reading, same-book resume, and per-book persistence logic into pure helpers plus route-owned coordination. The behavior was already covered, but some of the highest-risk boundaries still required a newcomer to reverse-engineer why restore, persist, and EPUB selection handling were ordered the way they were.

This slice does not change behavior. It adds beginner-friendly comments at the places where a future refactor is most likely to break hidden same-book resume or reuse a stale EPUB selection by mistake.

## What changed

- annotated `readingMode.ts` so the hidden focused-reading resume contract is explicit:
  - persisted `mode: off` can still mean "closed overlay, but reopen this exact excerpt"
  - RSVP cursor and pace are always clamped/normalized before reuse
  - same-book reopen prefers the last explicit excerpt over fresh preview sampling
  - parse/restore intentionally salvages safe state instead of treating every partial payload as fatal
- annotated `currentBookPersistence.ts` so per-book storage boundaries are easier to audit:
  - restore gates exist to stop first-render defaults from overwriting restored book state
  - per-book storage keys intentionally partition state by book
  - translation live snapshots and TTS ownership explicitly purge partial or incoherent payloads instead of reviving dead state
  - translation ownership comments now explain the narrower guarantee that persist normalizes one input shape before restore validates it
  - focused-reading persistence removes stale payloads when the excerpt is unsupported or truly empty
- annotated `src/routes/reader/+page.svelte` at the route-owned chokepoints:
  - book-switch restore now explains the staged workflow from per-book restore through focused-reading shape restore
  - focused-reading persistence now explains why it waits for the restore gate
  - EPUB `selectionchange` now explains why the route updates both the live selection and the one-shot launch guard

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product behavior changes
- no new checklist items or reader maturity slices
- no broad comment pass across unrelated reader files; this is only the highest-value focused-reading and per-book persistence boundary layer
