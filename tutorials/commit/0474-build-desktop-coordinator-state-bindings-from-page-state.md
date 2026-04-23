# 0474 - 从 page state 生成 desktop coordinator state bindings

`+page.svelte` 里之前在组装 `desktopLibraryPageCoordinator` 时，还要手工把一大组 page state 重新包成 `getX / setX` 形式的 state bindings。

这块里很多逻辑其实并不是业务逻辑，而是机械的 getter wrapping：

- `getPersistedLibraryRecords`
- `getBulkRepairBusy`
- `getBulkRepairEligibleQueueBooks`
- `getMigrationBusy`
- `getLibraryNoticeState`

## 这刀做了什么

1. 扩展 [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

   新增：

   - `buildDesktopLibraryPageCoordinatorStateBindingsFromPageState(...)`

   这个 helper 直接接受当前 page state 的值和 setter，然后在 shared desktopPage 层统一生成 coordinator 所需的 state bindings。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己为这些当前值手工写一层 `getX: () => value`。

   现在它直接把：

   - 当前值
   - setter
   - `getImportInput`
   - `setImportInputValue`

   交给 `buildDesktopLibraryPageCoordinatorStateBindingsFromPageState(...)`。

## 为什么这刀重要

这一刀继续清的是 route 里的机械 state-binding assembly。

这样 `+page.svelte` 更少承担“把当前页面状态再包成 coordinator 能吃的 getter/setter 形状”的责任，而 `desktopPage.ts` 更完整地拥有 desktop coordinator 的 state-input 形状。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- desktop coordinator env bindings 的大块 route-side 装配仍然保留在 `+page.svelte`
- page-level surface assembly 仍然保留在 `+page.svelte`
