# 0461 - 把 library scroll persistence host helper 收进 runtime

`+page.svelte` 里之前还留着三段纯 host helper：

- `saveLibraryScrollPosition(...)`
- `restoreLibraryScrollPosition(...)`
- `syncLibraryScrollContext(...)`

这些逻辑已经不包含页面业务判断了，只是在 route 里把：

- `sessionStorage`
- viewport getter
- 保存和恢复滚动位置

串起来。

## 这刀做了什么

1. 扩展 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   新增：

   - `saveLibraryViewportScrollPosition(...)`
   - `restoreLibraryViewportScrollPosition(...)`
   - `syncLibraryViewportScrollContext(...)`

   也就是把 route 里原先那组三段 scroll persistence host helper 收进 shared runtime 层。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 不再自己实现 save / restore / sync 这三个局部 helper，只保留：

   - `getLibraryViewport()`
   - 当前 scroll context key 的 reactive 触发
   - 把 `window.sessionStorage` 和 viewport getter 交给 shared runtime helper

## 为什么这刀重要

这一刀虽然不改业务行为，但继续把 route 往真正的 page host 收：

- 页面负责提供环境对象
- runtime 负责滚动持久化协议

这比继续把 save/restore 细节散在 `+page.svelte` 里更干净，也更利于后续复用。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 `getLibraryViewport()` 和当前 context key 的 reactive 驱动
- URL sync、filter reset guards、desktop page coordinator 仍然是 page-level 责任
