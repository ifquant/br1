# 0142: 给 reader sidebar 里的书签补删除动作

## 这次改了什么

上一刀已经做到：

- 顶栏可以给当前位置加书签
- sidebar 可以看到书签
- 点击书签可以跳回正文

但还缺一个最基本的管理动作：删除。

这一步只补这个小缺口：

- `bookmarksController` 新增 `remove(id)`
- `reader/+page.svelte` 把删除行为接到 controller
- `ReaderSidebar.svelte` 给每条书签卡片增加“删除”按钮

这样书签链路就从“存、看、跳”补成了“存、看、跳、删”。

## 为什么这一步不直接做 rename / drag reorder

因为当前最大的价值不是把书签变成一个完整内容管理系统，而是先把最小使用闭环补完整。

如果现在同时加：

- rename
- custom label
- drag reorder
- dedicated workspace

那这一步就不再是“书签管理补洞”，而会变成一轮新的结构设计。

先把删除补上，能明显减少错误收藏和重复书签的摩擦，收益更直接。

## 实现上的关键点

### 1. 删除确认放在 controller 依赖里，而不是写死在组件里

这次延续了 `notesController` 的做法，没有在 `ReaderSidebar.svelte` 里直接调 `window.confirm()`。

而是把确认能力作为 controller 依赖传进去：

```ts
confirmDelete: (message) => window.confirm(message)
```

这样做的好处是：

- UI 组件只负责触发意图
- controller 负责业务动作
- 以后如果要换成 toast / modal / 桌面原生对话框，不用回头拆组件

### 2. 书签卡片继续复用现有信息，不增加额外状态

删除按钮是挂在现有 bookmark card 上的，没有为它再引入新的 store 或 hover state 逻辑。

这类“补齐操作”的小切片，最好优先复用现有结构，而不是为单个按钮发明新状态层。

## 这次能学到的编程知识

### 知识点 1：组件里触发动作，不等于组件里实现业务

一个常见坏味道是：

- 列表组件里直接 `splice`
- 直接 `localStorage.setItem`
- 直接 `window.confirm`

这样组件会越来越像“业务控制器”。

更稳的做法是：

- 组件发出 `deleteBookmark(id)` 意图
- route/controller 决定是否确认、如何更新、如何持久化

这能让 UI 和业务边界保持清楚。

### 知识点 2：先做 destructive action，比先做 fancy action 更实用

在真实产品里，很多列表能力的优先级不是：

1. rename
2. recolor
3. drag sort

而是：

1. 能创建
2. 能打开
3. 能删除错误数据

因为用户最先遇到的痛点，往往是“我点错了，怎么撤销”。

## 还没做的事

- 还没有书签重命名
- 还没有书签排序/固定
- 还没有独立 bookmarks workspace
- 还没有 bookmark 专项桌面自动化回归
