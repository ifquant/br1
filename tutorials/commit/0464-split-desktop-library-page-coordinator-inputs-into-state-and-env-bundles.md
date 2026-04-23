# 0464 - 把 desktop library page coordinator 输入拆成 state/env bundles

上一刀已经给 desktop coordinator 补了一个 shared builder 入口，但 `+page.svelte` 里那坨参数对象仍然是平铺的：

- 一部分是 route 当前状态的 getter / setter
- 一部分是桌面环境和服务边界

这两类东西混在一起时，route 还是很像一块超长接线板。

## 这刀做了什么

1. 扩展 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

   新增：

   - `DesktopLibraryPageCoordinatorStateBindings`
   - `DesktopLibraryPageCoordinatorEnvironment`
   - `buildDesktopLibraryPageCoordinatorFromBindings(...)`

   也就是把 coordinator 的输入显式分成两类：

   - `state`
   - `env`

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再往 coordinator builder 里平铺一长串参数，而是改成两块：

   - `state`
   - `env`

   这样 page host 里哪部分是在接当前状态、哪部分是在接环境边界，会更清楚。

## 为什么这刀重要

这一刀没有改变 desktop coordinator 的行为，但把 route-side wiring 的结构又抬高了一层。

后面如果继续收这块，就可以分别讨论：

- 哪些 `state` 还该进一步抽成 shared state bindings
- 哪些 `env` 该进一步收进 desktop-page layer

而不是继续面对一个扁平长对象。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 里这两个 bundle 本身仍然比较大，还没有继续拆成更细的 shared builder
- URL sync、filter reset guards、scroll/runtime context、page-level host 责任仍然在 `+page.svelte`
