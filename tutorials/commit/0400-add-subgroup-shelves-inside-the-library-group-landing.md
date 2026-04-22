# 0400 - 在 library group landing 里补 subgroup shelves

## 背景

上一刀已经让 `br1` 的 group landing 不只是摘要区，而是多了一层 related pivots：

- 看当前组概览
- 看到相关作者 / 归类 / 格式
- 点按钮跳去别的组

但这一层仍然偏“动作提示”，不够像真正的 browse surface。用户知道可以跳去哪里，却还没有在当前 landing 里直接看到“如果按另一个维度继续看，会长什么样”。

这和 `readest` 式书库浏览还差一步：

- 当前组应该不只是摘要 + 按钮
- 而是应该能在 landing 里继续展开成下一层书架

## 这次要补什么

这次不再继续堆指标，也不再只加更多 pivot 按钮，而是把 active group 下的继续浏览入口升级成真正的 subgroup shelves：

1. 如果当前是作者组，就在 landing 里再渲染“按归类继续看”和“按格式继续看”
2. 如果当前是归类组，就再渲染“按作者继续看”和“按格式继续看”
3. 如果当前是格式组，就再渲染“按作者继续看”和“按归类继续看”
4. 这些子层不是平面按钮，而是直接复用 group-card shelf，让用户先看到结构，再决定进入哪一组

也就是说，group landing 现在开始有一点“层级书库”的味道，而不是静态说明牌。

## 改动概览

- 在 [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 里，把 group-card 点击回调改成同时带上目标 `groupBy`
- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里新增 `getActiveLibrarySubgroupShelves(...)`
- 让 active group landing 在 overview band 之后，再渲染 1 到 2 个 subgroup shelves
- 这些 subgroup shelves 继续复用现有 `BookshelfPreview`，但点击 group card 时会把浏览状态切到对应的 URL 级 `groupBy/group`

## 为什么这一步重要

### 1. browse hierarchy 需要“看得见的下一层”

按钮只是在说：

- 你可以继续去这里

而 subgroup shelf 说的是：

- 你继续下去之后，会看到怎样的一组书架

这两者的浏览感完全不同。前者更像菜单，后者更像真正的书库结构。

### 2. 复用 group-card shelf 比重造局部导航更对

这次没有新做一套 subgroup widget，而是继续复用已有的 `BookshelfPreview` group-card 模型。这样做的好处是：

- 顶层 grouped browse 和组内 subgroup browse 用的是同一种视觉语言
- 用户不用重新理解另一套局部组件
- route-level grouped state 仍然是唯一事实来源，不会多出第二套 browse 状态机

这是一种更稳的产品结构推进，而不是 UI 上另起炉灶。

### 3. 它让 landing 真正开始像“中间层”

现在 active group landing 已经不只是：

- 当前组摘要
- 当前组指标
- 当前组按钮

而是开始变成：

- 当前组摘要
- 当前组指标
- 当前组的下一层书架
- 然后再进入最终书单

这就是从“详情页”向“层级 browse 中间层”跨过去的一步。

## 结果

现在 `br1` 的 grouped browsing 在进入具体作者 / 归类 / 格式组之后，不再只是直接落到书单前的一个概览条。

它会先给出：

- 当前组概览
- 相关 pivots
- 相关 subgroup shelves

于是用户在当前 group 里就能先决定：

- 要不要沿作者继续拆
- 要不要沿归类继续拆
- 要不要沿格式继续拆

这比单纯“点个 pivot 然后跳走”更接近真正的结构化书库浏览。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 subgroup shelves 的点击路径
- subgroup shelves 目前仍然是单层展开，不是 breadcrumb 式多级 hierarchy
- 这次没有继续做 subgroup landing 自己的独立 summary/actions surface
