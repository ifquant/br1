# P0-4 Plan: 收口本地书库管理与工作流

**Workstream:** P0 - Core Reader  
**Plan:** P0-4  
**Status:** Planned  
**Feature Rows:** Library Management  
**Depends on:** P0-3  
**Parallel-safe:** No  

## Why This Plan Exists

当前 `br1` 的 library 已经不只是样书壳子，但放到 feature 总账里仍然只是 `Partial`。原因是：它已经具备导入、迁移、continue/recent 分区和桌面打开能力，却还没有被收成一个完整、本地优先的书库工作面。

## Brownfield Context

当前已有实现：

- 本地导入
- Readest 本地书库迁移
- continue reading / recent reading / shelf 分区
- 排序、搜索、滚动位置保持
- 打开原文件与 reader 状态回流

当前问题：

1. 书库管理能力尚未形成完整工作面
2. 导入、迁移、排序、搜索、分区、回流虽已有实现，但仍偏切片式推进
3. 删除、整理、元数据管理等书库动作仍不完整
4. 书库自动化矩阵不够系统

## Scope

In scope:

- 收口本地图书管理语义
- 收口 continue / recent / shelf 三段工作流
- 补足导入、迁移、原文件、删除/整理等书库动作
- 建立 library 自动化矩阵

Out of scope:

- 高级阅读体验
- 服务与生态能力
- reader 内部阅读设置系统

## Canonical References

- `.planning/FEATURE-PARITY-AUDIT.md`
- `src/routes/library/+page.svelte`
- `src/lib/components/library/*`
- `src/lib/services/libraryPersistence.ts`
- `src/lib/services/readerWindow.ts`
- `tests/e2e/library-smoke.spec.ts`
- `e2e/app.e2e.ts`

## Deliverables

1. 完整的本地书库工作面定义
2. 统一的导入、迁移、排序、搜索、分区和回流语义
3. 系统化的 library 自动化矩阵

## Execution Plan

### Wave 1: 审计 library 完成定义

1. 审计当前 library 已完成和未完成的工作流
2. 列出“能导入和打开书”之外仍缺的管理面动作
3. 明确 Library Management 的产品完成标准

### Wave 2: 收口本地书库工作流

1. 收口导入、迁移、continue/recent/library 三段分区
2. 收口 reader 回流到 library 的契约
3. 统一元数据、排序、搜索和原文件行为

### Wave 3: 补管理动作与验证

1. 评估并补足删除、整理、元数据管理等动作
2. 建立 library focused / smoke / desktop regression 矩阵
3. 更新 feature audit 中 Library Management 的状态

## Verification Checklist

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts`
- `pnpm exec wdio run wdio.conf.ts --mochaOpts.grep '<library desktop flows>'`
- `git diff --check`
- 手工桌面 library 工作流复审

## Done When

1. `Library Management` 从 `Partial` 提升到 `Completed`
2. library 被产品上视为完整本地书库工作面，而不是导入入口页
3. library 与 reader 的关键工作流具有稳定自动化覆盖

## Not Planned Here

- 不进入 P1 的高级阅读体验功能
- 不进入服务和同步能力
- 不改写 reader 内部工作区本身

---
*Created: 2026-04-18 during the P0/P1/P2 planning restructure*
