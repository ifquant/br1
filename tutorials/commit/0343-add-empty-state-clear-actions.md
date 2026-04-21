# 0343 - 给空结果提示加入清除筛选动作

上一刀让空结果提示说清完整筛选条件。这一刀补恢复动作：用户不需要回到 header 找 chip 或 clear-all，在空结果卡片里就能直接清除筛选。

## 改了什么

- desktop library 的搜索空结果和普通筛选空结果都新增 `清除筛选` 按钮。
- web/sample library 的搜索空结果和普通筛选空结果也保持同样行为。
- 按钮复用现有 `handleClearLibraryFilters`，不会新增另一套状态恢复逻辑。
- web smoke 覆盖搜索空结果按钮可见，以及 stacked filter 空结果点击后恢复完整书架。
- parity audit 把 inline empty-state clear actions 纳入 Library Management 的恢复证据。

## 为什么这样做

空结果是用户最容易迷路的位置。既然页面已经知道当前筛选没有命中，就应该在同一个上下文提供恢复动作，而不是只依赖 header 上方的 chip。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有新增逐个条件的空状态内联移除按钮。
- 没有保存或恢复筛选视图。
- 没有改搜索、排序或 reader 打开逻辑。
