# 0444 - 把 library page host 抽成独立组件

上一刀已经把 library page shell 收成了 `LibraryPageSurface.svelte`：

- `LibraryPageChrome`
- `OverlayScrollbarsComponent`
- `LibraryBrowseBody`
- page shell 样式

但 route 里还剩最外层那一圈 host 模板：

- 隐藏的 file input
- `LibraryPageSurface`
- `importInput` / `scrollRef` 的绑定

这层虽然已经很薄，但它仍然是 library page 的最外层 host，继续留在 route 里会让 `+page.svelte` 还保留一小块不是状态/行为本身的页面模板。

## 这刀做了什么

1. 新增 [`src/lib/components/library/LibraryPageHost.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageHost.svelte)

   这个组件现在统一承接：

   - 隐藏的 file input
   - `LibraryPageSurface`
   - `fileInput` / `scrollRef` 绑定

   也就是说，active page surface 的最外层 host 不再留在 route 里。

2. 更新 [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)

   导出 `LibraryPageHost`，让 route 可以直接消费这个更高一层的 host 组件。

3. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再：

   - inline 渲染隐藏 file input
   - 再包一层 `LibraryPageSurface`
   - 自己保留那段只为 host 模板存在的最外层 page markup

   到这一步，route 模板基本只剩：

   - 页面 section
   - `LibraryPageHost`

## 为什么这刀重要

这刀虽然比前几刀更窄，但它把 library route 的模板层又收平了一层。

现在 `+page.svelte` 更明确地在做三件事：

- 持有页面状态
- 持有页面行为/controller 逻辑
- 挂接 runtime / refs

而不是再继续承担顶层 page host markup。

这对后面继续往“controller/runtime host”边界推进是有意义的，因为 route 模板已经基本退到最薄。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 controller 行为，包括 browse mutation、filter mutation、notice state、desktop-only metadata/remove/source-path 处理
- runtime helper 与 page host/component 边界还没有继续往更完整的 library page controller/host 模型收
