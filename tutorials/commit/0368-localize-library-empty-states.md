# 0368 Localize Library Empty States

This design slice finishes the active library empty-state assistive labels.

## Problem

Most library chrome was already localized, but the empty and notice surfaces still had English assistive labels:

- `empty state filter chips`
- `Remove empty-state library filter ...`
- `readest migration`
- `reading workflow note`
- `empty library`
- `empty search results`
- `empty filtered library`
- `sample reading workflow note`

These labels are not usually visible, but they describe the exact surfaces users encounter when search, filters, or migration states are empty.

## Change

The active `/library` empty states and notice sections now use Chinese assistive labels for:

- empty filter chips and removal buttons
- Readest migration notice
- reading workflow notices
- empty library state
- search-empty and filter-empty states
- starter/sample search-empty and filter-empty states

## Why this is better

Readest-style polish should hold even when the shelf has nothing to show. Empty states are product surfaces, not implementation leftovers, so their assistive labels should use the same Chinese reader language as the rest of the library.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a filtered-empty library screenshot in the gstack design report directory:

```text
screenshots/finding-017-after-library-empty-states.png
```
