# 0588 Remove overview semantics from dedicated translation mode

## Why this change exists

The dedicated `翻译模式` workspace is already a locked notebook mode. It does not expose the current-book AI overview as a parent state.

But its breadcrumb and browse controls still implied that parent existed:

- the breadcrumb started with `本书 AI 记录摘要`
- the lane could expose a `返回本书 AI 记录摘要` action

That made the navigation contract lie about what the user could actually do.

This slice closes that mismatch by giving dedicated translation mode its own top-level breadcrumb semantics and removing the fake return path.

## What changed

- make the translation-mode breadcrumb start from `翻译模式` instead of `本书 AI 记录摘要`
- stop rendering the `返回本书 AI 记录摘要` browse-position action in locked translation mode
- extend the translation-mode smoke so it verifies the new breadcrumb and the absence of the fake return action
- record the slice in the Readest alignment checklist

## Why this shape

This is a navigation-contract repair:

- no translation history storage changes
- no replay changes
- no provider or result-surface changes

The goal is only to stop the dedicated translation workspace from advertising a parent overview state that does not exist in that mode.

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open translation mode as a dedicated notebook tab"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browsing
- no history persistence or provider-layer changes
- no conversation-thread model beyond the current notebook archives
