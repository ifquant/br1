# Roadmap: br1

## Overview

`br1` 的执行顺序按 **Feature 总账** 收口，而不是继续围绕局部页面或旧 phase 顺排。执行顺序以 `.planning/FEATURE-PARITY-AUDIT.md` 和 `.planning/READEST-GAP-AUDIT-2026-04.md` 为产品真相来源，以“当前离 Readest 的真实产品差距”作为排期依据。

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
**Goal**: 在 P0 核心阅读器收口后，优先补足用户能直接感知的高级阅读体验能力，而不是继续只做内部结构整理。
**Depends on**: P0 完成并通过一次 P0 exit audit
**Feature Rows**:
- Dictionary / Wikipedia Lookup
- Parallel Read
- Code Syntax Highlighting
- Accessibility
- Visual & Focus Aids
- Text-to-Speech (TTS) Support

#### P1-1 Lookup and In-Reading Assistance
**Goal**: 建立 reader 内上下文查询层，让 `Dictionary / Wikipedia Lookup` 成为正式产品面。
**Success Criteria**:
1. reader 内有显式 lookup 入口，而不是只停留在 future idea
2. 选中文本或当前术语可以进入统一的 lookup workflow
3. 至少一条 dictionary / Wikipedia 路径具备清晰成功与失败语义
4. lookup 能与现有 reader workspace 共存，而不是破坏阅读主线

Plans:
- [ ] P1-1: 收口 lookup 与 in-reading assistance

#### P1-2 Read Aloud, Focus, and Accessibility
**Goal**: 把 `TTS / Visual & Focus Aids / Accessibility` 收成一条真实阅读体验增强线。
**Success Criteria**:
1. TTS 不再是占位按钮，而是可触发、可停止、可恢复的产品能力
2. focus aids 不再只靠宽度/氛围模式，而有明确的阅读辅助面
3. accessibility 有正式审计与关键键盘/读屏契约
4. 这些能力与现有 reader shell 保持一致，不另起一套孤立 UI

Plans:
- [ ] P1-2: 收口 TTS、focus aids 与 accessibility

#### P1-3 Parallel and Specialized Reading Surfaces
**Goal**: 建立需要新增 reader surface 形态的高级阅读能力。
**Success Criteria**:
1. `Parallel Read` 有清晰双栏/双文档状态模型
2. specialized surfaces 不再局限于当前单文档阅读面
3. code syntax highlighting 有正式渲染路径而不是只靠默认 HTML
4. 新 surface 与当前 library/reader 状态流兼容

Plans:
- [ ] P1-3: 收口 parallel read 与 specialized reading surfaces

Status:

- [ ] 已拆成可执行 phases，仍受 P0 exit gate 约束

Notes:

- 不允许在 P0 未关闭前零散插入这些功能
- 但不再把 P1 永久冻结；P0 收口后应直接进入 P1-1

### P2 Services and Ecosystem
**Goal**: 在 P0/P1 建立稳定阅读器产品面后，独立推进目录、翻译、同步和生态能力。
**Depends on**: P0 完成，且 P1 至少打开第一条主线
**Feature Rows**:
- OPDS / Calibre Integration
- Translate with DeepL and Yandex
- Sync across Platforms
- Sync with Koreader

#### P2-1 Catalog Connectors
**Goal**: 把 `OPDS / Calibre` 从空白能力变成正式 catalog connector。
**Success Criteria**:
1. 有明确的远端目录接入模型
2. 至少一条 OPDS/Calibre 浏览与导入链路成立
3. 失败语义、认证/连接问题和导入契约清晰

Plans:
- [ ] P2-1: 建立 catalog connectors

#### P2-2 Translation Bridges
**Goal**: 把 `DeepL / Yandex` 翻译收成 reader 内的正式 bridge 能力。
**Success Criteria**:
1. 至少一条翻译 provider 路径成立
2. 有明确的 provider failure / quota / key 缺失语义
3. 与 lookup / annotation / reading flow 的关系清晰

Plans:
- [ ] P2-2: 建立 translation bridges

#### P2-3 Cross-Device Sync Substrate
**Goal**: 建立远端状态与账号边界，让 `Sync across Platforms` 成为可实现目标。
**Success Criteria**:
1. 有明确的账号/远端状态模型
2. library / notes / bookmarks / progress 的同步边界清晰
3. 冲突、失败、离线和恢复语义被正式定义

Plans:
- [ ] P2-3: 建立 cross-device sync substrate

#### P2-4 Ecosystem Adapters
**Goal**: 建立外部阅读生态适配层，优先对齐 `KOReader Sync`。
**Success Criteria**:
1. 外部生态同步不再只是 roadmap 条目
2. KOReader 适配边界与本地/远端状态模型清晰
3. 不把生态适配和主同步协议混成一条实现线

Plans:
- [ ] P2-4: 建立 ecosystem adapters

Status:

- [ ] 已拆成可执行 phases，顺序受 P0/P1 gate 约束

Notes:

- 不能再混在“Readest 对齐”泛泛表述里
- 必须按账号、远端状态、同步冲突、外部依赖、失败语义单独规划

## Execution Order

1. **先完成 P0**
   - P0-1 → P0-2 → P0-3 → P0-4
2. **做一次 P0 Exit Audit**
   - 不是只看局部页面完成，而是重新核对 `.planning/FEATURE-PARITY-AUDIT.md` 中 P0 rows 是否真的收平
3. **进入 P1**
   - P1-1 → P1-2 → P1-3
4. **再进入 P2**
   - P2-1 → P2-2 → P2-3 → P2-4

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
| P1-1 Lookup and In-Reading Assistance | Planned | 审计已确认这是 Readest 高级阅读体验里的第一批直接差距 |
| P1-2 Read Aloud, Focus, and Accessibility | Planned | TTS、focus aids 和 a11y 不再继续冻结 |
| P1-3 Parallel and Specialized Reading Surfaces | Planned | 并行阅读与 specialized surface 进入正式排期 |
| P2-1 Catalog Connectors | Planned | OPDS / Calibre 不再只保留边界 |
| P2-2 Translation Bridges | Planned | DeepL / Yandex 翻译进入正式排期 |
| P2-3 Cross-Device Sync Substrate | Planned | 跨平台同步进入正式排期 |
| P2-4 Ecosystem Adapters | Planned | KOReader 适配独立成相邻 phase |
