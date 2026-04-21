# 0367 Localize Reader Header Fallbacks

This design slice removes the last reader-header and search-result fallback labels that could still surface as English product chrome.

## Problem

Most visible reader copy was localized, but a few reader fallbacks still used English:

- header controls and the settings menu used English assistive labels such as `Go to library`, `More actions`, and `reader view menu`
- search result generation could still emit `Search result`
- asset and library-file routes without a label fell back to `imported book`

These are small details, but they sit directly on the reader surface and can appear during keyboard navigation, screen-reader usage, or unusual open routes.

## Change

Reader header controls and settings groups now use Chinese labels.

Search result fallback labels now use `搜索结果`.

Reader route fallback labels now use `导入书籍`.

## Why this is better

The reader should not switch tone at the exact moment a user opens controls or runs into an unnamed result. This keeps the chrome consistent with the Readest-first, book-first surface while leaving layout, navigation, and search behavior unchanged.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a reader header screenshot in the gstack design report directory:

```text
screenshots/finding-016-after-reader-header-fallbacks.png
```
