# 0424 - 把 grouped browse 主内容区抽成 shared panel

## 背景

上一刀已经把 grouped browse 的 page model 往 shared surface model 推了一层：

- overview
- trail landings
- sibling groups
- subgroup shelf surfaces
- main shelf explanations

但 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里还保留着一块很重的重复模板：desktop library 和 starter library 各自维护一整套几乎同构的 grouped-browse 内容树。

重复的不是业务分支，而是同一组 surface 的两份渲染：

- navigator
- trail landings
- current overview
- subgroup shelves
- main shelf

这会让后面的 grouped-browse 对齐越来越贵，因为每次改动都要同时碰两条模板路径。

## 这次做了什么

这次把这块重复内容收成一个共享 panel：

1. [`src/lib/components/library/LibraryGroupedBrowsePanel.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryGroupedBrowsePanel.svelte)
   - 新增 grouped-browse panel 组件
   - 统一承接：
     - `LibraryBrowseNavigator`
     - `LibraryBrowseTrailLandings`
     - `LibraryBrowseOverview`
     - subgroup shelf `BookshelfPreview`
     - main shelf `BookshelfPreview`
2. [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)
   - 导出 `LibraryGroupedBrowsePanel`
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - desktop/starter 两条 grouped-browse path 都改成渲染同一个 panel
   - route 保留当前 state、surface model、callback adapters
   - 删除两套平行的 grouped-browse 模板树和对应局部样式

## 为什么这一步重要

### 1. 这是真正的 page composition 收口，不只是 helper 抽取

前几刀主要在抽：

- state
- codec
- transition
- guard
- presenter helper
- surface model

但只要页面主体还是两份模板，route 仍然在维护两套 browse composition。

这一刀之后，desktop/starter 的 grouped-browse 主体终于开始共享同一个渲染边界。

### 2. route 更接近“组装数据和动作”，而不是“维护 UI 树”

现在 `+page.svelte` 对 grouped browse 的职责更清楚了：

- 读当前 browse state
- 生成当前 surface model
- 包装当前 route 上下文相关的 availability / transition callbacks

而不是继续维护两大块内容树。

### 3. 后面继续做大粒度对齐的改动成本更低

接下来如果还要继续收 grouped browse：

- 调整 overview 布局
- 改 trail landing 结构
- 变更 subgroup shelf 呈现
- 增加新的 grouped-browse content surface

就不需要再同时改 desktop 和 starter 两份几乎相同的模板。

这会让后面的 parity 推进更像改一个产品 surface，而不是维护两条平行实现。

## 结果

现在 `br1` 的 grouped-browse 结构又收了一层：

- shared navigation model
- shared surface model
- shared grouped-browse content components
- shared grouped-browse panel composition

也就是说，grouped browse 不只是“逻辑共享”，而是连 page-level 内容骨架都开始真正共享了。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- route 仍然还保留当前 browse-state wrappers 和 callback adapters，没有继续抽成更高层的 page controller
- desktop/starter 仍然在空状态、workflow shelf、notice 这些更外层 library composition 上分叉
- grouped browse 还可以继续往前收，例如把 panel 所需的 callback/availability adapters 进一步并进更明确的 presenter/controller 边界
