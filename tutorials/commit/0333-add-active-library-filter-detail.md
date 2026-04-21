# 0333 - 显示当前书库筛选条件

书库 header 现在已经有筛选按钮、每项数量、集合总数和命中数，但启用筛选后用户仍然只能从按钮状态推断当前叠了哪些条件。这一轮补一个明确的 `当前筛选` 文案，让搜索、阅读状态、归类和标签条件都能被直接读出来。

## 改了什么

- `LibraryHeader` 新增 `activeFilterDetail` 展示位。
- library page 根据当前 search/status/collection/tag 派生 `当前筛选：...`。
- 详情面板快捷筛选触发后，会显示 `当前筛选：归类 ...` 或 `当前筛选：标签 ...`。
- web smoke 覆盖状态筛选、metadata 归类快捷筛选、metadata 标签快捷筛选三种 detail 文案。

## 为什么这样做

命中数回答的是“还有多少本”，但没有回答“为什么只剩这些书”。当前筛选明细把条件解释放在 header 内，和 `清除筛选` 形成闭环：用户能看到筛选原因，也能一次恢复完整书库。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有做逐条件删除 chip。
- 没有做多选筛选。
- 没有做批量重命名、独立 collection/tag 管理页、cover editing、在线目录或同步能力。
