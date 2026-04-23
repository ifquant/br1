# 0462 - 把 library page surface 输入组装收进 surface 层

`buildLibraryPageSurfaceSet(...)` 之前已经在 shared `surface.ts` 里了，但 `+page.svelte` 仍然要手拼三大块输入对象：

- `chrome`
- `desktopBody`
- `starterBody`

这些对象很长，而且已经不再体现页面专有语义，本质上只是把 route 当前状态翻译成 surface builder 需要的输入格式。

## 这刀做了什么

1. 扩展 [`src/lib/library/surface.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/surface.ts)

   新增：

   - `buildLibraryPageSurfaceSetFromState(...)`

   这个 helper 直接接收 route 当前的原始 page state 和 action callback，再在 shared surface 层内部组装：

   - `chrome`
   - `desktopBody`
   - `starterBody`

   最后继续复用现有的 `buildLibraryPageSurfaceSet(...)`。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再手写一大段 page surface 输入对象字面量，而是直接把当前 page state 交给 `buildLibraryPageSurfaceSetFromState(...)`。

## 为什么这刀重要

这一刀把 route 里又一块“大但低语义”的装配层收掉了。

现在 `+page.svelte` 更少像“把一切翻译给 surface builder 的组装脚本”，而更像真正的 page host：只负责维持当前状态和环境边界。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `desktopLibraryPageCoordinator` 的构造参数对象仍然比较大，还留在 route
- URL sync、filter reset guards、scroll context 触发和 page-level runtime 仍然是 route 责任
