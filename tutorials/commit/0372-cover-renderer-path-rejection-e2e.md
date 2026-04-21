# 0372 Cover Renderer Path Rejection E2E

This slice adds a desktop WebDriver regression for the library trust boundary.

## Why this matters

The Tauri command layer must not treat renderer-supplied path strings as filesystem authority. Unit tests already cover the pure helper contracts, but the important integration risk is whether the desktop invoke surface still rejects untrusted paths at runtime.

This regression verifies that untrusted renderer-controlled paths are rejected for:

- library import
- library book binary reads
- library file fingerprints
- cover data URL loading
- repair candidate preview
- restore lookup

## What changed

The Tauri side now exposes two `webdriver`-only helpers:

- `trust_library_import_paths_for_webdriver`
- `probe_untrusted_library_paths_for_webdriver`

They are compiled only for the WebDriver test feature. Production builds do not expose these commands.

The e2e import helper now registers fixture paths through the WebDriver-only trust command before calling `import_library_books`. That keeps happy-path tests aligned with the real product rule: import paths must come from a Tauri-owned trust source.

The new security e2e uses the probe command to assert that untrusted renderer paths hit the same Rust trust-boundary errors without letting WebDriver turn expected Tauri `Err` values into protocol failures.

## Verification

Run the narrow desktop regression:

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "rejects renderer-controlled library paths"
```

Expected result: the single WebDriver test passes.

## Takeaway

For expected-failure Tauri command checks, avoid asserting through raw WebDriver `execute` rejected commands. A test-only Rust probe can return structured rejection details while still exercising the same trust-boundary helpers.
