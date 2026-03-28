# 0054: 像 Readest 一样，把 reader 顶栏和底栏覆盖到主舞台之上

## 背景

之前 `ReaderStage` 虽然已经拆成：

- `ReaderHeaderBar`
- `ReaderViewport`
- `ReaderFooterBar`

但它们还是按普通文档流上下排布。  
这和 `Readest` 的核心模型 still 不一样，因为 `Readest` 的阅读器主舞台是主体，而 bar 是覆盖层，不是把正文往中间挤开的普通区块。

## 这次做了什么

1. 更新 [ReaderHeaderBar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte)

- 在 `window-mode` 下改成绝对定位覆盖层
- 贴到 reader stage 顶部

2. 更新 [ReaderFooterBar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte)

- 新增 `isWindowMode`
- 在 `window-mode` 下改成底部绝对定位覆盖层

3. 更新 [ReaderStage.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte)

- `window-mode` 下让整个 stage 变成 `relative + overflow hidden`
- 给中央 `canvas` 预留顶部/底部 inset
- 让 viewport 真正在一整块连续舞台里工作，而不是夹在两个条带之间

## 关键知识

### 1. “拆组件”不等于“布局就对了”

把 `HeaderBar`、`Viewport`、`FooterBar` 拆成三个组件，只解决了**职责问题**。  
如果它们在布局上还是普通文档流：

- header 占一行
- viewport 占一行
- footer 再占一行

那视觉上仍然不像真正的阅读器。

### 2. 阅读器里，bar 常常是 overlay，不是 block

`Readest` 这类阅读器更常见的模型是：

- 主舞台先占满
- header / footer 再以绝对定位覆盖在上面
- 主舞台通过 padding / inset 给 bar 留安全空间

这样正文仍然被感知为“整个中间区域”，而不是“被上下两条工具栏夹着的一块内容区”。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做

- `HeaderBar` 和 `FooterBar` 还没有实现 `Readest` 那种更完整的 hover/显隐行为
- `ProgressBar` 还没有独立成像 `Readest` 那样的覆盖层组件
