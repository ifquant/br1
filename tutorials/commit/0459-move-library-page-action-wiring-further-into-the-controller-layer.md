# 0459 - 继续把 library page action wiring 收进 controller layer

前面虽然已经有了 `buildLibraryPageActions(...)`，但 `+page.svelte` 里仍然留着一组明显属于 controller 的样板：

- 当前 filter controls state 的组装
- filter controls state 的 apply
- 当前 browse state 的组装
- browse action dispatch
- 最终 `LibraryPageActions` 的 route-local 包装

这些逻辑不复杂，但继续堆在 route 里，会让 `+page.svelte` 仍然像一个 controller implementation，而不只是 page host。

## 这刀做了什么

1. 扩展 [`src/lib/library/controller.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/controller.ts)

   新增：

   - `buildLibraryFilterControlsState(...)`
   - `applyLibraryFilterControlsState(...)`
   - `buildCurrentLibraryBrowseState(...)`
   - `buildLibraryBrowseActionDispatcher(...)`
   - `buildLibraryPageActionSet(...)`

   也就是把 route 里那组当前 state / apply / dispatch / action assembly 的控制器样板继续往 shared controller 层推进。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己定义：

   - `getCurrentLibraryFilterControlsState()`
   - `applyLibraryFilterControlsState()`
   - `getCurrentLibraryBrowseState()`
   - `dispatchLibraryBrowseAction()`

   而是改成：

   - reactive 组装 `currentLibraryBrowseState`
   - 通过 `buildLibraryPageActionSet(...)` 一次性得到 `activeLibraryPageActions`

## 为什么这刀重要

这一刀不碰 page state 派生，也不碰 reset guard，而是继续清理 route 里的 controller 样板。

到这里，`+page.svelte` 里“怎么把页面行为线接起来”的那层也开始系统性地往 shared controller 模块收，不再继续散落为局部 helper。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 reset guards、route param sync、scroll/runtime context
- desktop page coordinator 仍然负责桌面模式下的业务流和命令边界
