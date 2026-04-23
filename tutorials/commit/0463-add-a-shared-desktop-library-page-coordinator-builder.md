# 0463 - 给 desktop library page 加 shared coordinator builder

`+page.svelte` 里还留着一大块纯装配代码：`buildDesktopLibraryPageCoordinator(...)` 的长参数对象。

这里面虽然大部分只是 getter / setter / env boundary 的接线，但因为它直接铺在 route 里，页面还是显得像 desktop coordinator 的实现点，而不只是 host。

## 这刀做了什么

1. 在 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts) 明确 coordinator option 边界

   新增：

   - `DesktopLibraryPageCoordinatorOptions`
   - `buildDesktopLibraryPageCoordinatorFromState(...)`

   这让 desktop page coordinator 的 route-side接线有了明确的 shared entry，而不是只暴露底层 coordinator factory。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再直接调用底层 `buildDesktopLibraryPageCoordinator(...)`，而是通过更贴近页面语义的 `buildDesktopLibraryPageCoordinatorFromState(...)` 进入 shared desktop-page layer。

## 为什么这刀重要

这一刀没有大改行为，但它把“desktop page 是怎么把 route 当前状态接进 coordinator”的边界正式放进了 `desktopPage.ts`。

这让后续如果继续压缩这块大参数对象，方向也更清晰：继续在 desktop-page layer 收，而不是再把 route 当成长期接线板。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 里这坨 coordinator 参数对象本身还在，只是现在已经有了 shared builder 入口
- URL sync、filter reset guards、scroll/runtime context 以及其它 page-level host 责任还在 `+page.svelte`
