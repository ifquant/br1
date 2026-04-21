# 0356 Soften Library Reading Queue

This design slice makes the library's reading workflow feel more like a quiet book queue.

## Problem

After the previous Readest alignment fixes, the library header and filters were calmer, but the `继续阅读` and `最近阅读` shelves still read like full-width admin rows.

They were functional, but too tabular. Readest's library feels more like a launcher for books: grouped, tactile, and calm.

## Change

`ContinueReadingShelf` now wraps its rows in a soft reader-toned panel. Each row has a rounded card surface, subtler elevation, hover feedback, and a small reading progress rail.

The existing actions remain unchanged:

- continue or reopen a book
- start over when available
- inspect details
- open the original file
- repair or remove broken entries

## Why this is better

The section now reads as a curated reading queue instead of a management table. The book cover, title, and progress carry the visual weight, while operational actions stay available but secondary.

This keeps br1 aligned with the product principle: 书是主角，AI 是桥.

## Verification

Captured desktop and mobile screenshots in the gstack design report directory:

```text
screenshots/finding-005-after-desktop.png
screenshots/finding-005-after-mobile.png
```

