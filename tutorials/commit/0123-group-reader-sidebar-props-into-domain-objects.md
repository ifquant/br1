# 背景

在这次整理前，`ReaderSidebar.svelte` 和 `reader/+page.svelte` 之间的接口已经变得很长：

- 一组 TOC 相关字段
- 一组 search 相关字段
- 一组 notes 相关字段
- 十几条回调函数

结果是 route 里的 `<ReaderSidebar ... />` 调用非常长，读代码时几乎要在一堆 prop 里做人工分组。  
这会直接拖慢下一步的 controller 拆分，因为在真正下沉逻辑之前，组件边界本身就已经不清楚了。

所以这一步先不碰行为逻辑，只先整理接口形状：把 sidebar 的 props 按领域打包成对象。

# 主要目标

- 把 `ReaderSidebar` 的 search / notes / callbacks prop 合并成对象
- 让 `reader/+page.svelte` 更接近组合层，而不是“超长 prop 管道”
- 顺手统一 `SidebarTab` 的共享类型，减少 reader 相关组件里的重复字面量类型

# 改动概览

- 在 [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts) 中新增：
  - `SidebarTab`
  - `ReaderSidebarSearchState`
  - `ReaderSidebarNotesState`
  - `ReaderSidebarCallbacks`
- [`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts) 重新导出这些类型
- [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) 改为接收：
  - `search`
  - `notesState`
  - `callbacks`
- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 新增三个组合对象，再传给 `ReaderSidebar`
- [`src/lib/components/reader/ReaderHeaderBar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte) 与 [`src/lib/components/reader/ReaderStage.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte) 改为复用共享的 `SidebarTab`

# 关键知识

## 1. 为什么先整理 prop shape，再做 controller 拆分

很多重构如果一开始就直接“拆 controller”，风险会很高，因为你同时在改两件事：

- 组件外部接口
- 组件内部状态来源

这很容易让变更范围失控。

更稳的路径通常是两步：

1. 先把接口整理成更清晰的 shape
2. 再把这些 shape 背后的状态和行为迁移到 controller/store

这次就是在做第 1 步。  
现在 `ReaderSidebar` 已经不再接十几二十个松散 prop，而是按领域分成了：

- `search`
- `notesState`
- `callbacks`

等后面做 controller 时，就可以自然演进为：

- `searchController`
- `notesController`
- `sidebarController`

而不是从一堆零散 prop 里硬拆。

## 2. 为什么“对象 prop”更适合复杂子系统

像 search 这种子系统，本身就有一组天然绑定的数据：

- 查询词
- 状态
- 结果
- 配置
- 历史
- 缓存提示

如果把它们一个个平铺成顶层 prop，会有两个问题：

- 调用方很长，阅读成本高
- 看不出哪些字段属于同一个领域

改成：

```svelte
<ReaderSidebar search={...} notesState={...} callbacks={...} />
```

后，接口语义会更明确。  
这并不是为了“少写几行”，而是为了让组件边界和领域边界尽量一致。

## 3. 共享字面量类型可以减少后续漂移

`'toc' | 'search' | 'notes'` 这种字面量联合类型，如果散落在 route、header、stage、sidebar 里，短期看问题不大，但长期很容易发生漂移：

- 一个地方新增 tab 值
- 另一个地方忘记同步
- 类型检查只在局部通过

把它收敛成一个 `SidebarTab`，收益并不神奇，但很稳定：

- reader 相关组件都依赖同一个 tab 协议
- 后面如果要扩展 tab，只改一个类型定义

这种“先统一协议，再改行为”的小整理，通常是复杂前端重构里最划算的动作之一。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有把 search / notes / sidebar 状态真正下沉到 controller 或 store
- `ReaderSidebar` 仍然保留现有内部模板和滚动定位逻辑
- Rust 模块拆分和更大的 reader 路由瘦身还没有开始
