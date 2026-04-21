# 0346 - 在书库头部显示格式库存摘要

书库已经有格式过滤和每种格式的数量，但摘要区还没有格式库存总览。这一刀补上 `格式 2 种 · 主 EPUB 4 本`，让用户不用扫过滤按钮也能看到当前书库的格式结构。

## 改了什么

- `LibraryHeader` 新增 `formatSummary` 展示位。
- `library/+page.svelte` 基于当前书库统计格式种类和占比最高的格式。
- web smoke 覆盖样例书库的 `格式 2 种 · 主 EPUB 4 本`。
- parity audit 把 header-level format inventory summary 纳入 Library Management 证据。

## 为什么这样做

格式是本地书库管理的基础维度，尤其 br1 已经在收多格式支持。过滤按钮解决“怎么切换”，摘要解决“当前库存结构是什么”。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有新增格式多选过滤。
- 没有做格式转换或批量迁移。
- 没有改 reader 打开或格式解析逻辑。
