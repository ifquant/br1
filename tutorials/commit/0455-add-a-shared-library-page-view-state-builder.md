# 0455 - 给 library page 加 shared view-state builder

上一刀已经把 route 里最核心的一层 page derivation 收到了 `buildLibraryPageDerivations(...)`。

但 `+page.svelte` 里还留着第二层展开逻辑：它仍然要把 browse/filter 结果继续翻译成页面真正消费的 view-state，例如：

- recovery queue 相关书单和 summary
- bulk-repair eligibility / manual-repair count
- desktop / starter 两边的 visible count、workflow notice、filtered shelf/browse 书单

也就是说，page derivation 的第一层虽然 shared 了，但“最后一步翻译成页面视图变量”的那层还在 route 里。

## 这刀做了什么

1. 扩展 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)

   新增：

   - `LibraryPageViewState`
   - `buildLibraryPageViewState(...)`

   这个 shared builder 统一承接：

   - desktop/starter browse 结果的第二阶段页面化展开
   - recovery queue review / bulk-repair / manual-repair summary
   - workflow notice / visible counts / filtered shelf-browse 书单

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再逐条 reactive 写：

   - `recoveryQueueBooks`
   - `recoveryQueueReviewBooks`
   - `bulkRepairEligibleQueueBooks`
   - `manualRepairQueueCount`
   - `recoveryQueueSummaryText`
   - `libraryStatusSummary`
   - desktop/starter 的 filtered books / workflow notice / visible counts

   route 现在只把：

   - `desktopBrowse`
   - `starterBrowse`
   - `persistedLibraryRecords`
   - `desktopLibraryMode`

   交给 `buildLibraryPageViewState(...)`，再消费返回的第二阶段页面视图状态。`filter option counts / summaries` 和 `active-filter detail / chips` 仍然保留在 route 本地，以避免和 filter reset 逻辑形成响应式环。

## 为什么这刀重要

这一刀的价值在于，它把 route 里“第二层页面翻译逻辑”里最适合共享的那部分，从一串 reactive 赋值推进成了 shared page-state builder。

到这里，`+page.svelte` 里关于 page state 的大部分重复展开已经不再是散装的：

- 第一层 derivation 已 shared
- 第二层 queue/workflow/visible-count expansion 也开始 shared

这让 route 更接近真正的 page host，而不是继续做一个手工拆包器。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 `librarySearchActive`、`librarySummaryBooks`、`libraryFilterState`、`libraryActiveFilterState`、filter option counts / summaries、route param / browse sync、scroll/runtime context
- 更高一层的 route-state coordinator 还没有把 browse sync、filter-state normalization 和 runtime scroll context 一起统一起来
