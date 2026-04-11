# 0141: 给 reader sidebar 补一个最小书签列表

## 这次改了什么

上一刀已经能在顶栏给“当前位置”加书签，但用户还看不到这些书签，也没法从书签跳回正文。

这一步只补一个最小闭环：

- 在现有 `notes` tab 顶部加一个 `书签` 段落
- 展示当前书的书签列表
- 点击书签后跳回对应正文位置

这一步故意没有引入新的 sidebar tab，也没有把它扩成 Readest 那种完整 bookmarks/notebook 结构。目标只是先把“可存 -> 可见 -> 可跳”这条链路补齐。

## 为什么要加 `targetHref`

前一版书签只有一个 `locator`，它主要用于回答“当前位置是否已经收藏过”。

但 `locator` 不等于可导航目标：

- EPUB 场景下，`progressLocation` 往往是 CFI，可以直接跳
- 某些 fallback 场景下，`locator` 可能是我们自己拼出来的字符串，只适合比较，不适合导航

所以这次把职责拆开：

- `locator`：用于判断当前位置是否已被收藏
- `targetHref`：用于真正跳转

这是一个很典型的建模动作：不要让“显示/判重字段”和“导航/执行字段”混成一个值。

## 代码层面的结构变化

### 1. 书签数据模型补了导航字段

`ReaderBookmark` 现在包含：

- `locator`
- `targetHref`
- `chapterLabel`
- `progressLabel`
- `locationLabel`

这样 sidebar 渲染时不必重新推断，也不需要再读 reader engine 的内部状态。

### 2. sidebar 先挂在 notes tab，而不是先扩 tab 结构

这一步没有新增 `bookmarks` tab，而是把书签列表作为 `notes` tab 顶部的一个 section。

原因很简单：

- 这是更小的改动
- 现有 `SidebarTab = 'toc' | 'search' | 'notes'` 不用立刻扩容
- 先验证数据和导航闭环，再决定是否像 Readest 那样拆成更丰富的工作区

### 3. 打开书签仍然走统一的 `issueHrefControl()`

点击书签没有写一套新的 reader command，而是复用现有的跳转入口：

```ts
issueHrefControl(href)
```

这能保证：

- 书签跳转
- 搜索结果跳转
- TOC 跳转

都继续走同一条 reader 控制面，而不是分裂成三套导航机制。

## 这次可以学到的编程知识

### 知识点 1：状态字段和执行字段最好分开

很多时候一个字段看起来“既能显示、又能比较、又能导航”，但这通常是错觉。

这里的 `locator` 和 `targetHref` 就是典型例子：

- `locator` 更适合做 identity
- `targetHref` 更适合做 action target

把它们拆开后，代码虽然多一列，但语义更稳。

### 知识点 2：做增量重构时，优先把新能力挂到现有容器里

如果现在就为了书签去扩：

- 新 tab
- 新 controller 接口层
- 新布局
- 新快捷键

这一步就会变成大切片，回归成本也会上升。

先把书签挂到现有 `notes` 容器里，是一种典型的增量策略：

- 先验证数据和交互是否成立
- 再决定最终信息架构

## 还没做的事

- 还没有独立的 bookmarks tab
- 还没有删除书签 / 重命名书签
- 还没有 bookmark 专项桌面自动化回归
- 还没有和 Readest 的 notebook / bookmarks 结构完全对齐
