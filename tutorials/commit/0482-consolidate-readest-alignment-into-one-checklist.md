# 0482 - 把 Readest 对齐计划收口成单一 checklist

上一刀之后，Readest 对齐目标已经被重新切成 `P0 / P1 / P2`。

但计划事实源仍然分散在多份文档里：

- `FEATURE-PARITY-AUDIT.md`
- `READEST-GAP-AUDIT-2026-04.md`
- `ROADMAP.md`
- `REQUIREMENTS.md`
- `STATE.md`
- `SUBAGENT-WAVE-PLAN.md`

这会让后续 agent 在执行时反复遇到一个问题：到底应该更新哪一份状态，哪一份才是主线？

## 这刀做了什么

1. 新增 [`/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

   这份文档现在是唯一的 Readest 对齐执行计划。

   它包含：

   - 当前 baseline
   - 执行规则
   - P0 exit checklist
   - P1 advanced reading checklist
   - P2 services and ecosystem checklist
   - service security gate
   - completion log

2. 删除旧的并行计划入口

   删除这些文档不是丢失信息，而是为了避免多个事实源继续漂移：

   - `FEATURE-PARITY-AUDIT.md`
   - `READEST-GAP-AUDIT-2026-04.md`
   - `ROADMAP.md`
   - `REQUIREMENTS.md`
   - `STATE.md`
   - `SUBAGENT-WAVE-PLAN.md`

3. 保留项目身份和代码库情报

   `PROJECT.md` 仍然保留，因为它不是执行 checklist，而是项目目标和约束说明。

   `.planning/codebase/*` 也保留，因为它们是 brownfield 代码库情报，不是 Readest 执行计划。

4. 更新 [`/.planning/PROJECT.md`](/Users/dev/workspace2/hc_apps/br1/.planning/PROJECT.md)

   `PROJECT.md` 的演进说明现在明确指向 `READEST-ALIGNMENT-CHECKLIST.md`，避免未来重新把 roadmap/state/requirements 当成主执行入口。

## 为什么这刀重要

这个 repo 的 Readest 对齐已经进入执行面，而不是继续写计划面。

如果保留多份计划文档，后续每完成一个 slice 都要判断：

- checklist 打不打勾？
- roadmap 改不改？
- state 改不改？
- feature audit 改不改？
- requirements traceability 改不改？

这会把执行成本浪费在同步文档上。

收口成一个 checklist 后，规则更简单：

1. 做一个 slice
2. 更新同一份 checklist
3. 写教程
4. 跑检查
5. 提交

## 小知识点

计划文档不是越多越稳。

当多份文档都在表达“下一步做什么”时，它们会变成多个 source of truth。最安全的做法通常是只保留一个可执行入口，其它文档要么变成背景资料，要么删除。

## 验证

- `pnpm check`
- `git diff --check`
