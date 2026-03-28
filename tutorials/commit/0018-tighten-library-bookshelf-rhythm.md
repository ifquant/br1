# 0018 Tighten library bookshelf rhythm

## 背景

前几步已经先后处理过：

- `library` 被全局壳干扰的问题
- 页面里过多的解释型文案
- 顶部工具条的视觉密度

这时候最明显的剩余问题就变成了书架本身：

- 书卡虽然不再大小不一
- 但整体 still 更像“网页里的卡片区”
- 不够像 `Readest` 那种一列一列排开的 bookshelf

这说明问题已经不在单张卡，而在整块 shelf 的列数节奏和容器留白。

## 主要目标

- 把 bookshelf 从“自由铺开”收成更稳定的断点列数系统
- 收紧 shelf 与 shelf 之间、header 与书架之间的垂直节奏
- 让 import tile 更像 bookshelf 系统的一部分，而不是一个独立 CTA 卡

## 改动概览

- 更新 `src/lib/components/library/BookshelfPreview.svelte`
  - 给 bookshelf 引入统一的 `--book-width`
  - 把 `grid` 从自由填充改成断点列数规则
  - 调整 shelf header 对齐方式和 grid/list 的间距
  - 收紧 import tile 的边框、内阴影和 plus 视觉重量
- 更新 `src/routes/library/+page.svelte`
  - 收紧 `library-scroll` 的纵向 gap 和顶部 padding

## 关键知识

### 1. 书架式界面，通常更适合“断点列数”而不是 `auto-fill`

很多人第一反应会写：

- `grid-template-columns: repeat(auto-fill, minmax(...))`

这对通用卡片墙很方便，但对 bookshelf 往往不够稳。

原因是：

- 它会随着容器宽度不断浮动
- 同一行的节奏会根据剩余空间变化
- 页面更像响应式卡片展示，而不是固定书列

而阅读器书架常常更像：

- 大屏 6 列
- 中屏 5 列或 4 列
- 小屏 3 列或 2 列

也就是“断点切换列数”，而不是“每个像素都重新算”。

这种写法的好处是：

- 视觉节奏稳定
- 书架更像书架
- 和真实桌面应用的布局语言更接近

### 2. 页面是否像应用，很多时候取决于容器节奏，不取决于单个卡片

这一步没有重做书卡内部排版，但页面还是会明显更像 `Readest`。

原因在于，用户先感知的是：

- 顶部工具条和书架之间有多远
- shelf 和 shelf 之间的距离是不是克制
- 每列之间是不是有稳定节奏

这些都属于“容器级节奏”。

一个很实用的经验是：

- 当页面已经“方向差不多”
- 但 still 有网页感

优先检查：

- 容器 padding
- section gap
- grid column rhythm
- 对齐方式

而不是立刻继续雕单张卡片。

### 3. 可以先用 CSS 变量收住核心尺寸，再继续往下打磨

这一步把书宽收进了 `--book-width`。

这样做的价值很直接：

- 后面要继续调 bookshelf，只需要改一个核心尺寸
- 响应式断点也更容易一起调整
- 书卡、封面壳、grid 列数能围绕同一套尺寸规则变化

这是一种很常见的 UI 收口手法：

- 先找出“反复出现的核心尺寸”
- 再把它收成变量

这样后续视觉对齐就不会到处追数值。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有继续重做单张书卡内部排版
- 这次没有把 import tile 换成真实交互入口
- 这次只处理 bookshelf 的列数节奏、间距和容器存在感
