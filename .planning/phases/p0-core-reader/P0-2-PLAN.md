# P0-2 Plan: 收口阅读模式与版式设置系统

**Workstream:** P0 - Core Reader  
**Plan:** P0-2  
**Status:** Planned  
**Feature Rows:** Scroll/Page View Modes, Customize Font and Layout  
**Depends on:** P0-1  
**Parallel-safe:** No  

## Why This Plan Exists

当前 `br1` 已经有宽度模式、氛围模式和 chrome 显隐，但这些还不是正式的阅读设置系统。功能表要求的是“阅读模式”和“字体与布局”的产品完成，而不是几个局部菜单项。

## Brownfield Context

当前已有实现：

- `focus/standard/wide` 宽度模式
- atmosphere mode
- chrome visibility mode
- `EPUB/PDF` 的基础 reader geometry 和 layout state

当前问题：

1. 没有真正的 `scroll / paginated` 切换
2. 字体、字号、行高、页边距、主题等设置还未形成正式系统
3. 设置状态仍较多散落在组件局部
4. reopen 后的版式恢复和自动化覆盖不完整

## Scope

In scope:

- 建立正式阅读模式系统
- 建立正式版式/字体/主题设置系统
- 设置持久化与 reopen 恢复
- 版式自动化矩阵

Out of scope:

- 批注、书签、搜索产品化
- 服务型能力
- 词典、TTS、视觉辅助等 P1 能力

## Canonical References

- `.planning/FEATURE-PARITY-AUDIT.md`
- `src/lib/components/reader/ReaderHeaderBar.svelte`
- `src/lib/components/reader/ReaderStage.svelte`
- `src/lib/components/reader/ReaderViewport.svelte`
- `src/routes/reader/+page.svelte`

## Deliverables

1. `scroll / paginated` 用户可见模式切换
2. 正式的字体与版式设置模型
3. reader 设置的持久化与重开恢复
4. 布局和版式自动化验证

## Execution Plan

### Wave 1: 定义阅读设置模型

1. 审计当前 width/atmosphere/chrome mode 的状态边界
2. 设计统一的 settings 模型与持久化方式
3. 明确哪些设置作用于正文，哪些作用于 chrome，哪些作用于 workspace

### Wave 2: 落地模式与设置

1. 提供 `scroll / paginated` 模式切换
2. 提供字体、字号、行高、边距、主题等设置
3. 让设置真正驱动正文、header、footer、sidebar，而不是只改外壳

### Wave 3: 持久化与 reopen 恢复

1. 收口 reader settings 持久化
2. 验证 reopen 后视图恢复
3. 统一跨格式 reader settings 的降级与兼容

### Wave 4: 回归与完成判定

1. 补足 reader layout / mode focused regressions
2. 让 `Scroll/Page View Modes` 与 `Customize Font and Layout` 在审计表中完成收口

## Verification Checklist

- `pnpm check`
- `pnpm exec wdio run wdio.conf.ts --mochaOpts.grep '<reader layout and mode tests>'`
- `git diff --check`
- 手工桌面验证 `scroll/paginated` 和设置持久化

## Done When

1. `Scroll/Page View Modes` 从 `Partial` 提升到 `Completed`
2. `Customize Font and Layout` 从 `Partial` 提升到 `Completed`
3. 设置不再散落在局部组件状态里

## Not Planned Here

- 不进入 P1 的 visual aids / accessibility / TTS
- 不进入 search / annotation 工作区
- 不进入服务与生态能力

---
*Created: 2026-04-18 during the P0/P1/P2 planning restructure*
