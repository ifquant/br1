# 0145: 给 reader sidebar 顶部书籍卡片补动作入口

## 这次改了什么

前几步已经把 reader sidebar 顶部卡片做得更像一个真实 book card：

- 有标题、作者、进度
- 有书签和笔记计数
- 有真实封面

但它仍然只是“展示信息”，不是“工作区入口”。

这一步只补两个最实用的动作：

- `回到书库`
- `打开原文件`

这样顶部卡片从单纯的状态展示，变成了一个可以直接发起操作的 reader 入口层。

## 为什么先做这两个动作

因为它们都是当前 reader 已经存在、且高频有用的动作：

- `回到书库`：用户读到一半回 library 很常见
- `打开原文件`：桌面书库场景下，用户经常需要在 Finder / 默认程序里打开原始文件

相比之下，像：

- 更多菜单
- 重命名
- 分享
- 书籍详情弹层

都属于下一阶段更完整的 workspace 设计，不适合混进这一小刀里。

## 实现上的关键点

### 1. 复用 route 里已有动作，不新增 service 层

这次没有去新建什么 `readerBookCardActions.ts`。

原因是：

- `handleGoToLibrary()` 已经存在
- `openLibraryBookPath()` 也已经存在

所以最稳的方式就是：

- 在 route 里把它们挂进 `ReaderSidebarCallbacks`
- sidebar 组件只负责触发

这依然遵守了现有边界：

- route 负责编排动作
- 组件只负责渲染和发出用户意图

### 2. `打开原文件` 只在 `library-file` 路径上出现

不是所有 reader 来源都能打开原文件：

- `library-file` 有本地文件路径
- `asset` 可能只是临时 URL 或对象地址

所以这次没有让按钮永远显示，而是：

- 只有 `autoOpenLibraryFile && sourcePath` 时才传 `onOpenSourcePath`
- 组件根据 callback 是否存在决定是否显示按钮

这是比“按钮永远显示但点了没反应”更干净的做法。

## 这次能学到的编程知识

### 知识点 1：组件是否显示某个操作，常常取决于 capability，而不是取决于视觉设计

按钮是否应该出现，不只是 UI 问题，也是能力边界问题。

这里 `打开原文件` 的显示条件，本质上是：

“当前打开源有没有真实文件路径？”

这类判断最好由上层 route 决定，再把 capability 以 callback/null 的形式传下去。

### 知识点 2：把“存在即能力”编码成回调是否为 null，是一种很实用的接口设计

这次 sidebar 不需要知道：

- 当前是不是 library-file
- 当前 sourcePath 是多少
- Tauri opener 是怎么调用的

它只需要知道：

- `onOpenSourcePath` 有值：显示按钮
- `onOpenSourcePath` 为空：隐藏按钮

这种接口很适合组件层，因为它能让组件不用理解过多业务上下文。

## 还没做的事

- 还没有 Readest 风格的更多菜单
- 还没有书籍详情弹层
- `asset` 打开路径仍然没有“打开原文件”能力
- 还没有针对这两个 book card 动作的专项桌面自动化回归
