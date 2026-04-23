# 0478 - 增加 shared library page projection builder

`+page.svelte` 之前虽然已经把 filter-state、browse-state、filter-projection 这些 builder 拆进了 `library/page.ts`，但 route 自己仍然在 reactive 链里一段段串：

- `buildLibraryPageFilterStateSet(...)`
- `buildLibraryPageBrowseState(...)`
- `buildLibraryPageFilterProjectionState(...)`
- `currentLibraryBrowseState`
- `activeFilterDetail / activeFilterChips`

这会让 route 继续知道“page projection 该怎样拼起来”，只是从一个巨型 block 变成了几段相邻的 block。

## 这刀做了什么

1. 扩展 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)

   新增：

   - `LibraryPageProjectionState`
   - `buildLibraryPageProjectionState(...)`

   这个 shared builder 现在统一产出：

   - `filterStateSet`
   - `browseState`
   - `filterProjectionState`
   - `currentBrowseState`
   - `activeFilterDetail`
   - `activeFilterChips`

   也就是把 route 之前连续展开的 page projection 链，收成一个明确的 shared read model。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再分别驱动：

   - `buildLibraryPageFilterStateSet(...)`
   - `buildLibraryPageBrowseState(...)`
   - `buildLibraryPageFilterProjectionState(...)`
   - `currentLibraryBrowseState` 的单独 reactive 赋值

   现在改成一次消费 `buildLibraryPageProjectionState(...)` 的结果，再把已有字段解构到现有 page state 上。

## 为什么这刀重要

这一刀清掉的是 route 里“projection orchestration”这层职责。

也就是说：

- builder 本身早就 shared 了
- 但“先算什么、后算什么、哪些结果一起构成 page projection”仍然是 route 在决定

现在这一层也进了 `library/page.ts`，`+page.svelte` 更接近真正的 page host：只拥有 live state、URL intake、normalization boundary 和 render/mount lifecycle。

## 这刀刻意没做的事

有两个已知 anti-cycle 边界这次故意没合进去：

1. URL browse-state parse 仍然留在 route

   `getLibraryBrowseStateFromUrl($page.url)` 还是 route 自己处理，因为这是 page 对 URL 的直接 intake，不适合塞回 page projection builder。

2. filter-control normalization 仍然留在 route

   `getNormalizedLibraryFilterControlsState(...)` 仍然在 route 外层执行，因为它会回写 query/filter controls；这属于 controller/normalization 边界，不应该被 page projection builder 顺手吞掉。

## 验证

- `pnpm check`
- `git diff --check`

## 结果

这一刀之后，`+page.svelte` 已经不再手工编排那条 filter/browse/projection/current-browse 的主投影链。

下一步就可以继续把 `buildLibraryPageSurfaceSetFromState(...)` 那个长参数块也收进 shared surface-facing projection，进一步把 route 从“大对象装配器”收薄成真正的 host。
