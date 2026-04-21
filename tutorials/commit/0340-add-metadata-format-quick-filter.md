# 0340 - 在书籍详情里加入格式快速过滤

上一刀把格式变成了 header 里的显式过滤维度。这一刀把同一个能力接进单本 metadata review 面板：用户看到一本书的格式时，可以直接从详情跳到同格式书籍集合。

## 改了什么

- `BookshelfPreview` 新增 `onFilterFormat` 回调。
- metadata panel 里的 `格式` 字段在可过滤时显示为按钮。
- `library/+page.svelte` 新增 `handleFilterByShelfFormat`，从详情触发时清空搜索、状态、归类和标签，只保留目标格式。
- web smoke 覆盖 `A Theory of Justice` 详情里的 `Filter by format EPUB`，并验证命中 `4 / 5`、PDF 书籍被排除、format chip 可移除。
- parity audit 把 metadata-panel format quick filtering 纳入 Library Management 证据。

## 为什么这样做

管理面里的 metadata 不应该只是静态描述。格式、归类、标签都是用户整理书库时会顺手切换的维度。归类和标签已经能从详情里快速过滤，格式也应该保持同一交互语义。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有做多格式批量操作。
- 没有做格式转换或格式迁移。
- 没有改 reader 对任一格式的打开逻辑。
