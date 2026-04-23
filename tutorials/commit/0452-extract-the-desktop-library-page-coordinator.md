# 0452 - 把 desktop library page coordinator 抽出去

前几刀已经把 `+page.svelte` 里的很多重逻辑拆到了 shared layer：

- desktop ingress
- desktop maintenance
- desktop records
- desktop catalog
- page action model
- page action assembly

但 route 里还留着一整簇 desktop page-level coordinator 逻辑：

- notice state 的 clear/set/run
- persisted records 投影到 imported books
- desktop library 初始 load
- open source path / import picker / import change
- Readest migration click / reload-after-repair
- remove / update / repair / bulk-repair 这组最终 page handlers

这说明业务模块虽然已经拆出来了，但 route 还在自己做最后一层“把这些模块串起来”的工作。

## 这刀做了什么

1. 新增 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

   这个新模块现在承接 desktop library page coordinator：

   - `buildDesktopLibraryPageCoordinator(...)`

   它把以下几层串起来：

   - notice state
   - desktop catalog projection
   - desktop ingress
   - desktop maintenance
   - record lookup / bulk-repair eligibility queue
   - 桌面环境边界，例如 confirm、file input、asset import opening

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再自己定义：

   - `clearLibraryNotice`
   - `setLibraryNotice`
   - `runLibraryNoticeAction`
   - `applyPersistedLibraryRecords`
   - `loadLibrary`
   - `handleOpenReaderTarget`
   - `handleOpenSourcePath`
   - `triggerImportPicker`
   - `handleImportChange`
   - `triggerReadestMigration`
   - `handleReadestMigrationClick`
   - `reloadLibraryAfterRepair`
   - `restoreRemovedLibraryRecord`
   - `handleRemoveLibraryBook`
   - `handleUpdateLibraryBookMetadata`
   - `handleRepairLibraryBook`
   - `handleBulkRepairLibraryBooks`

   route 现在只负责：

   - 保存页面状态
   - 提供 getter / setter / environment dependency
   - 接 `desktopLibraryPageCoordinator`
   - 把 coordinator 结果再接回 runtime、surface model 和 page actions

## 为什么这刀重要

这一刀之后，`+page.svelte` 里真正还比较重的部分，已经越来越偏 route host 自身：

- filter-control state
- browse state
- scroll/runtime context
- reactive surface assembly

而 desktop 书库这条 page-level orchestration 链已经不再由 route 自己亲自写。

这比单纯继续抽几个 helper 更有价值，因为它让 library route 的职责终于开始从“业务编排器”往“页面宿主”收缩。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- filter-control、browse state、scroll/runtime context 仍然留在 route
- desktop/starter surface assembly 虽然已经共享很多，但 route 仍然负责较多 reactive page-state composition
