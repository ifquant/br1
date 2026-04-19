# 0286: cover reader settings reopen through the desktop Kindle-family flow

上一刀已经把新的 reader settings reopen 证据补到了：

- `EPUB`
- `FB2`

但 `P0-2` 还差一层很直接的验证：

- `MOBI`
- `AZW3`

也就是 Kindle-family 这条 shared desktop 主路径。

如果这层不补，`Scroll/Page View Modes` 和 `Customize Font and Layout` 仍然更像：

- 主格式成立
- 一个 secondary format 成立
- 但还没证明这套 settings contract 真能穿过另一类 reflowable engine path

## 这一步为什么值钱

`MOBI/AZW3` 在 `br1` 里已经不是“能打开就算完”：

- 有 import/open/reopen
- 有 metadata import
- 有 annotation persistence
- 有 highlights workspace
- 有 saved selection set reopen evidence

所以继续推进 `P0-2` 时，最合理的问题就是：

> 同一套阅读设置，能不能和这些已有状态一起穿过 Kindle-family 的真实 reader reopen？

如果不能，那 settings 仍然只算一条局部主路径能力。

## 做了什么

改动仍然只在：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

没有新做功能实现，也没有扩 settings model。  
这次做的是两件事：

### 1. 给 desktop reader reopen 补一个更明确的“可用状态”等待层

新增了：

- `waitForDesktopReaderToHydrate(expectedFormatLabel?)`

它会在继续跑 workspace 断言前先确认：

- reader 没有 `stageError`
- `formatLabel` 已经是目标格式
- reader 已经进入 `hasUsableReaderState(details)`

这一步不是为了掩盖 bug，而是为了对齐真实运行时语义：

- Kindle-family 的 notes/highlights 是按 `bookKey` 异步 hydration
- 如果 reopen 后太早切到 sidebar 断言，可能读到的是“当前书已切换、但 notes workspace 还没挂完”的过渡态

这次 stable fail 的形态就是：

- 磁盘 notes 已经存在
- reopen meta 还是 `0 标注 0 高亮 0 笔记`

所以这里收的是测试时序，而不是运行时存储 contract。

### 2. 把 settings reopen 证据正式补到 shared Kindle-family regression

扩的仍然是现有主路径：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

在每个 `MOBI/AZW3` 样本里，现在都会：

1. 打开 reader
2. 等 reader 完成可用 hydration
3. 进入 `高亮` tab
4. 保存当前 selection set
5. 用 `More actions` 切到：
   - `滚动`
   - `无衬线`
   - `大`
   - `舒展`
   - `宽`
6. 直接读 renderer 状态，确认：
   - `flow === scrolled`
   - `margin-left === 44px`
   - `fontSize === 22px`
   - `lineHeightPx > 42`
   - `fontFamily` 包含 `IBM Plex Sans`
7. 关闭 reader window
8. 从 library 重新打开同一本 `MOBI` 或 `AZW3`
9. 再次等待 reader 完成 hydration
10. 进入 `高亮` tab
11. 同时确认两层状态都恢复：
   - reader settings 还在
   - highlights workspace 的 `selected-only + oldest-first + saved set` 状态也还在

## 为什么这里还要保留 hydration helper

这一步最容易犯的错，是把 reopen 失败直接解读成“settings 没保存”。

但这次实际打出来的失败不是 settings 丢失，而是：

- reader notes store 读盘成功
- 但 sidebar 断言跑在 hydration 之前

如果不先把这个时序收稳，后面你会不断得到假阴性：

- 看上去是 Kindle-family reopen 不稳
- 实际上是测试在读半初始化状态

所以这一步的价值是：

- 先把真实 reopen 主路径拉到稳定、可重复
- 再把 settings 证据叠加上去

## 结果

现在 `P0-2` 的 desktop settings reopen 证据已经覆盖：

- `EPUB`
- `FB2`
- `MOBI`
- `AZW3`

也就是当前最主要的 reflowable reader formats。

这还不是 `Completed`，但已经不再只是：

- 一个主格式
- 一个 secondary format

而是开始跨到 Kindle-family 这条不同的 reflowable 路径。

## 还没做什么

这一刀之后，`P0-2` 仍然没有收口：

- 还没有把同等级 settings reopen 证据补到 `TXT`
- 还没有把更多 theme/chrome/view-width 组合做成更系统的 regression matrix
- 还没有把更深层的 header/footer/sidebar geometry contract 一起收实

所以审计表里：

- `Scroll/Page View Modes`
- `Customize Font and Layout`

仍然应该保持 `Partial`。

## 你可以学到什么

### 1. 桌面 reopen 测试先要分清“状态没恢复”还是“还没水合完”

如果磁盘状态已经对了，但 UI 还是空：

- 先怀疑 hydration timing
- 不要马上把它归因成 persistence 失败

这一步就是典型例子。

### 2. Shared regression 很值钱，因为它能同时证明一整个格式家族

`MOBI/AZW3` 这里不是写两条独立 spec，而是继续压在一条 shared Kindle-family desktop 主路径上。

这样一刀补进去，证明的不是一个孤立按钮，而是：

- Kindle-family reopen
- settings persistence
- highlights workspace persistence

这三个状态能共存。

## 验证

实际跑过：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
```

结果：

- PASS
