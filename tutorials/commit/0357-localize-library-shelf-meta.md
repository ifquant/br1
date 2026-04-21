# 0357 Localize Library Shelf Meta

This design slice removes a small debug-like label from the library shelf.

## Problem

The shelf heading still displayed English utility text such as `3 ITEMS · GRID`.

That language is useful while prototyping, but it does not match the rest of br1's Chinese reading surface. It also feels more like an admin dashboard than a calm book library.

## Change

`BookshelfPreview` now derives Chinese shelf metadata:

- `3 本`
- `网格视图`
- `列表视图`

The shelf count still includes the import tile, matching the previous behavior. Only the visible language changes.

## Why this is better

Small chrome labels matter in a reader. The heading now sounds like part of the product instead of a leftover implementation marker.

This keeps the Readest alignment direction intact: fewer dashboard words, more book-first language.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured desktop and mobile library screenshots in the gstack design report directory.
