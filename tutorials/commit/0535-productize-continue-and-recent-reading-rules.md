# 0535 - 收紧 continue reading / recent reading 的主页规则

这刀对应 `P3-2.1`，重点不是继续改 library 外观，而是把 homepage 上两条最容易“看起来对、实际规则模糊”的 section 收成明确产品规则：

- `继续阅读` 只收纳正在读、且未完成的书
- `最近阅读` 不再把已读完的书继续塞进 reading workflow
- section limit 变成显式常量，而不是散落在 slice 里的魔法数字

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.test.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.test.ts)

## 为什么这刀现在该做

`P3-1.3` 已经把 search/filter state 收成单一结果 shelf。接下来主页 remaining gap 就很集中：`continue reading` 和 `recent reading` 还是更像实现投影，不像一个稳定的阅读工作流。

最明显的问题是：

- `recent reading` 会把已读完但曾经打开过的书也继续放进去
- 但同一份代码里又已经写了“最近没有在读书”的 workflow notice

这两件事同时存在，说明产品语义还没闭合。

## 这刀做了什么

1. 把 section limit 提升成显式常量

以前 `continue` 和 `recent` 的截断值直接写在 helper 里：

- `slice(0, 3)`
- `slice(0, 6)`

现在它们变成了明确常量：

- `CONTINUE_READING_SECTION_LIMIT`
- `RECENT_READING_SECTION_LIMIT`

这一步不华丽，但很重要。因为从这里开始，limit 是“产品规则”，不是“实现刚好这么写”。

2. `recent reading` 不再接纳已读完的书

`getRecentReadingBooks(...)` 现在仍然保留两个既有约束：

- 书必须被打开过
- 不能和 `continue reading` 重复

这次补上的约束是：

- 已读完的书不再进入 `recent reading`

这样 homepage reading workflow 就开始有清楚边界：

- 正在读的书去 `继续阅读`
- 最近打开过、但当前没有在读中的未完成书去 `最近阅读`
- 已读完的书留在主书库，不再占据 reading workflow 的位置

3. 让“最近没有在读书”这条 notice 终于变成真实可达路径

之前只要用户有“已读完但打开过”的书，`recent reading` 就可能继续非空，于是这条 notice 很难真正出现。

现在当用户：

- 没有进行中的书
- 也没有可归入 recent 的未完成书
- 但库里确实有已读完的书

workflow notice 就会稳定落到：

- `最近没有在读书`

这正是 homepage 该表达的产品状态。

4. 把文案同步到新规则

`ContinueReadingShelf` 里 recent 的 section 描述也同步变成：

- “重新打开你最近看过，但当前没有在读中的书”

这样 UI copy 和底层筛选规则至少不再互相打架。

## 这刀为什么值得单独提交

因为这是很典型的“看起来像小规则，实际上决定产品感”的地方。

如果 `recent reading` 继续收纳 finished books，homepage 会一直给人一种很怪的感觉：

- 页面像在展示阅读 workflow
- 但条目却混入已经结束的阅读状态

这不是数据有没有的问题，而是产品在说什么的问题。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/library/page.test.ts`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有继续改 `ContinueReadingShelf` 的版式和交互层级
- 没有调整 grouped browse 或主书架排序逻辑
- 没有把 `P3-2.2` 的 Readest local-library compatibility 语义提前混进来
