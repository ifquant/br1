# 0434 - 把 library browse body 的 wiring 收成共享 body model

上一刀已经把 desktop 初始空书库也并进了 `LibraryBrowseBody`。

但 route 里仍然保留着两坨很重的 body-level wiring：

- desktop 一套
- starter 一套

它们都在模板里直接给 `LibraryBrowseBody` 传：

- workflow notice
- recovery / continue / recent shelves
- initial empty state
- before/after panel empty states

这意味着 route 虽然已经不再自己渲染 body 内容块，但仍然在模板层手工拼一整套 body surface。真正的大粒度对齐，应该把这些 body-level 输入也收成共享模型。

## 这刀做了什么

1. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)

   新增了三组共享类型：

   - `LibraryWorkflowNotice`
   - `LibraryWorkflowShelf`
   - `LibraryBrowseBodyModel`

   这样 `LibraryBrowseBody` 不再只接受零散 prop，而是有了明确的 body-level 输入边界。

2. [`src/lib/components/library/LibraryBrowseBody.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseBody.svelte)

   - 删除组件内部那套本地 `WorkflowNotice / WorkflowShelf` 类型
   - 改成直接消费 `model: LibraryBrowseBodyModel`
   - 组件内部从 `model` 派生：
     - `workflowNotice`
     - `recoveryShelf`
     - `continueShelf`
     - `recentShelf`
     - `initialEmptyState`
     - `beforePanelEmptyStates`
     - `afterPanelEmptyStates`

   于是组件 API 从“很多平铺 prop”变成了“一个 body model + 几个真正跨 body 的浏览参数”。

3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   - 新增：
     - `desktopBrowseBodyModel`
     - `starterBrowseBodyModel`
   - desktop/starter 两条 body 分支现在都先构建 body model
   - 模板里对 `LibraryBrowseBody` 的调用明显收短，只剩：
     - `model`
     - browse state / browse books / shelf books
     - view mode
     - dispatch / open / filter / metadata callbacks

## 为什么这刀重要

这刀的意义不是“少写几行 prop”。

它把 library page 的 body composition 从模板级 wiring 收成了显式的状态模型。这样 route 更像一个 presenter：

- 上面准备 body model
- 下面把 body model 交给 shared shell

而不是在模板里一边决定状态，一边展开组件树参数。

这也让后面继续收口更顺：

- 如果还要继续抽 workflow/recovery/continue/recent 的 body 语义
- 或者继续把 desktop/starter 的 body 差异压缩进共享构建函数

现在已经有了明确的承接点：`LibraryBrowseBodyModel`。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `desktopBrowseBodyModel / starterBrowseBodyModel` 目前仍在 route 内部构建，还没抽成共享 builder
- body model 还没有覆盖 browse-state / browse-books / shelf-books 这些更核心的数据层
- library page 仍然保留大量 page-level derived state 和 action wiring，没有变成真正极薄的 route
