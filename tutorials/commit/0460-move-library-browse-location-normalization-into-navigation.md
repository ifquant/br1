# 0460 - 把 library browse location normalization 收进 navigation

`+page.svelte` 里之前还留着三段 route-local browse guard：

- `groupBy === 'none'` 时不该再带 `groupScope`
- `groupScope` 为空时不该再带 `trail`
- 当前 `groupScope` 已经不在 desktop/starter shelf 里时，应该回退到空 scope

这些规则本质上不是页面私有逻辑，而是 browse-state 自己的 normalization policy。

## 这刀做了什么

1. 在 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts) 新增 shared normalization helper

   新增：

   - `isSameLibraryBrowseStateShape(...)`
   - `getNormalizedLibraryBrowseState(...)`

   `getNormalizedLibraryBrowseState(...)` 统一承接上面那三条约束，并根据当前 desktop/starter shelf 内容判断当前 `groupScope` 是否仍然有效。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己写三段 `if (...) syncLibraryBrowseLocation(...)`。

   现在 route 只做两件事：

   - 取当前 browse state
   - 调 `getNormalizedLibraryBrowseState(...)`

   如果 normalized 结果和当前 state 不同，再统一同步回 URL。

## 为什么这刀重要

这一刀把“哪些 browse state 算失效、该怎么回正”从 page-local 判断推进成了 shared navigation policy。

这样后面无论是 route、controller 还是别的 surface，只要要判断当前 browse location 是否仍有效，都可以读同一套 normalization 规则，而不是各自再写一遍。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route param sync 的具体 `goto(...)` 仍然留在 route/runtime 这一层
- filter reset guards、scroll/runtime context、以及 desktop page coordinator 仍然是 page-level 责任
