# 0339 - 给书库状态过滤增加数量

这一刀继续把 library 从入口页收成管理面。`全部 / 在读 / 未开始 / 已读完` 之前已经能过滤，但用户只能点进去之后才知道每个状态里有多少书。现在状态过滤本身显示数量。

## 改了什么

- `LibraryHeader` 的状态过滤按钮新增可见数量。
- `library/+page.svelte` 基于当前书库计算 `all / reading / unstarted / finished` 计数。
- 计数使用同一套状态判断逻辑，避免“按钮数量”和实际筛选结果分叉。
- web smoke 覆盖样例书库的 `全部 5 本 / 在读 2 本 / 未开始 2 本 / 已读完 1 本`。
- parity audit 把 per-status counts 纳入 Library Management 的过滤证据。

## 为什么这样做

书库管理里的状态不是装饰标签，而是用户整理阅读队列的核心维度。过滤按钮直接带数量后，用户能先判断库存结构，再决定是否切换筛选。

这也让状态过滤和上一刀的格式过滤保持同一产品语义：每个过滤维度都应该有可见选项和可见数量。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有新增多选状态过滤。
- 没有保存筛选视图。
- 没有改 reader progress 的判定规则。
