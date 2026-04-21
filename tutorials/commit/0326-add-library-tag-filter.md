# 0326 - 增加本地标签筛选

上一轮把 `tags` 做成了可编辑、可搜索、可持久化的本地元数据。这次把它推进成可操作的书库管理入口：library header 会根据当前书库生成 tag filter，用户可以按单个标签收窄 `待修复书籍 / 继续阅读 / 最近阅读 / 你的书库`。

## 改了什么

- `LibraryHeader` 新增 `tagOptions`、`activeTagFilter` 和 `tagfilterchange` 事件。
- library page 从当前书库派生去重排序后的 tag options。
- tag filter 与现有状态筛选、collection filter 组合生效。
- scroll restoration key 纳入 tag filter，避免不同标签视图复用错误滚动位置。
- web smoke 覆盖唯一标签 `正义论`，验证它只留下 `A Theory of Justice`。

## 为什么这样做

标签只保存但不能筛选时，仍然只是 metadata 陈列。Readest parity 的 library 管理面需要能把这些字段变成实际工作流：按主题、用途或复核状态快速收窄书库。

这次仍然不做完整 tag manager，原因是那会扩大到批量编辑、重命名、删除确认和迁移规则。单标签筛选是低风险的下一步：

- 不引入 P2 服务能力。
- 不改变现有 `library.json` schema。
- 复用上一轮已经验证过的 tags 数据模型。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有多选标签筛选。
- 没有 tag rename、batch tagging 或 tag management page。
- 没有在线 catalog 自动补标签。
- 没有 cover editing。
