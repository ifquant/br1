# 0465 - 给 desktop coordinator 的 state/env bundle 再补 shared builder

上一刀已经把 desktop coordinator 的 route-side输入拆成了：

- `state`
- `env`

但 `+page.svelte` 里仍然还是直接手写这两个对象字面量。也就是说，结构虽然更清楚了，route 还是在裸写 coordinator 输入本体。

## 这刀做了什么

1. 扩展 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

   新增：

   - `buildDesktopLibraryPageCoordinatorStateBindings(...)`
   - `buildDesktopLibraryPageCoordinatorEnvironment(...)`

   这两个 builder 暂时不改行为，它们的价值是把 route-side 的两类 coordinator 输入继续锚定在 desktop-page layer，而不是让 route 继续直接持有裸对象字面量。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再直接内联：

   - `state: { ... }`
   - `env: { ... }`

   而是通过这两个 shared builder 生成后再传给 `buildDesktopLibraryPageCoordinatorFromBindings(...)`。

## 为什么这刀重要

这刀的价值不是“少几行代码”，而是继续把 desktop coordinator 输入的结构语义收回 shared layer。

后面如果还要继续压这块，就可以直接在 `desktopPage.ts` 里增强这两个 builder，而不是又回到 route 上改一整坨裸对象。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- 这两个 builder 目前还是轻量包装，尚未把 state/env bundle 再拆成更小的 shared inputs
- URL sync、filter reset guards、scroll/runtime context、以及其它 page-level host 责任仍然在 `+page.svelte`
