# 0338 - 给书库增加格式过滤

这一刀继续收 Library Management 的管理面。之前书库已经能按格式排序，也能导入和打开多格式文件，但用户不能直接按格式把书库切开查看。现在把格式变成 header 里的显式过滤维度。

## 改了什么

- `LibraryHeader` 新增 `全部格式 / EPUB / PDF ...` 过滤胶囊。
- `library/+page.svelte` 基于当前书库计算格式选项和每种格式的数量。
- 格式过滤会参与继续阅读、最近阅读、待修复队列和主书架的统一筛选。
- 当前筛选说明和可移除 chip 现在包含 `格式 EPUB/PDF/...`。
- web smoke 覆盖格式过滤按钮、PDF 单格式命中和 chip 移除。
- parity audit 把 format filtering/counts 纳入 Library Management 已完成面。

## 为什么这样做

Readest parity 里的 library 不是只负责打开书。它需要成为一个能管理本地藏书的工作面。格式是本地书库最基本的管理维度之一，尤其 br1 已经在推进 EPUB/PDF/secondary formats，因此格式不能只藏在排序菜单里。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有改格式解析或 reader 打开链路。
- 没有增加格式批量迁移或转换能力。
- 没有把格式过滤扩展成保存视图或多选过滤。
