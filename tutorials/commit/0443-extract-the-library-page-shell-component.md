# 0443 - 把 library page shell 抽成独立组件

上一刀已经把 library route 的 page-level surface assembly 收进了 shared `library/surface.ts`。

但 `+page.svelte` 里还剩最后一层很厚的 page shell 模板：

- `LibraryPageChrome`
- `OverlayScrollbarsComponent`
- `LibraryBrowseBody`
- `library-surface` / `library-scroll` 那整块 page shell 样式
- 以及一批只为接组件事件而存在的 route-local event adapter

也就是说，route 虽然已经不再自己 build page surface model，但仍然亲自渲染和布置这层 page shell。

## 这刀做了什么

1. 新增 [`src/lib/components/library/LibraryPageSurface.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageSurface.svelte)

   这个组件现在统一承接：

   - `LibraryPageChrome`
   - `OverlayScrollbarsComponent`
   - `LibraryBrowseBody`
   - `library-surface` / `library-scroll` 相关样式

   它直接消费 `LibraryPageSurfaceModel`，并保留：

   - `scrollRef` 绑定
   - chrome 侧事件桥接
   - body 侧 action / filter / open / edit / remove wiring

2. 更新 [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)

   导出新的 `LibraryPageSurface`，让 library route 可以直接使用这个 page shell 组件。

3. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再：

   - inline 渲染 `LibraryPageChrome + OverlayScrollbars + LibraryBrowseBody`
   - 自己持有 page shell 样式
   - 为 `querychange/filterchange/sortchange/...` 这些 page-shell 事件额外写一批只做字段赋值的 adapter

   现在 route 只需要：

   - 维护页面状态
   - 提供 action callback
   - 提供 `activeLibraryPageSurfaceModel`
   - 绑定 `scrollRef`

## 为什么这刀重要

这刀把 library route 又往“状态 + controller + runtime wiring”推进了一层。

到这里，`+page.svelte` 已经不再承担：

- page shell 模板
- page shell 样式
- page shell 事件桥接

而这些都被收进了一个直接理解 `LibraryPageSurfaceModel` 的独立组件。

这意味着 library route 现在更接近一个真正的 page controller：

- 页面状态在 route
- 页面行为在 route
- 页面 surface model 在 shared library module
- 页面 shell rendering 在 shared component

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 filter mutation、desktop-only metadata/remove/source-path handler、notice/action state 等 controller 职责
- `import` input 以及更高层的 page boot/runtime 仍然在 route，没有继续收成更完整的 library page host
