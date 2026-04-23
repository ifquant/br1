# 0457 - 给 library page 加 shared filter-state-set builder

这一刀原本想把 `summaryBooks + filterState + browseState` 一次性收进一个 shared state-set。

但 live 验证直接证明这条路不安全：只要把 `filterState` 和 `browseState` 放进同一个 reactive block，Svelte 就会把 `libraryFormatOptions` 间接重新绑定到 `libraryFormatFilter`，再次形成响应式环。

所以这刀最后收成了更窄、但可验证的安全边界：只共享 `summaryBooks + filterState` 这一半。

## 这刀做了什么

1. 在 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts) 新增 shared filter-state-set builder

   新增：

   - `LibraryPageFilterStateSet`
   - `buildLibraryPageFilterStateSet(...)`

   它统一产出：

   - `summaryBooks`
   - `filterState`

   并把 route 里原先这两步串联：

   - `importedBooks.length ? importedBooks : starterLibraryBooks`
   - `buildLibraryFilterState(...)`

   收到 shared builder 里。

2. 保持 `browseState` 继续单独 reactive

   [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 现在分成两条安全主链：

   - `buildLibraryPageFilterStateSet(...)`
   - `buildLibraryPageBrowseState(...)`

   这样 `filterState` 仍然不会因为 `browseState` 的输入依赖而被污染成 `formatFilter -> formatOptions -> formatFilter` 的循环。

## 为什么这刀重要

这一刀的真正价值不只是“再抽一点 helper”，而是把 library page 的响应式边界又明确了一次：

- `summaryBooks + filterState` 可以安全共享
- `browseState` 也可以安全共享
- 但两者当前不能在同一个 reactive block 里统一解包

这让后续继续收 route 时，不会再走回已经验证失败的方向。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `libraryStatusOptionCounts`、`libraryFormatOptions`、`libraryCollectionOptions`、`libraryTagOptions` 这组 filter inventory 仍然保留在 route 本地
- `summaryBooks + filterState` 与 `browseState` 还没有合并成单一 state-set；当前验证表明这样做会重新引入 reactive cycle
