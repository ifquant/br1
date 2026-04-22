# 0437 - 把 library page 的纯派生逻辑收进 shared page module

上一刀已经把 library 的两层大装配收走了：

- body-level builder -> `src/lib/library/body.ts`
- chrome-level builder -> `src/lib/library/chrome.ts`

但 `+page.svelte` 里仍然塞着一整串纯派生 helper：

- continue / recent / recovery queue 书单
- search / query 匹配
- status / format / collection / tag 过滤
- option counts / summaries
- active filter detail / chips
- workflow notice

这些逻辑虽然不再是模板 JSX，但仍然让 route 继续承担“library 页面该怎么从原始书单状态推导出用户看到的结构和摘要”。

如果目标是把 route 收成 presenter，那么这批纯派生也该离开 `+page.svelte`。

## 这刀做了什么

1. 新增 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)

   这个模块现在承接 library page 最核心的一批纯派生：

   - 阅读状态判断：
     - `hasBookBeenOpened`
     - `isBookFinished`
     - `isBookInProgress`
     - `isBookUnstarted`
   - 书单组织：
     - `getContinueReadingBooks`
     - `getRecoveryQueueBooks`
     - `getRecentReadingBooks`
     - `getLibraryShelfBooks`
     - `sortBooksForDisplay`
     - `getFilteredBooks`
   - 过滤与选项：
     - `filterBooksForLibraryView`
     - `getLibraryStatusOptionCounts`
     - `getLibraryFormatOptions`
     - `getLibraryCollectionOptions`
     - `getLibraryTagOptions`
     - option count helpers
   - library summaries：
     - `getLibraryFormatSummary`
     - `getLibraryCollectionSummary`
     - `getLibraryTagSummary`
     - `getLibraryCoverSummary`
   - active filter 表达：
     - `getLibraryActiveFilterDetail`
     - `getLibraryActiveFilterChips`
     - `getLibraryEmptyFilterTitle`
     - `isLibraryViewFiltered`
   - workflow notice：
     - `getReadingWorkflowNotice`
     - `getStarterReadingWorkflowNotice`

2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   - 删除了 route 内那一大段重复的 pure helper 定义
   - reactive blocks 改成直接调用 shared `library/page.ts`
   - `readingWorkflowNotice` / `starterReadingWorkflowNotice` 也不再内联 if/else 推导，而是走 shared helper

## 为什么这刀算大粒度对齐

因为这刀收掉的不是组件壳子，而是“页面语义推导”的核心部分。

到这一步，library page 已经形成了三个更清晰的 shared 层：

- `library/page.ts`
  负责从原始书单和 filter state 推导用户看到的 page-level data
- `library/body.ts`
  负责把这些派生结果组织成 body model
- `library/chrome.ts`
  负责把这些派生结果组织成 chrome model

这意味着 `+page.svelte` 的职责正在从：

- 自己发明页面语义
- 自己组织 body/chrome
- 自己渲染 page

逐步退回到：

- 持有当前 route/local state
- 调 shared helpers/builders
- 交给 page chrome / browse body 渲染

这比只抽一两个 summary helper 更像真正的大粒度收口。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `library/page.ts` 目前仍然是 helper 集合，还没有继续抬成更完整的 page-derived model
- route 里还保留 browse-location sync、scroll-context、notice/action handlers、persisted-record lookup 和 repair/remove/update 行为
- `buildManualRelinkReview` 这类和持久化记录强耦合的 review logic 还没从 route 收出去
