# 0029 Tighten reader surfaces before engine

## 背景

上一轮已经把 `reader` 的大骨架从说明页压成了更像真正阅读器的三栏结构。

但当骨架一立起来，接下来最容易露馅的地方就变成了两个表面层：

- 左侧 sidebar 看起来还不够像真正可滚动的 reader panel
- 中央阅读主舞台的“外层 host”和“内层纸面”之间还稍微有点松

这类问题如果不先收住，后面一旦把真实 TOC 或阅读引擎挂进来，界面很容易又显得松散。

所以这一步还是不接引擎，只继续压表面层。

## 主要目标

- 给 reader sidebar 接上和 `library` 同风格的滚动表面
- 让中央阅读区的 host 和 paper 关系更紧凑
- 继续提升“像阅读器”的密度，而不是“像布局 demo”

## 改动概览

- 更新 `src/lib/components/reader/ReaderSidebar.svelte`
  - 接入 `OverlayScrollbarsComponent`
  - 给 sidebar scroll 容器补上更轻的 `os-theme-readest`
  - 保留当前只是预览用的 TOC 内容
- 更新 `src/lib/components/reader/ReaderWorkspace.svelte`
  - 收紧中央 canvas 外层 padding
- 更新 `src/lib/components/reader/ReaderViewport.svelte`
  - 收紧外层 host padding
  - 微调内层 paper stage 的 padding 和移动端关系

## 关键知识

### 1. sidebar 的滚动表面，最好在早期就先定下来

很多人会觉得：

- 等 TOC 真接上了
- 再做 sidebar scroll

但对阅读器来说，scroll surface 本身就是 UI 结构的一部分，不只是“数据多了才需要”。

如果 sidebar 的滚动表面不先定：

- TOC 真挂进来时会开始挤压 layout
- 你就会一边接逻辑一边返工 panel 样式

所以更稳的路径 usually 是：

- 先把 sidebar 当成一个真正会滚动的 panel
- 再把真实内容塞进去

这也是为什么这一步先给 sidebar 接 `OverlayScrollbarsComponent`。

### 2. 阅读画布通常有两层留白，不是一层

这一步同时改了两个地方：

- 外层 `engine-host`
- 内层 `engine-paper`

这是因为阅读器主舞台常常不是“一个盒子加 padding”这么简单，而是两层空间关系：

- 外层 host：决定阅读器 chrome 和正文之间的缓冲区
- 内层 paper：决定正文真正的纸面感

如果只调其中一层，常见结果是：

- 外层太松，正文像飘在中间
- 或者内层太松，纸面不够稳

所以这一步不是单改一个 padding，而是一起调两层。

### 3. UI 对齐到中后期时，很多进步来自“收紧表面”，不是“新增功能”

这一步没有新增任何能力：

- 没加 TOC 逻辑
- 没加阅读引擎
- 没加 bridge 行为

但它 still 很值，因为它处理的是一个常见问题：

- 功能还没来，但表面已经决定了体验天花板

一个很实用的经验是：

- 如果页面已经有大体结构
- 但 still 不够像目标产品

那下一步 often 应该先问：

- 哪个表面层还太松、太网页、太像 demo

而不是立刻继续堆功能。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有接真实 TOC、搜索、笔记逻辑
- 这次没有开始接 `foliate-js`
- 这次只继续压 reader 的 sidebar scroll surface 和中央阅读主舞台关系
