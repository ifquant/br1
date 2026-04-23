# 0472 - 把 scroll-context key 的比较和同步收进 runtime

`+page.svelte` 里之前还留着一段 scroll-context orchestration：

- 先从 page state 算 `nextLibraryScrollContextKey`
- 再和当前 `libraryScrollContextKey` 比较
- 变化时更新当前 key
- 再调用 `syncLibraryViewportScrollContext(...)`

这段逻辑和前面的 browse-location normalization 很像，本质上也是 shared runtime 的 compare-and-sync 责任，不是页面专有业务。

## 这刀做了什么

1. 扩展 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   新增：

   - `syncLibraryViewportScrollContextFromPageState(...)`

   这个 helper 直接接受当前 scroll key、page state、storage 和 viewport host，然后在内部完成：

   - 从 page state 构建 next scroll key
   - 与 current key 比较
   - 更新 current key
   - 调用 `syncLibraryViewportScrollContext(...)`

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己维护 `nextLibraryScrollContextKey` 这层中间比较逻辑。

   现在 reactive block 只负责把当前 page state 和宿主依赖交给 shared runtime helper。

## 为什么这刀重要

这一刀继续清的是 route 里的 runtime orchestration，而不是产品行为本身。

这样 `+page.svelte` 更少承担“算 next key、比对、更新、再同步”这类细节，shared runtime 层则更完整地拥有 library scroll context 的切换规则。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- page-level surface assembly 仍然保留在 `+page.svelte`
- desktop coordinator host wiring 和 URL browse-state parsing 仍然保留在 `+page.svelte`
