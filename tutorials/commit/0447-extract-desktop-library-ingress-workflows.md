# 0447 - 把 desktop library ingress workflow 抽出去

上一刀已经把 desktop maintenance flow 从 route 下沉到了 `library/desktopMaintenance.ts`。

但 `+page.svelte` 里还剩另一大簇 desktop business flow：

- `loadLibrary()`
- desktop picker import
- Readest migration

这几条不是 maintenance，而是 desktop library 的 ingress / boot / import 流程。继续留在 route 里，会让 `+page.svelte` 仍然亲自负责：

- 首次装载书库
- 自动触发 Readest 兼容导入
- 桌面导入后的 reload 和首本书打开
- migration notice 和 visibility state

## 这刀做了什么

1. 新增 [`src/lib/library/desktopIngress.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopIngress.ts)

   这个新模块现在承接 desktop library 的 ingress workflow：

   - `loadDesktopLibrarySurface(...)`
   - `importDesktopLibraryBooks(...)`
   - `migrateDesktopReadestLibrary(...)`
   - `describeReadestMigrationResult(...)`

   也就是说，desktop library 的启动、导入、Readest 兼容这条主线已经开始有独立模块边界。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再内联：

   - `loadLibrary()` 里对 Readest summary、空书库自动兼容导入、records reload 的处理
   - desktop import picker 成功/空结果/错误分支
   - Readest migration 的 message 拼装、reloadAfterImport 分支、首本书打开逻辑

   route 现在只保留：

   - callback / setter / runtime wiring
   - 桌面环境边界
   - 页面状态本身

## 为什么这刀重要

这一刀和上一刀连起来，route 里最重的 desktop business flow 已经被拆成两块共享模块：

- `desktopMaintenance.ts`
- `desktopIngress.ts`

到这里，`+page.svelte` 里真正剩下的 route-local 逻辑已经越来越偏 controller/runtime host，而不再是完整的桌面书库业务流程实现。

这意味着后面如果继续大力度推进，最自然的方向就不再是“再抽一点模板”，而是把剩余的 record lookup / repair eligibility / recovery queue domain helper 再收成 shared domain/controller layer。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- persisted-record lookup、broken/bulk-repair eligibility、manual-relink review 这组 domain helper 仍然留在 route
- route 仍然保留 page-level runtime host、scroll context、以及 open-source-path 这种环境侧行为
