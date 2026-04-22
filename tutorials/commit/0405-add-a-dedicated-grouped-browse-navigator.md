# 0405 - 给 grouped library browse 补独立 navigator

## 背景

前一轮已经把 grouped browse 的关系慢慢铺开了：

- breadcrumb trail
- ancestor landings
- ancestor subgroup shelves
- sibling graph

问题是，这些关系虽然都成立了，但还分散在不同块里：

- 一部分在 header
- 一部分在 ancestor section
- 一部分在 current overview

这意味着用户虽然能走这些路径，但页面还缺一个“专门负责导航”的稳定入口。

## 这次要补什么

这次不再继续把导航逻辑附着在某一个 landing 上，而是单独补一个 browse navigator：

1. 把当前 path 收进同一块
2. 把 same-level sibling switch 收进同一块
3. 把 cross-dimension pivots 也收进同一块
4. 让它成为 grouped browse 页面顶部稳定存在的导航面

也就是说，这次收的是信息架构，而不是再加一层局部功能。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 新增 `group-browse-navigator`
- navigator 顶部显示当前 group 摘要
- navigator 中间统一展示：
  - 当前路径
  - 同层切换
  - 跨维继续看
- desktop 和 starter 两条 grouped browse 路径都接入了同样的 navigator

## 为什么这一步重要

### 1. 导航不该继续散在每个 landing 里

如果 path、sibling、pivot 都只挂在不同 landing 旁边，用户每次都得重新判断：

- 这次我该去哪一块找下一步？

独立 navigator 的作用就是把“下一步怎么走”从内容解释里剥离出来，变成一个稳定的浏览控制面。

### 2. 这让 grouped browse 更像产品级导航，而不是拼出来的能力集合

前几刀更多是在补 capability。  
这刀开始把这些 capability 重新组织成一个更完整的 navigation surface。

这非常关键，因为大粒度对齐做到后面，差异往往不在“有没有这个按钮”，而在“这些能力是不是已经像一个完整产品面那样被组织起来”。

### 3. navigator 和 landing 的分工终于更清楚了

现在两者的职责开始分开：

- navigator 负责决定怎么走
- landing 负责解释当前这一层是什么

这比之前所有东西都塞在 landing 里更干净，也更接近成熟产品的信息层次。

## 结果

现在 `br1` 的 grouped library browse 已经不只是“有很多可走的路”，而是开始有了一个明确的导航中枢：

- header 记路径
- navigator 负责当前路径/同层切换/跨维跳转
- ancestor landing 负责祖先层解释
- current landing 负责当前层解释

这让 grouped browse 从“功能逐步齐了”继续推进到“导航结构开始成形”。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 navigator 里的切换路径
- 当前 navigator 仍然依附在 library page，不是独立组件
- 还没有把这套 grouped browse navigation 抽成完整 graph model
