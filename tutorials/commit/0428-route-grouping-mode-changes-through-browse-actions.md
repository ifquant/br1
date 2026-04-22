# 0428 - 让 library grouping mode 切换也走 browse actions

## 背景

前几刀已经把 grouped browse 的大部分交互收进 shared browse state/action 体系：

- jump trail
- exit group
- switch sibling
- enter group
- enter from trail

但 `LibraryHeader` 里的 `书库分组` 菜单其实还留着一条旁路：

- 点 `不分组 / 按作者 / 按归类 / 按格式`
- header 发 `groupbychange`
- route 单独拼 `syncLibraryBrowseLocation({ groupBy, groupScope: '', trail: [] })`

也就是说，grouping mode change 还没有被建模成真正的 browse action。

## 这次做了什么

这次把 grouping mode change 也并进 shared browse action system：

1. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)
   - `LibraryBrowseAction` 新增 `set-grouping`
2. [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)
   - guard matrix 新增 `set-grouping`
   - transition table 新增 `set-grouping`
   - 规则很明确：切换 grouping mode 时，重置 `groupScope` 和 `trail`
3. [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte)
   - 当 `onDispatchBrowseAction` 存在时，`handleGroupByChange(...)` 不再发 header-only 事件
   - 改成直接 dispatch `{ type: 'set-grouping', groupBy }`
4. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 删除 header 上那条 route-local `on:groupbychange => syncLibraryBrowseLocation(...)` 特殊路径

## 为什么这一步重要

### 1. 分组模式切换终于不再绕开 shared navigation model

之前 grouped browse 已经越来越像一个统一的浏览系统，但最顶层的 mode change 还留在系统外。

这一刀之后，用户切换：

- 不分组
- 按作者
- 按归类
- 按格式

也开始走同一套 browse action/transition table。

### 2. route 又少了一条特殊分支

route 之前要为 header 保留一条“这不是 browse action，只是 header 自己的 groupbychange”的特殊处理。

这一刀之后，这条特殊处理没了。

这很重要，因为只要顶层 mode change 还在旁路，grouped browse 就还不是完整的 action-driven system。

### 3. browse transition table 的覆盖面更完整了

现在 shared browse action system 覆盖的不再只是 group 内部跳转，而是也开始覆盖“我现在想把整个浏览模式切成另一种 grouping”。

这让后面继续做更完整的 browse shell/controller 时，抽象更稳。

## 结果

现在 `br1` 的 grouped browse action system 已经不只负责：

- 在当前 grouping mode 内移动

也负责：

- 切换 grouping mode 本身

也就是说，从“按作者浏览”切到“按格式浏览”，不再是 header 特殊逻辑，而是正式进入 shared transition model。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- `LibraryHeader` 仍然保留 `groupbychange` 事件作为兼容回退路径，而不是直接删除这条旧接口
- `jumptrail` / `exitgroup` 这些 header 旧事件回退路径也仍然存在
- desktop/starter 在 grouped browse 外层的 workflow、notice、empty-state 壳层仍然没有进一步收成 shared library shell
