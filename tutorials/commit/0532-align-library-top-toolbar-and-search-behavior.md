# 0532 - 对齐 library 顶部工具条和搜索行为

这刀是新的 `P3 Library Product Parity` 主线里的第一刀。

目标不是重做整个 library 页面，而是先把最上层控制面收干净：让用户一进 library 就知道“搜索、导入、视图切换、更多操作”都该从 header 发生，而不是一部分在 header，一部分又从 shelf 里重复冒出来。

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryGroupedBrowsePanel.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryGroupedBrowsePanel.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseTrailLandings.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseTrailLandings.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)

## 这刀在解决什么问题

改之前，library 的控制语义是分裂的：

- header 里已经有真实搜索、视图切换、排序和更多菜单
- 但 shelf 里还保留着一个“导入书籍” tile
- shelf 标题还会继续回显“网格视图 / 列表视图”
- 搜索和筛选虽然已经真实生效，但它们的当前状态主要藏在展开后的筛选区里

这会带来一个很具体的问题：

- 页面真正的控制面明明已经在 header
- 但 body 还在不断发出“也可以从这里控制”的信号

做 Readest parity 时，这种重复比单纯样式不够像更容易露馅，因为它会直接影响用户怎么理解页面结构。

## 这刀做了什么

1. 把 import 真正收回 header

   现在 header 顶部不再只是一个加号图标，而是一个有明确文案的 `导入书籍` 按钮。

   这样做的目的不是“多一个按钮”，而是把 import 明确提升成顶层 library action。用户不需要再往 shelf 里找一个导入 tile 来猜入口。

2. 把 shelf import tile 删掉

   `BookshelfPreview.svelte` 之前会在两个位置插入 import tile：

   - 顶层 grouped browse
   - 普通 shelf 尾部

   这次都删掉了。

   删除后，shelf 重新只负责一件事：

   - 展示和浏览图书内容

   不再混进“这是控制入口”这类页面级语义。

3. 让搜索状态在 header 里直接可见

   之前搜索是能用的，但“现在搜了什么、当前筛选命中了多少、当前 library 处于什么状态”并不够直观。

   这次把这些状态收回到了 header：

   - query 有内容时会出现 `清除` 按钮
   - 当前筛选详情会在 header 下直接显示
   - `筛选命中 x / y 本` 也会直接显示

   这样搜索真正变成了顶部控制条的一部分，而不是“输完后只能去下面找反馈”。

4. 去掉 shelf header 对 view mode 的重复回声

   `BookshelfPreview` 之前会在 section header 里同时显示：

   - 条目数
   - `网格视图 / 列表视图`

   但 view mode 已经是顶层 header 控制的全局状态了。继续在每个 shelf header 里重复回显，只会制造噪音。

   这次只保留条目数量，让 section header 回到内容分区本身。

## 这刀为什么没有动 grouped-browse 导航

我这次有意没有去删 grouped-browse 里的这些 body 导航：

- sibling switch
- pivot entry
- trail landing 入口
- ancestor-scoped subgroup entry

原因很简单：这些不是“明显重复的小按钮”，而是当前 grouped-browse 真正还依赖的导航面。

如果这刀直接把它们也删掉，而 header 侧又还没补上完整的 action model，就会把 grouped-browse 弄坏。

所以这次只收：

- import
- search feedback
- 顶层视图语义

而把 grouped-browse 的 header-side rethreading 明确留给后续 slice。

这是刻意控制边界，不是漏做。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test /Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"`（PASS）

## 没有包含

- 没有把 grouped-browse 的 trail / sibling / pivot 导航移到 header
- 没有开始重做 card hierarchy、cover ratio、metadata density
- 没有触碰 continue reading / recent reading 的 section 规则
