# 0423 - 把 shelf-level grouped browse explanations 也收进 surface model

## 背景

上一刀已经给 grouped browse 加上了 shared surface model：

- overview
- trail landings
- sibling groups
- subgroup shelves
- trail/sibling/pivot explanation buckets

但 route 里还残留一块明显的 page-local 装配：

- subgroup shelf 的 blocked-entry explanations
- main shelf / top-level group-card 的 blocked-entry explanations

它们虽然已经用了 shared navigation helper，但还是要在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里逐处 `map` 一遍。

## 这次做了什么

这次把这批 shelf-level explanation 也并进了 shared surface model：

1. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)
   - `LibraryBrowseSurfaceModel` 现在除了 overview / trail / sibling / pivot 外，还带：
     - `subgroupShelves` 的 explanation-aware surface
     - `shelfGroupCardExplanations`
2. [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)
   - 新增 `getLibraryShelfGroupExplanations(...)`
   - `buildLibraryBrowseSurfaceModel(...)` 现在会直接产出 subgroup shelf 的 blocked-entry explanation，以及主 shelf 的 group-card explanation
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - desktop/starter 两条 grouped-browse path 不再各自 `map shelf books -> explanation`
   - 改成直接消费 `desktopBrowseSurface` / `starterBrowseSurface` 提供的 explanation payload

## 为什么这一步重要

### 1. 这让 grouped browse 的 surface model 更像真正的页面模型

如果 surface model 只提供一部分 surface，而 shelf-level explanation 还要 route 自己补，那它仍然不是完整的页面模型。

这一刀之后，surface model 更接近回答：

- 这个 browse mode 页面需要哪些块
- 每一块应该带什么 explanation state

而不是只提供一半。

### 2. route 又少了一批“只是组装，不是决策”的代码

被删掉的不是业务判断，而是重复的组装劳动。

这正是应该被 surface model 吃掉的层：

- route 不该自己知道每个 shelf 该怎么把 books 映射成 blocked-entry explanation
- route 只该决定当前 state 和当前 books

### 3. desktop/starter 两条分支进一步靠拢

现在这两条 grouped-browse path 共享的不只是 overview/trail/sibling/pivot 主干，连 shelf-level explanation 也开始走同一套 surface model。

这会让后面继续往统一 browse-page presenter 收时更顺。

## 结果

现在 `br1` 的 grouped browse surface model 已经覆盖到：

- overview
- trail landings
- sibling groups
- subgroup shelf surfaces
- main shelf group-card explanations
- trail/sibling/pivot/subgroup/group-card 这几类 explanation state

也就是说，grouped browse 不只是“有 shared surface model”，而是这份 model 已经更接近整页主要 browse surface 的真实装配结果。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- route 仍然还保留 action availability wrappers 和 callback adapters，没有进一步抽成统一 browse-page presenter API
- `BookshelfPreview` 仍然需要 route 传入较多行为 props，surface model 还没有继续承接交互层 wiring
- grouped browse 还可以继续往前走，例如把 empty-state / notice / grouped mode shell 也并进更完整的 page model
