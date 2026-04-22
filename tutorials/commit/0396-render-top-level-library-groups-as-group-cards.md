# 0396 - 把顶层 grouped shelf 从 section 列表改成真正的 group card browse

## 背景

前两刀已经把 `br1` 的书库分组浏览推进到了：

- 可以按作者 / 归类 / 格式分组
- 可以进入某一组
- 当前组状态进入 URL
- header 知道当前正在浏览哪一组

但顶层 grouped shelf 仍然还有一个明显的不对齐点：

它虽然已经是 grouped browse 了，视觉上却还是：

- 一个个 section
- 每个 section 下面直接展开所有书

这会让 grouped browse 看起来更像“把原始书单切成几段”，而不是“先看组，再决定进入哪组”。  
而 `readest` 在这一层给的是 group item / group card，不是长 section。

## 这次要补什么

这次不再继续补 route state，而是直接改顶层 grouped shelf 的信息架构：

1. 当处于顶层 grouped browse 时，不再直接展开每组全部书
2. 顶层改成渲染每个 group 的独立卡片
3. group card 显示该组的封面拼贴、组名、数量和摘要
4. 点击 group card 再进入组内浏览

也就是说，页面不再一上来就把 grouped browse 退化成“分段长列表”，而是先给用户一个真正的分组入口层。

## 改动概览

- 在 [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 新增 `topLevelGroupedBrowse` 判断
- 顶层 grouped browse 时，主 shelf 改成渲染 `group-card`
- `group-card` 用每组前几本书的封面做拼贴
- list / grid 两种视图都能看 group card，而不是只在 grid 模式成立
- 进入组内之后，仍然回到已有的 grouped detail browse，不影响当前 URL 级 group navigation

## 为什么这一步重要

### 1. “按组浏览”不应该一上来就把组内容全部展开

如果顶层 grouped browse 还在直接展开每组的全部书，用户实际体验到的仍然是：

- 一个更长
- 只是多了标题分隔的书单

这和真正的 grouped browse 是两回事。

真正的 browse model 应该先回答：

- 有哪些组
- 每组大概是什么
- 我想先进去哪个组

所以这次把顶层 grouped shelf 改成 group card，本质上是在把信息架构从“分段列表”改成“组入口层”。

### 2. group card 才能承载组级摘要

section header 通常只能放：

- 组名
- 数量

而 group card 可以同时承载：

- 组名
- 数量
- 视觉预览
- 进入语义

这会让“这是一组书”这件事变得更直观，而不是只靠一行标题告诉用户这里是一组。

### 3. 这一步让后续更深的 group landing 更自然

等顶层已经是 group card 之后，后面的演进路径会更顺：

- 当前 group 的独立 landing
- 更深层的 subgroup / breadcrumb
- 更专门的 collection/tag browse 入口

如果顶层还一直是 section 列表，这些后续演进都会比较别扭，因为最外层的信息架构本身就是“展开态”。

## 结果

现在 `br1` 的 grouped library browse 已经更接近 `readest` 的页面心智：

- 顶层先看 group
- 组有自己的卡片和视觉摘要
- 再决定进入哪一组继续看

这比之前那种“虽然能分组，但顶层还是长列表 section”更像真正的书库浏览。

## 验证

- `pnpm check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 group card browse
- 这次还没有做更深的 subgroup / multi-level group landing
- 这次没有继续扩展 collection/tag 的专门 browse page
