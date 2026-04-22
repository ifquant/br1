# 0427 - 把 grouped browse surface building 也收进 panel

## 背景

前几刀已经把 grouped browse 往共享浏览单元推进了三层：

- 主内容区抽成 shared panel
- panel 自己消费 browse state 和 dispatch action
- header 自己消费 browse state 和 dispatch action

但 route 里还残留一层 grouped-browse 装配：

- 先在 `+page.svelte` 里调用 `buildLibraryBrowseSurfaceModel(...)`
- desktop 一次
- starter 一次
- 再把算好的 `browseSurface` 传给 panel

这意味着 panel 虽然已经拥有自己的 wiring，但 shared surface model 的构造还没真正进 panel 自己。

## 这次做了什么

这次把这层 surface building 也并进了 panel：

1. [`src/lib/components/library/LibraryGroupedBrowsePanel.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryGroupedBrowsePanel.svelte)
   - 改成接收：
     - `browseState`
     - `browseBooks`
     - `shelfBooks`
   - 组件内部直接调用 `buildLibraryBrowseSurfaceModel(...)`
2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 删除 desktop/starter 两个 `{@const ...BrowseSurface = buildLibraryBrowseSurfaceModel(...)}` 片段
   - panel 调用改成只传 books 和 state，不再先在 route 里造 surface payload

## 为什么这一步重要

### 1. grouped browse panel 终于自己拥有“从 state 到 surface”的完整链路

之前 panel 已经能：

- 读 browse state
- 做 action availability / reason wiring
- dispatch grouped-browse actions

但它还不能自己从书单算出 surface model。

这一刀之后，panel 终于不只是“会渲染一个已经准备好的 surface”，而是开始自己持有：

- state
- books
- surface derivation
- wiring

### 2. route 再少一层 page-local grouped-browse assembly

现在 route 对 grouped browse 的职责又少了一点：

- 不再负责给 desktop/starter 两条 path 先造 `browseSurface`
- 只提供当前 state、books、以及统一 dispatch / shelf callbacks

这让 route 更接近真正的 library page shell，而不是 grouped-browse presenter。

### 3. desktop/starter 两条 grouped-browse 分支进一步同构

现在这两条分支的差异更纯了：

- 传入哪组 books
- 传入哪些 shelf callbacks

而不是连 surface-builder 这层也得在 page 里各算一次。

## 结果

现在 `br1` 的 grouped browse 已经从共享：

- navigation model
- header wiring
- panel wiring

继续推进到共享：

- panel-level surface building

也就是说，从 `browseState + books` 到 grouped-browse 主要 UI surface 的链路，已经更多落在组件边界里，而不是散在 route 上。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- panel 里目前仍然直接调用 `buildLibraryBrowseSurfaceModel(...)`，还没有进一步抽成更明确的 grouped-browse shell/model object
- `LibraryHeader` 仍然保留 `jumptrail` / `exitgroup` 兼容事件路径
- desktop/starter 在 grouped browse 外层的 workflow shelf、notice、empty-state 结构上仍然分叉
