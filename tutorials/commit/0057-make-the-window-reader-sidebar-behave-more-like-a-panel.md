# 0057: 让独立 reader window 的 sidebar 更像 panel，而不是永久占位列

这次提交修的不是“一个按钮”，而是 reader 的空间分配方式。

之前 `br1` 的独立阅读窗有个很明显的问题：

- 左侧 sidebar 永久占着一列
- 中间正文就算已经改成 fill-parent，也还是会被持续压窄
- 用户不能像 `Readest` 那样把目录面板收起来，专心读正文

`Readest` 的侧栏不是单纯一块左边栏，它更像一个 **panel system**：

- 可以显隐
- 可以 pin
- 在不同环境下可以 overlay

这次我们先不一次做完所有行为，而是先把最重要的一步翻译过来：

**独立阅读窗里的 sidebar 可以收起，正文列会立刻变大。**

## 这次改了什么

1. `reader/+page.svelte`

新增了 `sidebarVisible` 状态。

在 `window-mode` 下：

- 如果 sidebar 可见，workspace 是两列
- 如果 sidebar 收起，workspace 直接变成单列正文

这一步很关键，因为真正改变正文宽度的，不是调 `max-width`，而是 **去掉一整列布局占位**。

2. `ReaderStage.svelte`

`ReaderStage` 现在会往上派发 `togglesidebar` 事件。

这意味着：

- header 里的“目录按钮”不再只是装饰
- 它真的能影响 route 层的布局

这就是一个很典型的“组合层负责布局状态，子组件负责发意图”的结构。

3. `ReaderHeaderBar.svelte`

顶部工具条新增了一个真正可用的 sidebar 开关按钮：

- 可见时是 “Hide contents panel”
- 隐藏时是 “Show contents panel”

这比之前“看起来像按钮，实际上没改布局”的状态强很多。

4. `ReaderSidebar.svelte`

侧栏右上角按钮在 `window-mode` 下不再假装是 pin，而是直接变成关闭当前 panel。

这让它更像一个真正的 reader panel，而不是一块永远存在的固定边栏。

## 你可以学到的具体知识

### 1. 真正决定正文宽度的，常常不是内容区自己的宽度，而是“旁边还有几列”

很多人看到正文窄，会先去调：

- `max-width`
- `padding`
- `margin`

但如果 layout 本身还是：

- 左栏一列
- 中间正文一列

那正文天然就已经输了一步。

这次最重要的改动，其实不是正文组件，而是：

- `workspace.window-mode.sidebar-hidden { grid-template-columns: minmax(0, 1fr); }`

一句话，就是把“旁边那一列”直接拿掉。

### 2. 组合层状态应该放在 route 或上层容器，不要塞回单个面板里

这次 sidebar 的显示状态没有塞进 `ReaderSidebar.svelte` 自己。

而是：

1. `ReaderHeaderBar` 发“我想切换侧栏”的意图
2. `ReaderStage` 往上转发这个事件
3. `reader/+page.svelte` 真正持有 `sidebarVisible`
4. route 决定 grid 列数和是否渲染侧栏

这种方式的好处是：

- sidebar 自己不用知道外层布局怎么变
- header 自己也不用硬耦合 route
- 真正控制布局的地方，始终是上层组合层

这在 Svelte、React、Vue 里都很通用。

## 这次怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check` 通过
- `git diff --check` 通过

## 还没包括什么

- 这还不是 `Readest` 那种完整 sidebar system，还没有 pin / resize / overlay 模式
- 这次没有继续动 footer/header 的 hover 显隐逻辑
- 这次也没有处理 library 的持久化导入，只改 reader 窗体里的 panel 行为
