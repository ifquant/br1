# 0050: 用显式窗口拖拽修复阅读窗拖动，并继续放宽正文舞台

## 背景

用户反馈独立 `reader window` 还有两个实际问题：

- 窗体依然不好拖动
- 正文看起来还是没有明显变大

前面只靠 `data-tauri-drag-region`，但在真实桌面使用里，命中区仍然太碎。  
而正文宽度虽然已经恢复了一轮，但还可以继续把可用空间还给阅读舞台。

## 这次做了什么

1. 新增 [windowDrag.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/services/windowDrag.ts)

- 封装 `startCurrentWindowDrag()`
- 只在主鼠标键按下时触发
- 遇到按钮、输入框、链接等交互元素时直接跳过，避免误拖
- 内部调用 Tauri 的 `getCurrentWindow().startDragging()`

2. 更新 [reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)

- 给独立阅读窗顶部 `window-chrome` 接显式拖拽
- 给中间标题区也接显式拖拽
- 继续把 `window-mode` 下的 sidebar 列宽压小一点，把空间让给正文

3. 更新 [ReaderWorkspace.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)

- 给 `head-meta` 这块更大的标题区域接显式拖拽
- 保持 controls 区不参与拖拽

4. 更新 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)

- 把 `engine-paper.window-mode` 最大宽度继续放宽
- 进一步减小空态时的外围 padding 和 box 感
- 让独立阅读窗更像直接进入正文，而不是一张卡片放在舞台中间

## 关键知识

### 1. `data-tauri-drag-region` 很方便，但桌面体验未必够稳

声明式 drag region 很适合快速搭窗体。  
但如果顶部区域里混着很多子元素，真实命中面积往往没有你想的那么大。

这时更稳的办法是：

- 在明确的顶部区域监听 `mousedown`
- 调 `getCurrentWindow().startDragging()`
- 同时排除按钮、输入框、链接这些交互元素

这样拖动行为更可控。

### 2. 阅读器的“正文变大”不只是改一个 `max-width`

如果布局外层还有很多：

- 常驻侧栏
- 大 padding
- 多层卡片边框

那即使你把正文本身的 `max-width` 放宽，体感也不一定明显。  
所以放大正文通常要配合：

- 缩小非正文列宽
- 减少外层 padding
- 去掉多余的卡片壳

这三件事一起做，变化才会明显。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做

- 右侧 `bridge` 还没有做成真正可展开的折叠面板
- `reader` 顶部和 sidebar 行为仍然没有完全对齐 `Readest`
