# 背景

在前一提交里，`ReaderSidebar` 的 prop 已经按领域收敛成了 `search / notesState / callbacks` 三组对象。  
但 `reader/+page.svelte` 里搜索相关逻辑仍然很重，主要包含：

- 搜索配置恢复
- 按书切换搜索历史
- 搜索请求触发
- 搜索结果同步
- 缓存清理提示
- search toast 的定时消失

如果继续把这些都堆在 route 里，`reader/+page.svelte` 仍然会同时承担：

- URL/自动打开逻辑
- search 子系统逻辑
- notes 子系统逻辑
- sidebar 偏好逻辑

这和我们前面定下的方向不一致：route 应该更像组合层，而不是业务逻辑总仓库。

# 主要目标

- 先把最独立的 `search` 子系统从 `reader/+page.svelte` 中抽出来
- 保持现有 reader 行为不变
- 为后续 `notesController` / `sidebarController` 拆分建立模式

# 改动概览

- 新增 [`src/lib/reader/searchController.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/searchController.ts)
- 在 controller 中收拢：
  - search config 恢复
  - per-book history 恢复与持久化
  - 搜索请求触发
  - 搜索结果状态同步
  - cache clear 入口
  - notice 定时清理
- [`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts) 导出 `createReaderSearchController`
- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 改为：
  - 创建 `searchController`
  - 在 `onMount` / reactive / `onDestroy` 中接入 restore、persist、destroy
  - 把 reader 的 `searchchange` / `searchcachekeychange` / `readerstate` 事件转交给 controller
  - 直接把 `$searchState` 作为 sidebar 的 `search` prop 传入

# 关键知识

## 1. 为什么先拆 search，而不是一次把整个 route 全拆了

重构时最容易犯的错误之一，是“既然要拆，就一次性全拆”。  
这在结构上看起来很干净，但风险很高，因为你会同时改动：

- 状态定义位置
- 事件流
- 组件接口
- 持久化路径

而 search 是当前 `reader/+page.svelte` 里最适合先拆的一块，因为它有几个特点：

- 状态边界相对清楚
- 已经有单独的 sidebar search prop 对象
- 与 notes/sidebar width/pin 逻辑耦合较少

这类子系统最适合做“第一刀”。  
先把一块拆稳，后面的 `notesController` 和 `sidebarController` 就可以参考同一模式，而不是在更大爆炸半径里试错。

## 2. controller 和 route 的职责应该怎么分

这次没有把所有东西都搬进 controller。  
一个更稳的分法是：

controller 负责：

- 子系统内部状态
- 子系统的本地持久化
- 子系统自己的状态变换规则

route 负责：

- 从 URL / 页面环境拿上下文
- 连接 controller 和组件事件
- 连接 controller 和更高层 command dispatch

在这个提交里，`createReaderSearchController()` 负责管理 search 状态本身，  
但真正发给阅读器的 command 仍然由 route 提供 callback：

- `dispatchSearch`
- `dispatchSearchResult`
- `dispatchClearSearchCache`

这样 controller 不需要知道整个 reader command 总线长什么样，只需要知道“当我要搜索时，外部会帮我发命令”。  
这是一种典型的依赖反转：子系统不直接抓高层实现，而是接受高层提供的边界函数。

## 3. 为什么用 store 适合这种 controller

这里的 controller 最后暴露的是一个 `state` store。  
这样 route 可以直接：

```ts
const searchState = searchController.state;
```

然后在模板里：

```svelte
<ReaderSidebar search={$searchState} />
```

这比手工同步十几个局部变量更稳，因为：

- controller 内部可以一次性更新整个 search 状态
- route 只需要关心“当前快照是什么”
- sidebar 继续拿到结构稳定的 `search` 对象

当子系统有一组天然成组的数据时，用单个 store 暴露当前快照，通常比暴露很多离散变量更容易维护。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有拆 `notesController`
- 这次没有拆 `sidebarController`
- `reader/+page.svelte` 里仍保留 notes、sidebar prefs、auto-open 等逻辑
- 没有新增针对 searchController 的单元测试
