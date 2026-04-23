# 0477 - 从 host 依赖生成 library surface runtime bindings

`+page.svelte` 里之前在 `onMount(...)` 里还保留着一段 runtime host wiring：

- `window`
- `document`
- `sessionStorage`
- `getViewport`
- `desktopLibraryPageCoordinator.loadLibrary()`
- `libraryScrollContextKey`

然后 route 再把这些 host 依赖手工拼成 `installLibrarySurfaceRuntime(...)` 需要的参数。

## 这刀做了什么

1. 扩展 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   新增：

   - `buildLibrarySurfaceRuntimeBindings(...)`

   这个 helper 直接接受 host 层依赖，然后统一产出 `installLibrarySurfaceRuntime(...)` 所需的 runtime bindings，并在内部接上 `sessionStorage + saveLibraryViewportScrollPosition(...)`。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再在 `onMount(...)` 里自己构造 `onSaveScrollPosition(...)` 和整段 runtime args。

   现在它只把 host 依赖交给 `buildLibrarySurfaceRuntimeBindings(...)`，再把结果传给 `installLibrarySurfaceRuntime(...)`。

## 为什么这刀重要

这一刀继续清的是 page host 层的 runtime adapter。

这样 `+page.svelte` 更少承担“如何把 window/document/storage/coordinator 转成 runtime 输入”的职责，而 `library/runtime.ts` 则更完整地拥有 library surface lifecycle 的宿主绑定形状。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- page-level surface assembly 仍然保留在 `+page.svelte`
- reactive browse/filter/page-state derivation 仍然保留在 `+page.svelte`
