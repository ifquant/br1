# 0366 Localize Reader Annotation Tools

This design slice finishes the reader sidebar assistive-language cleanup for high亮 and note tools.

## Problem

After the search-tool pass, the reader sidebar still had English assistive labels in the annotation-heavy panels:

- `highlights panel preview`
- `saved highlight selections`
- `saved highlight selection refresh summary`
- `saved highlight selection import preview`
- `notes panel preview`
- `notes filter controls`
- `current text selection preview`

These labels are mostly not visible, but they are still part of the reading tool surface for keyboard and screen-reader users. Leaving them in English makes the annotation layer feel less like a coherent Chinese reader.

## Change

The high亮 and note panels now use Chinese assistive labels for:

- high亮 panel, filter controls, sort controls, groups, and saved selection sets
- saved selection refresh, import, export, and unmatched-fragment panels
- note panel, note filters, annotation-kind filters, note groups, selected text preview, and unsupported-format notice

## Why this is better

Bridge Reader should treat annotation and reading traces as first-class reader tools. Localizing these labels keeps the product voice consistent without changing high亮 selection behavior, import/export payloads, or note persistence.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a reader high亮-tab screenshot in the gstack design report directory:

```text
screenshots/finding-015-after-reader-annotation-tools.png
```
