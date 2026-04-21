# 0360 Localize App Shell Chrome

This design slice removes English scaffold text from the app shell.

## Problem

Most library and reader surfaces now use Chinese reading-language chrome, but the root/app shell still had prototype labels:

- `Library`
- `Reader`
- `Workspace`
- `Readest-inspired shell on Tauri + SvelteKit`
- `Dismiss`
- `Ignored ... open-with input`

These labels are easy to miss because `/library` and `/reader` hide most global shell chrome, but they still appear during root redirects, fallback pages, and associated-open error notices.

## Change

The shared layout now uses Chinese labels for:

- top navigation
- side rail
- associated-open rejection banner
- app subtitle

The root redirect page also says `br1 / 书库` and refers to entering `书库` instead of `Library`.

## Why this is better

Chrome language should be consistent even on transitional surfaces. This keeps br1 from feeling half product, half scaffold when a user lands on `/` or hits an open-with edge case.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a root-route smoke screenshot in the gstack design report directory:

```text
screenshots/finding-009-after-app-shell-localized.png
```

The root route redirects quickly into `/library`, so this check primarily verifies that the localized shell compiles and does not block navigation.
