# State: br1

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-13)

**Core value:** 先把 `Readest` 的完整阅读器能力高保真复刻到 `br1`，为后续真正的 AI 阅读机制提供不残缺的底座。  
**Current focus:** Phase 4 planning for reader open pipeline and format base

## Current Status

- Milestone state: 初始规划中，Phase 1 到 Phase 3 已执行完成
- Current phase: 已进入 Phase 4 planning
- Latest planning artifact: `.planning/phases/04-reader-open-pipeline-and-format-base/04-03-PLAN.md`
- Codebase map: 已存在于 `.planning/codebase/`

## Decisions In Force

- 第一阶段按 `Readest` 完整产品规格做 1:1 对齐
- 第一阶段包含外部服务型能力，不只做本地阅读器核心
- 第一阶段优先追求客观能力对齐，不以先迁移主力使用为目标
- 第二阶段再进入 AI 阅读器机制创新

## Next Suggested Actions

1. 先执行 `04-01-PLAN.md`，收口 `EPUB` 打开链路与正文渲染
2. 接着执行 `04-02-PLAN.md`，稳定 `PDF` vendor / wasm 和打开路径
3. 用 `04-03-PLAN.md` 收口跨格式打开服务与共享错误语义

## Notes

- 用户提供的《阅读器设计探索》文档定义了长期 AI 阅读器方向，但当前里程碑先以 `Readest` 全量对齐为主
- `br1` 已有不少功能雏形，因此后续 phase planning 必须以 brownfield 改造和补齐为中心
- Phase 4 先处理 reader 打开链路和格式基座，再进入 Phase 5 的布局/视觉对齐

---
*Last updated: 2026-04-13 after creating the full Phase 2 planning set*
