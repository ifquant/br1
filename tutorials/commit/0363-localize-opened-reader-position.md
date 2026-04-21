# 0363 Localize Opened Reader Position

This design slice keeps the reader chrome localized after a real book opens, especially for TXT and PDF states.

## Problem

The empty reader and footer were already localized, but opened-book state still had English fallback strings:

- PDF locations used `Page`
- TXT locations used `Line`
- TXT fallback title, author, and chapter labels used `Plain text`
- TXT search errors were written in English

That meant the reader could look polished before opening a book, then regress into implementation language once a supported plain-text source was loaded.

## Change

Reader state generation now uses Chinese labels for these opened-book paths:

- `第 n / m 页` for PDF page positions
- `第 n / m 行` for TXT line positions
- `纯文本书籍`, `纯文本来源`, and `纯文本` for TXT fallback metadata
- `TXT 书籍暂不支持全文搜索。` for the current TXT search limitation

## Why this is better

Readest parity is not only the empty shell. The page needs to stay reader-facing after a file is opened. These labels preserve the same quiet Chinese chrome while leaving the underlying format tokens and navigation state unchanged.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a TXT reader screenshot in the gstack design report directory:

```text
screenshots/finding-012-after-opened-txt-localized.png
```
