# 0500: add the parallel-read session model

这次改动先不做双栏 UI，只把 `br1` 的 reader 模型往 Readest 的并行阅读边界推进一步。目标是让代码里先能表达“两块阅读窗格”，以后 P1-3.2 再把真正的并排界面接上去。

## 改了什么

- 新增 `src/lib/reader/parallel.ts`
- 定义了并行阅读会话的核心类型：`primary` / `secondary` 两个 pane、`activePaneId`、`source`、`openTarget`、`controlRequest`、`preview`、`progress`、`mountState`
- 提供了三个最重要的 helper：
  - 从当前 route 创建会话
  - 更新某个 pane 的 preview
  - 更新某个 pane 的 control request，并切换 active pane
- 把这些 helper 从 `src/lib/reader/index.ts` 导出
- 在 `src/routes/reader/+page.svelte` 里加了一个只读的 session anchor，继续沿用当前单窗格 UI，不额外渲染第二个 `ReaderStage`
- 更新了 `.planning/READEST-ALIGNMENT-CHECKLIST.md` 的 P1-3.1 完成状态

## 为什么这样做

并行阅读最容易走偏的地方，是一上来就改 UI，然后把“两个窗格怎么协作”藏在组件树里。这样后面会很难分清：哪些是模型边界，哪些只是展示层。

这次只做模型层，是为了先把合同写清楚。对初学者来说，可以记住一个顺序：**先定数据结构，再接交互，再做布局**。如果顺序反了，后面每一步都会被 UI 细节绑住。

## 没有包含

- 没有实现双栏或上下并排的阅读 UI
- 没有做 relocation sync
- 没有改持久化
- 没有改现有单窗格阅读行为

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
