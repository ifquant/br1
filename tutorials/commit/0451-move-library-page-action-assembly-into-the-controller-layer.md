# 0451 - 把 library page action assembly 收到 controller 层

上一刀已经把 library page 的 callback prop matrix 收成了 `LibraryPageActions`。

但 `+page.svelte` 里仍然保留着另一层重复劳动：它还在自己组装 `activeLibraryPageActions`，也就是继续手写：

- query / filter 的 state mutation
- shelf filter 的快捷动作
- clear filter / clear chip
- jump trail dispatch
- sort / view-mode setter

这说明 page action model 虽然已经有了统一类型，但 action assembly 还没真正进入 shared controller layer。

## 这刀做了什么

1. 扩展 [`src/lib/library/controller.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/controller.ts)

   controller 现在新增了：

   - `buildLibraryPageActions(...)`

   这个 builder 统一承接：

   - `LibraryPageActions` 的组装
   - filter control action 到 state transition 的应用
   - shelf filter 快捷动作
   - trail jump dispatch
   - sort / view-mode setter 接入

   也就是说，page action model 不再只是一个类型定义，而是开始有 shared controller builder。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再自己定义：

   - `handleFilterByShelfStatus`
   - `handleFilterByShelfCollection`
   - `handleFilterByShelfFormat`
   - `handleFilterByShelfTag`
   - `handleClearLibraryFilters`
   - `clearLibraryFilterById`
   - 那一整块手工组装的 `activeLibraryPageActions` 字面量

   route 现在只是把：

   - 当前 filter controls getter/setter
   - 当前 browse dispatcher
   - import / notice / desktop actions
   - sort / view-mode setter

   这些边界交给 `buildLibraryPageActions(...)`，再消费返回的 shared action model。

## 为什么这刀重要

这一刀的意义不是“少写几行”，而是把 library page 的 action wiring 再往 shared controller 推了一层：

- `LibraryPageActions` 已经不只是 shared type
- `buildLibraryPageActions(...)` 也开始成为 shared behavior

这让 route 更接近真正的 page host：

- 持有页面状态
- 提供环境边界
- 把 controller builder、surface model、runtime 连接起来

而不是继续自己实现 action assembly。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 filter-controls state 本身，以及 page-level runtime / scroll context
- `buildLibraryPageActions(...)` 目前还是接受一批 page-local callback 依赖，还没有再上提成更完整的 page coordinator
