# 0419 - 把内容区 grouped browse 的 blocked states 也接进 guard hint system

## 背景

上一刀已经把 grouped browse 的 guard hints 按 surface 拆开了：

- path
- sibling
- pivot
- subgroup
- top-level group-entry

但页面里仍然有一块明显没对齐：

- ancestor landing cards
- current group overview

这些内容区 surface 里虽然也已经有 disabled controls 和 `title`，但还没有像 header / navigator / shelf 那样，把 blocked navigation 明确说出来。

这会导致 grouped browse 的 explanation policy 仍然分成两层：

- chrome 上会解释
- 内容区里很多地方还只是“禁用但不说”

## 这次做了什么

这次把 page-content 里的剩余 grouped-browse surface 也接进同一套 explanation system：

1. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 现在直接引入 [`src/lib/components/library/LibraryBrowseGuardHint.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseGuardHint.svelte)
2. route 新增了祖先层 sibling explanations 的聚合 helper，避免每个 landing block 再各自手搓一遍
3. 每个 ancestor landing card 现在都会在 `回到这一层` 动作旁边显示返回入口的 local guard hint
4. 每个 ancestor landing card 的 `同层其它分组` 现在也会在局部 sibling graph 内显示 local guard hint
5. 当前 active group overview 里的 `同层其它分组` 和 `跨维继续看` 也都接上了对应的 local guard hint
6. starter path 和 imported-library path 两边都做了同样的收口，而不是只补一侧

## 为什么这一步重要

### 1. grouped browse 终于不再只在 chrome 上解释 blocked state

如果只有 header、navigator、shelf 解释 blocked navigation，而内容区本身不解释，那么 grouped browse 的 explanation policy 仍然是碎的。

用户真正正在看的地方往往是：

- 当前 group overview
- ancestor landing cards

所以这些地方如果继续只显示 disabled button，就仍然会让页面语义断一截。

### 2. 这让 explanation surface 和 interaction surface 更接近

之前的状态更像：

- 在 A 区域点击不了
- 要去 B 区域才能知道为什么

这一刀之后开始变成：

- 在哪里被挡住
- 就在哪里解释

这比“统一但远处的解释”更接近真实的结构化 browse product。

### 3. route 现在真正开始把整页 grouped browse 当成一个 explanation system

前几刀已经让 route 负责：

- shared browse state
- shared availability
- shared surface-specific explanations

这一刀把最后那批 page-content surface 也纳进来后，grouped browse 的页面级解释终于更接近闭环，而不是只覆盖一部分主导航壳层。

## 结果

现在 `br1` 的 grouped browse blocked-state treatment 已经覆盖到：

- header path
- dedicated navigator
- top-level group cards
- subgroup shelves
- ancestor landing cards
- current group overview

也就是说，grouped browse 的 blocked navigation 已经从“有一套共享规则”更进一步变成“整页主要浏览 surface 都按同一套规则解释”。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次仍然是把 hint 接到现有内容 surface 上，没有继续把 overview/landing 抽成独立组件
- direct button-level `title` 仍然保留，新的 local hints 是补强，不是替代
- grouped browse 还可以继续把 explanation placement 做得更细，例如按 pivot section 或 ancestor depth 给更贴身的上下文文案
