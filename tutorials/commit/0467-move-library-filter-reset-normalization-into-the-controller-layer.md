# 0467 - 把 library filter reset normalization 收进 controller 层

`+page.svelte` 里之前还留着 3 段很机械的 filter reset guard：

- `libraryFormatFilter !== 'all' && !libraryFormatOptions.includes(...)`
- `libraryCollectionFilter !== 'all' && !libraryCollectionOptions.includes(...)`
- `libraryTagFilter !== 'all' && !libraryTagOptions.includes(...)`

它们做的事情其实不是页面专有业务，而是“当前 filter controls 遇到已经失效的 inventory 时，应该怎么退回到合法状态”。

## 这刀做了什么

1. 扩展 [`src/lib/library/controller.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/controller.ts)

   新增：

   - `getNormalizedLibraryFilterControlsState(...)`

   这个 helper 只负责一件事：根据当前可用的 `format / collection / tag` options，校正当前 filter controls。

   它不会碰：

   - browse state
   - URL sync
   - active-filter detail/chips
   - page runtime

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再保留 3 段单独的 reset guard。

   现在 route 只会：

   - 先用 `buildLibraryFilterControlsState(...)` 取当前 controls
   - 再调用 `getNormalizedLibraryFilterControlsState(...)`
   - 只有发生变化时才通过 `applyLibraryFilterControlsState(...)` 回写

## 为什么这刀重要

这刀继续把 `+page.svelte` 里“明明属于 shared controller 语义、却还写在 route 里的控件归一化规则”收掉。

更重要的是，它故意没有把这层逻辑并进 browse-state builder 或 filter projection builder。

原因很直接：这个页面之前已经多次踩过 Svelte reactive cycle。这里继续保持一个很窄的边界，更稳，也更容易继续往 controller 层推进。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- browse-state normalization 仍然独立留在 navigation/runtime 层，没有和 filter-controls normalization 混在一起
- `+page.svelte` 里仍然保留 page-level URL state、runtime host 和 desktop coordinator 装配
