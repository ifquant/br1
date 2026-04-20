# 0288: integrate wave-1 subagent slices for settings, library, and open-with

这次提交不是单条功能线，而是并发执行计划里的第一波集成。

`Wave 1` 同时开了三条 runtime lane：

- `Worker A`: reader settings
- `Worker B`: library management
- `Worker C`: multi-format / open-with

作为 orchestrator，这一刀做的不是继续写新 runtime，而是把三条 lane 的 patch 收拢进一次真实集成：

- 补回归
- 更新 parity audit
- 留下 tutorial

## 这一刀为什么值钱

如果 subagent 只各自改代码、不经过一次显式集成，那么并发执行实际上只完成了一半。

真正缺的会是：

- 哪些 patch 已经被 integration-level 证据覆盖
- 哪些只是 worker 自己说“本地通过”
- 审计表该如何更新

所以这次的目标很明确：

- 把 Wave 1 的三个 runtime patch，收成一次可信的产品集成结果

## 集成了什么

### 1. Reader settings runtime contract 继续收紧

来自 Worker A 的 patch，收的是 `P0-2` 的 runtime consistency：

- `hydrateReaderSettings()` 现在会把持久化的 reader settings 正规化回 storage
- window mode 下 `chromeMode=auto` 不再等用户再次交互才隐藏 chrome
- `themePreset / viewWidthMode / chromeMode` 现在在 foliate surface 和 TXT plain-text surface 上走同一套 contract
- foliate shell 外层和 TXT paper styling 现在共享同一套 theme palette，而不再把 TXT 当成布局例外

这一步没有再扩新 UI，但它把 settings 的“同一套 contract 是否真的跨 surface 成立”往前收了一刀。

### 2. Library 管理面有了第一条显式状态筛选语义

来自 Worker B 的 patch，收的是 `P0-4` 的 product semantics：

- library header 现在新增：
  - `全部`
  - `在读`
  - `未开始`
  - `已读完`
- 这层 filter 不只作用于主 shelf，而是同时作用于：
  - `继续阅读`
  - `最近阅读`
  - `你的书库`
- scroll restoration 也不再只按 view/sort/search 记，而是把 filter 一并记进上下文 key
- 空状态文案现在会明确说当前是 search miss 还是 filter miss

这一步的重要性不在“多了几个按钮”，而在于 library 终于开始有更明确的状态分区产品语义。

### 3. Associated-file intake 不再吃脏输入

来自 Worker C 的 patch，收的是 `P0-1` 的 runtime contract：

- associated-book launch 现在会先做标准化
- 支持：
  - 外层带引号的路径
  - `file://...` URL
  - `file://localhost/...`
  - 相对路径 + 当前 cwd
- 最后会 canonicalize 成真实路径
- 只保留支持格式
- 同一真实文件的重复输入会去重

这不是 packaged installer 证据，但它把 runtime open-with intake 收得更像真实桌面环境了。

## Orchestrator 补了什么回归

因为 tests 是 orchestrator-only，所以这次真正补的是两条 integration-level 证据。

### 1. Web smoke 收 library filter 语义

更新：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

现在这条 smoke 不只看“library 页面能不能打开”，还会验证：

- `未开始` 只保留未开始的书
- `已读完` 只保留已读完的书
- `在读 + 搜索 miss` 的空状态会明确反映当前 filter

这让 Worker B 那条 patch 不再只是 header 上的新控件，而是有了 product-level 证据。

### 2. Desktop regression 收 associated-file normalization

更新：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

原来的 associated-book test 只证明：

- 队列里塞一个干净绝对路径
- 会打开 reader

现在它会一次性提交：

- 原始绝对路径
- 带引号路径
- `file://localhost/...`
- `file://...`

并断言：

- queue 里最后只收成 `1` 条
- 只打开 `1` 个 reader window
- 打开的 `path` 是 canonicalized 后的真实文件路径

这让 Worker C 的 patch 得到了桌面层证据，而不是只停在 `cargo check`。

## 审计表怎么更新了

这次只更新真正被 Wave 1 触到的四行：

- `Scroll/Page View Modes`
- `Customize Font and Layout`
- `File Association and Open With`
- `Library Management`

更新原则是：

- 不夸大成 `Completed`
- 只把新 runtime contract 和新 integration evidence 写进去

也就是说，这次的审计更新是“证据增强”，不是“提前宣告收口”。

## 还没做什么

Wave 1 集成完成后，下面这些仍然没有关闭：

- `P0-2` 还没变成完整 settings matrix
- `P0-4` 还没有 delete/archive/tag/repair 这类更完整书库动作
- `P0-1` 还没有 packaged installer 级别的真实 open-with 证据
- `P0-3` 还没开始进入 Wave 2 的 search/highlights 主产品化

所以这次正确的结论是：

- Wave 1 已经落地
- 但 `P0` 远没有结束

## 你可以学到什么

### 1. 并发真正的结束点不是 worker 完成，而是 orchestrator 集成

worker 交回 patch 只说明：

- 它那条 lane 有了局部进展

真正能进产品 ledger 的，是：

- orchestrator 补过回归
- audit 已同步
- tutorial 已写清

### 2. 最好的集成回归不是“多跑几条”，而是让每条 lane 至少有一条显式证据

这次只补了：

- 一条 web smoke
- 一条 desktop regression

但它们分别锁住了：

- library filter semantics
- associated-file normalization

这就足够把 Wave 1 收成一次可信集成。

## 验证

实际跑过：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'normalizes associated book requests before opening a separate reader window|persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
pnpm check
git diff --check
```

结果：

- PASS
