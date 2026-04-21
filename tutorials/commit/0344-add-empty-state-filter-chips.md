# 0344 - 在空结果里显示可移除筛选条件

上一刀给空结果加入了一键 `清除筛选`。这一刀继续补更细的恢复动作：空结果卡片直接显示当前 active filter chips，用户可以只移除其中一个条件。

## 改了什么

- 抽出 `clearLibraryFilterById`，让 header chip 和空结果 chip 复用同一套状态恢复逻辑。
- desktop 和 web/sample 的搜索空结果、普通筛选空结果都显示当前筛选 chip。
- 每个空结果 chip 都能单独移除搜索、状态、格式、归类或标签条件。
- web smoke 覆盖搜索空结果里移除搜索条件，以及 stacked filter 空结果里只移除 `格式 PDF` 后恢复到 `状态 在读`。
- parity audit 把 per-condition empty-state chip removal 纳入 Library Management 恢复证据。

## 为什么这样做

空结果通常不是“全部错了”，而是某一个条件把结果清空了。只提供一键清空会让用户丢掉仍然有用的筛选上下文；逐个 chip 可以保留有价值的条件。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有保存筛选组合。
- 没有多选格式/状态/标签。
- 没有改搜索、排序、reader 打开或 progress 状态逻辑。
