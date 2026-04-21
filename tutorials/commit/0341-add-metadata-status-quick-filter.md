# 0341 - 在书籍详情里加入状态快速过滤

这一刀继续补齐 metadata review panel 的管理动作。格式、归类、标签已经能从详情里快速过滤；现在状态也可以从详情跳到对应阅读状态集合。

## 改了什么

- `BookshelfPreview` 新增 `onFilterStatus` 回调。
- metadata panel 里的 `状态` 字段在能明确映射时显示为 quick-filter 按钮。
- 只接受 `在读 / 未开始 / 已读完` 这三类明确状态，避免把任意状态文案误当成过滤条件。
- 从详情触发状态过滤时，会清空搜索、格式、归类和标签，只保留状态条件。
- web smoke 覆盖 `Filter by status 未开始`、命中 `2 / 5`、排除进行中书籍、chip 移除。
- parity audit 把 metadata-panel status quick filtering 纳入 Library Management 证据。

## 为什么这样做

Library Management 的核心不是展示更多字段，而是让字段成为整理入口。状态字段尤其直接影响阅读队列：用户在详情里看到“未开始”，就应该能马上切到所有未开始的书。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有新增自定义阅读状态。
- 没有改 reader progress 到状态的分类规则。
- 没有做多选状态过滤或保存视图。
