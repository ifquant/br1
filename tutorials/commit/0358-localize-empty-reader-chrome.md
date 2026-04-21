# 0358 Localize Empty Reader Chrome

This design slice removes prototype English labels from the reader's empty-book state.

## Problem

The reader route still showed implementation-era labels before a book was opened:

- `Open a book to start reading`
- `Waiting for book`
- `BOOK`
- `WAITING`
- `Reading Surface`
- `Contents`

Those labels made the reader feel like a test harness. For a Readest-aligned surface, the empty state should still sound like a reading product.

## Change

The reader now centralizes its empty preview state in `$lib/reader` and maps internal format/layout/location labels to display text.

Visible empty-state chrome now uses Chinese reading language such as:

- `从书库选择一本书开始阅读`
- `等待打开书籍`
- `书籍`
- `待打开`
- `阅读表面`
- `导航`

Internal values like `BOOK` and `WAITING` are still preserved as format/layout signals where reader logic needs them.

## Why this is better

The empty reader is often the first surface users see after opening `/reader`. It should not look like debug scaffolding.

This keeps the product principle intact: 书是主角，AI 是桥. Even before a book is loaded, the page should speak in reader terms rather than implementation terms.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured the empty reader desktop screenshot in the gstack design report directory:

```text
screenshots/finding-007-after-reader-empty-desktop.png
```

