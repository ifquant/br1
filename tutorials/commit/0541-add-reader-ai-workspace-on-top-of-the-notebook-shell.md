# 0541 - 在 notebook shell 上增加 AI workspace

这刀对应 `P5-1.2`。

目标不是重写 provider，也不是引入新的 assistant backend，而是把现有的 `assist` 能力从“sidebar 里的一个结果区”提升成“notebook 里的一个独立工作台”。

在这刀之前，`br1` 已经有：

- Wikipedia lookup
- dictionary lookup
- DeepL / Yandex translation

但这些能力主要都挤在 [`ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) 的 `assist` tab 里。功能虽然存在，产品形态却还是偏“工具抽屉”。

这刀做的，是把它收成一个 workspace。

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)

## 这刀做了什么

1. 把 assist UI 抽成共享 workspace 组件

新增的 [`ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte) 把原来 sidebar 里的这几类能力收在一起：

- lookup / translation 模式切换
- 选区 / 章节回填
- provider 选择
- 目标语言选择
- result / empty / offline / error / loading 状态

这样 assistant 不再只是 sidebar 局部模板，而是一个可以挂到不同 workspace 容器里的独立产品部件。

2. notebook 增加 `AI 助手` tab

[`ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte) 现在不只承载：

- 笔记
- 高亮

还承载：

- `AI 助手`

这一步的意义，不是“多一个 tab”，而是让 notebook 开始真正承担多工作台职责，而不是只做 annotation drawer。

3. route 开始直接打开 AI workspace

[`+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 现在在两个时机直接切到 notebook 的 `assistant` tab：

- 用户点击顶部 `AI 工作台`
- 发起 lookup / translation 请求

这比以前只把 sidebar 切到 `assist` tab 更像真实产品：

- notebook 是 workspace
- sidebar 仍然可以保留旧入口
- 但主路径已经变成 workspace-first

4. sidebar 旧入口保留，但内部不再是另一套 assist 模板

这刀没有删除 sidebar 的 `assist` tab。

原因和上一刀类似：当前 reader 还在 transition 期，直接砍掉旧入口会把现有使用习惯和部分测试面一起打碎。

所以现在的状态是：

- sidebar `assist` 仍然存在
- 但它内部已经改成复用同一个 [`ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte)
- notebook 和 sidebar 至少共享同一套 UI contract 与结果状态

这让后续继续收口时，不会同时维护两套 assist 视图逻辑。

5. 增加 focused smoke

[`library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) 新增了一条 focused smoke，验证：

- reader 可以直接打开 `AI 工作台`
- notebook 会切到 `AI 助手` tab
- 打开 AI workspace 不会让已有导航塌掉

这条测试故意不依赖真实网络结果，而只锁住 workspace contract。

## 为什么这刀单独值得一提

因为它解决的不是“翻译按钮放哪”，而是“assistant 在 reader 里到底属于什么”。

在 Readest 的阅读体验里，AI/translation 更接近一个独立工作台；而不是一个和 TOC、search、bookmarks 并列的临时 tab。

`br1` 如果继续把 assistant 留在 sidebar result panel，就会把已经建起来的 notebook shell又退化回“只是笔记面板”。

所以这刀必须在 `P5-1.1` 之后马上跟上。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 没有包含

- 没有改 lookup / translation provider 的 backend contract
- 没有做 conversation history / thread memory
- 没有做 inline translation mode
- 没有做 TTS reading mode productization
