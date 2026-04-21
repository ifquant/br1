# 0354 Progressively Disclose Library Filters

This design slice continues the Readest alignment pass for the library page.

## Problem

The desktop library still exposed every advanced filter by default:

- formats
- collections
- tags
- metadata summaries
- active-filter chips

That made the header feel like a control panel. Readest keeps the library first impression quieter: search, a few primary controls, then books.

## Change

`LibraryHeader.svelte` now shows only the core status filters by default, plus one `筛选` pill for advanced filters.

Advanced filters are still available. Clicking `筛选` expands the full set of format, collection, tag, summary, and clear-filter controls. If an advanced filter is active, the advanced row stays visible so the user can see and clear the state.

## Why this is better

This is progressive disclosure: keep advanced controls reachable without making every user parse them on every visit.

For br1, the user intent on the library page is usually "find the next book" or "continue reading." Filters support that job, but they should not be the first thing the page says.

## Verification

Ran:

```bash
pnpm check
```

Captured collapsed and expanded desktop screenshots plus collapsed mobile screenshot in the gstack design report directory.

Observed measurements:

- desktop collapsed filter row: about 47px tall
- desktop expanded filter row: about 115px tall
- mobile collapsed filter row: about 45px tall

