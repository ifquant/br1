# 0355 Collapse Reader Bridge Panel

This design slice makes the bridge layer quieter by default.

## Problem

After removing the global app chrome from `/reader`, the right-side Bridge panel still appeared by default. It was useful as a placeholder, but visually it competed with the page.

Readest's reader keeps tools close, but not constantly loud. Annotation and note surfaces appear when the user needs them.

## Change

The non-window reader route now starts with Bridge collapsed into a narrow right-side tab.

The user can click `Bridge` to expand the panel, and close it again with the header button. The existing placeholder content stays intact. This is a presentation change, not a bridge feature change.

## Why this is better

The book gets more horizontal room and stronger first priority. The bridge concept remains visible, but it behaves like contextual assistance instead of a permanent sidebar.

This keeps the product principle intact: 书是主角，AI 是桥.

## Verification

Ran:

```bash
pnpm check
```

Captured reader screenshots for both collapsed and expanded Bridge states in the gstack design report directory.

