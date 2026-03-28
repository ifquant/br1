# 0049: 通过让正文重新成为主角，恢复独立阅读窗布局

## 背景

`br1` 的独立阅读窗已经能打开了，但视觉上仍然和 `Readest` 差很多。  
最明显的问题不是颜色，而是布局模型错了：

- 右侧 `bridge` 常驻，占掉了一整列
- 中央主舞台还在显示开发期说明
- 顶部有两层 bar，正文被继续往下挤

结果就是窗口虽然很宽，但真正给正文用的宽度反而不大。

## 这次做了什么

1. 在 [reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)

- `window-mode` 下改成 `sidebar + reading stage` 两栏
- 右侧 `bridge` 在独立阅读窗里默认收起，不再常驻占列

2. 在 [ReaderWorkspace.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)

- 把传给 viewport 的文案从“Reader Engine Boundary”收回成更中性的阅读语义
- 继续压轻 `window-mode` 下的 header、canvas、footer

3. 在 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)

- 增加 `isWindowMode`
- 在独立阅读窗里不再显示顶部说明头
- 不再在主舞台里放大段开发态说明文字
- 把 `Open sample` 收成一个更轻的空态动作
- 放宽阅读纸面的最大宽度，让正文真正吃到窗口空间

## 关键知识

### 1. 阅读器布局里，最值钱的是“把空间给正文”

很多阅读器一开始会犯一个错：

- 左边想放目录
- 右边想放 AI / 注释 / 工具
- 中间再放正文

结果就是每一层都“有道理”，但正文被夹在中间，反而最小。  
对阅读器来说，正文不是中间那一块区域之一，而是整个布局的主角。

### 2. 占位文案如果放在主舞台中央，会直接破坏产品气质

像：

- `Reader Engine Boundary`
- `ready to open`
- 一整段“下一步再接什么功能”的文字

这些内容在开发时有帮助，但一旦放进主舞台中央，用户看到的就不再是阅读器，而是 demo。  
所以更稳的做法是：

- 技术状态尽量藏到边缘
- 空态只保留一个轻量动作
- 把主要视觉空间留给未来真实内容

## 验证

- `pnpm check`
- `git diff --check`

## 还没做

- 右侧 `bridge` 只是默认收起了，还没有真正做成可展开的成熟面板
- `reader` 顶部仍然是简化版，不是 `Readest` 那套完整的 hover/system-driven header 行为
