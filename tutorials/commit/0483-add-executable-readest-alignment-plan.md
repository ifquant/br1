# 0483 - 增加 Readest 对齐的可执行实施手册

上一刀把 Readest 对齐状态收口到了唯一 checklist：

- [`/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

但 checklist 更像状态账本。它适合记录“哪一项完成了”，不适合承载每个 worker 需要知道的文件路径、测试顺序、接口边界和第一批代码骨架。

## 这刀做了什么

1. 新增 [`/docs/superpowers/plans/2026-04-23-readest-alignment-phase-1.md`](/Users/dev/workspace2/hc_apps/br1/docs/superpowers/plans/2026-04-23-readest-alignment-phase-1.md)

   这份文档是执行手册，不是第二份状态源。

   它明确：

   - 第一阶段目标是用 `Svelte + Tauri` 对齐 Readest
   - `.planning/READEST-ALIGNMENT-CHECKLIST.md` 仍然是唯一打勾状态源
   - route 继续只作为 host，reader/service/Tauri command 才是功能边界
   - P0/P1/P2 各自应该摸哪些文件
   - 每个任务先写什么测试、跑什么命令、如何提交

2. 给 checklist 加执行手册指针

   checklist 的 `Purpose` 部分现在指向这份 handoff，但仍明确自己是唯一 status ledger。

## 为什么这刀重要

之前 checklist 已经解决“下一步做什么”的问题。

这份实施手册解决的是另一个问题：一个没有上下文的 agent 该怎么开始动手，而不是重新从代码里猜边界。

它把 Readest 源码里可参考的实际结构转译成 br1 的执行边界：

- OPDS 对照 Readest 的 `app/opds` 与 `types/opds.ts`
- TTS 对照 Readest 的 `services/tts` 和 `useTTSControl`
- 阅读尺对照 Readest 的 `ReadingRuler`
- 并排阅读对照 Readest 的 `parallelViewStore`
- 同步和 KOReader 对照 Readest 的 `libs/sync` 与 `KOSyncClient`

## 验证

- `pnpm check`
- `git diff --check`
