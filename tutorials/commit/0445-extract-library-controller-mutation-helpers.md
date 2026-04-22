# 0445 - 把 library controller 的机械 mutation helper 抽出去

前几刀已经把 library route 的模板、surface model、page shell、page host 一层层收走了。

到这一步，`+page.svelte` 里剩下更明显的一类噪音不是模板，而是 controller 里的机械 mutation：

- notice state 的创建和执行
- query/filter 的重复赋值
- shelf 快捷筛选时那组清空其它筛选再设置当前筛选的重复逻辑
- browse action 应用后再决定是否同步 URL

这些逻辑依然是 controller 语义，但它们本身非常机械，继续留在 route 里会让页面文件还带着一大簇重复赋值分支。

## 这刀做了什么

1. 扩展 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)

   新增两类 controller 相关类型：

   - `LibraryNoticeState`
   - `LibraryFilterControlsState`

   这样 route 里的 notice / filter control 不再只是页面局部的匿名 shape。

2. 新增 [`src/lib/library/controller.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/controller.ts)

   这个新模块现在承接最机械的一组 controller helper：

   - `createLibraryNotice(...)`
   - `runLibraryNoticeAction(...)`
   - `getNextLibraryFilterControlsState(...)`
   - `getAppliedLibraryBrowseState(...)`

   其中 filter helper 统一覆盖了：

   - `set-query`
   - `set-status / set-format / set-collection / set-tag`
   - `reset-all`
   - `clear-chip`
   - `apply-shelf-status / collection / format / tag`

3. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再自己：

   - 手写 notice object 的构造
   - 手写 notice action 的执行
   - 在多个 handler 里重复写 `query/filterBy/formatFilter/...` 的字段重置
   - 直接在 host props 上重复写 `set this field` 的 controller 赋值

   而是改成：

   - 先取当前 filter control state
   - 交给 shared controller helper 算 next state
   - 再统一 apply 回 route state

## 为什么这刀重要

这刀不是再收模板，而是开始收 route 里剩下的“低信息量控制分支”。

到这里，library route 已经不只在模板和 surface 上变薄，也开始把最机械的 controller mutation 下沉到 shared helper。

这对下一步继续收 controller 边界很关键，因为后面剩下的 route 逻辑会更集中在真正有产品语义的流程上：

- import
- migrate
- remove
- metadata update
- repair
- bulk repair

而不是还混着很多 query/filter/notice 的重复字段赋值。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- import / migration / remove / metadata / repair / bulk repair 这些更高层的 controller flow 仍然留在 route
- browse runtime、persisted-record lookup、desktop-only recovery flow 还没有进一步收成更高层的 library controller/use-case
