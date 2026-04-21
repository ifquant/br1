# 0337 - 在书库头部显示封面覆盖率

上一刀已经把单本详情里的封面状态显性化。这一刀继续收 Library Management 的 cover 管理前置面：在书库头部显示整体封面覆盖率，让用户不用逐本打开详情也能知道当前书库封面资产是否完整。

## 改了什么

- `LibraryHeader` 新增 `coverSummary` 展示位。
- `library/+page.svelte` 基于当前书库记录计算 `封面 X / N 已设置`。
- 当存在缺封面书籍时，摘要会显示 `N 本使用标题封面`。
- web smoke 覆盖样例书库的 `封面 5 / 5 已设置`。
- parity audit 把 header-level cover coverage 纳入 Library Management 已完成面，同时继续保留 full cover editing/replacement 缺口。

## 为什么这样做

封面管理不能直接从“能显示封面”跳到“替换封面”。中间至少需要两个产品面：

- 单本详情知道这本书有没有封面。
- 书库级摘要知道整个库的封面完整度。

这一刀只补第二层，不扩大到文件写入、封面复制、旧封面清理或 metadata 迁移。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 还没做

- 没有做封面替换。
- 没有做封面清除或从原文件重建。
- 没有增加缺封面专项筛选。
- 没有做在线目录或远端封面拉取。
