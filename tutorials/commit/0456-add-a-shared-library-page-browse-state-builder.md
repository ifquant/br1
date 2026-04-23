# 0456 - 给 library page 加 shared browse-state builder

上一刀已经把第二阶段 `view-state` 展开收到了 `buildLibraryPageViewState(...)`。

但 `+page.svelte` 里仍然保留着另一段散装 wiring：

- `activeFilterState`
- `desktopBrowse`
- `starterBrowse`
- `filterSummary`
- 再把这些结果继续喂给 `buildLibraryPageViewState(...)`

也就是说，route 虽然不再手写 recovery queue / workflow / visible-count 的第二阶段展开了，但它还在手工串联“第一阶段 derivation + 第二阶段 view-state”这条 browse-state 主链。

## 这刀做了什么

1. 在 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts) 新增 shared browse-state builder

   新增：

   - `LibraryPageBrowseState`
   - `buildLibraryPageBrowseState(...)`

   这个 builder 会把：

   - `buildLibraryPageDerivations(...)`
   - `buildLibraryPageViewState(...)`

   串成一条共享的 browse-state 主链，并统一返回：

   - 第一阶段的 `searchActive / activeFilterState / desktopBrowse / starterBrowse / filterSummary`
   - 第二阶段的 queue books / recovery summary / workflow notice / visible counts

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再分别 reactive 写：

   - `buildLibraryActiveFilterState(...)`
   - `buildDesktopLibraryBrowseDerivations(...)`
   - `buildStarterLibraryBrowseDerivations(...)`
   - `isLibraryViewFiltered(...)`
   - `buildLibraryPageViewState(...)`

   而是直接消费一包 `buildLibraryPageBrowseState(...)` 的结果。

## 为什么这刀重要

这一刀把 library page 里真正的 browse-state 主链重新收成了共享 builder：

- filter inventory 继续单独保留，避免和 filter reset 形成响应式环
- browse/filter derivation 与第二阶段 view-state 展开重新统一

这样 `+page.svelte` 不再承担“先推一遍 browse derivation，再推一遍 view-state”的串联角色，而是更接近真正的 page host。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `libraryFilterState`、`libraryStatusOptionCounts`、`libraryFormatOptions`、`libraryCollectionOptions`、`libraryTagOptions` 这组 filter inventory 仍然保留在 route 本地
- route param sync、scroll/runtime context、以及更高一层的 page coordinator 仍然是 `+page.svelte` 的职责
