# 0289: integrate wave-2 subagent slices for search, library, and open-with

这次提交是并发执行计划里的第二波集成。

`Wave 2` 不再碰 reader settings 主路径，而是把并发重点切到：

- `Worker D`: search / annotation productization
- `Worker B`: library management
- `Worker C`: multi-format / open-with runtime

作为 orchestrator，这一刀的职责仍然不是重新做三条 runtime，而是把它们收成一次可信集成：

- 对现有 patch 做 integration review
- 补 orchestrator-own 回归
- 更新 parity audit
- 留下 tutorial

## 这一刀实际集成了什么

### 1. Search history 从“字符串列表”变成了可管理对象

来自 `Worker D` 的 runtime patch，Reader search history 不再只是 bare string：

- history entry 现在正式保存：
  - `query`
  - `config`
  - `resultCount`
  - `createdAt`
- 老的 string-only history 会自动迁移
- sidebar 现在支持：
  - `全部 / 有命中 / 无命中`
  - 重跑历史搜索
  - 删除单条历史记录

这一步的意义不是 UI 多几个按钮，而是 full-text search 开始有真正的长期管理面。

### 2. Library recovery 终于区分了两类坏状态

来自 `Worker B` 的 runtime patch，library 现在明确区分：

- 原文件丢了，但书库副本还在
- 书库副本丢了，reader 已经不能继续读

这两种状态以前都容易退化成模糊的“打不开了”。现在它们会被拆开：

- 原文件缺失时：
  - 还能继续读
  - row 上给出恢复入口
- 书库副本缺失时：
  - reader entry 被禁掉
  - row 上明确进入 recovery 状态

我在集成时顺手修了一处真实不一致：`ContinueReadingShelf` 在 `library copy missing` 时仍然会错误落到 `原文件` 按钮分支，现在已改成 recovery 分支。

### 3. Native open-with runtime 继续往真实桌面环境靠

来自 `Worker C` 的 runtime patch，Tauri app 现在不仅收 argv/single-instance associated-book 请求，也会在 native `RunEvent::Opened` 上复用同一条 associated-book queue 路径。

另外 main window 的 `show + focus` 也被抽成了共享 helper，这样 open-with 类型的运行时请求不会再绕开现有 intake flow。

这还不是 packaged installer 级别证据，但 runtime contract 比以前完整了一层。

## Orchestrator 补了哪些证据

### 1. Web smoke 收 search-history management

更新：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

现在这条 smoke 不只验证 reader 能开，还会验证：

- 结构化 search history 能在 reload 后恢复
- `全部 / 有命中 / 无命中` filter 生效
- 删除零命中 history entry 后计数会更新
- 重跑命中 history entry 会把 query 填回 search input

这让 `Worker D` 的 patch 不再只是 runtime 数据结构变化，而是有了 web 层产品证据。

### 2. Desktop regression 收 library recovery + search reopen

更新：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

这次我把两条最值钱的 desktop 证据补上了：

- `library recovery`
  - 原文件缺失但书库副本仍可读时，library row 仍然保留 reader entry
  - 书库副本缺失时，reader entry 会被禁掉，row 进入 `需修复`
- `search reopen`
  - 结构化 history entry 在 reopen 后仍会恢复
  - `有命中 / 无命中` filter 和删除单条 history entry 继续成立
  - 命中 history entry 仍能回放 disk cache

这让 `Worker B` 和 `Worker D` 的 patch 都有了 desktop-focused integration evidence。

### 3. Existing open-with regression 继续保留

`open-with` 这次没有新开独立 packaged regression，而是继续保留：

- `normalizes associated book requests before opening a separate reader window`

这条回归仍然锁住了 Worker C 依赖的 shared associated-book queue path。

## 为什么这次集成是合理切片

`Wave 2` 的目标不是一次性宣布：

- `Full-Text Search = Completed`
- `Library Management = Completed`
- `File Association and Open With = Completed`

那样会失真。

这次真正完成的是：

- search history management 有了对象化 contract + web/desktop evidence
- library recovery surface 有了显式坏状态语义 + desktop evidence
- native open-with runtime intake 继续往真实桌面事件模型靠

也就是说，这次是 `P0` 的一刀强收口，不是终局宣告。

## 还没做什么

这次没有关闭的东西仍然很多：

- search 还没有 cross-book / richer cache visibility / 更完整 product audit
- library 还没有 relink、bulk repair、collections、metadata tooling
- open-with 还没有 packaged installer 级别的真实 release-build 验证

所以正确结论是：

- `Wave 2` 已经把 `P0-3 / P0-4 / P0-1` 各往前推了一刀
- 但它们还都没有真正到 `Completed`

## 你可以学到什么

### 1. 并发集成最值钱的不是“把所有 patch 合进来”，而是把它们接到已有回归主线上

如果每个 worker 都带一条自己的新测试，最终只会得到一堆平行证据。

这次更有效的做法是：

- search 接到已有 reopen regression
- library 接到已有 desktop library workflow
- open-with 继续沿用已有 associated-book regression

这样每条 lane 都接进了主产品证据链，而不是孤立存在。

### 2. Orchestrator 必须愿意在 integration 层修掉 worker patch 里的真实不一致

如果只把 subagent patch 机械合并，`Wave 2` 其实会留下一个明显产品错位：

- `library copy missing`
- 却还显示 `原文件`

这类问题不该留到下一轮。integration 阶段看见了，就应该直接收掉。

## 验证

实际跑过：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'normalizes associated book requests before opening a separate reader window|surfaces library recovery actions when original files or library copies disappear|restores search history, options, and disk cache after reopening the same book' --mochaOpts.timeout 240000"
pnpm check
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
```

结果：

- PASS
