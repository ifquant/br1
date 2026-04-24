# 0539 - 给 reader 加一个 notebook workspace shell

这刀对应新的 `P5-1.1`。目标不是一次把 Readest 的 notebook、AI assistant、translation mode 全搬过来，而是先把 `br1` 的 reader 从“只有一个越来越大的 sidebar”推到“开始有第二个工作台”的状态。

在这刀之前，`br1` 的 notes / highlights 语义已经不少了，但它们都挤在 [`ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) 里：

- TOC
- 搜索
- assist
- 书签
- 高亮
- 笔记

这会带来一个明显问题：功能有了，但阅读工作流的层次感不对。Readest 的感觉是“导航是导航，阅读整理是阅读整理”；`br1` 更像“所有东西都是 sidebar tab”。

这刀只先解决 shell 问题。

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
- [`/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 把右侧占位栏从 bridge placeholder 收成 notebook shell

原来的 [`+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 右侧第三栏还是一个 bridge placeholder。

这刀没有继续保留那个抽象占位，而是直接把它替换成更有产品价值的 notebook shell：

- 可打开
- 可关闭
- 可固定
- 有独立的 tab
- 有独立的工作台标题和摘要

这一步的意义是先把布局资源让给真正的阅读工作台，而不是继续为一个未来占位保留视觉空间。

2. 新增 `ReaderNotebook.svelte`

[`ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte) 是一个新的右侧工作台组件。

它目前只做第一阶段需要的事：

- 展示工作台标题和当前书/章节上下文
- 展示笔记 / 高亮计数
- 展示当前选区预览
- 提供“先高亮当前选中内容 / 为当前选中内容记笔记”
- 用 `notes` / `highlights` 两个 tab 展示已有阅读痕迹
- 支持打开、编辑、删除已有笔记

换句话说，它先拿到的是“阅读整理工作台”的壳，不是最终的 Readest notebook 全量能力。

3. route 开始拥有 notebook 的 open / pin / tab state

[`+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 现在新增了：

- `notebookVisible`
- `notebookPinned`
- `notebookTab`

并通过本地存储保留 pinned/tab 状态。

这一步很重要，因为它把 notebook 从“某个组件内部的显示细节”提升成 route-level workspace state。后面如果继续做 AI assistant workspace 或 translation mode，就有稳定的位置可以接，而不需要重新发明一套右侧面板状态。

4. 现有 notes/highlights 行为没有被硬迁走

这刀故意没有直接删除 sidebar 里的 notes/highlights 面板。

原因很简单：

- 现有 desktop e2e 对 notes workspace 依赖很重
- 这一刀的目标是 notebook shell，不是一次性重写整个 annotation workspace

所以现在的状态是：

- sidebar 里的老路径还在
- notebook shell 成为新的工作台入口
- 新增笔记/高亮/打开笔记时，会主动把 notebook 打开

这保证了推进产品层次的同时，不会在同一刀里把已有 annotation surface 全打碎。

5. 增加了 focused smoke

[`library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) 新增了一条 focused smoke，验证：

- 可以打开 notebook workspace
- notebook 打开后不会把现有导航打没
- 可以固定 notebook
- 可以关闭后再重新打开

这条测试不是验证所有 note/highlight 功能，而是专门锁住这刀最重要的 contract：reader 可以多出一个工作台而不塌壳。

## 为什么这刀值得单独提交

因为它解决的是“阅读产品结构”问题，不是一个按钮或一段样式。

如果先不把 notebook shell 建起来，后面继续做：

- AI assistant workspace
- translated reading mode
- TTS reading mode

这些能力还是会继续被塞回一个越来越大的 sidebar。

所以第一刀必须先把 workspace 边界立起来。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open a notebook workspace without collapsing navigation"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 没有包含

- 没有把 AI assistant 搬进 notebook
- 没有做 inline translation mode
- 没有重写 sidebar 里的 notes/highlights 旧面板
- 没有改 annotation 的存储/sync substrate
