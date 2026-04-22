# 0407 - 把 grouped browse navigation model 抽出来

## 背景

上一刀已经把 grouped browse 的 navigator 抽成了独立组件。  
但组件之外，真正决定 grouped browse 语义的那批推导仍然在 route 里：

- 当前层 overview 怎么算
- subgroup shelves 怎么算
- sibling groups 怎么算
- ancestor landings 怎么算

这意味着 UI 分层已经开始对齐，数据分层还没完全对齐。

## 这次要补什么

这次不是继续加 UI，而是把 grouped browse 的数据层也单独抽出来：

1. 新增 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)
2. 把 trail / overview / subgroup / sibling / landing 的推导都搬过去
3. 在 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts) 里补上对应的类型定义
4. route 只保留：
   - 过滤后的书单
   - 当前 route state
   - navigation actions

## 为什么这一步重要

### 1. 组件抽出来，不代表模型也抽出来了

如果组件已经独立，但它依赖的一整套推导仍然埋在 route 里，那么后续要继续做：

- graph model
- 更深层 navigation state
- 组件复用

时，仍然会先卡在 route 这个大文件上。

所以这一步做的是把“看起来独立”推进成“语义上也独立”。

### 2. 这让 grouped browse 不再只是页面行为，而是 library 域的一部分

把这些 helper 放到 `src/lib/library/navigation.ts` 里，实际是在说一件更重要的事：

- grouped browse 不是某个页面的临时逻辑
- 它已经是 library 域里的一套正式导航语义

这对后续继续做更大粒度对齐很关键，因为只有先承认它是域模型，后面才值得继续往下做。

### 3. route 终于从“定义规则”退回到“消费规则”

现在 route 更像 orchestrator：

- 组装当前数据
- 调用 navigation model
- 把结果喂给组件

这比之前 route 一边定义模型、一边渲染 UI、一边响应交互，要干净得多。

## 结果

现在 `br1` 的 grouped browse 已经有了两层明确拆分：

- [`src/lib/components/library/LibraryBrowseNavigator.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseNavigator.svelte)
  负责导航面的表现
- [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)
  负责 grouped browse 的推导语义

route 只负责连接它们。  
这让后续继续把 grouped browse 往更正式的 graph/navigation model 推进时，终于不需要再先拆 route。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言新 navigation model 的边界
- navigation model 目前仍然是纯函数集合，不是更完整的 domain object/store
- 还没有把 route param parsing/serialization 一并收进同一个 navigation module
