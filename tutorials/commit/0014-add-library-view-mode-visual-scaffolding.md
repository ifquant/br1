# 0014 Add library view-mode visual scaffolding

## 背景

前几刀已经把 `library` 压得更像 `Readest`，但还有一个明显差距：

- 页面虽然有书架
- 但还是缺少 `Readest` 那种“这是一套成熟浏览模式”的感觉

原因之一是现在的 `br1` library 主要还是重复的网格区块，视觉上缺少：

- grid / list 的模式差异
- 更工具化的 section header
- import tile 这类典型阅读器书架元素

## 主要目标

- 给书架组件补上更明显的 view-mode 视觉骨架
- 让 `library` 不再只是两块长得一样的卡片区
- 补一个更接近 `Readest` 语气的 import tile

## 改动概览

- 扩展 `BookshelfPreview.svelte`：
  - 新增 `viewMode`
  - 新增 `showImportTile`
- section header 补上更工具化的 mode + menu 视觉
- 在 grid 模式下加入 import tile
- 在 list 模式下让书卡切换到横向骨架
- 在 `library/+page.svelte` 中让两个 shelf 区域不再完全同形：
  - 第一组走 grid + import tile
  - 第二组走 list preview

## 关键知识

### 1. 成熟产品的“模式感”很多时候来自骨架变化，而不是文案变化

如果一个页面只是：

- 不同标题
- 不同文案
- 但组件骨架完全一样

那用户感知到的通常还是“同一块东西重复两次”。

这次加 `viewMode` 的意义就在这里：

- 让 shelf 组件在视觉上真正能切换模式
- 不是只换标签
- 而是连卡片排布和信息形状都一起变化

这会明显提高页面的产品完成度。

### 2. import tile 是书架类产品里很有用的视觉锚点

像 `Readest` 这类阅读器里，import tile 不只是一个按钮。

它还有一个很重要的视觉作用：

- 告诉用户这片区域是可扩展的书架
- 打破纯数据卡片的机械重复
- 让“管理书库”这件事在视觉上被感知到

所以一个好的 import tile，价值不只是“能点”，也是“让书架更像书架系统的一部分”。

### 3. 先做视觉 scaffold，再接真实逻辑，是一种更稳的产品实现顺序

这次的 list mode 还没有真实排序、grouping、切换逻辑。

但先把视觉 scaffold 做出来仍然有意义，因为它能先回答：

- 这个模式长什么样
- 它和 grid 差多少
- 页面是否会因为第二种模式而更像目标产品

这种顺序可以减少后面“逻辑接完才发现视觉形态不对”的返工。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有接真实 view mode 切换逻辑
- 这次没有实现真实 group item / group header
- import tile 目前仍然只是视觉占位，不会真的导入文件
