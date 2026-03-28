# 0045: 让独立 reader window 更像一个单独的阅读窗

这次改的不是 reader 功能，而是 reader **窗体感**。

前一提交我们已经让 `library` 在桌面端优先开独立的 reader window，但如果新窗口里的内容只是“把主应用页面原样塞进去”，视觉上仍然会不对。

所以这一步只处理：

- `mode=window` 下的外层壳
- 独立 reader window 的留白
- 三栏之间的窗体关系

## 这次做了什么

1. 给 layout 增加 `reader-window-root`

在 [`+layout.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte) 里，这次不仅隐藏了主应用 header 和 side rail，还给独立 reader window 的根容器单独加了样式分支：

- `reader-window-root`

这样新窗就不再沿用主应用页面那种默认外层感，而是能有自己的背景和节奏。

2. 在 reader route 识别 `mode=window`

在 [`reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里，这次正式把：

- `isWindowMode = searchParams.get('mode') === 'window'`

变成页面级视觉分支，而不仅仅是 layout 层级分支。

这一步很重要，因为：

- layout 只能决定“显不显示主壳”
- route 自己还得决定“独立阅读窗内部的空间怎么排”

3. 调整独立阅读窗的顶边和三栏关系

这次在 `window-mode` 下，专门做了这些调整：

- 顶部增加一层更接近 macOS overlay title bar 的留白
- `workspace` 的 gap 从普通页面模式的 14px 改成 0
- 三栏宽度重新收了一轮

这类变化看起来只是数字，但会直接改变“这是页面”还是“这是窗体里的阅读器”的感觉。

4. 压平右侧 bridge panel 的外层边框

因为在独立 reader window 里，bridge panel 不该再像“放在页面里的一个卡片区”，而应该更像 reader 窗内部的侧面板。

所以这次在 `window-mode` 下把它的：

- 外边框
- padding
- 背景权重

都往“内嵌 panel”方向压了一层。

## 你可以学到的具体知识

### 1. 为什么同一路由常常需要“页面模式”和“窗口模式”两套壳

`/reader` 这个路由，逻辑能力可以一样，但视觉上下文不一定一样。

比如：

- 在主应用里打开时，它是“一个页面”
- 在新窗口里打开时，它是“一个独立阅读窗”

如果不区分这两种模式，就会出现一个常见问题：

- 能力对了
- 但整体感觉始终不对

所以这次用了：

- `mode=window`
- route 和 layout 双层识别

这是一种很常见的 **同一路由多壳层策略**。

### 2. 为什么“窗体感”常常来自 gap、padding 和 top inset，而不是来自功能

很多时候，用户觉得一个界面“像一个独立应用窗口”，不是因为它多了什么功能，而是因为它的空间组织更像窗口。

例如这次最关键的变化就是：

- 顶部安全区
- 三栏间隙
- 外层背景
- 侧面板边界

这些都属于 **空间语法**。

它们比按钮文案更先决定用户会不会把这个界面读成“独立阅读窗”。

## 实际影响

现在 `br1` 在独立 reader window 模式下已经更像一个单独的阅读窗了：

- 不再像主应用里的普通页面
- 顶边更接近桌面阅读窗
- 三栏关系更贴窗体而不是贴网页

这还没到 `Readest` 的完整成熟度，但窗口模型和视觉壳层现在终于开始站在同一个方向上了。
