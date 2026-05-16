# 0697 Annotate reader library reading-state persistence

## Why

After the route URL, persistence-gate, and TTS/translation action comment passes, the next high-value auditability gap was the library reading-state persistence seam in `+page.svelte`.

That path is small, but it hides several non-obvious persistence rules:

- PDF does not reuse the same resume locator contract as text/EPUB, so this seam only stores visible PDF location metadata
- ordinary preview churn is debounced before writing
- leave-page flows still kick a best-effort flush instead of trusting the debounce timer alone
- only the newest in-flight persist promise should block a later flush

This slice keeps behavior unchanged and only makes those boundaries explicit.

## What changed

- annotated `persistLibraryReadingState` so it is clear why PDF only stores display-oriented location metadata here and why the persist path sequence-fences in-flight writes
- annotated `queueLibraryReadingStatePersist` so the debounce policy reads as an intentional “latest visible reading position wins” rule instead of an arbitrary timeout
- annotated `flushLibraryReadingStatePersist` so the go-to-library/pagehide/teardown flush path is explicit: cancel debounce, await the newest in-flight write, then persist one final preview, with a real completion fence only for callers that await it
- annotated the `pagehide` hook so it is clear why this view still kicks a best-effort flush before the page disappears

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no product behavior changes
- no new tests or checklist rows; this is a comments-only auditability slice
- no broader library sync or KOReader refactor outside the local reading-state persistence seam
