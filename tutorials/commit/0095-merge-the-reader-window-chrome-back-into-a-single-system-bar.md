# 0095: 把 reader 顶部双层 chrome 压回单一系统 bar

这次提交继续对齐 `Readest` 的 `reader` 顶部行为。问题不在某个按钮图标，而在结构：之前 `br1` 的独立阅读窗同时有一层可见 `window-chrome`，又有一层 `ReaderHeaderBar`，用户看到的是“两层 header 叠着”，这和 `Readest` 的单一系统 bar 不一样。

## 这次想解决什么

之前的 `window-mode` 顶部结构大概是这样：

- 路由层渲染一个可见的 `window-chrome`
- `ReaderStage` 里再渲染一个可见的 `ReaderHeaderBar`

这样会带来两个问题：

1. 视觉上像两个顶栏叠在一起
2. 行为上拖拽区、标题区、工具区没有形成一个统一的顶部系统表面

`Readest` 的顶部虽然也有窗口层和内容层的概念，但用户看到的是一个更统一的 bar，而不是两块分离的 UI。

## 这次改了什么

改动文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`

### 1. 把路由层的 `window-chrome` 退回成“纯拖拽壳”

现在 `window-chrome` 只做两件事：

- 保留顶部 drag strip
- 给 macOS traffic lights 留视觉空间

它不再自己渲染标题和右侧假按钮，所以不会再和真正的 reader header 抢角色。

### 2. 把 `ReaderHeaderBar` 收成真正可见的系统 bar

在 `window-mode` 下：

- 左侧加了独立 `☰` 工具位
- 中间是书名/作者/章节
- 右侧保留 reader controls

这样更接近 `Readest HeaderBar` 的结构分工：

- 左边是导航/面板控制
- 中间是标题信息
- 右边是工具动作

### 3. 让标题真正居中

以前标题区更像左对齐 metadata。  
现在 `window-mode` 下：

- `.reader-head` 改成三列 grid
- `.head-meta.window-mode` 改成居中对齐
- `subtitle-row` 也跟着居中

这会更接近 `Readest` 的中央标题语法。

## 这次对应的编程知识

### 1. “视觉元素”和“交互壳”可以是两层不同职责

这次一个很重要的思路是：

- `window-chrome` 继续存在
- 但它不再承担“可见 header”的职责

这是一种很常见的桌面 UI 分层方式：

- 一层只负责宿主能力，比如拖拽、traffic lights 留白
- 另一层负责真正给用户看的产品 UI

这样分层后，代码职责会更稳，不容易出现“同一层既要处理系统窗口，又要处理产品 header”的混乱。

### 2. 用 grid 比 flex 更适合“左工具 / 中标题 / 右工具”

这次 `window-mode` 下的 `ReaderHeaderBar` 改成了三列 grid。

原因是这种结构本质上不是“内容自然流动”，而是一个很固定的布局语法：

- 左边一个固定工具槽
- 中间一个会收缩但要保持视觉居中的标题槽
- 右边一个动作区

这种时候 `grid-template-columns: 44px minmax(0, 1fr) auto` 会比纯 `flex` 更容易得到稳定的视觉中心。

## 我实际怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 这次还没做的

- 顶部 bar 还没有完全接成 `Readest` 那种 hover/compact/fullscreen 细行为
- 右侧工具按钮还只是最小占位动作，不是完整的 `ViewMenu / Notebook / Translation` 体系
- macOS traffic lights 只是留白语法对了，还没有完全复刻 `Readest` 的窗口按钮整合
