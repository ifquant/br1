# 0645 Extract Reader Workspace Mode Resolution

## 背景

Reader route 已经连续抽出了 current-book persistence、translation ownership 和 TTS ownership。剩下的一个明显耦合点是工作台模式：`+page.svelte` 同时决定 notebook tab、URL `workspace` 参数、TTS/translation 路由参数，以及从翻译模式跳到译文朗读时是否保留专用工作台语义。

这个提交把这些“纯决策”移到 `src/lib/reader/workspaceMode.ts`，让 route 继续负责 `localStorage`、`goto(...)` 和组件事件协调。

## 主要目标

- 集中 notebook tab 到 dedicated workspace route 的映射。
- 保留显式 URL `workspace` 的优先级，避免被 notebook shell restore 覆盖。
- 保留从翻译模式跳入译文朗读时的 dedicated `workspace=tts&tts=translated` 合约。
- 保留回到普通笔记 tab 时清理 dedicated workspace route state 的行为。

## 改动概览

- 新增 `workspaceMode.ts`，提供 notebook tab 归一化、shell restore、route request、route override application、translated TTS workspace request 等纯函数。
- `src/routes/reader/+page.svelte` 改为调用 helper 生成 route request，再由 route 自己调用 `toReaderWorkspaceModeHref(...)` 和 `goto(...)`。
- `tests/e2e/library-smoke.spec.ts` 加强 URL 断言，覆盖翻译模式跳转到译文朗读后仍保持 dedicated workspace 参数，以及回到笔记后清理 `tts` 参数。

## 关键知识

- URL 是跨刷新、跨入口恢复 dedicated workspace 的权威输入。只要 URL 明确带了 `workspace=translation` 或 `workspace=tts`，它就应该覆盖本地保存的 notebook shell tab。
- 纯 helper 不应该调用 Svelte store、`localStorage` 或 `goto(...)`。这样 helper 可以稳定表达“应该打开哪个模式、应该写入哪些 route 参数”，而实际导航副作用仍留在 route 边界。
- `ta` 翻译历史参数只在 translation workspace 或 translated TTS workspace 有意义。普通 notes/highlights/assistant/sync tab 必须清掉这些 dedicated route 参数，否则折叠回普通 notebook 后会留下过期深链状态。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader restores dedicated tts read-aloud mode from route state in web mode|reader can jump from translation mode into translated tts in web mode"` PASS，3 passed。

## 未覆盖项

- 没有执行 Task 5 final sweep。
- 没有新增独立 unit test；本 slice 依赖现有 focused Playwright route/workspace smoke 覆盖。
