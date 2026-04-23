# 0475 - 从 page env 生成 desktop coordinator env bindings

`+page.svelte` 里之前在组装 `desktopLibraryPageCoordinator` 时，除了 state bindings 之外，还要手工再拼一大段 env bindings：

- `canPersistLibrary`
- `openReaderTarget`
- `openLibraryBookPath`
- `importBooksFromDesktopPicker`
- `loadPersistedLibraryBooks`
- `detectReadestLibrary`
- `importBooksFromReadest`
- `importLibraryBooks`
- `previewLibraryRepairCandidate`
- `selectSingleSystemBookPath`
- `removeLibraryBook`
- `restoreRemovedLibraryBook`
- `updateLibraryBookMetadata`
- `window.confirm(...)`
- `URL.createObjectURL(...)`

这块本质上也是“当前页面环境如何投影成 coordinator env”的 shared 装配逻辑。

## 这刀做了什么

1. 扩展 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

   新增：

   - `buildDesktopLibraryPageCoordinatorEnvironmentFromPageEnv(...)`

   这个 helper 直接接受 route 当前能提供的 page env，然后统一生成 coordinator 所需的 env bindings。

   同时，旧的裸 passthrough `buildDesktopLibraryPageCoordinatorEnvironment(...)` 也被删掉了，因为这条线现在已经由 page-env builder 取代。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再直接构造整段 env object literal，而是把当前 page env 交给 `buildDesktopLibraryPageCoordinatorEnvironmentFromPageEnv(...)`。

## 为什么这刀重要

这一刀把 desktop coordinator 装配又往 shared `desktopPage` 层推进了一步。

配合上一刀的 state-binding builder，`+page.svelte` 现在已经不再分别手工拼 state/env 两块 coordinator 输入，而是更多地扮演“提供当前页面状态与环境”的角色。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- page-level surface assembly 仍然保留在 `+page.svelte`
- `desktopLibraryPageCoordinator` 本身的最终组装调用仍然保留在 `+page.svelte`
