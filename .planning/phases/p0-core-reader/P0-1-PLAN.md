# P0-1 Plan: 收口多格式支持与桌面打开基座

**Workstream:** P0 - Core Reader  
**Plan:** P0-1  
**Status:** Planned  
**Feature Rows:** Multi-Format Support, File Association and Open With  
**Depends on:** Existing Phase 4 execution history  
**Parallel-safe:** No  

## Why This Plan Exists

当前 `br1` 的 reader 打开基座已经对 `EPUB/PDF` 形成了较强基础，但放到 feature 总账里仍然只是 `Partial`。问题不在于“完全没有实现”，而在于支持边界、桌面打开语义和格式完成度还没有真正收口。

## Brownfield Context

当前已有实现：

- `EPUB/PDF` 的桌面打开、恢复和 focused regression
- `asset` / `library-file` 的结构化 reader target
- 本地导入与独立 reader 窗口
- `FB2/MOBI/AZW3` 在导入边界上的部分接线

当前问题：

1. `FB2/MOBI/AZW3` 还没有被当成正式产品能力验证
2. `CBZ/TXT` 还不在当前正式支持边界内
3. 文件关联与桌面 `open with` 语义仍不完整
4. 不同格式的错误面和降级语义还没有统一到产品级

## Scope

In scope:

- 收口 `EPUB/PDF` 到产品完成状态
- 把 `FB2/MOBI/AZW3` 从边界接线提升到可验证支持
- 明确 `CBZ/TXT` 的接入或降级策略
- 统一桌面打开、原文件打开、reader target 和恢复语义

Out of scope:

- 阅读模式与版式设置
- 搜索、注释、书签、进度系统本身
- 在线目录、同步、翻译和服务型能力

## Canonical References

- `.planning/FEATURE-PARITY-AUDIT.md`
- `src/lib/services/libraryPersistence.ts`
- `src/lib/services/readerWindow.ts`
- `src/lib/reader/route.ts`
- `src/lib/components/reader/ReaderViewport.svelte`
- `src/routes/reader/+page.svelte`

## Deliverables

1. 多格式支持边界的正式定义与实现
2. 桌面打开与独立 reader 窗口的一致化契约
3. 各格式的支持/不支持/降级错误面

## Execution Plan

### Wave 1: 审计当前格式边界

1. 审计 `EPUB/PDF/FB2/MOBI/AZW3/CBZ/TXT` 的当前支持状态
2. 区分“accept 中出现”与“真正产品支持”之间的差距
3. 列出当前 reader target、恢复语义和错误语义的格式差异

### Wave 2: 收口格式打开契约

1. 统一格式打开入口与结构化 target 契约
2. 让 `FB2/MOBI/AZW3` 具备正式验证路径
3. 明确 `CBZ/TXT` 的最小实现或统一降级提示

### Wave 3: 收桌面打开与错误面

1. 收口原文件打开、reader window、reopen/restore 行为
2. 统一格式级错误提示与失败降级语义
3. 评估并补足桌面 `open with` / 文件关联所需的产品实现

### Wave 4: 回归与完成判定

1. 重跑 `EPUB/PDF` focused desktop regressions
2. 为扩展格式补验证或明确的降级断言
3. 更新 `FEATURE-PARITY-AUDIT.md` 中对应行状态

## Verification Checklist

- `pnpm check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm exec wdio run wdio.conf.ts --mochaOpts.grep '<format and window flows>'`
- `git diff --check`
- 手工桌面打开至少 1 本真实 `EPUB/PDF`，并验证扩展格式路径

## Done When

1. Multi-Format Support 从 `Partial` 提升到 `Completed`
2. File Association and Open With 从 `Partial` 提升到 `Completed` 或有清晰桌面产品实现
3. 所有目标格式都有正式支持或正式降级语义，不再处于模糊状态

## Not Planned Here

- 不进入阅读设置系统
- 不进入 search / notes / bookmarks 产品化
- 不进入 library 管理面的更深功能

---
*Created: 2026-04-18 during the P0/P1/P2 planning restructure*
