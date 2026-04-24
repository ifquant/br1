# 0534 - 对齐 library 的筛选态 section 行为

这刀对应 `P3-1.3` 的第一批实质收口，但范围是刻意压住的：

- 解决搜索态和筛选态到底该不该继续混着展示 `继续阅读 / 最近阅读 / 待修复书籍`
- 让 `筛选命中 X / Y 本` 只代表主结果 shelf，而不是把 workflow sections 一起算进去
- 保持现有 scroll runtime 和 grouped-browse 路径不动，不在这刀里扩成一轮大重排

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/surface.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/surface.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)

## 这刀做了什么

1. 给 library browse derivation 明确加了一个产品级开关：`workflowSectionsVisible`

之前 route 和 body 虽然已经有 `searchActive`、`groupedBrowseMode` 这些状态，但没有一个明确规则告诉系统：

- 当前是不是还应该展示 workflow shelves
- 什么时候主 shelf 应该独占页面
- `visibleBooksCount` 到底在数什么

这次把它们收成一个显式派生值：

- 非 grouped browse
- 且没有 active search/filter

只有同时满足这两个条件，才显示 workflow sections。

这比之前让各处自己猜要稳得多，因为 section 行为终于有了一个统一判断入口。

2. 搜索态和筛选态都收成单一结果 shelf

这次之后，library 的 section 语义变成：

- 搜索态：`搜索结果`
- 非搜索但有筛选：`筛选结果`
- 无搜索无筛选：保留 `继续阅读 / 最近阅读 / 待修复书籍 + 你的书库`

对应地，desktop/starter 两条分支都不再在 filter-only state 下继续保留 workflow shelves。

这一步很关键，因为之前的实现虽然功能上“都能看到”，但产品语义是混乱的：

- 顶部写着有筛选
- 下面却还混着 workflow shelf
- `筛选命中 X 本` 还可能把 workflow sections 里的书一起算进去

这种状态在实现上说得过去，在产品上说不过去。

3. `filterSummary` 和 `visibleBooksCount` 只回到主结果 shelf

以前 `visibleBooksCount` 在非 grouped 模式下会把：

- recovery
- continue reading
- recent reading
- main shelf

一起加总。

这让 `筛选命中 X / Y 本` 读起来更像“页面上总共露出了几本”，而不是“当前筛选真正命中的结果数”。

这次改完后：

- workflow sections 可见时，保留原来的总可见数
- workflow sections 不可见时，只看主结果 shelf

这样 search/filter summary 才开始有产品意义。

4. 用 smoke test 把新的 contract 锁住

这刀顺手把 `library-smoke.spec.ts` 里几条旧断言改到了新 contract：

- `状态 未开始` 之类的 filter state 下，不再要求 `继续阅读` 仍然可见
- 改为要求 `筛选结果` heading 可见
- 搜索空结果仍然要求 `搜索结果`

这不是“为了测试去改测试”，而是把过去仍然站在旧 section 语义上的断言修正到新的产品边界上。

## 为什么这刀单独成立

因为 `P3` 到这个阶段，真正让 library 看起来不像 Readest 的问题，已经不只是视觉密度，而是“页面是否在清楚表达当前状态”。

如果用户已经主动搜索或筛选：

- 页面就应该以结果为中心
- workflow sections 应该让路
- 计数和 heading 应该只表达这次结果

否则用户看到的是“所有东西都在，但没有一个在说重点”。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test /Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"`（PASS）

## 没有包含

- 没有改 grouped-browse trail / sibling / pivot 导航
- 没有改排序算法本身
- 没有重写 scroll runtime；这刀只确认现有 scroll host 继续承载新的 section contract，不另外发明一套滚动模型
