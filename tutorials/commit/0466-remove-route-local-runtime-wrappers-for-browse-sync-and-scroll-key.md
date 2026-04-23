# 0466 - 去掉 route-local 的 browse sync / scroll-key runtime 包装

`+page.svelte` 里之前还留着两段很薄的 runtime 包装：

- `syncLibraryBrowseLocation(...)`
- `buildLibraryScrollContextKey(...)`

它们本身已经不承载页面专有语义了，只是在 route 里把当前 page state 转一遍，再转发给 shared runtime helper。

## 这刀做了什么

1. 扩展 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   新增：

   - `buildLibraryScrollContextKeyFromPageState(...)`

   这个 helper 直接接受 page state 视角下的输入，再内部转成底层 scroll context key 所需参数。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再保留本地：

   - `syncLibraryBrowseLocation(...)`
   - `buildLibraryScrollContextKey(...)`

   现在：

   - browse sync 直接调用 shared runtime helper
   - scroll key 直接通过 `buildLibraryScrollContextKeyFromPageState(...)` 生成

## 为什么这刀重要

这一刀继续把 route 里“只是转发 shared runtime helper 的薄包装层”清掉。

这样 `+page.svelte` 更少地扮演 runtime adapter，而更专注于持有当前状态和环境对象。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 `getLibraryViewport()`、URL state、filter reset guards 和其它 page-level host 责任
- desktop coordinator 的大 bundle 虽然已经结构化，但还没有继续拆成更小的 shared inputs
