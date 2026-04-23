# 0469 - 把 library filter-controls bindings 收进 controller 层

`+page.svelte` 里之前对同一组 filter controls 维护了两套几乎重复的 wiring：

- 一套给 filter reset normalization block
- 一套给 `buildLibraryPageActionSet(...)`

两边都在重复做同样的事情：

- 读取当前 `query / filterBy / format / collection / tag`
- 再把新的 controls state 回写到 route 本地变量

## 这刀做了什么

1. 扩展 [`src/lib/library/controller.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/controller.ts)

   新增：

   - `buildCurrentLibraryFilterControlsState(...)`
   - `buildLibraryFilterControlsBindings(...)`

   这组 helper 把“当前 controls getter + apply setter matrix”收成了 shared controller binding。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在先构造一份 `activeLibraryFilterControlsBindings`，然后：

   - filter reset normalization 直接复用它
   - `buildLibraryPageActionSet(...)` 也直接复用它

   这样 route 不再为同一组 filter controls 分别维护两套重复的 getter / setter wiring。

## 为什么这刀重要

这一刀继续把 `+page.svelte` 里“只是把本地状态读出来，再按字段写回去”的 controller wiring 清掉。

而且这层仍然保持在很窄的 filter-controls 边界，没有把它和 browse-state、surface assembly 或 page derivation 混在一起，所以风险比大范围重组 reactive 链低很多。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- browse-state bindings 仍然在 route 里以 `getCurrentBrowseState + syncBrowseState` 的形式直接组装
- page-level surface assembly 和 desktop coordinator host wiring 仍然保留在 `+page.svelte`
