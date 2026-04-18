# P0-3 Plan: 收口搜索、批注、书签与进度系统

**Workstream:** P0 - Core Reader  
**Plan:** P0-3  
**Status:** Planned  
**Feature Rows:** Full-Text Search, Annotations and Highlighting  
**Depends on:** P0-2  
**Parallel-safe:** No  

## Why This Plan Exists

当前 `br1` 已经有全文搜索、笔记和书签的工作区雏形，也有不少桌面回归，但在 feature 总账里仍然只能算 `Partial`。主要原因是：高亮还不是正式产品能力，搜索与注释系统也还没有以“完整阅读工作流”角度收口。

## Brownfield Context

当前已有实现：

- 全文搜索 UI、结果跳转、历史、磁盘缓存、重开恢复
- notes / bookmarks 的持久化、重开、编辑、删除回归
- 阅读进度和 reopen 语义已有较强基础

当前问题：

1. highlight 仍然不是正式产品能力
2. 注释系统更像 notes/bookmarks 集合，不是完整 annotation 产品面
3. 搜索、批注、书签、进度之间的跨格式一致性仍需收口
4. 各能力存在，但“完成定义”还没有统一

## Scope

In scope:

- 搜索系统收口
- highlight / annotation 产品化
- notes / bookmarks / progress 的正式闭环
- 跨格式恢复一致性

Out of scope:

- 字体与版式设置系统
- library 管理面
- 词典、TTS、翻译等高级能力

## Canonical References

- `.planning/FEATURE-PARITY-AUDIT.md`
- `src/lib/components/reader/ReaderSidebar.svelte`
- `src/lib/components/reader/ReaderViewport.svelte`
- `src/lib/reader/searchController.ts`
- `src/lib/reader/notesController.ts`
- `src/lib/reader/bookmarksController.ts`
- `src/lib/services/readerSearchCache.ts`
- `src-tauri/src/commands/bookmarks.rs`
- `src-tauri/src/commands/notes.rs`

## Deliverables

1. 产品级的全文搜索闭环
2. 正式的 highlight / annotation 能力
3. notes / bookmarks / progress 的一致持久化和 reopen 恢复
4. 能支撑 feature 完成判断的自动化和手工验证

## Execution Plan

### Wave 1: 审计搜索与注释完成定义

1. 审计当前 search / note / bookmark / progress 的真实边界
2. 明确 feature 行级别的完成定义
3. 找出仍未产品化的隐式能力，尤其是 highlight

### Wave 2: 搜索系统收口

1. 收口搜索创建、跳转、缓存、重开恢复
2. 统一搜索状态、错误面和持久化语义
3. 评估是否还需要补充搜索 product surface

### Wave 3: 批注与进度系统收口

1. 将 highlight 变成正式能力
2. 完成 note / bookmark 的完整 CRUD 和 reopen 恢复
3. 收口 progress 的跨格式一致性

### Wave 4: 回归与完成判定

1. 补足 search / highlight / note / bookmark / progress focused regressions
2. 更新审计表对应行状态

## Verification Checklist

- `pnpm check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm exec wdio run wdio.conf.ts --mochaOpts.grep '<search notes bookmarks progress tests>'`
- `git diff --check`
- 手工 reader 工作区复审

## Done When

1. `Full-Text Search` 从 `Partial` 提升到 `Completed`
2. `Annotations and Highlighting` 从 `Partial` 提升到 `Completed`
3. highlight / note / bookmark / progress 不再只是局部可用功能，而是正式产品系统

## Not Planned Here

- 不进入阅读模式与版式设置
- 不进入 library 管理面的产品化
- 不进入任何服务型能力

---
*Created: 2026-04-18 during the P0/P1/P2 planning restructure*
