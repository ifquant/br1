# 0458 - 给 library page 加 shared filter projection builder

前面几刀已经把：

- `summaryBooks + filterState`
- `browseState`

分别收进了 shared builder。

但 `+page.svelte` 里还有一层很机械的 filter projection 展开：

- `statusOptionCounts`
- `format / collection / tag options`
- 各种 option counts / summaries

这些值本身不复杂，但 route 还在一行一行 reactive 地从 `libraryFilterState` 和 `libraryActiveFilterState` 里拆出来。

## 这刀做了什么

1. 在 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts) 新增 shared filter projection builder

   新增：

   - `LibraryPageFilterProjectionState`
   - `buildLibraryPageFilterProjectionState(...)`

   这个 builder 统一把 `libraryFilterState` 投影成页面实际消费的：

   - status / format / collection / tag option 数据
   - format / collection / tag / cover summaries

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再逐条 reactive 写 filter inventory / summary 这十几行，而是直接解包 `buildLibraryPageFilterProjectionState(...)` 的结果。`activeFilterDetail / chips` 继续单独留在 route，因为 live 验证表明，只要把它们和 `formatOptions` 放进同一个 reactive block，Svelte 就会重新报 cycle。

## 为什么这刀重要

这刀不改变响应式边界，但把 route 里剩余一块高重复、低语义密度的投影层收掉了。

现在 `+page.svelte` 里关于 filter 的三层更清楚了：

- `buildLibraryPageFilterStateSet(...)`
- `buildLibraryPageFilterProjectionState(...)`
- reset guards 继续留在 route

也就是：共享派生和本地约束的边界更清楚了，同时也进一步钉实了一个事实：`activeFilterState` 当前不能和 option inventory 一起被同块解包。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- filter reset guards 仍然保留在 route，本刀没有把它们移出 `+page.svelte`
- `activeFilterDetail / chips` 仍然保留在 route，本刀没有把它们和 option inventory 合并进同一个 shared projection
- browse-state、route param sync、scroll/runtime context、以及 page coordinator 仍然是 route/page-level 职责
