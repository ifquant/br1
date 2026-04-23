# 0473 - 把 desktop page action environment bindings 收进 desktopPage

`+page.svelte` 里之前在调用 `buildLibraryPageActionSet(...)` 时，还要手工把 `desktopLibraryPageCoordinator` 的一组方法重新映射成 page-action env：

- `handleImportChange`
- `runLibraryNoticeAction`
- `clearLibraryNotice`
- `handleReadestMigrationClick`
- `handleOpenReaderTarget`
- `triggerImportPicker`
- `handleOpenSourcePath`
- `handleUpdateLibraryBookMetadata`
- `handleRemoveLibraryBook`

这层映射本身不是 route 语义，它只是“desktop coordinator 对 page action 环境的投影”。

## 这刀做了什么

1. 扩展 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

   新增：

   - `buildDesktopLibraryPageActionEnvironmentBindings(...)`

   这个 helper 直接接受 `desktopLibraryPageCoordinator`，统一产出 page-action 所需的 desktop environment callbacks。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己把 coordinator 的方法一条条映射进 `buildLibraryPageActionSet(...)`。

   现在它直接复用 `buildDesktopLibraryPageActionEnvironmentBindings(desktopLibraryPageCoordinator)`。

## 为什么这刀重要

这一刀继续清的是 route 里的 env adapter composition。

前几刀已经把 filter-controls、browse-location、page-action state binding 收进了 shared helper；这刀再把 desktop coordinator 到 page-action env 的映射也收掉，`+page.svelte` 就更少承担“把已有对象重新摊平给另一个 helper”的责任。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- page-level surface assembly 仍然保留在 `+page.svelte`
- desktop coordinator state/env bindings 的大块 route-side装配仍然保留在 `+page.svelte`
