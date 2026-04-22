# 0432 - 把 browse-body 的空态摆放也收成模型

## 背景

上一刀已经把 library page 的空态本身收成了 shared `LibraryEmptyState`。

但 `LibraryBrowseBody` 仍然依赖 route 通过 slot 自己决定：

- 哪些空态放在 panel 前
- 哪些空态放在 panel 后

也就是说，空态组件已经共享了，空态摆放结构却还在 route 模板里。

## 这次做了什么

这次把空态摆放也进一步从“slot 结构”收成了“显式模型”：

1. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)
   - 新增 `LibraryEmptyStateModel`
2. [`src/lib/components/library/LibraryBrowseBody.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseBody.svelte)
   - 新增：
     - `beforePanelEmptyStates`
     - `afterPanelEmptyStates`
   - 组件内部直接渲染这些空态模型，不再依赖 route 提供 slot 结构
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 删除 starter/desktop 的空态 slot 块
   - 改成给 `LibraryBrowseBody` 传显式 empty-state model 数组

## 为什么这一步重要

### 1. body shell 更像真正的 page-body model，而不是 slot 容器

如果 body shell 只是一个带 slot 的容器，那 route 仍然得决定很多结构层问题。

这一刀之后，route 只需要说：

- panel 前有哪些空态
- panel 后有哪些空态

而不是继续手写 `<svelte:fragment slot=\"...\">` 结构。

### 2. desktop/starter 差异进一步退化成纯数据差异

现在 desktop/starter 对空态的差异主要只剩：

- 用什么 title/message
- 放在哪一侧
- 配哪些 chips/actions

这正是模型层该表达的差异，而不是模板层。

### 3. route 再少一段结构模板

这一刀不是换个地方写相同模板，而是让 route 不再维护那两段空态 slot 结构。

对这个线程来说，这很关键，因为我们一直在把 library page 从“route 负责大模板”往“route 负责状态和模型”推进。

## 结果

现在 `br1` 的 shared library body 不仅承接：

- workflow shelves
- grouped-browse panel

也开始承接：

- 空态摆放模型

这意味着 body shell 又更接近真正的 body-level presenter/model，而不只是一个组合容器。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- desktop 的“空书库”仍然还直接留在 route，而没有并进 `LibraryBrowseBody`
- `OverlayScrollbarsComponent`、scroll restore 逻辑和其他 page-level lifecycle 仍然留在 route
- `LibraryHeader` 的 legacy fallback events 仍然还没有清掉
