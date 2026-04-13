# Roadmap: br1

## Overview

`br1` 的第一阶段不是做一个“够用的阅读器”，而是把 `Readest` 当成完整产品规格来做高保真对齐。路线会先固化书库与桌面导入基线，再推进 reader 结构、格式支持、阅读恢复、交互工作区、视图设置、服务能力与自动化回归，直到 `br1` 可以被客观地视为 `Readest` 的 `Tauri + Svelte` 对齐实现。

## Phases

- [ ] **Phase 1: Library Ingestion Baseline** - 锁定书库导入、桌面文件路径和本地藏书基线
- [ ] **Phase 2: Library Visual and Data Parity** - 对齐书库页视觉、元数据、排序和状态信息
- [ ] **Phase 3: Library Workflow Completion** - 完成 continue reading、迁移与书库工作流闭环
- [ ] **Phase 4: Reader Open Pipeline and Format Base** - 稳定 reader 打开链路和主要格式基座
- [ ] **Phase 5: Reader Layout Parity** - 对齐 reader 主舞台、侧栏、顶栏、底栏与几何行为
- [ ] **Phase 6: Desktop Window and Restore Parity** - 对齐独立窗口、恢复位置和桌面流转行为
- [ ] **Phase 7: Reader Workspace Parity** - 对齐目录、全文搜索、笔记、书签等工作区
- [ ] **Phase 8: View Menu and Reading Interaction Parity** - 对齐视图设置、界面显隐、阅读交互和桌面体验
- [ ] **Phase 9: Extended Format Parity** - 补齐更多格式和跨格式行为一致性
- [ ] **Phase 10: Advanced Search and Persistence** - 对齐高级搜索、缓存、历史和长期持久化细节
- [ ] **Phase 11: Service and Online Feature Parity** - 对齐 `Readest` 的在线/服务型能力
- [ ] **Phase 12: End-to-End Regression and Ship Readiness** - 用自动化和验证把全量对齐收口

## Phase Details

### Phase 1: Library Ingestion Baseline
**Goal**: 把书库导入、文件读取和桌面路径访问这条基础链路固化下来，作为后续所有对齐工作的输入层。
**Depends on**: Nothing (first phase)
**Requirements**: LIB-01, DSK-02
**Success Criteria** (what must be TRUE):
  1. 用户可以稳定导入和读取本地图书文件
  2. 导入后的图书可以被书库和 reader 统一识别
  3. 桌面文件选择、打开原文件、路径访问不再是临时修补链路
**Plans**: TBD

Plans:
- [ ] 01-01: 统一本地图书导入、读取和路径访问服务
- [ ] 01-02: 固化 library-file 与独立 reader 窗口的桌面打开链路
- [ ] 01-03: 为导入基线补足基本验证和失败处理

### Phase 2: Library Visual and Data Parity
**Goal**: 把 `library` 页面的视觉层、元数据呈现、搜索和排序与 `Readest` 客观对齐。
**Depends on**: Phase 1
**Requirements**: LIB-02, LIB-03
**Success Criteria** (what must be TRUE):
  1. 用户看到的书库页面在布局、封面、卡片信息和工具层上接近 `Readest`
  2. 搜索、排序、筛选和状态显示遵循 `Readest` 的主要产品语义
  3. 书库视觉和数据呈现不再依赖样书或占位信息
**Plans**: TBD

Plans:
- [ ] 02-01: 对齐书库顶部工具条和搜索行为
- [ ] 02-02: 对齐书库卡片、封面、元数据与状态展示
- [ ] 02-03: 对齐书库排序、筛选和滚动行为

### Phase 3: Library Workflow Completion
**Goal**: 完成 `continue reading`、最近阅读、Readest 藏书迁移和书库闭环工作流。
**Depends on**: Phase 2
**Requirements**: LIB-04, LIB-05
**Success Criteria** (what must be TRUE):
  1. 书库中存在与 `Readest` 对齐的 continue reading / 最近阅读分区
  2. 图书状态、恢复位置和书架组织可以可靠回流到书库
  3. `Readest` 现有本地藏书信息可以被 `br1` 识别、迁移或兼容
**Plans**: TBD

Plans:
- [ ] 03-01: 完成 continue reading 和最近阅读的产品化分区
- [ ] 03-02: 打通阅读状态回流与书库排序
- [ ] 03-03: 完成 Readest 藏书数据兼容与迁移

### Phase 4: Reader Open Pipeline and Format Base
**Goal**: 稳定 reader 的主要打开链路，并把 `EPUB/PDF` 和格式依赖基座做到正式可维护。
**Depends on**: Phase 3
**Requirements**: RDR-01, FMT-01, FMT-02, FMT-05
**Success Criteria** (what must be TRUE):
  1. 用户可以稳定打开 `EPUB` 和 `PDF` 进入 reader
  2. `foliate-js`、`pdf.js`、wasm/vendor 等依赖采用正式化接入方式
  3. reader 打开链路不再依赖样书、临时 fallback 或不透明补丁
**Plans**: TBD

Plans:
- [ ] 04-01: 稳定 EPUB 打开链路与正文渲染
- [ ] 04-02: 稳定 PDF 打开链路与 vendor/wasm 方案
- [ ] 04-03: 收口格式基座、错误处理与跨格式打开服务

### Phase 5: Reader Layout Parity
**Goal**: 把 reader 的结构、几何、区域关系和主要视觉状态与 `Readest` 对齐。
**Depends on**: Phase 4
**Requirements**: RDR-02, VIEW-04
**Success Criteria** (what must be TRUE):
  1. 正文、侧栏、顶栏、底栏落在正确的几何区域内
  2. 不再出现正文掉进侧栏、白屏错位、嵌套渲染等结构性问题
  3. `Readest` 与 `br1` 在 reader 基本布局上可做逐项对照
**Plans**: TBD

Plans:
- [ ] 05-01: 对齐 reader 主舞台和正文承载结构
- [ ] 05-02: 对齐顶栏、底栏、侧栏与正文的空间关系
- [ ] 05-03: 补 reader 布局相关自动化回归

### Phase 6: Desktop Window and Restore Parity
**Goal**: 对齐独立 reader 窗口、桌面流转行为与位置恢复精度。
**Depends on**: Phase 5
**Requirements**: RDR-03, ANT-04, DSK-01
**Success Criteria** (what must be TRUE):
  1. 用户从书库打开图书时能得到与 `Readest` 类似的独立 reader 窗口体验
  2. 重新打开图书时能恢复到与 `Readest` 同等级的阅读位置
  3. 主窗口、reader 窗口、返回书库和窗口聚焦行为稳定可靠
**Plans**: TBD

Plans:
- [ ] 06-01: 完成窗口创建、聚焦、回库和拖动行为对齐
- [ ] 06-02: 提升位置恢复精度到 locator/CFI/页码级别
- [ ] 06-03: 用桌面自动化锁定恢复与窗口流转回归

### Phase 7: Reader Workspace Parity
**Goal**: 把目录、全文搜索、笔记、书签等 reader 内部工作区做到与 `Readest` 同等级。
**Depends on**: Phase 6
**Requirements**: RDR-04, ANT-01, ANT-02, ANT-03, SRCH-01, SRCH-02
**Success Criteria** (what must be TRUE):
  1. 用户可以在 reader 内稳定使用目录、全文搜索、笔记和书签
  2. 搜索、笔记、书签都具有完整的创建、跳转、编辑、删除和上下文聚焦链路
  3. 各工作区在信息架构和交互成熟度上接近 `Readest`
**Plans**: TBD

Plans:
- [ ] 07-01: 完成全文搜索链路与高亮/跳转闭环
- [ ] 07-02: 完成笔记工作区的产品化组织
- [ ] 07-03: 完成书签工作区的产品化组织

### Phase 8: View Menu and Reading Interaction Parity
**Goal**: 对齐 view menu、阅读视图设置、界面显隐和更细的桌面阅读交互。
**Depends on**: Phase 7
**Requirements**: RDR-05, VIEW-01, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. 用户可以使用与 `Readest` 对齐的顶栏菜单和阅读设置
  2. 阅读宽度、界面显隐、背景氛围、侧栏固定等交互达到成熟状态
  3. 分页、进度、版心和主要阅读手感接近 `Readest`
**Plans**: TBD

Plans:
- [ ] 08-01: 对齐顶栏动作、view menu 和主要控制项
- [ ] 08-02: 对齐阅读视图设置与显隐策略
- [ ] 08-03: 对齐分页、版心、进度和交互手感

### Phase 9: Extended Format Parity
**Goal**: 把 `Readest` 已覆盖的更多格式纳入 `br1`，并统一跨格式体验。
**Depends on**: Phase 8
**Requirements**: FMT-03, FMT-04
**Success Criteria** (what must be TRUE):
  1. 更多格式可以被稳定导入和打开
  2. 各格式在封面、目录、进度、搜索、注释等行为上具有统一语义
  3. reader 不再只围绕 `EPUB/PDF` 两种格式设计
**Plans**: TBD

Plans:
- [ ] 09-01: 接入并验证扩展格式支持
- [ ] 09-02: 对齐跨格式元数据和阅读状态行为
- [ ] 09-03: 补足扩展格式自动化验证

### Phase 10: Advanced Search and Persistence
**Goal**: 补齐高级搜索配置、缓存策略、历史恢复和长期持久化细节。
**Depends on**: Phase 9
**Requirements**: SRCH-03, SRCH-04
**Success Criteria** (what must be TRUE):
  1. 搜索历史、范围、大小写等高级行为达到 `Readest` 同等级
  2. 搜索缓存具备可靠的单书级和全局级失效/回收策略
  3. 搜索相关状态在重开书籍和重启应用后仍能稳定恢复
**Plans**: TBD

Plans:
- [ ] 10-01: 对齐高级搜索配置与搜索历史体验
- [ ] 10-02: 完成磁盘缓存、TTL 和自动回收策略
- [ ] 10-03: 补高级搜索相关验证与回归

### Phase 11: Service and Online Feature Parity
**Goal**: 对齐 `Readest` 中现有的在线/服务型能力，而不是只停留在本地阅读器底座。
**Depends on**: Phase 10
**Requirements**: SVC-01, SVC-02, SVC-03
**Success Criteria** (what must be TRUE):
  1. `Readest` 已有服务能力在 `br1` 中具备明确的对齐实现或可验证接入方案
  2. 服务相关账号、远端状态、同步与错误处理达到可用水平
  3. 外部能力不会破坏本地阅读器的稳定性和回归验证
**Plans**: TBD

Plans:
- [ ] 11-01: 盘点并分解 `Readest` 服务能力规格
- [ ] 11-02: 接入服务能力并补本地/远端状态闭环
- [ ] 11-03: 为服务能力补验证和故障处理

### Phase 12: End-to-End Regression and Ship Readiness
**Goal**: 用自动化、验证和复审把全量对齐工作真正收口。
**Depends on**: Phase 11
**Requirements**: DSK-03, QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. `library -> reader -> restore -> search -> notes -> bookmarks -> close -> reopen` 关键路径都有回归护栏
  2. 桌面和主要格式路径都能持续自动验证
  3. 可以用事实说明 `br1` 在第一阶段已达到 `Readest` 全量对齐目标
**Plans**: TBD

Plans:
- [ ] 12-01: 补齐端到端桌面自动化矩阵
- [ ] 12-02: 复审所有主路径并修复剩余对齐缺口
- [ ] 12-03: 形成第一阶段完成判定与交付材料

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Library Ingestion Baseline | 0/3 | Not started | - |
| 2. Library Visual and Data Parity | 0/3 | Not started | - |
| 3. Library Workflow Completion | 0/3 | Not started | - |
| 4. Reader Open Pipeline and Format Base | 0/3 | Not started | - |
| 5. Reader Layout Parity | 0/3 | Not started | - |
| 6. Desktop Window and Restore Parity | 0/3 | Not started | - |
| 7. Reader Workspace Parity | 0/3 | Not started | - |
| 8. View Menu and Reading Interaction Parity | 0/3 | Not started | - |
| 9. Extended Format Parity | 0/3 | Not started | - |
| 10. Advanced Search and Persistence | 0/3 | Not started | - |
| 11. Service and Online Feature Parity | 0/3 | Not started | - |
| 12. End-to-End Regression and Ship Readiness | 0/3 | Not started | - |
