# 0422 - 给 grouped browse 加一层 shared surface model

## 背景

上一刀已经把 grouped browse 的 presenter helpers 收进了 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)。

但 route 里仍然有一块结构性重复：

- desktop library 一套 grouped-browse surface 常量
- starter/sample library 再来一套几乎一样的 grouped-browse surface 常量

它们都在各自组装：

- overview
- trail landings
- sibling groups
- trail guard explanations
- sibling guard explanations
- pivot guard explanations
- subgroup shelves

这说明 shared helper 虽然有了，surface-level bundle 还没有真正被抽成模型。

## 这次做了什么

这次把 grouped browse 再往上抬一层，新增了真正的 shared surface model：

1. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)
   - 新增 `LibraryBrowseSurfaceModel`
2. [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)
   - 新增 `buildLibraryBrowseSurfaceModel(...)`
   - 统一产出 overview、trail landings、sibling groups、subgroup shelves，以及 trail/sibling/pivot guard explanation buckets
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - desktop/starter 两条 grouped-browse 主干现在都直接消费 `buildLibraryBrowseSurfaceModel(...)`
   - route 不再手工分别拼两套 `desktop*` / `starter*` 的 surface 常量
   - 因为这层 model 已经抽出来，route 上也顺势清掉了一批现在不该再自己 import 的 grouped-browse helper

## 为什么这一步重要

### 1. 这让 grouped browse 从“共享 helper”进一步变成“共享 view-model”

之前 shared navigation module 已经能提供很多零散 helper，但 route 还要自己拼：

- 哪些 helper该一起算
- 哪些结果属于同一个 browse surface

这一刀之后，`navigation.ts` 开始直接给出一份更高层的 surface model。

这意味着 grouped browse 不再只是“有一堆共享函数”，而是开始有真正的共享页面模型。

### 2. desktop/starter 两条分支终于不再各写一套相同组装

这是最直接的收益。

之前同一套 grouped-browse 结构会在 route 里出现两遍，只是吃的 books 不同：

- imported library books
- starter/sample books

现在这两条分支已经共享一套 surface builder，这让 browse mode 的定义更像“一个产品模式”，而不是两个近似模板的并排实现。

### 3. route 继续往 orchestration 收

现在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 又往下退了一步：

- 决定当前 state
- 决定当前 books
- 把 shared surface model 喂给组件

这比继续自己维护 `desktop*` / `starter*` 两份成组派生常量更接近稳定的 page architecture。

## 结果

现在 `br1` 的 grouped browse 更接近四层：

- navigation state / transitions / guards
- shared presenter helpers
- shared surface model
- reusable browse components

也就是说，grouped browse 已经从“共享规则 + 共享组件”进一步长成了“共享页面模型 + 共享组件”的结构。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- route 仍然还保留 action availability wrappers 和一些 callback adapter，没有完全退成纯配置层
- subgroup shelf 和 main shelf 的 blocked-group explanation 仍然是 route 逐处组装，没有进一步并进 surface model
- grouped browse 还可以继续往前走，例如把 desktop/starter 之外的 empty-state/notice composition 也纳入更统一的 browse page model
