# 0557 Tighten Reader Footer Progress Hierarchy

## Why this change exists

After `0556`, the route-level reader toolbar already read more like a deliberate shell, but the footer still looked like an older utility bar.

It treated three different kinds of information as if they belonged to the same layer:

- navigation controls
- current reading progress
- environment metadata such as format and layout

That made the footer harder to scan than it needed to be. The user had to read chapter context, progress, and environment tags as one flat strip instead of one reading status surface.

This slice keeps the same control requests and the same progress slider behavior. It only changes how the footer explains the current reading state.

## What changed

### 1. Chapter and location now form the primary reading-status block

[`src/lib/components/reader/ReaderFooterBar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte) now renders a dedicated `当前阅读状态` section.

That section promotes:

- the current chapter label
- the current location label

above the progress slider.

If the chapter label is still in the unopened placeholder state, the footer falls back to the book title before finally falling back to `等待打开书籍`.

### 2. The progress slider stays central, but no longer has to carry all the context

The slider still owns the real progress action:

- drag to a new fraction
- commit the same `fraction` control request on change

But it now sits under the chapter/location summary instead of pretending that the percentage label is the whole story of reading progress.

### 3. Format and layout are now environment chips instead of peer metadata

The footer’s old meta row used location, format, and layout as one flat inline list.

Now:

- location is part of reading status
- format and layout move into a separate `阅读环境` group
- both are rendered as lightweight chips

That makes it easier to distinguish:

- where the reader is in the book
- what kind of rendering environment the book is currently using

### 4. The focused smoke now waits on the footer contract directly

[`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) now checks the new footer sub-labels:

- `当前阅读状态`
- `阅读环境`

The same sample-reader smoke also now waits for the footer to become visible instead of relying on a more brittle route-level `main` role lookup.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader opens and reopens EPUB sample assets in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- reader header chrome changes beyond the existing `0556` toolbar split
- notebook, notes, bookmarks, or highlights workspace semantics
- any Tauri command, progress persistence, or reader engine behavior changes
