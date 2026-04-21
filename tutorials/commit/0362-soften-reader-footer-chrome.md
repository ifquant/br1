# 0362 Soften Reader Footer Chrome

This design slice removes the last visible prototype texture from the reader footer and empty-state copy.

## Problem

The reader surface was mostly localized, but the footer still carried control-era details:

- assistive labels were still written in English
- footer metadata used uppercase styling and wide tracking even when the visible labels were Chinese
- the empty reader copy still exposed the technical acronym `TTS`

None of these broke the reader, but together they made the page feel more like a component preview than a quiet reading surface.

## Change

The footer controls now use Chinese labels for screen readers and hover titles:

- `上一页`
- `回到开头`
- `下一页`
- `阅读进度`

The footer frame keeps the compact chrome typography, but drops uppercase transformation and reduces letter spacing so Chinese metadata reads naturally.

The empty-stage explanatory copy now says `朗读` instead of `TTS`.

## Why this is better

Readest-style reader chrome should be quiet and book-adjacent. The footer still needs to expose progress and navigation, but it should not look like a debug HUD or English widget layer.

This keeps the existing controls and layout intact while making the surface feel more native to the Chinese reader experience.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a reader screenshot in the gstack design report directory:

```text
screenshots/finding-011-after-reader-footer-chrome.png
```
