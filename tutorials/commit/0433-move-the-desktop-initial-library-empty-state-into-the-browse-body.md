# 0433 - 把 desktop 初始空书库也并进 browse body

上一刀已经把 `LibraryBrowseBody` 的空态摆放改成了显式模型：

- `beforePanelEmptyStates`
- `afterPanelEmptyStates`

但 desktop library 仍然留着最后一个 route-level 特例：

- `importedBooks.length === 0` 时
- `+page.svelte` 直接渲染一块 `LibraryEmptyState`
- 只有 desktop 模式走这条分支

这会让 route 继续负责“当前应该渲染 browse shell，还是应该直接渲染初始空书库”。如果目标是把 library page 收成 state assembly，而把具体内容面的编排交给 shared shell，那么这个判断也该进 `LibraryBrowseBody`。

## 这刀做了什么

1. [`src/lib/components/library/LibraryBrowseBody.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseBody.svelte)

   - 新增 `initialEmptyState: LibraryEmptyStateModel | null`
   - 当 `initialEmptyState` 存在时，直接短路渲染 `LibraryEmptyState`
   - 只有在没有初始空态时，才继续渲染：
     - workflow notice
     - recovery / continue / recent shelves
     - before/after panel empty states
     - grouped browse panel

2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   - 删除 desktop branch 里那块独立的 `<LibraryEmptyState ... />`
   - 改成给 `LibraryBrowseBody` 传 `initialEmptyState`
   - desktop route 现在不再决定“渲染空书库还是 browse body”
   - route 只负责组装：
     - 当前 library 数据
     - browse state
     - 初始空态模型
     - callback

3. [`FEATURE-PARITY-AUDIT.md`](/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md)

   - 记录 library page 又收掉了一块 route-local special case

## 为什么这刀算大粒度对齐

这不是只删一段 JSX。

它把 library page 的职责边界继续往“页面只组装状态，组件负责页面内容编排”推了一步。前几刀已经把：

- grouped browse panel
- grouped browse wiring
- header browse wiring
- browse body shell
- empty state component

逐层从 route 中抽出来。现在如果 desktop 空书库还单独卡在 route 里，那么 page 仍然在决定一个最顶层的内容分支，shared shell 就还不算真正接管 library body。

这一刀之后，`LibraryBrowseBody` 已经开始承接三类状态：

- 正常 browse 内容
- panel 前后的结果型空态
- 初始空书库空态

这让 desktop/starter 两条 library body 更像是在喂同一种页面模型，而不是 route 各自拼一套模板。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `LibraryBrowseBody` 还没有把 workflow/recovery/continue/recent 这些 section 继续收成更高层的 body model
- `+page.svelte` 仍然保留大量 library-specific 数据派生和 action 组装，离“真正的 page presenter 很薄”还有距离
