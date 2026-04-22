# 0430 - 把 library 顶部 page chrome 收成 shared shell

## 背景

上一刀已经把 desktop/starter 的 body-level browse composition 收成了 shared `LibraryBrowseBody`。

但 route 里在 body 之前还残留一整块 page chrome：

- `LibraryHeader`
- library notice
- Readest migration banner

这些虽然不在 scroll body 里，但仍然是 library page 顶层骨架的一部分。如果继续把它们留在 route，`+page.svelte` 还是在维护页面骨架，而不是只负责状态、回调和少数必须留在页面上的绑定。

## 这次做了什么

这次新增了一个 shared top-level chrome shell：

1. [`src/lib/components/library/LibraryPageChrome.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageChrome.svelte)
   - 统一承接：
     - `LibraryHeader`
     - library notice
     - Readest migration banner
   - 对外提供默认 slot，用来包住 scroll body
2. [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)
   - 导出 `LibraryPageChrome`
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 用 `LibraryPageChrome` 取代 route 里原本的 header/notice/migration 顶部模板
   - 保留 `OverlayScrollbarsComponent` 和 `libraryScrollRef` 在 route，因为 scroll state 恢复逻辑仍然直接依赖页面里的 viewport 绑定

## 为什么这一步重要

### 1. route 终于不再直接维护 library page 的顶层 chrome

在这一刀之前，route 仍然亲自写着：

- 顶部 header
- 全局 notice
- Readest migration banner

虽然它们已经不是业务核心，但它们依然是页面骨架。

这一刀之后，route 的角色更明确了：

- 维持 scroll viewport 与 URL 同步
- 维持 page-level state
- 把 chrome 和 body 都交给共享组件边界

### 2. shared library shell 向“完整 page shell”更近了一步

现在 library page 的共享边界已经从：

- grouped-browse panel
- body shell

继续抬到了：

- top-level chrome shell

这让 desktop/starter 的 library page 更像一张页面，只是在 slots 和 props 上配置差异，而不是 route 手写多层骨架。

### 3. scroll 仍然留在 route，是正确的收口边界

这一步没有贪心把 `OverlayScrollbarsComponent` 一起塞进 shell。

原因很简单：当前 `libraryScrollRef` 直接服务于：

- scroll position restore
- browse-state keyed scroll persistence
- viewport 事件绑定

这些仍然是 page-level 行为，不应该为了“再抽一点模板”而把 scroll 生命周期塞进不必要的组件层级。

所以这一刀的边界是对的：

- chrome 抽走
- viewport 留在 route

## 结果

现在 `br1` 的 library page 共享边界又往上抬了一层：

- shared grouped-browse controller
- shared body shell
- shared top-level chrome shell

也就是说，route 离“页面骨架作者”又远了一步，离“页面状态和 viewport owner”更近了一步。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- `OverlayScrollbarsComponent` 和 `libraryScrollRef` 仍然留在 route，没有继续抽成更高层 shell
- desktop/starter 的 empty-state copy 仍然没有统一成共享 empty-state model
- `LibraryHeader` 里的 legacy fallback events 仍然存在，没有在这刀里一起清掉
