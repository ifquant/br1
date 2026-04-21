# 0342 - 让空结果提示说清完整筛选条件

前几刀把 library 的筛选维度扩到了状态、格式、归类和标签。原来的空结果提示仍然主要按状态描述，遇到 `状态 在读 / 格式 PDF` 这种组合条件时会误导用户。

## 改了什么

- 新增 `getLibraryEmptyFilterTitle`，从 `当前筛选：...` 生成完整空结果标题。
- desktop 和 web/sample 两条 library 路径都显示空结果提示。
- 搜索空结果会提示移除搜索条件，普通筛选空结果会提示切回 `全部 / 全部格式 / 全部归类 / 全部标签`。
- web smoke 覆盖 `搜索 does-not-exist / 状态 在读` 和 `状态 在读 / 格式 PDF` 两种空结果提示。
- parity audit 把 full-condition empty-result messaging 纳入 Library Management 证据。

## 为什么这样做

筛选越完整，空结果越需要解释清楚。否则用户看到“在读 当前没有匹配的书”时，可能不知道真正把结果清空的是搜索词、格式、归类还是标签。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有新增保存筛选视图。
- 没有新增空结果里的内联清除按钮；仍沿用 header 的 removable chips 和 clear-all。
- 没有改任何 reader 打开或 progress 状态逻辑。
