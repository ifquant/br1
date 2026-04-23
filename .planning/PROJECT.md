# br1

## What This Is

`br1` 是一款面向 AI 时代的阅读器。它的长期目标不是把 AI 当成内容生产工具，而是把阅读变成人与模型协同进化的知识输入过程；当前第一阶段则是用 `Tauri + Svelte` 对 `Readest` 做尽可能完整的产品级 1:1 对齐，先拿到一个稳定、完整、可演进的阅读器底座。

## Core Value

先把 `Readest` 的完整阅读器能力高保真复刻到 `br1`，为后续真正的 AI 阅读机制提供不残缺的底座。

## Requirements

### Validated

- ✓ 独立的 `library` / `reader` 双界面骨架已经存在，项目已具备桌面阅读器的基本产品形态
- ✓ `Tauri + SvelteKit + foliate-js` 技术路线已经跑通，`EPUB/PDF` 基础打开链路已建立
- ✓ 书库导入、独立阅读窗口、阅读位置恢复、搜索/笔记/书签等核心能力已有第一版实现
- ✓ 桌面自动化与 WebDriver 基线已接入，可为后续对齐工作提供回归护栏

### Active

- [ ] 以 `Readest` 为完整产品规格，完成 `library`、`reader`、格式支持、桌面交互、服务能力的全量对齐
- [ ] 在对齐过程中建立清晰的需求、阶段、验证和自动化回归基线，避免“看起来像完成”但实际不可维护
- [ ] 在 `Readest` 对齐完成后，继续演进为真正的 AI 阅读器，探索阅读中的编排、记忆、联想、对抗与长期心智变化

### Out of Scope

- 早于 `Readest` 对齐阶段就大规模引入自定义 AI 阅读交互 — 这会混淆“底座对齐”与“产品创新”两条线
- 为了赶进度而故意删减 `Readest` 已有主产品能力 — 这与当前阶段目标冲突

## Context

- 当前仓库中的活动项目是 `br1`，目标是成为 `Readest` 的 `Tauri + Svelte` 对齐实现，而不是一次轻量模仿
- 用户已经明确：`Phase 1` 不是小型 MVP，而是将 `Readest` 作为完整规格来复刻，包括外部服务型能力
- `br1` 现有代码已经覆盖书库、阅读器、窗口管理、笔记、书签、搜索、自动化回归等基础切面，但成熟度与 `Readest` 仍有差距
- 用户提供的设计文档进一步定义了长期方向：`br1` 的最终形态是 AI 阅读器，重点是用模型改善阅读中的理解、判断、沉浸、联想和长期记忆，而不是做一个总结器
- 代码库已完成 `.planning/codebase/` 映射，可作为 brownfield 规划输入

## Constraints

- **Tech stack**: 必须以 `Tauri + SvelteKit` 为主线继续推进 — 用户已经明确技术路线，且当前代码已围绕该路线建设
- **Parity target**: `Readest` 是第一阶段的产品规格基线 — 范围不以“够用”为准，而以“对齐” 为准
- **Brownfield**: 规划必须建立在现有 `br1` 实现之上 — 不能把当前工程当成空仓重来
- **Verification**: 每个阶段都需要真实验证和自动化回归 — 当前项目已经把回归能力视为核心底座的一部分
- **Commit discipline**: 规划与执行都必须保持高信号提交和教程产出 — 这是当前仓库协作规则的一部分

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 第一阶段以 `Readest` 为完整规格做 1:1 对齐 | 用户明确要求“几乎没有可以暂缓的主产品能力” | — Pending |
| 第一阶段包含外部服务型能力 | 用户明确要求不仅对齐本地阅读器核心，也包含 `Readest` 现有服务能力 | — Pending |
| 第一阶段优先追求客观能力对齐，而不是先迁移日常主力使用 | 这决定了 roadmap 应按覆盖度和准确度排优先级，而不是先做舒适度优化 | — Pending |
| 第二阶段再进入 AI 阅读机制创新 | 先拿到底座，避免在残缺阅读器上叠加 AI 机制 | — Pending |

## Evolution

项目推进过程中以 `.planning/READEST-ALIGNMENT-CHECKLIST.md` 作为唯一 Readest 对齐执行计划持续检查：

1. 已完成 checklist item 是否已经打勾并记录 commit / verification
2. `Readest` 对齐目标是否仍然完整、准确，是否有新增上游能力需要纳入 checklist
3. 第二阶段 AI 阅读器方向是否需要新增 Active requirements，但不得反向污染第一阶段对齐范围

---
*Last updated: 2026-04-23 after consolidating Readest alignment planning into a single checklist*
