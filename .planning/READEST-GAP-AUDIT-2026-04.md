# Readest Gap Audit (2026-04)

Last updated: 2026-04-23

## Purpose

这份审计不是重新描述 `br1` 已经做了什么，而是回答一个更直接的问题：

> 现在如果把 `br1` 和当前公开的 `Readest` 产品面放在一起比，真正还差什么？

这份文档的作用是把后续计划从“继续做内部收口”重新拉回“继续对齐 Readest 的产品能力”。

## Audit Sources

- `br1` 当前代码与规划文档
  - `.planning/FEATURE-PARITY-AUDIT.md`
  - `.planning/ROADMAP.md`
  - `src/`
  - `src-tauri/`
- Readest 公开产品面
  - [Readest 官网](https://readest.com/)
  - [Readest GitHub README](https://github.com/readest/readest)

## Executive Summary

`br1` 当前状态可以概括成一句话：

**core-reader strong, advanced/service weak**

也就是说：

- 本地 library + reader + reopen + search + annotation + grouped browse 这条主线已经很强
- 但 Readest 当前真正拉开差距的产品层，已经不在 route 结构或基本 reader 工作流上，而在：
  - `Dictionary / Wikipedia`
  - `Parallel Read`
  - `TTS`
  - `Visual & Focus Aids`
  - `OPDS / Calibre`
  - `DeepL / Yandex`
  - `Cross-device Sync`
  - `KOReader Sync`

因此，**route-closure 现在最多只该被视为内部维护线，不应继续充当主执行线。**

## What Readest Publicly Claims Today

Readest 官网当前明确强调：

- `Parallel Read` 双栏/分屏阅读
- `DeepL` 段落翻译
- `Wikipedia` 术语查找
- `Cross-device sync`
- `AI-powered TTS`

Readest GitHub README 当前更直接把以下能力标成已实现：

- `Dictionary/Wikipedia Lookup`
- `Parallel Read`
- `OPDS/Calibre Integration`
- `Translate with DeepL and Yandex`
- `Text-to-Speech (TTS) Support`
- `Sync across Platforms`
- `Sync with Koreader`
- `Accessibility`
- `Visual & Focus Aids`

这意味着：如果 `br1` 继续把主要精力放在 route 收薄、局部 UI 收口、或单一 reader 表面打磨上，就会越来越偏离真正的 parity 主矛盾。

## Current br1 Strengths

`br1` 现在最强的是本地阅读器底座：

- library import / desktop open / reader window
- `EPUB/PDF` 稳定 reopen
- `FB2/MOBI/AZW3/CBZ/TXT` 已进入真实支持边界
- scroll / paginated、版式与持久化设置
- whole-book search、history、cache、reopen restore
- highlights / notes / bookmarks / saved sets / refresh mapping
- library grouped browse 已经超过“能筛选和排序”的级别

换句话说，`br1` 已经不像一个壳子，而像一个认真做过本地 reader core 的产品。

## Main Gaps vs Readest

### Gap 1: P1 Advanced Reading Experience is still mostly absent

从 Readest 当前公开能力看，`br1` 最大的单层缺口不是 reopen，也不是 library route，而是高级阅读体验。

当前状态：

- `Dictionary / Wikipedia Lookup`: 未开始
- `Parallel Read`: 未开始
- `Code Syntax Highlighting`: 未开始
- `TTS`: 未开始
- `Visual & Focus Aids`: 只有很浅的版式/宽度/氛围模式，不是完整 focus-tools
- `Accessibility`: 只有基础语义，不是完整 a11y 产品面

其中最值得注意的是：

- `ReaderWorkspace.svelte` 里已经有一个 `Text to speech` 按钮，但它只是 UI 占位，不代表功能存在

这说明：

- `br1` 有“想做这些能力”的产品信号
- 但当前还没有真正可交付的实现

### Gap 2: P2 Services and Ecosystem is still blank

Readest 当前的另一个长板，是它已经不是纯本地 reader，而是带服务和生态连接器的阅读器。

`br1` 当前在这层基本还是空白：

- `OPDS / Calibre Integration`: 无
- `Translate with DeepL and Yandex`: 无
- `Sync across Platforms`: 无
- `Sync with Koreader`: 无

这类能力不是“以后再说”的尾巴，而是 Readest 公开产品面里已经被拿出来当核心卖点的部分。

### Gap 3: P0 still has completion work, but is no longer the only story

这次审计并不意味着 `P0` 已经完全收平。

`P0` 里依然有收口空间：

- multi-format 还不是完全 completed
- annotation/search 还没到 Readest 的完整产品厚度
- library management 仍然是强 partial，不是 completed

但重要的是：**P0 现在已经不是“只有这一层有真实内容，其它都空白”的阶段了。**

继续把全部计划压在 P0 和 route-closure 上，会让项目长期停在“本地核心越来越完整，但整体 Readest 对齐越来越失真”的状态。

## Planning Consequence

新的计划原则应当是：

1. `P0` 继续收口，但不再无限期垄断执行线
2. `P1` 不再冻结，而是作为 `P0` 后的第一主线显式排期
3. `P2` 也不再只保留边界，而要拆成明确的 service phases
4. route-closure 只作为内部维护线，不再单独占据 roadmap 主位置

## New Phase Split

### P0 Core Reader

保持现有四个 plan，但把目标从“继续内部收口”改成“准备通过 P0 exit gate”：

- `P0-1` 格式与打开基座
- `P0-2` 阅读模式与版式系统
- `P0-3` 搜索、批注、书签、进度
- `P0-4` Library 管理

### P1 Advanced Reading Experience

不再冻结，改成三段：

#### P1-1 Lookup and In-Reading Assistance

目标：

- `Dictionary / Wikipedia Lookup`
- reader 内上下文查询与最小 lookup UX

原因：

- 这是 Readest 最直接、最高频的 in-reading enhancement 之一
- 也最符合 `AI as bridge` 的产品方向

#### P1-2 Read Aloud, Focus, and Accessibility

目标：

- `Text-to-Speech (TTS)`
- `Visual & Focus Aids`
- `Accessibility`

原因：

- 这三块都属于“阅读体验增强”而不是生态依赖
- 可以共用 reader workspace / focus mode / accessibility review 的一套演进线

#### P1-3 Parallel and Specialized Reading Surfaces

目标：

- `Parallel Read`
- `Code Syntax Highlighting`

原因：

- 这两项都要求 reader surface 本身出现新的布局或渲染形态
- 放在同一 phase 更符合工程边界

### P2 Services and Ecosystem

不再冻结，拆成四段：

#### P2-1 Catalog Connectors

目标：

- `OPDS / Calibre Integration`

#### P2-2 Translation Bridges

目标：

- `Translate with DeepL and Yandex`

#### P2-3 Cross-Device Sync Substrate

目标：

- `Sync across Platforms`

#### P2-4 Ecosystem Adapters

目标：

- `Sync with Koreader`

## Recommended Execution Order

新的建议顺序：

1. 完成 `P0-1` 到 `P0-4`
2. 做一次 `P0 exit audit`
3. 进入 `P1-1`
4. 进入 `P1-2`
5. 进入 `P1-3`
6. 再进入 `P2-1` 到 `P2-4`

原因：

- 先保持本地 core-reader 主线收口
- 再优先进入用户能直接感知的高级阅读体验
- 最后进入更重的远端服务与生态能力

## What This Means for Route Closure

后续如果还继续做 route-closure，只能按下面的标准判断是否值得做：

- 是否直接降低后续 `P1/P2` 的实现成本
- 是否直接消除一个明确的 host-boundary 混乱点
- 是否能避免一个真实 reactive/runtime bug

如果不能满足这些条件，就不应该再把 route-closure 当作主线推进。

## Bottom Line

这轮审计后的主结论不是“route-closure 做完了”，而是：

> `br1` 已经到了应该重新回到产品差距，而不是继续沉迷内部收口的时点。

后续 planning 和 execution 都应该围绕这个判断展开。
