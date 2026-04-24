# 0543 Turn Translation Into A Dedicated Reader Mode

## Why

`br1` already had translation plumbing, but it still behaved like a sub-mode inside the AI assistant workspace. That was still too close to a request panel. This slice promotes translation into a reader-facing mode with its own entry point and a clearer source/translated surface, while deliberately leaving TTS semantics for the next adjacent commit.

## What changed

- added a dedicated `翻译模式` notebook tab and toolbar entry in [`/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
- expanded [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte) so the notebook can host translation as a first-class workspace, separate from the broader `AI 助手` tab
- taught [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte) to run in a locked translation mode and show explicit `原文` / `译文` panels instead of only generic result copy
- added a focused smoke in [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) that locks the new dedicated translation entry and notebook presentation

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"` PASS
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` PASS

## Not included

- this slice does not yet change TTS follow-current-location, media-session, or back-to-current-reader semantics
- this slice does not reopen DeepL/Yandex provider ownership or any Tauri-side network boundary work
