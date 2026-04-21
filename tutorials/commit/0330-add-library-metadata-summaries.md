# 0330 - 增加书库归类和标签摘要

上一轮已经让 metadata panel 里的归类和标签可以直接筛选。这一轮继续把 collection/tag 从“几个按钮”推进成更像管理对象的界面：用户打开书库时能看到当前归类和标签的整体规模，以及最密集的归类或标签。

## 改了什么

- `LibraryHeader` 新增 `collectionSummary` 和 `tagSummary` 展示槽。
- library page 根据当前本地书库或样例书库计算：
  - 归类总组数
  - 最大归类及其书籍数量
  - 标签总数
  - 最高频标签及其书籍数量
- web smoke 覆盖样例书库的归类摘要和标签摘要，避免这个管理信息退化成静态装饰。

## 为什么这样做

Readest 级别的 library 不只是能搜索或筛选，还要让用户理解自己的书库结构。这个摘要层不引入新模型、不改变持久化格式，但把 collection/tag 的当前状态显性化，为后续完整 collections/tags 管理面留下清晰入口。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有做独立 collection/tag 管理页。
- 没有做多选筛选或批量重命名。
- 没有做 cover editing、在线目录或同步能力。
