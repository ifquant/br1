# 0397 - 让 grouped browsing 变成更专注的书库模式

## 背景

前几刀已经把 `br1` 的 grouped library browse 推到了：

- 顶层先看 group cards
- 当前 group 进入 URL
- header 知道当前正在浏览哪一组

但页面结构里还残留着一个很重的旧心智：

- `继续阅读`
- `最近阅读`
- `待修复书籍`

这些阅读工作流 section 仍然和 grouped browse 混在同一个滚动页里。

这会让 grouped browse 虽然“已经存在”，却还没有真正成为一个独立的 library mode。  
用户一旦选择按作者 / 归类 / 格式浏览，页面的注意力理应收回到书库结构本身，而不是继续把 workflow 区块顶在前面。

## 这次要补什么

这次不再继续改 shelf 视觉，而是直接改 page-level composition：

1. 当用户进入 grouped browse 时，隐藏 `继续阅读 / 最近阅读 / 待修复书籍`
2. grouped browse 下，空态和命中数只围绕当前书库 browse 结果计算
3. shelf 标题也改成更符合当前 browse context 的名字，例如：
   - `作者书架`
   - `归类书架`
   - `格式书架`

这一步的本质是：  
把 grouped browsing 从“同一页里又多了一种显示方式”推进到“真正独立的书库浏览模式”。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 新增 `libraryGroupedBrowseMode`
- grouped browse 下，`visibleLibraryBooksCount` / `visibleStarterLibraryBooksCount` 改为只统计 shelf 本身
- grouped browse 下，不再渲染：
  - `待修复书籍`
  - `继续阅读`
  - `最近阅读`
- grouped browse 下，`readingWorkflowNotice` 和样例书架对应 notice 也不再出现
- 主 shelf 的标题改为按当前 browse mode 生成，而不总是 `你的书库`

## 为什么这一步重要

### 1. browse mode 和 workflow mode 最好不要混在同一层

`继续阅读 / 最近阅读 / 待修复` 这些 section 是 workflow surface。

它们回答的是：

- 你刚才在读什么
- 哪些书需要恢复
- 哪些书还在阅读流程里

而 grouped browse 回答的是：

- 书库按什么结构组织
- 我想从哪个作者 / 归类 / 格式进入

这两种问题不是同一个层级。

如果继续把它们混在一起，grouped browse 就很难真正成为页面主线，只会像一个附属布局。

### 2. 用户一旦选择“按组浏览”，就已经在切换意图

当用户点击：

- 按作者
- 按归类
- 按格式

这其实已经是在说：

- “我现在不是来走阅读 workflow 的”
- “我是来按结构浏览书库的”

页面应该响应这种意图切换，而不是还把 workflow 区块继续压在前面。

### 3. 这会让后面的 group landing 更自然

如果 grouped browse 已经有了更独立的 page mode，后续继续做：

- group landing
- subgroup hierarchy
- 更深的 group browse path

都会自然很多。

否则后面每一层 group browse 都还要先和 `继续阅读 / 最近阅读 / 待修复` 争页面主导权。

## 结果

现在 `br1` 的 grouped browse 已经不只是：

- 有 group state
- 有 group card
- 能点进去

而是进一步变成：

- 一个更专注的 library mode
- 页面主线围绕当前 grouped shelf 展开
- workflow 区块不再和 grouped browse 抢同一层注意力

这比继续补一个局部 UI，更接近真正的 product-level 对齐。

## 验证

- `pnpm check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 grouped browse mode 的页面组合
- 这次还没有做更深的 subgroup / landing hierarchy
- `待修复书籍` 在 grouped browse 下虽然仍有 header 摘要，但还没有单独的 grouped-browse 入口或 side panel
