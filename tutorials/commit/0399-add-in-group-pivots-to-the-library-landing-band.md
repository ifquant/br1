# 0399 - 给 group landing 再补一层 in-group pivots

## 背景

上一刀已经让 `br1` 的 grouped browse 有了真正的 group landing：

- 进入当前组
- 先看到 overview band
- 再进入书单

但如果用户想继续沿着当前组扩展浏览，路径还是偏绕：

- 先返回整库
- 再重新挑另一个作者 / 归类 / 格式组

这说明 group landing 虽然已经成立了，但还缺一层“从当前组继续跳到相关组”的动作面。

## 这次要补什么

这次不再继续扩 overview 文案，而是把它补成一个真正带导航能力的 landing band：

1. 作者组里显示常见归类和常见格式
2. 归类组里显示常见作者和常见格式
3. 格式组里显示常见作者和常见归类
4. 点击这些 pivot，直接跳到对应 group

也就是说，当前 group 不只是一个“介绍页”，而是开始具备继续浏览的下一个动作层。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 增加 `summarizeLibraryValueCounts(...)`
- 让 `getActiveLibraryGroupOverview(...)` 不只返回 metrics，也返回相关 group pivots
- 新增 `handleLibraryGroupPivot(...)`，统一把这些跳转仍然落回现有 URL 级 grouped browse state
- 在 active-group overview band 里加入 pivot sections 和 pivot buttons

## 为什么这一步重要

### 1. landing 需要“下一步”，否则还是半截结构

如果 landing 只有摘要没有动作，用户得到的是：

- 我知道当前组是什么

但还没有：

- 我接下来能沿着什么方向继续看

这会让 landing 变成漂亮但静态的说明牌。  
这次补的 pivots，就是把它推进成真正的导航层。

### 2. 相关组跳转比“回整库再选一次”更接近真实 browse flow

真实用户在看某个作者组时，常见的下一步并不是总退回整库，而是：

- 这个作者主要写哪些归类？
- 这个归类里还有哪些作者？
- 这种格式里还有哪些组值得继续看？

所以从当前组直接跳到相邻 group，本质上是在把 browse flow 做连续，而不是每一步都要求用户回退。

### 3. 这比继续堆更多指标更值

overview band 如果继续只加指标，只会越来越像仪表盘。  
而 pivot buttons 补的是：

- 下一步浏览动作
- 当前组和周边结构的关系
- 更接近 `readest` 那种“书库结构能一路走下去”的感受

所以这一步是产品结构升级，不是数字堆砌。

## 结果

现在 `br1` 的 group landing 已经不只是：

- 进入组
- 看摘要
- 看书单

而是进一步变成：

- 进入组
- 看摘要
- 直接跳去相关 group
- 再继续浏览

这让 grouped browse 从“单层 landing”开始往“连续的书库结构浏览”再走了一步。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 in-group pivots
- 当前 pivots 还是基于简单频次摘要，不是更深的 subgroup hierarchy
- 还没有把这些 pivots 进一步扩成可展开的 subgroup tree 或 breadcrumb graph
