# 0425 - 把 grouped browse panel 的 wiring 也收进 panel 自己

## 背景

上一刀已经把 grouped browse 的主内容区抽成了 shared panel：

- navigator
- trail landings
- overview
- subgroup shelves
- main shelf

但 route 里其实还保留着第二层重复，不是模板重复，而是一大串 panel wiring：

- availability 判断
- reason label 计算
- jump / sibling / pivot / enter-from-trail / enter-group 的 action adapter
- trail index 和 trail slice 的组装

结果就是，虽然 panel 本身共享了，`+page.svelte` 还是得给 desktop/starter 两个 panel 实例各自传一大坨 grouped-browse 专用 props。

## 这次做了什么

这次把这层 wiring 也往 panel 里收了一层：

1. [`src/lib/components/library/LibraryGroupedBrowsePanel.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryGroupedBrowsePanel.svelte)
   - 新增 `browseState`
   - 新增 `onDispatchBrowseAction`
   - 组件内部直接调用 shared navigation helpers 来完成：
     - action availability
     - reason labels
     - trail landing groupBy 计算
     - trail/sibling/group blocked explanations
     - enter-group / enter-from-trail / switch-sibling / jump-trail / pivot 的 action dispatch
2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - desktop/starter 两个 panel 实例不再传几十行 grouped-browse-specific wiring
   - 改成只传：
     - `browseSurface`
     - `browseState`
     - `onDispatchBrowseAction`
     - shelf 相关 callbacks
   - 删除 route 里已经只为 panel 服务的那批 grouped-browse adapter helper

## 为什么这一步重要

### 1. 这才算把 panel 从“共享模板”推进成“共享浏览单元”

如果 panel 只是统一模板，但：

- availability 在 route
- reason label 在 route
- transition adapter 在 route

那它仍然只是一个被外部完全摆布的壳。

这一刀之后，panel 已经开始真正理解 grouped browse 的 shared navigation model，而不是只会渲染别人喂给它的数据。

### 2. route 更接近真正的 page controller

现在 route 对 grouped browse 更像在做两件事：

- 提供当前 `browseState`
- 提供统一的 `dispatchLibraryBrowseAction(...)`

剩下的 grouped-browse panel 内部 wiring 不再留在 page 里。

这让 `+page.svelte` 更接近“页面控制器”，而不是“模板 + wiring + control surface 全混在一起”。

### 3. desktop/starter 的 grouped-browse 实例进一步去分叉

现在这两个 panel 实例之间真正剩下的差异基本只剩：

- books 数据源
- 外层 shelf action 是否存在

而不再是“相同浏览模型却要各自重新接一遍 wiring”。

这会让后面继续往更完整的 grouped-browse presenter/controller 对齐时更顺。

## 结果

现在 `br1` 的 grouped browse 已经不只是：

- shared navigation model
- shared surface model
- shared content panel

而是连 panel 自己的浏览 wiring 也开始基于 shared state/action model 运转了。

也就是说，route 继续往“状态 + dispatch + 外层 library composition”收了一步。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- `LibraryHeader` 仍然还在 route 上消费一层 grouped-browse availability/reason wiring，没有一起收进更统一的 browse controller surface
- route 仍然直接持有 `dispatchLibraryBrowseAction(...)`，还没有继续抽成更完整的 grouped-browse page controller/model
- desktop/starter 在 empty-state、workflow shelf、notice 这些更外层 library composition 上仍然分叉
