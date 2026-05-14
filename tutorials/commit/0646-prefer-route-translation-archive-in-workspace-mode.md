# 0646 Prefer Route Translation Archive In Workspace Mode

## 背景

Task 4 把 dedicated workspace mode 的纯决策抽到了 `workspaceMode.ts`。代码质量 review 发现一个小边界：从翻译模式跳入译文朗读时，如果 URL 里显式带了 `ta`，但本地选中的翻译历史记录是另一个 id，helper 应该相信 URL。

这个提交只修这个 precedence 问题，不进入 Task 5 的 route sweep。

## 主要目标

- 让 explicit route `ta` 在 `resolveReaderTranslatedTtsWorkspaceRequest` 中优先于 ambient selected archive state。
- 用纯 unit test 锁住这个 route override precedence。
- 保留没有 route `ta` 时继续回退到当前 selected archive 的行为。

## 改动概览

- 调整 `resolveReaderTranslatedTtsWorkspaceRequest` 的 archive id 选择顺序，先读 `routeOpenState.translationHistoryEntryId`，再读 `selectedTranslationHistoryEntryId`。
- 新增 `workspaceMode.test.ts`，覆盖 route archive id 与 selected archive id 分歧时 route 优先，以及 route 缺失时 selected archive fallback。

## 关键知识

- Route state 是可分享、可刷新恢复的显式用户意图；local selection 更像当前 shell 的环境状态。两者冲突时，route-owned state 应该优先。
- 这种 precedence 适合放在纯 helper unit test 里验证，因为它不需要浏览器、Svelte store 或 `goto(...)`，只需要输入对象和输出 route request。

## 验证

- `./node_modules/.pnpm/node_modules/.bin/tsx --test ./src/lib/reader/workspaceMode.test.ts` PASS，2 tests passed。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader restores dedicated tts read-aloud mode from route state in web mode|reader can jump from translation mode into translated tts in web mode"` PASS，3 passed。

## 未覆盖项

- 没有执行 Task 5 final reader route sweep。
- 没有扩展 broad E2E；这个 slice 的新增覆盖保持在 pure unit level。
