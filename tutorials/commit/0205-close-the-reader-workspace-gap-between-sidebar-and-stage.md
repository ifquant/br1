# 0205 收紧 reader workspace：让侧栏和主舞台成为两块真正独立的 panel

## 这次改动想解决什么

前一刀已经让 `header/footer` 和正文共用同一条中心内容框，但 `05-02` 其实还差半截：

- 主舞台已经开始像一个独立阅读面
- 左侧 sidebar 还是直接贴在 workspace 边上
- pinned sidebar 和正文之间几乎没有明确的桌面级间距
- sidebar 自己内部的 `header / tabs / scroll content` 也没有统一的内容 inset

结果就是：

- 主舞台像一块 panel
- sidebar 更像“左边一整列内容”
- 两边的边界感、呼吸感、节奏感不一致

这和 Readest 的桌面阅读工作台差距还很明显。成熟布局不是“左栏 + 右内容”这么简单，而是要让两边都像独立 surface，同时共享一套空间规则。

## 做了什么

### 1. `workspace.window-mode` 现在有正式的桌面边距和中缝

这次在 `reader/+page.svelte` 里，给窗口模式下的 workspace 明确加了两组变量：

- `--reader-workspace-edge`
- `--reader-workspace-gap`

对应效果是：

- 整个 reader 内容区离窗口边缘有固定边距
- pinned sidebar 和主舞台之间有稳定 gap
- resize handle 也跟着这套 gap 重新定位

这一步的意义是把原来“碰巧贴在一起”的两列，变成“明确分开的两块 panel”。

### 2. sidebar 从一整块内容列，收成了真正的 panel

`ReaderSidebar.svelte` 现在不再靠外层零散 padding 维持样子，而是直接收成更明确的 panel 形态：

- 外层 `aside.reader-sidebar` 统一负责边框、圆角、背景、阴影
- window mode 下使用更强的 panel 边界
- overlay mode 下使用更明显的浮层阴影和离边距

也就是说，sidebar 现在在空间语义上终于和主舞台更接近了：

- 它不是左边一整条平面内容
- 而是一块可 pinned、可 overlay 的独立阅读工具面

### 3. sidebar 内部新增统一的 `sidebar-content` 内容层

之前 scroll 区里的内容是直接从 `book-chip / toc / search / notes / bookmarks` 开始堆的，内部 inset 并不统一。

这次新增了 `.sidebar-content`：

- 统一承接滚动区内的主内容
- 统一内容间距
- 统一左右内边距

这样以后不管往 sidebar 里继续补什么工作区，都会先落在同一层内容框里，而不是每个 section 自己重新算 padding。

### 4. sidebar 的 `header / tabs / content` 现在按一套 inset 走

这次又补了一个统一变量：

- `--sidebar-content-inset`

它现在同时作用于：

- `sidebar-head`
- `tabs`
- `sidebar-content`

这样左栏终于不再出现这种常见问题：

- 顶部标题离左边 10px
- tabs 离左边另一套值
- 滚动内容又是第三套 padding

对阅读器来说，这种小的几何不一致很容易累积成“看起来松散”。统一 inset 是很值得早点做的布局基建。

### 5. 现有宽度模式回归继续加严

这次没有新开一条测试，而是继续扩展现有的 `view width mode` 桌面回归：

- 它原本已经验证正文 `paginatorContainer` 会随 `focus / wide` 变化
- 前一刀已经验证 `header/footer` 会跟 `canvas` 对齐
- 这次再继续验证 pinned sidebar 和 canvas 之间至少保留稳定 gap

也就是说，这条回归现在锁住了三个层次：

- 正文列宽会变
- 顶栏/底栏会和正文一起变
- 左侧 sidebar 不会贴回正文舞台

## 验证

实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps the rendered book page inside the reader stage instead of the sidebar column|changes the visible epub reading column width when the view width mode changes' --mochaOpts.timeout 120000"
```

结果：2 条桌面 reader 几何回归都 `PASS`

```bash
git diff --check
```

结果：`PASS`

## 这次顺手能学到的编程知识

### 1. panel 布局里，“边距规则”和值得抽成变量

像这种桌面阅读器工作台，空间关系通常不是一个 `gap` 能解决的，而是至少有三层：

- 窗口边缘到 workspace 的边距
- sidebar 和 stage 之间的中缝
- panel 内部内容自己的 inset

如果这些值散落在不同选择器里，后面很难稳定演进。把它们先抽成变量，是一种很实用的“提前防止布局失控”的做法。

### 2. 结构层和内容层分开，后面会省很多痛苦

这次 `sidebar-content` 的价值不在于它今天多好看，而在于它把：

- panel 外壳
- panel header
- panel tabs
- panel scroll content

拆成了更清楚的层次。

很多复杂组件之所以越改越乱，就是因为“内容区”从来没有一个稳定容器，所有 section 都直接贴在 scroll root 上。早点补这一层，后面成本会低很多。

## 还没有处理什么

- 这一步还没有继续收 `sidebar` 和 `header/footer` 的垂直节奏细节
- 还没有开始 `05-03` 更完整的 reader 布局自动化矩阵
- 也没有进入更细的 Readest 视觉还原，例如 typography 和局部 motion
