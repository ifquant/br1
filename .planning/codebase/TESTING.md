# br1 Testing

## Summary

`br1` currently relies more on smoke/regression coverage than on deep unit testing. The strongest automated protection is around desktop reader flows, because that is where the app’s highest-risk behavior lives.

## Main Verification Commands

- `pnpm check` — Svelte/type correctness baseline
- `pnpm test:e2e` — Playwright web smoke
- `pnpm test:e2e:tauri` — desktop WebDriver flow
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts ..."` — targeted desktop regression execution

## Web Smoke Coverage

Playwright coverage lives in:

- `tests/e2e/library-smoke.spec.ts`

Current focus:

- library page loads
- expected headings render
- import/open links exist in web mode

This is useful as a shell sanity check, but it is not the main confidence source for reader correctness.

## Desktop Regression Coverage

Primary desktop suite:

- `e2e/app.e2e.ts`

This suite covers higher-value Tauri flows such as:

- opening the first library book in a separate reader window
- reopening restorable EPUB books
- reopening restorable PDF books
- search cache behavior on disk
- geometry / stage-placement checks
- note/bookmark-related behavior where applicable

The suite interacts with actual desktop windows via WebdriverIO.

## Desktop Test Harness

Driver bootstrap script:

- `scripts/automation/test-tauri-webdriver.sh`

What it does:

- starts Vite dev server
- starts `pnpm tauri dev --features webdriver`
- waits for the WebDriver server
- runs the supplied WebdriverIO command

This script is effectively the standard local desktop regression harness.

## What Is Not Strongly Tested

- no visible unit-test suite for controllers or services
- no Rust `cargo test` suite in active use
- no snapshot-based component tests
- no strong contract tests for Readest import edge cases
- no dedicated regression for every newly added view-menu option

## Testing Style in Practice

The repo often adds one focused regression when a bug or fragile behavior is fixed, instead of building a broad test matrix first.

That means current testing style is:

- high-signal scenario checks
- desktop-first regression locking
- relatively little isolated pure-function coverage

## Important Test-Relevant Files

- `wdio.conf.ts`
- `playwright.config.ts`
- `e2e/app.e2e.ts`
- `tests/e2e/library-smoke.spec.ts`
- `scripts/automation/test-tauri-webdriver.sh`

## Manual Verification Still Matters

Because the app is a visual desktop reader, many changes are still validated manually in practice, especially for:

- Readest visual alignment
- window chrome behavior
- separate reader window feel
- hover/show timing
- real-book rendering quality

## Testing Risk Summary

The project has a meaningful regression baseline, but it is still skewed toward end-to-end smoke checks. The absence of controller-level and Rust-level tests means internal refactors can pass smoke coverage while still leaving subtle state or persistence issues behind.
