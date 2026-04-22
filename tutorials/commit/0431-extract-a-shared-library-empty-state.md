# 0431 - 把 library 空态收成 shared empty-state component

## 背景

前几刀已经把 library page 的大骨架往共享组件里抬了不少：

- page chrome
- body shell
- grouped browse shell

但 route 里还残留一类反复出现的页面块：

- 空书库
- 搜索无结果
- 筛选无结果
- filter recovery chips
- `清除筛选` / `从本机导入` / `同步 Readest` 这些空态动作

这些块本质上已经不是 route 应该继续手写的页面结构了。

## 这次做了什么

这次新增了一个 shared empty-state component：

1. [`src/lib/components/library/LibraryEmptyState.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryEmptyState.svelte)
   - 统一承接：
     - title
     - message
     - recovery chips
     - action buttons
   - 同时把空态样式也一起收进组件
2. [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)
   - 导出 `LibraryEmptyState`
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 删除 `emptyFilterRecovery()` snippet
   - desktop 空书库改成 `LibraryEmptyState`
   - desktop 搜索无结果 / 筛选无结果改成 `LibraryEmptyState`
   - starter 搜索无结果 / 筛选无结果也改成 `LibraryEmptyState`
   - 删除 route 里整组 empty-state 相关 CSS

## 为什么这一步重要

### 1. route 再少一类“重复但又不是核心业务”的页面块

空态在产品上当然重要，但它不是 route 应该反复手写的结构层。

这一刀之后，route 对空态只表达：

- 当前 title 是什么
- 当前 message 是什么
- 当前 recovery chips 和 actions 是什么

而不再表达空态布局和样式。

### 2. desktop/starter 的差异开始收敛到内容差异，而不是结构差异

现在 desktop/starter 空态仍然有不同文案和不同动作组合，这是合理的。

但它们已经共享：

- 同一个空态骨架
- 同一套 chips
- 同一套 action button look-and-feel

这比继续在 route 里维护好几段近似 section 要更稳。

### 3. library page shell 又更完整了一步

现在 shared shell 体系已经覆盖到：

- chrome
- body
- grouped browse
- empty state

也就是说，route 越来越不像“负责写页面”，而更像“负责提供状态和事件”。

## 结果

现在 `br1` 的 library page 共享边界又向前走了一步：

- shared page chrome
- shared browse body
- shared empty-state component

空书库、空搜索、空筛选和筛选恢复，不再散落在 route 里各写一遍。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- desktop 与 starter 的空态文案和动作集合仍然不同，只是结构层统一到了 shared component
- `OverlayScrollbarsComponent` 与 scroll restore 逻辑仍然留在 route
- `LibraryHeader` 里的 legacy fallback events 仍然没有清掉
