# 0048: 收紧独立阅读窗的表面层，并扩大可拖拽区域

## 背景

`br1` 已经能像 `Readest` 一样从 `library` 点书后打开独立的 `reader window`，但新窗还有两个明显问题：

- 布局还是像“三栏页面被放进一个新窗口”，不像真正的阅读窗
- 顶部可拖拽区域太窄，拖动手感差

这一步不动阅读引擎逻辑，只收 `window-mode` 下的表面结构。

## 这次做了什么

1. 调整 [reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)

- 把 `window-chrome` 压成更薄的一层
- 把 `window-mode` 下的三栏宽度收紧
- 让左右侧栏更像嵌在同一个阅读窗表面里，而不是独立卡片

2. 调整 [ReaderWorkspace.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)

- 新增 `isWindowMode`
- 在 `window-mode` 下，让顶部 header 和窗体表面更连续
- 把书名/作者这块变成更大的拖拽热区

3. 调整 [ReaderSidebar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte)

- 新增 `isWindowMode`
- 去掉更重的卡片感边框
- 让它在独立阅读窗里更像系统侧栏

## 关键知识

### 1. 桌面窗体的“好拖动”通常不只靠一条标题栏

如果只有一个很薄的标题栏能拖动，用户会觉得窗体“难抓”。  
在桌面阅读器里，更常见的做法是：

- 顶部有一条明确的 drag strip
- 同时把不会点击的标题/元信息区也变成 drag region

这样拖动命中面积会大很多，体验也更接近原生桌面应用。

### 2. “独立窗口”不等于“把原页面再包一层”

如果新窗口只是把原页面照搬进去，视觉上会出现两层 header、两层边框、两层节奏。  
更自然的做法是：

- 让 window chrome 更薄
- 让 reader 自己的 header 和窗体顶部连成一个表面
- 把边框和留白压成一套系统

这样用户会把它感知成“一个真正的阅读窗”。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做

- 右侧 `bridge` 仍然是占位表面，还没进入真正的产品级面板状态
- `reader` 还没有做像 `Readest` 那样的 sidebar pin/resize/overlay 行为
