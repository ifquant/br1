# 0585 Add current-book scope summaries to AI tabs

## Why this change exists

By this point, the AI notebook had good deep structure:

- the current-book archive overview was a real section
- focused lookup and translation lanes had explicit notebook navigation
- current record and history list were already separated

But the moment the reader first entered `AI 助手` or `翻译模式`, the top of the workspace still did not clearly state the current-book scope. That framing only became obvious after reading deeper sections.

This slice closes that gap by adding explicit current-book scope summaries right under the workspace title.

## What changed

- add a top-level `AI 工作台范围摘要` that states the current book's lookup and translation counts
- add a top-level `翻译模式范围摘要` that states the current book's translation scope and result shape
- extend the AI workspace and translation-mode notebook smokes so they verify the new scope summaries
- record the slice in the Readest alignment checklist

## Why this shape

This is a top-level framing pass:

- no history storage changes
- no lane navigation changes
- no provider or replay changes

The goal is only to make the assistant and translation tabs self-describing as soon as they open, instead of relying entirely on deeper notebook sections to explain the current-book scope.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell|reader can open translation mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no history persistence or provider-layer changes
- no conversation-thread model beyond the current notebook archives
