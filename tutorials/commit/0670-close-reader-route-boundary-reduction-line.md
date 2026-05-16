# 0670 Close Reader Route Boundary Reduction Line

## Why

P19 set out to keep `src/routes/reader/+page.svelte` as the reader coordinator
while moving maturity-surface policy and reset rules into auditable helpers. That
line has now reached the point where the high-value pure clusters are extracted.

This closeout records the stopping point so later work does not keep splitting
the route just because it is still large.

## What P19 Accomplished

- P19-1.1 moved route maturity coordination rules for dedicated translation,
  annotation popup book-change clearing, popup nonce reset, and playback queue
  retargeting into pure helper coverage.
- P19-1.2 extracted the current-book restore/reset bundle for TTS ownership,
  translation config restore, inline translation reset, annotation selection
  clearing, and focused-reading reset.
- P19-1.3 extracted the collapsed TTS mini-bar display/action state into one
  helper surface.
- P19-1.4 extracted the live translation snapshot, translation panel result,
  translated-source state, and translated-TTS live snapshot derivation chain.
- P19-1.5 extracted the current-book persistence gates that prevent pre-restore
  defaults from clobbering per-book storage.

Together these slices moved the non-obvious pure policy out of the route while
keeping each helper covered by focused tests and route-level smoke checks.

## What Stays In The Route

The remaining `+page.svelte` clusters are intentionally route-owned:

- Svelte lifecycle: `onMount`, `onDestroy`, pagehide flushing, and reactive
  sequencing.
- URL and workspace routing: route open state, dedicated notebook workspace
  params, TTS/translation mode route sync, and tab application.
- Runtime controllers: TTS start/pause/resume/stop, retarget actions, search,
  notes, bookmarks, sidebar, and playback timers.
- Persistence side effects: `localStorage` access, `getReaderStorage()`, current
  book writes, notebook shell writes, library reading-state service updates, and
  sync activity writes.
- Product composition: wiring `ReaderStage`, `ReaderNotebook`, `ReaderSidebar`,
  notebook visibility/pinning, and the prop/callback surface between them.
- Event handlers: selection actions, annotation popup actions, inline
  translation candidates, focused reading controls, sync commands, import/export
  flows, and library navigation.

Those areas are not just pure policy. They coordinate live Svelte state,
browser/desktop capabilities, services, and component ownership. Moving them into
thin helpers now would mostly hide sequencing rather than simplify it.

## Why Stop Here

The route is still large, but the large parts that remain are the reader's actual
coordination boundary. Splitting them further would be low-value because it would:

- create wrapper functions around side effects instead of extracting reusable
  domain decisions
- make boot/book-switch ordering harder to audit
- separate event handlers from the state they intentionally own
- risk moving storage writes or runtime controller calls out of the one place
  where route timing is visible
- add more files without reducing the number of product concepts the route must
  coordinate

Future extraction should wait for a concrete new pure policy cluster, not resume
as a line-count exercise.

## Verification

- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

