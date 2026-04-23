# 0468 - 把 browse-state normalization orchestration 收进 runtime

`+page.svelte` 里之前还留着一段 browse-state normalization orchestration：

- 先调 `getNormalizedLibraryBrowseState(...)`
- 再调 `isSameLibraryBrowseStateShape(...)`
- 最后在需要时手动 `syncLibraryBrowseLocation(...)`

这段逻辑已经不是页面专有行为了。它本质上是“基于当前 shelf 数据，校正 browse state 并同步 URL”的 shared runtime 责任。

## 这刀做了什么

1. 扩展 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   新增：

   - `normalizeLibraryBrowseLocation(...)`

   这个 helper 直接接受：

   - `currentUrl`
   - 当前 `browse state`
   - desktop/starter shelf books
   - `goto`

   它内部自己完成：

   - `getNormalizedLibraryBrowseState(...)`
   - `isSameLibraryBrowseStateShape(...)`
   - 必要时 `syncLibraryBrowseLocation(...)`

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己拼这 3 步。

   现在 reactive block 只负责把当前 URL、browse state 和 shelf books 交给 shared runtime helper。

## 为什么这刀重要

这一刀继续把 route 里“先算、再比较、再跳转”的 orchestration 清掉。

这样 `+page.svelte` 更少承担 runtime/navigation 协调职责，而 shared runtime 层开始直接拥有“如何基于当前 shelf 数据修正 browse location”的语义。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- browse state 的 URL 解析仍然在 route 里通过 `getLibraryBrowseStateFromUrl(...)` 获取
- page-level runtime host、desktop coordinator 装配和 surface state assembly 仍然保留在 `+page.svelte`
