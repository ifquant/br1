# 0587 Make the notebook summary follow the active AI tab

## Why this change exists

The AI notebook already had deeper structure:

- tab-specific workspace bodies
- current-book scope summaries
- overview and focused-lane separation

But the notebook's own summary strip still used one generic assistant line. That made the top-level shell lag behind the more precise contracts already present inside `AI 助手` and `翻译模式`.

This slice closes that mismatch by letting the notebook summary change with the active AI tab.

## What changed

- make the notebook summary show current-book lookup/translation counts and assistant status when `AI 助手` is active
- make the notebook summary show translation-specific scope and reading-mode framing when `翻译模式` is active
- keep the old generic notebook summary for the non-AI tabs
- extend the AI-workspace and translation-mode smokes so they verify the top summary strip
- record the slice in the Readest alignment checklist

## Why this shape

This is a top-shell projection pass:

- no storage changes
- no AI request/provider changes
- no lane navigation changes

The goal is only to stop the notebook summary bar from staying more generic than the active workspace underneath it.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can open translation mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no history persistence or provider-layer changes
- no conversation-thread model beyond the current notebook archives
