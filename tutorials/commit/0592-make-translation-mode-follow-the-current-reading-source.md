# 0592 Make translation mode follow the current reading source

## Why this change exists

`P5` turned translation into a dedicated notebook tab, but the tab still behaved too much like a detached request form:

- the reader had to infer whether translation was following the live reading source or just holding stale text
- the mode did not expose an explicit lock/resume contract
- when no live source was available, the distinction between “follow the book” and “type custom text” was not productized

This slice makes translation mode read like a real reading mode instead of a renamed sidebar request surface.

## What changed

- add route-owned translation source follow state so dedicated `翻译模式` can default to the current reading source
- pass explicit source label, follow state, and lock/resume callbacks through the notebook into `ReaderAssistWorkspace`
- show a dedicated `翻译模式阅读来源状态` strip inside the translation workspace
- make the translation source textarea read-only only when a real live source is available, while still allowing manual text entry when the reader has nothing live to follow
- add explicit `锁定当前翻译目标` and `回到当前阅读位置` actions
- update the translation-mode smoke so it verifies follow state, lock state, and resume state
- record the shipped slice in the Readest alignment checklist

## Why this shape

This is a reading-mode ownership slice, not inline translation yet:

- no new translation provider behavior
- no live DOM block translation
- no Tauri trust-boundary changes

The goal is to make dedicated translation mode honest about what source it is translating, and to let the reader intentionally switch between live-following and a locked translation target.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no inline paragraph translation in the reading surface
- no cross-book translation archive browsing
- no media-session or TTS follow-up work for the separate `朗读模式` line
