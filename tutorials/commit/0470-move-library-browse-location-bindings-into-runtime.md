# 0470 - 把 library browse-location bindings 收进 runtime

`+page.svelte` 里之前对 browse location 还保留着一层 route-local wiring：

- `getCurrentBrowseState`
- `syncBrowseState`

这层 wiring 本身没有页面专有业务，它只是把当前 browse state 和当前 URL 接到 shared runtime helper 上。

## 这刀做了什么

1. 扩展 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   新增：

   - `buildLibraryBrowseLocationBindings(...)`

   这个 helper 统一产出：

   - `getCurrentBrowseState`
   - `syncBrowseState`

   并在内部复用已有的 `syncLibraryBrowseLocation(...)`。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在先构造一份 `activeLibraryBrowseLocationBindings`，然后：

   - browse-state normalization block 复用它的 `getCurrentBrowseState()`
   - `buildLibraryPageActionSet(...)` 直接复用整份 browse-location bindings

   这样 route 不再自己保留 browse state getter 和 URL sync adapter。

## 为什么这刀重要

这一刀继续把 `+page.svelte` 里“只是把当前状态喂给 shared runtime”的 adapter 层清掉。

配合上一刀的 filter-controls bindings，route 现在又少了一组重复的 controller/runtime wiring，而 shared runtime 层开始更完整地表达 library browse location 的输入边界。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- browse state 的 URL 解析仍然在 route 里通过 `getLibraryBrowseStateFromUrl(...)` 获取
- page-level surface assembly 和 desktop coordinator host wiring 仍然保留在 `+page.svelte`
