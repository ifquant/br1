# Requirements: br1

**Defined:** 2026-04-13
**Core Value:** 先把 `Readest` 的完整阅读器能力高保真复刻到 `br1`，为后续真正的 AI 阅读机制提供不残缺的底座。

## v1 Requirements

### Library

- [ ] **LIB-01**: 用户可以导入、扫描并管理本地图书库
- [ ] **LIB-02**: 用户可以在书库中看到与 `Readest` 对齐的卡片、封面、元数据与状态信息
- [ ] **LIB-03**: 用户可以按 `Readest` 的主要方式浏览、排序、筛选与搜索书库
- [ ] **LIB-04**: 用户可以看到独立的 `continue reading` / 最近阅读等核心书库分区
- [ ] **LIB-05**: 书库可以读取并迁移 `Readest` 已存在的本地藏书信息或兼容数据

### Reader Core

- [ ] **RDR-01**: 用户可以从书库或直接路径打开图书进入独立 reader 窗口
- [ ] **RDR-02**: reader 的整体结构、主舞台、侧栏、顶栏、底栏与 `Readest` 保持客观对齐
- [ ] **RDR-03**: 用户重新打开图书时可以恢复到上次阅读位置，精度与 `Readest` 同等级
- [ ] **RDR-04**: reader 支持与 `Readest` 对齐的侧栏、目录、搜索、笔记、书签工作区切换
- [ ] **RDR-05**: reader 顶栏、底栏、view menu、窗口行为与 `Readest` 的桌面交互保持一致级别

### Formats

- [ ] **FMT-01**: 用户可以稳定打开并阅读 `EPUB`
- [ ] **FMT-02**: 用户可以稳定打开并阅读 `PDF`
- [ ] **FMT-03**: 用户可以稳定打开并阅读 `MOBI/AZW3/FB2/CBZ/TXT` 等 `Readest` 已覆盖的主要格式
- [ ] **FMT-04**: 各格式在封面、目录、位置、进度、搜索、书签、笔记等方面具有与 `Readest` 同等级支持
- [ ] **FMT-05**: 格式相关 vendor / wasm / viewer 依赖采用可维护、正式化的构建与运行方案

### Annotations

- [ ] **ANT-01**: 用户可以创建、查看、编辑、删除笔记
- [ ] **ANT-02**: 用户可以创建、查看、跳转、删除书签
- [ ] **ANT-03**: 用户可以按章节、当前上下文等方式组织和聚焦笔记与书签
- [ ] **ANT-04**: 笔记、书签、阅读位置在桌面端可以可靠持久化并正确恢复

### Search

- [ ] **SRCH-01**: 用户可以对正文做真正的全文搜索，而不是仅限目录过滤
- [ ] **SRCH-02**: 搜索结果可以缓存、恢复、清理，并在 reader 中正确高亮与跳转
- [ ] **SRCH-03**: 搜索历史、搜索范围、大小写等高级配置达到 `Readest` 同等级
- [ ] **SRCH-04**: 搜索缓存具有可维护的失效、回收和清理策略

### View and Interaction

- [ ] **VIEW-01**: 用户可以使用与 `Readest` 对齐的阅读宽度、界面显隐、阅读氛围等视图设置
- [ ] **VIEW-02**: 用户可以使用与 `Readest` 对齐的窗口拖动、固定侧栏、悬浮显隐等桌面交互
- [ ] **VIEW-03**: 阅读器的分页、位置、进度、版心和空白策略与 `Readest` 同等级
- [ ] **VIEW-04**: 顶栏、底栏、侧栏与正文区域之间不会出现错位、缩放或嵌套渲染错误

### Service and Online Features

- [ ] **SVC-01**: `Readest` 已有的在线/服务型能力在 `br1` 第一阶段也应纳入对齐范围
- [ ] **SVC-02**: 若服务能力依赖外部账号、远端 API 或平台接入，`br1` 需要建立可验证的接入方案
- [ ] **SVC-03**: 本地状态与远端/服务状态之间的同步、恢复与错误处理应达到可用水平

### Desktop Integration

- [ ] **DSK-01**: `Tauri` 桌面窗口、独立 reader 窗口、主窗口切换和聚焦行为与 `Readest` 对齐
- [ ] **DSK-02**: 本地文件选择、打开原文件、路径访问和桌面特有权限流可稳定工作
- [ ] **DSK-03**: 桌面端需要支持自动化测试和回归执行

### Quality and Regression

- [ ] **QUAL-01**: 项目具备覆盖 `library`、`reader`、格式打开、位置恢复等核心路径的自动化回归
- [ ] **QUAL-02**: 每次重要对齐切片都需要有真实验证，而不是只做视觉近似
- [ ] **QUAL-03**: 关键桌面路径需要有可持续运行的 WebDriver / 桌面自动化基线

## v2 Requirements

### AI Reading System

- **AI-01**: 阅读器可以根据读者目标、上下文和材料类型决定何时解释、何时追问、何时沉默
- **AI-02**: 阅读器可以在长期阅读中维护概念演化、重读建议与个性化记忆结构
- **AI-03**: 阅读器可以对不同阅读类型提供不同的 AI 机制，如沉浸阅读、科研阅读、判断辨析、反思镜像和联想迁移
- **AI-04**: 阅读器可以把多模型、多策略模块组合成一个可验证的阅读编排系统

## Out of Scope

| Feature | Reason |
|---------|--------|
| 在 Phase 1 期间用自定义 AI 工作流替代 `Readest` 对齐目标 | 会混淆“底座复刻”和“第二阶段创新”两条主线 |
| 只做视觉像 `Readest` 但行为和数据层不对齐 | 不符合当前阶段的“客观能力对齐”要求 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIB-01 | Phase 1 | Pending |
| LIB-02 | Phase 2 | Pending |
| LIB-03 | Phase 2 | Pending |
| LIB-04 | Phase 3 | Pending |
| LIB-05 | Phase 3 | Pending |
| RDR-01 | Phase 4 | Pending |
| RDR-02 | Phase 5 | Pending |
| RDR-03 | Phase 6 | Pending |
| RDR-04 | Phase 7 | Pending |
| RDR-05 | Phase 8 | Pending |
| FMT-01 | Phase 4 | Pending |
| FMT-02 | Phase 4 | Pending |
| FMT-03 | Phase 9 | Pending |
| FMT-04 | Phase 9 | Pending |
| FMT-05 | Phase 4 | Pending |
| ANT-01 | Phase 7 | Pending |
| ANT-02 | Phase 7 | Pending |
| ANT-03 | Phase 7 | Pending |
| ANT-04 | Phase 6 | Pending |
| SRCH-01 | Phase 7 | Pending |
| SRCH-02 | Phase 7 | Pending |
| SRCH-03 | Phase 10 | Pending |
| SRCH-04 | Phase 10 | Pending |
| VIEW-01 | Phase 8 | Pending |
| VIEW-02 | Phase 8 | Pending |
| VIEW-03 | Phase 8 | Pending |
| VIEW-04 | Phase 5 | Pending |
| SVC-01 | Phase 11 | Pending |
| SVC-02 | Phase 11 | Pending |
| SVC-03 | Phase 11 | Pending |
| DSK-01 | Phase 6 | Pending |
| DSK-02 | Phase 1 | Pending |
| DSK-03 | Phase 12 | Pending |
| QUAL-01 | Phase 12 | Pending |
| QUAL-02 | Phase 12 | Pending |
| QUAL-03 | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after initial definition of full Readest parity scope*
