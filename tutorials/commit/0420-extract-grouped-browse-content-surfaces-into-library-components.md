# 0420 - 把 grouped browse 的内容层抽成独立 library 组件

## 背景

前几刀已经把 grouped browse 的内容层越做越完整：

- ancestor landing
- current group overview
- local guard hints
- sibling / pivot / subgroup browse

但这些东西虽然“产品上已经像一个系统”，实现上却还基本都堆在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里。

这会带来两个问题：

1. route 既管 browse state，又管大块内容模板，边界还是太重
2. 已经稳定下来的 content surface 没有自己的实现边界，后面继续演化会越来越难

## 这次做了什么

这次不是再加新导航能力，而是把已经成形的 grouped-browse 内容层正式抽出来：

1. [`src/lib/components/library/LibraryBrowseOverview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseOverview.svelte)
   - 承接当前 group overview
   - 包含 metrics、sibling graph、pivot sections、local guard hints
2. [`src/lib/components/library/LibraryBrowseTrailLandings.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseTrailLandings.svelte)
   - 承接 ancestor trail landing rail
   - 包含返回这一层、同层切换、subgroup shelves、local guard hints
3. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)
   - 把 overview / pivot / metric 相关结构补成更明确的共享类型
4. [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)
   - 把这两个新组件正式暴露出去
5. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 不再自己写两份 desktop/starter 的 overview 与 landing 巨块模板
   - 改成只负责组装数据和行为回调
6. 迁移后，把 route 里已经失效的 grouped-browse 内容层样式一并删除，避免留一大段死 CSS

## 为什么这一步重要

### 1. 这让 grouped browse 的内容层终于不再只是“route 里的大模板”

现在 grouped browse 已经有了：

- shared navigation model
- shared route codec
- shared transitions
- shared guard semantics
- dedicated navigator component

如果 overview 和 trail landing 还留在 route 里，那整套内容层仍然缺最后一层边界。

这一刀之后，grouped browse 的内容区终于也开始拥有自己的组件结构。

### 2. 样式边界也一起被带出来了

如果只抽模板、不抽样式，实际上只是把视觉 surface 弄坏。

这次把相应的 overview / trail landing / sibling / pivot / subgroup 样式也一起放进新组件，意味着这些 surface 现在不再依赖 route 的局部 CSS 作用域“碰巧还能打到”。

这点很关键，因为它说明这不是表面重组，而是真正的组件化。

### 3. route 的职责继续往“组装状态”收

现在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 更接近只做三件事：

- 读取书库数据
- 组合 grouped-browse state / derived data
- 把 navigation actions 和 explanations 传给组件

这比之前继续把内容层细节塞在 route 里更接近稳定的 library page architecture。

## 结果

现在 `br1` 的 grouped browse 已经具备更完整的 UI 分层：

- shared navigation model
- dedicated navigator component
- dedicated overview component
- dedicated trail-landing component
- shared guard hints across all of them

也就是说，grouped browse 的主要内容层已经不再只是“从 route 上长出来”，而是开始形成真正的 library component system。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次还没有继续把 overview / trail landing 的数据拼装也抽出 route，route 仍然负责准备大部分 derived props
- `BookshelfPreview` 仍然承接 subgroup shelf 的细节，没有再继续细拆 subgroup browse surface
- grouped browse 还可以继续往下收，例如把 trail landing / overview 所需的 callback bundling 再整理成更明确的 presenter 或 adapter 层
