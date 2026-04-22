# 0442 - 把 library page surface assembly 收进 shared surface model

上一刀已经把 desktop/starter 两条 `LibraryBrowseBody` 渲染路径收成了一条，并把 body-level surface assembly 推进到了 shared builder。

但 `+page.svelte` 里还剩下一层 page-level 装配：

- 一边 build `LibraryPageChromeModel`
- 一边 build desktop/starter `LibraryBrowseBodySurfaceModel`
- 最后再自己选出当前 active surface，分别喂给 `LibraryPageChrome` 和 `LibraryBrowseBody`

也就是说，route 虽然已经不再维护两条 body render branch，但仍然同时扮演：

- chrome surface assembler
- body surface assembler
- current page surface selector

这层 page composition 继续留在 route，会让 `+page.svelte` 依然承担过多“页面装配器”职责。

## 这刀做了什么

1. 新增 [`src/lib/library/surface.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/surface.ts)

   这个新模块现在承接 page-level surface assembly：

   - `buildDesktopLibraryPageSurfaceModel(...)`
   - `buildStarterLibraryPageSurfaceModel(...)`
   - `createEmptyLibraryPageSurfaceModel(...)`

   它把现有的 shared chrome builder 和 shared body-surface builder 再往上收一层，形成真正的 page-surface model。

2. 扩展 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)

   新增 `LibraryPageSurfaceModel`：

   - `chrome`
   - `body`
   - `supportsDesktopBookActions`

   这样 page-level 差异不再散落在 route 里，而是作为显式页面 surface 数据的一部分存在。

3. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再：

   - separately build `libraryPageChromeModel`
   - separately build active body surface model
   - 在模板里再手工拼 `desktopLibraryMode ? ... : ...`

   而是改成：

   - build `desktopLibraryPageSurfaceModel`
   - build `starterLibraryPageSurfaceModel`
   - 选出 `activeLibraryPageSurfaceModel`
   - `LibraryPageChrome` 和 `LibraryBrowseBody` 都直接消费这组 active page surface

   同时，当前 browse state 也被收成了显式 `currentLibraryBrowseState`，不再每次通过临时 helper 对象重组。

## 为什么这刀重要

这刀把 library route 又往“状态 + 行为 wiring”推进了一层。

到这里，route 已经不只是：

- 不再维护 desktop/starter 两套 body 模板
- 不再自己写 lifecycle runtime

还开始不再自己同时维护 chrome surface 和 body surface 的装配关系。

这让后续如果要继续收 `LibraryPageChrome + LibraryBrowseBody + scroll viewport` 这一层 page composition，就已经有了 shared page-surface model 作为更高一级的边界，而不是继续从 route 里拆散件。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `LibraryPageChrome`、`OverlayScrollbarsComponent` 和 `LibraryBrowseBody` 还没有继续收成更高一层 page shell/component
- route 仍然保留页面动作、filter mutation、desktop-only metadata/remove/source-path handler 等 controller 职责
