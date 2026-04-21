# 0331 - 给归类和标签筛选增加数量

上一轮 header 已经能展示归类和标签的整体摘要，但每个筛选按钮仍然只是名字。现在每个 collection/tag 筛选项都会显示它覆盖的书籍数量，让用户在点进去之前就知道这个管理入口的规模。

## 改了什么

- `LibraryHeader` 新增 `collectionOptionCounts` 和 `tagOptionCounts`。
- collection/tag filter pill 保留原始筛选值，同时额外渲染 `N 本`。
- library page 从当前本地书库或样例书库计算每个归类和标签的数量。
- web smoke 覆盖 `政治哲学 2 本`、`正义论 1 本` 等带数量的筛选入口。

## 为什么这样做

这一步避免把显示文案混进筛选状态：按钮仍然用原始 collection/tag 值触发筛选，数量只是可见管理信息。用户能快速判断某个标签是不是只有一本书，或者某个归类是不是已经聚合出一个真实书架。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有做多选筛选。
- 没有做批量重命名或独立 collection/tag 管理页。
- 没有做 cover editing、在线目录或同步能力。
