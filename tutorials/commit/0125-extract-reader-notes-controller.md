# 背景

在拆完 `searchController` 之后，`reader/+page.svelte` 里剩下最显眼的一块就是 notes 子系统。  
它之前同时承担了：

- 按书加载笔记
- localStorage -> host store 的迁移
- 保存逻辑
- 新增笔记
- 打开笔记
- 编辑笔记
- 删除笔记
- 当前选区与当前激活 note 的状态维护

这部分逻辑和搜索类似，也是一块边界比较清晰的子系统。  
如果不继续拆，route 仍然会保留太多“笔记自己的规则”，和我们想要的组合层方向不一致。

# 主要目标

- 把 notes 的加载、迁移、保存和 CRUD 逻辑从 `reader/+page.svelte` 中抽出来
- 保持笔记行为不变
- 让 route 只保留和 UI / reader 事件相关的接线

# 改动概览

- 新增 [`src/lib/reader/notesController.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/notesController.ts)
- controller 内部收拢：
  - 按书刷新/加载笔记
  - localStorage 到 host store 的迁移
  - 保存逻辑
  - `addFromSelection`
  - `open`
  - `edit`
  - `remove`
  - 当前 `selection` / `activeCfi` 状态
- [`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts) 导出 `createReaderNotesController`
- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 改为：
  - 创建 `notesController`
  - 将 `notesState` 直接传给 `ReaderSidebar`
  - 将 `$notesState.notes` 传给 `ReaderStage`
  - 在 `selectionchange` / `notefocus` 事件中更新 controller
  - 在 sidebar callbacks 中调用 controller 的笔记动作

# 关键知识

## 1. 为什么 `prompt` / `confirm` 也要通过依赖注入传给 controller

这次没有让 `notesController` 直接在内部写死：

```ts
window.prompt(...)
window.confirm(...)
```

而是通过 options 注入：

- `promptNoteDraft`
- `confirmDelete`

这样做的价值是把 controller 和“浏览器具体怎么弹框”解耦。

controller 真正关心的是：

- 我要不要拿到一段用户输入
- 删除前要不要做一次确认

它不需要知道这个输入来自 `window.prompt`、自定义弹窗，还是将来一个更正式的笔记编辑面板。  
这就是典型的依赖反转：把“做什么”留在 controller，把“怎么弹 UI”交给外层。

对后续演进很重要，因为如果以后把笔记编辑从 `prompt` 升级成自定义 modal，route 只要换掉注入函数，controller 本身几乎可以不动。

## 2. 为什么 notes 和 search 一样适合先拆成独立 controller

notes 和 search 有一个共同点：它们都有自己的生命周期和状态规则。

例如 notes：

- 依赖当前书籍 key
- 有自己的持久化规则
- 有自己的 CRUD 状态变换
- 有自己的当前激活项

这种子系统如果继续堆在 route 里，route 就会越来越像“全局状态脚本”。  
而把它拆出来后，route 只剩两类职责：

- 把子系统挂到当前页面上下文
- 把子系统和 UI 事件接起来

这正是组合层该做的事。

## 3. 为什么 controller store 适合作为 sidebar 的直接输入

现在 `ReaderSidebar` 已经接 `notesState={...}`。  
当 notes 被抽成 controller 后，route 不需要再手工组装一份 notes 对象，而是可以直接：

```svelte
notesState={$notesState}
```

这比手工同步：

- `activeNoteCfi`
- `notesSelection`
- `notes`

更稳，因为这些字段天然属于同一个子系统。  
controller 输出一个稳定的 store 快照，sidebar 只消费快照，就不会再出现 route 层维护多份平行变量的问题。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有拆 `sidebarController`
- `reader/+page.svelte` 里仍保留 auto-open、sidebar prefs、阅读位置持久化等 orchestration 逻辑
- 没有新增 notesController 的单元测试
