# 0169 让 library 顶部搜索和视图控制变成真实入口

## 这次改动做了什么

这一步执行的是 `02-01`。

主要变化有三件：

1. `LibraryHeader.svelte` 不再是只读壳层
   - 搜索框可输入
   - 顶部网格/列表切换可点击
   - 导入按钮接真实事件
2. `library/+page.svelte` 新增了真正的 `libraryQuery`
   - 会过滤 continue reading
   - 会过滤主书架
   - 搜不到时会给出空态
3. `BookshelfPreview.svelte` 里重复的工具条被收掉
   - 视图切换和主要入口统一回到顶部 header

## 为什么这一步重要

之前的 library 顶部区域只是“看起来像 Readest”，但并不真的控制书库。

这会造成一个典型问题：

- 顶部有搜索框
- 但真正能影响书架的是别处
- 顶部有按钮
- 但书架自己又有一套局部工具条

这种结构很容易让 UI 看起来像拼出来的，而不是一个完整产品。

这次改完之后，顶部区域真正变成了：

- 搜索入口
- 视图切换入口
- 导入入口

也就是一个真正的 library control surface。

## 你可以学到的工程知识

### 1. 视觉壳层要尽快升级成状态入口

很多 UI 项目一开始会先画一个“像真的”组件：

- 有输入框样式
- 有按钮样式
- 但没有状态

这种方式适合快速搭视觉，但不能停太久。

因为一旦壳层和真实状态分开存在太久，后面就会出现：

- 同一个动作在两处都能做
- 一处是真功能，一处是假按钮
- 维护成本快速上升

这次就是把 `LibraryHeader` 从“假壳层”升级成“真实入口”。

### 2. 控制层和展示层要分开

`BookshelfPreview` 现在更像展示层：

- 负责展示卡片
- 不再负责顶层工具条

而 `LibraryHeader` 更像控制层：

- 负责搜索
- 负责视图切换
- 负责导入入口

这样后面做 `02-02` 和 `02-03` 时会更稳，因为每层职责更清楚。

## 本次相关文件

- `src/lib/components/library/LibraryHeader.svelte`
- `src/lib/components/library/BookshelfPreview.svelte`
- `src/routes/library/+page.svelte`
- `tests/e2e/library-smoke.spec.ts`
