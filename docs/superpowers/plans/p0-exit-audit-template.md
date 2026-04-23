# P0 Exit Audit Template

Use this template when completing `P0-0.1` in `.planning/READEST-ALIGNMENT-CHECKLIST.md`.

| Row | Verdict | Evidence | Blocking Gap | Follow-up Item |
|---|---|---|---|---|
| Multi-format open/import/reopen | BLOCKED |  |  | P0-1.1 |
| File association and trusted open | BLOCKED |  |  | P0-1.2 |
| Scroll/paginated and settings persistence | BLOCKED |  |  | P0-2.1 |
| Reader chrome/sidebar layout polish | BLOCKED |  |  | P0-2.2 |
| Search cache/history/replay/clear | BLOCKED |  |  | P0-3.1 |
| Annotations/notes/bookmarks/progress | BLOCKED |  |  | P0-3.2 |
| Library import/migration/group/filter/sort | BLOCKED |  |  | P0-4.1 |
| Library repair/remove/restore/cover/metadata | BLOCKED |  |  | P0-4.2 |

Allowed verdicts:

- `PASS`: verified and no known blocker remains.
- `SHIPPABLE_WITH_CAVEAT`: user-visible behavior is coherent, but a documented edge remains.
- `BLOCKED`: implementation or test evidence is missing.

Required verification:

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
