# 0538 - 把 reader search state 收成一个产品面

这刀对应 `P4-1.2`。目标不是增加新的搜索能力，而是把 reader 里已经存在的搜索状态，整理成一个像产品而不是像条件分支拼接的 surface。

在这刀之前，search 能用，但状态表达是散的：

- TXT 输入 query 后会报 unsupported
- EPUB 没命中时会显示 empty
- 命中后有导航和结果
- 但 sidebar 顶部 summary 还是按旧规则渲染，容易把 unsupported 也显示成 `0 正文命中结果`

这类问题不算底层 bug，但会直接破坏用户对 reader 的理解：同一块 search panel，看起来像三套不同组件。

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts)
- [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
- [`/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 把 search summary 变成一个显式 presentation model

[`ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) 新增了 `getSearchSummaryModel(...)`，把原来散在模板里的判断统一到一处。

现在顶部 summary 会明确区分：

- `正在搜索`
- `当前格式不支持正文搜索`
- `0 / 当前关键词没有命中正文内容`
- `N / 正文命中结果`
- 默认 idle guidance

这样 unsupported 不会再伪装成“只是没有结果”。

2. unsupported title 也开始共享

[`formats.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts) 增加了：

- `READER_UNSUPPORTED_SEARCH_TITLE`

它和已有的 `getSearchSupportMessage(...)` 一起，把“这个格式不支持正文搜索”的标题/说明也开始收进共享 contract。

这一步的意义是：

- reader search 的能力边界不再只有 message 共享
- 连标题语义也开始统一

3. search result 区域也改成同一套产品语义

这次没有改底层 search data flow，只改结果区的解释方式：

- searching 且还没结果时，明确说“正在整理命中的正文段落和所在章节”
- idle 时，不再说“打开书后”，而是更直接地说“输入关键词后，这里会显示命中的正文段落和所在章节”
- empty 仍然保留“没有命中正文内容”
- unsupported 仍然显示真实 unsupported message

这样 summary 和 result area 不再互相打架。

4. 用一条 cross-format smoke 锁住真实 contract

[`library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) 里的原 TXT-only search boundary 测试，被升级成一条更有价值的 cross-format smoke：

- 先验证 TXT search 会落到 unsupported state
- 再验证 EPUB 搜索会经历 empty state
- 最后验证 EPUB 搜索命中后能出现结果导航

这条测试比旧版本更接近产品 contract，而不是只盯着一个字符串。

## 为什么这刀值得单独提交

因为这是典型的“能力已存在，但产品解释还没闭合”的问题。

如果不先收这个面，后面继续做：

- reader shell hierarchy
- notes/bookmarks/highlights workspace

都会继续叠在一个语义松散的 sidebar 上。

先把 search state 收成一个稳定 surface，后续 `P4` 才有更清晰的落点。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader search states read like one product surface across txt and epub"`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有新增 TXT 正文搜索
- 没有改 `ReaderViewport` 的搜索数据流
- 没有继续修改 notes / bookmarks / highlights 的 workspace hierarchy
