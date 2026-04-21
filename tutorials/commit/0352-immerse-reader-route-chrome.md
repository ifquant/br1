# 0352 Immerse The Reader Route Chrome

This design slice moves `/reader` closer to Readest's core interaction model: once a book is open, the reading surface owns the window.

## Problem

The reader route still carried the global br1 application frame:

- top brand header
- top-level Library / Reader navigation
- left workspace rail
- then the actual reader shell inside that frame

That made the page feel like a dashboard with an embedded reader. Readest does the opposite. Its reader presents navigation and tools as reader chrome around the page, not as a separate app shell fighting the book.

On mobile this was especially expensive. The global header consumed the first screen before the user reached the book.

## Change

`src/routes/+layout.svelte` now treats every `/reader` route as a reader root, not only `/reader?mode=window`.

The global shell is still used for ordinary app pages, but `/reader` now suppresses:

- the global app header
- the workspace side rail
- default app-main padding

The existing `ReaderStage`, `ReaderSidebar`, and reader header remain responsible for reader navigation. This preserves behavior while removing duplicated chrome.

## Why this matches Readest better

Readest's reader experience is organized around the page:

- the book is the central object
- chrome is local to reading
- side panels serve the book, not the whole app
- mobile prioritizes reading content immediately

This commit makes br1 follow the same hierarchy without deleting the bridge concept. The bridge can still exist, but it no longer competes with global app furniture.

## Verification

Ran:

```bash
pnpm check
```

Then captured before/after design screenshots for desktop and mobile reader surfaces in the gstack design report directory.

