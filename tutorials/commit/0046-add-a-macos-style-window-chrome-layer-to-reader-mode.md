# 0046: 给独立 reader window 补一层更像 macOS 的顶部 window chrome

这次不是继续改 reader 内容区，而是补 **窗口顶部的语法**。

前面虽然已经让 `br1` 在桌面端点书时可以开独立 reader window，也让 `mode=window` 下去掉了主应用 header 和 side rail，但视觉上还差一口气：

- 它仍然更像“一个页面”
- 而不像“一个单独的 macOS 阅读窗”

所以这一步只做窗口顶部这一层。

## 这次做了什么

1. 给 `mode=window` 加了专门的 `window-chrome`

在 [`reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里，这次在 `window-mode` 下单独渲染了一条顶部 chrome：

- 左边留出 traffic lights 区
- 中间是轻标题
- 右边留一个对称的动作占位

这样窗口一打开，用户第一眼看到的就更像独立桌面阅读窗，而不是把页面直接塞进新窗口。

2. 顶部区域加了 `data-tauri-drag-region`

这一条很关键。

`Tauri` 的 overlay title bar 场景里，顶部很多区域本身不是系统标题栏的默认拖拽区，所以要显式告诉窗口系统：

- 这块区域可以拖动窗口

因此这次把 `window-chrome` 和中间标题区都标了：

- `data-tauri-drag-region`

这会让新开的阅读窗在交互上更像一个真正的桌面窗口。

3. 重新计算了 `window-mode` 下的纵向空间

顶部加了 chrome 之后，workspace 的高度也要跟着重算。

所以这次把：

- `calc(100vh - 30px)`

改成：

- `calc(100vh - 46px)`

否则阅读区会和顶部新 chrome 的高度关系不对，容易显得挤或者错位。

## 你可以学到的具体知识

### 1. 为什么“独立窗口感”常常先来自顶部区域，而不是正文

用户判断一个界面是不是“独立桌面窗口”，很大程度上是靠顶部语法：

- 有没有明显的 title bar 留白
- 有没有 traffic lights 的位置感
- 顶部是不是像能拖拽

这些东西比正文内容更早进入视觉判断。

所以如果顶部没处理好，即使正文已经很像阅读器，整体仍然容易被看成“网页放进桌面壳里”。

### 2. `data-tauri-drag-region` 解决的是什么问题

在 Tauri 的 overlay title bar 模式下，系统标题栏和 Web 内容区的边界不像传统窗口那样天然分明。

如果不指定拖拽区，常见结果是：

- 顶部看起来像标题栏
- 但用户拖不动

这会立刻破坏桌面应用的真实感。

所以 `data-tauri-drag-region` 的作用不是“美化”，而是补上 **桌面窗口交互语义**。

## 实际影响

现在 `br1` 的独立 reader window 至少在顶部这层已经更像 macOS 阅读窗了：

- 有标题栏语法
- 有 traffic lights 留白
- 有可拖拽区域

这一步做完后，下一步如果继续收，就该开始处理：

- 左右 panel 在独立窗里的边界语法
- 顶部 chrome 和 reader 内容区的进一步融合

而不是再回去做普通页面式 polish。
