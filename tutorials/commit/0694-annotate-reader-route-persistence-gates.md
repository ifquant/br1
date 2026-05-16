# 0694 Annotate reader route persistence gates

## Why

After the helper-level ownership comments were in place, the next newcomer-audit gap was the route-level persistence cluster in `+page.svelte`. The helpers already explained what each state family meant, but the route still hid a different question:

why do some reader states persist immediately, while others are gated on `lastRestored...BookKey`?

This slice keeps behavior unchanged and only explains the coordinator policy at the route boundary.

## What changed

- annotated the translation live snapshot persist block so it is explicit that it waits for the matching book's restore marker before writing back
- annotated assistance history and assistance selection persist blocks so it is clear why they can write immediately after current-book restore
- annotated translation mode config persistence so it is obvious why route-sensitive book config waits for its own restore marker
- annotated the TTS ownership persist block so it is clear why follow/pin ownership, read-aloud mode, translated owner, and translated snapshot are persisted as one gated bundle
- annotated translation ownership persistence so it is clear that this smaller follow-current vs pinned-source policy is already restored during the book-switch boundary before later writes run, so it does not need its own extra restore gate

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product behavior changes
- no new tests or checklist rows; this is a comments-only auditability slice
- no broader `+page.svelte` comment pass outside the reactive persistence coordinator cluster
