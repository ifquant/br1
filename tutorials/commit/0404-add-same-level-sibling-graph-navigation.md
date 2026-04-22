# 0404 - 给 grouped library browse 补 same-level sibling graph

## 背景

前几刀已经把 grouped browse 往 hierarchy 方向推进了几步：

- 有 breadcrumb trail
- 有 ancestor landing rail
- 祖先层自己也能继续往下浏览

但当前路径还是偏“树干式”：

- 往上可以回祖先
- 往下可以进 subgroup

却还缺一条重要方向：

- 在同一个父层下，横向切到别的 sibling group

如果没有这条横向路径，grouped browse 仍然更像一棵只能上下走的树，而不是更接近真实书库浏览的 graph。

## 这次要补什么

这次补的是同层 sibling graph：

1. 对当前层，计算同一个父层范围下的其它 sibling groups
2. 对每个祖先 landing，也计算它那一层的 sibling groups
3. 把这些 sibling groups 渲染成一组可直接切换的 peer chips
4. 点击后保持当前 parent trail，只替换当前层 label

也就是说，这次不是继续“更深一层”，而是补“旁边还有哪些组可以直接切过去”。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里新增 `getLibrarySiblingGroups(...)`
- `LibraryTrailLanding` 现在也会携带 `siblingGroups`
- 新增 `enterLibrarySiblingGroup(...)`，保证横向切换 sibling 时保留正确 parent trail
- 当前 group overview 和 ancestor landing sections 里都增加了 `同层其它分组` 区块

## 为什么这一步重要

### 1. 只会向上/向下，还不算真正的 browse graph

真实用户在书库里常做的不只是：

- 从作者进入归类
- 从归类进入格式

还有：

- 这个作者看完了，切去同一归类下另一个作者
- 这个格式不对，切去同一父层下另一个格式组

这就是典型的 sibling movement。  
没有它，层级虽然成立，但浏览还是不够灵活。

### 2. sibling graph 比再加更多摘要更值

到了这个阶段，再给 landing 补更多数字，收益已经很低。  
更有价值的是：

- 让用户知道同层还有什么别的分支
- 让用户能一跳过去

这会让 grouped browse 更像“书库结构网络”，而不是一串被动解释当前路径的卡片。

### 3. 横向跳转也必须守住 route 语义

同层切换不是：

- 清空 trail 回到整库
- 再重新进入目标组

而是：

- 保持同一个 parent scope
- 只替换当前层 label

所以这次专门加了 `enterLibrarySiblingGroup(...)`，确保 sibling switch 仍然使用现有 route-level state，而不是偷偷重置浏览上下文。

## 结果

现在 `br1` 的 grouped library browse 已经同时具备：

- 向上回祖先
- 向下进 subgroup
- 横向切 sibling group

这比前一轮更接近真正的 tree/graph navigation，而不是只有线性 trail 的多层页面。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 sibling graph 切换
- 当前 sibling graph 还是基于同一 `groupBy` 维度的 peer groups，不是完整跨维图
- 还没有把整条 grouped browse 抽成独立 graph model
