# 0441 - 把 library body surface assembly 收进 shared builder

上一刀已经把 library page 的 lifecycle runtime 从 route 抽进了 `library/runtime.ts`。  
但 `+page.svelte` 里还剩一块明显的 body-level surface wiring：

- desktop body model 一套
- starter body model 一套
- desktop `LibraryBrowseBody` 渲染分支一套
- starter `LibraryBrowseBody` 渲染分支一套

也就是说，route 虽然已经不再自己写大块 body 模板，但仍然同时负责：

- build desktop/starter body model
- 决定当前 browse books / shelf books
- 决定当前 shelf section title
- 维护两条几乎平行的 `LibraryBrowseBody` render path

这让 route 继续承担了太多“body surface 装配”职责。

## 这刀做了什么

1. 扩展 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)

   新增 `LibraryBrowseBodySurfaceModel`，把 body surface 需要的一组共享数据收成显式模型：

   - `body`
   - `groupedBrowseMode`
   - `browseState`
   - `browseBooks`
   - `viewMode`
   - `shelfBooks`
   - `shelfSectionTitle`

2. 扩展 [`src/lib/library/body.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts)

   在已有的 desktop/starter body-model builder 之上，再加两层 surface builder：

   - `buildDesktopLibraryBrowseBodySurfaceModel(...)`
   - `buildStarterLibraryBrowseBodySurfaceModel(...)`

   这两层 builder 现在同时负责：

   - 调用原有 body-model builder
   - 组装当前 browse/shelf books
   - 带上 grouped browse 状态
   - 统一给出当前 shelf section title

3. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再：

   - separately build `desktopBrowseBodyModel`
   - separately build `starterBrowseBodyModel`
   - 写两条 desktop/starter `LibraryBrowseBody` 分支

   而是改成：

   - build `desktopBrowseBodySurfaceModel`
   - build `starterBrowseBodySurfaceModel`
   - 选出当前 `activeBrowseBodySurfaceModel`
   - 只渲染一条 `LibraryBrowseBody`

## 为什么这刀重要

这刀继续把 library route 从“负责 desktop/starter 两套 page assembly”往“选择当前 mode surface 并接行为回调”收。

到这里，route 不只把 chrome、empty state、body model、runtime helper 逐步共享化了，还进一步把 body-level surface 选择也推到了 shared builder 层。

这有两个直接效果：

1. desktop/starter body surface 的差异开始更多地被表达成数据模型差异，而不是模板分支差异。
2. 后续如果还要继续收 desktop/starter page composition，就可以优先沿着 surface model 往前推，而不是再回到 route 里复制一个新的 render branch。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `LibraryPageChrome` 和 `LibraryBrowseBody` 之间的 page-level surface composition 还没有合并成更高一层 shared page model
- route 仍然保留页面行为回调和 desktop-only 的 source-path / metadata / remove wiring，没有进一步抽成 controller 层
