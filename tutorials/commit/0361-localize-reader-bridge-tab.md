# 0361 Localize Reader Bridge Tab

This design slice makes the reader bridge surface use the same Chinese product language as the rest of the reader.

## Problem

After the reader and app shell localization slices, the bridge surface still showed a visible English tab:

```text
Bridge
```

The expanded placeholder copy also mixed English terms like `contextual surface`, `AI`, and `bridge` into otherwise Chinese reader copy.

## Change

The collapsed bridge tab now displays `桥`.

The expanded bridge panel also uses Chinese labels and copy:

- `桥`
- `桥梁面板`
- `右侧上下文面板`
- `智能行为`
- `桥梁层`

The reader's empty-stage explanatory copy now also says `桥梁层` instead of `bridge`.

`Bridge Reader` remains the product name. This change only affects the contextual bridge surface inside the reader route.

## Why this is better

The bridge concept should feel like marginalia or guided reading, not an English SaaS widget attached to the book. The shorter `桥` label also reduces visual weight on desktop and mobile.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured reader screenshots in the gstack design report directory:

```text
screenshots/finding-010-after-bridge-tab-localized-desktop.png
screenshots/finding-010-after-bridge-tab-localized-mobile.png
```

Also checked the rendered reader body no longer contains the standalone `bridge` word in the empty-state chrome.
