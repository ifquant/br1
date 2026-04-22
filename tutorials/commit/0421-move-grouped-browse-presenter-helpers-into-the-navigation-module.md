# 0421 - 把 grouped browse 的 presenter helpers 继续收进 navigation module

## 背景

上一刀已经把 grouped browse 的内容层抽成了组件：

- `LibraryBrowseOverview`
- `LibraryBrowseTrailLandings`

但 route 里还残留着另一层明显的 page-local 逻辑：

- 如何从当前 browse state 推导 guard explanations
- 如何给 trail landing 计算 groupBy / sibling explanations
- 如何给 overview / subgroup shelf / group cards 拼 blocked-entry explanations

也就是说，模板虽然被抽走了，presenter/helper 还大半留在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)。

## 这次做了什么

这次继续把 grouped browse 的共享导出层往 `navigation.ts` 收：

1. [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)
   - 新增 shared `getLibraryBrowseActionReasonLabel(...)`
   - 新增 shared action explanation helpers
   - 新增 shared explanation collector
   - 新增 trail landing / sibling / pivot / blocked subgroup/group-card 这组 presenter helpers
2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 删除原来那一大段 page-local explanation/helper 定义
   - 现在主要只在当前 state 上调用 shared navigation presenter helpers
3. route 里的 desktop/starter 两条 grouped-browse path 因此进一步对齐，不再各自叠着一层散落 helper

## 为什么这一步重要

### 1. 这让 grouped browse 的“怎么解释页面”也开始属于 shared model

以前 `navigation.ts` 主要负责：

- state
- codec
- transitions
- guards

而 route 仍然负责：

- explanation buckets
- landing/overview 辅助推导

这一刀之后，shared navigation module 已经不仅描述“怎么跳”，也开始描述“这些浏览 surface 应该怎么从当前状态推出来”。

### 2. route 的职责继续往真正的 page orchestrator 收

现在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 更接近：

- 持有当前页面状态
- 提供具体 callback
- 把 shared presenter 输出交给组件

而不是继续自己定义 grouped-browse 的解释规则。

这比“组件抽出来了，但 helper 还全留在 route”更完整。

### 3. 这是为后面继续抽 presenter/model 做准备

如果现在不把这层 shared helper 往 `navigation.ts` 收，后面无论是：

- 再抽 presenter object
- 再抽 adapter
- 再加新的 grouped-browse surface

都会继续被 page-local 逻辑卡住。

这一刀至少先把“和 browse semantics 本身强相关”的那批 helper 还给 shared navigation module。

## 结果

现在 `br1` 的 grouped browse 已经更接近三层结构：

- shared navigation model / presenter helpers
- reusable grouped-browse components
- route-level state assembly and callbacks

也就是说，grouped browse 不再只是“组件拆开了”，而是连页面解释层都开始真正从 route 往共享模型移动。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- route 仍然在模板里组装不少 desktop/starter 分支的局部常量，还没有完全形成统一 presenter object
- availability wrappers 仍然部分留在 route，没有把整组 action adapters 一起抽走
- grouped browse 还可以继续往前走，例如把 desktop/starter 的 surface props 进一步压成 shared view-model builder
