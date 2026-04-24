# 0542 Expose Library Desktop Support Context

## Why

`br1` already had the safe substrate for desktop file-association support: the root layout consumed the associated-book open queue, forwarded trusted inputs into the reader, and surfaced rejected inputs through a temporary banner. What it still lacked was a durable library-facing product surface. Desktop support state was effectively hidden unless a transient banner happened to fire.

P6-1.2 narrows that gap without inventing any new backend affordances. The goal of this slice is to reuse the existing queue consumer and rejection reporting path, then project that state into one inspectable support card inside the library shell.

## What Changed

### 1. The root layout now owns a shareable desktop-support state model

In [/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte), the existing associated-open listener flow now also maintains a small context-backed state object for descendants.

That state tracks:

- whether the app is running in desktop mode
- whether the current window is the main queue-consuming window
- whether the associated-open queue is idle, queued, or actively processing
- the current request preview while a batch is being handled
- the last processed batch summary
- the latest rejected-input preview

The important boundary is unchanged: the layout still calls the existing `consume_associated_book_open_requests` command, still uses the existing rejection event, and still drives trusted reader opens through the existing route/service helpers.

### 2. The library chrome now renders one support card instead of relying on scattered notices

In [/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageChrome.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageChrome.svelte), the library shell reads that layout-provided context and renders a dedicated desktop-support card.

The card gives the user one place to inspect:

- whether desktop association support is available at all
- whether this window can consume the queue
- whether there are pending or active associated-open requests
- what the most recent processed batch looked like
- which recent inputs were ignored and why they need attention

It also exposes only two safe actions:

- `立即检查打开队列`
- `清除忽略提示`

Those actions reuse the existing queue flush and notice-clear behavior. No new native command or renderer-originated file-open capability was added.

## Why This Fits P6-1.2

The checklist item asks for transfer/queue state to become inspectable and for desktop support actions to stop being scattered or invisible.

This slice does exactly that:

- queue status is now visible from the library shell
- rejection context is no longer only a temporary top-level banner
- desktop affordances are grouped into one card instead of being implicit runtime behavior
- the implementation stays inside the current trusted desktop boundary

## Verification

Run from the repo root:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

## Not Included

- no new Tauri command for peeking or mutating the queue
- no new desktop integration beyond the existing associated-open queue and rejection event
- no new library-body workflow shelf; this slice is intentionally a chrome-level support card
