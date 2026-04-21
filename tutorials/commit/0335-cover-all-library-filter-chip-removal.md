# 0335 - 覆盖所有书库筛选 chip 的移除路径

上一轮实现了可单独移除的筛选 chip，但 web smoke 只证明了 `状态 未开始` 这一种。这里补完整证据，确保搜索、状态、归类和标签四类条件都能单独撤掉。

## 改了什么

- web smoke 继续保留 `状态 未开始` chip 移除覆盖。
- 新增 `归类 政治哲学` chip 移除覆盖，确认继续阅读书籍恢复。
- 新增 `标签 正义论` chip 移除覆盖，确认筛选摘要消失。
- 新增 `搜索 does-not-exist` chip 移除覆盖，确认搜索条件移除后仍保留 `状态 在读`。
- 将 `在读` 状态按钮断言改成 `exact: true`，避免新的 active-filter chip 文案扩大 role selector 匹配范围。

## 为什么这样做

实现层已经支持四类 chip，但 P0 收口需要自动化证据跟上。这个测试切片把 chip 移除从“单例可用”推进成“完整筛选条件矩阵可用”，不再只依赖读代码推断。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有新增 runtime 状态模型。
- 没有做多选筛选。
- 没有做批量重命名、独立 collection/tag 管理页、cover editing、在线目录或同步能力。
