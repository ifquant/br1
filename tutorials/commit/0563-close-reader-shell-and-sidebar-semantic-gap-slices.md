# 0563 Close Reader Shell And Sidebar Semantic Gap Slices

## Why this change exists

Between `0556` and `0562`, the repo accumulated a run of narrow reader-product slices:

- reader shell chrome hierarchy
- footer progress hierarchy
- header control ownership
- notes as annotations
- bookmarks as reading positions
- highlights vs cross-book selection sets
- highlight empty states that still recognize saved selection sets

By this point, the remaining work was no longer “one more obvious semantic mismatch in code”.

The remaining risk was different:

- the checklist still left `P4-2.1` and `P4-2.2` open
- the audit log did not yet include the full 0559–0562 chain
- future work would otherwise continue reopening a line that had already been materially closed

So this slice is a closeout slice, not another product change.

## What changed

### 1. `P4-2.1` is now explicitly closed

[`READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md) now marks `P4-2.1` complete.

That closeout is justified by the existing code path across:

- route toolbar split (`0556`)
- footer hierarchy (`0557`)
- header control regrouping (`0558`)

Those three slices now form one coherent shell hierarchy:

- route-level layout and workspace switching
- header-level ownership groups
- footer-level reading status and environment

### 2. `P4-2.2` is now explicitly closed

The same checklist now marks `P4-2.2` complete.

That closeout is justified by the sidebar product-semantic slices:

- notes -> annotation workspace (`0559`)
- bookmarks -> reading positions (`0560`)
- highlights vs selection sets (`0561`)
- highlight empty-state repair (`0562`)

At this point, the sidebar’s three reading-workspace surfaces no longer obviously misdescribe what they are for.

### 3. The execution log now includes the full missing chain

The checklist’s execution log now includes the missing rows for:

- `0559`
- `0560`
- `0561`
- `0562`

That matters because the checked-in execution history is part of how later agent passes understand what was actually finished.

## Verification

- source review of the `P4-2.1` and `P4-2.2` reader files against the current checklist state
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no product code changes
- no new reader behavior, storage, or sync changes
- no claim that `P5` or later reader workspace lines are finished
