# 0450 - 把 library page action wiring 收到 shared action model

前几刀已经把 `+page.svelte` 里的大块业务和投影逻辑持续抽走了：

- `desktopMaintenance.ts`
- `desktopIngress.ts`
- `desktopRecords.ts`
- `desktopCatalog.ts`

但 route、`LibraryPageHost`、`LibraryPageSurface` 三层之间还保留着另一种噪音：

- 一长串并行 callback props
- query/filter/browse 的 action wiring
- notice/import/desktop book actions 的逐层透传

这些并不会增加产品能力，只会让 page shell 层继续背一个很厚的 prop matrix。

## 这刀做了什么

1. 在 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts) 新增 `LibraryPageActions`

   这个 shared action model 统一承接 library page 需要暴露给 host/surface 的交互入口：

   - query / filter / clear-filter
   - browse dispatch / jump-trail
   - import / readest migration
   - notice run / clear
   - open link / open source path
   - update / remove desktop book
   - sort / view-mode

   同时也把书籍 metadata 更新 payload 抽成了 `LibraryBookMetadataUpdate`。

2. 收薄 [`src/lib/components/library/LibraryPageHost.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageHost.svelte)

   `LibraryPageHost` 不再逐个声明和转发几十个 action prop，而是直接吃一个 `actions` 对象，再把它交给 `LibraryPageSurface`。

3. 收薄 [`src/lib/components/library/LibraryPageSurface.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageSurface.svelte)

   `LibraryPageSurface` 也不再自己持有完整 callback prop matrix，而是围绕 `actions` 做事件适配，再按需要把对应 action 分发给：

   - `LibraryPageChrome`
   - `LibraryBrowseBody`

4. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再在模板里展开整串 `onQueryChange / onFilterChange / onJumpTrail / onSortChange / ...`，而是先组装 `activeLibraryPageActions`，再一次性交给 `LibraryPageHost`。

## 为什么这刀重要

这一刀没有增加新功能，但它把 library page shell 的职责边界又往前推了一步：

- route 负责状态和具体 handler
- `LibraryPageActions` 负责交互契约
- host/surface 负责消费这份契约，而不是继续传递一大串散装 prop

到这里，library page 的“数据模型”和“动作模型”都已经开始成形：

- `LibraryPageSurfaceModel`
- `LibraryPageActions`

这让后面如果继续大力度推进，更自然的方向就不再是继续手工削模板，而是把剩余的 route-local controller/runtime 协调再往 shared coordinator 收。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `activeLibraryPageActions` 目前仍然在 route 内组装，还没有进入更高一层 shared page controller/coordinator
- route 仍然保留 page-level runtime、scroll context 和一批 desktop environment boundary
