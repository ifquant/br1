# 背景

拆完 `searchController` 和 `notesController` 之后，`reader/+page.svelte` 里最明显还留着的一整块就是 sidebar 自己的 UI 状态：

- 是否显示
- 是否固定
- 当前宽度
- 当前 tab
- localStorage 偏好恢复
- 拖拽改宽度后的持久化

这些状态不属于搜索，也不属于笔记；它们是 sidebar 这个界面容器自己的行为。  
如果继续放在 route 里，route 仍然会承担很多“纯 UI 容器状态”，不够像真正的组合层。

# 主要目标

- 把 sidebar 的可见性、固定状态、宽度、tab 和偏好持久化抽成独立 controller
- 保持现有 reader/sidebar 行为不变
- 让 `reader/+page.svelte` 更接近 orchestration 层

# 改动概览

- 新增 [`src/lib/reader/sidebarController.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/sidebarController.ts)
- controller 内部收拢：
  - `visible`
  - `pinned`
  - `width`
  - `tab`
  - localStorage restore / persist
  - resize 拖拽开始逻辑
- [`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts) 导出 `createReaderSidebarController`
- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 改为：
  - 创建 `sidebarController`
  - 用 `$sidebarState` 驱动 `ReaderSidebar` / `ReaderStage` / workspace class/style
  - 用 controller 动作接 sidebar callbacks、window mode 偏好恢复和 resize handle
  - 在“打开笔记”或“note focus”时，通过 controller 切到 notes tab 并显示 sidebar

# 关键知识

## 1. 为什么 sidebar 偏好也是一个独立子系统

很多时候大家会把这些状态看成“小 UI 细节”，于是直接塞进 route：

- `sidebarVisible`
- `sidebarPinned`
- `sidebarWidth`
- `sidebarTab`

但这几项其实天然属于同一个界面子系统，因为它们共同描述的是：  
**“当前 sidebar 以什么方式存在”**。

而且它们还有一套自己的规则：

- 只有 window mode 才需要持久化 pin/width
- 打开某些 tab 时需要自动显示 sidebar
- resize 结束后要把结果写回偏好

这说明它不只是几个散变量，而是一个有内部规则的状态域。  
既然 search 和 notes 都拆成 controller 了，sidebar 自己的 UI 状态也值得这样做。

## 2. 为什么拖拽改宽度也应该跟着 controller 走

拖拽改宽度通常很容易写成 route 内的一坨事件处理：

- `mousedown`
- `mousemove`
- `mouseup`
- 改宽度
- 存本地

功能上当然能跑，但如果宽度本来就属于 sidebar 状态，那么 resize 事件本质上就是“sidebar 状态的一种写入方式”。  
把它留在 controller 的好处是：

- `width` 的 clamp 规则集中在一处
- persist 时机集中在一处
- route 不需要再理解 resize 的细节流程

也就是说，controller 不只是存“最终值”，还负责收拢“这个值如何被改变”。

## 3. controller 拆完后，route 才更像组合层

这次完成后，`reader/+page.svelte` 里已经没有独立维护 search / notes / sidebar 三套本地状态了。  
它现在更像是在做三件事：

- 解析 URL 和 auto-open 上下文
- 创建 controller
- 把 controller 和 reader 组件事件接起来

这正是 route 层比较理想的职责分配。  
当 route 主要做 orchestration，而不是维护大块业务状态时，后面继续演进 reader 架构会轻松很多。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有继续拆 auto-open / URL 解析逻辑
- `reader/+page.svelte` 里仍保留阅读进度持久化和窗口 chrome 编排逻辑
- 没有新增 sidebarController 的单元测试
