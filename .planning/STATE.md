# State: br1

## Project Reference

See:

- `.planning/PROJECT.md`
- `.planning/FEATURE-PARITY-AUDIT.md`
- `.planning/ROADMAP.md`

**Core value:** 先把 `Readest` 对应的本地阅读器核心能力高保真收口到 `br1`，再进入高级阅读体验与服务生态。
**Current focus:** P0 planning restructure and execution sequencing

## Current Status

- Milestone state: 规划体系已从旧数字 phase 顺排切到 `P0 / P1 / P2` 主线
- Current workstream: `P0 Core Reader`
- Latest planning artifacts:
  - `.planning/FEATURE-PARITY-AUDIT.md`
  - `.planning/ROADMAP.md`
  - `.planning/phases/p0-core-reader/P0-1-PLAN.md`
  - `.planning/phases/p0-core-reader/P0-2-PLAN.md`
  - `.planning/phases/p0-core-reader/P0-3-PLAN.md`
  - `.planning/phases/p0-core-reader/P0-4-PLAN.md`
- Historical execution record remains under:
  - `.planning/phases/01-*`
  - `.planning/phases/02-*`
  - `.planning/phases/03-*`
  - `.planning/phases/04-*`

## Decisions In Force

- `FEATURE-PARITY-AUDIT.md` 是 feature 级真相来源
- 第一阶段先收 `P0 Core Reader`
- `P1` 和 `P2` 当前只冻结边界，不进入实现
- 旧数字 phase 文档保留为历史执行记录，不再作为主执行顺序
- `CBZ/TXT` 默认仍属于 Multi-Format Support 的目标范围，但优先级低于 `EPUB/PDF/FB2/MOBI/AZW3`

## Next Suggested Actions

1. 开始执行 `P0-1-PLAN.md`
   - 收口多格式支持与桌面打开基座
2. 接着执行 `P0-2-PLAN.md`
   - 建立正式的阅读模式与版式设置系统
3. 再执行 `P0-3-PLAN.md`
   - 把 search / highlight / note / bookmark / progress 收成产品闭环
4. 最后执行 `P0-4-PLAN.md`
   - 把 library 收成完整本地书库工作面

## Notes

- 当前项目状态应理解为：`core-reader strong, service/ecosystem weak`
- 后续是否可以进入 `P1`，不由局部页面相似度决定，而由 P0 feature rows 是否在审计表中真正关闭决定
- 如果后续需要重写 REQUIREMENTS，应以 feature rows 为主，而不是继续围绕旧数字 phase 扩写

---
*Last updated: 2026-04-18 after restructuring planning around P0/P1/P2 workstreams*
