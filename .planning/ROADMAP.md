# Roadmap: br1

## Overview

`br1` 的第一阶段不再按局部页面或旧 `Readest` phase 顺排推进，而改成按 **Feature 总账** 收口。执行顺序以 `.planning/FEATURE-PARITY-AUDIT.md` 为产品真相来源，以本地阅读器核心能力是否真正关闭作为推进条件。

主线分层：

- **P0 Core Reader**：先把本地阅读器核心能力做到可完整交付
- **P1 Advanced Reading Experience**：在 P0 收口后再进入高级阅读体验
- **P2 Services and Ecosystem**：最后进入服务、同步与生态能力

## Workstreams

### P0 Core Reader
**Goal**: 关闭本地阅读器核心能力的产品缺口，让 `br1` 可以被客观地视为完整本地阅读器，而不是局部对齐中的半成品。
**Depends on**: Nothing beyond current brownfield baseline
**Feature Rows**:
- Multi-Format Support
- Scroll/Page View Modes
- Full-Text Search
- Annotations and Highlighting
- Customize Font and Layout
- File Association and Open With
- Library Management

#### P0-1 格式与打开基座
**Goal**: 把多格式导入、桌面打开、reader target 和恢复语义统一成正式基座。
**Success Criteria**:
1. `EPUB/PDF` 达到产品完成状态，而不是只靠局部回归兜底
2. `FB2/MOBI/AZW3` 具备可验证支持
3. `CBZ/TXT` 被明确纳入或明确降级，不再处于模糊状态
4. 文件关联、原文件打开、独立 reader 窗口与恢复语义统一
**Plans**: 1 plan set

Plans:
- [ ] P0-1: 收口多格式支持与桌面打开基座

#### P0-2 阅读模式与版式系统
**Goal**: 把阅读模式、版式设置和视图持久化做成正式系统，而不是零散 UI 开关。
**Success Criteria**:
1. 用户可以在 `scroll / paginated` 之间切换
2. 字体、字号、行高、边距、主题等设置真正驱动正文与 chrome
3. 视图设置可持久化，并在 reopen 后稳定恢复
4. 版式自动化回归能覆盖正文、header、footer、sidebar 的一致性
**Plans**: 1 plan set

Plans:
- [ ] P0-2: 收口阅读模式与版式设置系统

#### P0-3 搜索、批注、书签、进度
**Goal**: 把搜索、注释、书签与进度从“存在工作区 UI”推进到产品完成。
**Success Criteria**:
1. 全文搜索具备完整创建、跳转、缓存、重开恢复链路
2. highlight 成为正式能力，而不是隐式渲染效果
3. note / bookmark 具备创建、查看、编辑、删除、定位、持久化、重开恢复
4. 进度恢复在主要格式之间具备一致语义
**Plans**: 1 plan set

Plans:
- [ ] P0-3: 收口搜索、批注、书签与进度系统

#### P0-4 Library 管理
**Goal**: 把 library 提升成完整本地书库工作面，而不是“能导入和打开书”的入口页。
**Success Criteria**:
1. 组织、排序、搜索、状态分区、迁移和原文件行为统一
2. continue / recent / library 三段工作流完整闭环
3. library 与 reader 的状态回流以稳定契约存在
4. library 自动化矩阵能覆盖关键本地工作流
**Plans**: 1 plan set

Plans:
- [ ] P0-4: 收口本地书库管理与工作流

### P1 Advanced Reading Experience
**Goal**: 在 P0 完成后，补足高级阅读体验能力。
**Depends on**: P0 完成
**Feature Rows**:
- Dictionary / Wikipedia Lookup
- Parallel Read
- Code Syntax Highlighting
- Accessibility
- Visual & Focus Aids
- Text-to-Speech (TTS) Support

Status:

- [ ] 边界已冻结，但当前不执行

Notes:

- 不允许在 P0 未关闭前零散插入这些功能
- 只允许做避免返工的接口预留和技术预研

### P2 Services and Ecosystem
**Goal**: 在 P0 完成后，独立推进服务、同步与生态能力。
**Depends on**: P0 完成
**Feature Rows**:
- OPDS / Calibre Integration
- Translate with DeepL and Yandex
- Sync across Platforms
- Sync with Koreader

Status:

- [ ] 边界已冻结，但当前不执行

Notes:

- 不能再混在“Readest 对齐”泛泛表述里
- 必须按账号、远端状态、同步冲突、外部依赖、失败语义单独规划

## Execution Order

1. **先完成 P0**
   - P0-1 → P0-2 → P0-3 → P0-4
2. **P0 Exit Gate**
   - 只有当 `.planning/FEATURE-PARITY-AUDIT.md` 中属于 P0 的 feature rows 都从 `Partial/Not started` 变成 `Completed`，才允许开始 P1
3. **P1 / P2 暂不执行**
   - 当前只冻结边界，不开始实现

## Historical Execution Record

以下旧数字 phase 文档保留为 **历史执行记录**，不再作为当前主执行线：

- `.planning/phases/01-library-ingestion-baseline/`
- `.planning/phases/02-library-visual-and-data-parity/`
- `.planning/phases/03-library-workflow-completion/`
- `.planning/phases/04-reader-open-pipeline-and-format-base/`

它们的作用：

- 保留 brownfield 演进证据
- 保留旧计划和已落地切片的上下文
- 避免在新主线下丢失已经完成的实现痕迹

## Progress

| Workstream | Status | Notes |
|---|---|---|
| P0-1 格式与打开基座 | Planned | 基于现有 `EPUB/PDF` 基座向完整多格式和桌面打开收口 |
| P0-2 阅读模式与版式系统 | Planned | 当前已有 width/atmosphere/chrome mode，仍缺 scroll/paginated 和正式 settings 系统 |
| P0-3 搜索、批注、书签、进度 | Planned | 当前已有 search/notes/bookmarks 骨架，仍缺 highlight 产品化和正式闭环 |
| P0-4 Library 管理 | Planned | 当前已有本地书库基础，仍缺完整书库工作面收口 |
| P1 Advanced Reading Experience | Frozen | 不执行，只保留边界 |
| P2 Services and Ecosystem | Frozen | 不执行，只保留边界 |
