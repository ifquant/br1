# 0154: 给 bookmarks workspace 补自己的顶部工具层

## 这次改了什么

前面 `bookmarks` 已经有了：

- 独立 tab
- 列表
- 跳转
- 删除

但它还缺一个像 `notes` 那样的顶部工具层。现在如果用户在书签面板里，想做的第一件事往往是：

- 看看当前位置是不是已经加过书签
- 直接把当前位置加入或移出书签

之前这只能回到 header 里的星标去做。  
这一步把这个能力补回了 `bookmarks` workspace 自己：

- 新增书签数量 / 当前位置状态 chips
- 新增一个主动作按钮：
  - `保存当前位置为书签`
  - 或 `取消当前位置书签`

这样 `bookmarks` 面板终于像一个独立工作区，而不是单纯的书签列表。

## 为什么这里复用已有 toggle，而不是新做一套 add/remove 逻辑

因为“当前位置加/取消书签”这件事，本来就已经有一条稳定通路：

- header 星标
- route 里的 `handleToggleBookmark()`
- bookmarks controller 的 `toggleCurrent()`

所以这一步最稳的做法是：

- 给 sidebar callbacks 新增一个 `onToggleCurrentBookmark`
- 直接复用现有行为

这样做的好处是：

- header 和 sidebar 不会各自维护一套书签逻辑
- 用户从不同入口触发，结果始终一致

## 这次实现上的关键点

### 1. “当前位置是否已保存”为 workspace 状态，而不是按钮文案猜测

这次没有只靠按钮文字来隐含状态，而是明确加了两颗 chips：

- `x 书签`
- `当前位置已保存 / 当前位置未保存`

这能让用户在不点任何按钮的情况下，先看清当前状态。

### 2. 当前页是否已加书签直接从现有状态派生

这里没有新加字段，而是直接从：

- `bookmarksState.activeLocator`
- `bookmarksState.bookmarks`

派生出：

- `isCurrentLocationBookmarked`

这说明这一步是“表达层增强”，不是“数据层扩张”。

## 这次能学到的编程知识

### 知识点 1：同一动作可以有多个入口，但最好共用一个实现

这里 header 星标和 sidebar 主按钮，都是“切换当前位置书签”。

如果它们各自写一套逻辑，很快就会出现：

- 一个入口更新了状态
- 另一个入口忘了同步

更稳的方式是：

- 多入口
- 单实现

### 知识点 2：workspace 顶部工具层通常要同时回答两件事

一个好的 workspace 顶部，不只是有按钮，还要能回答：

1. 当前是什么状态
2. 现在最该做什么动作

这次 bookmarks 顶部就对应成：

1. `当前位置已保存 / 未保存`
2. `保存 / 取消当前位置书签`

这是比只放一个裸按钮更完整的工具层设计。

## 还没做的事

- bookmarks workspace 还没有筛选或排序
- 还没有按来源/时间分组
- 还没有专项自动化回归验证这个主动作按钮
- header 和 sidebar 的书签入口还没有进一步统一成更完整的 Readest 风格图标体系
