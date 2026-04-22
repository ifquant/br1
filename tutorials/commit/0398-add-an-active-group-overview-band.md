# 0398 - 给当前分组补一层 active-group overview

## 背景

前几刀已经把 `br1` 的 grouped library browse 推到了一个比较像样的形态：

- 顶层先看 group cards
- grouped browse 有自己的 page mode
- 当前 group 进入 URL
- header 知道当前正在浏览哪一组

但进入某个组之后，页面还是会很快退化成：

- 一个标题
- 然后直接是一串书

这意味着当前 group 虽然已经是页面状态了，却还没有自己的“落地层”。  
用户一旦进入某个作者 / 归类 / 格式组，理应先获得一层关于这组本身的概览，而不是立刻掉进裸书单。

## 这次要补什么

这次补的是一个很明确的 group landing 层：

1. 当用户进入某个 group 时，先显示 overview band
2. overview band 给出这组的主摘要
3. 再给出几个和当前 group 类型对应的关键指标
4. 之后才进入书单

例如：

- 作者组：在读 / 已读完 / 未开始
- 归类组：作者数 / 在读 / 已读完
- 格式组：作者数 / 归类数 / 在读

这让“进入某组”不再只是列表过滤，而是真正有了一个 group landing。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 增加 `getActiveLibraryGroupOverview(...)`
- 基于当前 group 类型生成不同的 overview copy 和 metrics
- 在 desktop library 和 starter library 两条路径里都加入 active-group overview band
- 新增对应的 group overview 样式，而不是继续把这层信息塞回 header 或 shelf 标题里

## 为什么这一步重要

### 1. 进入 group 之后，用户需要的是“这组是什么”，不只是“这组有哪些书”

如果页面只给书单，用户仍然需要自己重新推断：

- 这个组有多大
- 主要是什么状态
- 是偏作者维度、归类维度，还是格式维度

overview band 做的事情，就是先把这层上下文直接讲清楚。

### 2. group landing 不应该全部挤进 header

header 适合表达：

- 当前处在哪个 group
- 如何返回整库

但不适合承载更多组内统计和摘要。

一旦这些信息都塞进 header，header 会很快变成一个过载条带。  
所以这次把它做成独立的 overview band，层级更清楚：

- header：导航上下文
- overview band：当前组概览
- shelf：具体书单

### 3. 这一步比继续修书单样式更值

如果继续只改书卡、改间距、改 hover，页面仍然缺一层产品结构。  
而 active-group overview 补的是：

- 进入组之后的认知落点
- 当前 group 的阅读状态摘要
- 更接近真正 group landing 的页面节奏

这比继续磨一个 list cell 更接近大粒度对齐。

## 结果

现在 `br1` 的 grouped browse 已经不只是：

- 先看 groups
- 再进 group
- 然后看书单

而是进一步变成：

- 先看 groups
- 进入 group
- 先看当前 group 的概览
- 再进入组内书单

这一步让 grouped browse 更像真正的 library navigation，而不是过滤器驱动的列表页。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 active-group overview
- 这次还没有把 active-group overview 和更深的 subgroup / breadcrumb 继续串起来
- 当前 overview 仍然是静态摘要层，还没有继续扩成独立的 group actions 面板
