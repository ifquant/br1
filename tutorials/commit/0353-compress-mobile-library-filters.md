# 0353 Compress Mobile Library Filters

This design slice fixes the mobile library's first-screen hierarchy.

## Problem

The mobile library header wrapped every status, format, collection, tag, and summary chip into multiple rows.

On a 390px-wide viewport, the user saw the search bar, then a wall of filters, then the books. That is backwards for a reader app. Readest keeps the library surface simple: search and primary actions first, books immediately after.

## Change

`LibraryHeader.svelte` now keeps the filter row as a single horizontal scroll lane on mobile.

The controls are still present. Nothing was deleted. The difference is that advanced filtering no longer consumes the first screen.

## Why this matches Readest better

Readest treats the library as a launcher for reading. Filters are available, but they do not become the main content.

For br1, this matters because the library is a bridge into books. If the first impression is a dense control panel, the product feels like a database. If the first impression is search plus books, it feels like a reader.

## Verification

Ran:

```bash
pnpm check
```

Captured the mobile library after screenshot. The filter row height is now about 45px, and the first reading section starts near the top of the viewport instead of below a multi-row filter wall.

