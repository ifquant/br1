# 背景

reader 顶栏右侧一直有一个 `⋯` 按钮，但它之前是死的：

- 用户能看到
- 但点了没有任何动作

这类按钮会快速拉低产品可信度，因为它看起来像“还有更多能力”，但实际上什么也没有接。

这次不直接做完整的 View Menu，而是先补一个**最小可用**版本：

- `Open book`
- `Pin/Unpin sidebar`

这样可以先把死按钮变成真实入口，再继续往 Readest 的菜单形态靠。

# 主要目标

- 让 header 的 `⋯` 变成真实可点击的菜单入口
- 提供两个当前已经有后端/状态支持的动作：
  - 打开书籍
  - 固定/取消固定 sidebar
- 不一次性引入复杂菜单系统

# 改动概览

- [`src/lib/components/reader/ReaderHeaderBar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte)
  - 新增本地 `menuOpen` 状态
  - 新增一个最小弹出菜单
  - 支持：
    - 点击 `⋯` 打开/关闭菜单
    - 点击菜单外关闭
    - `Escape` 关闭
  - 菜单动作接到：
    - `onOpenPicker`
    - `onTogglePin`

- [`src/lib/components/reader/ReaderStage.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte)
  - 新增 `togglepin` 事件
  - 把 `ReaderHeaderBar` 的 `onTogglePin` 接到 stage 事件派发

- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
  - 接收 `togglepin` 事件并转给 `sidebarController.togglePinned`

# 关键知识

## 1. 早期菜单实现，先做“最小真实动作”比先做“大而全框架”更稳

很多时候看到一个 `⋯` 按钮，第一反应是：

- 做一个完整 dropdown
- 塞很多动作
- 配一堆状态

但如果当前项目还在快速对齐阶段，更稳的顺序通常是：

1. 先让按钮不是死的
2. 先接两个已经存在、确定有价值的动作
3. 等结构更稳定后再扩菜单

这样能更快把“假交互”变成“真交互”。

## 2. 点击外部关闭菜单，本质是“事件边界判断”

这次菜单关闭逻辑用了一个很经典的技巧：

- 在 `window` 上监听 `mousedown`
- 判断事件目标是否仍在 `.menu-anchor` 内
- 如果不在，就关闭菜单

这个模式在前端里非常常见。  
关键点是别直接对 `Node` 调 `closest()`，因为 TypeScript 不保证 `Node` 有这个方法；更稳的是先收窄到 `Element`。

## 3. 通过事件穿透把动作保持在正确层级

这次没有让 `ReaderHeaderBar` 直接知道 sidebar store，而是：

- Header 只发动作
- Stage 继续做组件编排
- Route 再把动作接到 controller

这样做的好处是组件边界更稳：

- header 保持轻
- stage 负责中转
- route/controller 负责真实状态修改

这和前面做 controller 拆分的方向是一致的。

# 验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'opens the first library book in a separate reader window'"` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有实现完整的 Readest 风格 View Menu
- 菜单还没有接阅读设置、主题、搜索等更多动作
- 这次没有新增针对菜单开关本身的专门自动化用例
