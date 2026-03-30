# 0092 把 reader sidebar 做成更像 panel system

这次不是继续修静态布局，而是把 `reader` 的侧栏行为往 `Readest` 的 panel 模型拉了一层：

- pin / unpin
- overlay / docked
- resize

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

### 1. route 层开始管理 sidebar 的真正状态

现在 reader 不只知道：

- `sidebarVisible`

还多了：

- `sidebarPinned`
- `sidebarWidth`

这意味着侧栏不再只是“有或没有”，而是开始有桌面应用常见的 panel 行为。

### 2. pinned 时停靠，unpinned 时浮层

在 `window-mode` 下：

- `pinned` -> sidebar 占左侧一列
- `unpinned` -> sidebar 改成覆盖在正文上的 overlay panel

这比一直固定两列更像 `Readest` 的阅读器结构。

### 3. 增加最小 resize

当 sidebar 处于 pinned 状态时，现在可以通过一条竖向 resize handle 调宽或调窄。

当前范围：

- 最小 `208px`
- 最大 `380px`

### 4. 把 panel 偏好存到 localStorage

Reader 会把 pin 状态和宽度写到：

- `br1.reader.sidebar`

这样下次打开 reader 时，侧栏不会总是回到默认值。

### 5. sidebar 顶部按钮开始真的控制 panel

现在：

- `☰` -> toggle sidebar
- `📌 / ⌖` -> pin / unpin
- `×` -> hide sidebar

不再只是摆设。

## 这次能学到的 2 个编程点

### 知识点 1：panel 的“是否显示”和“是否停靠”最好拆成两层状态

只用一个 `visible`，通常不足以表达桌面阅读器的 panel 行为。  
这次拆成：

- `visible`
- `pinned`

后，布局模型就清楚很多。

### 知识点 2：最小 resize 不一定一开始就要抽 hook

只要逻辑边界清楚，先用：

- `mousedown`
- `mousemove`
- `mouseup`

把交互跑通，通常比过早抽象更稳。

## 这次还没做什么

- overlay sidebar 还没有 backdrop
- resize 还没有键盘无障碍控制
- search / notes 仍然只是 tab 占位，还没有真正内容

这次先把 panel 行为模型立住。
