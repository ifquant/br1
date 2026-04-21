# 0345 - 复用空结果筛选恢复片段

上一刀把空结果里的逐条件 chip 补齐后，desktop 和 web/sample 的搜索空结果、普通筛选空结果里出现了四份相同恢复 UI。这一刀不改产品行为，只把重复片段收成一个 Svelte snippet。

## 改了什么

- 在 library 页面内新增 `emptyFilterRecovery` snippet。
- 空结果里的 active filter chips 和 `清除筛选` 按钮统一由这个 snippet 渲染。
- 保留现有 `clearLibraryFilterById` 和 `handleClearLibraryFilters` 行为，不新增第二套状态逻辑。
- parity audit 标注 empty-state chip removal 现在走 shared recovery rendering。

## 为什么这样做

Library Management 还会继续收口，如果空结果恢复 UI 保持四份重复，后续每加一个恢复动作都容易漏改某条路径。先把结构收紧，后面继续加细节时风险更低。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有新增新的用户可见能力。
- 没有改筛选规则、搜索、排序或 reader 打开逻辑。
- 没有提取成跨组件公共组件；当前只在 library 页面内复用。
