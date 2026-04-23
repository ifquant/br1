# 0471 - 把 library page action-state bindings 收进 controller 层

`+page.svelte` 里之前在调用 `buildLibraryPageActionSet(...)` 前，还要再手工拼一层 mixed adapter：

- `filter-controls bindings`
- `browse-location bindings`
- `setSortBy / setViewMode`

这层组合本身不承载页面专有业务，它只是把已经存在的 shared bindings 再凑成一份 page-action state input。

## 这刀做了什么

1. 扩展 [`src/lib/library/controller.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/controller.ts)

   新增：

   - `buildLibraryPageActionStateBindings(...)`

   这个 helper 统一把：

   - filter-controls bindings
   - browse-location bindings
   - sort/view setters

   收成一份可以直接喂给 `buildLibraryPageActionSet(...)` 的 shared action-state binding。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在先构造 `activeLibraryPageActionStateBindings`，然后在 `buildLibraryPageActionSet(...)` 里直接复用它，不再自己把这三类 adapter 再拼一次。

## 为什么这刀重要

这一刀继续清的是 route 里的“第二层 adapter composition”。

前几刀已经把 filter-controls 和 browse-location 各自收成 shared binding；这刀再往前推一步，把 page-action 所需的 state binding 组合也收进 controller 层。这样 `+page.svelte` 更接近“提供环境和当前状态”，而不是“继续手工拼 shared helper 的输入形状”。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- browse state 的 URL 解析仍然在 route 里通过 `getLibraryBrowseStateFromUrl(...)` 获取
- page-level surface assembly 和 desktop coordinator host wiring 仍然保留在 `+page.svelte`
