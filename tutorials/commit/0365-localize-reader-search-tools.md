# 0365 Localize Reader Search Tools

This design slice removes the remaining visible English search chrome from the reader sidebar.

## Problem

The reader sidebar had been mostly localized, but the search panel still exposed English UI labels in the real tool path:

- idle search summary showed `Search`
- in-progress search summary showed `Searching...`
- unnamed search results fell back to `Search result`

The same area also kept English assistive labels for search cache, search history, result navigation, bookmarks, and the sidebar/window chrome.

## Change

The search panel now uses Chinese product language:

- `正文搜索`
- `正在搜索`
- `搜索结果`

This slice also localizes reader sidebar/window assistive labels for:

- sidebar toggle, pin, close, and tab list
- table of contents, search options, cache, history, result navigation, and results
- bookmark panel, bookmark filters, and bookmark groups
- reader window chrome and sidebar resize handle

## Why this is better

Readest-style reader tools should feel like book-adjacent utilities, not a search widget dropped into the page. This keeps the search path calm and consistent without changing search indexing, cache behavior, or navigation.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a reader search-tab screenshot in the gstack design report directory:

```text
screenshots/finding-014-after-reader-search-tools.png
```
