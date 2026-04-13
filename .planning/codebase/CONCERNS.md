# br1 Concerns

## Summary

`br1` is already well past starter-template stage, but it is still in a fast-moving alignment phase. The biggest risks are not “missing architecture” anymore; they are incomplete coverage, desktop-only complexity, and a gap between implementation depth and formal documentation.

## 1. README and high-level docs lag behind the real codebase

`README.md` is still essentially template-level, while the app now has:

- real desktop library import
- separate reader windows
- EPUB/PDF flows
- notes, bookmarks, search cache, and automation

This makes onboarding harder because the source of truth is currently the code plus `tutorials/commit/`, not the main repo docs.

## 2. Heavy reliance on desktop-only behavior

Many core capabilities only exist meaningfully on Tauri desktop:

- local file import
- Readest migration
- separate reader windows
- on-disk notes/bookmarks/search cache

The web fallback exists, but the product is not truly symmetric across web and desktop. This increases maintenance cost because many flows have two behaviors:

- browser fallback
- desktop host path

## 3. Automation is strong but still narrow

The desktop regression baseline is valuable, but it is still selective.

Gaps include:

- many new view-menu settings are not directly asserted
- no broad matrix for notes/bookmarks/search interactions across multiple formats
- no unit tests for controller logic
- no Rust unit tests for persistence and pruning logic

This means regressions can still hide behind green smoke tests.

## 4. Absolute-path assumptions exist in tooling

The PDF vendor setup script uses hardcoded workspace paths:

- `scripts/setup-pdfjs-vendor.mjs`
  - `/Users/dev/workspace2/hc_apps/br1`
  - `/Users/dev/workspace2/hc_apps/foliate-js`

This is workable on the current machine but fragile for:

- collaborators
- CI
- machine moves

## 5. Reader surface is feature-rich but still not fully stabilized

The reader has grown substantial behavior:

- window chrome modes
- width modes
- atmosphere modes
- notes workspace
- bookmarks workspace
- search workspace

That is good progress, but it also means `ReaderSidebar.svelte`, `ReaderStage.svelte`, and `ReaderViewport.svelte` remain high-churn, high-risk files.

## 6. Product alignment depends on an upstream moving target

The repo is explicitly aligning toward Readest while also using a local `foliate-js` checkout.

That creates two external pressures:

- Readest may evolve its own UI/behavior
- local `foliate-js` changes can affect reader behavior unexpectedly

So the project is not isolated from upstream movement even when network integrations are absent.

## 7. Persistence models are intentionally simple

Rust command APIs return `Result<_, String>` and store JSON files directly. This is pragmatic, but the current design may become a pain point if the app later needs:

- migrations
- richer error reporting
- sync-ready metadata
- stronger integrity checks

Today this is acceptable; longer term it may limit robustness.

## 8. Tutorial history is rich but expensive to maintain

The repo’s per-commit tutorial system is a strength, but it is also operational overhead:

- every slice requires a tutorial
- tutorial numbering must stay aligned
- long-term discoverability may degrade as `tutorials/commit/` grows

This is not a bug, but it is a maintenance concern.

## 9. Generated and heavyweight local directories are present in the repo working context

The codebase has active directories such as:

- `node_modules/`
- `.svelte-kit/`
- `src-tauri/target/`

This is normal locally, but broad scans and tooling need to avoid accidentally treating generated output as hand-maintained source.

## 10. Deprecated and transitional surfaces still exist

Examples:

- `src/lib/components/reader/ReaderWorkspace.svelte` is deprecated but still present
- some English labels remain in UI/test paths while the product is moving toward Chinese-facing copy
- parts of the layout shell still reflect an earlier scaffold stage

These are manageable, but they signal an ongoing transition rather than a fully settled product surface.
