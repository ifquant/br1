# 0476 - 从 page state 和 page env 直接构建 desktop coordinator

前两刀已经把 `desktopLibraryPageCoordinator` 的两大输入块都拆出来了：

- `buildDesktopLibraryPageCoordinatorStateBindingsFromPageState(...)`
- `buildDesktopLibraryPageCoordinatorEnvironmentFromPageEnv(...)`

但 `+page.svelte` 里仍然要自己再做最后一层组装：

- 先分别调用这两个 builder
- 再把结果塞进 `buildDesktopLibraryPageCoordinatorFromBindings(...)`

这说明 route 仍然在关心 coordinator 的中间输入形状，而不是只提供当前 page state / page env。

## 这刀做了什么

1. 扩展 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

   新增：

   - `buildDesktopLibraryPageCoordinatorFromPageStateAndEnv(...)`

   这个 helper 直接接受：

   - page state
   - page env

   然后内部完成：

   - state-binding builder
   - env-binding builder
   - `buildDesktopLibraryPageCoordinatorFromBindings(...)`

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己拼 coordinator 的中间 binding 层。

   现在它只提供当前 page state 和 page env 给 shared `desktopPage` helper。

## 为什么这刀重要

这一刀把 desktop coordinator 的最终装配责任也往 shared `desktopPage` 层推进了一步。

这样 `+page.svelte` 更接近“给 shared builder 提供当前页面事实”，而不是继续掌握 coordinator 的内部装配流程。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- page-level surface assembly 仍然保留在 `+page.svelte`
- `onMount(...)` 里的 library surface runtime host wiring 仍然保留在 `+page.svelte`
