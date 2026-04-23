# 0454 - 给 library page 加 shared derivations builder

前几刀已经把 library page 的很多大块 assembly 从 route 拆到了 shared layer：

- desktop page coordinator
- page action model
- page surface-set builder

但 `+page.svelte` 里仍然留着一长串 reactive 派生：

- `librarySearchActive`
- `libraryActiveFilterState`
- `desktopLibraryBrowse`
- `starterLibraryBrowse`
- `libraryFilterSummary`

这些值本质上都属于 page-level derivation，而不是 route 自己独有的运行时行为。

## 这刀做了什么

1. 扩展 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)

   新增：

   - `LibraryPageDerivations`
   - `buildLibraryPageDerivations(...)`

   这个 shared builder 会统一产出：

   - searchActive
   - activeFilterState
   - desktopBrowse
   - starterBrowse
   - filterSummary

   也就是说，library page 上层最核心的一簇 browse/filter 派生，已经开始有单独的 shared page derivation builder。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再自己逐条 reactive 地做：

   - `buildDesktopLibraryBrowseDerivations(...)`
   - `buildStarterLibraryBrowseDerivations(...)`
   - `buildLibraryActiveFilterState(...)`
   - `isLibraryViewFiltered(...)` 驱动的 filter summary

   route 现在只解构 `buildLibraryPageDerivations(...)` 的结果，再把其中各个字段接回现有 surface、workflow、queue 和 summary 逻辑。

## 为什么这刀重要

这一刀的价值在于，它把 route 里最像“页面派生状态管线”的那部分大头挪走了。

到这里，`+page.svelte` 剩下的重活已经更清晰地集中在：

- route param / browse sync
- runtime / scroll context
- 一些更晚期的 queue/detail 派生
- shared builders 的组装

这比继续抽单个 helper 更值，因为 page-level derivation 终于开始有统一 builder，而不是散成一长串 reactive 赋值。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 `librarySummaryBooks`、`libraryFilterState` 本身、route param / browse sync、scroll/runtime context，以及 recovery queue 相关的后续派生
- 还没有更高一层统一 page-state coordinator，把 route sync、runtime state 和 derivation builder 一起收束
