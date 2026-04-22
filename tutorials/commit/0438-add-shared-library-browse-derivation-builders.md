# 0438 - 给 library browse derivation 加上 shared builders

上一刀虽然已经把很多 pure helper 抽到了 `src/lib/library/page.ts`，但 `+page.svelte` 里仍然保留了一大串 reactive 组装：

- desktop 一套
- starter 一套

route 还是得自己一行一行拼出：

- continue / recent / recovery queue
- filtered continue / recent / browse / shelf
- visible count
- workflow notice
- filter summary

也就是说，helper 虽然离开了 route，但“这些 helper 怎么组合成 desktop/starter 页面状态”仍然写死在 route 里。

## 这刀做了什么

1. [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)

   新增了三组更高层的 shared builder：

   - `buildLibraryFilterState(...)`
   - `buildLibraryActiveFilterState(...)`
   - `buildDesktopLibraryBrowseDerivations(...)`
   - `buildStarterLibraryBrowseDerivations(...)`

   这里做了两件关键事：

   - 把 desktop/starter browse 派生收成共享构建，而不是继续在 route 里手写
   - 把“filter inventory”与“active filter 表达”拆开，避免 route 一边根据 option inventory 重置 filter，一边又把 active filter detail/chips 混进同一个 reactive 依赖里

2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再逐条写：

   - `searchedLibraryBooks`
   - `continueReadingBooks`
   - `recentReadingBooks`
   - `filtered...`
   - `visible...`
   - `readingWorkflowNotice`
   - `starterReadingWorkflowNotice`

   而是改成直接消费：

   - `desktopLibraryBrowse`
   - `starterLibraryBrowse`
   - `libraryFilterState`
   - `libraryActiveFilterState`

   这让 route 从“逐条 reactive 派生页面结构”退回到“持有原始状态，接 shared derivation builders 的结果”。

## 为什么这刀重要

这刀的核心不是“减少代码行数”，而是把 library route 真正往 presenter 方向推进。

现在 route 里已经形成了三层更清晰的 shared 结构：

- `library/page.ts`
  负责页面级状态推导和 browse/filter builder
- `library/body.ts`
  负责 body model
- `library/chrome.ts`
  负责 chrome model

这样 `+page.svelte` 不再需要自己知道 desktop/starter 两套 browse surface 是怎么一步步拼出来的。它只需要：

- 拿到当前原始状态
- 调 shared builder
- 把结果交给 body/chrome component

这才是大粒度对齐里真正重要的边界变化。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `+page.svelte` 里还保留 browse-location sync、scroll-context、notice/action handlers、persisted-record lookup、repair/remove/update 等更靠近 runtime 和 desktop 行为的逻辑
- `library/page.ts` 现在已经开始形成 page presenter 的雏形，但还没继续抬成一个更完整的 page-derived state model
