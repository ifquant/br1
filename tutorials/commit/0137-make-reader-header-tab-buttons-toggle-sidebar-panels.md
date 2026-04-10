# 背景

当前 reader header 里的 `搜索` / `笔记` 按钮有一个交互问题：

- 点它们会把 sidebar 切到对应 tab
- 但如果当前 tab 已经打开，再点一次也不会收起

这会让 header 顶部按钮显得像“只能单向打开”的命令，而不是一个真正的面板切换器。

对于桌面阅读器来说，这种按钮更自然的行为通常是：

- 点一次：打开对应面板
- 再点一次：收起当前面板

所以这次只修这一条交互，不碰渲染、不碰搜索/笔记逻辑本身。

# 主要目标

- 让 header 的 `搜索` / `笔记` 按钮变成真正的 toggle
- 保持 sidebar 内部 tab 点击仍然是“切换到该 tab 并保持打开”
- 不改动 sidebar 自身的数据结构和搜索/笔记业务逻辑

# 改动概览

- [`src/lib/reader/sidebarController.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/sidebarController.ts)
  - 新增 `toggleTab(tab)`
  - 规则很简单：
    - 如果当前 sidebar 已可见，且当前 tab 就是这个 tab，则收起 sidebar
    - 否则切到该 tab 并确保 sidebar 展开

- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
  - header 发出的 `switchsidebartab` 事件从原先的 `openTab(detail)` 改为 `toggleTab(detail)`
  - sidebar 自身内部 tab 和其他行为仍保持原来的 `openTab()` 语义

# 关键知识

## 1. 同一个“切 tab”动作，在不同入口上语义可以不同

这次最关键的点不是“加一个 if”，而是分清两个入口：

- **sidebar 内部 tab**
  - 语义是：我已经在面板里了，现在只想切 tab
  - 所以应该保持打开

- **header 顶部图标**
  - 语义更像“切换一个工具面板”
  - 所以更适合支持再次点击收起

也就是说，名字看起来都像“切 tab”，但交互语义其实不同。  
把它们都塞进同一个 `openTab()` 往往会让交互变钝。

## 2. controller 层很适合承载这种“小但真实”的 UI 语义

这次没有把判断逻辑写进组件里，而是加进 `sidebarController`：

- 组件负责发意图
- controller 负责把意图翻译成状态变化

这样做的好处是：

- route 和组件不需要重复判断“当前是否已打开”
- 以后如果还要让别的入口复用这个行为，也只需要复用 `toggleTab()`

## 3. 早期产品里，很多体验提升都来自“去掉单向按钮”

很多 UI 一开始都是：

- 有按钮
- 但按钮只有“打开”能力，没有“关闭/切换”能力

这样会造成一个常见问题：

- 用户点了以后得去别处关
- 原来这个按钮本身没有形成闭环

这次就是在把 header 图标补成一个闭环交互。

# 验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage'"` (PASS)

# 未覆盖项

- 这次没有新增针对 header toggle 行为的专门桌面回归
- `目录` 主按钮仍然走单独的 sidebar 显隐逻辑，没有改成统一 tab toggle
- 这次没有继续调整 header 图标样式或替换图标资源
