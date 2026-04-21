# 0359 Fix Mobile Reader Grid Cascade

This design slice fixes a mobile reader layout bug caused by CSS specificity.

## Problem

The mobile reader was supposed to stack the reading stage, sidebar, and Bridge tab in one column.

However, the `max-width:1120px` bridge layout rules used more specific selectors:

- `.workspace.bridge-collapsed`
- `.workspace.bridge-open`

Those rules kept winning over the later `max-width:960px` `.workspace` rule. On a 390px viewport, the reader still computed a three-column grid like `236px 82px 44px`, causing horizontal overflow and squeezing the reading surface.

## Change

The mobile breakpoint now explicitly overrides all workspace reader variants:

```css
.workspace,
.workspace.bridge-collapsed,
.workspace.bridge-open {
  grid-template-columns: 1fr;
}
```

This keeps the existing desktop/tablet behavior while forcing mobile into a true single-column stack.

## Why this is better

Readest-style mobile reading should start with the book surface, then make navigation and bridge tools available below or contextually. It should not squeeze all panels into a tiny horizontal grid.

## Verification

Measured with Playwright on a 390px mobile viewport:

```text
document width: 390px
workspace grid: 390px
stage width: 390px
sidebar width: 390px
bridge width: 390px
```

Captured the mobile reader screenshot:

```text
screenshots/finding-008-after-reader-mobile-single-column.png
```

